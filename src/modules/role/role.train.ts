/**
 * train moves energy from A to B
 * Memory usage: srcFlagName, destFlagName, role, room
 * */
const roleTrain = {
    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            // const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            //     filter: s => (s.structureType === STRUCTURE_SPAWN ||
            //             s.structureType === STRUCTURE_TOWER || s.structureType === STRUCTURE_EXTENSION)
            //         && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            // })
            // if (structure) {
            //     if (creep.transfer(structure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            //         creep.moveTo(structure);
            //     }
            // } else {
            if (creep.memory.destFlagName) {
                const target = Game.flags[creep.memory.destFlagName];
                if (target) {
                    if (!creep.pos.isNearTo(target)) {
                        creep.moveTo(target);
                    } else {
                        const containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: object => object.structureType === STRUCTURE_CONTAINER ||
                                object.structureType === STRUCTURE_STORAGE
                        })
                        const links = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => s.structureType === STRUCTURE_LINK
                        })
                        const container = containers.pop()
                        const link = links.pop()
                        if (container) {
                            if (creep.transfer(container, RESOURCE_ENERGY) !== OK) {
                                creep.say("container full")
                                // creep.drop(RESOURCE_ENERGY);
                            }
                        } else if (link) {
                            if (creep.transfer(link, RESOURCE_ENERGY) !== OK) {
                                creep.say("link full")
                            }
                        }
                    }
                } else {
                    console.log("Check the train's memory, the flag cannot be found")
                }
            } else {
                console.log("Check the trains' memory, it does not have destFlagName")
            }
            // }
        } else {// pick up resource
            if (creep.memory.srcFlagName) {
                const srcFlag = Game.flags[creep.memory.srcFlagName]

                // if (resources.length === 0 && containers.length === 0) {
                //     creep.moveTo(Game.flags['Idle']);
                // } else {
                // const resource = resources.pop();
                // if (resource) {
                if (srcFlag) {
                    if (srcFlag.room && srcFlag.room.name === creep.room.name) {
                        const resources = srcFlag.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
                            filter: r => r.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY)
                        });
                        const containers: StructureContainer[] = srcFlag.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                                    s.structureType === STRUCTURE_STORAGE) &&
                                s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY)
                        })
                        if (resources.length > 0 || containers.length > 0) {
                            const container = containers.pop();
                            const resource = resources.pop();
                            if (container || resource) {
                                if (container) {
                                    if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                                        creep.moveTo(container)
                                        console.log("Cannot withdraw from container")
                                    }
                                } else if (resource) {
                                    if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                                        creep.moveTo(resource);
                                    }
                                }
                            } /*else {
                                creep.gotoIdleFlag();
                            }*/
                        } else {
                            creep.gotoIdleFlag()
                        }
                    } else {
                        creep.moveTo(srcFlag);
                    }
                } else {
                    console.log("There is no flag found, check the truck's memory")
                }
                // } else {
                //     console.error("This should not happen!")
                // }

                // }
            }


        }
    }
}

export default roleTrain;