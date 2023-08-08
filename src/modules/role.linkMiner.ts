const roleLinkMiner = {
    run: function (creep: Creep) {
        if (creep.memory.harvesting && creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false;
        }
        if (!creep.memory.harvesting && creep.store.getUsedCapacity() === 0) {
            creep.memory.harvesting = true;
        }
        if (creep.memory.harvesting) {
            const source = Game.getObjectById(creep.memory.sourceId as Id<Source>);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                }
            }
        } else {
            const link = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (s) => {
                    return s.structureType === STRUCTURE_LINK && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }
            });
        }
    }
}

export default roleLinkMiner;