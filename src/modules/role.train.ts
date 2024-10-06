/**
 * train moves energy from A to B
 * Memory usage: srcFlagName, destFlagName, role
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
                        const container = containers.pop()
                        if (container) {
                            if (creep.transfer(container, RESOURCE_ENERGY) !== OK) {
                                creep.say("container full")
                                // creep.drop(RESOURCE_ENERGY);
                            }
                        }
                    }
                } else {
                    console.error("Check the train's memory, the flag cannot be found")
                }
            } else {
                console.error("Check the trains' memory, it does not have destFlagName")
            }

        } else {// pick up resource
            if (creep.memory.srcFlagName) {
                const srcFlag = Game.flags[creep.memory.srcFlagName]
                const resources = srcFlag.pos.findInRange(FIND_DROPPED_RESOURCES, 1
                    // filter: r=> r.amount > 250
                );
                const containers: StructureContainer[] = srcFlag.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE &&
                        s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity()
                })
                // if (resources.length === 0 && containers.length === 0) {
                //     creep.moveTo(Game.flags['Idle']);
                // } else {
                // const resource = resources.pop();
                // if (resource) {
                if (srcFlag) {
                    if (resources.length > 0 || containers.length > 0) {
                        if (creep.pos.isEqualTo(srcFlag)) {
                            const container = containers.pop();
                            if (container) {
                                if (creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                                    console.log("Cannot withdraw from container")
                                }
                            } else {
                                const resource = resources.pop(); //TODO: subject to change after container was built
                                if (resource) {
                                    creep.pickup(resource);
                                } else {
                                    creep.say("No resource available");
                                }
                            }
                        } else {
                            creep.moveTo(srcFlag)
                        }
                    } else {
                        creep.gotoIdleFlag()
                    }

                } else {
                    console.error("There is no flag found, check the truck's memory")
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