interface Room {
    run(sourceContainerFlagNames: string[],sinkContainerFlagNames:string[]): void;
}

interface RoomMemory {
    sourceContainerFlagNames: string[];
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerFlagNames: string[];
    sinkContainerIds: Array<Id<StructureContainer>>;
}