export function runKernel() {
    for (const creep in Memory.creeps) {
        if (!Game.creeps[creep]) {
            delete Memory.creeps[creep];
            console.log('Clearing non-existing creep memory:', creep);
        }
    }
}