import type { SpawnRequest } from "../domain/types";
import { bodyCost } from "../planning/bodyBuilder";
import { quarantineRequest, spawnRequestError } from "../kernel/memory";
import { runIsolated } from "../kernel/scheduler";
import type { RoomModel } from "./roomModel";

function isTransient(result: ScreepsReturnCode): boolean {
    return result === ERR_BUSY || result === ERR_NOT_ENOUGH_ENERGY || result === ERR_RCL_NOT_ENOUGH;
}

export function runSpawns(model: RoomModel): void {
    const colony = Memory.colonies[model.name];
    let budget = model.room.energyAvailable;
    let sequence = 0;
    colony.spawnQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt || a.key.localeCompare(b.key));
    for (const spawn of model.spawns) {
        if (spawn.spawning) continue;
        runIsolated(`spawn:${spawn.name}`, () => {
            for (const request of [...colony.spawnQueue]) {
                const reason = spawnRequestError(request, model.name);
                if (reason) {
                    quarantineRequest(colony, request, reason);
                    remove(request);
                    continue;
                }
                if (bodyCost(request.body) > budget) continue;
                let name: string;
                do {
                    name = `${request.role}_${model.name}_${Game.time}_${sequence++}`;
                } while (Game.creeps[name] || Memory.creeps[name]);
                const memory: CreepMemory = {
                    role: request.role, homeRoom: request.homeRoom, demandKey: request.key,
                    assignment: request.assignment, state: "pickup", working: false
                };
                const result = spawn.spawnCreep(request.body, name, { memory });
                request.attempts++;
                if (result === OK) {
                    budget -= bodyCost(request.body);
                    remove(request);
                    break;
                }
                request.lastError = result;
                if (isTransient(result)) {
                    if (result === ERR_BUSY) break;
                    continue;
                }
                if (result === ERR_NAME_EXISTS) continue;
                quarantineRequest(colony, request, `spawnCreep returned ${result}`);
                remove(request);
            }
        });
    }
    function remove(request: SpawnRequest): void {
        const index = colony.spawnQueue.indexOf(request);
        if (index !== -1) colony.spawnQueue.splice(index, 1);
    }
}