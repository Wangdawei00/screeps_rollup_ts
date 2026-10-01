export type CombatTarget = Creep | Structure;

export interface CombatPlan {
    action?: () => ScreepsReturnCode;
    movement?: RoomPosition;
    movementRange?: number;
    flee?: RoomPosition[];
}

export interface CombatContext {
    operation: CombatOperationMemory;
    members: Creep[];
    hostiles: Creep[];
    threats: Creep[];
    towers: StructureTower[];
    rally: RoomPosition;
    objective: RoomPosition;
    focus?: CombatTarget;
    partner?: Creep;
    leader?: Creep;
}

export function isCreepTarget(target: CombatTarget): target is Creep {
    return "body" in target;
}

export function isControllerTarget(target: CombatTarget): target is StructureController {
    return !isCreepTarget(target) && target.structureType === STRUCTURE_CONTROLLER;
}