/**
 * Memory usage: role, body,
 * */
const roleRepairer = {
    run: function (creep: Creep) {
        if (!creep.memory.harvesting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.harvesting = true;
        }
        if (creep.memory.harvesting && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.harvesting = false;
        }
        if (!creep.memory.harvesting) {
            const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL
            });
            if (structure) {
                if (creep.repair(structure) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(structure);
                }
            } else {
                creep.moveTo(Game.flags['Idle'])
                // creep.gotoIdleFlag()
            }
        } else {
            /*const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: object => {
                    return object.amount >= creep.store.getCapacity(RESOURCE_ENERGY)
                        && object.resourceType === RESOURCE_ENERGY;
                }
            })
            if (resource) {
                if (creep.pickup(resource) != OK) {
                    creep.moveTo(resource);
                }
            }*/
            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE) &&
                    s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY)
            })
            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                    creep.moveTo(container);
                }
            } else {
                creep.moveTo(Game.flags['Idle'])
            }
        }
    }
}

export default roleRepairer;