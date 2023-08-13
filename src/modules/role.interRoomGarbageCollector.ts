const roleInterRoomGarbageCollector = {
    run: function (creep: Creep) {
        if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = false;
        }
        if (creep.memory.transporting) {
            if (creep.room.name !== creep.memory.target) {
                creep.MoveToTargetRoom();
            } else {
                creep.PickupGarbage();
            }
        } else {
            if (creep.room.name !== creep.memory.home) {
                creep.MoveToHomeRoom();
            } else {
                creep.DepositToAnything();
            }
        }
    }
}

export default roleInterRoomGarbageCollector;