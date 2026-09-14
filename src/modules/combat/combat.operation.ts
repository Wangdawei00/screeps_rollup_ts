export function runCombatOperation() {
    Memory.combatOperations ??= {};

    for (const operationId in Memory.combatOperations) {
        const operation = Memory.combatOperations[operationId];
        const members = Object.values(Game.creeps).filter(
            creep => creep.memory.operationId === operationId
        );

        if (operation.state === "complete") {
            continue;
        }

        const counts = {
            melee: members.filter(
                creep => creep.memory.combatClass === "melee"
            ).length,
            ranger: members.filter(
                creep => creep.memory.combatClass === "ranger"
            ).length,
            healer: members.filter(
                creep => creep.memory.combatClass === "healer"
            ).length,
        };

        const ready =
            counts.melee >= operation.required.melee &&
            counts.ranger >= operation.required.ranger &&
            counts.healer >= operation.required.healer;

        const shouldRetreat = members.some(
            creep =>
                creep.hits / creep.hitsMax <
                operation.retreatHitsRatio
        );

        if (shouldRetreat) {
            operation.state = "retreating";
        } else if (operation.state === "forming" && ready) {
            operation.state = "travelling";
        } else if (
            operation.state === "travelling" &&
            members.length > 0 &&
            members.every(
                creep => creep.room.name === operation.targetRoom
            )
        ) {
            operation.state = "engaging";
        }
    }
}


Creep.prototype.runCombatRole = function () {

}