// const roleGarbageCollector = {
//     run: function (creep: Creep) {
//         if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
//             creep.memory.transporting = false;
//         }
//         if (!creep.memory.transporting && creep.store[RESOURCE_ENERGY] > 0) {
//             creep.memory.transporting = true;
//         }
//         if (creep.memory.transporting) {
//             const target = creep.room.storage
//             if (target) {
//                 if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//                     creep.moveTo(target);
//                 }
//             } else {
//                 let newTarget;
//                 if (!creep.memory.storedTargetID) {
//                     newTarget = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
//                         filter: (structure) => {
//                             return (structure.structureType === STRUCTURE_EXTENSION ||
//                                     structure.structureType === STRUCTURE_SPAWN ||
//                                     structure.structureType === STRUCTURE_TOWER) &&
//                                 structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && structure.room === creep.room
//                         }
//                     })
//                 } else {
//                     newTarget = Game.getObjectById(creep.memory.storedTargetID);
//                 }
//                 if (newTarget) {
//                     creep.memory.storedTargetID = newTarget.id;
//                     if (creep.transfer(newTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//                         creep.moveTo(newTarget);
//                     }
//                 } else {
//
//                 }
//             }
//
//         }
//     } else {
//         creep.PickupGarbage();
//     }
//
// }
// }
//
// export default roleGarbageCollector;