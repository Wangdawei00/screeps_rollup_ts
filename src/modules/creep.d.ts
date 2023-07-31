interface CreepMemory {
    role: string;
    repairing?: boolean;
    /**Harvester state*/
    harvesting?: boolean;
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
    /**Miner and Lorry target container*/
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

    MoveToTargetRoom(): void;

    MoveToHomeRoom(): void;

    WithdrawFromContainerOrStorage(): void;

    WithdrawFromContainer(): void;

    WithdrawFromStorage(): void;
}