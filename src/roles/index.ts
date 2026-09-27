import { assignmentMatchesRole, hasRoleParts, isAssignment, isCreepRole } from "../domain/types";
import type { CreepRole } from "../domain/types";
import type { RoomModel } from "../colony/roomModel";
import { runIsolated } from "../kernel/scheduler";
import { diagnostic } from "./common";
import { runHarvester } from "./harvester";
import { runMiner } from "./miner";
import { runTransporter } from "./transporter";
import { runWorker } from "./worker";
import { runUpgrader } from "./upgrader";
import { runReserver } from "./reserver";
import { runDefender } from "./defender";
import { runScout } from "./scout";
import { runClaimer } from "./claimer";

export { assignmentMatchesRole, hasRoleParts, isAssignment, isCreepRole } from "../domain/types";
export type RoleRunner = (creep: Creep, model?: RoomModel) => void;
const executors: Record<CreepRole, RoleRunner> = {
    harvester: runHarvester, miner: runMiner, mineralMiner: runMiner, transporter: runTransporter,
    worker: runWorker, upgrader: runUpgrader, reserver: runReserver, defender: runDefender,
    scout: runScout, claimer: runClaimer
};

export function runCreeps(models?: ReadonlyMap<string, RoomModel>): void {
    for (const creep of Object.values(Game.creeps)) {
        if (creep.spawning) continue;
        runIsolated(`creep:${creep.name}:${creep.memory.role}`, () => {
            const { role, assignment, homeRoom, demandKey } = creep.memory;
            if (!isCreepRole(role) || !homeRoom || !demandKey ||
                (assignment !== undefined && !isAssignment(assignment)) || !assignmentMatchesRole(role, assignment) ||
                !hasRoleParts(role, part => creep.getActiveBodyparts(part) > 0)) {
                diagnostic(creep, "Invalid role, assignment, identity, or active body parts");
                return;
            }
            executors[role](creep, models?.get(creep.room.name));
        });
    }
}