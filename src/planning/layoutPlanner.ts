import { serializePosition } from "../domain/types";
import type { PlannedStructure, SerializedPosition } from "../domain/types";
import { compatible, planningMatrix, positionKey, range } from "./geometry";

export type { PlannedStructure } from "../domain/types";
export const LAYOUT_REVISION = 1;

export function planLayout(room: Room, requestedAnchor?: SerializedPosition):
    { anchor: SerializedPosition; structures: PlannedStructure[] } | undefined {
    const terrain = room.getTerrain();
    const existing = room.find(FIND_STRUCTURES);
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const sources = room.find(FIND_SOURCES);
    const minerals = room.find(FIND_MINERALS);
    const occupied = [...existing, ...sites];
    const valid = (position: SerializedPosition, type: BuildableStructureConstant): boolean =>
        position.roomName === room.name && position.x > 1 && position.x < 48 && position.y > 1 && position.y < 48 &&
        terrain.get(position.x, position.y) !== TERRAIN_MASK_WALL &&
        !sources.some(source => range(source.pos, position) <= (type === STRUCTURE_ROAD ? 0 : 1)) &&
        !minerals.some(mineral => range(mineral.pos, position) <= (type === STRUCTURE_ROAD ? 0 : 1)) &&
        (!room.controller || range(room.controller.pos, position) > (type === STRUCTURE_ROAD ? 0 : 2)) &&
        !occupied.some(structure => range(structure.pos, position) === 0 && !compatible(type, structure.structureType));
    const spawns = existing.filter((s): s is StructureSpawn => s.structureType === STRUCTURE_SPAWN && s.my)
        .sort((a, b) => a.id.localeCompare(b.id));
    const candidates: SerializedPosition[] = [];
    if (requestedAnchor && valid(requestedAnchor, STRUCTURE_SPAWN)) candidates.push(requestedAnchor);
    if (!candidates.length) {
        candidates.push(...spawns.map(spawn => serializePosition(spawn.pos)));
        for (let x = 5; x <= 44; x += 3) for (let y = 5; y <= 44; y += 3) candidates.push({ x, y, roomName: room.name });
        const score = (position: SerializedPosition): number => {
            let space = 0;
            for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) {
                if (valid({ x: position.x + dx, y: position.y + dy, roomName: room.name }, STRUCTURE_EXTENSION)) space++;
            }
            return space * 2 - sources.reduce((sum, source) => sum + range(source.pos, position), 0) -
                (room.controller ? range(room.controller.pos, position) : 0) +
                (spawns.some(spawn => range(spawn.pos, position) === 0) ? 10000 : 0);
        };
        const scores = new Map(candidates.map(position => [positionKey(position), score(position)]));
        candidates.sort((a, b) => scores.get(positionKey(b))! - scores.get(positionKey(a))! || a.x - b.x || a.y - b.y);
    }
    if (!candidates.some(position => valid(position, STRUCTURE_SPAWN))) {
        for (let x = 2; x < 48; x++) for (let y = 2; y < 48; y++) {
            const position = { x, y, roomName: room.name };
            if (valid(position, STRUCTURE_SPAWN)) candidates.push(position);
        }
    }
    const matrix = planningMatrix(room, existing, sites);
    const viable = candidates.filter(position => valid(position, STRUCTURE_SPAWN));
    const anchor = viable.slice(0, 12).find(position => {
        if (spawns.some(spawn => range(spawn.pos, position) === 0)) return true;
        const origin = new RoomPosition(position.x, position.y, room.name);
        const reachable = (target: RoomPosition, distance: number): boolean =>
            !PathFinder.search(origin, { pos: target, range: distance },
                { maxRooms: 1, maxOps: 5000, roomCallback: () => matrix }).incomplete;
        return (!room.controller || reachable(room.controller.pos, 3)) &&
            (!sources.length || sources.some(source => reachable(source.pos, 1)));
    });
    if (!anchor) return undefined;
    const structures: PlannedStructure[] = [];
    const used = new Map<string, BuildableStructureConstant>();
    const roads = new Set<string>();
    // Reserve access before placing buildings, including corridors to all economic objects.
    for (const target of [...sources, ...(room.controller ? [room.controller] : [])]) {
        const result = PathFinder.search(new RoomPosition(anchor.x, anchor.y, room.name), { pos: target.pos, range: 1 },
            { maxRooms: 1, maxOps: 5000, plainCost: 2, swampCost: 5, roomCallback: () => matrix });
        for (const position of result.path) if (valid(position, STRUCTURE_ROAD)) roads.add(positionKey(position));
    }
    const corridors = new Set(roads);
    const add = (position: SerializedPosition, type: BuildableStructureConstant, rcl: number, priority: number): boolean => {
        const key = positionKey(position);
        if (!valid(position, type) || used.has(key) || (type !== STRUCTURE_ROAD && roads.has(key))) return false;
        used.set(key, type);
        structures.push({ position: serializePosition(position), structureType: type, minimumRcl: rcl, priority });
        return true;
    };
    roads.delete(positionKey(anchor));
    add(anchor, STRUCTURE_SPAWN, 1, 100);
    const slots: SerializedPosition[] = [];
    for (let radius = 1; radius <= 12; radius++) for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const position = { x: anchor.x + dx, y: anchor.y + dy, roomName: room.name };
            if ((dx + dy) % 2 === 0) slots.push(position);
            else if (radius <= 9 && valid(position, STRUCTURE_ROAD)) roads.add(positionKey(position));
        }
    }
    const place = (type: BuildableStructureConstant, rcl: number, priority: number): void => {
        const position = slots.find(slot => valid(slot, type) && !used.has(positionKey(slot)) && !roads.has(positionKey(slot)));
        if (position) add(position, type, rcl, priority);
    };
    place(STRUCTURE_STORAGE, 4, 70);
    place(STRUCTURE_TOWER, 3, 80);
    place(STRUCTURE_TERMINAL, 6, 45);
    place(STRUCTURE_FACTORY, 7, 35);
    place(STRUCTURE_LINK, 5, 50);
    // A compact ten-lab cluster: both central inputs reach every peripheral output.
    const labOffsets = [[0, 0], [0, 2], [-1, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [1, 2], [-2, 1], [2, 1]];
    for (const center of slots) {
        const cluster = labOffsets.map(([dx, dy]) => ({ x: center.x + dx, y: center.y + dy, roomName: room.name }));
        if (!cluster.every(pos => valid(pos, STRUCTURE_LAB) && !used.has(positionKey(pos)))) continue;
        // Preserve the actual source/controller corridors (checkerboard filler roads may be replaced).
        if (cluster.some(pos => corridors.has(positionKey(pos)))) continue;
        cluster.forEach((pos, index) => {
            roads.delete(positionKey(pos));
            add(pos, STRUCTURE_LAB, index < 3 ? 6 : index < 6 ? 7 : 8, 30);
        });
        break;
    }
    for (let i = 0; i < 60; i++) {
        const rcl = i < 5 ? 2 : i < 10 ? 3 : i < 20 ? 4 : i < 30 ? 5 : i < 40 ? 6 : i < 50 ? 7 : 8;
        place(STRUCTURE_EXTENSION, rcl, 85);
    }
    place(STRUCTURE_SPAWN, 7, 95);
    place(STRUCTURE_SPAWN, 8, 95);
    for (const rcl of [5, 7, 8, 8, 8]) place(STRUCTURE_TOWER, rcl, 80);
    place(STRUCTURE_OBSERVER, 8, 20);
    place(STRUCTURE_POWER_SPAWN, 8, 20);
    place(STRUCTURE_NUKER, 8, 10);
    for (const key of roads) {
        const [, x, y] = key.split(":");
        const position = { x: Number(x), y: Number(y), roomName: room.name };
        const adjacentRcl = structures.filter(s => s.structureType !== STRUCTURE_ROAD && range(s.position, position) <= 1)
            .reduce((minimum, s) => Math.min(minimum, s.minimumRcl), 8);
        add(position, STRUCTURE_ROAD, corridors.has(key) ? 2 : Math.max(2, adjacentRcl), 40);
    }
    for (const structure of structures.slice()) {
        if ([STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TOWER, STRUCTURE_TERMINAL].some(type => type === structure.structureType)) {
            structures.push({ ...structure, structureType: STRUCTURE_RAMPART, minimumRcl: Math.max(2, structure.minimumRcl), priority: 25 });
        }
    }
    return { anchor: serializePosition(anchor), structures };
}
