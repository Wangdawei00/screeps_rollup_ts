/**
 * Memory Usage: IdleFlagName,room
 * */
const roleGarbageCollector = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] === creep.store.getCapacity(RESOURCE_ENERGY)) {
            creep.memory.transporting = true;
        }
        if (creep.memory.IdleFlagName) {
            const room = Game.flags[creep.memory.IdleFlagName].room
            if (room) {
                if (creep.room.name !== room.name) {
                    creep.moveTo(Game.flags[creep.memory.IdleFlagName])
                } else {
                    if (creep.memory.transporting) {
                        const target = creep.room.storage
                        if (target) {
                            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(target);
                            }
                        } else {
                            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                                filter: s => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY)
                            })
                            if (container && creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(container);
                            } else {
                                creep.gotoIdleFlag();
                            }
                        }
                    } else {
                        creep.pickupGarbage();
                    }
                }
            } else {
                creep.moveTo(Game.flags[creep.memory.IdleFlagName])
            }
        }
    }
}

export default roleGarbageCollector;