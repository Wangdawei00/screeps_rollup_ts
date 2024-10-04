StructureSpawn.prototype.SpawnCreepsIfNecessary = function () {
    if (!Memory.harvesterFlagIndex) {
        Memory.harvesterFlagIndex = {}
    }
    if (!Memory.upgraderFlagIndex) {
        Memory.upgraderFlagIndex = {}
    }
    if (!Memory.builderFlagIndex) {
        Memory.builderFlagIndex = {}
    }
    const harvesterFlagNames: string[] = [];
    const builderFlagNames: string[] = [];
    const upgraderFlagNames: string[] = [];
    for (let flagName in Game.flags) {
        if (flagName.startsWith("P_Build")) {
            builderFlagNames.push(flagName);
        }
        if (flagName.startsWith("P_UpgraderPos")) {
            upgraderFlagNames.push(flagName);
        }
        if (flagName.startsWith("P_Harverst")) {
            harvesterFlagNames.push(flagName);
        }
    }
    console.log("harvesterFlagNames:" + harvesterFlagNames)
    // console.log("builderFlagNames:" + builderFlagNames)
    // console.log("upgraderFlagNames:" + upgraderFlagNames)
    for (let harvesterFlagName of harvesterFlagNames) {
        const creepName = Memory.harvesterFlagIndex[harvesterFlagName];
        console.log("Creep name in Memory.HarvesterFlagIndex is " + creepName)
        if (!creepName || !Game.creeps[creepName]) {
            delete Memory.harvesterFlagIndex[harvesterFlagName];
            const harvesterName = this.CreateP_Harvester(harvesterFlagName)
            if (harvesterName) {
                Memory.harvesterFlagIndex[harvesterFlagName] = harvesterName;
                return
            } else {
                console.log("Not successful, probably not enough energy")
            }
        }
    }
    for (let upgraderFlagName of upgraderFlagNames) {
        const creepName = Memory.upgraderFlagIndex[upgraderFlagName];
        // console.log("Creep name in Memory.HarvesterFlagIndex is " + creepName)
        if (!creepName || !Game.creeps[creepName]) {
            delete Memory.upgraderFlagIndex[upgraderFlagName];
            const upgraderName = this.CreateP_Upgrader(upgraderFlagName, "P_UpgraderDest" +
                upgraderFlagName[upgraderFlagName.length - 1])//this.CreateP_Harvester(harvesterFlagName, [WORK, CARRY, CARRY, MOVE, MOVE])
            if (upgraderName) {
                Memory.upgraderFlagIndex[upgraderFlagName] = upgraderName;
                return
            } else {
                console.log("Not successful, probably not enough energy")
            }
        }
    }
    if (this.room.find(FIND_MY_CONSTRUCTION_SITES)) {
        for (let builderFlagName of builderFlagNames) {
            const creepName = Memory.builderFlagIndex[builderFlagName];
            // console.log("Creep name in Memory.HarvesterFlagIndex is " + creepName)
            if (!creepName || !Game.creeps[creepName]) {
                delete Memory.builderFlagIndex[builderFlagName];
                const builderName = this.CreateP_Builder(builderFlagName)//this.CreateP_Harvester(harvesterFlagName, [WORK, CARRY, CARRY, MOVE, MOVE])
                if (builderName) {
                    Memory.builderFlagIndex[builderFlagName] = builderName;
                    return
                } else {
                    console.log("Not successful, probably not enough energy")
                }
            }
        }
    }
}
//     if (!Memory.minerFlagIndex) {
//         Memory.minerFlagIndex = {};
//     }
//     if(!Memory.upgraderFlagIndex){
//         Memory.upgraderFlagIndex = {};
//     }
//
//     const minerFlagNames: string[] = [];
//     const builderFlagNames: string[] = [];
//     const upgraderFlagNames: string[] = [];
//     for (let flagName in Game.flags) {
//         if (flagName.startsWith("Miner")) {
//             minerFlagNames.push(flagName);
//         }
//         if (flagName.startsWith("Build")) {
//             builderFlagNames.push(flagName);
//         }
//         if (flagName.startsWith("Upgrader")) {
//             upgraderFlagNames.push(flagName);
//         }
//     }
//     for (let minerFlagName of minerFlagNames) {
//         const creepName = Memory.minerFlagIndex[minerFlagName];
//         if (!creepName || !Game.spawns[creepName]) {
//             delete Memory.minerFlagIndex[minerFlagName];
//             const minerName = this.CreateMiner(minerFlagName, [WORK, WORK, MOVE, MOVE])
//             if (minerName) {
//                 Memory.minerFlagIndex[minerFlagName] = minerName;
//                 return
//             }
//         }
//     }
//     for (let upgraderFlagName of upgraderFlagNames) {
//         const creepName = Memory.upgraderFlagIndex[upgraderFlagName];
//         if (!creepName || !Game.spawns[creepName]) {
//             delete Memory.upgraderFlagIndex[upgraderFlagName];
//             const upgraderName = this.CreateUpgrader(upgraderFlagName);
//             if (upgraderName) {
//                 Memory.upgraderFlagIndex[upgraderFlagName] =upgraderName;
//                 return;
//             }
//         }
//     }
//     const room = this.room;
//     if (room.find(FIND_MY_CONSTRUCTION_SITES)) {
//         if (!Memory.builderFlagIndex) {
//             Memory.builderFlagIndex = {}
//         }
//         for (let builderFlagName of builderFlagNames) {
//             const creepName = Memory.builderFlagIndex[builderFlagName];
//             if (!creepName || !Game.spawns[creepName]) {
//                 delete Memory.builderFlagIndex[builderFlagName];
//                 const builderName = this.CreateBuilder(builderFlagName);
//                 if (builderName) {
//                     Memory.builderFlagIndex[builderFlagName] = builderName;
//                     return;
//                 }
//             }
//         }
//     }
//
// }
//
StructureSpawn.prototype.CreateP_Builder = function (srcFlagName): string | undefined {
    let i;
    const role = "p_builder";
    const name = role + Game.time.toString();
    const body: BodyPartConstant[] = [];
    const energyCapacityAvailable = this.room.energyCapacityAvailable;
    const numberOfCollection = Math.floor(energyCapacityAvailable / 250);
    for (i = 0; i < numberOfCollection; i++) {
        body.push(WORK);
    }
    for (i = 0; i < numberOfCollection; i++) {
        body.push(CARRY);
    }
    for (i = 0; i < numberOfCollection; i++) {
        body.push(MOVE);
        body.push(MOVE);
    }
    if (this.spawnCreep(body, name, {
        memory: {
            role: role,
            srcFlagName: srcFlagName,
        }
    }) === OK) {
        return name;
    }
}
//
// StructureSpawn.prototype.CreateMiner = function (destFlagName, body): string | undefined {
//     const role = "miner";
//     const name = role + Game.time.toString();
//     if (this.spawnCreep(body, name, {
//         memory: {
//             role: role,
//             destFlagName: destFlagName,
//             sourceId: Game.flags[destFlagName].pos.findClosestByPath(FIND_SOURCES)?.id,
//         }
//     }) === OK) {
//         return;
//     }
// }
//
StructureSpawn.prototype.CreateP_Upgrader = function (srcFlagName, destFlagName): string | undefined {
    // TODO: change this to generalize
    const role = "p_upgrader", name = role + Game.time.toString(), body: BodyPartConstant[] = [],
        energyCap = this.room.energyCapacityAvailable;
    for (let i = 0; i < Math.floor(energyCap / (200)); i++) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }
    if (this.spawnCreep(body, name, {
        memory: {
            role: role,
            destFlagName: destFlagName,
            srcFlagName: srcFlagName
        }
    }) === OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateP_Harvester = function (srcFlagName) {
    const role = "p_harvester", name = role + Game.time.toString(), body: BodyPartConstant[] = [],
        energyCap = this.room.energyCapacityAvailable;
    for (let i = 0; i < Math.floor(energyCap / (200)); i++) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }
    if (this.spawnCreep(body, name, {
        memory: {
            role: role,
            srcFlagName: srcFlagName
        }
    }) === OK) {
        return name;
    }
}

// StructureSpawn.prototype.SpawnP_HarvesterIfNecessary = function () {
//
// }