import policy from "../config/policy";
import type { DefensePlan, StructurePlan } from "../domain/types";
import { range } from "../planning/geometry";
import type { RoomModel } from "./roomModel";

export interface ReactionLabs {
    inputA: StructureLab;
    inputB: StructureLab;
    reagentA: MineralConstant | MineralCompoundConstant;
    reagentB: MineralConstant | MineralCompoundConstant;
    outputs: StructureLab[];
}

export function reactionReagents(compound: MineralCompoundConstant):
    [MineralConstant | MineralCompoundConstant, MineralConstant | MineralCompoundConstant] | undefined {
    const reactions = REACTIONS as Record<string, Record<string, string>>;
    for (const a of Object.keys(reactions).sort()) {
        for (const b of Object.keys(reactions[a]).sort()) {
            if (reactions[a][b] === compound) return [
                a as MineralConstant | MineralCompoundConstant, b as MineralConstant | MineralCompoundConstant
            ];
        }
    }
    return undefined;
}

export function selectReactionLabs(labs: readonly StructureLab[], compound: MineralCompoundConstant): ReactionLabs | undefined {
    const reagents = reactionReagents(compound);
    if (!reagents) return undefined;
    const sorted = labs.filter(lab => lab.my && lab.isActive()).slice().sort((a, b) => a.id.localeCompare(b.id));
    let chosen: ReactionLabs | undefined;
    let bestScore = -Infinity;
    for (const inputA of sorted) for (const inputB of sorted) {
        if (inputA.id === inputB.id) continue;
        const outputs = sorted.filter(lab => lab.id !== inputA.id && lab.id !== inputB.id &&
            range(lab.pos, inputA.pos) <= 2 && range(lab.pos, inputB.pos) <= 2);
        if (!outputs.length) continue;
        // Keep assignments stable while inputs are being filled, but prefer an already configured cluster.
        const score = outputs.length * 100 +
            (inputA.mineralType === reagents[0] ? 10 : inputA.mineralType ? -20 : 0) +
            (inputB.mineralType === reagents[1] ? 10 : inputB.mineralType ? -20 : 0) +
            outputs.filter(lab => !lab.mineralType || lab.mineralType === compound).length;
        if (score > bestScore) {
            bestScore = score;
            chosen = { inputA, inputB, reagentA: reagents[0], reagentB: reagents[1], outputs };
        }
    }
    return chosen;
}

