StructureLink.prototype.run = function () {
    const storage = this.room.storage;
    if (storage) {
        const targetLink = storage.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_LINK
        })
        if (targetLink && targetLink.pos.inRangeTo(storage.pos, 3) && !targetLink.pos.isEqualTo(this.pos)
            && this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            this.transferEnergy(targetLink as StructureLink);
        }
    }
}