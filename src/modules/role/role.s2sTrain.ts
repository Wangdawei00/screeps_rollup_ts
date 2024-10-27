/**
 * s2sTrain moves energy or mineral from A storage to B storage
 * Memory usage: srcFlagName, destFlagName, role, room, mineralType(if this is a mineral train)
 * */
const roleS2sTrain = {
    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        let resourceConstant: ResourceConstant;
        if (creep.memory.mineralType) {
            resourceConstant = creep.memory.mineralType
        } else {
            resourceConstant = RESOURCE_ENERGY;
        }
        if (creep.memory.srcFlagName && creep.memory.destFlagName) {
            const srcStroage = Game.flags[creep.memory.srcFlagName].room?.storage
            const destStorage = Game.flags[creep.memory.destFlagName].room?.storage
            if (srcStroage && destStorage) {
                if (creep.memory.transporting) {
                    creep.moveTo(destStorage)
                    creep.transfer(destStorage, resourceConstant)
                } else {
                    if (srcStroage.store.getUsedCapacity(resourceConstant) >= creep.store.getCapacity(resourceConstant)) {
                        creep.moveTo(srcStroage)
                        creep.withdraw(srcStroage, resourceConstant)
                    } else {
                        creep.gotoIdleFlag()
                        creep.memory.respawnInformed = true;
                    }

                }
            } else {
                console.log("Check " + creep.name + "'memory. There is no storage in srcRoom or destRoom")
            }
        } else {
            console.log("Check " + creep.name + "'memory. There is no srcFlagName or no destFlagName")
        }
    }
}

export default roleS2sTrain;