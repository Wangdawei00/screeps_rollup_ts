/**
 * Memory Usage: destFlagName, role, body,room
 * */

const roleReserver = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (creep.pos.isEqualTo(flag)) {
                if (creep.room.controller) {
                    creep.reserveController(creep.room.controller);
                } else {
                    console.log("There is no controller in Room" + creep.room.name + ". Check it out. "
                        + creep.name + " is in this room.")
                }
            } else {
                creep.moveTo(flag)
            }
        } else {
            console.log("There should be a destFlagName in " + creep.name + "'s memory")
        }
    }
}

export default roleReserver;