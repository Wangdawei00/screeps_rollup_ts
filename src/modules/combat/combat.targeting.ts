import {CombatTarget, isCreepTarget} from "./combat.types";

export function shouldEngage(owner: string, type: CombatOperationType): boolean {
    const own = Object.values(Game.spawns)[0]?.owner.username ??
        Object.values(Game.creeps)[0]?.owner.username;
    return owner !== own && (owner !== "Source Keeper" || type === "sourceKeeper");
}

export function hostileCreeps(room: Room, operation: CombatOperationMemory): Creep[] {
    return room.find(FIND_HOSTILE_CREEPS).filter(creep =>
        shouldEngage(creep.owner.username, operation.type));
}

export function hostileTowers(room: Room, operation: CombatOperationMemory): StructureTower[] {
    return room.find(FIND_HOSTILE_STRUCTURES).filter(
        (structure): structure is StructureTower =>
            structure.structureType === STRUCTURE_TOWER &&
            shouldEngage(structure.owner.username, operation.type)
    );
}

function assaultStructures(operation: CombatOperationMemory): Structure[] {
    if (operation.type !== "attack" || !operation.assaultTarget ||
        operation.assaultTarget === "hostileCreep") {
        return [];
    }
    const room = Game.rooms[operation.targetRoom];
    if (!room) {
        return [];
    }
    if (operation.breachTargetId) {
        const breach = Game.getObjectById(operation.breachTargetId);
        if (breach && breach.pos.roomName === room.name &&
            (breach.structureType === STRUCTURE_WALL ||
                breach.structureType === STRUCTURE_RAMPART) &&
            (!("my" in breach) || !breach.my)) {
            return [breach];
        }
        if (operation.assaultTarget === "wall" || operation.assaultTarget === "rampart") {
            return [];
        }
    }
    if (operation.assaultTarget === "controller") {
        return room.controller && !room.controller.my && room.controller.level > 0
            ? [room.controller] : [];
    }

    const structureType = operation.assaultTarget === "tower" ? STRUCTURE_TOWER
        : operation.assaultTarget === "spawn" ? STRUCTURE_SPAWN
            : operation.assaultTarget === "rampart" ? STRUCTURE_RAMPART : STRUCTURE_WALL;
    const flag = operation.targetFlag ? Game.flags[operation.targetFlag] : undefined;
    return room.find(FIND_STRUCTURES).filter(structure =>
        structure.structureType === structureType &&
        (!("my" in structure) || !structure.my) &&
        ((structureType !== STRUCTURE_WALL && structureType !== STRUCTURE_RAMPART) ||
            (flag !== undefined && structure.pos.isEqualTo(flag.pos))));
}

export function hasAssaultTarget(operation: CombatOperationMemory): boolean {
    return assaultStructures(operation).length > 0;
}

function rangeToMembers(target: CombatTarget, members: Creep[]): number {
    const ranges = members.filter(member => member.pos.roomName === target.pos.roomName)
        .map(member => member.pos.getRangeTo(target.pos));
    return ranges.length ? Math.min(...ranges) : 50;
}

function threatScore(hostile: Creep, members: Creep[]): number {
    const range = rangeToMembers(hostile, members);
    const dangerous = hostile.getActiveBodyparts(ATTACK) + hostile.getActiveBodyparts(RANGED_ATTACK);
    return hostile.getActiveBodyparts(HEAL) * 50 +
        hostile.getActiveBodyparts(RANGED_ATTACK) * 35 +
        hostile.getActiveBodyparts(ATTACK) * 30 +
        hostile.getActiveBodyparts(WORK) * 10 -
        range * 5 + (dangerous > 0 && range <= 3 ? 40 : 0);
}

export function selectFocusTarget(
    operation: CombatOperationMemory,
    members: Creep[]
): CombatTarget | undefined {
    const rooms = new Map<string, Room>();
    for (const member of members) {
        rooms.set(member.room.name, member.room);
    }
    const targetRoom = Game.rooms[operation.targetRoom];
    if (targetRoom) {
        rooms.set(targetRoom.name, targetRoom);
    }
    const enemies = Array.from(rooms.values()).flatMap(room => hostileCreeps(room, operation)
        .filter(hostile => !hostile.pos.lookFor(LOOK_STRUCTURES).some(structure =>
            structure.structureType === STRUCTURE_RAMPART && !structure.my)));
    const structures = assaultStructures(operation);
    const candidates: CombatTarget[] = enemies.length > 0 ? enemies : structures;
    const locked = candidates.find(target => target.id === operation.focusTargetId);
    if (locked && Game.time < (operation.focusUntil ?? 0)) {
        return locked;
    }
    const flag = operation.targetFlag ? Game.flags[operation.targetFlag] : undefined;
    const focus = candidates.sort((a, b) => {
        const aScore = isCreepTarget(a) ? threatScore(a, members)
            : -(flag ? flag.pos.getRangeTo(a.pos) : rangeToMembers(a, members));
        const bScore = isCreepTarget(b) ? threatScore(b, members)
            : -(flag ? flag.pos.getRangeTo(b.pos) : rangeToMembers(b, members));
        return bScore - aScore || a.id.localeCompare(b.id);
    })[0];
    if (focus) {
        operation.focusTargetId = focus.id;
        operation.focusUntil = Game.time + 5;
    } else {
        delete operation.focusTargetId;
        delete operation.focusUntil;
    }
    return focus;
}