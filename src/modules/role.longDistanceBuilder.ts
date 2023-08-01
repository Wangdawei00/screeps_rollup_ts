const roleLongDistanceBuilder = {
    run: function (creep: Creep) {
        if (creep.memory.target !== creep.room.name) {
            creep.MoveToTargetRoom();
        } else {
            if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.building = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
                creep.memory.building = true;
                creep.say('🚧 build');
            }
            if (creep.memory.building) {
                const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                if (target) {
                    if (creep.build(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);

                    }
                }else{
                    creep.moveTo(Game.flags['Flag1']);
                }
            } else {
                creep.HarvestSource();
                creep.PickupGarbage();
                creep.WithdrawFromContainer();
            }
        }

    }
}

export default roleLongDistanceBuilder;