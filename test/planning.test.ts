import {describe, expect, it, jest} from "@jest/globals";
import {
    bodyCost,
    buildDefender,
    buildHarvester,
    buildMiner,
    buildReserver,
    buildTransporter,
    buildUpgrader,
    buildWorker
} from "@/planning/bodyBuilder";
import {planLayout, LAYOUT_REVISION} from "@/planning/layoutPlanner";
import {planSources} from "@/planning/sourcePlanner";
import {compatible, range} from "@/planning/geometry";
import {reconcilePlanning, runConstruction} from "@/colony/constructionManager";
import {assessThreat, planDefense} from "@/colony/defenseManager";
import {planStructures, runStructures, selectReactionLabs} from "@/colony/structureManager";
import {buildRoomModel} from "@/colony/roomModel";
import {initializeMemory} from "@/kernel/memory";
import type {PlannedStructure, StructurePlan, ThreatAssessment} from "@/domain/types";
import policy from "../src/config/policy";
import {mock, ownedRoom, store as fixtureStore} from "./fixtures";

function store(energy = 0, capacity = 300, cargo: Partial<Record<ResourceConstant, number>> = {}): StoreDefinition {
    const value = fixtureStore(energy, capacity, cargo);
    value.getUsedCapacity = ((resource?: ResourceConstant) => resource ? value[resource] :
        Object.values(value).reduce<number>((sum, amount) => sum + (typeof amount === "number" ? amount : 0), 0)) as StoreDefinition["getUsedCapacity"];
    value.getFreeCapacity = (() => capacity - value.getUsedCapacity()) as StoreDefinition["getFreeCapacity"];
    return value;
}

const threat: ThreatAssessment = {
    attack: 90,
    ranged: 0,
    heal: 12,
    dismantle: 0,
    toughness: 100,
    total: 102,
    targetPriority: []
};
const emptyPlan = (): StructurePlan => ({links: [], towers: [], reactions: [], factories: [], observations: []});

describe("pure body generation", () => {
    it("preserves cost, role and size invariants over boundary and oversized budgets", () => {
        for (const budget of [-10, 0, 50, 100, 129, 130, 199, 200, 249, 250, 299, 300, 550, 650, 1300, 3000, 10000, NaN, Infinity]) {
            for (const builder of [
                buildHarvester, buildMiner, buildWorker, buildUpgrader, buildReserver,
                (value: number) => buildTransporter(value, 100, true),
                (value: number) => buildDefender(value, threat)
            ]) {
                const body = builder(budget);
                expect(body.length).toBeLessThanOrEqual(50);
                if (!body.length) continue;
                expect(bodyCost(body)).toBeLessThanOrEqual(budget);
                expect(body).toContain(MOVE);
                expect(body.some(part => part !== MOVE && part !== TOUGH)).toBe(true);
            }
        }
    });

    it("handles bootstrap, worker minimum, mining cap and hauling movement", () => {
        expect(bodyCost(buildHarvester(200))).toBe(200);
        expect(buildWorker(299)).toEqual([]);
        expect(bodyCost(buildWorker(300))).toBe(300);
        expect(buildMiner(10000).filter(part => part === WORK)).toHaveLength(5);
        expect(buildReserver(649)).toEqual([]);
        expect(buildReserver(10000).filter(part => part === CLAIM)).toHaveLength(2);
        for (const road of [false, true]) {
            const body = buildTransporter(10000, 100, road);
            const carry = body.filter(part => part === CARRY).length;
            const move = body.filter(part => part === MOVE).length;
            expect(move).toBe(road ? Math.ceil(carry / 2) : carry);
        }
        expect(buildUpgrader(10000, 3).filter(part => part === WORK)).toHaveLength(3);
    });
});

