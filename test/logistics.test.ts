import { describe, expect, it, jest } from "@jest/globals";
import { initializeMemory } from "@/kernel/memory";
import { buildRoomModel } from "@/colony/roomModel";
import { claimJob, reconcileLogistics, releaseJob, upsertLogisticsJob } from "@/colony/logisticsManager";
import { runTransporter } from "@/roles/transporter";
import { runHarvester } from "@/roles/harvester";
import { runWorker } from "@/roles/worker";
import type { LogisticsEndpoint, LogisticsJob } from "@/domain/types";
import { addCreep, mock, ownedRoom } from "./fixtures";

function store(energy = 0, capacity = 300, cargo: Partial<Record<ResourceConstant, number>> = {}): StoreDefinition {
    const values = { energy, ...cargo };
    const used = (resource?: ResourceConstant): number => resource ? values[resource] || 0 :
        Object.values(values).reduce((sum, amount) => sum + (amount || 0), 0);
    return Object.defineProperties(values, {
        getUsedCapacity: { value: used },
        getCapacity: { value: () => capacity },
        getFreeCapacity: { value: () => Math.max(0, capacity - used()) }
    }) as StoreDefinition;
}

function fixture() {
    const fixture = ownedRoom("W1N1", 0);
    initializeMemory();
    fixture.spawn.store = store(0, 300) as StructureSpawn["store"];
    const container = mock<StructureContainer>({
        id: "container" as Id<StructureContainer>, pos: new RoomPosition(11, 10, fixture.room.name),
        structureType: STRUCTURE_CONTAINER, store: store(200, 2000), hits: 200000, hitsMax: 250000
    });
    fixture.structures.push(container);
    fixture.objects.set(container.id, container);
    const pickup: LogisticsEndpoint = { type: "store", id: container.id, position: container.pos };
    const delivery: LogisticsJob["delivery"] = { type: "store", id: fixture.spawn.id, position: fixture.spawn.pos };
    return { ...fixture, container, pickup, delivery };
}

