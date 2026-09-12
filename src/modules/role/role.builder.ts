/**
 * Memory usage: srcFlagName, role, body,room
 * */

const roleBuilder = {
    run: function (creep: Creep) {
        creep.memory.cache_duration ??= 51;
        creep.memory.cache_max_duration ??= 50;
        if (creep.memory.building && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
            creep.memory.cache_dest_construction_site_id = undefined;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.building = true;
            creep.say('🚧 build');
            creep.memory.cache_duration = creep.memory.cache_max_duration + 1; // Force recache
        }

        if (!creep.memory.srcFlagName) {
            console.log("Check " + creep.name + "'s memory, it does not have srcFlagName")
            return;
        }

        if (creep.memory.building) {
            if (creep.memory.cache_dest_construction_site_id) {
                const target = Game.getObjectById(creep.memory.cache_dest_construction_site_id);
                if (!target) {
                    creep.memory.cache_dest_construction_site_id = undefined;
                }
            }
            if (!creep.memory.cache_dest_construction_site_id) {
                const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                if (target) creep.memory.cache_dest_construction_site_id = target.id;
            }
            if (creep.memory.cache_dest_construction_site_id) {
                const target = Game.getObjectById(creep.memory.cache_dest_construction_site_id);
                if (!target) {
                    creep.memory.cache_dest_construction_site_id = undefined;
                    return;
                }
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {// no construction site
                creep.say("hooray!")
                creep.gotoIdleFlag();
                if (creep.memory.srcFlagName) {
                    if (creep.room.name === Game.flags[creep.memory.srcFlagName].room?.name) {
                        const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
                        if (sites.length === 0) {
                            creep.memory.respawnInformed = true
                        }
                    }
                }
            }
        } else {
            const srcFlag = Game.flags[creep.memory.srcFlagName];
            if (!srcFlag) {
                console.log("ERROR! Check " + creep.name + "'s memory, " + creep.memory.srcFlagName + " does not exist")
                return;
            }
            if (creep.pos.isEqualTo(srcFlag) || creep.pos.isNearTo(srcFlag)) {
                if (creep.memory.cache_max_duration < creep.memory.cache_duration) {
                    const src_container_id = creep.findSrcContainer()
                    if (src_container_id) {
                        creep.memory.cache_src_container_id = src_container_id;
                    } else {
                        console.log("Warning! The srcFlag " + creep.memory.srcFlagName + " does not have a container");
                        creep.memory.cache_src_container_id = undefined;
                    }
                    creep.memory.cache_duration = 0;
                } else {
                    creep.memory.cache_duration++;
                }
                const container = creep.memory.cache_src_container_id ? Game.getObjectById(creep.memory.cache_src_container_id) : undefined;
                const resources = srcFlag.pos.findInRange(FIND_DROPPED_RESOURCES, 0, {
                    filter: r =>
                        r.resourceType === RESOURCE_ENERGY && r.amount >= creep.store.getFreeCapacity()
                })
                const resource = resources.pop();
                if (resource) {
                    creep.pickup(resource);
                    return;
                }
                if (container) {
                    if (container.store.getUsedCapacity(RESOURCE_ENERGY) >= creep.store.getFreeCapacity()) {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                } else {
                    creep.memory.cache_duration = creep.memory.cache_max_duration + 1;
                }
            } else {
                creep.moveTo(srcFlag);
            }
        }
    }
}
export default roleBuilder;