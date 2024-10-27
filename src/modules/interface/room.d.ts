interface RoomMemory {
    /**Spawning queue*/
    queue: CreepMemory[];
    /**Link source and target list. First is source link, second is target link*/
    LinkPairs: Id<StructureLink>[][];

    /**Lab list: first two are sources, third is the target*/
    LabList: Id<StructureLab>[][];
}

interface Room {
    run(): void;


}
