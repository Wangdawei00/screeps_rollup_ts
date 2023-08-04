const roleRangedAttacker = {
    run: function (creep: Creep) {
        if (creep.hitsMax > creep.hits) {
            creep.heal(creep);
        }
        if (creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom()
        } else {
            if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).length > 2) {
                creep.rangedMassAttack();
            } else {
                const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (target) {
                    const steps = creep.pos.findPathTo(target)
                    if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
                        if (steps.length > 0) {
                            creep.move(steps[0].direction);
                        }
                    } else {
                        const oppositeDirection: Record<string, DirectionConstant> = {
                            1: BOTTOM,
                            5: TOP,
                            7: RIGHT,
                            3: LEFT,
                            2: BOTTOM_LEFT,
                            4: TOP_LEFT,
                            8: BOTTOM_RIGHT,
                            6: TOP_RIGHT,
                        }
                        if (steps.length > 0) {
                            creep.move(oppositeDirection[steps[0].direction.toString()]);
                        }
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