/**truck*/
Game.rooms['W49N41'].memory.queue.push({
    role: "truck",
    body:
        [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    srcFlagName: "Storage4",
    room: "W49N41",
});
Game.rooms['W46N41'].memory.queue.push({
    role: "truck",
    body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    /*[CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, MOVE, CARRY, MOVE],*/
    srcFlagName: "Source7",
    room: "W46N41",
});
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
Game.rooms['W46N43'].memory.queue.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "Source6",
    room: "W46N41",
});


Game.rooms['W46N41'].memory.queue.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE],
    srcFlagName: "Source6",
    room: "W46N41",
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
Game.rooms["W47N44"].memory.queue.push({
    role: "train",
    body: [CARRY, MOVE,],
    srcFlagName: "Source1",
    destFlagName: "Storage1",
    room: "W47N44",
});
Game.rooms["W46N43"].memory.queue.push({
    role: "train",
    body: Array(3).fill([CARRY,CARRY,MOVE]).flat(),
    srcFlagName: "Source7",
    destFlagName: "Storage3",
    room: "W46N41",
});
Game.rooms["W47N44"].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    srcFlagName: "Storage1",
    destFlagName: "Upgrade Container1",
    room: "W47N44",
});
Game.rooms["W46N43"].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE],
    srcFlagName: "Storage2",
    destFlagName: "Upgrade Container1",
    room: "W46N43",
});
Game.rooms["W49N41"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, CARRY,
         MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W49N41",
    destFlagName: "Upgrade Container3",
    respawnInformed: true,
});
Game.rooms["W49N41"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W49N41",
    destFlagName: "Upgrade11",
});
Game.rooms["W46N41"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W46N41",
    destFlagName: "Upgrade6",
});
Game.rooms["W49N41"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE,],
    room: "W49N41",
    destFlagName: "Upgrade10",
});
Game.rooms["W47N44"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade13",
});
Game.rooms["W47N44"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade1",
});
Game.rooms["W46N43"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W46N43",
    destFlagName: "Upgrade3",
});
Game.rooms["W46N43"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
    room: "W46N43",
    destFlagName: "Upgrade8",
});
Game.rooms["W49N41"].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    room: "W49N41",
    destFlagName: "Upgrade11",
});
Game.rooms['W47N44'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY,
        CARRY, MOVE, CARRY, CARRY, MOVE,],
    srcFlagName: "Source12",
    destFlagName: "Source10",
    room: "W47N44",
})
Game.rooms['W49N41'].memory.queue.push({
    role: "train",
    body: [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,],
    srcFlagName: "Source8",
    destFlagName: "Storage4",
    room: "W49N41",
})
// Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE,
//     MOVE, MOVE, MOVE, MOVE], "train" + Game.time.toString(), {
//     memory:
// })
/** builder*/
Game.rooms['W49N41'].memory.queue.push({
    role: "builder",
    body: Array(2).fill([WORK, CARRY, MOVE]).flat(),
    room: "W49N41",
    srcFlagName: "Source14",
});
Game.rooms['W49N41'].memory.queue.push({
    role: "builder",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE,],
    room: "W49N41",
    srcFlagName: "Storage4",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE], "builder" + Game.time.toString(), {
// //     memory:
// })
/**repairer*/
Game.rooms['W49N44'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE],
    room: "W49N44",
    IdleFlagName: "Idle8",
})
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, WORK, CARRY, MOVE], "repairer" + Game.time.toString(), {
//     memory: {}
// })

/**upgrader*/
Game.rooms['W49N41'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, CARRY, MOVE],
    room: "W49N41",
    destFlagName: "Upgrade2",
});
Game.rooms['W46N41'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    room: "W46N41",
    destFlagName: "Upgrade3",
});
Game.rooms['W46N43'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    room: "W46N43",
    destFlagName: "Upgrade7",
});
Game.rooms['W47N44'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade2",
});
Game.rooms['W47N44'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, CARRY, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade6",
});
Game.rooms['W47N44'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, CARRY, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade8",
});
Game.rooms['W47N44'].memory.queue.push({
    role: "upgrader",
    body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
    room: "W47N44",
    destFlagName: "Upgrade9",
});
// Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, WORK, WORK, MOVE, WORK, MOVE, WORK, WORK, MOVE], "upgrader" + Game.time.toString(), {
//     memory: {}
// })

/**reserver*/
Game.rooms['W49N41'].memory.queue.push({
    role: "reserver",
    body: [MOVE, CLAIM, MOVE, CLAIM],
    destFlagName: "reserveTarget4",
    room: "W49N41",
});
Game.rooms['W49N41'].memory.queue.push({
    role: "miner",
    body: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE],
    srcFlagName: "Source14",
    room: "W49N41",
});

Game.rooms['W47N44'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W47N44",
    IdleFlagName: "Idle5",
});
// Game.spawns['Spawn1'].spawnCreep([MOVE, CLAIM], 'reserver' + Game.time.toString(), {
//     memory: {}
// })
/**Garbage Collector*/
Game.rooms['W49N41'].memory.queue.push({
    role: "garbageCollector",
    body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,],
    IdleFlagName: "Idle3",
    room: "W49N41",
})

/**melee*/


/**transferer*/
Game.rooms['W47N44'].memory.queue.push({
    role: "transferer",
    body: [CARRY, MOVE],
    destFlagName: "transferrer3",
    toOrFromLink: true,
    room: "W47N44",
})


/**Claimer*/
Game.rooms['W49N41'].memory.queue.push({
    role: "claimer",
    body: [MOVE, CLAIM],
    room: "W49N41",
    destFlagName: "target",
})

Game.rooms['W18N48'].memory.queue.push({
    role: "wallRepairer",
    body: [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY,],
    room: "W18N48",
    wallMaxHits: 100000,
    IdleFlagName: "Idle4",
})


Game.rooms['W49N41'].memory.queue.push({
    role: "dismantler",
    body: [WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE, WORK, MOVE,],
    room: "W49N41",
    destFlagName: "dismantle",
})

Game.rooms['W46N43'].memory.queue.splice(0, 0, {
    role: "melee",
    body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,],
    destFlagName: "melee1",
    room: "W46N43",
})

Game.rooms['W46N43'].memory.queue.push({
    role: "healer",
    body: [HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    destFlagName: "healer1",
    room: "W46N43",
})

Game.rooms['W19N48'].memory.queue.push({
    role: "dismantler",
    body: [WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE],
    room: "W19N48",
    destFlagName: "Dismantle",
})
Game.rooms['W49N41'].memory.queue.push({
    role: "interRoomGarbageCollector",
    body: [CARRY, MOVE, CARRY, MOVE,],
    room: "W49N41",
    srcFlagName: "dismantle",
    destFlagName: "Storage4",
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

for (const name in Memory.creeps) {
    if ((Memory.creeps[name].role === "train" || Memory.creeps[name].role === "upgrader") && (Memory.creeps[name].room === "W46N41")) {
        Memory.creeps[name].respawnInformed = true
    }
}

// Game.rooms['W47N44'].memory.LinkPairs.push([
//     "6aa4c61f52f200e3d33ddce4",
//     "6aa4c070a5f17931fdbc0134",
// ])