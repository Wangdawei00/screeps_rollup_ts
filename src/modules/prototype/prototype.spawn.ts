StructureSpawn.prototype.SpawnCreepsIfNecessary = function () {
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
