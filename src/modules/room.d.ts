interface Room {
    run(sourceContainerFlagNames: string[], sinkContainerFlagNames: string[], idleFlagNames: string[]): void;
}

interface RoomMemory {
    sourceContainerFlagNames: string[];
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerFlagNames: string[];
    sinkContainerIds: Array<Id<StructureContainer>>;
    idleFlagName: string;
}