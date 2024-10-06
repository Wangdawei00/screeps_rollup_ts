/**
 * the upgrader moves to dest flag, stand there and upgrade the controller
 * Memory usage: destFlagName, role, body
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
                        creep.say("No resource")
                        // console.log("No resource available for the upgrader");
                        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                            filter: structure => structure.structureType === STRUCTURE_CONTAINER
                        })
                        if (container) {
                            if (creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                                console.log("No container nearby")
                            }
                        } else {
                            console.log("No container");
                        }
                    }
                } else {
                    if (creep.room.controller) {
                        if (creep.upgradeController(creep.room.controller) !== OK) {
                            console.error("The upgrader's position is not correct.")
                        }
                    } else {
                        console.error("There should be a controller in this room!")
                    }
                }
            } else {
                creep.moveTo(destFlag);
            }
        } else {
            console.error("This upgrader does not have a destflag name in its memory. Add it Now!")
        }

    }
}

export default roleUpgrader