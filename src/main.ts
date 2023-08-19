import "./modules/prototype.creep"
import "./modules/prototype.spawn"
import "./modules/prototype.room"
import {errorMapper} from './modules/errorMapper'

export const loop = errorMapper(function () {
    const sourceContainerFlagNames = ["SourceContainer1", "SourceContainer2"];
    const sinkContainerFlagNames = ["UpgraderPosition1"];
    const idleFlagNames = ["Idle", 'Idle1',"Idle2",'Idle3'];
    const storageLinkCommunicatorFlagNames = ["linkToStorage"]; // Link to Storage
    const linkStorageCommunicatorFlagNames = ["StorageLinkFlag"]; // Storage to Link
    const containerLinkCommunicatorFlagNames = ["ContainerToLink",'Container1']; // Container to Link
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        room.run(sourceContainerFlagNames, sinkContainerFlagNames, idleFlagNames, storageLinkCommunicatorFlagNames,
            linkStorageCommunicatorFlagNames, containerLinkCommunicatorFlagNames);
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