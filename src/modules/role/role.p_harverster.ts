/**
 * Used memory: srcFlagName, role
 * */
const roleP_harverster = {
    run: function (creep: Creep) {
        // console.log("harvester running!");
        if (creep.memory.harvesting && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.harvesting = false;
        }

        if (!creep.memory.harvesting && creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.harvesting = true;
        }

        if (creep.memory.harvesting) {
            if (creep.memory.srcFlagName) {
                const flag = Game.flags[creep.memory.srcFlagName];
                if (creep.pos.isEqualTo(flag)) {
                    const source = creep.pos.findClosestByPath(FIND_SOURCES);
                    if (source) {
                        creep.harvest(source);
                    } else {
                        console.log("There should be a source nearby. Check harvester code and room.")
                    }
                } else {
                    creep.moveTo(flag);
                }
            } else {
                console.log("There is something wrong with harvester's memory. add destFlagName");
            }

        } else {
            const targets = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets) {
                const transferResult = creep.transfer(targets, RESOURCE_ENERGY);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets);
                }
            }
        }
    }
}

export default roleP_harverster;