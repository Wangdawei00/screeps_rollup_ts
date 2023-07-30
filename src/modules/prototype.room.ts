Room.prototype.run = function (sourceContainerFlagNames, sinkContainerFlagNames) {
    if (sourceContainerFlagNames.length !== 0 && (!this.memory.sourceContainerFlagNames ||
        this.memory.sourceContainerFlagNames.length !== sourceContainerFlagNames.length ||
        sourceContainerFlagNames.every(
            (value, index) => value === this.memory.sourceContainerFlagNames[index]
        ))) {
        this.memory.sourceContainerFlagNames = sourceContainerFlagNames;
        this.memory.sourceContainerIds = [];
        for (const sourceContainerFlag of sourceContainerFlagNames) {
            const sourceContainer = Game.flags[sourceContainerFlag].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
            });
            if (sourceContainer.length > 0) {
                this.memory.sourceContainerIds.push(<Id<StructureContainer>>sourceContainer[0].id);
            }
        }
    }
    if (sinkContainerFlagNames.length !== 0 && (!this.memory.sinkContainerFlagNames ||
        this.memory.sinkContainerFlagNames.length !== sinkContainerFlagNames.length ||
        sinkContainerFlagNames.every(
            (value, index) => value === this.memory.sinkContainerFlagNames[index]
        ))) {
        this.memory.sinkContainerFlagNames = sinkContainerFlagNames;
        this.memory.sinkContainerIds = [];
        for (const sinkContainerFlag of sinkContainerFlagNames) {
            const sinkContainer = Game.flags[sinkContainerFlag].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
            });
            if (sinkContainer.length > 0) {
                this.memory.sinkContainerIds.push(<Id<StructureContainer>>sinkContainer[0].id);
            }
        }
    }
    const towers: StructureTower[] = this.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_TOWER
    });
    for (const tower of towers) {
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile)
        } else {
            const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL
            });
            if (closestDamagedStructure) {
                tower.repair(closestDamagedStructure);
            }
        }
    }
    const spawns: StructureSpawn[] = this.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_SPAWN
    });
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
}