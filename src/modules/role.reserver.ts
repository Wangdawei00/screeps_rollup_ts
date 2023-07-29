const roleReserver = {
    run: (creep: Creep) => {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            const exit = creep.room.findExitTo(creep.memory.target);
            if (exit !== ERR_NO_PATH && exit !== ERR_INVALID_ARGS) {
                const exitpoint = creep.pos.findClosestByRange(exit);
                if (exitpoint) {
                    creep.moveTo(exitpoint);
                }
            }
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