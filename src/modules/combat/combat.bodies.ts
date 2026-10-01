export function buildCombatBody(
    combatClass: CombatClass,
    energyBudget: number,
    assaultTarget?: AssaultTarget
): BodyPartConstant[] {
    const pattern: BodyPartConstant[] = combatClass === "healer"
        ? [HEAL, MOVE]
        : combatClass === "ranger"
            ? [RANGED_ATTACK, MOVE]
            : assaultTarget === "controller"
                ? [CLAIM, MOVE]
                : [TOUGH, ATTACK, MOVE, MOVE];
    const patternCost = pattern.reduce((cost, part) => cost + BODYPART_COST[part], 0);
    const parts: BodyPartConstant[] = [];
    while (parts.length + pattern.length <= MAX_CREEP_SIZE &&
        (parts.length / pattern.length + 1) * patternCost <= energyBudget) {
        parts.push(...pattern);
    }
    if (combatClass === "melee" && assaultTarget !== "controller" && parts.length === 0 &&
        energyBudget >= BODYPART_COST[ATTACK] + BODYPART_COST[MOVE]) {
        return [ATTACK, MOVE];
    }
    if (combatClass !== "melee" || assaultTarget === "controller") {
        return parts;
    }

    const tough = parts.filter(part => part === TOUGH);
    const attack = parts.filter(part => part === ATTACK);
    const move = parts.filter(part => part === MOVE);
    return [...tough, ...attack, ...move];
}