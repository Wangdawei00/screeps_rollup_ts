/**
 * Memory usage: destFlagName, toOrFromLink, role, body, room
 * */

const roleTransferer = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName];
            if (!flag) {
                console.log("ERROR! " + creep.name +
                    " has destFlagName in memory but the flag"
                    + creep.memory.destFlagName + " does not exist. Please check.")
                return
            }
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag)
            } else {
                if (!creep.memory.cache_transferer_link_id ||
                    !Game.getObjectById(creep.memory.cache_transferer_link_id)) {
                    const link = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_LINK
                    })
                    if (link) {
                        creep.memory.cache_transferer_link_id = link.id as Id<StructureLink>;
                    } else {
                        console.log("No link found for creep "
                            + creep.name + " at flag " + flag.name + ". Please check.");
                        return;
                    }
                }
                if (!creep.memory.cache_transferer_structure_id ||
                    !Game.getObjectById(creep.memory.cache_transferer_structure_id)) {
                    const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_STORAGE
                            || s.structureType === STRUCTURE_CONTAINER
                    });
                    if (structure) {
                        creep.memory.cache_transferer_structure_id =
                            structure.id as Id<StructureStorage> | Id<StructureContainer>;
                    } else {
                        console.log("No structure (Container or Storage) found for creep "
                            + creep.name + " at flag " + flag.name + ". Please check.")
                        return;
                    }
                }
                const structure = Game.getObjectById(creep.memory.cache_transferer_structure_id)!;
                const link = Game.getObjectById(creep.memory.cache_transferer_link_id)!;
                if (creep.memory.toOrFromLink) {// to link
                    if (creep.store.getFreeCapacity() > 0) {
                        creep.withdraw(structure, RESOURCE_ENERGY)
                    } else {
                        creep.transfer(link, RESOURCE_ENERGY)
                    }
                } else {//from link
                    if (creep.store.getFreeCapacity() > 0) {
                        creep.withdraw(link, RESOURCE_ENERGY)
                    } else {
                        creep.transfer(structure, RESOURCE_ENERGY)
                    }
                }
            }
        }
    }
}

export default roleTransferer;