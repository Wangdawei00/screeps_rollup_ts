import policy, { validatePolicy } from "../config/policy";
import type { CreepDemand } from "../domain/types";
import { buildRoomModel } from "../colony/roomModel";
import type { RoomModel } from "../colony/roomModel";
import { runColony } from "../colony/colonyManager";
import { reconcilePopulation } from "../colony/populationPlanner";
import { runSpawns } from "../colony/spawnManager";
import { updateIntel } from "../empire/intelManager";
import { runRemotes } from "../empire/remoteManager";
import { runExpansion } from "../empire/expansionManager";
import { runMarket } from "../empire/marketManager";
import { runProduction } from "../empire/productionManager";
import { runCreeps } from "../roles";
import { cleanupMemory, initializeMemory } from "./memory";
import { runIsolated, Scheduler } from "./scheduler";

let policyValidated = false;

export function runKernel(): void {
    if (!policyValidated) {
        validatePolicy();
        policyValidated = true;
    }
    initializeMemory();
    runIsolated("memory:cleanup", cleanupMemory);
    const models = new Map<string, RoomModel>();
    const rooms = Object.values(Game.rooms).sort((a, b) => a.name.localeCompare(b.name));
    for (const room of rooms) {
        if (room.controller?.my) runIsolated(`model:${room.name}`, () => {
            models.set(room.name, buildRoomModel(room));
        });
    }
    const observations = new Scheduler();
    for (const room of rooms) {
        observations.register({
            name: `intel:${room.name}`, priority: "normal", interval: 1, run: () => updateIntel(room, models)
        });
    }
    observations.run();
    const demands: CreepDemand[] = [];
    for (const model of models.values()) {
        runIsolated(`colony:${model.name}`, () => demands.push(...runColony(model)));
    }
    const empire = new Scheduler();
    empire.register({ name: "empire:remotes", priority: "normal", interval: 1, run: () => demands.push(...runRemotes(models)) });
    empire.register({ name: "empire:expansion", priority: "normal", interval: 1, run: () => demands.push(...runExpansion(models)) });
    empire.register({ name: "empire:production", priority: "normal", interval: 1, run: () => demands.push(...runProduction(models)) });
    empire.register({
        name: "empire:market", priority: "low", interval: 1,
        condition: () => Game.cpu.bucket >= policy.minimumCpuBucket, run: () => runMarket(models)
    });
    empire.run();
    for (const model of models.values()) {
        runIsolated(`population:reconcile:${model.name}`, () => reconcilePopulation(model, demands));
        runIsolated(`spawning:${model.name}`, () => runSpawns(model));
    }
    runCreeps(models);
}