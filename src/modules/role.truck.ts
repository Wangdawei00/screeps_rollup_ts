const roleTruck = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
            creep.memory.longDistTransporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            if (!creep.memory.longDistTransporting) {
                const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: structure => {
                        return (structure.structureType === STRUCTURE_EXTENSION
                                || structure.structureType === STRUCTURE_TOWER
                                || structure.structureType == STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    }
                })
                if (target) {
                    if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    creep.memory.longDistTransporting = true;
                }
            }
            if (creep.memory.longDistTransporting) {
                if (creep.memory.destFlagName) {
                    const flag = Game.flags[creep.memory.destFlagName];
                    if (flag) {
                        if (creep.pos.isNearTo(flag)) {
                            creep.drop(RESOURCE_ENERGY);
                        } else {
                            creep.moveTo(flag);
                        }
                    } else {
                        console.error("No flag found, check truck's memory!")
                    }
                }
            }
        } else {
            if (creep.memory.srcFlagName) {
                const flag = Game.flags[creep.memory.srcFlagName];
                if (flag) {
                    if (creep.pos.isEqualTo(flag)) {
                        const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
                        if (resource) {
                            creep.pickup(resource);
                        } else {
                            console.log("No resource available");
                        }
                    } else {
                        creep.moveTo(flag)
                    }
                } else {
                    console.error("There is no flag found, check the truck's memory")
                }
            }

        }
    }
}

export default roleTruck;