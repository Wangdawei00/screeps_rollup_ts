/**
 * Memory usage: destFlagName, toOrFromLink, role, body, room
 * */

const roleTransferer = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName];
            if (!creep.pos.isEqualTo(flag)) {
                creep.moveTo(flag)
            } else {
                const link = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_LINK
                })
                const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER
                })
                if (link && structure) {
                    if (creep.memory.toOrFromLink) {// to link
                        if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity(RESOURCE_ENERGY)) {
                            creep.withdraw(structure, RESOURCE_ENERGY)
                        } else {
                            creep.transfer(link, RESOURCE_ENERGY)
                        }
                    } else {//from link
                        if (creep.store[RESOURCE_ENERGY] < creep.store.getCapacity(RESOURCE_ENERGY)) {
                            creep.withdraw(link, RESOURCE_ENERGY)
                        } else {
                            creep.transfer(structure, RESOURCE_ENERGY)
                        }
                    }
                } else {
                    console.log("There is no link or structure! Check " + creep.name + "'s memory")
                }
            }
        }
    }
}

export default roleTransferer;