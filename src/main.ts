import "./modules/prototype.creep"
import "./modules/prototype.spawn"
import "./modules/prototype.room"
import {errorMapper} from './modules/errorMapper'

export const loop = errorMapper(function () {
    const sourceContainerFlagNames = ["SourceContainer1", "SourceContainer2", "SourceContainer3"];
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller?.my)
            room.run(sourceContainerFlagNames);
    }
    let name;
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