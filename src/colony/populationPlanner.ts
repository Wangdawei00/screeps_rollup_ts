import policy from "../config/policy";
import type { CreepDemand, CreepRole, DefensePlan, SpawnRequest } from "../domain/types";
import { assignmentMatchesRole, hasRoleParts, isAssignment } from "../domain/types";
import { buildHarvester, buildMiner, buildTransporter, buildUpgrader, buildWorker } from "../planning/bodyBuilder";
import { quarantineRequest, spawnRequestError } from "../kernel/memory";
import type { RoomModel } from "./roomModel";

function localCreeps(model: RoomModel, role: CreepRole): Creep[] {
    return (model.creepsByRole.get(role) || []).filter(creep =>
        !creep.memory.demandKey?.startsWith("remote:") && !creep.memory.demandKey?.startsWith("expansion:"));
}

export function planPopulation(model: RoomModel, defense: DefensePlan): CreepDemand[] {
    const memory = Memory.colonies[model.name];
    const demands: CreepDemand[] = [];
    const add = (demand: Omit<CreepDemand, "homeRoom">): void => {
        if (demand.body.length) demands.push({ ...demand, homeRoom: model.name });
    };
    const active = (role: CreepRole): Creep[] => localCreeps(model, role).filter(creep =>
        !creep.spawning && creep.room.name === model.name && (creep.ticksToLive || 0) > policy.replacementTravelBuffer &&
        hasRoleParts(role, part => creep.getActiveBodyparts(part) > 0));
    const miners = active("miner").filter(creep => creep.getActiveBodyparts(WORK) > 0);
    const transporters = active("transporter").filter(creep => creep.getActiveBodyparts(CARRY) > 0);
    const pipeline = miners.length > 0 && transporters.length > 0;
    const plans = Object.values(memory.sourcePlans).filter(plan => plan.accessible);
    if (!pipeline) {
        const existing = localCreeps(model, "harvester");
        const canRefill = existing.some(creep => creep.spawning ||
            ((creep.ticksToLive || 0) > 50 && hasRoleParts("harvester", part => creep.getActiveBodyparts(part) > 0)));
        const budget = canRefill ? Math.min(model.energyCapacity, 600) : Math.min(model.energyAvailable, 300);
        add({
            key: `local:harvester:${model.name}:0`, role: "harvester", priority: 1000,
            body: buildHarvester(budget), travelEstimate: 0
        });
    }
    for (const plan of plans) {
        add({
            key: `local:miner:${plan.sourceId}:0`, role: "miner", priority: 850,
            body: buildMiner(model.energyCapacity), travelEstimate: plan.pathLength,
            assignment: {
                type: "source", sourceId: plan.sourceId, workPosition: plan.workPosition, containerId: plan.containerId
            }
        });
    }
    const backlog = Object.values(memory.logisticsJobs).filter(job => job.roomName === model.name);
    const pathCarry = plans.reduce((sum, plan) => sum + plan.carryRequirement, 0);
    const overdue = backlog.filter(job => Game.time - job.createdAt > 100)
        .reduce((sum, job) => sum + job.amount, 0);
    const carryRequired = Math.max(plans.length ? 2 : 0, pathCarry + Math.min(16, Math.ceil(overdue / 500)));
    const haulerBody = buildTransporter(model.energyCapacity, Math.min(16, Math.max(2, carryRequired)));
    const bodyCarry = haulerBody.filter(part => part === CARRY).length;
    if (bodyCarry) {
        const slots = Math.min(6, Math.ceil(carryRequired / bodyCarry));
        for (let index = 0; index < slots; index++) {
            add({
                key: `local:transporter:${model.name}:${index}`, role: "transporter", priority: 800 - index,
                body: haulerBody, assignment: { type: "logistics" }, travelEstimate: 10
            });
        }
    }
    const workBacklog = model.constructionSites.reduce((sum, site) => sum + site.progressTotal - site.progress, 0) +
        Object.values(memory.workJobs).filter(job => job.type === "repair").length * 500;
    if (pipeline || active("harvester").length) {
        const workers = workBacklog > 0 ? Math.min(model.stage === "stable" ? 3 : 2, Math.ceil(workBacklog / 10_000)) : 0;
        for (let index = 0; index < workers; index++) {
            add({
                key: `local:worker:${model.name}:${index}`, role: "worker", priority: 500 - index,
                body: buildWorker(Math.min(model.energyCapacity, 1600))
            });
        }
        const downgradeRisk = model.controller.ticksToDowngrade < 5_000;
        const surplus = model.storageEnergy > policy.storageEnergyReserve + policy.upgradeEnergySurplus;
        const controllerSource = [...model.links, ...model.containers]
            .filter(structure => structure.pos.inRangeTo(model.controller, 3))
            .sort((a, b) => a.id.localeCompare(b.id))[0];
        const workParts = model.controller.level === 8 ? 15 : surplus ? 15 : downgradeRisk ? 3 : 1;
        add({
            key: `local:upgrader:${model.name}:0`, role: "upgrader", priority: downgradeRisk ? 900 : 400,
            body: buildUpgrader(Math.min(model.energyCapacity, surplus ? 2400 : 600), workParts),
            assignment: { type: "controller", controllerId: model.controller.id, energySourceId: controllerSource?.id },
            travelEstimate: 15
        });
    }
    demands.push(...defense.defenderDemands.filter(demand => demand.body.length > 0));
    return demands;
}

