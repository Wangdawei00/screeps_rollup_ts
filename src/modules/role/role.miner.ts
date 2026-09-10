/**
 * MemoryUsage: srcFlagName, role, body, room
 * */
const roleMiner = {
    run: function (creep: Creep) {
        if (creep.memory.srcFlagName) {
            const flag = Game.flags[creep.memory.srcFlagName];
            if (flag) {
                if (!creep.pos.isEqualTo(flag)) {//If creep does not reach flag
                    creep.moveTo(flag);
                } else {//If it reaches the flag, it will start harvesting
                    if (!creep.memory.cache_miner_source_id) {
                        const sources = creep.pos.findInRange(FIND_SOURCES, 1);
                        if (sources.length === 0) {
                            // This is a mineral harvester
                            const minerals = creep.pos.findInRange(FIND_MINERALS, 1);
                            if (minerals.length > 0) {
                                creep.memory.cache_miner_source_id = minerals[0].id;
                            } else {
                                console.log("There should be a source or mineral nearby. Check " + creep.name + "'s memory")
                            }
                        } else {
                            // This is an energy harvester
                            const source = sources[0];
                            creep.memory.cache_miner_source_id = source.id;
                        }
                    }
                    if (creep.memory.cache_miner_source_id) {
                        const resource = Game.getObjectById(creep.memory.cache_miner_source_id);
                        if (resource) {
                            if(creep.harvest(resource) !== OK) {
                                creep.memory.cache_miner_source_id = undefined
                            }
                        }
                        if (resource instanceof Mineral) {
                            resource.mineralAmount === 0 ? creep.memory.respawnInformed = true : null;
                        }
                    } else {
                        console.log("There should be a source or mineral. ERROR!");
                    }
                }
            } else {
                console.log("There should be a flag named " + creep.memory.srcFlagName + ". Check it out")
            }
        } else {
            console.log("There should be a srcFlagName in" + creep.name + "'s memory!");
        }
    }
}
export default roleMiner;