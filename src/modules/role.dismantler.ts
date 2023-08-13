const roleDismantler = {
    run: function(creep: Creep) {
        if(creep.memory.targetFlagName){
            const targetFlag = Game.flags[creep.memory.targetFlagName];
            if(targetFlag){
                const target = targetFlag.pos.lookFor(LOOK_STRUCTURES)[0];
                if(target.structureType === STRUCTURE_WALL){
                    if(creep.dismantle(target) === ERR_NOT_IN_RANGE){
                        creep.moveTo(target);
                    }
                }
            }
        }
    }
}

export default roleDismantler;