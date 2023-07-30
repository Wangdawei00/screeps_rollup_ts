const roleLorry = {

    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            const targets = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER ||
                            (structure.structureType === STRUCTURE_CONTAINER &&
                                creep.room.memory.sinkContainerIds.includes(structure.id))) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets) {
                const transferResult = creep.transfer(targets, RESOURCE_ENERGY);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets);
                }
            } else {
                if (creep.room.storage) {
                    if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.storage);
                    }
                }
            }
        } else {
            if (creep.room.find(FIND_MY_CONSTRUCTION_SITES)) {
                creep.WithdrawFromContainerOrStorage();
            } else {
                creep.WithdrawFromContainer();
            }
        }
    }
}
export default roleLorry;