const roleGarbageCollector = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            creep.DepositToAnything()
        } else {
            creep.PickupGarbage();
        }

    }
}

export default roleGarbageCollector;