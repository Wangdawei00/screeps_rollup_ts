function UpdateContainerFlagNamesAndId(inputFlagName: string[], roomMemory: RoomMemory, idName: string, roomName: string) {

     // @ts-ignore
    roomMemory[idName] = [];
    for (const flagName of inputFlagName) {
        if (Game.flags[flagName].room?.name === roomName) {
            const container = Game.flags[flagName].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
            });
            if (container.length > 0) {
                // @ts-ignore
                roomMemory[idName].push(<Id<StructureContainer>>container[0].id);
            }
        }
    }
}

function UpdateFlagName(input: string[], roomMemory: RoomMemory, inputName: string, roomName: string) {
    // @ts-ignore
    if (input.length !== 0 && (!Memory[inputName] || Memory[inputName].length !== input.length ||
        // @ts-ignore
        input.every((value, index) => value === Memory[inputName][index]))) {
        // @ts-ignore
        Memory[inputName] = input;
        // @ts-ignore
        roomMemory[inputName] = [];
        for (const name of input) {
            if (Game.flags[name].room?.name === roomName) {
                // @ts-ignore
                roomMemory[inputName].push(name);
            }
        }
    }
}

Room.prototype.run = function (flagNames, changed) {

    const containerConfig: Record<string, [string[], string]> = {
        "sourceContainerFlagNames": [flagNames['sourceContainerFlagNames'], "sourceContainerIds"],
        "sinkContainerFlagNames": [flagNames['sinkContainerFlagNames'], "sinkContainerIds"],
    }
    const flagConfig: Record<string, string[]> = {
        "idleFlagNames": flagNames['idleFlagNames'],
        "storageLinkCommunicatorFlagNames": flagNames['storageLinkCommunicatorFlagNames'],
        "linkStorageCommunicatorFlagNames": flagNames['linkStorageCommunicatorFlagNames'],
        "containerLinkCommunicatorFlagNames": flagNames['containerLinkCommunicatorFlagNames'],
    }
    for (const containerConfigKey in containerConfig) {
        if (changed[containerConfigKey]) {
            UpdateContainerFlagNamesAndId(containerConfig[containerConfigKey][0], this.memory,
                containerConfig[containerConfigKey][1], this.name)
        }
    }
    for (const flagConfigKey in flagConfig) {
        if (changed[flagConfigKey]) {
            UpdateFlagName(flagConfig[flagConfigKey], this.memory, flagConfigKey, this.name)
        }
    }
    const towers: StructureTower[] = this.find(FIND_MY_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_TOWER
    });
    for (const tower of towers) {
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile)
        } else {
            const closestDamagedCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: (creep) => creep.hits < creep.hitsMax && creep.room.name === this.name
            });
            if (closestDamagedCreep) {
                tower.heal(closestDamagedCreep);
            }
        }
    }
    const spawns: StructureSpawn[] = this.find(FIND_MY_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_SPAWN
    });
    for (const spawn of spawns) {
        spawn.SpawnCreep();
        if (spawn.spawning) {
            const spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️' + spawningCreep.memory.role,
                spawn.pos.x + 1,
                spawn.pos.y,
                {align: 'left', opacity: 0.8});
        }
    }
    if (this.memory.updateLink) {
        this.memory.sourceLinks = [];
        this.memory.sinkLinks = [];
        if (this.memory.linkMining) {
            const sources = this.find(FIND_SOURCES);
            for (const source of sources) {
                this.memory.sourceLinks = this.memory.sourceLinks.concat((<StructureLink[]>source.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_LINK;
                    }
                })).map((structure) => structure.id));
            }
            if (this.storage) {
                this.memory.sinkLinks.push(<Id<StructureLink>>this.storage.pos.findInRange(FIND_STRUCTURES, 2, {
                    filter: (structure) => structure.structureType === STRUCTURE_LINK
                })[0]?.id);
            }
        } else {
            if (this.storage) {
                this.memory.sourceLinks.push(<Id<StructureLink>>this.storage.pos.findInRange(FIND_STRUCTURES, 2, {
                    filter: (structure) => structure.structureType === STRUCTURE_LINK
                })[0]?.id);
            }
            if (this.controller) {
                this.memory.sinkLinks.push(<Id<StructureLink>>this.controller.pos.findInRange(FIND_STRUCTURES, 4, {
                    filter: (structure) => structure.structureType === STRUCTURE_LINK
                })[0]?.id);
            }
        }
        this.memory.updateLink = false;
    }
    if (this.controller?.my && (this.memory.linkMining || (this.energyAvailable === this.energyCapacityAvailable
        && this.find(FIND_MY_CONSTRUCTION_SITES).length === 0))) {
        const sourceLinks = this.memory.sourceLinks.map((id) => Game.getObjectById(id));
        const sinkLinks = this.memory.sinkLinks.map((id) => Game.getObjectById(id));
        for (const sourceLink of sourceLinks) {
            if (sourceLink && sourceLink.store[RESOURCE_ENERGY] === sourceLink.store.getCapacity(RESOURCE_ENERGY)) {
                for (const sinkLink of sinkLinks) {
                    if (sinkLink && sinkLink.store[RESOURCE_ENERGY] === 0) {
                        sourceLink.transferEnergy(sinkLink);
                    }
                }
            }
        }
    }
}