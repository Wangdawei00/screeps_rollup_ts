interface RoomMemory {
    /**Spawning queue*/
    queue: CreepMemory[];
    /**Link source and target list. First is source link, second is target link*/
    LinkPairs: Id<StructureLink>[][];

    /**Lab list: first two are sources, third is the target*/
    LabList: Id<StructureLab>[][];

    cache_spawn_ids: Id<StructureSpawn>[];

    cache_tower_ids: Id<StructureTower>[];

    cache_lab_ids: Id<StructureLab>[];

    /**The duration of the cache in ticks since last refresh. */
    cache_duration: number;

    /**The maximum duration of the cache in ticks. Default is 100*/
    cache_max_duration: number;
}

interface Room {
    run(): void;
}
