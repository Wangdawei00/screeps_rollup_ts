/**
 * Memory usage: role, body, IdleFlagName, room
 * */
const roleRepairer = {
    run: function (creep: Creep) {
        if (creep.memory.IdleFlagName) {
            const room = Game.flags[creep.memory.IdleFlagName].room;
            if (room) {
                if (creep.room.name !== room.name) {
                    creep.moveTo(Game.flags[creep.memory.IdleFlagName]);
                } else {
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
                            creep.gotoIdleFlag()
                        }
                    } else {
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
                            const resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                                filter: r => r.resourceType === RESOURCE_ENERGY
                            })
                            if (resource) {
                                if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                                    creep.moveTo(resource)
                                } else {
                                    creep.gotoIdleFlag()
                                }
                            }
                        }
                    }
                }
            }
        }


    }
}

export default roleRepairer;