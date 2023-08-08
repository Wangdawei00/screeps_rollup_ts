const roleMineralHarvester = {
    run: function (creep: Creep) {
        if (creep.memory.harvesting && creep.store.getFreeCapacity(creep.memory.mineralType) === 0) {
            creep.memory.harvesting = false;
            creep.say('🚧 deposit');
        }
        if (!creep.memory.harvesting && creep.store.getUsedCapacity(creep.memory.mineralType) === 0) {
            creep.memory.harvesting = true;
            creep.say('🔄 harvest');
        }
        if (creep.memory.sourceId) {
            const mineral = Game.getObjectById(creep.memory.sourceId);
            if (mineral) {
                if (creep.memory.harvesting) {
                    if (creep.harvest(mineral) === ERR_NOT_IN_RANGE || creep.harvest(mineral) === ERR_NOT_ENOUGH_RESOURCES) {
                        creep.moveTo(mineral);
                    }
                } else {
                    if (creep.room.storage) {
                        if (creep.memory.mineralType) {
                            if (creep.transfer(creep.room.storage, creep.memory.mineralType) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(creep.room.storage);
                            }
                        }

                    }
                }
            }
        }

    }
}

export default roleMineralHarvester;