describe("logistics accounting and executors", () => {
    it("clamps shared source reservations across different delivery jobs", () => {
        const f = fixture();
        const destination = mock<StructureStorage>({
            id: "storage" as Id<StructureStorage>, pos: new RoomPosition(20, 21, f.room.name), store: store(0, 1000)
        });
        f.objects.set(destination.id, destination);
        const first = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 150, 80)!;
        const second = upsertLogisticsJob(f.room.name, f.pickup,
            { type: "store", id: destination.id, position: destination.pos }, RESOURCE_ENERGY, 150, 40)!;
        expect(first.amount).toBe(150);
        expect(second.amount).toBe(50);
    });

    it("budgets total destination capacity across different resources", () => {
        const f = fixture();
        f.container.store = store(200, 2000, { H: 200 });
        const destination = mock<StructureStorage>({
            id: "storage" as Id<StructureStorage>, pos: new RoomPosition(20, 21, f.room.name), store: store(0, 100)
        });
        f.objects.set(destination.id, destination);
        const delivery: LogisticsJob["delivery"] = { type: "store", id: destination.id, position: destination.pos };
        expect(upsertLogisticsJob(f.room.name, f.pickup, delivery, RESOURCE_ENERGY, 70, 80)?.amount).toBe(70);
        expect(upsertLogisticsJob(f.room.name, f.pickup, delivery, RESOURCE_HYDROGEN, 100, 60)?.amount).toBe(30);
    });

    it("preempts unleased market allocation for emergency energy without overbooking stock", () => {
        const f = fixture();
        const terminal = mock<StructureTerminal>({
            id: "terminal" as Id<StructureTerminal>, pos: new RoomPosition(20, 21, f.room.name), store: store(0, 1000)
        });
        f.objects.set(terminal.id, terminal);
        const market = upsertLogisticsJob(f.room.name, f.pickup,
            { type: "store", id: terminal.id, position: terminal.pos }, RESOURCE_ENERGY, 200, 20)!;
        const emergency = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 150, 100)!;
        expect(emergency.amount).toBe(150);
        expect(market.amount).toBe(50);
        expect(Object.values(Memory.colonies[f.room.name].logisticsJobs).reduce((sum, job) => sum + job.amount, 0)).toBe(200);
    });

    it("claims exclusively and releases dead leases for another transporter", () => {
        const f = fixture();
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 100, 80)!;
        const first = addCreep(f.room, "transporter", "hauler:1");
        const second = addCreep(f.room, "transporter", "hauler:2");
        first.memory.assignment = { type: "logistics" };
        second.memory.assignment = { type: "logistics" };
        expect(claimJob(first)?.id).toBe(job.id);
        expect(claimJob(second)).toBeUndefined();
        delete Game.creeps[first.name];
        expect(claimJob(second)?.id).toBe(job.id);
        releaseJob(second);
        expect(job.lease).toBeUndefined();
        expect(second.memory.assignment.jobId).toBeUndefined();
    });

    it("preserves carried cargo when the pickup disappears and delivery loses vision", () => {
        const f = fixture();
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 100, 80)!;
        const creep = addCreep(f.room, "transporter", "hauler");
        creep.memory.assignment = { type: "logistics" };
        claimJob(creep);
        creep.store = store(50, 50);
        f.objects.delete(f.container.id);
        job.delivery = { ...job.delivery, position: { x: 25, y: 25, roomName: "W2N1" } };
        f.objects.delete(f.spawn.id);
        reconcileLogistics(buildRoomModel(f.room));
        expect(Memory.colonies[f.room.name].logisticsJobs[job.id]).toBe(job);
        expect(job.amount).toBe(100);
    });

    it("reserves cargo against destination but not source inventory", () => {
        const f = fixture();
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 100, 80)!;
        const creep = addCreep(f.room, "transporter", "hauler");
        creep.memory.assignment = { type: "logistics" };
        claimJob(creep);
        creep.store = store(50, 50);
        f.container.store = store(150, 2000);
        const destination = mock<StructureStorage>({
            id: "storage" as Id<StructureStorage>, pos: new RoomPosition(20, 21, f.room.name), store: store(0, 1000)
        });
        f.objects.set(destination.id, destination);
        const next = upsertLogisticsJob(f.room.name, f.pickup,
            { type: "store", id: destination.id, position: destination.pos }, RESOURCE_ENERGY, 200, 40);
        expect(next?.amount).toBe(100);
        expect(job.amount).toBe(100);
    });

    it("uses transfer intent amount without expecting synchronous store mutation", () => {
        const f = fixture();
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 50, 80)!;
        const creep = addCreep(f.room, "transporter", "hauler");
        creep.memory.assignment = { type: "logistics" };
        claimJob(creep);
        creep.store = store(50, 50);
        runTransporter(creep);
        expect(creep.transfer).toHaveBeenCalledWith(f.spawn, RESOURCE_ENERGY, 50);
        expect(creep.store[RESOURCE_ENERGY]).toBe(50);
        expect(job.amount).toBe(0);
        expect(creep.memory.assignment.jobId).toBe(job.id);
        Game.time++;
        creep.store = store(0, 50);
        runTransporter(creep);
        expect(creep.memory.assignment.jobId).toBeUndefined();
        expect(Memory.colonies[f.room.name].logisticsJobs[job.id]).toBeUndefined();
    });

    it("keeps unseen externally supplied jobs until expiry", () => {
        const f = fixture();
        const pickup: LogisticsEndpoint = {
            type: "store", id: "remote-source" as Id<StructureContainer>, position: { x: 10, y: 10, roomName: "W2N1" }
        };
        const job = upsertLogisticsJob(f.room.name, pickup, f.delivery, RESOURCE_ENERGY, 100, 40)!;
        reconcileLogistics(buildRoomModel(f.room));
        expect(Memory.colonies[f.room.name].logisticsJobs[job.id]).toBeDefined();
    });

    it("allows local hauling under attack while keeping remote jobs assigned to remote haulers", () => {
        const f = fixture();
        Memory.intel[f.room.name] = {
            lastSeen: Game.time, sources: [], routes: {}, keeper: false, highway: false,
            threat: { attack: 30, ranged: 0, heal: 0, dismantle: 0, toughness: 0, total: 30, targetPriority: [] }
        };
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 100, 90)!;
        const creep = addCreep(f.room, "transporter", "local-hauler");
        creep.memory.assignment = { type: "logistics" };
        expect(claimJob(creep)?.id).toBe(job.id);
        releaseJob(creep);
        delete Memory.colonies[f.room.name].logisticsJobs[job.id];
        const remotePickup: LogisticsEndpoint = {
            type: "store", id: "remote-container" as Id<StructureContainer>, position: { x: 10, y: 10, roomName: "W2N1" }
        };
        const remote = upsertLogisticsJob(f.room.name, remotePickup, f.delivery, RESOURCE_ENERGY, 100, 40)!;
        expect(claimJob(creep)).toBeUndefined();
        creep.memory.assignment = { type: "logistics", targetRoom: "W2N1" };
        expect(claimJob(creep)?.id).toBe(remote.id);
    });

    it("unloads mixed cargo without dropping it or issuing a second transfer intent", () => {
        const f = fixture();
        const job = upsertLogisticsJob(f.room.name, f.pickup, f.delivery, RESOURCE_ENERGY, 50, 80)!;
        const creep = addCreep(f.room, "transporter", "mixed-hauler");
        creep.memory.assignment = { type: "logistics" };
        claimJob(creep);
        creep.store = store(20, 50, { H: 30 });
        runTransporter(creep, buildRoomModel(f.room));
        expect(creep.transfer).toHaveBeenCalledTimes(1);
        expect(creep.transfer).toHaveBeenCalledWith(f.container, RESOURCE_HYDROGEN);
        expect(job.amount).toBe(50);
    });

    it("generates emergency energy and prioritized construction/repair boards", () => {
        const f = fixture();
        const site = mock<ConstructionSite>({
            id: "site" as Id<ConstructionSite>, structureType: STRUCTURE_EXTENSION,
            pos: new RoomPosition(20, 22, f.room.name), progress: 0, progressTotal: 3000
        });
        f.sites.push(site);
        reconcileLogistics(buildRoomModel(f.room));
        const jobs = Object.values(Memory.colonies[f.room.name].logisticsJobs);
        expect(jobs.some(job => job.priority === 100 && job.delivery.id === f.spawn.id)).toBe(true);
        expect(Memory.colonies[f.room.name].workJobs[`build:${site.id}`].priority).toBe(80);
        expect(Memory.colonies[f.room.name].workJobs[`repair:${f.container.id}`]).toBeDefined();
    });

    it("runs emergency harvesting without flags and delivers energy", () => {
        const f = fixture();
        f.container.store = store(0, 2000);
        const creep = addCreep(f.room, "harvester", "bootstrap");
        runHarvester(creep, buildRoomModel(f.room));
        expect(creep.harvest).toHaveBeenCalledWith(f.source);
        creep.store = store(50, 50);
        runHarvester(creep, buildRoomModel(f.room));
        expect(creep.transfer).toHaveBeenCalledWith(f.spawn, RESOURCE_ENERGY);
    });

    it("builds expansion construction in its assigned remote room", () => {
        const f = fixture();
        const remote = ownedRoom("W2N1", 0);
        const creep = addCreep(remote.room, "worker", "expansion-worker");
        creep.memory.homeRoom = f.room.name;
        creep.memory.assignment = { type: "remote", targetRoom: remote.room.name };
        creep.store = store(50, 50);
        const site = mock<ConstructionSite>({
            id: "remote-spawn" as Id<ConstructionSite>, structureType: STRUCTURE_SPAWN,
            pos: new RoomPosition(20, 21, remote.room.name), progress: 0, progressTotal: 15000
        });
        remote.sites.push(site);
        remote.objects.set(site.id, site);
        runWorker(creep);
        expect(jest.mocked(creep.build)).toHaveBeenCalledWith(site);
    });
});
