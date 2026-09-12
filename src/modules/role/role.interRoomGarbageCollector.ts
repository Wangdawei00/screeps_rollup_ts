/**
 * Memory Usage: role, room, body, destFlagName, srcFlagName
 * */
const roleInterRoomGarbageCollector = {
    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store.getUsedCapacity() === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            if (creep.memory.destFlagName) {
                const destFlag = Game.flags[creep.memory.destFlagName];
                if (!destFlag) {
                    console.log("Check " + creep.name + "'s memory, the destFlagName is not found in Game.flags")
                    return;
                }
                if (!creep.pos.isNearTo(destFlag)) {
                    creep.moveTo(destFlag);
                } else {
                    const container = destFlag.pos.findInRange(FIND_STRUCTURES, 0, {
                        filter: s =>
                            s.structureType === STRUCTURE_CONTAINER
                            || s.structureType === STRUCTURE_STORAGE
                            || s.structureType === STRUCTURE_LINK
                    })
                    if (container.length > 0) {
                        creep.transfer(container[0], RESOURCE_ENERGY);
                    }
                }
            }
        } else {
            if (creep.memory.srcFlagName) {
                const srcFlag = Game.flags[creep.memory.srcFlagName]
                if (!srcFlag) {
                    console.log("Check " + creep.name + "'s memory, the srcFlagName is not found in Game.flags")
                    return;
                }
                if (!srcFlag.room || srcFlag.room.name !== creep.room.name) {
                    creep.moveTo(srcFlag)
                } else {
                    creep.pickupGarbage()
                }
            }
        }
    }
}
export default roleInterRoomGarbageCollector;