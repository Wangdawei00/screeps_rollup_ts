import "./modules/prototype.creep"
import "./modules/prototype.spawn"
import "./modules/prototype.room"
import {errorMapper} from './modules/errorMapper'

export const loop = errorMapper(function () {
    const FlagNames: Record<string, string[]> = {
        "sourceContainerFlagNames": ["SourceContainer0", "SourceContainer2"],
        "sinkContainerFlagNames": ["UpgraderPosition1"],
        "idleFlagNames": ["Idle", 'Idle1', "Idle2", 'Idle3'],
        "storageLinkCommunicatorFlagNames": ["linkToStorage"], // Link to Storage
        "linkStorageCommunicatorFlagNames": ["StorageLinkFlag"], // Storage to Link
        "containerLinkCommunicatorFlagNames": ["ContainerToLink", 'Container1'], // Container to Link
    };
    const changed: Record<string, boolean> = {
        "sourceContainerFlagNames": false,
        "sinkContainerFlagNames": false,
        "idleFlagNames": false,
        "storageLinkCommunicatorFlagNames": false,
        "linkStorageCommunicatorFlagNames": false,
        "containerLinkCommunicatorFlagNames": false,
    }
    for (const inputFlagNames in changed) {
        // @ts-ignore
        changed[inputFlagNames] = FlagNames[inputFlagNames].length !== 0 && (!Memory[inputFlagNames]
            // @ts-ignore
            || Memory[inputFlagNames].length !== FlagNames[inputFlagNames].length
            // @ts-ignore
            || !FlagNames[inputFlagNames].every((value, index) => value === Memory[inputFlagNames][index]));
        if(changed[inputFlagNames]){
            // @ts-ignore
            Memory[inputFlagNames] = FlagNames[inputFlagNames];
        }
    }
    for (const roomName in Game.rooms) {
        // console.log(roomName)
        const room = Game.rooms[roomName];
        room.run(FlagNames, changed);
    }
    let name;
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            // console.log('Clearing non-existing creep memory:', name);
        }
    }
    for (name in Game.creeps) {
        const creep = Game.creeps[name];
        creep.runRole();
    }
});