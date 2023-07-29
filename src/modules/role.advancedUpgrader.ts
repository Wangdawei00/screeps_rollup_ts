const roleAdvancedUpgrader = {
    run: function (creep: Creep) {
        if (creep.memory.upgradePosFlagName) {
            const workPos = Game.flags[creep.memory.upgradePosFlagName].pos;
            if (!creep.pos.isEqualTo(workPos)) {
                creep.moveTo(workPos);
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
                    creep.upgradeController(creep.room.controller as StructureController);
                } else {
                    const source = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                        filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
                    })
                    if (source.length > 0) {
                        creep.withdraw(source[0], RESOURCE_ENERGY);
                    }
                }
            }
        }
    }
}

export default roleAdvancedUpgrader;