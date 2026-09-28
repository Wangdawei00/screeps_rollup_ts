import {serializePosition} from "@/domain/types";
import type {PlannedStructure, SerializedPosition, SourcePlan} from "@/domain/types";
import {planningMatrix, range} from "@/planning/geometry";

export function planSources(room: Room, anchor: SerializedPosition, revision = 1,
                            plannedStructures: readonly PlannedStructure[] = []): Record<string, SourcePlan> {
    const structures = room.find(FIND_STRUCTURES);
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const terrain = room.getTerrain();
    const matrix = planningMatrix(room, structures, sites);
    for (const planned of plannedStructures) {
        if (![STRUCTURE_ROAD, STRUCTURE_RAMPART, STRUCTURE_CONTAINER].some(type => type === planned.structureType)) {
            matrix.set(planned.position.x, planned.position.y, 255);
        }
    }
    const sources = room.find(FIND_SOURCES).sort((a, b) => a.id.localeCompare(b.id));
    const plans: Record<string, SourcePlan> = {};
    const taken = new Set<string>();
    for (const source of sources) {
        const candidates: { position: SerializedPosition; path: RoomPosition[]; score: number }[] = [];
        for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
            for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49 || terrain.get(x, y) === TERRAIN_MASK_WALL ||
                    matrix.get(x, y) === 255 || taken.has(`${x}:${y}`)) continue;
                const position = {x, y, roomName: room.name};
                const result = PathFinder.search(new RoomPosition(x, y, room.name), {
                    pos: new RoomPosition(anchor.x, anchor.y, anchor.roomName), range: 1
                }, {maxRooms: 1, maxOps: 5000, plainCost: 2, swampCost: 10, roomCallback: () => matrix});
                if (result.incomplete) continue;
                const hasContainer = structures.some(s => s.structureType === STRUCTURE_CONTAINER && range(s.pos, position) === 0);
                let exits = 0;
                for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
                    if ((dx || dy) && terrain.get(x + dx, y + dy) !== TERRAIN_MASK_WALL &&
                        matrix.get(x + dx, y + dy) < 255) exits++;
                }
                candidates.push({
                    position,
                    path: result.path,
                    score: result.cost - (hasContainer ? 1000 : 0) - exits / 10
                });
            }
        }
        candidates.sort((a, b) => a.score - b.score || a.position.x - b.position.x || a.position.y - b.position.y);
        const selected = candidates[0];
        const position = selected?.position || serializePosition(source.pos);
        const path = selected?.path.map(serializePosition) || [];
        const income = selected ? source.energyCapacity / ENERGY_REGEN_TIME : 0;
        const container = structures.find((s): s is StructureContainer =>
            s.structureType === STRUCTURE_CONTAINER && range(s.pos, position) === 0);
        const link = structures.find((s): s is StructureLink =>
            s.structureType === STRUCTURE_LINK && s.my && range(s.pos, position) <= 1);
        if (selected) taken.add(`${position.x}:${position.y}`);
        // Planned roads give a loaded road hauler one tile per tick; swamp routes remain conservative until paved.
        const returnTicks = path.reduce((ticks, pos) => ticks +
            (terrain.get(pos.x, pos.y) === TERRAIN_MASK_SWAMP &&
            !structures.some(s => s.structureType === STRUCTURE_ROAD && range(s.pos, pos) === 0) ? 5 : 1), 0);
        plans[source.id] = {
            sourceId: source.id,
            workPosition: position,
            containerPosition: {...position},
            containerId: container?.id,
            linkId: link?.id,
            path,
            pathLength: path.length,
            expectedIncome: income,
            carryRequirement: selected ? Math.ceil(income * (path.length + returnTicks + 2) / CARRY_CAPACITY) : 0,
            revision,
            accessible: !!selected, ...(!selected ? {reason: "No reachable adjacent work tile"} : {})
        };
    }
    return plans;
}