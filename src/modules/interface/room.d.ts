interface RoomMemory {
    /**Spawning queue*/
    queue: CreepMemory[];
    /**Link source and target list. First is source link, second is target link*/
    LinkPairs: Id<StructureLink>[][];
}

interface Room {
    run(): void;


}
