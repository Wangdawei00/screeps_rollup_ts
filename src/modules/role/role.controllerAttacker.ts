/**
 * Memory Usage: body, role, room, destFlagName
 */

const roleControllerAttacker = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName];
            if (!flag) {
                console.log("ERROR! " + creep.name +
                    " has destFlagName in memory but the flag"
                    + creep.memory.destFlagName + " does not exist. Please check.")
                return
            }
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag)
            } else {
                const controller = creep.room.controller;
                if (controller) {
                    creep.attackController(controller);
                }
            }
        }
    }
}

export default roleControllerAttacker;