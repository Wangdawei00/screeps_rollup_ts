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
                    if (source) creep.harvest(source);
                    else {
                        const mineral = creep.pos.findClosestByPath(FIND_MINERALS);
                        if (mineral) {
                            creep.harvest(mineral)
                        } else {
                            console.log("Should have a mineral nearby")
                        }
                    }
                }
            } else {
                console.error("There should be a flag named " + creep.memory.srcFlagName)
            }
        } else {
            console.error("There should be a srcFlagName in creep's memory!");
        }

    }
}
export default roleMiner;