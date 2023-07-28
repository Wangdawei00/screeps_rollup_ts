interface CreepMemory {
    role: string;
    building?: boolean;
    working?: boolean;
    upgrading?: boolean;
    sourceId?: Id<Source>;
    containerId?: Id<StructureContainer>;
    transporting?: boolean;
}

interface Creep {
    // prototype: Creep;
    getEnergy(useContainer: boolean, useSource: boolean): void;

    runRole(): void;
}

interface StructureSpawn {
    SpawnCreepsIfNecessary(): void;

    CreateMiner(sourceId: Id<Source>): string;

    CreateLorry(capacity: number): string;

    CreateCustomCreep(energy: number, roleName: string): string;
}

interface SpawnMemory {
    minCreeps: Record<string, number>
}