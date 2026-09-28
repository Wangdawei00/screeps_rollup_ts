import type {RoomModel} from "@/colony/roomModel";
import type {WorkJob} from "@/domain/types";
import {readyToWork, retreat, travel} from "@/roles/common";

export function runWorker(creep: Creep, model?: RoomModel): void {
    if (retreat(creep)) return;
    const assignment = creep.memory.assignment;
    const targetRoom = assignment?.type === "remote" ? assignment.targetRoom : creep.memory.homeRoom;
    if (!travel(creep, targetRoom)) return;
    if (!readyToWork(creep, model, assignment?.type === "controller" ? assignment.energySourceId : undefined)) return;
    const board = Memory.colonies[creep.room.name]?.workJobs;
    const jobs: WorkJob[] = board ? Object.values(board) : creep.room.find(FIND_MY_CONSTRUCTION_SITES).map(site => ({
        id: `build:${site.id}`, type: "build" as const, targetId: site.id,
        priority: site.structureType === STRUCTURE_SPAWN ? 100 : site.structureType === STRUCTURE_CONTAINER ? 90 : 50
    }));
    jobs.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    for (const job of jobs) {
        const target = Game.getObjectById(job.targetId);
        if (!target) continue;
        if (job.type === "build" && "progress" in target) {
            if (creep.build(target) === ERR_NOT_IN_RANGE)
                creep.moveTo(target, {range: 3, reusePath: 10});
            return;
        }
        if (job.type === "repair" && "hits" in target && target.hits < job.targetHits) {
            if (creep.repair(target) === ERR_NOT_IN_RANGE) creep.moveTo(target, {range: 3, reusePath: 10});
            return;
        }
    }
    if (creep.room.controller?.my && creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {range: 3, reusePath: 10});
    }
}