export function planStructures(model: RoomModel, defense: DefensePlan): StructurePlan {
    const plan: StructurePlan = { links: [], towers: [], reactions: [], factories: [], observations: [] };
    for (const tower of model.towers) {
        if (!tower.isActive() || tower.store[RESOURCE_ENERGY] < TOWER_ENERGY_COST) continue;
        if (defense.attackTarget) plan.towers.push({ towerId: tower.id, action: "attack", targetId: defense.attackTarget });
        else if (defense.healTarget) plan.towers.push({ towerId: tower.id, action: "heal", targetId: defense.healTarget });
        else if (defense.threat.total === 0 && defense.repairTarget && tower.store[RESOURCE_ENERGY] > policy.minimumTowerEnergy) {
            plan.towers.push({ towerId: tower.id, action: "repair", targetId: defense.repairTarget });
        }
    }
    const sourcePlans = Object.values(Memory.colonies[model.name].sourcePlans).filter(source => source.accessible);
    const links = model.links.filter(link => link.isActive()).slice().sort((a, b) => a.id.localeCompare(b.id));
    const sourceLinks = links.filter(link => sourcePlans.some(source => range(link.pos, source.workPosition) <= 1));
    const otherLinks = links.filter(link => !sourceLinks.includes(link));
    const controllerLink = otherLinks.filter(link => range(link.pos, model.controller.pos) <= 3)
        .sort((a, b) => range(a.pos, model.controller.pos) - range(b.pos, model.controller.pos) || a.id.localeCompare(b.id))[0];
    const storageLink = otherLinks.filter(link => link !== controllerLink && model.storage && range(link.pos, model.storage.pos) <= 2)[0];
    const remaining = new Map(links.map(link => [link.id, link.store.getFreeCapacity(RESOURCE_ENERGY)]));
    const sends = [...sourceLinks, ...(storageLink && controllerLink ? [storageLink] : [])];
    for (const from of sends) {
        if (from.cooldown || from.store[RESOURCE_ENERGY] <= 0) continue;
        const targets = from === storageLink ? [controllerLink] : [controllerLink, storageLink];
        const to = targets.find(target => target && target.id !== from.id && (remaining.get(target.id) || 0) >= 100);
        if (!to) continue;
        const amount = Math.min(from.store[RESOURCE_ENERGY], remaining.get(to.id) || 0);
        if (amount <= 0) continue;
        plan.links.push({ from: from.id, to: to.id, amount });
        remaining.set(to.id, (remaining.get(to.id) || 0) - (amount - Math.ceil(amount * LINK_LOSS_RATIO)));
    }
    const goal = Memory.empire.production[model.name];
    if (policy.productionEnabled && goal?.compound) {
        const cluster = selectReactionLabs(model.labs, goal.compound);
        if (cluster) for (const output of cluster.outputs) {
            if (!output.cooldown && (!output.mineralType || output.mineralType === goal.compound)) {
                plan.reactions.push({ output: output.id, inputA: cluster.inputA.id, inputB: cluster.inputB.id });
            }
        }
    }
    if (policy.productionEnabled && goal?.factoryResource) {
        for (const factory of model.factories) {
            if (factory.isActive() && !factory.cooldown) plan.factories.push({ factoryId: factory.id, resource: goal.factoryResource });
        }
    }
    const observed = new Set<string>();
    for (const observer of model.observers) {
        if (!observer.isActive()) continue;
        const target = Object.keys(Memory.intel).filter(name => !Game.rooms[name] && !observed.has(name) &&
            Game.map.getRoomLinearDistance(model.name, name) <= OBSERVER_RANGE)
            .sort((a, b) => Memory.intel[a].lastSeen - Memory.intel[b].lastSeen || a.localeCompare(b))[0];
        if (target) {
            observed.add(target);
            plan.observations.push({ observerId: observer.id, roomName: target });
        }
    }
    return plan;
}

function stale(kind: string, id: string): void {
    if (Game.time % 100 === 0) console.log(`[structures] stale ${kind}: ${id}`);
}

