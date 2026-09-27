import policy from "../config/policy";
import { serializePosition } from "../domain/types";
import type { LogisticsEndpoint, LogisticsJob, LogisticsStore, WorkJob } from "../domain/types";
import type { RoomModel } from "./roomModel";

function jobs(): LogisticsJob[] {
    return Object.values(Memory.colonies).flatMap(colony => Object.values(colony.logisticsJobs));
}

export function carriedAmount(job: LogisticsJob): number {
    const creep = job.lease && Game.creeps[job.lease.creepName];
    return creep ? Math.min(job.amount, creep.store[job.resource] || 0) : 0;
}

function sourceAmount(endpoint: LogisticsEndpoint, resource: ResourceConstant): number | undefined {
    const source = Game.getObjectById(endpoint.id);
    if (!source) return Game.rooms[endpoint.position.roomName] ? 0 : undefined;
    if ("resourceType" in source) return source.resourceType === resource ? source.amount : 0;
    return source.store[resource] || 0;
}

function capacity(job: LogisticsJob, others: LogisticsJob[]): number {
    const target = Game.getObjectById(job.delivery.id);
    if (!target) return Game.rooms[job.delivery.position.roomName] ? 0 : job.amount;
    const reserved = others.filter(other => other.delivery.id === job.delivery.id);
    const resourceFree = target.store.getFreeCapacity(job.resource) || 0;
    const totalFree = target.store.getFreeCapacity();
    return Math.max(0, Math.min(
        resourceFree - reserved.filter(other => other.resource === job.resource).reduce((sum, other) => sum + other.amount, 0),
        totalFree === null ? Infinity : totalFree - reserved.reduce((sum, other) => sum + other.amount, 0)
    ));
}

function clamp(job: LogisticsJob): number {
    const others = jobs().filter(other => other.id !== job.id &&
        (other.expiresAt >= Game.time || carriedAmount(other) > 0));
    const stock = sourceAmount(job.pickup, job.resource);
    const reserved = others.filter(other => other.pickup.id === job.pickup.id && other.resource === job.resource)
        .reduce((sum, other) => sum + Math.max(0, other.amount - carriedAmount(other)), 0);
    const supply = stock === undefined ? job.amount : Math.max(0, stock - reserved) + carriedAmount(job);
    return Math.max(0, Math.floor(Math.min(job.amount, supply, capacity(job, others))));
}

function upsert(homeRoom: string, pickup: LogisticsEndpoint, delivery: LogisticsJob["delivery"],
    resource: ResourceConstant, amount: number, priority: number, prefix: string): LogisticsJob | undefined {
    const board = Memory.colonies[homeRoom]?.logisticsJobs;
    if (!board || pickup.id === delivery.id || !Number.isFinite(amount) || amount <= 0) return undefined;
    const id = `${prefix}:${homeRoom}:${resource}:${pickup.id}:${delivery.id}`;
    const existing = board[id];
    // In-flight jobs own their allocation until the executor acknowledges delivery.
    if (existing?.lease && Game.creeps[existing.lease.creepName] && existing.lease.leaseUntil >= Game.time) {
        existing.expiresAt = Game.time + 100;
        return existing;
    }
    const job: LogisticsJob = existing || {
        id, roomName: homeRoom, resource, amount, pickup, delivery, priority,
        createdAt: Game.time, lastSeenAt: Game.time, expiresAt: Game.time + 100
    };
    job.amount = Math.floor(amount);
    job.priority = priority;
    job.expiresAt = Game.time + 100;
    if (Game.getObjectById(pickup.id) || Game.getObjectById(delivery.id)) job.lastSeenAt = Game.time;
    const displaced = jobs().filter(other => other.id !== id && !other.lease && other.priority < priority &&
        ((other.pickup.id === pickup.id && other.resource === resource) || other.delivery.id === delivery.id));
    for (const other of displaced) delete Memory.colonies[other.roomName].logisticsJobs[other.id];
    job.amount = clamp(job);
    if (job.amount <= 0) {
        delete board[id];
        for (const other of displaced) Memory.colonies[other.roomName].logisticsJobs[other.id] = other;
        return undefined;
    }
    board[id] = job;
    for (const other of displaced.sort((a, b) => b.priority - a.priority)) {
        other.amount = clamp(other);
        if (other.amount > 0) Memory.colonies[other.roomName].logisticsJobs[other.id] = other;
    }
    return job;
}

