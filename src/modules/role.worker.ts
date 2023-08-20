const roleWorker = {
    run: (creep: Creep) => {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }
        if (creep.memory.working) {
            if (!creep.memory.task) {
                const queue = creep.room.memory.workQueue;
                if (queue) {
                    creep.memory.task = _.find(queue, task => !task.taken)
                }
            }
            if (creep.memory.task) {
                const target = Game.getObjectById(creep.memory.task.targetId);
                if (creep.memory.task.type === 'build') {
                    if (target) {
                        if (creep.build(<ConstructionSite>target) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(target);
                        }
                    } else {
                        creep.memory.task = undefined;
                    }
                } else if (creep.memory.task.type === 'repair') {
                    const target2 = <Structure>target;
                    if (target2 && target2.hits < target2.hitsMax) {
                        if (creep.repair(target2) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(target2);
                        }
                    } else {
                        creep.memory.task = undefined;
                    }
                }
            } else {
                if (creep.room.memory.idleFlagNames) {
                    const flag = Game.flags[creep.room.memory.idleFlagNames[0]];
                    if (flag) {
                        creep.moveTo(flag);
                    }
                }
            }
        } else {
            if (!creep.WithdrawFromContainerOrStorage()) {
                creep.PickupGarbage();
            }
        }
    }
}

export default roleWorker;