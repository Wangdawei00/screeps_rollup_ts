import {errorMapper} from './modules/errorMapper'
import "./modules/prototype.creep"
import "./modules/prototype.room"
import "./modules/prototype.spawn"

export const loop = errorMapper(function () {
    let name;
    for (let roomName in Game.rooms) {
        // console.log(roomName)
        // console.log(Game.rooms[roomName]);
        Game.rooms[roomName].run();
    }
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    for (name in Game.creeps) {
        const creep = Game.creeps[name];
        creep.runRole();
    }
});