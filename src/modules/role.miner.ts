const roleMiner = {
    run: function (creep: Creep) {
        if (creep.memory.sourceId !== undefined && creep.memory.containerId !== undefined) {
            const source = Game.getObjectById(creep.memory.sourceId);
            const container = Game.getObjectById(creep.memory.containerId);
            if (source !== null && container != null) {
                if (!creep.pos.isEqualTo(container)) {
                    creep.moveTo(container);
                } else {
                    creep.harvest(source);
                }
            }
        }
    }
}
export default roleMiner;