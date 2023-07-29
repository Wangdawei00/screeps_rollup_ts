import roleRepairer from "./role.repairer";
import {withdrawFromContainer} from "@/modules/utils";

const roleBuilder = {

    /** @param {Creep} creep **/
    run: function (creep: Creep) {

        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }

        if (creep.memory.building) {
            const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length) {
                if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                roleRepairer.run(creep);
            }
        } else {
            withdrawFromContainer(creep);
        }
    }
};
export default roleBuilder;