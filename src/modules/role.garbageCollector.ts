import roleLorry from "@/modules/role.lorry";

const roleGarbageCollector = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER ||
                    s.structureType === STRUCTURE_CONTAINER)
                    && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {
                if (creep.room.storage) {
                    if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.storage);
                    }
                }
            }
        } else {
            const resource = creep.room.find(FIND_DROPPED_RESOURCES);
            if (resource.length > 0) {
                if (creep.pickup(resource[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(resource[0]);
                }
            } else {
                roleLorry.run(creep);
            }
        }

    }
}

export default roleGarbageCollector;