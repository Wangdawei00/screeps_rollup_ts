import policy from "@/config/policy";
import {markRoomInaccessible, observeRoom} from "@/empire/intelManager";
import {diagnostic, retreat, travel} from "@/roles/common";

export function runReserver(creep: Creep): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "remote")
        return;
    if (retreat(creep) || !travel(creep, assignment.targetRoom))
        return;
    observeRoom(creep.room);
    const controller = creep.room.controller;
    if (!controller || controller.owner) {
        markRoomInaccessible(creep.room.name, "Reservation target unavailable or owned");
        return;
    }
    const hostile = controller.reservation && controller.reservation.username !== creep.owner.username;
    if (hostile && !policy.attackHostileReservations) {
        diagnostic(creep, "Hostile reservation protected by policy");
        return;
    }
    const result = hostile ? creep.attackController(controller) : creep.reserveController(controller);
    if (result === ERR_NOT_IN_RANGE) {
        if (creep.moveTo(controller, {reusePath: 20}) === ERR_NO_PATH)
            markRoomInaccessible(creep.room.name, "Controller inaccessible");
    } else if (result !== OK && result !== ERR_TIRED)
        diagnostic(creep, `Reservation failed ${result}`);
}