/**
 * Memory Usage: destFlagName, role, body, room
 * */
const roleDismantler = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (creep.pos.isNearTo(flag)) {
                const structure = flag.pos.findInRange(FIND_STRUCTURES, 0)
                if (structure.length > 0) {
                    creep.dismantle(structure[0]);
                } else {
                    creep.memory.respawnInformed = true
                }
            } else {
                creep.moveTo(flag)
            }
        }
    }
}

export default roleDismantler