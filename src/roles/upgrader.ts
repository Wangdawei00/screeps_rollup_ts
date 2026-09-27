import type { RoomModel } from "../colony/roomModel";
import { diagnostic, localStores, readyToWork, travel } from "./common";

export function runUpgrader(creep: Creep, model?: RoomModel): void {
    const assignment = creep.memory.assignment;
    if (assignment?.type !== "controller" || !travel(creep, creep.memory.homeRoom)) return;
    const controller = Game.getObjectById(assignment.controllerId);
    if (!controller?.my) {
        diagnostic(creep, "Assigned controller is missing or no longer owned");
        return;
    }
    const nearby = localStores(creep, model).filter(store =>
        (store.structureType === STRUCTURE_LINK || store.structureType === STRUCTURE_CONTAINER) &&
        store.pos.inRangeTo(controller, 3) && store.store[RESOURCE_ENERGY] > 0);
    const preferred = assignment.energySourceId || nearby.sort((a, b) =>
        a.pos.getRangeTo(controller) - b.pos.getRangeTo(controller))[0]?.id;
    if (!readyToWork(creep, model, preferred)) return;
    const result = creep.upgradeController(controller);
    if (result === ERR_NOT_IN_RANGE) {
        if (creep.moveTo(controller, { range: 3, reusePath: 20 }) === ERR_NO_PATH) diagnostic(creep, "Controller inaccessible");
    } else if (result !== OK && result !== ERR_NOT_ENOUGH_RESOURCES) diagnostic(creep, `Upgrade failed ${result}`);
}