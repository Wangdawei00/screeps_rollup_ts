import {assignmentMatchesRole, isAssignment, isCreepRole, isPosition} from "@/domain/types";
import type {SpawnRequest} from "@/domain/types";
import {runIsolated} from "@/kernel/scheduler";

export const CURRENT_MEMORY_VERSION = 2;
const QUARANTINE_LIMIT = 30;
const MAX_ROOM_ENERGY = 12_900;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createColonyMemory(): ColonyMemory {
    return {
        stage: "bootstrap", stageChangedAt: Game.time, established: false,
        sourcePlans: {}, spawnQueue: [], quarantine: [], logisticsJobs: {}, workJobs: {}, remotes: {},
        construction: {
            lastRcl: 0, revision: 0, anchorKey: "", structureSignature: "",
            plannedSites: [], blocked: {}, lastPlannedAt: 0
        },
        defense: {lastThreatTick: 0, history: [], lastSafeModeAttempt: 0}
    };
}

function repairFields(target: object, defaults: object, context: string): void {
    for (const [field, initial] of Object.entries(defaults)) {
        const current: unknown = Reflect.get(target, field);
        const valid = Array.isArray(initial) ? Array.isArray(current) :
            isRecord(initial) ? isRecord(current) :
                typeof current === typeof initial && (typeof current !== "number" || Number.isFinite(current));
        if (!valid) {
            if (current !== undefined) console.log(`[memory:${context}] invalid ${field}; reinitializing field`);
            Reflect.set(target, field, initial);
        } else if (isRecord(initial) && isRecord(current)) {
            repairFields(current, initial, `${context}.${field}`);
        }
    }
}

export function ensureColony(roomName: string): ColonyMemory {
    if (!isRecord(Memory.colonies[roomName])) {
        if (Memory.colonies[roomName] !== undefined) console.log(`[memory:${roomName}] invalid colony record`);
        Memory.colonies[roomName] = createColonyMemory();
    }
    const colony = Memory.colonies[roomName];
    repairFields(colony, createColonyMemory(), roomName);
    if (!["bootstrap", "developing", "stable", "recovering", "underAttack"].includes(colony.stage)) {
        console.log(`[memory:${roomName}] invalid stage ${colony.stage}`);
        colony.stage = "recovering";
    }
    if (colony.anchor !== undefined && !isPosition(colony.anchor)) {
        console.log(`[memory:${roomName}] invalid anchor; requesting replan`);
        delete colony.anchor;
        colony.construction.revision = 0;
    }
    for (const [id, plan] of Object.entries(colony.sourcePlans)) {
        if (!plan || typeof plan.sourceId !== "string" || !isPosition(plan.workPosition) ||
            !isPosition(plan.containerPosition) || !Array.isArray(plan.path) || !plan.path.every(isPosition) ||
            !Number.isFinite(plan.pathLength) || plan.pathLength < 0 ||
            !Number.isFinite(plan.carryRequirement) || plan.carryRequirement < 0 ||
            !Number.isFinite(plan.expectedIncome) || plan.expectedIncome < 0 || typeof plan.accessible !== "boolean") {
            console.log(`[memory:${roomName}] invalid source plan ${id}; requesting replan`);
            delete colony.sourcePlans[id];
            colony.construction.revision = 0;
        }
    }
    return colony;
}

function initializeRoots(): void {
    const defaults = {
        creeps: {}, rooms: {}, colonies: {}, intel: {},
        empire: {
            createdAt: Game.time,
            expansion: {stage: "idle", candidates: [], changedAt: Game.time},
            market: {lastAnalysis: 0, terminalGoals: [], orders: {}}, production: {}
        }
    };
    repairFields(Memory, defaults, "root");
    if (!["idle", "scouting", "selected", "claiming", "spawnSite", "bootstrapping", "complete"].includes(Memory.empire.expansion.stage)) {
        console.log(`[memory:empire] invalid expansion stage ${Memory.empire.expansion.stage}; cancelling campaign`);
        Memory.empire.expansion = {
            stage: "idle",
            candidates: [],
            changedAt: Game.time,
            failureReason: "Invalid persisted stage"
        };
    }
}

const migrations: Record<number, () => void> = {
    0: () => {
        initializeRoots();
        // Legacy room-owned queues are migrated, then validated by normal cleanup.
        for (const [name, room] of Object.entries(Memory.rooms)) {
            if (!isRecord(room) || Memory.colonies[name]) continue;
            const colony = createColonyMemory();
            const legacy = room as Record<string, unknown>;
            if (Array.isArray(legacy.spawnQueue)) colony.spawnQueue = legacy.spawnQueue;
            Memory.colonies[name] = colony;
        }
    },
    1: () => {
        initializeRoots();
        for (const name of Object.keys(Memory.colonies)) ensureColony(name);
        for (const creep of Object.values(Memory.creeps)) {
            if (!isRecord(creep)) {
                console.log("[memory:creeps] invalid legacy creep record; leaving it for role diagnostics/cleanup");
                continue;
            }
            const legacy = creep as CreepMemory & { jobId?: string | number };
            if (typeof legacy.jobId === "string" && legacy.assignment?.type === "logistics" && !legacy.assignment.jobId) {
                legacy.assignment.jobId = legacy.jobId;
            }
            delete legacy.jobId;
        }
    }
};

