import "./modules/prototype.creep"
import "./modules/prototype.spawn"
import {errorMapper} from './modules/errorMapper'

export const loop = errorMapper(function () {
    let name;
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
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