describe("persistent deterministic room planning", () => {
    it("produces repeatable nonconflicting layouts and ten mutually usable labs", () => {
        const {room, source, controller, spawn} = ownedRoom();
        const layout = planLayout(room)!;
        expect(layout).toEqual(planLayout(room));
        expect(layout.anchor).toEqual({x: spawn.pos.x, y: spawn.pos.y, roomName: room.name});
        expect(layout.structures.filter(s => s.structureType === STRUCTURE_EXTENSION)).toHaveLength(60);
        const labs = layout.structures.filter(s => s.structureType === STRUCTURE_LAB);
        expect(labs).toHaveLength(10);
        for (const output of labs.slice(2)) {
            expect(range(output.position, labs[0].position)).toBeLessThanOrEqual(2);
            expect(range(output.position, labs[1].position)).toBeLessThanOrEqual(2);
        }
        for (const structure of layout.structures) {
            if (structure.structureType !== STRUCTURE_ROAD) {
                expect(range(structure.position, source.pos)).toBeGreaterThan(1);
                expect(range(structure.position, controller.pos)).toBeGreaterThan(2);
            }
            for (const other of layout.structures) {
                if (range(structure.position, other.position) === 0) {
                    expect(compatible(structure.structureType, other.structureType)).toBe(true);
                }
            }
        }
    });

    it("plans a recovery spawn without flags or surviving spawns", () => {
        const fixture = ownedRoom();
        fixture.structures.length = 0;
        const layout = planLayout(fixture.room)!;
        expect(layout).toBeDefined();
        expect(layout.structures.some(s => s.structureType === STRUCTURE_SPAWN && s.minimumRcl === 1)).toBe(true);
        expect(JSON.parse(JSON.stringify(layout))).toEqual(layout);
    });

    it("records inaccessible sources instead of generating unusable work assignments", () => {
        const {room, source, spawn} = ownedRoom();
        room.getTerrain = () => mock<RoomTerrain>({
            get: (x, y) => Math.max(Math.abs(x - source.pos.x), Math.abs(y - source.pos.y)) <= 1 ? TERRAIN_MASK_WALL : 0
        });
        const plan = planSources(room, spawn.pos)[source.id];
        expect(plan.accessible).toBe(false);
        expect(plan.carryRequirement).toBe(0);
        expect(plan.reason).toBeDefined();
    });

    it("persists source carry requirements and only replaces memory after invalidation", () => {
        const {room, source, spawn} = ownedRoom();
        initializeMemory();
        const model = buildRoomModel(room);
        const sources = planSources(room, spawn.pos, LAYOUT_REVISION);
        expect(sources[source.id].accessible).toBe(true);
        expect(sources[source.id].carryRequirement).toBeGreaterThan(0);
        expect(sources[source.id].workPosition).toEqual(sources[source.id].containerPosition);
        reconcilePlanning(model);
        const sites = Memory.colonies[room.name].construction.plannedSites;
        const plans = Memory.colonies[room.name].sourcePlans;
        reconcilePlanning(model);
        expect(Memory.colonies[room.name].construction.plannedSites).toBe(sites);
        expect(Memory.colonies[room.name].sourcePlans).toBe(plans);
        model.controller.level = 2;
        reconcilePlanning(model);
        expect(Memory.colonies[room.name].construction.plannedSites).not.toBe(sites);
    });
});

describe("bounded construction reconciliation", () => {
    function intentions(roomName: string, type: BuildableStructureConstant, count: number): PlannedStructure[] {
        return Array.from({length: count}, (_, index) => ({
            position: {x: 30 + index, y: 30, roomName}, structureType: type, minimumRcl: 1, priority: 50
        }));
    }

    it("respects current RCL structure counts and the per-tick site cap", () => {
        const {room} = ownedRoom("W1N1", 300, 2);
        initializeMemory();
        Memory.colonies[room.name].construction.plannedSites = intentions(room.name, STRUCTURE_EXTENSION, 10);
        const diagnostics = runConstruction(buildRoomModel(room));
        expect(diagnostics.created).toBe(Math.min(5, policy.constructionSitesPerTick));
        expect(room.createConstructionSite).toHaveBeenCalledTimes(diagnostics.created);
        expect(diagnostics.deferred).toBe(10 - diagnostics.created);
    });

    it("preserves the global site safety margin", () => {
        const {room} = ownedRoom("W1N1", 300, 2);
        initializeMemory();
        for (let index = 0; index < 100 - policy.constructionSiteSafetyMargin; index++) {
            Game.constructionSites[String(index)] = mock<ConstructionSite>({});
        }
        Memory.colonies[room.name].construction.plannedSites = intentions(room.name, STRUCTURE_ROAD, 4);
        expect(runConstruction(buildRoomModel(room)).created).toBe(0);
        expect(room.createConstructionSite).not.toHaveBeenCalled();
    });

    it("allows road/container/rampart coexistence and quarantines incompatible occupancy", () => {
        const {room, structures} = ownedRoom("W1N1", 300, 3);
        initializeMemory();
        structures.push(mock<StructureContainer>({
            id: "container" as Id<StructureContainer>, structureType: STRUCTURE_CONTAINER,
            pos: new RoomPosition(30, 30, room.name), store: store(), hits: 1000, hitsMax: 1000
        }));
        const memory = Memory.colonies[room.name].construction;
        memory.plannedSites = [
            ...intentions(room.name, STRUCTURE_ROAD, 1), ...intentions(room.name, STRUCTURE_EXTENSION, 1)
        ];
        const result = runConstruction(buildRoomModel(room));
        expect(result.created).toBe(1);
        expect(result.blocked).toBe(1);
        expect(Object.values(memory.blocked)[0].permanent).toBe(true);
        expect(room.createConstructionSite).toHaveBeenCalledWith(30, 30, STRUCTURE_ROAD);
    });
});

