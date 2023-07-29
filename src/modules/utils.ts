export function withdrawFromContainer(creep: Creep) {
    const source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
            Memory.sourceContainerIds.includes(structure.id)
    });
    if (source) {
        if (creep.withdraw(source,RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
    }
}