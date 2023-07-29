const roleUpgrader = {

    /** @param {Creep} creep **/
    run: function (creep:Creep) {

        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.upgrading && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.upgrading = true;
            creep.say('⚡ upgrade');
        }

        if (creep.memory.upgrading) {
            if (creep.upgradeController(creep.room.controller as StructureController) === ERR_NOT_IN_RANGE) {
                creep.moveTo((<StructureController>creep.room.controller).pos, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        } else {
            const source = creep.pos.findClosestByPath(FIND_SOURCES)
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                }
            }
        }
    }
};
export default roleUpgrader;