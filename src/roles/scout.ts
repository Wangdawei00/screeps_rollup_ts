import {observeRoom} from "@/empire/intelManager";
import {retreat, travel} from "@/roles/common";

export function runScout(creep: Creep): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "remote") return;
    observeRoom(creep.room);
    if (retreat(creep)) return;
    if (travel(creep, assignment.targetRoom)) observeRoom(creep.room);
}
