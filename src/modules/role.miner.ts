const roleMiner = {
    run: function (creep: Creep) {
        if (creep.memory.sourceId !== undefined && creep.memory.containerId !== undefined) {
            const source = Game.getObjectById(creep.memory.sourceId);
            const container = Game.getObjectById(creep.memory.containerId);
            if (source && container) {
                if (!creep.pos.isEqualTo(container)) {
                    creep.moveTo(container);
                } else {
                    creep.harvest(source);
                }
            }
        }else if(creep.memory.sourceId !== undefined){
            const source = Game.getObjectById(creep.memory.sourceId);
            if (source) {
                // console.log(creep.pos.isNearTo(source))
                if (!creep.pos.isNearTo(source)) {
                    creep.moveTo(source);
                } else {
                    creep.harvest(source);
                }
            }
        }
    }
}
export default roleMiner;