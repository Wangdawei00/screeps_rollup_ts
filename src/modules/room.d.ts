interface Room {
    run(sourceContainerFlagNames: string[], sinkContainerFlagNames: string[], idleFlagNames: string[],
        storageLinkCommunicatorFlagNames: string[], linkStorageCommunicatorFlagNames: string[],containerLinkCommunicatorFlagNames:string[]): void;
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
    updateLink:boolean;
    sourceLinks: Array<Id<StructureLink>>;
    sinkLinks: Array<Id<StructureLink>>;
    spawnQueue?: SpawnTask[];
}