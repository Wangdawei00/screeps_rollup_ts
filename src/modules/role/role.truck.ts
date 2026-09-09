/**
 * This truck is from Energy source to all kinds of structure.
 * Memory usage: srcFlagName, role, body, room
 * */
const roleTruck = {
    run: function (creep: Creep) {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
            creep.memory.cache_dest_container_id = undefined;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        // Cache src
        creep.memory.cache_max_duration ??= 50; // Only for src. Dest not necessary
        creep.memory.cache_duration ??= 51;
        if (!creep.memory.srcFlagName) {
            console.log("Check " + creep.name + "'s memory, it does not have srcFlagName")
            return;
        }
        const srcFlag = Game.flags[creep.memory.srcFlagName];
        if (creep.memory.cache_duration > creep.memory.cache_max_duration) {
            const src_container_id = creep.findSrcContainer()
            if (src_container_id) {
                creep.memory.cache_src_container_id = src_container_id;
            } else {
                console.log("Warning! The srcFlag " + srcFlag.name + " does not have a container");
                creep.memory.cache_src_container_id = undefined;
                return;
            }
            creep.memory.cache_duration = 0;
        } else {
            creep.memory.cache_duration++;
        }
        // End Cache src

        // Validate dest cache
        if (creep.memory.cache_dest_container_id) {
            const target = Game.getObjectById(creep.memory.cache_dest_container_id);
            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.cache_dest_container_id = undefined;
            }
        }
        // End Validate dest cache



        if (creep.memory.transporting) {
            // Cache dest
            if (!creep.memory.cache_dest_container_id) {
                const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: structure => {
                        return (structure.structureType === STRUCTURE_EXTENSION
                                || structure.structureType === STRUCTURE_TOWER
                                || structure.structureType == STRUCTURE_SPAWN
                                || structure.structureType === STRUCTURE_LAB) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    }
                }) as StructureExtension | StructureLab | StructureSpawn | StructureTower | null;
                if (target) creep.memory.cache_dest_container_id = target.id;
            }
            // Cache dest

            if (creep.memory.cache_dest_container_id) {
                const target = Game.getObjectById(creep.memory.cache_dest_container_id);
                if (!target) {
                    creep.memory.cache_dest_container_id = undefined;
                    return;
                }
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {
                creep.gotoIdleFlag();
            }
        } else {
            if (srcFlag) {
                if (creep.pos.isNearTo(srcFlag) || creep.pos.isEqualTo(srcFlag)) {
                    const container = Game.getObjectById(creep.memory.cache_src_container_id!)
                    if (!container || (container && creep.withdraw(container, RESOURCE_ENERGY) !== OK)) {
                        creep.memory.cache_src_container_id = undefined;
                        creep.memory.cache_duration = creep.memory.cache_max_duration + 1; // Force recache
                        console.log("There is no container or link or storage at flag " + creep.memory.srcFlagName
                            + ". Please check " + creep.name + "'s memory.")
                    }
                } else {
                    creep.moveTo(srcFlag)
                }
            } else {
                console.log("There is no flag found, check " + creep.name + "'s memory")
            }
        }
    }
}

export default roleTruck;