export function demandSatisfied(demand: CreepDemand): boolean {
    const lifetimeNeeded = demand.body.length * CREEP_SPAWN_TIME +
        (demand.travelEstimate || 0) + policy.replacementTravelBuffer;
    for (const creep of Object.values(Game.creeps)) {
        if (!matchesDemand(creep.memory, demand)) continue;
        if (creep.spawning || ((creep.ticksToLive || 0) > lifetimeNeeded &&
            hasRoleParts(demand.role, part => creep.getActiveBodyparts(part) > 0))) return true;
    }
    return Object.values(Game.spawns).some(spawn => {
        if (!spawn.spawning) return false;
        const memory = Memory.creeps[spawn.spawning.name];
        return matchesDemand(memory, demand);
    });
}

function matchesDemand(memory: CreepMemory | undefined, demand: CreepDemand): boolean {
    return !!memory && memory.homeRoom === demand.homeRoom && memory.demandKey === demand.key &&
        memory.role === demand.role && (memory.assignment === undefined || isAssignment(memory.assignment)) &&
        assignmentMatchesRole(memory.role, memory.assignment);
}

export function reconcilePopulation(model: RoomModel, demands: readonly CreepDemand[]): void {
    const colony = Memory.colonies[model.name];
    const previous = new Map(colony.spawnQueue.map(request => [request.key, request]));
    const next: SpawnRequest[] = [];
    const keys = new Set<string>();
    for (const demand of demands) {
        if (demand.homeRoom !== model.name || keys.has(demand.key)) continue;
        keys.add(demand.key);
        if (demand.assignment && demand.assignment.type !== "logistics") {
            for (const creep of Object.values(Game.creeps)) {
                if (matchesDemand(creep.memory, demand)) creep.memory.assignment = { ...demand.assignment };
            }
        }
        if (demandSatisfied(demand)) continue;
        const queued = previous.get(demand.key);
        const request: SpawnRequest = {
            ...demand, body: [...demand.body],
            createdAt: queued?.createdAt ?? Game.time, attempts: queued?.attempts ?? 0, lastError: queued?.lastError
        };
        const reason = spawnRequestError(request, model.name);
        if (reason) {
            quarantineRequest(colony, request, reason);
            continue;
        }
        next.push(request);
    }
    colony.spawnQueue = next;
}