export function runStructures(model: RoomModel, plan: StructurePlan): void {
    const defense = Memory.colonies[model.name].defense;
    if (defense.plan?.activateSafeMode && !model.controller.safeMode && !model.controller.safeModeCooldown &&
        model.controller.safeModeAvailable && defense.lastSafeModeAttempt !== Game.time) {
        defense.lastSafeModeAttempt = Game.time;
        model.controller.activateSafeMode();
    }
    for (const action of plan.towers) {
        const tower = Game.getObjectById(action.towerId);
        const target = Game.getObjectById(action.targetId);
        if (!tower || tower.structureType !== STRUCTURE_TOWER || !tower.my || !target) {
            stale("tower action", action.towerId); continue;
        }
        if (tower.room.name !== model.name || !tower.isActive() || tower.store[RESOURCE_ENERGY] < TOWER_ENERGY_COST) continue;
        if (action.action === "attack" && "body" in target && !target.my) tower.attack(target);
        if (action.action === "heal" && "body" in target && target.my) tower.heal(target);
        if (action.action === "repair" && "structureType" in target && !model.hostiles.length &&
            tower.store[RESOURCE_ENERGY] > policy.minimumTowerEnergy) tower.repair(target);
    }
    const linkCapacity = new Map<string, number>();
    const usedLinks = new Set<string>();
    for (const action of plan.links) {
        const from = Game.getObjectById(action.from);
        const to = Game.getObjectById(action.to);
        if (!from || !to || from.structureType !== STRUCTURE_LINK || to.structureType !== STRUCTURE_LINK ||
            !from.my || !to.my) { stale("link action", action.from); continue; }
        if (from.room.name !== model.name || to.room.name !== model.name || from.id === to.id ||
            from.cooldown || usedLinks.has(from.id) || !from.isActive() || !to.isActive()) continue;
        const free = linkCapacity.get(to.id) ?? to.store.getFreeCapacity(RESOURCE_ENERGY);
        const amount = Math.floor(Math.min(action.amount, from.store[RESOURCE_ENERGY], free));
        if (amount > 0 && from.transferEnergy(to, amount) === OK) {
            usedLinks.add(from.id);
            linkCapacity.set(to.id, free - (amount - Math.ceil(amount * LINK_LOSS_RATIO)));
        }
    }
    const consumed = new Map<string, number>();
    const reacted = new Set<string>();
    const goal = Memory.empire.production[model.name];
    for (const action of plan.reactions) {
        const output = Game.getObjectById(action.output);
        const a = Game.getObjectById(action.inputA);
        const b = Game.getObjectById(action.inputB);
        if (!output || !a || !b || output.structureType !== STRUCTURE_LAB ||
            a.structureType !== STRUCTURE_LAB || b.structureType !== STRUCTURE_LAB) { stale("reaction", action.output); continue; }
        if (!policy.productionEnabled || !goal?.compound || output.cooldown || reacted.has(output.id) || !output.my || !a.my || !b.my ||
            !output.isActive() || !a.isActive() || !b.isActive() || output.room.name !== model.name ||
            output.id === a.id || output.id === b.id || a.id === b.id ||
            range(output.pos, a.pos) > 2 || range(output.pos, b.pos) > 2 || !a.mineralType || !b.mineralType) continue;
        const compound = (REACTIONS as Record<string, Record<string, MineralCompoundConstant>>)[a.mineralType]?.[b.mineralType];
        if (compound !== goal.compound || (output.mineralType && output.mineralType !== compound)) continue;
        const effect = output.effects?.find(effect => effect.effect === PWR_OPERATE_LAB && effect.ticksRemaining > 0);
        const bonus = effect && "level" in effect ? (POWER_INFO[PWR_OPERATE_LAB].effect as number[])[effect.level - 1] : 0;
        const amount = LAB_REACTION_AMOUNT + (bonus || 0);
        if (a.store[a.mineralType] - (consumed.get(a.id) || 0) < amount ||
            b.store[b.mineralType] - (consumed.get(b.id) || 0) < amount || output.store.getFreeCapacity(compound) < amount) continue;
        if (output.runReaction(a, b) === OK) {
            reacted.add(output.id);
            consumed.set(a.id, (consumed.get(a.id) || 0) + amount);
            consumed.set(b.id, (consumed.get(b.id) || 0) + amount);
        }
    }
    const produced = new Set<string>();
    for (const action of plan.factories) {
        const factory = Game.getObjectById(action.factoryId);
        if (!factory || factory.structureType !== STRUCTURE_FACTORY || !factory.my) { stale("factory", action.factoryId); continue; }
        const recipe = COMMODITIES[action.resource];
        if (!policy.productionEnabled || goal?.factoryResource !== action.resource || factory.room.name !== model.name ||
            factory.cooldown || !factory.isActive() || produced.has(factory.id) || !recipe) continue;
        if (recipe.level && (factory.level !== recipe.level || !factory.effects?.some(effect =>
            effect.effect === PWR_OPERATE_FACTORY && effect.ticksRemaining > 0 && "level" in effect && effect.level === recipe.level))) continue;
        let inputAmount = 0;
        const supplied = Object.entries(recipe.components).every(([resource, amount]) => {
            inputAmount += amount!;
            return factory.store[resource as ResourceConstant] >= amount!;
        });
        if (!supplied || factory.store.getFreeCapacity() + inputAmount < recipe.amount) continue;
        if (factory.produce(action.resource) === OK) produced.add(factory.id);
    }
    const observers = new Set<string>();
    for (const action of plan.observations) {
        const observer = Game.getObjectById(action.observerId);
        if (!observer || observer.structureType !== STRUCTURE_OBSERVER || !observer.my) { stale("observer", action.observerId); continue; }
        if (observer.room.name === model.name && observer.isActive() && !observers.has(observer.id) &&
            Game.map.getRoomLinearDistance(model.name, action.roomName) <= OBSERVER_RANGE) {
            observer.observeRoom(action.roomName);
            observers.add(observer.id);
        }
    }
}