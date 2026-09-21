type CreepRole =
    | "harvester"
    | "miner"
    | "transporter"
    | "worker"
    | "upgrader"
    | "reserver"
    | "defender";

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