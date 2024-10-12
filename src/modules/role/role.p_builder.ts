/**
 * Memory usage: srcFlagName, role
 * */

const roleP_builder = {
    run: function (creep: Creep) {
        // console.log("Builder running!")
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.building && creep.store[RESOURCE_ENERGY] == creep.store.getCapacity(RESOURCE_ENERGY)) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }
        if (creep.memory.building) {
            const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
            if (target) {
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {// no construction site
                console.log("No construction site! hooray!")
            }
        } else {
            if (creep.memory.srcFlagName) {// Should have this attribute.
                const srcFlag = Game.flags[creep.memory.srcFlagName];
                if (creep.pos.isEqualTo(srcFlag)) {
                    const source = creep.pos.findClosestByPath(FIND_SOURCES)
                    if (source) creep.harvest(source); else console.log("No resources available for the builder to pickup")
                } else {
                    creep.moveTo(srcFlag);
                }
            } else {
                console.error("There is something wrong with builder's memory or code! Check it out.")
            }
        }
    }
}

export default roleP_builder;