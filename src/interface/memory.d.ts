interface Memory {
    schemaVersion: number;
    lastJobID: number;
    lastSpawnRequestID: number;
    intel: Record<string, RoomIntelMemory>;
    empire: EmpireMemory;
}

interface CreepMemory {
    role: CreepRole;
    homeRoom: string;
    demandKey: string;
    assignment?: CreepAssignment;
    state?: "pickup" | "deliver" | "working";
    jobId?: number;
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
    spawnQueue: SpawnRequestMemory[];
    logisticsJobs: Record<string, LogisticsJobMemory>;
    workJobs: Record<string, WorkJobMemory>;
    construction: ConstructionMemory;
    defense: DefenseMemory;
}

interface JobBaseMemory {
    priority: number;

}

interface LogisticsJobMemory {

}

interface WorkJobMemory {
    type: "build" | "repair"
}

interface SpawnRequestMemory {

}