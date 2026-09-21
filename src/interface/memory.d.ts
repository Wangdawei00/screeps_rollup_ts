interface Memory {
    schemaVersion: number;
    colonies: Record<string, ColonyMemory>;
    intel: Record<string, RoomIntelMemory>;
    empire: EmpireMemory;
}

interface CreepMemory {
    role: CreepRole;
    homeRoom: string;
    demandKey: string;
    assignment?: CreepAssignment;
    state?: "pickup" | "deliver" | "working";
    jobId?: string;
}

interface ColonyMemory {
    stage: ColonyStage;
    anchor?: RoomPosition;
    lastRcl?: number;
    sourcePlans: Record<string, SourcePlanMemory>;
    spawnQueue: SpawnRequest[];
    logisticsJobs: Record<string, LogisticsJob>;
    construction: ConstructionMemory;
    defense: DefenseMemory;
}