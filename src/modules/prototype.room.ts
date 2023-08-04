Room.prototype.run = function (/*sourceContainerFlagNames*/) {
    /*if (sourceContainerFlagNames.length !== 0 && (!this.memory.sourceContainerFlagNames ||
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
    }*/
    const containers = this.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
    })
    if(containers.length !== this.memory.sourceContainerIds?.length) {
        this.memory.sourceContainerIds = [];
        for (const container of containers) {
            this.memory.sourceContainerIds.push(<Id<StructureContainer>>container.id);
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
            // const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            //     filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL
            // });
            // if (closestDamagedStructure) {
            //     tower.repair(closestDamagedStructure);
            // }
            const damagedStructures = tower.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL
            });
            damagedStructures.forEach((structure) => {
                tower.repair(structure);
            });
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
    if (this.energyAvailable === this.energyCapacityAvailable) {
        const storage = this.storage;
        if (storage) {
            const storageLink = storage.pos.findInRange(FIND_MY_STRUCTURES, 2, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_LINK;
                }
            })
            if (storageLink.length > 0) {
                const target = this.controller?.pos.findInRange(FIND_STRUCTURES, 4, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_LINK;
                    }
                })
                if (target && target.length > 0) {
                    (<StructureLink>storageLink[0]).transferEnergy(<StructureLink>target[0]);
                }
            }
        }
    }

}