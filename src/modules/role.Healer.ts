const roleHealer = {
    run: function (creep: Creep) {
        if (creep.memory.target !== creep.room.name) {
            creep.MoveToTargetRoom();
        } else {
            const target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
                filter: (creep) => {
                    return creep.hits < creep.hitsMax;
                }
            });
            if (target) {
                if (creep.heal(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
        }
    }
}

export default roleHealer;