const roleLongDistanceUpgrader = {
    run: function (creep: Creep) {
        if (creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom();
        } else {
            if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.upgrading = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
                creep.memory.upgrading = true;
                creep.say('⚡ upgrade');
            }
            if (creep.memory.upgrading) {
                if (creep.upgradeController(creep.room.controller!) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller!);
                }
            } else {
                creep.PickupGarbage();
                creep.WithdrawFromContainer();
            }
        }
    }
}

export default roleLongDistanceUpgrader;