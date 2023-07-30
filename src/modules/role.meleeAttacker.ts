const roleMeleeAttacker = {
    run: function (creep: Creep) {
        if (creep.room.name !== creep.memory.target) {
            creep.MoveFromHomeToTarget()
        } else {
            const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (target) {
                if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {
                const target = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType !== STRUCTURE_CONTROLLER;
                    }
                });
                if (target) {
                    if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }
            }
        }
    }
}

export default roleMeleeAttacker;