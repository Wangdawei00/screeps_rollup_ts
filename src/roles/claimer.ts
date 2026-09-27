import { markRoomInaccessible, observeRoom } from "../empire/intelManager";
import { diagnostic, retreat, travel } from "./common";

export function runClaimer(creep: Creep): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "remote") return;
    if (retreat(creep) || !travel(creep, assignment.targetRoom)) return;
    observeRoom(creep.room);
    const controller = creep.room.controller;
    if (controller?.my) return;
    if (!controller || controller.owner || (controller.reservation && controller.reservation.username !== creep.owner.username)) {
        markRoomInaccessible(creep.room.name, "Claim target occupied or unavailable");
        return;
    }
    const result = creep.claimController(controller);
    if (result === ERR_NOT_IN_RANGE) {
        if (creep.moveTo(controller, { reusePath: 20 }) === ERR_NO_PATH) markRoomInaccessible(creep.room.name, "Claim controller inaccessible");
    } else if (result !== OK) diagnostic(creep, `Claim failed ${result}`);
}
