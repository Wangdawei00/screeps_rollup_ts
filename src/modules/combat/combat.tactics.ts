import {
    attackPower, effectiveIncomingDamage, healPower, incomingDamage, massAttackPower, rangedPower
} from "./combat.damage";
import {shouldEngage} from "./combat.targeting";
import {CombatContext, CombatPlan, isControllerTarget, isCreepTarget} from "./combat.types";

function setRallyMovement(creep: Creep, context: CombatContext, plan: CombatPlan): void {
    const partner = context.partner;
    if (creep.memory.combatClass === "healer" && partner &&
        (context.operation.state === "retreating" ||
            (creep.pos.getRangeTo(context.rally) <= 2 && partner.pos.getRangeTo(context.rally) <= 2)) &&
        !creep.pos.isNearTo(partner)) {
        plan.movement = partner.pos;
        plan.movementRange = 1;
    } else {
        plan.movement = context.rally;
        plan.movementRange = 2;
    }
}

function setTravelMovement(creep: Creep, context: CombatContext, plan: CombatPlan): void {
    const healer = context.members.find(member =>
        member.memory.combatClass === "healer" &&
        member.pos.roomName === creep.pos.roomName &&
        (!context.partner || member.name === context.partner.name)) ??
        context.members.find(member => member.memory.combatClass === "healer");
    if (creep.memory.combatClass === "healer" && context.partner) {
        plan.movement = context.partner.pos;
        plan.movementRange = 1;
    } else if (healer && (healer.pos.roomName !== creep.room.name ||
        creep.pos.getRangeTo(healer) > 4)) {
        plan.movement = healer.pos;
        plan.movementRange = 2;
    } else if (context.leader && context.leader.id !== creep.id &&
        (context.leader.pos.roomName !== creep.room.name ||
            creep.pos.getRangeTo(context.leader) > 2)) {
        plan.movement = context.leader.pos;
        plan.movementRange = 2;
    } else {
        plan.movement = context.objective;
        plan.movementRange = 2;
    }
}

function supportingHealer(creep: Creep, context: CombatContext): Creep | undefined {
    return context.partner?.memory.combatClass === "healer" ? context.partner :
        context.members.find(member => member.memory.combatClass === "healer" &&
            member.room.name === creep.room.name) ??
        context.members.find(member => member.memory.combatClass === "healer");
}

function nearbyMeleeThreats(creep: Creep, context: CombatContext): Creep[] {
    return context.threats.filter(hostile =>
        attackPower(hostile) > 0 && creep.pos.getRangeTo(hostile) <= 2);
}

export function planMelee(creep: Creep, context: CombatContext): CombatPlan {
    const plan: CombatPlan = {};
    const focus = context.focus;
    const threatToSupport = context.hostiles.filter(hostile =>
        attackPower(hostile) > 0 && context.members.some(member =>
            member.memory.combatClass !== "melee" &&
            hostile.pos.inRangeTo(member, 2)))
        .sort((a, b) => attackPower(b) - attackPower(a) ||
            creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    if (context.operation.state !== "complete") {
        if (focus && creep.pos.isNearTo(focus)) {
            if (isControllerTarget(focus)) {
                if (creep.getActiveBodyparts(CLAIM) > 0) {
                    plan.action = () => creep.attackController(focus);
                }
            } else if (creep.getActiveBodyparts(ATTACK) > 0) {
                plan.action = () => creep.attack(focus);
            }
        }
        if (!plan.action && creep.getActiveBodyparts(ATTACK) > 0) {
            const defender = threatToSupport.find(hostile => creep.pos.isNearTo(hostile));
            if (defender) {
                plan.action = () => creep.attack(defender);
            }
        }
    }

    if (context.operation.state === "forming" || context.operation.state === "retreating" ||
        context.operation.state === "complete") {
        setRallyMovement(creep, context, plan);
    } else if (context.operation.state === "travelling") {
        setTravelMovement(creep, context, plan);
    } else if (focus && isCreepTarget(focus) && creep.getActiveBodyparts(ATTACK) === 0) {
        const escort = context.members.find(member => member.memory.combatClass === "ranger");
        plan.movement = escort?.pos ?? context.rally;
        plan.movementRange = 2;
    } else {
        const healer = supportingHealer(creep, context);
        if (healer && (healer.room.name !== creep.room.name ||
            creep.pos.getRangeTo(healer) > (creep.hits < creep.hitsMax * 0.7 ? 1 : 4))) {
            plan.movement = healer.pos;
            plan.movementRange = 1;
        } else if (threatToSupport[0] && !creep.pos.isNearTo(threatToSupport[0])) {
            plan.movement = threatToSupport[0].pos;
            plan.movementRange = 1;
        } else if (focus) {
            plan.movement = focus.pos;
            plan.movementRange = 1;
        } else {
            plan.movement = context.objective;
            plan.movementRange = 2;
        }
    }
    if (context.operation.state === "retreating" && creep.hits < creep.hitsMax * 0.5) {
        plan.flee = nearbyMeleeThreats(creep, context).map(hostile => hostile.pos);
    }
    return plan;
}

function canMassAttack(creep: Creep, context: CombatContext): boolean {
    if (creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3).some(hostile =>
        !shouldEngage(hostile.owner.username, context.operation.type))) {
        return false;
    }
    return !creep.pos.findInRange(FIND_STRUCTURES, 3).some(structure =>
        structure.id !== context.focus?.id &&
        structure.structureType !== STRUCTURE_ROAD &&
        structure.structureType !== STRUCTURE_CONTAINER &&
        (!("my" in structure) || !structure.my));
}

