const roleReserver = {
    run: (creep: Creep) => {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            creep.MoveFromHomeToTarget()
        } else {
            const controller = creep.room.controller;
            if (controller) {
                if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
            }
        }
    }
}

export default roleReserver;