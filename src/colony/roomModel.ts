interface RoomModel {
    room: Room;
    name: string;
    // stage: ColonyStage;
    controller: StructureController;
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    towers: StructureTower[];
    links: StructureLink[];
    containers: StructureContainer[];
    labs: StructureLab[];
    sources: Source[];
    constructionSites: ConstructionSite[];
    hostiles: Creep[];
    // creepsByRole: Map<CreepRole, Creep[]>;
    energyAvailable: number;
    energyCapacity: number;
    storageEnergy: number;
}