export const CREEP_ROLES = [
    "harvester", "miner", "transporter", "worker", "upgrader", "reserver", "defender", "scout", "claimer", "mineralMiner"
] as const;
export type CreepRole = typeof CREEP_ROLES[number];
export type ColonyStage = "bootstrap" | "developing" | "stable" | "recovering" | "underAttack";
export type RemoteStage = "unknown" | "scouting" | "candidate" | "reserving" | "mining" | "suspended";
export type ExpansionStage = "idle" | "scouting" | "selected" | "claiming" | "spawnSite" | "bootstrapping" | "complete";

export interface SerializedPosition {
    x: number;
    y: number;
    roomName: string;
}

export type CreepAssignment =
    | { type: "source"; sourceId: Id<Source>; containerId?: Id<StructureContainer>; workPosition: SerializedPosition }
    | {
    type: "mineral";
    mineralId: Id<Mineral>;
    containerId?: Id<StructureContainer>;
    workPosition: SerializedPosition
}
    | { type: "logistics"; jobId?: string; targetRoom?: string }
    | { type: "controller"; controllerId: Id<StructureController>; energySourceId?: Id<AnyStoreStructure> }
    | { type: "remote"; targetRoom: string }
    | { type: "defense"; targetRoom: string };

export interface CreepDemand {
    key: string;
    role: CreepRole;
    homeRoom: string;
    priority: number;
    body: BodyPartConstant[];
    assignment?: CreepAssignment;
    travelEstimate?: number;
}

export interface SpawnRequest extends CreepDemand {
    createdAt: number;
    attempts: number;
    lastError?: number;
}

export type LogisticsStore = AnyStoreStructure | Tombstone | Ruin;
export type LogisticsEndpoint =
    | { type: "store"; id: Id<LogisticsStore>; position: SerializedPosition }
    | { type: "drop"; id: Id<Resource>; position: SerializedPosition };

export interface LogisticsJob {
    id: string;
    roomName: string;
    resource: ResourceConstant;
    amount: number;
    pickup: LogisticsEndpoint;
    delivery: { type: "store"; id: Id<AnyStoreStructure>; position: SerializedPosition };
    priority: number;
    createdAt: number;
    lastSeenAt: number;
    expiresAt: number;
    lease?: { creepName: string; leaseUntil: number };
}

export type WorkJob =
    | { id: string; type: "build"; targetId: Id<ConstructionSite>; priority: number }
    | { id: string; type: "repair"; targetId: Id<Structure>; targetHits: number; priority: number };

export interface SourcePlan {
    sourceId: Id<Source>;
    workPosition: SerializedPosition;
    containerPosition: SerializedPosition;
    containerId?: Id<StructureContainer>;
    linkId?: Id<StructureLink>;
    path: SerializedPosition[];
    pathLength: number;
    expectedIncome: number;
    carryRequirement: number;
    revision: number;
    accessible: boolean;
    reason?: string;
}

export interface PlannedStructure {
    position: SerializedPosition;
    structureType: BuildableStructureConstant;
    minimumRcl: number;
    priority: number;
}

export interface ThreatAssessment {
    attack: number;
    ranged: number;
    heal: number;
    dismantle: number;
    toughness: number;
    total: number;
    targetPriority: Id<Creep>[];
}

export interface DefensePlan {
    threat: ThreatAssessment;
    attackTarget?: Id<Creep>;
    healTarget?: Id<Creep>;
    repairTarget?: Id<Structure>;
    activateSafeMode: boolean;
    defenderDemands: CreepDemand[];
}

export interface StructurePlan {
    links: { from: Id<StructureLink>; to: Id<StructureLink>; amount: number }[];
    towers: { towerId: Id<StructureTower>; action: "attack" | "heal" | "repair"; targetId: Id<Creep | Structure> }[];
    reactions: { output: Id<StructureLab>; inputA: Id<StructureLab>; inputB: Id<StructureLab> }[];
    factories: { factoryId: Id<StructureFactory>; resource: CommodityConstant }[];
    observations: { observerId: Id<StructureObserver>; roomName: string }[];
}

export interface TerminalGoal {
    roomName: string;
    resource: ResourceConstant;
    amount: number;
}

export interface ProductionGoal {
    compound?: MineralCompoundConstant;
    factoryResource?: CommodityConstant;
}

export interface RemoteRecord {
    stage: RemoteStage;
    changedAt: number;
    score: number;
    suspendedUntil?: number;
    reason?: string;
    sourcePlans: Record<string, SourcePlan>;
    losses: number;
    knownCreeps: string[];
}

export type ProcessPriority = "critical" | "normal" | "low";

export interface ScheduledProcess {
    name: string;
    priority: ProcessPriority;
    interval: number;
    condition?: () => boolean;
    run: () => void;
}

export function serializePosition(position: SerializedPosition): SerializedPosition {
    return {x: position.x, y: position.y, roomName: position.roomName};
}

export function isCreepRole(value: unknown): value is CreepRole {
    return typeof value === "string" && CREEP_ROLES.some(role => role === value);
}

export function isPosition(value: unknown): value is SerializedPosition {
    if (!value || typeof value !== "object") return false;
    const position = value as Partial<SerializedPosition>;
    return Number.isInteger(position.x) && Number.isInteger(position.y) &&
        position.x! >= 0 && position.x! <= 49 && position.y! >= 0 && position.y! <= 49 &&
        typeof position.roomName === "string" && position.roomName.length > 0;
}

export function isAssignment(value: unknown): value is CreepAssignment {
    if (!value || typeof value !== "object") return false;
    const assignment = value as Record<string, unknown>;
    const id = (v: unknown): boolean => typeof v === "string" && v.length > 0;
    switch (assignment.type) {
        case "source":
            return id(assignment.sourceId) && isPosition(assignment.workPosition) &&
                (assignment.containerId === undefined || id(assignment.containerId));
        case "mineral":
            return id(assignment.mineralId) && isPosition(assignment.workPosition) &&
                (assignment.containerId === undefined || id(assignment.containerId));
        case "logistics":
            return (assignment.jobId === undefined || id(assignment.jobId)) &&
                (assignment.targetRoom === undefined || id(assignment.targetRoom));
        case "controller":
            return id(assignment.controllerId) &&
                (assignment.energySourceId === undefined || id(assignment.energySourceId));
        case "remote":
        case "defense":
            return id(assignment.targetRoom);
        default:
            return false;
    }
}

export function assignmentMatchesRole(role: CreepRole, assignment?: CreepAssignment): boolean {
    switch (role) {
        case "miner":
            return assignment?.type === "source";
        case "mineralMiner":
            return assignment?.type === "mineral";
        case "transporter":
            return assignment?.type === "logistics";
        case "upgrader":
            return assignment?.type === "controller";
        case "reserver":
        case "scout":
        case "claimer":
            return assignment?.type === "remote";
        case "defender":
            return assignment?.type === "defense";
        case "harvester":
            return !assignment || assignment.type === "source" || assignment.type === "remote";
        case "worker":
            return !assignment || assignment.type === "controller" || assignment.type === "remote";
    }
}

export function hasRoleParts(role: CreepRole, hasPart: (part: BodyPartConstant) => boolean): boolean {
    if (!hasPart("move")) return false;
    switch (role) {
        case "scout":
            return true;
        case "claimer":
        case "reserver":
            return hasPart("claim");
        case "defender":
            return hasPart("attack") || hasPart("ranged_attack");
        case "transporter":
            return hasPart("carry");
        default:
            return hasPart("work") && hasPart("carry");
    }
}
