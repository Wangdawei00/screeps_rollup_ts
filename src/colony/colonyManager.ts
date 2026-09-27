import type { CreepDemand, DefensePlan } from "../domain/types";
import { runIsolated } from "../kernel/scheduler";
import { reconcilePlanning, runConstruction } from "./constructionManager";
import { planDefense } from "./defenseManager";
import { reconcileLogistics } from "./logisticsManager";
import { planPopulation } from "./populationPlanner";
import type { RoomModel } from "./roomModel";
import { planStructures, runStructures } from "./structureManager";

export function runColony(model: RoomModel): CreepDemand[] {
    const memory = Memory.colonies[model.name];
    if (memory.stage !== model.stage) {
        console.log(`[colony:${model.name}] ${memory.stage} -> ${model.stage}`);
        memory.stage = model.stage;
        memory.stageChangedAt = Game.time;
    }
    if (model.stage === "stable" || model.stage === "developing") memory.established = true;
    let defense: DefensePlan = memory.defense.plan || {
        threat: { attack: 0, ranged: 0, heal: 0, dismantle: 0, toughness: 0, total: 0, targetPriority: [] },
        activateSafeMode: false, defenderDemands: []
    };
    runIsolated(`defense:${model.name}`, () => {
        defense = planDefense(model);
        memory.defense.plan = defense;
    });
    const previousRcl = memory.construction.lastRcl;
    const previousRevision = memory.construction.revision;
    runIsolated(`planning:${model.name}`, () => reconcilePlanning(model));
    if (Game.time % 5 === 0 || previousRcl !== model.controller.level || previousRevision !== memory.construction.revision) {
        runIsolated(`construction:${model.name}`, () => { runConstruction(model); });
    }
    runIsolated(`logistics:${model.name}`, () => reconcileLogistics(model));
    // Keep already validated local intent if this tick's planner fails.
    let demands: CreepDemand[] = memory.spawnQueue.filter(request =>
        !request.key.startsWith("remote:") && !request.key.startsWith("expansion:") && !request.key.startsWith("production:"));
    runIsolated(`population:${model.name}`, () => { demands = planPopulation(model, defense); });
    runIsolated(`structures:${model.name}`, () => runStructures(model, planStructures(model, defense)));
    return demands;
}