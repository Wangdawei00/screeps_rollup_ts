StructureSpawn.prototype.SpawnCreepsIfNecessary = function () {
    // if (!Memory.stack) {
    //     Memory.stack = []
    // }
    // console.log("Memory.stack.length = " + Memory.stack.length);
    // if (Memory.stack.length > 0) {
    //     const memory = Memory.stack[0];
    //     memory.respawnInformed = false;
    //     const role = memory.role;
    //     if (memory.body === undefined) {
    //         console.log("No body")
    //         Memory.stack.shift();
    //         return;
    //     }
    //     // console.log(memory.body)
    //     const result = this.spawnCreep(memory.body, role + Game.time.toString(), {
    //         memory: memory
    //     })
    //     console.log("Spawn Result: " + result);
    //     if (result === OK) {
    //         Memory.stack.shift();
    //     }
    // }
    const room = this.room;
    if (!room.memory.queue) {
        room.memory.queue = []
    }
    const queue = room.memory.queue;
    console.log("Room " + room.name + "'s queue length: " + queue.length)
    if (queue.length > 0) {
        const memory = queue[0];
        memory.respawnInformed = false;
        const role = memory.role
        if (memory.body === undefined) {
            console.log("No body")
            queue.shift()
            return;
        }
        const result = this.spawnCreep(memory.body, role + Game.time.toString(), {
            memory: memory,
        })
        console.log("Spawn Result: " + result)
        if (result === OK) {
            queue.shift();
        }
    }
}
// StructureSpawn.prototype.CreateP_Builder = function (srcFlagName): string | undefined {
//     let i;
//     const role = "p_builder";
//     const name = role + Game.time.toString();
//     const body: BodyPartConstant[] = [];
//     const energyCapacityAvailable = this.room.energyCapacityAvailable;
//     const numberOfCollection = Math.floor(energyCapacityAvailable / 250);
//     for (i = 0; i < numberOfCollection; i++) {
//         body.push(WORK);
//     }
//     for (i = 0; i < numberOfCollection; i++) {
//         body.push(CARRY);
//     }
//     for (i = 0; i < numberOfCollection; i++) {
//         body.push(MOVE);
//         body.push(MOVE);
//     }
//     if (this.spawnCreep(body, name, {
//         memory: {
//             role: role,
//             srcFlagName: srcFlagName,
//         }
//     }) === OK) {
//         return name;
//     }
// }
//
// StructureSpawn.prototype.CreateMiner = function (srcFlagName): string | undefined {
//     const role = "miner";
//     const name = role + Game.time.toString();
//     const body: BodyPartConstant[] = [MOVE, MOVE, WORK, WORK]
//     if (this.spawnCreep(body, name, {
//         memory: {
//             role: role,
//             srcFlagName: srcFlagName,
//             // sourceId: Game.flags[destFlagName].pos.findClosestByPath(FIND_SOURCES)?.id,
//         }
//     }) === OK) {
//         return;
//     }
// }
//
// StructureSpawn.prototype.CreateP_Upgrader = function (srcFlagName, destFlagName): string | undefined {
//     // TODO: change this to generalize
//     const role = "p_upgrader", name = role + Game.time.toString(), body: BodyPartConstant[] = [],
//         energyCap = this.room.energyCapacityAvailable;
//     for (let i = 0; i < Math.floor(energyCap / (200)); i++) {
//         body.push(WORK);
//         body.push(CARRY);
//         body.push(MOVE);
//     }
//     if (this.spawnCreep(body, name, {
//         memory: {
//             role: role,
//             destFlagName: destFlagName,
//             srcFlagName: srcFlagName
//         }
//     }) === OK) {
//         return name;
//     }
// }
//
// StructureSpawn.prototype.CreateP_Harvester = function (srcFlagName) {
//     const role = "p_harvester", name = role + Game.time.toString(), body: BodyPartConstant[] = [],
//         energyCap = this.room.energyCapacityAvailable;
//     for (let i = 0; i < Math.floor(energyCap / (200)); i++) {
//         body.push(WORK);
//         body.push(CARRY);
//         body.push(MOVE);
//     }
//     if (this.spawnCreep(body, name, {
//         memory: {
//             role: role,
//             srcFlagName: srcFlagName
//         }
//     }) === OK) {
//         return name;
//     }
// }

// StructureSpawn.prototype.SpawnP_HarvesterIfNecessary = function () {
//
// }