export function planRanger(creep: Creep, context: CombatContext): CombatPlan {
    const plan: CombatPlan = {};
    const focus = context.focus;
    const targetIsController = focus && isControllerTarget(focus);
    if (context.operation.state !== "complete" && creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
        const inRange = focus && !targetIsController && creep.pos.inRangeTo(focus, 3);
        const local = context.hostiles.filter(hostile => creep.pos.inRangeTo(hostile, 3));
        const massDamage = local.reduce((sum, hostile) =>
            sum + massAttackPower(creep, creep.pos.getRangeTo(hostile)), 0) +
            (inRange && focus && !isCreepTarget(focus)
                ? massAttackPower(creep, creep.pos.getRangeTo(focus)) : 0);
        if (massDamage > rangedPower(creep) && canMassAttack(creep, context)) {
            plan.action = () => creep.rangedMassAttack();
        } else if (inRange && focus) {
            plan.action = () => creep.rangedAttack(focus);
        } else if (local.length > 0) {
            const target = local.reduce((nearest, hostile) =>
                creep.pos.getRangeTo(hostile) < creep.pos.getRangeTo(nearest) ? hostile : nearest);
            plan.action = () => creep.rangedAttack(target);
        }
    }

    const healer = supportingHealer(creep, context);
    if (context.operation.state === "forming" || context.operation.state === "retreating" ||
        context.operation.state === "complete") {
        setRallyMovement(creep, context, plan);
    } else if (context.operation.state === "travelling") {
        setTravelMovement(creep, context, plan);
    } else if (healer && (healer.room.name !== creep.room.name ||
        creep.pos.getRangeTo(healer) > 4)) {
        plan.movement = healer.pos;
        plan.movementRange = 2;
    } else if (context.leader && context.leader.id !== creep.id &&
        (context.leader.pos.roomName !== creep.room.name ||
            creep.pos.getRangeTo(context.leader) > 3)) {
        plan.movement = context.leader.pos;
        plan.movementRange = 2;
    } else if (focus && !targetIsController) {
        plan.movement = focus.pos;
        plan.movementRange = 3;
    } else {
        plan.movement = context.objective;
        plan.movementRange = 2;
    }

    const melee = nearbyMeleeThreats(creep, context);
    const ranged = context.threats.some(hostile =>
        rangedPower(hostile) > 0 && creep.pos.inRangeTo(hostile, 3));
    if (melee.length > 0 && (!ranged || context.operation.state === "retreating")) {
        plan.flee = melee.map(hostile => hostile.pos);
    }
    return plan;
}

function patientScore(patient: Creep, context: CombatContext, healer: Creep): number {
    const danger = effectiveIncomingDamage(patient,
        incomingDamage(patient.pos, context.threats, context.towers));
    const missing = patient.hitsMax - patient.hits;
    return missing + danger * 2 + (patient.hits <= danger ? 10000 : 0) +
        (healer.memory.partnerName === patient.name ? 50 : 0);
}

export function planHealer(creep: Creep, context: CombatContext): CombatPlan {
    const plan: CombatPlan = {};
    const damaged = context.members.filter(member =>
        member.room.name === creep.room.name && member.hits < member.hitsMax);
    const selfThreat = effectiveIncomingDamage(creep,
        incomingDamage(creep.pos, context.threats, context.towers));
    const patient = (creep.hits < creep.hitsMax * 0.5 && selfThreat > 0 ? creep : undefined) ??
        damaged.filter(member => creep.pos.isNearTo(member) &&
            member.hits <= effectiveIncomingDamage(member,
                incomingDamage(member.pos, context.threats, context.towers)))
            .sort((a, b) => patientScore(b, context, creep) - patientScore(a, context, creep))[0] ??
        damaged.filter(member => creep.pos.inRangeTo(member, 3))
            .sort((a, b) => patientScore(b, context, creep) - patientScore(a, context, creep))[0] ??
        (context.partner && context.partner.hits < context.partner.hitsMax &&
            context.partner.room.name === creep.room.name ? context.partner : undefined);

    if (patient && creep.getActiveBodyparts(HEAL) > 0) {
        if (creep.pos.isNearTo(patient)) {
            plan.action = () => creep.heal(patient);
        } else if (creep.pos.inRangeTo(patient, 3)) {
            plan.action = () => creep.rangedHeal(patient);
        }
    }

    if (context.operation.state === "complete" || context.operation.state === "forming" ||
        context.operation.state === "retreating") {
        setRallyMovement(creep, context, plan);
    } else if (context.partner) {
        plan.movement = context.partner.pos;
        plan.movementRange = 1;
    } else {
        setTravelMovement(creep, context, plan);
    }
    if (patient && patient !== creep && !creep.pos.isNearTo(patient) &&
        patient.room.name === creep.room.name &&
        context.operation.state !== "complete" && context.operation.state !== "forming") {
        plan.movement = patient.pos;
        plan.movementRange = 1;
    }
    if (nearbyMeleeThreats(creep, context).length > 0) {
        plan.flee = nearbyMeleeThreats(creep, context).map(hostile => hostile.pos);
    }
    return plan;
}
