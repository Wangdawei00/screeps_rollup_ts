interface Memory {
    schemaVersion: number;
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

interface RoomMemory {
    // stage: ColonyStage;
    spawns: Id<StructureSpawn>[];
    extensions: Id<StructureExtension>[];
    towers: Id<StructureTower>[];
    links: Id<StructureLink>[];
    containers: Id<StructureContainer>[];
    labs: Id<StructureLab>[];
    sources: Id<Source>[];
    constructionSites: Id<ConstructionSite>[];
    creepsByRole: Record<CreepRole, Id<Creep>[]>;
    // anchor?: RoomPosition;
    lastRcl?: number;
    sourcePlans: Record<string, SourcePlanMemory>;
    spawnQueue: SpawnRequest[];
    logisticsJobs: Record<string, LogisticsJob>;
    construction: ConstructionMemory;
    defense: DefenseMemory;
}