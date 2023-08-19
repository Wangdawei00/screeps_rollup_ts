const roleLongDistanceBuilder = {
    run: function (creep: Creep) {
        if (creep.memory.target && creep.memory.target !== creep.room.name) {
            if (Game.rooms[creep.memory.target]) {
                creep.MoveToTargetRoom();
            }
        } else {
            if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.building = false;
                creep.say('🔄 harvest');
            }
            if (!creep.memory.building && creep.store[RESOURCE_ENERGY] !== 0) {
                creep.memory.building = true;
                creep.say('🚧 build');
            }
            if (creep.memory.building) {
                const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                console.log(target)
                if (target) {
                    if (creep.build(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);

                    }
                }
            } else {
                if(!creep.WithdrawFromContainer()){
                    creep.PickupGarbage();
                }

            }
        }

    }
}

export default roleLongDistanceBuilder;