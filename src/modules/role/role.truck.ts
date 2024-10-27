/**
 * This truck is from Energy source to all kinds of structure.
 * Memory usage: srcFlagName, role, body, room
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
                            || structure.structureType == STRUCTURE_SPAWN
                            || structure.structureType === STRUCTURE_LAB) &&
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
                    if (creep.pos.isNearTo(flag) || creep.pos.isEqualTo(flag)) {
                        const containers = flag.pos.findInRange(FIND_STRUCTURES, 0, {
                            filter: s => s.structureType === STRUCTURE_STORAGE ||
                                s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_LINK
                        })
                        const container = containers.pop()
                        if (container) {
                            creep.withdraw(container, RESOURCE_ENERGY);
                        } else {
                            console.log("There is no container or link or storage at flag " + creep.memory.srcFlagName
                                + ". Please check " + creep.name + "'s memory.")
                        }
                    } else {
                        creep.moveTo(flag)
                    }
                } else {
                    console.log("There is no flag found, check " + creep.name + "'s memory")
                }
            }
        }
    }
}

export default roleTruck;