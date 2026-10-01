type CombatOperationType =
    | "defend"
    | "attack"
    | "harass"
    | "sourceKeeper";

type CombatOperationState =
    | "forming"
    | "travelling"
    | "engaging"
    | "retreating"
    | "complete";

type CombatClass = "melee" | "ranger" | "healer";

type AssaultTarget =
    | "hostileCreep"
    | "tower"
    | "spawn"
    | "rampart"
    | "wall"
    | "controller";

interface CombatOperationMemory {
    type: CombatOperationType;
    state: CombatOperationState;

    homeRoom: string;
    targetRoom: string;
    rallyFlag: string;

    targetFlag?: string;
    focusTargetId?: Id<Creep | Structure>;
    focusUntil?: number;
    assaultTarget?: AssaultTarget;
    breachTargetId?: Id<Structure>;
    noTargetSince?: number;

    retreatHitsRatio: number;
    required: {
        melee: number;
        ranger: number;
        healer: number;
    };
}

interface Memory {
    combatOperations: Record<string, CombatOperationMemory>;
}