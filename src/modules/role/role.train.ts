/**
 * train moves energy from A to B
 * Memory usage: srcFlagName, destFlagName, role, room, mineralType(if this is a mineral train)
 * */
const roleTrain = {
    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        let resourceConstant: ResourceConstant;
        if (creep.memory.mineralType) {
            resourceConstant = creep.memory.mineralType
        } else {
            resourceConstant = RESOURCE_ENERGY;
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
                const destFlag = Game.flags[creep.memory.destFlagName];
                if (destFlag) {
                    if (!creep.pos.isNearTo(destFlag)) {
                        creep.moveTo(destFlag);
                    } else {
                        const containers = destFlag.pos.findInRange(FIND_STRUCTURES, 0, {
                            filter: object => object.structureType === STRUCTURE_CONTAINER ||
                                object.structureType === STRUCTURE_STORAGE
                        })
                        const links = destFlag.pos.findInRange(FIND_STRUCTURES, 0, {
                            filter: s => s.structureType === STRUCTURE_LINK
                        })
                        const container = containers.pop()
                        const link = links.pop()
                        if (container) {
                            if (creep.transfer(container, resourceConstant) !== OK) {
                                creep.say("container full")
                                // creep.drop(RESOURCE_ENERGY);
                            }
                        } else {
                            if (resourceConstant === RESOURCE_ENERGY) {
                                if (link) {
                                    if (creep.transfer(link, resourceConstant) !== OK) {
                                        creep.say("link full")
                                    }
                                }
                            } else {
                                console.log(creep.name + " cannot find container. This is a mineral train")
                            }
                        }
                    }
                } else {
                    console.log("Check " + creep.name + "'s memory, the flag cannot be found")
                }
            } else {
                console.log("Check " + creep.name + "' memory, it does not have destFlagName")
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
                        const resources = srcFlag.pos.findInRange(FIND_DROPPED_RESOURCES, 0, {
                            filter: r => r.amount >= creep.store.getFreeCapacity(resourceConstant)
                        });
                        const containers: StructureContainer[] = srcFlag.pos.findInRange(FIND_STRUCTURES, 0, {
                            filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                                    s.structureType === STRUCTURE_STORAGE) &&
                                s.store.getUsedCapacity(resourceConstant) > creep.store.getFreeCapacity(resourceConstant)
                        })
                        if (resources.length > 0 || containers.length > 0) {
                            const container = containers.pop();
                            const resource = resources.pop();
                            if (container || resource) {
                                if (container) {
                                    if (creep.withdraw(container, resourceConstant) === ERR_NOT_IN_RANGE) {
                                        creep.moveTo(container)
                                        // console.log("Cannot withdraw from container")
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
                            if (resourceConstant !== RESOURCE_ENERGY) {
                                const minerals = creep.room.find(FIND_MINERALS)
                                const mineral = minerals.pop();
                                if (!mineral?.mineralAmount) {
                                    creep.memory.respawnInformed = true
                                }
                            }
                        }
                    } else {
                        creep.moveTo(srcFlag);
                    }
                } else {
                    console.log("There is no flag found, check " + creep.name + "'s memory")
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