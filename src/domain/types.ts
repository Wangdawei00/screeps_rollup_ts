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

interface SpawnRequest extends CreepDemand {
    createdAt: number;
    attempts: number;
}

type CreepAssignment =
    | {
    type: "source";
    sourceId: Id<Source>;
    containerId?: Id<StructureContainer>;
    workPosition: RoomPosition;
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