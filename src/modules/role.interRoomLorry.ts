const roleInterRoomLorry = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
            creep.say('🚧 build');
        }
        if (creep.memory.transporting) {
            if (creep.room.name !== creep.memory.home) {
                creep.MoveToHomeRoom();
            } else {
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => (structure.structureType === STRUCTURE_EXTENSION
                            || structure.structureType === STRUCTURE_SPAWN
                            || structure.structureType === STRUCTURE_CONTAINER
                            || structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (target) {
                    if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }
            }
        } else {
            if (creep.room.name !== creep.memory.target) {
                creep.MoveToTargetRoom();
            } else {
                creep.PickupGarbage();
                creep.WithdrawFromContainer();
            }
        }

    }
}

export default roleInterRoomLorry;