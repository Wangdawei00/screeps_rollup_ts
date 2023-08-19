const priority: Record<string, number> = {
    transferer: 10,
    miner: 10,
    containerLinkCommunicator: 10,
    storageLinkCommunicator: 10,
    toStorageLorry: 10,
    builder: 4,
    garbageCollector: 8,
    repairer: 5,
    advancedUpgrader: 3,
    fromStorageLorry: 2,
}

export default priority;