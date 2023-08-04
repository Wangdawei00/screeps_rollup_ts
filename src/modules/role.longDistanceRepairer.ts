const roleLongDistanceRepairer = {
    run: function (creep: Creep) {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            if (Game.rooms[creep.memory.target]) {
                creep.MoveToTargetRoom();
            }
        } else {
            if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.repairing = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
                creep.memory.repairing = true;
                creep.say('🚧 repair');
            }
            if (creep.memory.repairing) {
                const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART);
                    }
                });
                if (target) {
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else {
                    creep.moveTo(Game.flags['Flag1']);
                }
            } else {
                creep.PickupGarbage();
                creep.HarvestSource();
                creep.WithdrawFromContainer()
            }
        }
    }
}

export default roleLongDistanceRepairer;