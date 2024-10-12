/**
 * Memory usage: srcFlagName, role, body,room
 * */

const roleBuilder = {
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
                creep.say("hooray!")
                // creep.moveTo(Game.flags["Idle"]);
                creep.gotoIdleFlag();
                creep.memory.respawnInformed = true
            }
        } else {
            if (creep.memory.srcFlagName) {// Should have this attribute.
                const srcFlag = Game.flags[creep.memory.srcFlagName];
                if (creep.pos.isEqualTo(srcFlag)) {

                    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_CONTAINER ||
                                s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK) &&
                            s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY)
                    })
                    const source = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES)
                    if (container && creep.withdraw(container, RESOURCE_ENERGY) !== OK) {
                        creep.say("I cannot find the container")
                    }
                    if (source) creep.pickup(source); else console.log("No resources available for the builder to pickup")
                } else {
                    creep.moveTo(srcFlag);
                }
            } else {
                console.error("There is something wrong with builder's memory or code! Check it out.")
            }
        }
    }
}
export default roleBuilder;