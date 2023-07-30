interface Room {
    run(sourceContainerFlagNames: string[], sinkContainerFlagNames: string[]): void;
}

interface RoomMemory {
    sourceContainerFlagNames: string[];
    sinkContainerFlagNames: string[];
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerIds: Array<Id<StructureContainer>>;
}