export function upsertLogisticsJob(homeRoom: string, pickup: LogisticsEndpoint, delivery: LogisticsJob["delivery"],
    resource: ResourceConstant, amount: number, priority: number): LogisticsJob | undefined {
    return upsert(homeRoom, pickup, delivery, resource, amount, priority, "transport");
}

export function releaseJob(creep: Creep): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "logistics") return;
    const board = Memory.colonies[creep.memory.homeRoom]?.logisticsJobs;
    const job = assignment.jobId && board?.[assignment.jobId];
    if (job && job.lease?.creepName === creep.name) {
        delete job.lease;
        if (job.amount <= 0) delete board[job.id];
    }
    delete assignment.jobId;
    delete creep.memory.state;
}

export function renewJob(creep: Creep, job: LogisticsJob): void {
    if (job.lease?.creepName === creep.name) {
        job.lease.leaseUntil = Game.time + policy.logisticsLeaseDuration;
        job.expiresAt = Math.max(job.expiresAt, job.lease.leaseUntil + 1);
    }
}

export function claimJob(creep: Creep): LogisticsJob | undefined {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "logistics") return undefined;
    const board = Memory.colonies[creep.memory.homeRoom]?.logisticsJobs;
    if (!board) return undefined;
    const current = assignment.jobId && board[assignment.jobId];
    if (current && current.lease?.creepName === creep.name && current.lease.leaseUntil >= Game.time) return current;
    releaseJob(creep);
    const candidates = Object.values(board).filter(job => job.amount > 0 && job.expiresAt >= Game.time &&
        (!job.lease || !Game.creeps[job.lease.creepName] || job.lease.leaseUntil < Game.time) &&
        (assignment.targetRoom ? job.pickup.position.roomName === assignment.targetRoom ||
            job.delivery.position.roomName === assignment.targetRoom :
            job.pickup.position.roomName === creep.memory.homeRoom && job.delivery.position.roomName === creep.memory.homeRoom) &&
        [job.pickup.position.roomName, job.delivery.position.roomName].every(roomName => {
            if (roomName === creep.memory.homeRoom) return true;
            const intel = Memory.intel[roomName];
            return !intel || (!intel.keeper && (intel.inaccessibleUntil || 0) <= Game.time &&
                !(intel.lastSeen + policy.intelMaxAge >= Game.time && intel.threat.total > 0));
        }));
    candidates.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    for (const job of candidates) {
        job.amount = clamp(job);
        if (job.amount <= 0) continue;
        job.lease = { creepName: creep.name, leaseUntil: Game.time + policy.logisticsLeaseDuration };
        assignment.jobId = job.id;
        creep.memory.state = creep.store[job.resource] > 0 ? "deliver" : "pickup";
        return job;
    }
    return undefined;
}

function endpoint(store: LogisticsStore): LogisticsEndpoint {
    return { type: "store", id: store.id, position: serializePosition(store.pos) };
}

function reconcileWork(model: RoomModel): void {
    const board: Record<string, WorkJob> = {};
    for (const site of model.constructionSites) {
        const priority = site.structureType === STRUCTURE_SPAWN ? 100 :
            site.structureType === STRUCTURE_CONTAINER ? 90 :
                site.structureType === STRUCTURE_EXTENSION ? 80 : site.structureType === STRUCTURE_TOWER ? 75 : 50;
        board[`build:${site.id}`] = { id: `build:${site.id}`, type: "build", targetId: site.id, priority };
    }
    for (const structure of model.structures) {
        if ("my" in structure && !structure.my) continue;
        const barrier = structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART;
        const targetHits = barrier ? Math.min(structure.hitsMax, policy.wallTargetHitsByRcl[model.controller.level] || 0) :
            structure.hitsMax;
        if (structure.hits >= targetHits || targetHits <= 0) continue;
        const income = structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_ROAD;
        const priority = income && structure.hits < structure.hitsMax * 0.3 ? 95 : barrier ? 10 : income ? 40 : 30;
        board[`repair:${structure.id}`] = { id: `repair:${structure.id}`, type: "repair", targetId: structure.id, targetHits, priority };
    }
    Memory.colonies[model.name].workJobs = board;
}

