import { beforeEach, expect, it, jest } from "@jest/globals";
import policy from "../src/config/policy";
import { buildRoomModel, RoomModel } from "@/colony/roomModel";
import { initializeMemory } from "@/kernel/memory";
import { isIntelStale, markRoomInaccessible, safeRoute, updateIntel } from "@/empire/intelManager";
import { runRemotes } from "@/empire/remoteManager";
import { runExpansion } from "@/empire/expansionManager";
import { runProduction } from "@/empire/productionManager";
import { runMarket } from "@/empire/marketManager";
import { available } from "@/empire/resources";
import { mock, ownedRoom } from "./fixtures";

let tick = 1000;
beforeEach(() => {
    Game.time = tick += 20000;
});

function store(energy: number, capacity: number, cargo: Partial<Record<ResourceConstant, number>> = {}): StoreDefinition {
    const resources = { energy, ...cargo };
    const used = (resource?: ResourceConstant): number => resource ? resources[resource] || 0 :
        Object.values(resources).reduce((sum, amount) => sum + (amount || 0), 0);
    return Object.defineProperties(resources, {
        getUsedCapacity: { value: used },
        getCapacity: { value: () => capacity },
        getFreeCapacity: { value: () => capacity - used() }
    }) as StoreDefinition;
}

function healthy(name = "W1N1", energy = 300000) {
    const fixture = ownedRoom(name, 1000, 6);
    const storage = mock<StructureStorage>({
        id: `storage-${name}` as Id<StructureStorage>, structureType: STRUCTURE_STORAGE, my: true,
        room: fixture.room, pos: new RoomPosition(21, 22, name), store: store(energy, 1000000), isActive: () => true
    });
    fixture.structures.push(storage);
    fixture.objects.set(storage.id, storage);
    fixture.room.storage = storage;
    initializeMemory();
    const model = buildRoomModel(fixture.room);
    model.stage = "stable";
    return { ...fixture, storage, model };
}

function terminal(home: ReturnType<typeof healthy>, energy = 50000, cargo: Partial<Record<ResourceConstant, number>> = {}) {
    const structure = mock<StructureTerminal>({
        id: `terminal-${home.room.name}` as Id<StructureTerminal>, structureType: STRUCTURE_TERMINAL, my: true,
        room: home.room, pos: new RoomPosition(20, 22, home.room.name), store: store(energy, 300000, cargo),
        isActive: () => true, cooldown: 0, send: jest.fn<StructureTerminal["send"]>().mockReturnValue(OK)
    });
    home.model.terminal = structure;
    home.room.terminal = structure;
    home.objects.set(structure.id, structure);
    return structure;
}

function neutral(home: ReturnType<typeof healthy>, name = "W2N1") {
    const target = ownedRoom(name);
    target.controller.my = false;
    Reflect.deleteProperty(target.controller, "owner");
    target.structures.splice(0);
    delete Game.spawns[target.spawn.name];
    Game.map.describeExits = (() => ({ [RIGHT]: name })) as GameMap["describeExits"];
    Game.map.findRoute = ((origin: string, destination: string) => origin === destination ? [] :
        [{ exit: RIGHT, room: destination }]) as GameMap["findRoute"];
    updateIntel(target.room, new Map([[home.model.name, home.model]]));
    return target;
}

it("records observed intel, classifies rooms, and reuses cached route distances", () => {
    const home = healthy();
    const target = neutral(home, "W4N4");
    const route = jest.spyOn(Game.map, "findRoute");
    Game.time++;
    updateIntel(target.room, new Map([[home.model.name, home.model]]));
    expect(route).not.toHaveBeenCalled();
    expect(Memory.intel[target.room.name].keeper).toBe(true);
    expect(Memory.intel[target.room.name].sources[0].id).toBe(target.source.id);
    expect(isIntelStale(Memory.intel[target.room.name])).toBe(false);
    Game.time += policy.intelMaxAge + 1;
    expect(isIntelStale(Memory.intel[target.room.name])).toBe(true);
    expect(isIntelStale(undefined)).toBe(true);
    markRoomInaccessible("W9N9");
    expect(isIntelStale(Memory.intel.W9N9)).toBe(true);
    route.mockRestore();
});

it("rejects danger and stale intermediate rooms rather than trusting route distance alone", () => {
    const home = healthy();
    neutral(home);
    Game.map.findRoute = (() => [{ exit: RIGHT, room: "W3N1" }, { exit: RIGHT, room: "W2N1" }]) as GameMap["findRoute"];
    expect(safeRoute(home.room.name, "W2N1")).toBeUndefined();
    Memory.intel.W3N1 = { ...Memory.intel.W2N1, sources: [], threat: { ...Memory.intel.W2N1.threat, total: 50 } };
    expect(safeRoute(home.room.name, "W2N1")).toBeUndefined();
});

