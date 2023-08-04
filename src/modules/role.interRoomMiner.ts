const roleInterRoomMiner = {
    run: function (creep: Creep) {
        if (creep.memory.target && creep.room.name !== creep.memory.target) {
            if (Game.rooms[creep.memory.target]) {
                creep.MoveToTargetRoom();
            }
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
            } else if (!creep.memory.containerId && creep.memory.sourceId) {
                creep.HarvestSource();
            } else {
                const sources = creep.room.find(FIND_SOURCES);
                for (const source of sources) {
                    const creeps = creep.room.find(FIND_MY_CREEPS, {
                        filter: (c) => c.memory.role === "interRoomMiner" && c.memory.sourceId === source.id
                    });
                    if (creeps.length === 0) {
                        creep.memory.sourceId = source.id;
                        const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: (s) => s.structureType === STRUCTURE_CONTAINER
                        })
                        if (container.length > 0) {
                            creep.memory.containerId = <Id<StructureContainer>>container[0].id;
                        }
                        break;
                    }
                }
            }
        }
    }
}

export default roleInterRoomMiner;