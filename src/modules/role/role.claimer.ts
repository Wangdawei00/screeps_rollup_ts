/**
 * Memory usage: role, body, room, destFlagName
 * */
const roleClaimer = {
    run: (creep: Creep) => {
        creep.memory.respawnInformed = true;
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (!flag) {
                console.log("ERROR! " + creep.name +
                    " has destFlagName in memory but the flag"
                    + creep.memory.destFlagName + " does not exist. Please check.")
                return
            }
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