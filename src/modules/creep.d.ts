interface CreepMemory {
    role: string;
    // repairing?: boolean;
    /**Harvester state*/
    harvesting?: boolean;
    /**Builder state*/
    building?: boolean;

    /**Destination flag name(work place)*/
    destFlagName?: string;

    /**Source flag name (Energy source)*/
    srcFlagName?: string;
    /**Miner and LongDistanceHarvester target source*/
    sourceId?: Id<Source> | Id<Mineral> | null;
    // /**LongDistanceHarvester and repairer state*/
    // working?: boolean;
    // /**(Advanced) Upgrader state*/
    // upgrading?: boolean;
    /**GarbageCollector and Lorry state*/
    transporting?: boolean;
    longDistTransporting?: boolean

    /**temp target for a creep*/
    storedTargetID?: Id<Structure>;

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
}

interface Creep {
    runRole(): void;
}