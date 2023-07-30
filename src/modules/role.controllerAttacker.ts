import {MoveFromHomeToTarget} from "@/modules/utils";

const roleControllerAttacker = {
    run: (creep: Creep) => {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            MoveFromHomeToTarget(creep);
        } else {
            const controller = creep.room.controller;
            if (controller) {
                if (creep.attackController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
            }
        }
    }
}

export default roleControllerAttacker;