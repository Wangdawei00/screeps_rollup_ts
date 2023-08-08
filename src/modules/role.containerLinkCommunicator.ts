const roleContainerLinkCommunicator = {
    run: function (creep: Creep) {
        if (creep.memory.targetFlagName) {
            if (!creep.pos.isEqualTo(Game.flags[creep.memory.targetFlagName])) {
                creep.moveTo(Game.flags[creep.memory.targetFlagName]);
            } else {
                if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] > 0) {
                    creep.memory.transporting = false;
                }
                if (!creep.memory.transporting && creep.store.getUsedCapacity() === 0) {
                    creep.memory.transporting = true;
                }
                if (creep.memory.transporting) {
                    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_CONTAINER
                    });
                    if (container) creep.withdraw(container, RESOURCE_ENERGY);
                } else {
                    const link = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                        filter: (s) => s.structureType === STRUCTURE_LINK
                    });
                    if (link) creep.transfer(link, RESOURCE_ENERGY);
                }

            }
        }

    }
}

export default roleContainerLinkCommunicator;