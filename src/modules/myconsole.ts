/**truck*/
Game.rooms['W17N46'].memory.queue.push({
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    /*[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE, CARRY, MOVE],*/
    srcFlagName: "NewTruck2",
    room: "W18N48",
})
Game.rooms['W17N46'].memory.queue.splice(0, 0, {
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],/*[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE, CARRY, MOVE],*/
    srcFlagName: "StorageOut3",
    room: "W17N46",
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], "truck" + Game.time.toString(), {
//     memory:
// })
/**miner*/
Game.rooms['W18N48'].memory.queue.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "Miner4",
    room: "W18N48",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE], "miner" + Game.time.toString(), {
//     memory: {
//         role: "miner",
//         body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
//         srcFlagName: "InterRoomMiner1"
//     }
// })
/** train*/
//[CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
//  CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]
Game.rooms['W18N48'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,],/*[CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
        CARRY, CARRY, MOVE],*/
    srcFlagName: "StorageTrainOut1",
    destFlagName: "Upgrader1",
    room: "W18N48",
})
Game.rooms['W18N48'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],/*[CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
        CARRY, CARRY, MOVE],*/
    srcFlagName: "InterRoomTrain6",
    destFlagName: "Upgrader1",
    room: "W18N48",
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE,
//     MOVE, MOVE, MOVE, MOVE], "train" + Game.time.toString(), {
//     memory:
// })
/** builder*/
Game.rooms['W18N48'].memory.queue.push({
    role: "builder",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE,],
    room: "W18N48",
    srcFlagName: "StorageTruckOut2",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE], "builder" + Game.time.toString(), {
// //     memory:
// })
/**repairer*/
Game.rooms['W17N46'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W17N46",
    IdleFlagName: "Idle3",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE], "repairer" + Game.time.toString(), {
//     memory: {}
// })

/**upgrader*/
Game.rooms['W18N48'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY,],
    room: "W18N48",
    destFlagName: "Upgrader1",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, WORK, WORK, MOVE, WORK, MOVE, WORK, WORK, MOVE], "upgrader" + Game.time.toString(), {
//     memory: {}
// })

/**reserver*/
Game.rooms['W18N48'].memory.queue.push({
    role: "reserver",
    body: [MOVE, CLAIM, CLAIM, MOVE],
    destFlagName: "externalController4",
    room: "W18N48",
})
// Game.spawns['Spawn1'].spawnCreep([MOVE, CLAIM], 'reserver' + Game.time.toString(), {
//     memory: {}
// })
/**Garbage Collector*/
Game.rooms['W18N48'].memory.queue.push({
    role: "garbageCollector",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,],
    IdleFlagName: "Idle4",
    room: "W18N48",
})

/**melee*/
Game.rooms['W18N48'].memory.queue.push({
    role: "melee",
    body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK],
    destFlagName: "Idle5",
    room: "W18N48",
})

/**transferer*/
Game.rooms['W17N46'].memory.queue.push({
    role: "transferer",
    body: [CARRY, MOVE],
    destFlagName: "TruckFlag1",
    toOrFromLink: true,
    room: "W17N46",
})

Game.rooms['W18N48'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W18N48",
    IdleFlagName: "Idle6",
})


/**Claimer*/
Game.rooms['W17N46'].memory.queue.push({
    role: "claimer",
    body: [MOVE, CLAIM],
    room: "W17N46",
    destFlagName: "myController1",
})

Game.rooms['W18N48'].memory.queue.push({
    role: "wallRepairer",
    body: [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY,],
    room: "W18N48",
    wallMaxHits: 100000,
    IdleFlagName: "Idle4",
})