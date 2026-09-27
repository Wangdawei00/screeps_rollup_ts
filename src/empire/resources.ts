import policy from "../config/policy";
import type { RoomModel } from "../colony/roomModel";
import { reactionReagents, selectReactionLabs } from "../colony/structureManager";
import { upsertLogisticsJob } from "../colony/logisticsManager";
import { serializePosition } from "../domain/types";

export function liquidStores(model: RoomModel): (StructureStorage | StructureTerminal)[] {
    return [...(model.storage ? [model.storage] : []), ...(model.terminal ? [model.terminal] : [])];
}

export function stock(model: RoomModel, resource: ResourceConstant): number {
    return [...liquidStores(model), ...model.labs, ...model.factories, ...model.containers]
        .reduce((sum, store) => sum + (store.store[resource] || 0), 0);
}

export function outgoing(model: RoomModel, id: string, resource: ResourceConstant): number {
    return Object.values(Memory.colonies[model.name].logisticsJobs).filter(job =>
        job.pickup.id === id && job.resource === resource && job.expiresAt >= Game.time)
        .reduce((sum, job) => {
            const creep = job.lease && Game.creeps[job.lease.creepName];
            return sum + Math.max(0, job.amount - (creep ? creep.store[resource] || 0 : 0));
        }, 0);
}

export function productionCommitment(model: RoomModel, resource: ResourceConstant): number {
    const goal = Memory.empire.production[model.name];
    let needed = 0;
    if (goal?.compound) {
        const reagents = reactionReagents(goal.compound);
        const cluster = selectReactionLabs(model.labs, goal.compound);
        if (reagents && cluster) for (let index = 0; index < 2; index++) {
            if (reagents[index] === resource) needed += Math.max(0, policy.productionBatch -
                ((index ? cluster.inputB : cluster.inputA).store[resource] || 0));
        }
    }
    if (goal?.factoryResource) {
        const amount = (COMMODITIES[goal.factoryResource]?.components as Partial<Record<ResourceConstant, number>>)?.[resource] || 0;
        if (amount) for (const factory of model.factories) needed += Math.max(0, amount - (factory.store[resource] || 0));
    }
    return needed;
}

export function available(model: RoomModel, resource: ResourceConstant, reserveProduction = true): number {
    const liquid = liquidStores(model);
    const ids = new Set<string>(liquid.map(store => store.id));
    const floor = resource === RESOURCE_ENERGY ?
        (model.storage ? policy.storageEnergyReserve : 0) + (model.terminal ? policy.terminalEnergyReserve : 0) : policy.mineralRetain;
    const committed = Object.values(Memory.colonies[model.name].logisticsJobs).filter(job =>
        ids.has(job.pickup.id) && !ids.has(job.delivery.id) && job.resource === resource && job.expiresAt >= Game.time)
        .reduce((sum, job) => sum + job.amount, 0);
    return Math.max(0, liquid.reduce((sum, store) => sum + (store.store[resource] || 0), 0) - floor -
        Math.max(committed, reserveProduction ? productionCommitment(model, resource) : 0));
}

export function prepare(model: RoomModel, destination: AnyStoreStructure, resource: ResourceConstant,
    desired: number, priority = 60, protectMineralReserve = true): void {
    let remaining = Math.max(0, desired - (destination.store[resource] || 0));
    for (const source of liquidStores(model)) {
        if (!remaining || source.id === destination.id) continue;
        const floor = resource === RESOURCE_ENERGY ?
            (source.structureType === STRUCTURE_STORAGE ? policy.storageEnergyReserve : policy.terminalEnergyReserve) : 0;
        const otherCommitments = Object.values(Memory.colonies[model.name].logisticsJobs).filter(job =>
            job.pickup.id === source.id && job.resource === resource && job.delivery.id !== destination.id &&
            job.expiresAt >= Game.time).reduce((sum, job) => sum + job.amount, 0);
        const budget = Math.max(0, (source.store[resource] || 0) - floor - otherCommitments);
        const amount = Math.min(remaining, budget, protectMineralReserve ? available(model, resource, false) : Infinity);
        if (amount <= 0) continue;
        const job = upsertLogisticsJob(model.name,
            { type: "store", id: source.id, position: serializePosition(source.pos) },
            { type: "store", id: destination.id, position: serializePosition(destination.pos) }, resource, amount, priority);
        remaining -= job?.amount || 0;
    }
}

export function drain(model: RoomModel, source: AnyStoreStructure, resource: ResourceConstant, amount: number): void {
    const destination = liquidStores(model).find(store => store.id !== source.id && store.store.getFreeCapacity(resource) > 0);
    if (!destination || amount <= 0) return;
    upsertLogisticsJob(model.name, { type: "store", id: source.id, position: serializePosition(source.pos) },
        { type: "store", id: destination.id, position: serializePosition(destination.pos) }, resource, amount, 60);
}
