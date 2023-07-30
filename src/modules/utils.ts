export function withdrawFromContainerOrStorage(creep: Creep) {
    const source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity() &&
            Memory.sourceContainerIds.includes(structure.id)
    });
    if (source) {
        if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    } else {
        if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            if (creep.withdraw(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.storage, {visualizePathStyle: {stroke: '#ffaa00'}})
            }
        }
    }
}

export function MoveFromHomeToTarget(creep: Creep) {
    if (creep.memory.target && creep.room.name !== creep.memory.target) {
        const exit = creep.room.findExitTo(creep.memory.target);
        if (exit !== ERR_NO_PATH && exit !== ERR_INVALID_ARGS) {
            const exitpoint = creep.pos.findClosestByRange(exit);
            if (exitpoint) {
                creep.moveTo(exitpoint);
            }
        }
    }
}

export function MoveFromTargetToHome(creep: Creep) {
    if (creep.memory.home && creep.room.name !== creep.memory.home) {
        const exit = creep.room.findExitTo(creep.memory.home);
        if (exit !== ERR_NO_PATH && exit !== ERR_INVALID_ARGS) {
            const exitpoint = creep.pos.findClosestByRange(exit);
            if (exitpoint) {
                creep.moveTo(exitpoint);
            }
        }
    }
}

export function withdrawFromContainer(creep: Creep) {
    const source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) &&
            Memory.sourceContainerIds.includes(structure.id)
    });
    if (source) {
        if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
    }
}