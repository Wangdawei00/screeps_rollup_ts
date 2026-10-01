import {
    attackPower, effectiveIncomingDamage, incomingDamage, rangedPower, towerDamageAtRange
} from "./combat.damage";
import {hostileTowers} from "./combat.targeting";
import {CombatContext, CombatPlan, isCreepTarget} from "./combat.types";

let cacheTick = -1;
const matrices = new Map<string, CostMatrix>();

export function combatCostMatrix(roomName: string, operation: CombatOperationMemory): CostMatrix {
    if (cacheTick !== Game.time) {
        cacheTick = Game.time;
        matrices.clear();
    }
    const key = `${roomName}:${operation.type}`;
    const cached = matrices.get(key);
    if (cached) {
        return cached;
    }

    const matrix = new PathFinder.CostMatrix();
    const room = Game.rooms[roomName];
    if (room) {
        for (const structure of room.find(FIND_STRUCTURES)) {
            if (structure.structureType === STRUCTURE_ROAD) {
                matrix.set(structure.pos.x, structure.pos.y, 1);
            } else if (structure.structureType === STRUCTURE_RAMPART) {
                if (!structure.my && !structure.isPublic) {
                    matrix.set(structure.pos.x, structure.pos.y, 255);
                }
            } else if (OBSTACLE_OBJECT_TYPES.some(type => type === structure.structureType)) {
                matrix.set(structure.pos.x, structure.pos.y, 255);
            }
        }
        for (const creep of room.find(FIND_CREEPS)) {
            matrix.set(creep.pos.x, creep.pos.y, 255);
        }
        for (const hostile of room.find(FIND_HOSTILE_CREEPS)) {
            const melee = attackPower(hostile);
            const ranged = rangedPower(hostile);
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const x = hostile.pos.x + dx;
                    const y = hostile.pos.y + dy;
                    if (x < 0 || x > 49 || y < 0 || y > 49 || matrix.get(x, y) === 255) {
                        continue;
                    }
                    const range = Math.max(Math.abs(dx), Math.abs(dy));
                    const danger = (range <= 1 ? melee : 0) + (range <= 3 ? ranged : 0);
                    matrix.set(x, y, Math.min(254, matrix.get(x, y) + Math.ceil(danger / 5)));
                }
            }
        }
        for (const tower of hostileTowers(room, operation)) {
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < TOWER_ENERGY_COST) {
                continue;
            }
            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    if (matrix.get(x, y) === 255) {
                        continue;
                    }
                    const range = Math.max(Math.abs(tower.pos.x - x), Math.abs(tower.pos.y - y));
                    const danger = towerDamageAtRange(range);
                    matrix.set(x, y, Math.min(254, matrix.get(x, y) + Math.ceil(danger / 8)));
                }
            }
        }
        for (const rampart of room.find(FIND_MY_STRUCTURES).filter(
            (structure): structure is StructureRampart => structure.structureType === STRUCTURE_RAMPART
        )) {
            matrix.set(rampart.pos.x, rampart.pos.y, 1);
        }
    }
    matrices.set(key, matrix);
    return matrix;
}

function walkable(creep: Creep, pos: RoomPosition): boolean {
    if (creep.room.getTerrain().get(pos.x, pos.y) === TERRAIN_MASK_WALL ||
        pos.lookFor(LOOK_CREEPS).some(other => other.id !== creep.id)) {
        return false;
    }
    return !pos.lookFor(LOOK_STRUCTURES).some(structure =>
        (structure.structureType === STRUCTURE_RAMPART && !structure.my && !structure.isPublic) ||
        (structure.structureType !== STRUCTURE_RAMPART &&
            OBSTACLE_OBJECT_TYPES.some(type => type === structure.structureType)));
}

