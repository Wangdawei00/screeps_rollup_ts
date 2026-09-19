/**truck*/
Game.rooms['W49N44'].memory.queue.splice(0, 0, {
    role: "truck",
    body: Array(2).fill([CARRY, CARRY, MOVE]).flat(),
    srcFlagName: "Upgrade Container3",
    room: "W49N44",
});

/**miner*/
Game.rooms['W46N41'].memory.queue.push({
    role: "miner",
    body: Array(13).fill([WORK]).flat().concat(Array(7).fill(MOVE).flat()),
    srcFlagName: "mineral3",
    room: "W46N41",
})

Game.rooms['W47N44'].memory.queue.push({
    role: "train",
    body: Array(0).fill([CARRY, CARRY, MOVE]).flat().concat([CARRY, MOVE]),
    srcFlagName: "Source2",
    destFlagName: "Storage1",
    room: "W47N44",
})

/** builder*/
Game.rooms['W46N41'].memory.queue.push({
    role: "builder",
    body: Array(2).fill([WORK, CARRY, MOVE]).flat(),
    room: "W46N41",
    srcFlagName: "Source20",
});
/**repairer*/
Game.rooms['W46N41'].memory.queue.push({
    role: "repairer",
    body: Array(2).fill([WORK, CARRY, MOVE]).flat(),
    room: "W46N41",
    IdleFlagName: "Idle13",
})

Game.rooms['W49N41'].memory.queue.push({
    role: "upgrader",
    body: Array(17).fill([WORK]).flat().concat(Array(3).fill(CARRY).flat()).concat(Array(9).fill(MOVE).flat()),
    room: "W49N41",
    destFlagName: "Upgrade7",
});

/**reserver*/
Game.rooms['W46N41'].memory.queue.push({
    role: "reserver",
    body: [MOVE, CLAIM, MOVE, CLAIM],
    destFlagName: "reserveTarget7",
    room: "W46N41",
});
Game.rooms['W46N41'].memory.queue.push({
    role: "miner",
    body: Array(5).fill([WORK,  MOVE]).flat().concat(Array(0).fill(MOVE).flat()),
    srcFlagName: "Source20",
    room: "W46N41",
});

Game.rooms['W47N44'].memory.queue.push({
    role: "repairer",
    body: [WORK, CARRY, MOVE, WORK, CARRY, MOVE],
    room: "W47N44",
    IdleFlagName: "Idle5",
});

/**Garbage Collector*/
Game.rooms['W49N44'].memory.queue.push({
    role: "garbageCollector",
    body: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,],
    IdleFlagName: "Idle8",
    room: "W49N44",
})

/**melee*/


/**transferer*/
Game.rooms['W49N44'].memory.queue.splice(0, 0, {
    role: "transferer",
    body: [CARRY, MOVE],
    destFlagName: "transferrer7",
    toOrFromLink: false,
    room: "W49N44",
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


Game.rooms['W49N44'].memory.queue.push({
    role: "dismantler",
    body: Array(12).fill([WORK, MOVE]).flat(),
    room: "W49N44",
    destFlagName: "dismantle",
})

Game.rooms['W49N44'].memory.queue.splice(0, 0, {
    role: "melee",
    body: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK,
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
    destFlagName: "Idle10",
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
    body: Array(6).fill([CARRY, MOVE]).flat(),
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
    mineralType: "U",
})

for (const name in Memory.creeps) {
    if ((Memory.creeps[name].role === "train" || Memory.creeps[name].role === "upgrader") && (Memory.creeps[name].room === "W46N41")) {
        Memory.creeps[name].respawnInformed = true
    }
}

Game.rooms['W46N41'].memory.LinkPairs.push([
    "6aad5814cbcf71718b8cba83",
    "6aa6a20de594994a6396fa99",
])