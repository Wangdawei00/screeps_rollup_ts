import { describe, expect, it, jest } from "@jest/globals";
import { CURRENT_MEMORY_VERSION, cleanupMemory, initializeMemory } from "../src/kernel/memory";
import { Scheduler } from "../src/kernel/scheduler";
import { buildRoomModel } from "../src/colony/roomModel";
import { demandSatisfied, planPopulation, reconcilePopulation } from "../src/colony/populationPlanner";
import { runSpawns } from "../src/colony/spawnManager";
import type { CreepDemand, DefensePlan, LogisticsJob, SpawnRequest } from "../src/domain/types";
import { addCreep, mock, ownedRoom } from "./fixtures";

const peace: DefensePlan = {
    threat: { attack: 0, ranged: 0, heal: 0, dismantle: 0, toughness: 0, total: 0, targetPriority: [] },
    activateSafeMode: false, defenderDemands: []
};

function demand(homeRoom = "W1N1"): CreepDemand {
    return { key: "local:harvester:W1N1:0", role: "harvester", homeRoom, priority: 1000, body: [WORK, CARRY, MOVE] };
}

function queued(value = demand()): SpawnRequest {
    return { ...value, attempts: 0, createdAt: Game.time };
}

describe("persistent lifecycle and desired population", () => {
    it("initializes empty memory and preserves records at migration boundaries", () => {
        ownedRoom();
        initializeMemory();
        expect(Memory.schemaVersion).toBe(CURRENT_MEMORY_VERSION);
        expect(Memory.colonies.W1N1.stage).toBe("bootstrap");
        expect(Memory.empire.expansion.stage).toBe("idle");
        Memory.colonies.W1N1.spawnQueue.push(queued());
        const serialized = JSON.stringify(Memory);
        initializeMemory();
        expect(JSON.stringify(Memory)).toBe(serialized);
    });

    it("creates an affordable bootstrap creep with zero creeps and 300 energy", () => {
        const { room, spawn } = ownedRoom();
        initializeMemory();
        const model = buildRoomModel(room);
        reconcilePopulation(model, planPopulation(model, peace));
        expect(Memory.colonies.W1N1.spawnQueue.filter(r => r.role === "harvester")).toHaveLength(1);
        runSpawns(model);
        expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
        const call = jest.mocked(spawn.spawnCreep).mock.calls[0];
        expect(call[0]).toContain(WORK);
        expect(call[2]?.memory?.demandKey).toBe("local:harvester:W1N1:0");
        expect(call[0].reduce((sum, part) => sum + BODYPART_COST[part], 0)).toBeLessThanOrEqual(300);
    });

    it("deduplicates living, spawning and queued demand slots", () => {
        const { room, spawn } = ownedRoom();
        initializeMemory();
        const model = buildRoomModel(room);
        reconcilePopulation(model, [demand(), demand()]);
        reconcilePopulation(model, [demand()]);
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(1);
        const creep = addCreep(room, "harvester", demand().key);
        reconcilePopulation(model, [demand()]);
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(0);
        delete Game.creeps[creep.name];
        spawn.spawning = mock<Spawning>({ name: creep.name, remainingTime: 5 });
        cleanupMemory();
        expect(demandSatisfied(demand())).toBe(true);
        expect(Memory.creeps[creep.name]).toBeDefined();
    });

    it("replaces an aging miner before spawn and travel time run out", () => {
        const { room, source } = ownedRoom();
        initializeMemory();
        const minerDemand: CreepDemand = {
            ...demand(), key: "local:miner:source:0", role: "miner", travelEstimate: 30,
            assignment: { type: "source", sourceId: source.id, workPosition: { x: 11, y: 10, roomName: room.name } }
        };
        const creep = addCreep(room, "miner", minerDemand.key, 100);
        creep.memory.assignment = minerDemand.assignment;
        expect(demandSatisfied(minerDemand)).toBe(true);
        creep.ticksToLive = 53;
        expect(demandSatisfied(minerDemand)).toBe(false);
        reconcilePopulation(buildRoomModel(room), [minerDemand]);
        expect(Memory.colonies.W1N1.spawnQueue[0].key).toBe(minerDemand.key);
    });

    it("does not let a malformed or disabled creep suppress emergency replacement", () => {
        const { room } = ownedRoom();
        initializeMemory();
        const creep = addCreep(room, "harvester", demand().key);
        Reflect.set(creep.memory, "role", "unsupported");
        expect(demandSatisfied(demand())).toBe(false);
        reconcilePopulation(buildRoomModel(room), [demand()]);
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(1);
        creep.memory.role = "harvester";
        creep.body.find(part => part.type === WORK)!.hits = 0;
        expect(demandSatisfied(demand())).toBe(false);
        reconcilePopulation(buildRoomModel(room), [demand()]);
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(1);
    });

    it("quarantines malformed requests and consumes an affordable emergency behind an expensive request", () => {
        const { room, spawn } = ownedRoom();
        initializeMemory();
        const colony = Memory.colonies.W1N1;
        colony.spawnQueue = [queued({ ...demand(), key: "bad", body: [] }),
            queued({ ...demand(), key: "expensive", priority: 2000, body: [WORK, WORK, WORK, CARRY, MOVE] }),
            queued()];
        runSpawns(buildRoomModel(room));
        expect(colony.quarantine[0].key).toBe("bad");
        expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
        expect(colony.spawnQueue.map(request => request.key)).toEqual(["expensive"]);
    });

    it("uses distinct requests at multiple idle spawns", () => {
        const { room, spawn } = ownedRoom("W1N1", 600);
        initializeMemory();
        const other = mock<StructureSpawn>({
            ...spawn, id: "second" as Id<StructureSpawn>, name: "Second",
            spawnCreep: jest.fn<StructureSpawn["spawnCreep"]>().mockReturnValue(OK)
        });
        const model = buildRoomModel(room);
        model.spawns.push(other);
        Memory.colonies.W1N1.spawnQueue = [queued(), queued({ ...demand(), key: "other" })];
        runSpawns(model);
        expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
        expect(other.spawnCreep).toHaveBeenCalledTimes(1);
        expect(jest.mocked(spawn.spawnCreep).mock.calls[0][1]).not.toEqual(jest.mocked(other.spawnCreep).mock.calls[0][1]);
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(0);
    });

    it("keeps transient failures but quarantines permanent spawn failures", () => {
        const { room, spawn } = ownedRoom();
        initializeMemory();
        Memory.colonies.W1N1.spawnQueue = [queued()];
        jest.mocked(spawn.spawnCreep).mockReturnValueOnce(ERR_BUSY).mockReturnValueOnce(ERR_INVALID_ARGS);
        runSpawns(buildRoomModel(room));
        expect(Memory.colonies.W1N1.spawnQueue[0].attempts).toBe(1);
        runSpawns(buildRoomModel(room));
        expect(Memory.colonies.W1N1.spawnQueue).toHaveLength(0);
        expect(Memory.colonies.W1N1.quarantine).toHaveLength(1);
    });

    it("expires dead-creep leases and overdue jobs", () => {
        ownedRoom();
        initializeMemory();
        const position = { x: 20, y: 20, roomName: "W1N1" };
        const job: LogisticsJob = {
            id: "job", roomName: "W1N1", resource: RESOURCE_ENERGY, amount: 50,
            pickup: { type: "store", id: "pickup" as Id<StructureContainer>, position },
            delivery: { type: "store", id: "delivery" as Id<StructureSpawn>, position },
            priority: 80, createdAt: 1, lastSeenAt: 1, expiresAt: 100,
            lease: { creepName: "dead", leaseUntil: 50 }
        };
        Memory.colonies.W1N1.logisticsJobs.job = job;
        cleanupMemory();
        expect(job.lease).toBeUndefined();
        Game.time = 100;
        cleanupMemory();
        expect(Memory.colonies.W1N1.logisticsJobs.job).toBeUndefined();
    });

    it("sets underAttack for combat threats and recovering after population loss", () => {
        const { room, hostiles } = ownedRoom();
        initializeMemory();
        Memory.colonies.W1N1.established = true;
        expect(buildRoomModel(room).stage).toBe("recovering");
        const hostile = mock<Creep>({ getActiveBodyparts: part => part === ATTACK ? 1 : 0 });
        hostiles.push(hostile);
        expect(buildRoomModel(room).stage).toBe("underAttack");
        hostiles.pop();
        const model = buildRoomModel(room);
        const desired = planPopulation(model, peace);
        expect(desired.some(request => request.role === "harvester")).toBe(true);
    });
});

