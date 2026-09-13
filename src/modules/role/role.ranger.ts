/**
 * Memory usage: destFlagName, role, body, room
 * */

const roleRanger = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName];
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag);
            }
        }
        const hostileCreeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
        if (hostileCreeps.length > 0) {
            creep.rangedAttack(hostileCreeps[0]);
        }
    }
}

export default roleRanger;