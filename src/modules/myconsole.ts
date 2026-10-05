/**truck*/
Game.rooms['W44N42'].memory.queue.splice(0, 0, {
    role: "truck",
    body: Array(7).fill([CARRY, CARRY, MOVE]).flat().concat([]),
    srcFlagName: "Storage8",
    room: "W44N42",
});

/**miner*/
Game.rooms['W49N45'].memory.queue.push({
    role: "miner",
    body: Array(3).fill(MOVE).concat(Array(5).fill(WORK).flat()),
    srcFlagName: "Source31",
    room: "W49N45",
});
Game.rooms['W49N45'].memory.queue.push({
    role: "miner",
    body: Array(3).fill(MOVE).concat(Array(5).fill(WORK).flat()),
    srcFlagName: "Source32",
    room: "W49N45",
});
Game.rooms['W49N45'].memory.queue.push({
    role: "train",
    body: Array(2).fill([CARRY, CARRY, MOVE]).flat().concat([CARRY, MOVE]),
    srcFlagName: "Source32",
    destFlagName: "Storage7",
    room: "W49N45",
});
Game.rooms['W49N45'].memory.queue.push({
    role: "train",
    body: Array(8).fill([CARRY, CARRY, MOVE]).flat().concat([CARRY, MOVE]),
    srcFlagName: "Source31",
    destFlagName: "Storage7",
    room: "W49N45",
});
Game.rooms['W46N41'].memory.queue.push({
    role: "upgrader",
    body: Array(4).fill(MOVE).concat(Array(6).fill(CARRY)).concat(Array(22).fill(WORK)),
    room: "W46N41",
    destFlagName: "Upgrade5",
});

Game.rooms['W44N42'].memory.queue.push({
    role: "train",
    body: Array(3).fill([CARRY, CARRY, MOVE]).flat().concat([]),
    srcFlagName: "Source29",
    destFlagName: "Storage8",
    room: "W44N42",
});


Game.rooms['W44N42'].memory.queue.push({
    role: "train",
    body: Array(2).fill([CARRY, CARRY, MOVE]).flat().concat([]),
    srcFlagName: "Storage8",
    destFlagName: "Upgrade Container6",
    room: "W44N42",
});

Game.rooms['W49N44'].memory.queue.push({
    role: "builder",
    body: Array(8).fill([WORK, CARRY, MOVE]).flat(),
    room: "W49N44",
    srcFlagName: "Source32",
});
/** builder*/
Game.rooms['W49N44'].memory.queue.push({
    role: "builder",
    body: Array(8).fill([WORK, CARRY, MOVE]).flat(),
    room: "W49N44",
    srcFlagName: "Source31",
});
/**repairer*/
Game.rooms['W44N42'].memory.queue.push({
    role: "repairer",
    body: Array(2).fill([WORK, CARRY, MOVE]).flat().concat([]),
    room: "W44N42",
})

Game.rooms['W49N44'].memory.queue.push({
    role: "upgrader",
    body: Array(36).fill([WORK]).flat().concat(Array(6).fill(CARRY).flat()).concat(Array(8).fill(MOVE).flat()),
    room: "W49N44",
    destFlagName: "Upgrade Container3",
});

/**reserver*/
Game.rooms['W44N42'].memory.queue.push({
    role: "reserver",
    body: [MOVE, CLAIM, MOVE, CLAIM],
    destFlagName: "reserveTarget15",
    room: "W44N42",
});
Game.rooms['W44N42'].memory.queue.push({
    role: "miner",
    body: Array(5).fill(MOVE).concat(Array(5).fill(WORK)),
    srcFlagName: "Source34",
    room: "W44N42",
});

Game.rooms['W44N42'].memory.queue.push({
    role: "builder",
    body: Array(3).fill([WORK, CARRY, MOVE]).flat(),
    room: "W44N42",
    srcFlagName: "Source34",
});

Game.rooms['W44N42'].memory.queue.push({
    role: "builder",
    body: Array(3).fill([WORK, CARRY, MOVE]).flat(),
    room: "W44N42",
    srcFlagName: "Source30",
});


Game.rooms['W47N44'].memory.queue.push({
    role: "repairer",
    body: Array(4).fill([WORK, CARRY, MOVE]).flat(),
    room: "W47N44",
});

/**Garbage Collector*/
Game.rooms['W49N45'].memory.queue.push({
    role: "garbageCollector",
    body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,],
    IdleFlagName: "Idle22",
    room: "W49N45",
})

/**melee*/


