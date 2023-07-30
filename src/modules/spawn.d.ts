interface StructureSpawn {
    SpawnCreepsIfNecessary(): void;

    CreateMiner(sourceId: Id<Source>): string | undefined;

    /**
     * Including lorry, transferer, garbageCollector,toStorageLorry, fromStorageLorry
     * */
    CreateTransportWorker(capacity: number, role: string, containerId: Id<StructureContainer> | null, homeRoomName: string): string;

    CreateCustomCreep(energy: number, roleName: string): string;

    CreateAdvancedUpgrader(flagName: string): string | undefined;

    CreateReserverOrControllerAttacker(flagName: string, role: string): string | undefined;

    CreateLongDistanceHarvester(target: string, home: string, energy: number): string | undefined;

    CreateMeleeAttacker(target: string, energy: number): string | undefined;

    CreateRangedAttacker(target: string, energy: number): string | undefined;
}

interface SpawnMemory {
    minCreeps: Record<string, number>
}