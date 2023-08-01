const roleInterRoomLorry = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
            creep.say('🚧 build');
        }
        if (creep.memory.transporting) {
            if (creep.room.name !== creep.memory.home) {
                creep.MoveToHomeRoom();
            } else {
                const storage = creep.room.storage;
                if (storage) {
                    if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage);
                    }
                }
            }
        } else {
            if (creep.room.name !== creep.memory.target) {
                creep.MoveToTargetRoom();
            } else {
                creep.PickupGarbage();
                creep.WithdrawFromContainer();
            }
        }

    }
}

export default roleInterRoomLorry;