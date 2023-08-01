interface Room {
    run(sourceContainerFlagNames: string[]): void;
}

interface RoomMemory {
    sourceContainerFlagNames: string[];
    sourceContainerIds: Array<Id<StructureContainer>>;
}