import type { RoomModel } from "../colony/roomModel";
import { diagnostic, localStores, position, retreat, travel, unload } from "./common";

export function runMiner(creep: Creep, model?: RoomModel): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "source" && assignment?.type !== "mineral") return;
    if (retreat(creep) || !travel(creep, assignment.workPosition.roomName)) return;
    const source = assignment.type === "source" ? Game.getObjectById(assignment.sourceId) : Game.getObjectById(assignment.mineralId);
    if (!source) {
        diagnostic(creep, "Assigned extraction target is missing");
        return;
    }
    const workPosition = position(assignment.workPosition);
    if (!creep.pos.isEqualTo(workPosition)) {
        if (creep.moveTo(workPosition, { range: 0, reusePath: 20 }) === ERR_NO_PATH) diagnostic(creep, "Work tile inaccessible");
        return;
    }
    const resource = assignment.type === "source" ? RESOURCE_ENERGY : (source as Mineral).mineralType;
    const incompatible = (Object.keys(creep.store) as ResourceConstant[]).find(type => type !== resource && creep.store[type] > 0);
    if (incompatible) {
        unload(creep, incompatible, model);
        return;
    }
    const adjacent = localStores(creep, model).filter(store => creep.pos.isNearTo(store) &&
        (store.structureType === STRUCTURE_CONTAINER || (resource === RESOURCE_ENERGY && store.structureType === STRUCTURE_LINK)) &&
        (store.store.getFreeCapacity(resource) || 0) > 0);
    const assignedContainer = assignment.containerId && Game.getObjectById(assignment.containerId);
    const target = adjacent.find(store => store.structureType === STRUCTURE_LINK) ||
        (assignedContainer && adjacent.includes(assignedContainer) ? assignedContainer : adjacent[0]);
    if (creep.store[resource] > 0) {
        if (target) creep.transfer(target, resource);
        else if (!adjacent.length) creep.drop(resource);
    }
    if (assignment.type === "mineral") {
        const extractor = (model?.name === creep.room.name ? model.structures : creep.room.find(FIND_STRUCTURES))
            .find((structure): structure is StructureExtractor => structure.structureType === STRUCTURE_EXTRACTOR &&
                structure.pos.isEqualTo(source.pos));
        if (!extractor || extractor.cooldown > 0 || (source as Mineral).mineralAmount <= 0) return;
    }
    const result = creep.harvest(source);
    if (result !== OK && result !== ERR_NOT_ENOUGH_RESOURCES && result !== ERR_TIRED) {
        diagnostic(creep, `Harvest failed ${result}`);
    }
}