interface Memory {
    /**Flag name to Creep name*/
    minerFlagIndex: Record<string, string>
    /**Flag name to Creep name*/
    builderFlagIndex: Record<string, string>

    /**Flag name to Creep name*/
    upgraderFlagIndex: Record<string, string>

    /**Flag name to Harvester name*/
    harvesterFlagIndex: Record<string, string>

    stack: CreepMemory[];

}