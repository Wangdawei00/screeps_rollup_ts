interface CreepMemory {
    role: string;
    building?: boolean;
    working?: boolean;
    upgrading?: boolean;
    sourceId?: Id<Source>;
    containerId?: Id<StructureContainer>;
    transporting?: boolean;
    upgradePosFlagName?: string;
    target?: string;//room name
    home?: string;//room name
}

interface Creep {
    // prototype: Creep;
    getEnergy(useContainer: boolean, useSource: boolean): void;

    runRole(): void;
}

interface StructureSpawn {
    SpawnCreepsIfNecessary(): void;

    CreateMiner(sourceId: Id<Source>): string | undefined;

    CreateLorry(capacity: number): string;

    CreateCustomCreep(energy: number, roleName: string): string;

    CreateAdvancedUpgrader(flagName: string): string | undefined;

    CreateReserver(flagName: string): string | undefined;

    CreateLongDistanceHarvester(target: string, home: string, energy: number): string | undefined;
}

interface SpawnMemory {
    minCreeps: Record<string, number>
}

interface Memory {
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerIds: Array<Id<StructureContainer>>;
    sourceContainerFlagNames: Array<string>;
    sinkContainerFlagNames: Array<string>;
    lastLongDistanceTargetRoomName:string
}