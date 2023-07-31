interface StructureSpawn {
    SpawnCreepsIfNecessary(): void;

    CreateMiner(sourceId: Id<Source>): string | undefined;

    /**
     * Including lorry, transferer, garbageCollector,toStorageLorry, fromStorageLorry
     * */
    CreateTransportWorker(capacity: number, role: string, containerId: Id<StructureContainer> | null, homeRoomName: string): string;

    CreateCustomCreep(energy: number, roleName: string): string;

    CreateAdvancedUpgrader(flagName: string): string | undefined;

    CreateInterRoomMiner(sourceId: Id<Source>, containerId: Id<StructureContainer>, target: string): string | undefined;

    CreateInterRoomLorry(containerId: Id<StructureContainer>, target: string, home: string): string | undefined;

    CreateReserverOrControllerAttacker(flagName: string, role: string): string | undefined;

    CreateLongDistanceWorker(target: string, home: string, energy: number, role: string): string | undefined;

    CreateMeleeAttacker(target: string, energy: number): string | undefined;

    CreateRangedAttacker(target: string, energy: number): string | undefined;
}

interface SpawnMemory {
    minCreeps: Record<string, number>
}