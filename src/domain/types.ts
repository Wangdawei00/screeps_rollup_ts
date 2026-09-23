type CreepRole =
    | "harvester"
    | "miner"
    | "transporter"
    | "worker"
    | "upgrader"
    | "reserver"
    | "defender";

type ColonyStage =
    "bootstrap"
    | "developing"
    | "stable"
    | "recovering"
    | "underAttack"

type RemoteStage =
    "unknown"
    | "scouting"
    | "candidate"
    | "reserving"
    | "underAttack"
    | "suspended"

type ExpansionStage =
    "idle"
    | "scouting"
    | "selected"
    | "claiming"
    | "lowLevel"
    | "bootstrapping"
    | "complete"


type SerializedPosition = {
    x: number;
    y: number;
    roomName: string;
}

interface SpawnRequest extends CreepDemand {
    createdAt: number;
    attempts: number;
}

type CreepAssignment =
    | {
    type: "source";
    sourceId: Id<Source>;
    containerId?: Id<StructureContainer>;
    workPosition: SerializedPosition;
}
    | {
    type: "logistics";
    jobId?: string;
}
    | {
    type: "controller";
    controllerId: Id<StructureController>;
    energySourceId?: Id<AnyStoreStructure>;
}
    | {
    type: "remote";
    targetRoom: string;
}
    | {
    type: "defense";
    targetRoom: string;
};

type CreepDemand = {
    key: string
    role: CreepRole;
    homeRoom: string;
    priority: number;
    body: BodyPartConstant[];
    travelEstimate: number;
}

type LogisticsEndpoint = {
    type: STRUCTURE_EXTENSION
    | STRUCTURE_SPAWN
    | STRUCTURE_LINK
    | STRUCTURE_STORAGE
    | STRUCTURE_TOWER
    | STRUCTURE_LAB
    | STRUCTURE_TERMINAL
    | STRUCTURE_CONTAINER
    | STRUCTURE_NUKER
    | STRUCTURE_FACTORY | "no_container"
    location: SerializedPosition;

}

type LogisticsJob = {

}