it("requests scouts for unknown remotes and retires all economic demands on recovery", () => {
    const home = healthy();
    Game.map.describeExits = (() => ({ [RIGHT]: "W2N1" })) as GameMap["describeExits"];
    Game.map.findRoute = (() => [{ exit: RIGHT, room: "W2N1" }]) as GameMap["findRoute"];
    const models = new Map([[home.model.name, home.model]]);
    expect(runRemotes(models).some(demand => demand.role === "scout" && demand.key.startsWith("remote:"))).toBe(true);
    home.model.stage = "recovering";
    expect(runRemotes(models)).toEqual([]);
    expect(Memory.colonies[home.room.name].remotes.W2N1.stage).toBe("suspended");
});

it("sizes remote hauling from the complete route and emits home-owned collection jobs", () => {
    const home = healthy();
    const target = neutral(home);
    const container = mock<StructureContainer>({
        id: "remote-container" as Id<StructureContainer>, structureType: STRUCTURE_CONTAINER,
        room: target.room, pos: new RoomPosition(9, 9, target.room.name), store: store(1000, 2000)
    });
    target.structures.push(container);
    target.objects.set(container.id, container);
    const path = Array.from({ length: 80 }, (_, index) => new RoomPosition(20, 20, index < 40 ? target.room.name : home.room.name));
    const search = jest.spyOn(PathFinder, "search").mockReturnValue({ path, cost: 80, ops: 80, incomplete: false });
    const demands = runRemotes(new Map([[home.model.name, home.model]]));
    const plan = Memory.colonies[home.room.name].remotes[target.room.name].sourcePlans[target.source.id];
    expect(plan.pathLength).toBe(80);
    expect(plan.carryRequirement).toBeGreaterThanOrEqual(32);
    expect(demands.filter(demand => demand.role === "transporter").length).toBeGreaterThan(1);
    expect(demands.find(demand => demand.role === "miner")?.assignment?.type).toBe("source");
    expect(Object.values(Memory.colonies[home.room.name].logisticsJobs).some(job =>
        job.pickup.id === container.id && job.delivery.id === home.storage.id)).toBe(true);
    search.mockRestore();
});

it("suspends occupied remotes and waits for fresh intel after the retry delay", () => {
    const home = healthy();
    const target = neutral(home);
    Memory.intel[target.room.name].owner = "enemy";
    const models = new Map([[home.model.name, home.model]]);
    expect(runRemotes(models)).toEqual([]);
    const record = Memory.colonies[home.room.name].remotes[target.room.name];
    expect(record.stage).toBe("suspended");
    Game.time = record.suspendedUntil! + 1;
    expect(runRemotes(models).every(demand => demand.role === "scout")).toBe(true);
    expect(record.stage).toBe("scouting");
});

it("resumes claiming, delegates first spawn placement, and bounds a stalled spawnSite state", () => {
    const home = healthy();
    const target = neutral(home);
    Game.gcl.level = 2;
    const anchor = { x: 22, y: 22, roomName: target.room.name };
    Memory.empire.expansion = {
        stage: "claiming", candidates: [target.room.name], selectedRoom: target.room.name,
        originRoom: home.room.name, anchor, changedAt: Game.time
    };
    const models = new Map([[home.model.name, home.model]]);
    expect(runExpansion(models).some(demand => demand.role === "claimer")).toBe(true);
    target.controller.my = true;
    target.controller.owner = { username: "player" };
    Game.time++;
    updateIntel(target.room, models);
    const demands = runExpansion(models);
    expect(Memory.empire.expansion.stage).toBe("spawnSite");
    expect(Memory.colonies[target.room.name].anchor).toEqual(anchor);
    expect(demands.filter(demand => demand.role === "worker")).toHaveLength(2);
    expect(target.room.createConstructionSite).not.toHaveBeenCalled();
    Game.time += policy.expansionTimeout;
    expect(runExpansion(models)).toEqual([]);
    expect(Memory.empire.expansion.failureReason).toContain("timed out");
    expect(Memory.empire.expansion.retryAt).toBeGreaterThan(Game.time);
});

it("does not begin expansion without free GCL or healthy reserve-backed origins", () => {
    const home = healthy();
    neutral(home);
    expect(runExpansion(new Map([[home.model.name, home.model]]))).toEqual([]);
    expect(Memory.empire.expansion.stage).toBe("idle");
    Game.time += 250;
    Game.gcl.level = 2;
    home.model.stage = "recovering";
    expect(runExpansion(new Map([[home.model.name, home.model]]))).toEqual([]);
});

function marketMock() {
    Game.market = mock<Market>({
        credits: 1000000, orders: {},
        calcTransactionCost: jest.fn<Market["calcTransactionCost"]>().mockImplementation(amount => Math.ceil(amount / 10)),
        getAllOrders: jest.fn<Market["getAllOrders"]>().mockReturnValue([]),
        getOrderById: jest.fn<Market["getOrderById"]>().mockReturnValue(null),
        deal: jest.fn<Market["deal"]>().mockReturnValue(OK)
    });
}

