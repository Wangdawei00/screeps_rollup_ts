interface CreepMemory {
    room: string;
    role: string;
    body: BodyPartConstant[];
    // repairing?: boolean;
    /**Harvester state*/
    harvesting?: boolean;
    /**Builder state*/
    building?: boolean;

    /**Destination flag name(work place)*/
    destFlagName?: string;

    /**Source flag name (Energy source)*/
    srcFlagName?: string;

    /**the maximum hit for the wall*/
    wallMaxHits?: number;

    IdleFlagName?: string;
    // /**Miner and LongDistanceHarvester target source*/
    // sourceId?: Id<Source> | Id<Mineral> | null;
    // /**LongDistanceHarvester and repairer state*/
    // working?: boolean;
    // /**(Advanced) Upgrader state*/
    // upgrading?: boolean;
    /**GarbageCollector and Lorry state*/
    transporting?: boolean;

    // /**temp target for a creep*/
    // storedTargetID?: Id<Structure>;

    /**Whether this creep's memory has been put in the stack*/
    respawnInformed?: boolean;
    // /**Miner and Lorry target container*/
    // containerId?: Id<StructureContainer>;
    // /**Advanced Upgrader target flag*/
    // upgradePosFlagName?: string;
    // /**Reserver and longDistanceHarvester and Army target room name*/
    // target?: string;//room name
    // /**LongDistanceHarvester home room name*/
    // home?: string;//room name
    // /**Mineral Type*/
    // mineralType?: MineralConstant;
    //
    // targetFlagName?: string;
    /**transferer whether to link or from link, true means to link, false means from link*/
    toOrFromLink?: boolean

    /**How many small claimer has been spawned before this one*/
    reserveCnter?: number
}

interface Creep {
    runRole(): void;

    /**Must have a srcFlagName or IdleFlagName*/
    gotoIdleFlag(): void;

    /**Must have an IdleFlagName*/
    pickupGarbage(): void;
}