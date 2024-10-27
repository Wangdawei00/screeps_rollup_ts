/**
 * Memory usage: room, destFlagName, role, body
 * */
const roleHealer = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag);
            }
        }
        const injuredCreep = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: c => c.hits < c.hitsMax
        })
        if (injuredCreep.length > 0) {
            creep.heal(injuredCreep[0]);
        }
    }
}

export default roleHealer