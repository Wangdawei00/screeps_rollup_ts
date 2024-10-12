/**
 * Memory Usage: destFlagName, role, body,room
 * */
const roleMelee = {
    run: (creep: Creep) => {
        if (creep.memory.destFlagName) {
            const flag = Game.flags[creep.memory.destFlagName]
            const room = flag.room;
            if (!room || room.name !== creep.room.name) {
                creep.moveTo(flag)
            } else {
                const non_source_keeper_hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                    filter: c => c.owner.username !== 'Source Keeper'
                });
                const source_keeper_hostile = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                    filter: c => c.owner.username === 'Source Keeper'
                })
                if (non_source_keeper_hostile) {
                    if (creep.attack(non_source_keeper_hostile) !== OK) {
                        creep.moveTo(non_source_keeper_hostile);
                    } else {
                        creep.moveTo(flag)
                    }
                } else if (source_keeper_hostile) {
                    creep.attack(source_keeper_hostile)
                    creep.moveTo(flag)
                } else {
                    creep.moveTo(flag);
                }
            }
        }
    }
}


export default roleMelee;