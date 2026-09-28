import policy from "@/config/policy";
import type { RoomModel } from "@/colony/roomModel";
import type { SerializedPosition } from "@/domain/types";
import { markRoomInaccessible } from "@/empire/intelManager";

export function diagnostic(creep: Creep, message: string): void {
    if (policy.debug && Game.time % 25 === 0) console.log(`[creep:${creep.name}:${creep.memory.role}] ${message}`);
}

export function position(value: SerializedPosition): RoomPosition {
    return new RoomPosition(value.x, value.y, value.roomName);
}

export function unsafe(roomName: string, creep: Creep): boolean {
    const intel = Memory.intel[roomName];
    return !!intel && ((intel.inaccessibleUntil || 0) > Game.time || intel.keeper ||
        (intel.lastSeen + policy.intelMaxAge >= Game.time && (intel.threat.total > 0 ||
            (!!intel.owner && intel.owner !== creep.owner.username))));
}

export function travel(creep: Creep, roomName: string, avoidDanger = true): boolean {
    if (creep.room.name === roomName && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49) return true;
    if (avoidDanger && unsafe(roomName, creep)) {
        diagnostic(creep, `Unsafe target ${roomName}`);
        return false;
    }
    if (creep.room.name === roomName) {
        creep.moveTo(new RoomPosition(25, 25, roomName), { reusePath: 5, range: 20 });
        return false;
    }
    const route = Game.map.findRoute(creep.room.name, roomName, {
        routeCallback: room => avoidDanger && room !== creep.room.name && unsafe(room, creep) ? Infinity : 1
    });
    if (typeof route === "number" || !route.length) {
        markRoomInaccessible(roomName, "No route");
        diagnostic(creep, `No route to ${roomName}`);
        return false;
    }
    const exit = creep.pos.findClosestByRange(route[0].exit);
    if (exit) creep.moveTo(exit, { reusePath: 15, range: 0, maxRooms: 1 });
    return false;
}

export function retreat(creep: Creep): boolean {
    if (creep.room.name === creep.memory.homeRoom || !unsafe(creep.room.name, creep)) return false;
    travel(creep, creep.memory.homeRoom, false);
    return true;
}

export function localStores(creep: Creep, model?: RoomModel): AnyStoreStructure[] {
    if (model?.name === creep.room.name) return model.structures.filter(
        (structure): structure is AnyStoreStructure => "store" in structure &&
            (!("my" in structure) || structure.my));
    return creep.room.find(FIND_STRUCTURES).filter((structure): structure is AnyStoreStructure =>
        "store" in structure && (!("my" in structure) || structure.my));
}

export function unload(creep: Creep, resource: ResourceConstant, model?: RoomModel): boolean {
    if (!creep.store[resource]) return false;
    const targets = localStores(creep, model).filter(store =>
        [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER].some(type => type === store.structureType) &&
        (store.store.getFreeCapacity(resource) || 0) > 0);
    const target = creep.pos.findClosestByRange(targets);
    if (!target) return false;
    const result = creep.transfer(target, resource);
    if (result === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
    return true;
}

export function acquireEnergy(creep: Creep, model?: RoomModel, preferred?: Id<AnyStoreStructure>): boolean {
    const assigned = preferred && Game.getObjectById(preferred);
    if (assigned && assigned.store[RESOURCE_ENERGY] > 0) {
        if (creep.withdraw(assigned, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(assigned, { reusePath: 10 });
        return true;
    }
    const local = model?.name === creep.room.name ? model : undefined;
    const drops = local?.droppedResources || creep.room.find(FIND_DROPPED_RESOURCES);
    const drop = creep.pos.findClosestByRange(drops.filter(item => item.resourceType === RESOURCE_ENERGY));
    if (drop) {
        if (creep.pickup(drop) === ERR_NOT_IN_RANGE) creep.moveTo(drop, { reusePath: 10 });
        return true;
    }
    const stores = [...localStores(creep, local),
        ...(local?.tombstones || creep.room.find(FIND_TOMBSTONES)),
        ...(local?.ruins || creep.room.find(FIND_RUINS))];
    const target = creep.pos.findClosestByRange(stores.filter(store => store.store[RESOURCE_ENERGY] > 0 &&
        (!("structureType" in store) || ![STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER].some(type => type === store.structureType))));
    if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 10 });
        return true;
    }
    const sources = local?.sources || creep.room.find(FIND_SOURCES);
    const source = creep.pos.findClosestByRange(sources.filter(item => item.energy > 0));
    if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) creep.moveTo(source, { reusePath: 10 });
        return true;
    }
    return false;
}

export function readyToWork(creep: Creep, model?: RoomModel, preferred?: Id<AnyStoreStructure>): boolean {
    const incompatible = (Object.keys(creep.store) as ResourceConstant[]).find(resource =>
        resource !== RESOURCE_ENERGY && creep.store[resource] > 0);
    if (incompatible) {
        unload(creep, incompatible, model);
        return false;
    }
    if (creep.store[RESOURCE_ENERGY] === 0) creep.memory.working = false;
    if (creep.store.getFreeCapacity() === 0) creep.memory.working = true;
    if (!creep.memory.working) {
        if (!acquireEnergy(creep, model, preferred) && creep.store[RESOURCE_ENERGY] > 0) creep.memory.working = true;
        return false;
    }
    return true;
}
