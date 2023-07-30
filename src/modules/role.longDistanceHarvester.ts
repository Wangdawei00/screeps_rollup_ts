import {MoveFromHomeToTarget, MoveFromTargetToHome} from "@/modules/utils";

const roleLongDistanceHarvester = {
    run: function (creep: Creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            // switch state
            creep.memory.working = false;
        }
        // if creep is harvesting energy but is full
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            // switch state
            creep.memory.working = true;
        }

        // if creep is supposed to transfer energy to a structure
        if (creep.memory.working) {
            // if in home room
            if (creep.room.name == creep.memory.home) {
                // find the closest spawn, extension or tower which is not full
                let structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    // the second argument for findClosestByPath is an object which takes
                    // a property called filter which can be a function
                    // we use the arrow operator to define it
                    filter: (s) => (s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_TOWER || (
                                s.structureType == STRUCTURE_CONTAINER && Memory.sourceContainerIds.includes(s.id))
                        || s.structureType == STRUCTURE_STORAGE)
                        && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });

                // if we found one
                if (structure != undefined) {
                    // try to transfer energy, if it is not in range
                    if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        // move towards it
                        creep.moveTo(structure);
                    }
                }
            }
            // if not in home room...
            else {
                MoveFromTargetToHome(creep);
            }
        }
        // if creep is supposed to harvest energy from source
        else {
            // if in target room
            if (creep.room.name === creep.memory.target) {
                // find source
                if (!creep.memory.sourceId) {
                    const sources = creep.room.find(FIND_SOURCES);
                    if (sources.length > 0) {
                        creep.memory.sourceId = sources[0].id;
                    }
                }
                if (creep.memory.sourceId) {
                    const source = Game.getObjectById(creep.memory.sourceId);
                    if (source) {
                        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                            // move towards the source
                            creep.moveTo(source);
                        }
                    }
                    // try to harvest energy, if the source is not in range
                }
            }
            // if not in target room
            else {
                MoveFromHomeToTarget(creep);
            }
        }
    }
}

export default roleLongDistanceHarvester;