describe("defense and structure execution", () => {
    it("accounts for active boosted combat and tough parts", () => {
        const hostile = mock<Creep>({
            id: "hostile" as Id<Creep>, pos: new RoomPosition(20, 20, "W1N1"),
            body: [
                {type: ATTACK, hits: 100, boost: RESOURCE_CATALYZED_UTRIUM_ACID},
                {type: HEAL, hits: 100, boost: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE},
                {type: TOUGH, hits: 100, boost: RESOURCE_CATALYZED_GHODIUM_ALKALIDE},
                {type: RANGED_ATTACK, hits: 0}
            ]
        });
        const result = assessThreat([hostile]);
        expect(result.attack).toBe(120);
        expect(result.heal).toBe(48);
        expect(result.ranged).toBe(0);
        expect(result.toughness).toBeCloseTo(100 / 0.3);
    });

    it("requests safe mode for an undefended breach and executes the decision", () => {
        const {room, hostiles, spawn, controller} = ownedRoom();
        initializeMemory();
        hostiles.push(mock<Creep>({
            id: "intruder" as Id<Creep>, pos: new RoomPosition(spawn.pos.x + 1, spawn.pos.y, room.name),
            body: [{type: ATTACK, hits: 100}], getActiveBodyparts: part => part === ATTACK ? 1 : 0
        }));
        const model = buildRoomModel(room);
        const defense = planDefense(model);
        expect(defense.activateSafeMode).toBe(true);
        expect(defense.defenderDemands).toHaveLength(3);
        runStructures(model, planStructures(model, defense));
        expect(controller.activateSafeMode).toHaveBeenCalledTimes(1);
    });

    it("executes multiple lab outputs without overspending shared reagents", () => {
        const {room, structures, objects} = ownedRoom("W1N1", 300, 8);
        initializeMemory();
        Memory.empire.production[room.name] = {compound: RESOURCE_HYDROXIDE};
        const labs = [["a", 10, 20, RESOURCE_HYDROGEN, 5], ["b", 10, 22, RESOURCE_OXYGEN, 5],
            ["c", 11, 21, undefined, 0], ["d", 9, 21, undefined, 0]].map(([id, x, y, mineralType, amount]) => {
            const lab = mock<StructureLab>({
                id: id as Id<StructureLab>, room, my: true, structureType: STRUCTURE_LAB,
                pos: new RoomPosition(x as number, y as number, room.name), cooldown: 0, isActive: () => true,
                mineralType: mineralType as MineralConstant,
                store: store(0, 3000, mineralType ? {[mineralType]: amount} : {}) as StructureLab["store"],
                runReaction: jest.fn<StructureLab["runReaction"]>().mockReturnValue(OK)
            });
            structures.push(lab);
            objects.set(lab.id, lab);
            return lab;
        });
        const cluster = selectReactionLabs(labs, RESOURCE_HYDROXIDE)!;
        expect([cluster.inputA.id, cluster.inputB.id].sort()).toEqual(["a", "b"]);
        const model = buildRoomModel(room);
        const plan = planStructures(model, planDefense(model));
        expect(plan.reactions).toHaveLength(2);
        runStructures(model, plan);
        expect(cluster.outputs.reduce((count, output) => count + jest.mocked(output.runReaction).mock.calls.length, 0)).toBe(1);
    });

    it("enforces factory resources and makes no duplicate production intents", () => {
        const {room, structures, objects} = ownedRoom("W1N1", 300, 8);
        initializeMemory();
        const factory = mock<StructureFactory>({
            id: "factory" as Id<StructureFactory>, room, my: true, structureType: STRUCTURE_FACTORY,
            pos: new RoomPosition(20, 20, room.name), cooldown: 0, isActive: () => true,
            store: store(600, 50000), produce: jest.fn<StructureFactory["produce"]>().mockReturnValue(OK)
        });
        structures.push(factory);
        objects.set(factory.id, factory);
        Memory.empire.production[room.name] = {factoryResource: RESOURCE_BATTERY};
        const model = buildRoomModel(room);
        const plan = emptyPlan();
        plan.factories = [{factoryId: factory.id, resource: RESOURCE_BATTERY}, {
            factoryId: factory.id,
            resource: RESOURCE_BATTERY
        }];
        runStructures(model, plan);
        expect(factory.produce).toHaveBeenCalledTimes(1);
        factory.store = store(0, 50000);
        runStructures(model, plan);
        expect(factory.produce).toHaveBeenCalledTimes(1);
    });

    it("directs source links to demand without overfilling a shared receiver", () => {
        const {room, structures, objects, source, controller} = ownedRoom("W1N1", 300, 8);
        initializeMemory();
        Memory.colonies[room.name].sourcePlans = planSources(room, {x: 22, y: 22, roomName: room.name});
        const work = Memory.colonies[room.name].sourcePlans[source.id].workPosition;
        const links = [
            {id: "source-a", x: work.x, y: work.y + 1, energy: 800},
            {id: "source-b", x: work.x + 1, y: work.y, energy: 800},
            {id: "controller-link", x: controller.pos.x - 1, y: controller.pos.y, energy: 200}
        ].map(value => {
            const link = mock<StructureLink>({
                id: value.id as Id<StructureLink>, structureType: STRUCTURE_LINK, room, my: true, isActive: () => true,
                pos: new RoomPosition(value.x, value.y, room.name), cooldown: 0,
                store: store(value.energy, 800) as StructureLink["store"],
                transferEnergy: jest.fn<StructureLink["transferEnergy"]>().mockReturnValue(OK)
            });
            structures.push(link);
            objects.set(link.id, link);
            return link;
        });
        const model = buildRoomModel(room);
        const plan = planStructures(model, planDefense(model));
        expect(plan.links).toHaveLength(1);
        expect(plan.links[0]).toEqual({from: links[0].id, to: links[2].id, amount: 600});
        runStructures(model, plan);
        expect(links[0].transferEnergy).toHaveBeenCalledWith(links[2], 600);
        expect(links[2].transferEnergy).not.toHaveBeenCalled();
    });

    it("observes oldest reachable unseen intel rather than visible rooms", () => {
        const {room, structures, objects} = ownedRoom("W1N1", 300, 8);
        initializeMemory();
        const observer = mock<StructureObserver>({
            id: "observer" as Id<StructureObserver>, structureType: STRUCTURE_OBSERVER, room, my: true,
            pos: new RoomPosition(20, 20, room.name), isActive: () => true,
            observeRoom: jest.fn<StructureObserver["observeRoom"]>().mockReturnValue(OK)
        });
        structures.push(observer);
        objects.set(observer.id, observer);
        for (const [name, tick] of [["W1N1", 0], ["W1N2", 10], ["W1N3", 5]] as const) {
            Memory.intel[name] = {lastSeen: tick, sources: [], threat, keeper: false, highway: false, routes: {}};
        }
        const model = buildRoomModel(room);
        const plan = planStructures(model, planDefense(model));
        expect(plan.observations).toEqual([{observerId: observer.id, roomName: "W1N3"}]);
        runStructures(model, plan);
        expect(observer.observeRoom).toHaveBeenCalledWith("W1N3");
    });
});
