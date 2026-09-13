import {errorMapper} from './modules/errorMapper'
import "./modules/prototype/prototype.creep"
import "./modules/prototype/prototype.room"
import "./modules/prototype/prototype.spawn"
import "./modules/prototype/prototype.tower"
import "./modules/prototype/prototype.link"
import {runCombatOperation} from "@/modules/combat/combat.operation";

export const loop = errorMapper(function () {
    let name;
    for (let roomName in Game.rooms) {
        Game.rooms[roomName].run();
    }
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            if (!Memory.creeps[name].respawnInformed) {
                console.log("I am " + name);
                Game.rooms[Memory.creeps[name].room].memory.queue.push(Memory.creeps[name]);
                console.log("Abnormal death")
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    runCombatOperation()
    for (name in Game.creeps) {
        const creep = Game.creeps[name];
        creep.runRole();
    }
});
