Room.prototype.run = function () {
    this.memory.cache_max_duration = 500;
    if (!this.memory.cache_duration) {
        this.memory.cache_duration = 501;
    }
    let spawns: StructureSpawn[];
    let towers: StructureTower[];
    let labs: StructureLab[];

    if (this.memory.cache_duration > this.memory.cache_max_duration) {
        this.memory.cache_duration = 0;
        const temp_spawns: StructureSpawn[] = this.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_SPAWN
        });
        const temp_towers: StructureTower[] = this.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        })
        const temp_labs: StructureLab[] = this.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LAB
        })
        this.memory.cache_spawn_ids = temp_spawns.map(s => s.id);
        this.memory.cache_tower_ids = temp_towers.map(s => s.id);
        this.memory.cache_lab_ids = temp_labs.map(s => s.id);
    } else {
        this.memory.cache_duration++;
    }

    spawns = this.memory.cache_spawn_ids.map(id => Game.getObjectById(id)) as StructureSpawn[];
    towers = this.memory.cache_tower_ids.map(id => Game.getObjectById(id)) as StructureTower[];
    labs = this.memory.cache_lab_ids.map(id => Game.getObjectById(id)) as StructureLab[];
    for (const spawn of spawns) {
        spawn.SpawnCreepsIfNecessary();
        if (spawn.spawning) {
            const spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1,
                spawn.pos.y,
                {align: 'left', opacity: 0.8});
            console.log(spawn.name + " is spawning a creep named " + spawningCreep.name + " in room " + this.name)
        }
    }
    for (const tower of towers) {
        tower.run();
    }
    if (!this.memory.LinkPairs) {
        this.memory.LinkPairs = []
    }
    if (!this.memory.LabList) {
        this.memory.LabList = []
    }
    for (const pair of this.memory.LinkPairs) {
        const sourceLink = Game.getObjectById(pair[0])
        const targetLink = Game.getObjectById(pair[1])
        if (sourceLink && targetLink) {
            sourceLink.transferEnergy(targetLink);
        } else {
            console.log("No source link or target link")
        }
    }
    for (const list of this.memory.LabList) {
        const sourceLab1 = Game.getObjectById(list[0])
        const sourceLab2 = Game.getObjectById(list[1])
        const targetLab1 = Game.getObjectById(list[2])
        if (sourceLab1 && sourceLab2 && targetLab1) {
            targetLab1.runReaction(sourceLab1, sourceLab2)
        }
    }
    for (const lab of labs) {
        const flags = lab.pos.findInRange(FIND_FLAGS, 0, {
            filter: f => f.name.startsWith("Target")
        })
        if (flags.length !== 0) {
            const creeps = lab.pos.findInRange(FIND_MY_CREEPS, 1, {
                filter: c => !c.memory.upgraded,
            })
            const creep = creeps.pop()
            if (creep) {
                if (lab.boostCreep(creep) === OK) {
                    creep.memory.upgraded = true;
                }
            }
        }
    }
}