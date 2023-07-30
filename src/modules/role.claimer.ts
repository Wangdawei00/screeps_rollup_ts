const roleClaimer = {
    run: function(creep: Creep) {
        if(creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom()
        } else {
            const controller = creep.room.controller;
            if (controller) {
                if (creep.claimController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
            }
        }
    }
}

export default roleClaimer;