/**transferer*/
Game.rooms['W46N41'].memory.queue.push({
    role: "transferer",
    body: [CARRY, MOVE],
    destFlagName: "transferrer7",
    toOrFromLink: false,
    room: "W46N41",
})

Game.rooms['W46N43'].memory.queue.push({
    role: "upgrader",
    body: Array(28).fill(WORK).concat(Array(8).fill(CARRY)).concat(Array(14).fill(MOVE)),
    room: "W46N43",
    destFlagName: "Upgrade4",
});

/**Claimer*/
Game.rooms['W46N43'].memory.queue.push({
    role: "claimer",
    body: [MOVE, CLAIM],
    room: "W46N43",
    destFlagName: "target1",
});

Game.rooms['W46N43'].memory.queue.push({
    role: "miner",
    body: Array(5).fill([WORK]).flat().concat(Array(5).fill(MOVE)),
    srcFlagName: "Source29",
    room: "W46N43",
});

Game.rooms['W44N42'].memory.queue.push({
    role: "builder",
    body: Array(6).fill([WORK, CARRY, MOVE]).flat(),
    room: "W44N42",
    srcFlagName: "Storage8",
});
Game.rooms['W46N43'].memory.queue.push({
    role: "miner",
    body: Array(5).fill([WORK]).flat().concat(Array(5).fill(MOVE)),
    srcFlagName: "Source30",
    room: "W46N43",
});

Game.rooms['W46N43'].memory.queue.push({
    role: "builder",
    body: Array(3).fill([WORK, CARRY, MOVE]).flat(),
    room: "W46N43",
    srcFlagName: "Source30",
    IdleFlagName: "Idle20"
});

Game.rooms['W49N44'].memory.queue.push({
    role: "claimer",
    body: [MOVE, CLAIM],
    room: "W49N44",
    destFlagName: "target2",
});

Game.rooms['W49N44'].memory.queue.push({
    role: "miner",
    body: Array(5).fill([WORK]).flat().concat(Array(5).fill(MOVE)),
    srcFlagName: "Source31",
    room: "W49N44",
});

Game.rooms['W49N44'].memory.queue.push({
    role: "builder",
    body: Array(3).fill([WORK, CARRY, MOVE]).flat(),
    room: "W49N44",
    srcFlagName: "Source31",
    IdleFlagName: "Idle21"
});
Game.rooms['W49N44'].memory.queue.push({
    role: "miner",
    body: Array(5).fill([WORK]).flat().concat(Array(5).fill(MOVE)),
    srcFlagName: "Source32",
    room: "W49N44",
});

Game.rooms['W49N44'].memory.queue.push({
    role: "builder",
    body: Array(3).fill([WORK, CARRY, MOVE]).flat(),
    room: "W49N44",
    srcFlagName: "Source32",
    IdleFlagName: "Idle21"
});

Game.rooms['W18N48'].memory.queue.push({
    role: "wallRepairer",
    body: [WORK, MOVE, CARRY, WORK, MOVE, CARRY, WORK, MOVE, CARRY,],
    room: "W18N48",
    wallMaxHits: 100000,
    IdleFlagName: "Idle4",
})


Game.rooms['W46N41'].memory.queue.push({
    role: "dismantler",
    body: Array(25).fill([WORK, MOVE]).flat(),
    room: "W46N41",
    destFlagName: "dismantle2",
})

Game.rooms['W44N42'].memory.queue.push({
    role: "melee",
    body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    destFlagName: "Idle23",
    room: "W44N42",
});

Game.rooms['W49N44'].memory.queue.push({
    role: "melee",
    body: Array(13).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(12).fill(ATTACK)),
    destFlagName: "Idle21",
    room: "W49N44",
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
Game.rooms['W49N44'].memory.queue.push({
    role: "interRoomGarbageCollector",
    body: Array(5).fill([CARRY, MOVE]).flat(),
    room: "W49N44",
    srcFlagName: "dismantle",
    destFlagName: "Link3",
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
    mineralType: "H",
})

for (const name in Memory.creeps) {
    if ((Memory.creeps[name].role === "train" || Memory.creeps[name].role === "upgrader") && (Memory.creeps[name].room === "W46N41")) {
        Memory.creeps[name].respawnInformed = true
    }
}

// Game.rooms['W46N41'].memory.LinkPairs.push([
//     "6aad5814cbcf71718b8cba83",
//     "6aa6a20de594994a6396fa99",
// ])

for (const name in Game.creeps) {
    Game.creeps[name].suicide()
}

for (const id in Game.constructionSites) {
    Game.constructionSites[id].remove()
}

for (const name in Game.spawns) {
    Game.spawns[name].spawning?.cancel()
}