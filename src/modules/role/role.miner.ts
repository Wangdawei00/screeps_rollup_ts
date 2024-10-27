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
                    const source = creep.pos.findClosestByPath(FIND_SOURCES);
                    if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        // This is a mineral harvester
                        const mineral = creep.pos.findClosestByPath(FIND_MINERALS);
                        if (mineral && mineral.mineralAmount > 0) {
                            creep.harvest(mineral)
                        } else {//mineral exhausted
                            // console.log("Should have a mineral nearby.Check " + creep.name + "'s memory")
                            creep.memory.respawnInformed = true;
                        }
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