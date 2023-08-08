const roleTransferer = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getUsedCapacity() !== 0) {
            creep.memory.transporting = true;
        }

        if (creep.memory.transporting) {
            const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER || structure.structureType ===STRUCTURE_LAB) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            })
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }else{
                if (creep.room.memory.idleFlagName) creep.moveTo(Game.flags[creep.room.memory.idleFlagName]);
            }
        } else {
            if (creep.room.name === creep.memory.home) {
                const source = creep.room.storage;
                if (source) {
                    if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                }
            } else {
                creep.MoveToHomeRoom()
            }
        }
    }
}
export default roleTransferer;