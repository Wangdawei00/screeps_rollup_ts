const roleWallRepairer = {
    run: function (creep: Creep) {
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
            creep.memory.repairing = true;
        }
        if (creep.memory.repairing) {
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_WALL)
                        && structure.hits < 300000 &&structure.room === creep.room;
                }
            })
            if (target) {
                if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
        } else {
            const storage = creep.room.storage;
            if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity()) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage);
                }
            } else {
                creep.moveTo(Game.flags['Idle']);
            }
        }
    }
}

export default roleWallRepairer;