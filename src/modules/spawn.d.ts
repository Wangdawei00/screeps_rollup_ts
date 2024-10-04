interface StructureSpawn {
    /**
     * First spawn p_harvester (manually)
     * Then Spawn all miners
     * Then spawn builders
     * Then Spawn trucks
     *
     * */
    SpawnCreepsIfNecessary(): void;

    /**
     * Create a miner
     * */
    CreateMiner(destFlagName: string, body: BodyPartConstant[]): string | undefined;

    /**
     * Create a Builder
     * */
    CreateP_Builder(srcFlagName: string): string | undefined;

    /**
     * Create an Upgrader
     * */
    CreateP_Upgrader(srcFlagName:string, destFlagName: string): string | undefined;

    /**
     * Create a p_harvester
     * */
    CreateP_Harvester(srcFlagName: string): string | undefined;

    // /**
    //  * Spawn harvester if necessary
    //  * */
    // SpawnP_HarvesterIfNecessary(): string | undefined
}