function tileScore(
    creep: Creep,
    pos: RoomPosition,
    goal: RoomPosition,
    range: number,
    context: CombatContext
): number {
    const distance = pos.getRangeTo(goal);
    let score = -Math.max(0, distance - range) * 12 - Math.max(0, range - distance) * 8;
    score -= effectiveIncomingDamage(creep, incomingDamage(pos, context.threats, context.towers)) / 6;

    const anchor = context.partner ?? context.leader;
    if (anchor && anchor.id !== creep.id && anchor.pos.roomName === pos.roomName) {
        const separation = pos.getRangeTo(anchor.pos);
        score -= Math.max(0, separation - (creep.memory.combatClass === "healer" ? 1 : 2)) * 22;
        if (creep.memory.combatClass === "healer") {
            for (const hostile of context.threats) {
                if (pos.getRangeTo(hostile) < anchor.pos.getRangeTo(hostile)) {
                    score -= 35;
                }
            }
        }
    }

    if (context.focus && context.focus.pos.roomName === pos.roomName) {
        const focusRange = pos.getRangeTo(context.focus);
        if (creep.memory.combatClass === "melee" && focusRange <= 1) {
            score += 25;
        } else if (creep.memory.combatClass === "ranger") {
            if (focusRange <= 3) {
                score += 20;
            }
            if (isCreepTarget(context.focus) &&
                context.focus.getActiveBodyparts(ATTACK) > 0 &&
                context.focus.getActiveBodyparts(RANGED_ATTACK) === 0 && focusRange < 3 &&
                !context.threats.some(hostile =>
                    rangedPower(hostile) > 0 && pos.inRangeTo(hostile, 3))) {
                score -= (3 - focusRange) * 35;
            }
        }
    }
    if (pos.lookFor(LOOK_STRUCTURES).some(structure =>
        structure.structureType === STRUCTURE_RAMPART && structure.my)) {
        score += 25;
    }
    if (creep.room.getTerrain().get(pos.x, pos.y) === TERRAIN_MASK_SWAMP) {
        score -= 10;
    }
    if (pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48) {
        score -= 20;
    }
    return score;
}

function localStep(
    creep: Creep,
    goal: RoomPosition,
    range: number,
    context: CombatContext
): RoomPosition | undefined {
    let best: RoomPosition | undefined;
    let bestScore = -Infinity;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const x = creep.pos.x + dx;
            const y = creep.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) {
                continue;
            }
            const pos = new RoomPosition(x, y, creep.room.name);
            if ((dx !== 0 || dy !== 0) && !walkable(creep, pos)) {
                continue;
            }
            const score = tileScore(creep, pos, goal, range, context) +
                (dx === 0 && dy === 0 ? 1 : 0);
            if (score > bestScore) {
                best = pos;
                bestScore = score;
            }
        }
    }
    return best && !best.isEqualTo(creep.pos) ? best : undefined;
}

export function executeCombatMovement(creep: Creep, plan: CombatPlan, context: CombatContext): void {
    if (creep.fatigue > 0 || creep.spawning) {
        return;
    }
    const roomCallback = (roomName: string): CostMatrix =>
        combatCostMatrix(roomName, context.operation).clone();
    if (plan.flee?.length) {
        const search = PathFinder.search(creep.pos,
            plan.flee.map(pos => ({pos, range: 3})),
            {flee: true, maxRooms: 2, plainCost: 2, swampCost: 10, roomCallback});
        if (search.path.length > 0) {
            const result = creep.moveByPath(search.path);
            if (result !== OK && result !== ERR_TIRED) {
                console.log(`Combat movement failed for ${creep.name}: ${result}`);
            }
            return;
        }
    }
    if (!plan.movement) {
        return;
    }
    const goal = plan.movement;
    const range = plan.movementRange ?? 1;
    const threatened = context.threats.some(hostile => creep.pos.getRangeTo(hostile) <= 4);
    if (creep.pos.roomName === goal.roomName && creep.pos.getRangeTo(goal) <= range &&
        !threatened && context.towers.length === 0) {
        return;
    }
    if (creep.pos.roomName === goal.roomName &&
        (threatened || context.towers.length > 0 || creep.pos.getRangeTo(goal) <= 5)) {
        const step = localStep(creep, goal, range, context);
        if (step) {
            const result = creep.move(creep.pos.getDirectionTo(step));
            if (result !== OK && result !== ERR_TIRED) {
                console.log(`Combat movement failed for ${creep.name}: ${result}`);
            }
            return;
        }
        if (creep.pos.getRangeTo(goal) <= range || threatened ||
            (context.towers.length > 0 && context.operation.state !== "travelling")) {
            return;
        }
    }
    const result = creep.moveTo(goal, {
        range, reusePath: 3, plainCost: 2, swampCost: 10,
        costCallback: roomCallback
    });
    if (result !== OK && result !== ERR_TIRED) {
        console.log(`Combat path failed for ${creep.name}: ${result}`);
    }
}