const roleFromStorageLorry = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            const target = Game.getObjectById(creep.memory.containerId as Id<StructureContainer>);
            if (target) {
                const result = creep.transfer(target, RESOURCE_ENERGY);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                } else if (result === ERR_FULL) {
                    creep.moveTo(Game.flags['Idle']);
                }
            }
        } else {
            if (creep.room.name === creep.memory.home) {
                const source = creep.room.storage;
                if (source && source.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity()) {
                    if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                } else {
                    if (creep.room.memory.idleFlagName) creep.moveTo(Game.flags[creep.room.memory.idleFlagName]);
                }
            } else {
                creep.MoveToHomeRoom()
            }
        }
    }
}

export default roleFromStorageLorry;