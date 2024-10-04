/**
 * the upgrader moves to dest flag, stand there and upgrade the controller
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
                    const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES)
                    if (resource) {
                        creep.pickup(resource);
                    } else {
                        console.log("No resource available for the upgrader");
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