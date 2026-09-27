import type { RoomModel } from "../colony/roomModel";
import { localStores, readyToWork, retreat, travel } from "./common";

export function runHarvester(creep: Creep, model?: RoomModel): void {
    if (retreat(creep)) return;
    const assignment = creep.memory.assignment;
    const targetRoom = assignment?.type === "remote" ? assignment.targetRoom :
        assignment?.type === "source" ? assignment.workPosition.roomName : creep.memory.homeRoom;
    if (!travel(creep, targetRoom)) return;
    if (!readyToWork(creep, model)) return;
    const stores = localStores(creep, model);
    const primary = stores.filter(store => [STRUCTURE_SPAWN, STRUCTURE_EXTENSION].some(type => type === store.structureType) &&
        store.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    const secondary = stores.filter(store => [STRUCTURE_TOWER, STRUCTURE_CONTAINER, STRUCTURE_STORAGE].some(type => type === store.structureType) &&
        store.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    const target = creep.pos.findClosestByRange(primary.length ? primary : secondary);
    if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) creep.moveTo(target, { reusePath: 5 });
    } else if (creep.room.controller?.my) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) creep.moveTo(creep.room.controller, { range: 3 });
    }
}