describe("scheduler", () => {
    it("orders priorities, isolates exceptions, and honors intervals and CPU conditions", () => {
        const scheduler = new Scheduler();
        const calls: string[] = [];
        const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
        scheduler.register({ name: "low", priority: "low", interval: 1, run: () => { calls.push("low"); } });
        scheduler.register({ name: "failed", priority: "critical", interval: 1, run: () => { throw Error("broken"); } });
        scheduler.register({ name: "normal", priority: "normal", interval: 1, run: () => { calls.push("normal"); } });
        scheduler.register({ name: "critical", priority: "critical", interval: 1, run: () => { calls.push("critical"); } });
        scheduler.register({ name: "not-due", priority: "critical", interval: 5, run: () => { calls.push("not-due"); } });
        scheduler.register({ name: "cpu", priority: "low", interval: 1, condition: () => false, run: () => { calls.push("cpu"); } });
        scheduler.run();
        expect(calls).toEqual(["critical", "normal", "low"]);
        expect(log).toHaveBeenCalledWith(expect.stringContaining("failed"));
        log.mockRestore();
    });

    it("rejects duplicate names and invalid intervals", () => {
        const scheduler = new Scheduler();
        const process = { name: "test", priority: "normal" as const, interval: 1, run: () => undefined };
        scheduler.register(process);
        expect(() => scheduler.register(process)).toThrow("Duplicate");
        expect(() => scheduler.register({ ...process, name: "bad", interval: 0 })).toThrow("Invalid interval");
    });
});
