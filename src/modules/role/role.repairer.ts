/**
 * Memory usage: role, body, targetRoom (if the homeroom is not the same as the target room), room
 * */
const roleRepairer = {
    run: function (creep: Creep) {
        if (creep.memory.targetRoom) {
            if (creep.room.name !== creep.memory.targetRoom) {
                const anchor = new RoomPosition(25, 25, creep.memory.targetRoom);
                creep.moveTo(anchor);
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
                                s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK) &&
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
                        } else {
                            creep.gotoIdleFlag()
                        }
                    }
                }
            }
        } else {
            creep.memory.targetRoom = creep.room.name;
        }
    }
}

export default roleRepairer;