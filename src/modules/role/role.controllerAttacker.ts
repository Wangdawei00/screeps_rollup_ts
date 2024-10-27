/**
 * Memory Usage: body, role, room, destFlagName
 */

const roleControllerAttacker = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName];
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