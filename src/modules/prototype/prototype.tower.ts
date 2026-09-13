StructureTower.prototype.run = function () {
    if (this.store.getUsedCapacity(RESOURCE_ENERGY) <= 10) {
        return;
    }
    const room = this.room;

    const myCreeps = room.find(FIND_MY_CREEPS, {
        filter: c => c.hits < c.hitsMax
    });
    const creeps = room.find(FIND_HOSTILE_CREEPS);
    if (creeps.length > 0) {
        const creep = creeps[0];
        this.attack(creep);
        return;
    }
    if (myCreeps.length > 0) {
        const creep = myCreeps[0];
        this.heal(creep);
        return;
    }

}