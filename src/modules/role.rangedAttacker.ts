const roleRangedAttacker = {
    run: function (creep: Creep) {
        if (creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom()
        } else {
            if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length > 2) {
                creep.rangedMassAttack();
            } else {
                const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (target) {
                    if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    const target = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
                        filter: (structure) => {
                            return structure.structureType !== STRUCTURE_CONTROLLER;
                        }
                    });
                    if (target) {
                        if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(target);
                        }
                    }
                }
            }

        }
    }
}

export default roleRangedAttacker;