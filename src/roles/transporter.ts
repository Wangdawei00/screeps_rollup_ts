import { claimJob, releaseJob, renewJob } from "../colony/logisticsManager";
import type { RoomModel } from "../colony/roomModel";
import { diagnostic, position, retreat, travel, unload, unsafe } from "./common";

const progress = new Map<string, { tick: number; position: string }>();

export function runTransporter(creep: Creep, model?: RoomModel): void {
    if (retreat(creep)) return;
    const job = claimJob(creep);
    if (!job) {
        const resource = (Object.keys(creep.store) as ResourceConstant[]).find(type => creep.store[type] > 0);
        if (resource) {
            if (!travel(creep, creep.memory.homeRoom)) return;
            unload(creep, resource, model);
        }
        return;
    }
    const location = `${creep.pos.roomName}:${creep.pos.x}:${creep.pos.y}`;
    const previous = progress.get(creep.name);
    if (previous && previous.tick === Game.time - 1 && previous.position !== location) renewJob(creep, job);
    progress.set(creep.name, { tick: Game.time, position: location });
    if (Game.time % 100 === 0) for (const name of progress.keys()) if (!Game.creeps[name]) progress.delete(name);
    const incompatible = (Object.keys(creep.store) as ResourceConstant[]).find(type => type !== job.resource && creep.store[type] > 0);
    if (incompatible) {
        if (!unload(creep, incompatible, model)) {
            releaseJob(creep);
            travel(creep, creep.memory.homeRoom, false);
        }
        return;
    }
    if (job.amount <= 0) {
        releaseJob(creep);
        return;
    }
    if (creep.store[job.resource] > 0) creep.memory.state = "deliver";
    else creep.memory.state = "pickup";
    const delivering = creep.memory.state === "deliver";
    const endpoint = delivering ? job.delivery : job.pickup;
    if (unsafe(endpoint.position.roomName, creep) && endpoint.position.roomName !== creep.memory.homeRoom) {
        releaseJob(creep);
        travel(creep, creep.memory.homeRoom, false);
        return;
    }
    if (!travel(creep, endpoint.position.roomName)) return;
    if (delivering) {
        const target = Game.getObjectById(job.delivery.id);
        if (!target) {
            if (Game.rooms[job.delivery.position.roomName]) releaseJob(creep);
            else creep.moveTo(position(job.delivery.position), { range: 1 });
            return;
        }
        const amount = Math.min(job.amount, creep.store[job.resource], target.store.getFreeCapacity(job.resource) || 0);
        if (amount <= 0) {
            releaseJob(creep);
            return;
        }
        const result = creep.transfer(target, job.resource, amount);
        if (result === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
        else if (result === OK) {
            // Screeps stores remain unchanged until tick end. Account the explicit intent,
            // then acknowledge completion on the following tick rather than rereading store.
            job.amount -= amount;
            renewJob(creep, job);
        } else if (result === ERR_INVALID_TARGET || result === ERR_NOT_OWNER || result === ERR_FULL) releaseJob(creep);
        else diagnostic(creep, `Transfer ${job.id} failed ${result}`);
    } else {
        const target = Game.getObjectById(job.pickup.id);
        if (!target) {
            if (Game.rooms[job.pickup.position.roomName]) releaseJob(creep);
            else creep.moveTo(position(job.pickup.position), { range: 1 });
            return;
        }
        let result: ScreepsReturnCode;
        if ("resourceType" in target) {
            result = target.resourceType === job.resource ? creep.pickup(target) : ERR_INVALID_TARGET;
        } else {
            const amount = Math.min(job.amount, creep.store.getFreeCapacity(job.resource), target.store[job.resource] || 0);
            if (amount <= 0) {
                releaseJob(creep);
                return;
            }
            result = creep.withdraw(target, job.resource, amount);
        }
        if (result === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
        else if (result === OK) {
            creep.memory.state = "deliver";
            renewJob(creep, job);
        } else if (result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_INVALID_TARGET || result === ERR_NOT_OWNER) releaseJob(creep);
        else diagnostic(creep, `Pickup ${job.id} failed ${result}`);
    }
}