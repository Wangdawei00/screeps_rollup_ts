/**
 * Memory Usage: role, body, room, IdleFlagName, wallMaxHits
 * */
const roleWallRepairer = {
    run: (creep: Creep) => {
        if (creep.memory.building && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.building = false
        }
        if (!creep.memory.building && creep.store.getUsedCapacity(RESOURCE_ENERGY) !== 0) {
            creep.memory.building = true
        }
        if (creep.memory.building) {
            const maxHits = creep.memory.wallMaxHits
            if (maxHits !== undefined) {
                const wall = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: w => w.structureType === STRUCTURE_WALL && w.hits < maxHits
                })
                if (wall) {
                    if (creep.repair(wall) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(wall);
                    }
                } else {
                    creep.memory.respawnInformed = true;
                    creep.gotoIdleFlag();
                }
            } else {
                console.log("wall repairer memory error!")
                Game.notify("Check wall repairer memory!")
            }

        } else {//pickup energy
            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK)
                    && s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY)
            })
            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container);
                }
            } else {
                creep.gotoIdleFlag()
            }
        }
    }
}

export default roleWallRepairer;