export function initializeMemory(): void {
    if (Memory.schemaVersion === undefined) Memory.schemaVersion = 0;
    if (!Number.isInteger(Memory.schemaVersion) || Memory.schemaVersion < 0 || Memory.schemaVersion > CURRENT_MEMORY_VERSION) {
        throw new Error(`Unsupported memory schema version ${Memory.schemaVersion}`);
    }
    while (Memory.schemaVersion < CURRENT_MEMORY_VERSION) {
        const previous = Memory.schemaVersion;
        migrations[previous]();
        Memory.schemaVersion = previous + 1;
    }
    initializeRoots();
    for (const name of Object.keys(Memory.colonies)) {
        runIsolated(`memory:init:${name}`, () => ensureColony(name));
    }
    for (const room of Object.values(Game.rooms)) {
        if (room.controller?.my) runIsolated(`memory:init:${room.name}`, () => ensureColony(room.name));
    }
}

export function spawnRequestError(value: unknown, homeRoom?: string): string | undefined {
    if (!isRecord(value)) return "request must be an object";
    if (!isCreepRole(value.role)) return "unknown role";
    if (typeof value.key !== "string" || !value.key.trim()) return "missing stable demand key";
    if (typeof value.homeRoom !== "string" || !value.homeRoom || (homeRoom && value.homeRoom !== homeRoom)) return "invalid home room";
    if (!Array.isArray(value.body) || !value.body.length || value.body.length > 50) return "invalid body length";
    let cost = 0;
    for (const part of value.body) {
        if (typeof part !== "string" || !Object.prototype.hasOwnProperty.call(BODYPART_COST, part)) return "invalid body part";
        cost += BODYPART_COST[part as BodyPartConstant];
    }
    if (cost > MAX_ROOM_ENERGY) return "body exceeds theoretical room energy capacity";
    if (typeof value.priority !== "number" || !Number.isFinite(value.priority)) return "invalid priority";
    if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) ||
        typeof value.attempts !== "number" || !Number.isInteger(value.attempts) || value.attempts < 0) return "invalid queue metadata";
    if (value.travelEstimate !== undefined &&
        (typeof value.travelEstimate !== "number" || !Number.isFinite(value.travelEstimate) || value.travelEstimate < 0)) return "invalid travel estimate";
    if (value.assignment !== undefined && !isAssignment(value.assignment)) return "invalid assignment";
    const assignment = isAssignment(value.assignment) ? value.assignment : undefined;
    if (!assignmentMatchesRole(value.role, assignment)) return "assignment does not match role";
    if (!value.body.includes(MOVE)) return "body cannot move";
    const useful = value.role === "reserver" || value.role === "claimer" ? CLAIM :
        value.role === "transporter" ? CARRY : value.role === "scout" ? MOVE :
            value.role === "defender" ? undefined : WORK;
    if (useful && !value.body.includes(useful)) return "body has no useful role part";
    if (value.role === "defender" && !value.body.some(part => part === ATTACK || part === RANGED_ATTACK)) return "defender has no attack part";
    if (["harvester", "miner", "mineralMiner", "worker", "upgrader"].includes(value.role) && !value.body.includes(CARRY)) return "worker body cannot carry";
    return undefined;
}

export function quarantineRequest(colony: ColonyMemory, value: unknown, reason: string): void {
    const key = isRecord(value) && typeof value.key === "string" ? value.key : "<invalid>";
    colony.quarantine.push({key, reason, tick: Game.time});
    colony.quarantine = colony.quarantine.slice(-QUARANTINE_LIMIT);
    console.log(`[spawn:quarantine:${key}] ${reason}`);
}

function validJob(value: unknown, id: string): boolean {
    if (!isRecord(value) || value.id !== id || typeof value.roomName !== "string" ||
        typeof value.resource !== "string" || !RESOURCES_ALL.some(resource => resource === value.resource) ||
        typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0 ||
        typeof value.expiresAt !== "number" || !Number.isFinite(value.expiresAt)) return false;
    const endpoint = (candidate: unknown): boolean => isRecord(candidate) &&
        (candidate.type === "store" || candidate.type === "drop") &&
        typeof candidate.id === "string" && isPosition(candidate.position);
    return endpoint(value.pickup) && endpoint(value.delivery) && isRecord(value.delivery) && value.delivery.type === "store";
}

export function cleanupMemory(): void {
    const spawningNames = new Set(Object.values(Game.spawns).flatMap(spawn => spawn.spawning ? [spawn.spawning.name] : []));
    for (const name of Object.keys(Memory.creeps)) {
        if (!Game.creeps[name] && !spawningNames.has(name)) delete Memory.creeps[name];
    }
    for (const [name, colony] of Object.entries(Memory.colonies)) {
        runIsolated(`memory:cleanup:${name}`, () => {
            const keys = new Set<string>();
            colony.spawnQueue = colony.spawnQueue.filter((request: SpawnRequest) => {
                const reason = spawnRequestError(request, name);
                if (reason) {
                    quarantineRequest(colony, request, reason);
                    return false;
                }
                if (keys.has(request.key)) return false;
                keys.add(request.key);
                return true;
            });
            for (const [id, job] of Object.entries(colony.logisticsJobs)) {
                const valid = validJob(job, id);
                if (!valid || job.expiresAt <= Game.time) {
                    if (!valid) console.log(`[memory:${name}] invalid logistics job ${id}`);
                    delete colony.logisticsJobs[id];
                } else if (job.lease && (!Game.creeps[job.lease.creepName] ||
                    !Number.isFinite(job.lease.leaseUntil) || job.lease.leaseUntil <= Game.time)) {
                    delete job.lease;
                }
            }
        });
    }
}
