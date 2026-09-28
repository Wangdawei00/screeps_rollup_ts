import type {RoomModel} from "@/colony/roomModel";
import {position, travel} from "@/roles/common";

export function runDefender(creep: Creep, model?: RoomModel): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "defense") return;
    const local = model?.name === creep.room.name ? model : undefined;
    const friendlies = local?.friendlyCreeps || creep.room.find(FIND_MY_CREEPS);
    if (creep.getActiveBodyparts(HEAL) > 0) {
        const injured = creep.hits < creep.hitsMax ? creep : creep.pos.findClosestByRange(friendlies.filter(friend => friend.hits < friend.hitsMax));
        if (injured) {
            if (creep.pos.inRangeTo(injured, 1)) creep.heal(injured);
            else if (creep.pos.inRangeTo(injured, 3)) creep.rangedHeal(injured);
        }
    }
    if (!travel(creep, assignment.targetRoom, false)) return;
    const hostiles = local?.hostiles || creep.room.find(FIND_HOSTILE_CREEPS);
    const plan = Memory.colonies[creep.room.name]?.defense.plan;
    const priority = plan?.threat.targetPriority || [];
    const planned = plan?.attackTarget && Game.getObjectById(plan.attackTarget);
    const target = planned && hostiles.some(hostile => hostile.id === planned.id) ? planned :
        hostiles.slice().sort((a, b) => {
            const aIndex = priority.indexOf(a.id), bIndex = priority.indexOf(b.id);
            if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? Infinity : aIndex) - (bIndex < 0 ? Infinity : bIndex);
            return b.getActiveBodyparts(HEAL) - a.getActiveBodyparts(HEAL) ||
                (b.getActiveBodyparts(ATTACK) + b.getActiveBodyparts(RANGED_ATTACK)) -
                (a.getActiveBodyparts(ATTACK) + a.getActiveBodyparts(RANGED_ATTACK)) ||
                creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
        })[0];
    if (!target) {
        const anchor = Memory.colonies[creep.room.name]?.anchor;
        if (anchor && !creep.pos.inRangeTo(position(anchor), 3)) creep.moveTo(position(anchor), {
            range: 3,
            reusePath: 20
        });
        return;
    }
    const distance = creep.pos.getRangeTo(target);
    if (creep.getActiveBodyparts(RANGED_ATTACK) > 0 && distance <= 3) {
        const value = hostiles.reduce((sum, hostile) => {
            const range = creep.pos.getRangeTo(hostile);
            return sum + (range <= 1 ? 10 : range === 2 ? 4 : range === 3 ? 1 : 0);
        }, 0);
        const safe = !friendlies.some(friend => friend.name !== creep.name && creep.pos.inRangeTo(friend, 3));
        if (value > 10 && safe) creep.rangedMassAttack();
        else creep.rangedAttack(target);
    }
    if (creep.getActiveBodyparts(ATTACK) > 0) {
        if (creep.attack(target) === ERR_NOT_IN_RANGE) creep.moveTo(target, {range: 1, reusePath: 3});
    } else if (distance > 3) creep.moveTo(target, {range: 3, reusePath: 3});
}