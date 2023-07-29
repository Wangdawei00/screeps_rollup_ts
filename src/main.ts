import "./modules/prototype.creep"
import "./modules/prototype.spawn"
import {errorMapper} from './modules/errorMapper'

export const loop = errorMapper(function () {
    const sourceContainerFlagNames = ["SourceContainer1", "SourceContainer2","SourceContainer3"];
    const sinkContainerFlagNames = ["ControllerRoadEndpoint"];
    if (!Memory.sourceContainerFlagNames || Memory.sourceContainerFlagNames.length !== sourceContainerFlagNames.length ||
        !sourceContainerFlagNames.every((value, index) =>
            value === Memory.sourceContainerFlagNames[index])) {
        Memory.sourceContainerFlagNames = sourceContainerFlagNames;
        Memory.sourceContainerIds = [];
        for (const sourceContainerFlag of sourceContainerFlagNames) {
            const sourceContainer = Game.flags[sourceContainerFlag].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
            });
            if (sourceContainer.length > 0) {
                Memory.sourceContainerIds.push(<Id<StructureContainer>>sourceContainer[0].id);
            }
        }
    }
    if (!Memory.sinkContainerFlagNames || Memory.sinkContainerFlagNames.length !== sinkContainerFlagNames.length ||
        !sinkContainerFlagNames.every((value, index) =>
            value === Memory.sinkContainerFlagNames[index])) {
        Memory.sinkContainerFlagNames = sinkContainerFlagNames;
        Memory.sinkContainerIds = [];
        for (const sinkContainerFlag of sinkContainerFlagNames) {
            const sinkContainer = Game.flags[sinkContainerFlag].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER
            });
            if (sinkContainer.length > 0) {
                Memory.sinkContainerIds.push(<Id<StructureContainer>>sinkContainer[0].id);
            }
        }
    }
    let name;
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    const towers: StructureTower[] = Game.spawns['Spawn1'].room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_TOWER
    });
    for (const tower of towers) {
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile)
        }
    }
    Game.spawns['Spawn1'].SpawnCreepsIfNecessary();
    if (Game.spawns['Spawn1'].spawning) {
        const spawningCreep = Game.creeps[Game.spawns['Spawn1'].spawning.name];
        Game.spawns['Spawn1'].room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            Game.spawns['Spawn1'].pos.x + 1,
            Game.spawns['Spawn1'].pos.y,
            {align: 'left', opacity: 0.8});
    }

    for (name in Game.creeps) {
        const creep = Game.creeps[name];
        creep.runRole();
    }
});