export function reconcileLogistics(model: RoomModel): void {
    const board = Memory.colonies[model.name].logisticsJobs;
    const previousCreation = new Map(Object.values(board).map(job => [job.id, job.createdAt]));
    for (const job of Object.values(board)) {
        if (job.lease && (!Game.creeps[job.lease.creepName] || job.lease.leaseUntil < Game.time)) delete job.lease;
        if (job.lease && carriedAmount(job) > 0) {
            job.expiresAt = Math.max(job.expiresAt, job.lease.leaseUntil + 1);
            continue;
        }
        if (!job.lease && (job.id.startsWith("local:") || job.expiresAt < Game.time)) delete board[job.id];
        else if (!job.lease) {
            job.amount = clamp(job);
            if (job.amount <= 0) delete board[job.id];
        }
    }
    const controllerStores = [...model.containers, ...model.links].filter(store => store.pos.inRangeTo(model.controller, 3));
    const sourceStores = model.containers.filter(store => !controllerStores.includes(store));
    const supplies: { endpoint: LogisticsEndpoint; resource: ResourceConstant; amount: number; salvage: boolean }[] = [];
    for (const store of [...model.tombstones, ...model.ruins, ...sourceStores,
        ...(model.storage ? [model.storage] : []), ...(model.terminal ? [model.terminal] : [])]) {
        for (const resource of Object.keys(store.store) as ResourceConstant[]) {
            const amount = store.store[resource] || 0;
            if (amount > 0) supplies.push({ endpoint: endpoint(store), resource, amount,
                salvage: "deathTime" in store || "destroyTime" in store });
        }
    }
    for (const drop of model.droppedResources) supplies.unshift({
        endpoint: { type: "drop", id: drop.id, position: serializePosition(drop.pos) },
        resource: drop.resourceType, amount: drop.amount, salvage: true
    });
    const demands: { target: AnyStoreStructure; resource: ResourceConstant; amount: number; priority: number }[] = [];
    const demand = (target: AnyStoreStructure, resource: ResourceConstant, amount: number, priority: number): void => {
        if (amount > 0) demands.push({ target, resource, amount, priority });
    };
    for (const target of [...model.spawns, ...model.extensions]) demand(target, RESOURCE_ENERGY,
        target.store.getFreeCapacity(RESOURCE_ENERGY), model.stage === "bootstrap" || model.stage === "recovering" ? 100 : 80);
    for (const tower of model.towers) demand(tower, RESOURCE_ENERGY,
        Math.max(0, (model.stage === "underAttack" ? tower.store.getCapacity(RESOURCE_ENERGY) : policy.minimumTowerEnergy) -
            tower.store[RESOURCE_ENERGY]), model.stage === "underAttack" ? 90 : 75);
    for (const store of controllerStores) demand(store, RESOURCE_ENERGY, store.store.getFreeCapacity(RESOURCE_ENERGY), 70);
    for (const store of [...model.labs, ...model.factories, ...model.powerSpawns]) demand(store, RESOURCE_ENERGY,
        Math.max(0, Math.min(store.store.getFreeCapacity(RESOURCE_ENERGY), 1000 - store.store[RESOURCE_ENERGY])), 60);
    if (model.terminal) demand(model.terminal, RESOURCE_ENERGY,
        policy.terminalEnergyReserve - model.terminal.store[RESOURCE_ENERGY], 40);
    for (const supply of supplies) {
        const target = model.storage || sourceStores.find(store => store.id !== supply.endpoint.id);
        if (target && supply.endpoint.id !== target.id && supply.endpoint.id !== model.storage?.id &&
            supply.endpoint.id !== model.terminal?.id) demand(target, supply.resource,
            target.store.getFreeCapacity(supply.resource), supply.salvage ? 50 : 40);
    }
    demands.sort((a, b) => b.priority - a.priority || a.target.id.localeCompare(b.target.id));
    for (const item of demands) {
        let remaining = item.amount;
        for (const supply of supplies.filter(supply => supply.resource === item.resource &&
            supply.endpoint.id !== item.target.id &&
            (item.target.id !== model.storage?.id || supply.endpoint.id !== model.terminal?.id) &&
            (model.storage || !sourceStores.some(store => store.id === item.target.id) || supply.salvage))) {
            if (remaining <= 0) break;
            const job = upsert(model.name, supply.endpoint,
                { type: "store", id: item.target.id, position: serializePosition(item.target.pos) },
                item.resource, Math.min(remaining, supply.amount), item.priority, "local");
            if (job) {
                job.createdAt = previousCreation.get(job.id) ?? job.createdAt;
                remaining -= job.amount;
            }
        }
    }
    reconcileWork(model);
}