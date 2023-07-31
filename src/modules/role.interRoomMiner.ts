const roleInterRoomMiner = {
    run: function (creep: Creep) {
        if (creep.room.name !== creep.memory.target) {
            creep.MoveToTargetRoom();
        } else {
            if (creep.memory.containerId && creep.memory.sourceId) {
                const container = Game.getObjectById(creep.memory.containerId);
                const source = Game.getObjectById(creep.memory.sourceId);
                if (container && source) {
                    if (creep.pos.isEqualTo(container)) {
                        creep.harvest(source);
                    } else {
                        creep.moveTo(container);
                    }
                } else {
                    console.log("Error in role.interRoomMiner.ts: container or source is undefined")
                }
            } else {
                console.log("Error in role.interRoomMiner.ts: containerId or sourceId is undefined")
            }
        }
    }
}

export default roleInterRoomMiner;