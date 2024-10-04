/**
 * Used memory: destFlagName, role, srcFlagName
 * */
const RoleP_upgrader = { // primitive upgrader
    run: function (creep: Creep) {
        if (creep.memory.harvesting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.harvesting = false;
        }
        if (!creep.memory.harvesting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.harvesting = true;
        }

        if (creep.memory.harvesting) {
            if (creep.memory.srcFlagName) {
                const srcFlag = Game.flags[creep.memory.srcFlagName];
                if (srcFlag) {
                    if (creep.pos.isEqualTo(srcFlag)) {
                        const source = creep.pos.findClosestByPath(FIND_SOURCES);
                        if (source) {
                            creep.harvest(source);
                        } else {// if there is no source nearby.
                            console.error("There should be a source nearby. Check the code of upgrader");
                        }
                    } else {// if not arrived at the flag
                        creep.moveTo(srcFlag);
                    }
                } else {// if no srcFlag
                    console.error("There is no flag with name " + creep.memory.srcFlagName + ". Check the flags' names!")
                }
            } else { // if no creep.memory.srcFlagName
                console.error("There should be a src flag name in the upgrader's memory.")
            }
        } else {// if not creep.memory.harvesting. i.e. upgrading
            if (creep.memory.destFlagName) {//should have this
                const flag = Game.flags[creep.memory.destFlagName];
                if (flag) {
                    if (creep.pos.isEqualTo(flag)) {
                        // if (creep.store[RESOURCE_ENERGY] > 0) {
                        if (creep.room.controller) {
                            if (creep.upgradeController(creep.room.controller) != OK) {
                                console.error("Check the upgrader's flag position. It is too far from the controller.")
                            }
                        } else console.error("There should not be an upgrader in a room without a controller. Check the code!")
                        // } else {//need to pickup energy
                        //     const energy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
                        //     if (energy) {
                        //         creep.pickup(energy);
                        //     }
                        // }
                    } else {// we need to move to the controller.
                        creep.moveTo(flag);
                    }
                } else {// we do not have a flag named destFlagName
                    console.error("There is no flag with name " + creep.memory.destFlagName + ". Check the flags' names!")
                }

            } else {// if no creep.memory.destFlagName
                console.error("There is something wrong with the upgrader's memeory or code. Check it out!")
            }
        }

    }
}

export default RoleP_upgrader;