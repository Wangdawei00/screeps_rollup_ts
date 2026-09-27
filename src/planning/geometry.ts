import type { SerializedPosition } from "../domain/types";

export function range(a: SerializedPosition, b: SerializedPosition): number {
    return a.roomName === b.roomName ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;
}

export function positionKey(position: SerializedPosition): string {
    return `${position.roomName}:${position.x}:${position.y}`;
}

export function compatible(a: StructureConstant, b: StructureConstant): boolean {
    if (a === b) return true;
    if (a === STRUCTURE_WALL || b === STRUCTURE_WALL) return false;
    if (a === STRUCTURE_RAMPART || b === STRUCTURE_RAMPART) return true;
    return (a === STRUCTURE_ROAD && b === STRUCTURE_CONTAINER) ||
        (b === STRUCTURE_ROAD && a === STRUCTURE_CONTAINER);
}

export function walkableStructure(structure: AnyStructure): boolean {
    return structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER ||
        (structure.structureType === STRUCTURE_RAMPART && (structure.my || structure.isPublic));
}

export function planningMatrix(room: Room, structures: AnyStructure[], sites: ConstructionSite[]): CostMatrix {
    const matrix = new PathFinder.CostMatrix();
    for (const structure of structures) {
        if (!walkableStructure(structure)) matrix.set(structure.pos.x, structure.pos.y, 255);
        else if (structure.structureType === STRUCTURE_ROAD) matrix.set(structure.pos.x, structure.pos.y, 1);
    }
    for (const site of sites) {
        if (![STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART].some(type => type === site.structureType)) {
            matrix.set(site.pos.x, site.pos.y, 255);
        }
    }
    for (const source of room.find(FIND_SOURCES)) matrix.set(source.pos.x, source.pos.y, 255);
    for (const mineral of room.find(FIND_MINERALS)) matrix.set(mineral.pos.x, mineral.pos.y, 255);
    if (room.controller) matrix.set(room.controller.pos.x, room.controller.pos.y, 255);
    return matrix;
}
