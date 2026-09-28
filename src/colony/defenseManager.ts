import policy from "@/config/policy";
import type {DefensePlan, ThreatAssessment} from "@/domain/types";
import {buildDefender} from "@/planning/bodyBuilder";
import {range} from "@/planning/geometry";
import type {RoomModel} from "./roomModel";

function strength(creep: Creep): Omit<ThreatAssessment, "targetPriority"> {
    const result = {attack: 0, ranged: 0, heal: 0, dismantle: 0, toughness: 0, total: 0};
    for (const part of creep.body) {
        if (part.hits <= 0) continue;
        const boosts = BOOSTS[part.type] as Partial<Record<string, Record<string, number>>>;
        const boost = part.boost ? boosts[part.boost] : undefined;
        if (part.type === ATTACK) result.attack += ATTACK_POWER * (boost?.attack || 1);
        if (part.type === RANGED_ATTACK) result.ranged += RANGED_ATTACK_POWER * (boost?.rangedAttack || 1);
        if (part.type === HEAL) result.heal += HEAL_POWER * (boost?.heal || 1);
        if (part.type === WORK) result.dismantle += DISMANTLE_POWER * (boost?.dismantle || 1);
        if (part.type === TOUGH) result.toughness += part.hits / (boost?.damage || 1);
    }
    result.total = result.attack + result.ranged + result.heal + result.dismantle;
    return result;
}

export function assessThreat(hostiles: readonly Creep[], criticalPositions: readonly RoomPosition[] = []): ThreatAssessment {
    const result: ThreatAssessment = {
        attack: 0,
        ranged: 0,
        heal: 0,
        dismantle: 0,
        toughness: 0,
        total: 0,
        targetPriority: []
    };
    const priorities = hostiles.map(creep => {
        const value = strength(creep);
        for (const key of ["attack", "ranged", "heal", "dismantle", "toughness", "total"] as const) result[key] += value[key];
        const distance = criticalPositions.reduce((minimum, position) => Math.min(minimum, range(creep.pos, position)), 50);
        return {
            id: creep.id, score: value.heal * 4 + value.attack + value.ranged + value.dismantle +
                (value.total > 0 ? Math.max(0, 10 - distance) * 30 : 0)
        };
    });
    result.targetPriority = priorities.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map(entry => entry.id);
    return result;
}

export function towerDamageAt(distance: number): number {
    if (distance <= TOWER_OPTIMAL_RANGE) return TOWER_POWER_ATTACK;
    const fraction = Math.min(1, (distance - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE));
    return TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * fraction);
}

export function planDefense(model: RoomModel): DefensePlan {
    const memory = Memory.colonies[model.name].defense;
    const critical = [...model.spawns, ...(model.storage ? [model.storage] : [])];
    const threat = assessThreat(model.hostiles, critical.map(structure => structure.pos));
    const attackTarget = threat.targetPriority[0];
    const injured = model.friendlyCreeps.filter(creep => creep.hits < creep.hitsMax)
        .sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax || a.id.localeCompare(b.id));
    const wallTarget = policy.wallTargetHitsByRcl[model.controller.level] || 0;
    const damaged = model.structures.filter(structure => {
        if ("my" in structure && !structure.my) return false;
        if (!structure.hitsMax) return false;
        const target = structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART ?
            wallTarget : structure.hitsMax;
        return structure.hits < Math.min(target, structure.hitsMax);
    }).sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax || a.id.localeCompare(b.id));
    const armedTowers = model.towers.filter(tower => tower.store[RESOURCE_ENERGY] >= TOWER_ENERGY_COST && tower.isActive());
    const breach = model.hostiles.find(creep => strength(creep).attack + strength(creep).ranged + strength(creep).dismantle > 0 &&
        critical.some(structure => range(creep.pos, structure.pos) <= 3 &&
            !model.structures.some(rampart => rampart.structureType === STRUCTURE_RAMPART && rampart.my &&
                range(rampart.pos, structure.pos) === 0 && rampart.hits > Math.max(5000, threat.total * 10))));
    const towerDamage = breach ? armedTowers.reduce((sum, tower) => sum + towerDamageAt(range(tower.pos, breach.pos)), 0) : 0;
    const defenderDamage = breach ? model.friendlyCreeps.filter(creep => range(creep.pos, breach.pos) <= 3)
        .reduce((sum, creep) => sum + strength(creep).ranged + (range(creep.pos, breach.pos) <= 1 ? strength(creep).attack : 0), 0) : 0;
    const plan: DefensePlan = {
        threat, attackTarget,
        healTarget: !attackTarget ? injured[0]?.id : undefined,
        repairTarget: !attackTarget && !injured.length ? damaged[0]?.id : undefined,
        activateSafeMode: !!breach && !!model.controller.safeModeAvailable && !model.controller.safeMode &&
            !model.controller.safeModeCooldown && towerDamage + defenderDamage < threat.total + threat.toughness / 10,
        defenderDemands: []
    };
    if (threat.total > 0) {
        memory.lastThreatTick = Game.time;
        if (!memory.history.length || Game.time - memory.history[memory.history.length - 1].tick >= 10) {
            memory.history.push({tick: Game.time, strength: threat.total});
            memory.history = memory.history.slice(-20);
        }
        const target = model.hostiles.find(creep => creep.id === attackTarget);
        const existingTowerPower = target ? armedTowers.reduce((sum, tower) =>
            sum + towerDamageAt(range(tower.pos, target.pos)), 0) : 0;
        if (existingTowerPower < threat.heal * 2 + threat.attack + threat.ranged + threat.dismantle) {
            const body = buildDefender(model.energyCapacity, threat);
            const damage = body.filter(part => part === ATTACK).length * ATTACK_POWER +
                body.filter(part => part === RANGED_ATTACK).length * RANGED_ATTACK_POWER;
            if (body.length && damage > 0) {
                const count = Math.min(3, Math.max(1, Math.ceil((threat.heal * 2 + threat.attack + threat.ranged - existingTowerPower) / damage)));
                for (let index = 0; index < count; index++) {
                    plan.defenderDemands.push({
                        key: `defender:${model.name}:${index}`, role: "defender", homeRoom: model.name,
                        body: body.slice(), priority: 110, assignment: {type: "defense", targetRoom: model.name}
                    });
                }
            }
        }
    }
    memory.plan = plan;
    return plan;
}