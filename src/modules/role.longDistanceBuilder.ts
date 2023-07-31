const roleLongDistanceBuilder = {
    run: function (creep: Creep) {
        if (creep.memory.target !== creep.room.name) {
            creep.MoveToTargetRoom();
        } else {
            if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.building = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
                creep.memory.building = true;
                creep.say('🚧 build');
            }
            if (creep.memory.building) {
                const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                if (target) {
                    if (creep.build(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }else{
                    creep.moveTo(Game.flags['Flag1']);
                }
            } else {
                const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
                if (resource) {
                    if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(resource);
                    }
                }else{
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

export default roleLongDistanceBuilder;