import * as stream from "stream";

/**
 * This truck is from Energy source to all kinds of structure.
 * Memory usage: srcFlagName, role, body
 * */
const roleTruck = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
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
                creep.gotoIdleFlag();
            }
        } else {
            if (creep.memory.srcFlagName) {
                const flag = Game.flags[creep.memory.srcFlagName];
                if (flag) {
                    if (creep.pos.isEqualTo(flag)) {
                        const storage = creep.room.storage;
                        if (!storage || creep.withdraw(storage, RESOURCE_ENERGY) !== OK) {
                            const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                                filter: s => s.structureType === STRUCTURE_CONTAINER
                            })
                            if (container) {
                                if (creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                                    console.log("Cannot withdraw from container")
                                }
                            } else {
                                creep.say("no container");
                            }
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