StructureTower.prototype.run = function () {
    const room = this.room;
    const creeps = room.find(FIND_HOSTILE_CREEPS)
    if (creeps.length > 0) {
        const creep = creeps[0];
        this.attack(creep);
    }
}