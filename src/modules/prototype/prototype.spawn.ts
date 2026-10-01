import {isCombatCreepMemory, shouldSpawnCombatCreep} from "@/modules/combat/combat.operation";

StructureSpawn.prototype.SpawnCreepsIfNecessary = function () {
    const room = this.room;
    if (!room.memory.queue) {
        room.memory.queue = []
    }
    const queue = room.memory.queue;
    console.log("Room " + room.name + "'s queue length: " + queue.length)
    while (queue.length > 0) {
        const memory = queue[0];
        if (memory.body === undefined) {
            console.log("No body")
            queue.shift()
            return;
        }
        if (isCombatCreepMemory(memory) && !shouldSpawnCombatCreep(memory)) {
            console.log(`Discarding invalid combat spawn slot ${memory.slotId ?? memory.role}`);
            queue.shift();
            continue;
        }
        memory.respawnInformed = false;
        const role = memory.role
        const name = isCombatCreepMemory(memory)
            ? `${memory.combatClass}-${this.name}-${Game.time}` : role + Game.time.toString();
        const result = this.spawnCreep(memory.body, name, {
            memory: memory,
        })
        console.log("Spawn Result: " + result)
        if (result === OK) {
            queue.shift();
        }
        return;
    }
}
