interface CreepMemory {
    role: string;
    /**Builder state*/
    building?: boolean;
    /**LongDistanceHarvester and repairer state*/
    working?: boolean;
    /**(Advanced) Upgrader state*/
    upgrading?: boolean;
    /**GarbageCollector and Lorry state*/
    transporting?: boolean;
    /**Miner and LongDistanceHarvester target source*/
    sourceId?: Id<Source>;
    /**Miner target container*/
    containerId?: Id<StructureContainer>;
    /**Advanced Upgrader target flag*/
    upgradePosFlagName?: string;
    /**Reserver and longDistanceHarvester and Army target room name*/
    target?: string;//room name
    /**LongDistanceHarvester home room name*/
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

    CreateLorryOrGarbageCollector(capacity: number, role: string): string;

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

interface Memory {
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerIds: Array<Id<StructureContainer>>;
    sourceContainerFlagNames: Array<string>;
    sinkContainerFlagNames: Array<string>;
    lastLongDistanceTargetRoomName: string
}