/**
 * Memory usage: role, body, targetRoom (if the homeroom is not the same as the target room), room
 * */
const roleRepairer = {
    run: function (creep: Creep) {
        creep.memory.cache_duration ??= 51;
        creep.memory.cache_max_duration ??= 50;
        if (creep.memory.targetRoom) {
            if (creep.memory.cache_duration > creep.memory.cache_max_duration) {
                const room = Game.rooms[creep.memory.targetRoom];
                if (!room || creep.room.name !== creep.memory.targetRoom) {
                    const anchor = new RoomPosition(25, 25, creep.memory.targetRoom);
                    creep.moveTo(anchor);
                    return;
                } else {
                    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                                s.structureType === STRUCTURE_STORAGE) &&
                            s.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getCapacity(RESOURCE_ENERGY)
                    }) as StructureContainer | StructureStorage | null;
                    creep.memory.cache_src_container_id = container?.id;
                }
                creep.memory.cache_duration = 0;
            }

            if (!creep.memory.harvesting && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.harvesting = true;
            }
            if (creep.memory.harvesting && creep.store[RESOURCE_ENERGY] > 0) {
                creep.memory.harvesting = false;
            }
            if (creep.memory.harvesting) {
                creep.memory.cache_duration++;
                const container = Game.getObjectById(creep.memory.cache_src_container_id!);
                if (!container) {
                    creep.memory.cache_duration = creep.memory.cache_max_duration + 1;
                    return;
                } else {
                    if (!creep.pos.isNearTo(container)) {
                        creep.moveTo(container);
                    } else {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                }
            } else {
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax
                        && s.structureType !== STRUCTURE_WALL
                        && s.structureType !== STRUCTURE_RAMPART
                });
                if (target) {
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    creep.gotoIdleFlag();
                }
            }
        }
    }
}

export default roleRepairer;