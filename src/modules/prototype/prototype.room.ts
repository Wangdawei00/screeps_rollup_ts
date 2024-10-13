Room.prototype.run = function () {
    const spawns: StructureSpawn[] = this.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_SPAWN
    });
    const towers: StructureTower[] = this.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    })
    const links: StructureLink[] = this.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_LINK
    })
    for (const spawn of spawns) {
        spawn.SpawnCreepsIfNecessary();
        if (spawn.spawning) {
            const spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1,
                spawn.pos.y,
                {align: 'left', opacity: 0.8});
        }
    }
    for (const tower of towers) {
        tower.run();
    }
    // for (const link of links) {
    //     link.run()
    // }
    if (!this.memory.LinkPairs) {
        this.memory.LinkPairs = []
    }
    for (const pair of this.memory.LinkPairs) {
        const sourceLink = Game.getObjectById(pair[0])
        const targetLink = Game.getObjectById(pair[1])
        if (sourceLink && targetLink) {
            if (sourceLink.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                sourceLink.transferEnergy(targetLink);
            }
        }else{
            console.log("No source link or target link")
        }
    }
}