const roleLinkStorageCommunicator = {
    run: function (creep: Creep) {
        if (!creep.pos.isEqualTo(Game.flags['StorageLinkFlag'])) {
            creep.moveTo(Game.flags['StorageLinkFlag']);
        } else {
            if (creep.store[RESOURCE_ENERGY] === 0) {
                const storage = creep.room.storage;
                if (storage) {
                    creep.withdraw(storage, RESOURCE_ENERGY);
                }
            } else {
                const link = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_LINK;
                    }
                })
                if (link.length > 0) {
                    creep.transfer(link[0], RESOURCE_ENERGY);
                }
            }
        }
    }
}

export default roleLinkStorageCommunicator;