it("prepares terminal energy through logistics without withdrawing the storage reserve", () => {
    const home = healthy("W1N1", policy.storageEnergyReserve + 1000);
    const target = terminal(home, 0);
    marketMock();
    runMarket(new Map([[home.model.name, home.model]]));
    const energyJobs = Object.values(Memory.colonies[home.room.name].logisticsJobs).filter(job =>
        job.delivery.id === target.id && job.resource === RESOURCE_ENERGY);
    expect(energyJobs.reduce((sum, job) => sum + job.amount, 0)).toBeLessThanOrEqual(1000);
    expect(Game.market.deal).not.toHaveBeenCalled();
});

it("balances mineral surplus before market sales and retains colony inventory", () => {
    const home = healthy();
    const other = healthy("W2N1");
    const sender = terminal(home, 50000, { H: 12000 });
    terminal(other);
    marketMock();
    runMarket(new Map([[home.model.name, home.model], [other.model.name, other.model]]));
    expect(sender.send).toHaveBeenCalledWith(RESOURCE_HYDROGEN, policy.productionBatch, other.model.name, "Empire balance");
    expect(Game.market.deal).not.toHaveBeenCalled();
    expect(available(home.model, RESOURCE_HYDROGEN)).toBe(7000);
});

it("compares net sale prices including transaction energy and uses a short-lived order cache", () => {
    const home = healthy();
    terminal(home, 50000, { H: 12000 });
    marketMock();
    const low = mock<Order>({ id: "low", type: ORDER_BUY, resourceType: RESOURCE_HYDROGEN,
        remainingAmount: 10000, amount: 10000, price: 0.011, roomName: "W9N9" });
    jest.mocked(Game.market.getAllOrders).mockImplementation(filter =>
        typeof filter !== "function" && filter?.resourceType === RESOURCE_HYDROGEN ? [low] : []);
    jest.mocked(Game.market.getOrderById).mockReturnValue(low);
    const models = new Map([[home.model.name, home.model]]);
    runMarket(models);
    expect(Game.market.deal).not.toHaveBeenCalled();
    const scans = jest.mocked(Game.market.getAllOrders).mock.calls.length;
    Game.time++;
    runMarket(models);
    expect(Game.market.getAllOrders).toHaveBeenCalledTimes(scans);
    low.price = 0.1;
    Game.time += 100;
    runMarket(models);
    expect(Game.market.deal).toHaveBeenCalledWith(low.id, policy.productionBatch, home.room.name);
});

function lab(home: ReturnType<typeof healthy>, id: string, x: number, y: number) {
    const structure = mock<StructureLab>({
        id: id as Id<StructureLab>, structureType: STRUCTURE_LAB, my: true, isActive: () => true,
        pos: new RoomPosition(x, y, home.room.name), room: home.room, store: store(0, 5000) as StructureLab["store"]
    });
    home.model.labs.push(structure);
    home.objects.set(structure.id, structure);
    return structure;
}

it("selects feasible lab reactions, prepares matching inputs, and protects committed reagents from sales", () => {
    const home = healthy();
    home.storage.store[RESOURCE_HYDROGEN] = 7000;
    home.storage.store[RESOURCE_OXYGEN] = 7000;
    lab(home, "lab-a", 20, 20);
    lab(home, "lab-b", 20, 21);
    lab(home, "lab-out", 21, 20);
    runProduction(new Map([[home.model.name, home.model]]));
    expect(Memory.empire.production[home.room.name].compound).toBe(RESOURCE_HYDROXIDE);
    const jobs = Object.values(Memory.colonies[home.room.name].logisticsJobs);
    expect(jobs.some(job => job.resource === RESOURCE_HYDROGEN && job.delivery.id === "lab-a")).toBe(true);
    expect(jobs.some(job => job.resource === RESOURCE_OXYGEN && job.delivery.id === "lab-b")).toBe(true);
    expect(available(home.model, RESOURCE_HYDROGEN)).toBe(1000);
    home.model.stage = "recovering";
    runProduction(new Map([[home.model.name, home.model]]));
    expect(Memory.empire.production[home.room.name]).toEqual({});
    expect(Object.values(Memory.colonies[home.room.name].logisticsJobs)).toEqual([]);
});

it("selects only feasible unlevelled factory recipes without consuming energy reserves", () => {
    const home = healthy();
    const factory = mock<StructureFactory>({
        id: "factory" as Id<StructureFactory>, structureType: STRUCTURE_FACTORY, my: true, isActive: () => true,
        room: home.room, pos: new RoomPosition(24, 24, home.room.name), store: store(0, 50000)
    });
    home.model.factories.push(factory);
    home.objects.set(factory.id, factory);
    runProduction(new Map([[home.model.name, home.model]]));
    const goal = Memory.empire.production[home.room.name].factoryResource!;
    expect(goal).toBe(RESOURCE_BATTERY);
    expect(COMMODITIES[goal].level).toBeUndefined();
    const job = Object.values(Memory.colonies[home.room.name].logisticsJobs).find(item => item.delivery.id === factory.id);
    expect(job?.amount).toBe(COMMODITIES[RESOURCE_BATTERY].components.energy);
    expect(available(home.model, RESOURCE_ENERGY)).toBeGreaterThan(0);
});
