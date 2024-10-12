/**
 * Memory usage: role, body, room, destFlagName
 * */
const roleClaimer = {
    run: (creep: Creep) => {
        creep.memory.respawnInformed = true;
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag);
            } else {
                if (creep.room.controller) {
                    creep.claimController(creep.room.controller);
                }
            }
        }
    }
}

export default roleClaimer;