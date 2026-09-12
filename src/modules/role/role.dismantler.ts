/**
 * Memory Usage: destFlagName, role, body, room
 * */
const roleDismantler = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (!flag) {
                console.log("ERROR! " + creep.name +
                    " has destFlagName in memory but the flag"
                    + creep.memory.destFlagName + " does not exist. Please check.")
                return
            }
            if (creep.pos.isNearTo(flag)) {
                if (!creep.memory.cache_dest_structure_id) {
                    const structure = flag.pos.findInRange(FIND_STRUCTURES, 0)
                    if (structure.length > 0) {
                        creep.memory.cache_dest_structure_id = structure[0].id
                    } else {
                        creep.memory.respawnInformed = true
                    }
                }
                if (creep.memory.cache_dest_structure_id) {
                    const target = Game.getObjectById(creep.memory.cache_dest_structure_id)
                    if (target) {
                        creep.dismantle(target)
                    } else {
                        creep.memory.cache_dest_structure_id = undefined
                    }
                }
            } else {
                creep.moveTo(flag)
            }
        }
    }
}

export default roleDismantler