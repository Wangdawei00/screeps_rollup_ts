const BuildRoad = (room: Room, point1: RoomPosition, point2: RoomPosition) => {
    room.findPath(point1, point2, {ignoreCreeps: true}).forEach((pos) => {
        room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
    });
}

module.exports = BuildRoad;
