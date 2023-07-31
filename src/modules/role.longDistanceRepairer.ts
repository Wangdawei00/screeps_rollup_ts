const roleLongDistanceRepairer = {
    run: function (creep: Creep) {
        if (creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom();
        } else {
            if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.repairing = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
                creep.memory.repairing = true;
                creep.say('🚧 repair');
            }
            if (creep.memory.repairing) {
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART);
                    }
                });
                if (target) {
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    creep.moveTo(Game.flags['Flag1']);
                }
            } else {
                const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
                if (resource) {
                    if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(resource);
                    }
                } else {
                    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0);
                        }
                    });
                    if (container) {
                        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                        }
                    }
                }
            }
        }
    }
}

export default roleLongDistanceRepairer;