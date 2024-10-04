/**
 * train moves energy from A to B
 * Memory usage: srcFlagName, destFlagName, role
 * */
const roleTrain = {
    run: (creep: Creep) => {
        if (creep.memory.transporting && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transporting = true;
        }
        if (creep.memory.transporting) {
            if (creep.memory.destFlagName) {
                const target = Game.flags[creep.memory.destFlagName];
                if (target) {
                    if (!creep.pos.isEqualTo(target)) {
                        creep.moveTo(target);
                    } else {
                        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                            filter: object => object.structureType === STRUCTURE_CONTAINER
                        })
                        if (container) {
                            if (creep.transfer(container, RESOURCE_ENERGY) !== OK) {
                                creep.drop(RESOURCE_ENERGY);
                            }
                        }else{
                            creep.drop(RESOURCE_ENERGY);
                        }
                    }
                } else {
                    creep.moveTo(Game.flags["Idle"]);
                }
            } else {
                console.error("Check the trains' memory, it does not have destFlagName")
            }

        } else {// pick up resource
            if (creep.memory.srcFlagName) {
                const flag = Game.flags[creep.memory.srcFlagName];
                if (flag) {
                    if (creep.pos.isEqualTo(flag)) {
                        const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES); //TODO: subject to change after container was built
                        if (resource) {
                            creep.pickup(resource);
                        } else {
                            console.log("No resource available");
                        }
                    } else {
                        creep.moveTo(flag)
                    }
                } else {
                    console.error("There is no flag found, check the truck's memory")
                }
            }
        }
    }
}

export default roleTrain;