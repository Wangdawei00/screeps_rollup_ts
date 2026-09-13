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

interface CombatOperationMemory {
    type: CombatOperationType;
    state: CombatOperationState;

    homeRoom: string;
    targetRoom: string;
    rallyFlag: string;

    targetFlag?: string;
    focusTargetId?: Id<Creep | Structure>;

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