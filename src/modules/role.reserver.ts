/**
 * Memory Usage: destFlagName, role, body
 * */

const roleReserver = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (creep.pos.isEqualTo(flag)) {
                if (creep.room.controller) {
                    creep.reserveController(creep.room.controller);
                } else {
                    console.log("There is no controller in this room. Check it out")
                }
            } else {
                creep.moveTo(flag)
            }
        } else {
            console.log("There should be a destFlagName in reserver's memory")
        }
    }
}

export default roleReserver;