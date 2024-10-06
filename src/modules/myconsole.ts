/**truck*/
Memory.stack.push({
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "TruckFlag1"
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], "truck" + Game.time.toString(), {
//     memory:
// })
/**miner*/
Memory.stack.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "InterRoomMiner1"
})
// Game.spawns['Spawn1'].spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE], "miner" + Game.time.toString(), {
//     memory: {
//         role: "miner",
//         body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
//         srcFlagName: "InterRoomMiner1"
//     }
// })
/** train*/
Memory.stack.push({
    role: "train",
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
        CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "StorageOut1",
    destFlagName: "P_UpgraderDest2"
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE,
//     MOVE, MOVE, MOVE, MOVE], "train" + Game.time.toString(), {
//     memory:
// })
/** builder*/
Memory.stack.push({
    role: "builder",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    srcFlagName: "BuilderPos1"
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE], "builder" + Game.time.toString(), {
// //     memory:
// })
/**repairer*/
Memory.stack.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE]
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE], "repairer" + Game.time.toString(), {
//     memory: {}
// })

/**upgrader*/
Memory.stack.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY],
    destFlagName: "P_UpgraderDest1"
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, WORK, WORK, MOVE, WORK, MOVE, WORK, WORK, MOVE], "upgrader" + Game.time.toString(), {
//     memory: {}
// })

/**reserver*/
Memory.stack.push({
    role: "reserver",
    body: [MOVE, CLAIM],
    destFlagName: "externalController1",
})
// Game.spawns['Spawn1'].spawnCreep([MOVE, CLAIM], 'reserver' + Game.time.toString(), {
//     memory: {}
// })
