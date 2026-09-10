/**
 * the upgrader moves to dest flag, stand there and upgrade the controller
 * Memory usage: destFlagName, role, body, room
 * */
const roleUpgrader = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const destFlag = Game.flags[creep.memory.destFlagName];
            if (creep.pos.isEqualTo(destFlag)) {
                if (creep.memory.harvesting && creep.store.getFreeCapacity() === 0) {
                    creep.memory.harvesting = false;
                }
                if (!creep.memory.harvesting && creep.store.getUsedCapacity() === 0) {
                    creep.memory.harvesting = true;
                }
                if (creep.memory.harvesting) {
                    const resource = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)
                    if (resource.length !== 0) {
                        creep.pickup(resource[0]);
                    } else {
                        if (!creep.memory.cache_src_container_id) {
                            const containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                                filter: structure => structure.structureType === STRUCTURE_CONTAINER
                            })
                            const container = containers.pop() as StructureContainer;
                            if (container) {
                                creep.memory.cache_src_container_id = container.id
                            }
                        }
                        if (creep.memory.cache_src_container_id) {
                            const container = Game.getObjectById(creep.memory.cache_src_container_id);
                            if (container) {
                                if (creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                                    console.log("Error! The upgrader's position is not correct.")
                                }
                            } else {
                                creep.memory.cache_src_container_id = undefined;
                                console.log("Error! The upgrader's container is not found. Check the upgrader's position and the container's position.")
                            }
                        }
                    }
                } else {
                    if (creep.room.controller) {
                        if (creep.upgradeController(creep.room.controller) !== OK) {
                            console.log("The upgrader's position is not correct.")
                        }
                    } else {
                        console.log("There should be a controller in this room!")
                    }
                }
            } else {
                creep.moveTo(destFlag);
            }
        } else {
            console.log("This upgrader does not have a destflag name in its memory. Add it Now!")
        }

    }
}

export default roleUpgrader