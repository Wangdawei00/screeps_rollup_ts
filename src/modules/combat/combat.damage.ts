function partPower(creep: Creep, type: BodyPartConstant, action: string, base: number): number {
    const boosts: Record<string, Record<string, Record<string, number>>> = BOOSTS;
    return creep.body.reduce((power, part) => {
        if (part.type !== type || part.hits <= 0) {
            return power;
        }
        const multiplier = part.boost ? boosts[type][String(part.boost)]?.[action] ?? 1 : 1;
        return power + base * multiplier;
    }, 0);
}

export function attackPower(creep: Creep): number {
    return partPower(creep, ATTACK, "attack", ATTACK_POWER);
}

export function rangedPower(creep: Creep): number {
    return partPower(creep, RANGED_ATTACK, "rangedAttack", RANGED_ATTACK_POWER);
}

export function massAttackPower(creep: Creep, range: number): number {
    const falloff = range === 1 ? 1 : range === 2 ? 0.4 : range === 3 ? 0.1 : 0;
    return partPower(creep, RANGED_ATTACK, "rangedMassAttack", RANGED_ATTACK_POWER) * falloff;
}

export function healPower(creep: Creep, ranged = false): number {
    return ranged
        ? partPower(creep, HEAL, "rangedHeal", RANGED_HEAL_POWER)
        : partPower(creep, HEAL, "heal", HEAL_POWER);
}

export function towerDamageAtRange(range: number): number {
    const falloff = Math.max(0, Math.min(1,
        (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE)));
    return TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * falloff);
}

export function towerDamage(tower: StructureTower, pos: RoomPosition): number {
    if (tower.pos.roomName !== pos.roomName ||
        tower.store.getUsedCapacity(RESOURCE_ENERGY) < TOWER_ENERGY_COST) {
        return 0;
    }
    return towerDamageAtRange(tower.pos.getRangeTo(pos));
}

export function incomingDamage(
    pos: RoomPosition,
    hostiles: Creep[],
    towers: StructureTower[]
): number {
    const creepDamage = hostiles.reduce((total, hostile) => {
        if (hostile.pos.roomName !== pos.roomName) {
            return total;
        }
        const range = hostile.pos.getRangeTo(pos);
        return total + (range <= 1 ? attackPower(hostile) : 0) +
            (range <= 3 ? rangedPower(hostile) : 0);
    }, 0);
    const damage = creepDamage +
        towers.reduce((total, tower) => total + towerDamage(tower, pos), 0);
    const rampart = Game.rooms[pos.roomName] && pos.lookFor(LOOK_STRUCTURES).find(
        (structure): structure is StructureRampart =>
            structure.structureType === STRUCTURE_RAMPART && structure.my);
    return rampart && rampart.hits >= damage * 2 ? 0 : damage;
}

export function effectiveIncomingDamage(creep: Creep, damage: number): number {
    const firstPart = creep.body.find(part => part.hits > 0);
    if (firstPart?.type === TOUGH && firstPart.boost) {
        return damage * (BOOSTS[TOUGH][firstPart.boost]?.damage ?? 1);
    }
    return damage;
}