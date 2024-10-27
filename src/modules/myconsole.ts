/**truck*/
Game.rooms['W18N48'].memory.queue.push({
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE,
        MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE],
    /*[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE, CARRY, MOVE],*/
    srcFlagName: "StorageTruckOut1",
    room: "W18N48",
})
Game.rooms['W18N48'].memory.queue.splice(0, 0, {
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],/*[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE, CARRY, MOVE],*/
    srcFlagName: "Builder2",
    room: "W19N48",
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], "truck" + Game.time.toString(), {
//     memory:
// })
/**miner*/
Game.rooms['W17N49'].memory.queue.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "mineral3",
    room: "W17N49",
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
Game.rooms['W17N49'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE],
    srcFlagName: "Miner6",
    destFlagName: "StorageIn3",
    room: "W17N49",
})
Game.rooms['W17N49'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,],
    srcFlagName: "mineral3",
    destFlagName: "StorageIn3",
    room: "W17N49",
    mineralType: "Z",
})
Game.rooms['W19N48'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,],
    srcFlagName: "StorageIn4",
    destFlagName: "Upgrader5",
    room: "W19N48",
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE,
//     MOVE, MOVE, MOVE, MOVE], "train" + Game.time.toString(), {
//     memory:
// })
/** builder*/
Game.rooms['W19N48'].memory.queue.push({
    role: "builder",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY,
        MOVE, CARRY, MOVE],
    room: "W19N48",
    srcFlagName: "StorageIn4",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE], "builder" + Game.time.toString(), {
// //     memory:
// })
/**repairer*/
Game.rooms['W18N48'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W18N48",
    IdleFlagName: "Idle7",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE], "repairer" + Game.time.toString(), {
//     memory: {}
// })

/**upgrader*/
Game.rooms['W18N48'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY,],
    room: "W18N48",
    destFlagName: "Upgrader1",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, WORK, WORK, MOVE, WORK, MOVE, WORK, WORK, MOVE], "upgrader" + Game.time.toString(), {
//     memory: {}
// })

/**reserver*/
Game.rooms['W19N48'].memory.queue.push({
    role: "reserver",
    body: [MOVE, CLAIM, MOVE, CLAIM],
    destFlagName: "externalController6",
    room: "W19N48",
})
// Game.spawns['Spawn1'].spawnCreep([MOVE, CLAIM], 'reserver' + Game.time.toString(), {
//     memory: {}
// })
/**Garbage Collector*/
Game.rooms['W18N48'].memory.queue.push({
    role: "garbageCollector",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,],
    IdleFlagName: "Idle9",
    room: "W18N48",
})

/**melee*/


/**transferer*/
Game.rooms['W18N48'].memory.queue.push({
    role: "transferer",
    body: [CARRY, MOVE],
    destFlagName: "TransfererToLink1",
    toOrFromLink:true,
    room: "W18N48",
})

Game.rooms['W19N48'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W19N48",
    IdleFlagName: "Idle11",
})


/**Claimer*/
Game.rooms['W18N48'].memory.queue.push({
    role: "claimer",
    body: [MOVE, CLAIM],
    room: "W18N48",
    destFlagName: "myController1",
})

Game.rooms['W18N48'].memory.queue.push({
    role: "wallRepairer",
    body: [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY,],
    room: "W18N48",
    wallMaxHits: 100000,
    IdleFlagName: "Idle4",
})


Game.rooms['W17N46'].memory.queue.push({
    role: "dismantler",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
    room: "W17N46",
    destFlagName: "Dismantle1"
})

Game.rooms['W17N46'].memory.queue.push({
    role: "melee",
    body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        ATTACK, ATTACK],
    destFlagName: "melee1",
    room: "W17N46",
})

Game.rooms['W17N46'].memory.queue.push({
    role: "healer",
    body: [HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE],
    destFlagName: "healer1",
    room: "W17N46",
})

Game.rooms['W19N48'].memory.queue.push({
    role: "dismantler",
    body: [WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE],
    room: "W19N48",
    destFlagName: "Dismantle",
})
Game.rooms['W19N48'].memory.queue.push({
    role: "interRoomGarbageCollector",
    body: [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,],
    room: "W19N48",
    srcFlagName: "melee1",
    destFlagName: "StorageIn4",
})
Game.rooms['W19N48'].memory.queue.push({
    role: "controllerAttacker",
    body: [CLAIM, MOVE],
    room: "W19N48",
    destFlagName: "Dismantle",
})

Game.rooms['W17N46'].memory.queue.push({
    role: "s2sTrain",
    body: [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,],
    room: "W17N46",
    srcFlagName: "StorageIn1",
    destFlagName: "StorageIn2",
    mineralType: "O",
})