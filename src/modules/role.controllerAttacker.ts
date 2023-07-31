const roleControllerAttacker = {
    run: (creep: Creep) => {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom()
        } else {
            const controller = creep.room.controller;
            if (controller) {
                const result = creep.reserveController(controller);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                } else if (result === ERR_INVALID_TARGET) {
                    if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller);
                    }
                }

            }
        }
    }
}

export default roleControllerAttacker;