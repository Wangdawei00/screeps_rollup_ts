const priority: Record<string, number> = {
    carrier: 10,
    miner: 10,
    containerLinkCommunicator: 10,
    storageLinkCommunicator: 10,
    toStorageLorry: 10,
    worker: 6,
    garbageCollector: 5,
    advancedUpgrader: 3,
    linkStorageCommunicator: 2,
    interRoomMiner: 10,
    interRoomWorker:8,

}

export default priority;