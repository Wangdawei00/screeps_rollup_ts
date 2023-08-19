const roleRepairer = {
    run: (creep: Creep) => {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store[RESOURCE_ENERGY] > 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {
            const structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_RAMPART
            });
            if (structure) {
                if (creep.repair(structure) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(structure);
                }
            }else{
                if(creep.room.memory.idleFlagNames){
                    creep.moveTo(Game.flags[creep.room.memory.idleFlagNames[0]])
                }
            }
        } else {
            creep.WithdrawFromStorage();
        }
    }
}
export default roleRepairer;