interface Room {
    run(flagNames: Record<string, string[]>, changed: Record<string, boolean>): void;
}

interface RoomMemory {
    sourceContainerFlagNames: string[];
    sourceContainerIds: Array<Id<StructureContainer>>;
    sinkContainerFlagNames: string[];
    sinkContainerIds: Array<Id<StructureContainer>>;
    storageLinkCommunicatorFlagNames: string[];
    linkStorageCommunicatorFlagNames: string[];
    containerLinkCommunicatorFlagNames: string[];
    idleFlagNames: string[];
    linkMining: boolean;
    updateLink: boolean;
    sourceLinks: Array<Id<StructureLink>>;
    sinkLinks: Array<Id<StructureLink>>;
}