const roleToStorageLorry = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            const target2 = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (s) => {
                    return (s.structureType === STRUCTURE_TOWER || s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_STORAGE) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }
            });
            if (target2) {
                if (creep.transfer(target2, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target2);
                }
            }
        } else {
            const source = Game.getObjectById(creep.memory.containerId as Id<StructureContainer>);
            if (source) {
                if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                }
            }
        }
    }
}

export default roleToStorageLorry;