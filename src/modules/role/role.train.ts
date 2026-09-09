/**
 * train moves energy from A to B
 * Memory usage: srcFlagName, destFlagName, role, room, mineralType(if this is a mineral train)
 * */
const roleTrain = {
    run: (creep: Creep) => {
        const resourceConstant = creep.memory.mineralType ?? RESOURCE_ENERGY
        if (creep.memory.transporting && creep.store.getUsedCapacity(resourceConstant) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(resourceConstant) === 0) {
            creep.memory.transporting = true;
        }
        creep.memory.cache_max_duration ??= 50;
        creep.memory.cache_duration ??= 51;
        if (!creep.memory.destFlagName || !creep.memory.srcFlagName) {
            console.log("Check " + creep.name + "'s memory, it does not have destFlagName or srcFlagName")
            return;
        }
        const destFlag = Game.flags[creep.memory.destFlagName];
        const srcFlag = Game.flags[creep.memory.srcFlagName];
        if (creep.memory.cache_duration > creep.memory.cache_max_duration) {
            // Deal with dest container MUST HAVE
            const container_id = creep.findDestContainer(resourceConstant);
            if (container_id) {
                creep.memory.cache_dest_container_id = container_id;
            } else {
                console.log("ERROR! The destFlag " + creep.memory.destFlagName + " does not have a container or link");
                return;
            }

            // Deal with src container OPTIONALLY HAVE
            const src_container_id = creep.findSrcContainer();
            if (src_container_id) {
                creep.memory.cache_src_container_id = src_container_id;
            } else {
                console.log("Warning! The srcFlag " + srcFlag.name + " does not have a container");
                creep.memory.cache_src_container_id = undefined;
            }
            creep.memory.cache_duration = 0;

        } else {
            creep.memory.cache_duration++;
        }

        if (creep.memory.transporting) {
            if (!creep.pos.isNearTo(destFlag)) {
                creep.moveTo(destFlag);
            } else {
                const container = Game.getObjectById(creep.memory.cache_dest_container_id!)
                if (container) {
                    if (creep.transfer(container, resourceConstant) !== OK) {
                        creep.say("container full")
                    }
                } else {
                    creep.memory.cache_duration = creep.memory.cache_max_duration + 1;
                }
            }
        } else {// pick up resource
            if (srcFlag.room && srcFlag.room.name === creep.room.name) {
                const resources = srcFlag.pos.findInRange(FIND_DROPPED_RESOURCES, 0, {
                    filter: r => r.amount >= creep.store.getFreeCapacity(resourceConstant)
                });
                const container = creep.memory.cache_src_container_id ? Game.getObjectById(creep.memory.cache_src_container_id) : undefined
                if (resources.length > 0 || (container &&
                    container.store.getUsedCapacity(resourceConstant) >= creep.store.getFreeCapacity(resourceConstant))) {
                    const resource = resources.pop();
                    if (resource) {
                        if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(resource);
                        }
                    } else if (container) {
                        if (creep.withdraw(container, resourceConstant) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(container)
                            // console.log("Cannot withdraw from container")
                        }
                    }
                } else {
                    creep.gotoIdleFlag()
                    if (resourceConstant !== RESOURCE_ENERGY) {
                        const minerals = creep.room.find(FIND_MINERALS)
                        const mineral = minerals.pop();
                        if (!mineral?.mineralAmount) {
                            creep.memory.respawnInformed = true
                        }
                    }
                }
            } else {
                creep.moveTo(srcFlag);
            }
        }
    }
}

export default roleTrain;