import policy from "../config/policy";
import { serializePosition } from "../domain/types";
import type { PlannedStructure, SerializedPosition } from "../domain/types";
import type { RoomModel } from "./roomModel";
import { LAYOUT_REVISION, planLayout } from "../planning/layoutPlanner";
import { planSources } from "../planning/sourcePlanner";
import { compatible, planningMatrix, positionKey, range, walkableStructure } from "../planning/geometry";

export interface ConstructionDiagnostics {
    created: number;
    satisfied: number;
    blocked: number;
    deferred: number;
}

export function reconcilePlanning(model: RoomModel): void {
    const memory = Memory.colonies[model.name];
    const construction = memory.construction;
    const signature = model.structures.filter(s => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART)
        .map(s => `${s.id}:${s.structureType}:${s.pos.x}:${s.pos.y}`).sort().join("|");
    const anchorKey = memory.anchor ? positionKey(memory.anchor) : "";
    const terrain = model.room.getTerrain();
    const obstaclePositions = new Set(model.structures.filter(s => !walkableStructure(s)).map(s => positionKey(s.pos)));
    for (const site of model.constructionSites) {
        if (![STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART].some(type => type === site.structureType)) {
            obstaclePositions.add(positionKey(site.pos));
        }
    }
    const invalidSource = model.sources.some(source => {
        const plan = memory.sourcePlans[source.id];
        return !plan || plan.revision !== LAYOUT_REVISION || (plan.accessible &&
            [plan.workPosition, ...plan.path].some(pos => terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL ||
                obstaclePositions.has(positionKey(pos))));
    });
    if (memory.anchor && construction.revision === LAYOUT_REVISION && construction.lastRcl === model.controller.level &&
        construction.anchorKey === anchorKey && construction.structureSignature === signature && !invalidSource) return;
    const layout = planLayout(model.room, memory.anchor);
    if (!layout) {
        if (Game.time % 100 === 0) console.log(`[planning:${model.name}] No valid anchor`);
        return;
    }
    memory.anchor = layout.anchor;
    const plans = planSources(model.room, layout.anchor, LAYOUT_REVISION, layout.structures);
    memory.sourcePlans = plans;
    const planned = layout.structures;
    const add = (position: SerializedPosition, type: BuildableStructureConstant, rcl: number, priority: number): void => {
        const existing = planned.find(s => s.structureType === type && range(s.position, position) === 0);
        if (existing) {
            existing.minimumRcl = Math.min(existing.minimumRcl, rcl);
            existing.priority = Math.max(existing.priority, priority);
        } else {
            planned.push({ position: serializePosition(position), structureType: type, minimumRcl: rcl, priority });
        }
    };
    for (const plan of Object.values(plans)) {
        if (!plan.accessible) continue;
        add(plan.containerPosition, STRUCTURE_CONTAINER, 1, 90);
        for (const position of plan.path) add(position, STRUCTURE_ROAD, 2, 60);
    }
    const matrix = planningMatrix(model.room, model.structures, model.constructionSites);
    for (const intent of planned) {
        if (![STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART].some(type => type === intent.structureType)) {
            matrix.set(intent.position.x, intent.position.y, 255);
        }
    }
    const free = (pos: SerializedPosition, type: BuildableStructureConstant): boolean =>
        pos.x > 1 && pos.x < 48 && pos.y > 1 && pos.y < 48 &&
        terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL && matrix.get(pos.x, pos.y) < 255 &&
        !planned.some(s => range(s.position, pos) === 0 && !compatible(type, s.structureType)) &&
        !model.structures.some(s => range(s.pos, pos) === 0 && !compatible(type, s.structureType));
    const near = (target: SerializedPosition, distance: number, type: BuildableStructureConstant): SerializedPosition | undefined => {
        const candidates: SerializedPosition[] = [];
        for (let dx = -distance; dx <= distance; dx++) for (let dy = -distance; dy <= distance; dy++) {
            if (!dx && !dy) continue;
            const pos = { x: target.x + dx, y: target.y + dy, roomName: model.name };
            if (free(pos, type)) candidates.push(pos);
        }
        candidates.sort((a, b) => range(a, layout.anchor) - range(b, layout.anchor) || a.x - b.x || a.y - b.y);
        return candidates.find(pos => !PathFinder.search(new RoomPosition(pos.x, pos.y, model.name),
            { pos: new RoomPosition(layout.anchor.x, layout.anchor.y, model.name), range: 1 },
            { maxRooms: 1, maxOps: 3000, roomCallback: () => matrix }).incomplete);
    };
    const connect = (position: SerializedPosition, rcl = 2): void => {
        const result = PathFinder.search(new RoomPosition(position.x, position.y, model.name),
            { pos: new RoomPosition(layout.anchor.x, layout.anchor.y, model.name), range: 1 },
            { maxRooms: 1, maxOps: 5000, plainCost: 2, swampCost: 5, roomCallback: () => matrix });
        if (!result.incomplete) for (const pos of result.path) add(pos, STRUCTURE_ROAD, rcl, 55);
    };
    const controllerContainer = model.containers.find(c => range(c.pos, model.controller.pos) <= 3)?.pos ||
        near(model.controller.pos, 2, STRUCTURE_CONTAINER);
    if (controllerContainer) {
        add(controllerContainer, STRUCTURE_CONTAINER, 2, 65);
        connect(controllerContainer);
        const controllerLink = model.links.find(link => range(link.pos, model.controller.pos) <= 3)?.pos ||
            near(controllerContainer, 1, STRUCTURE_LINK);
        if (controllerLink) {
            add(controllerLink, STRUCTURE_LINK, 5, 52);
            matrix.set(controllerLink.x, controllerLink.y, 255);
        }
    }
    let sourceLinkRcl = 6;
    for (const plan of Object.values(plans)) {
        if (!plan.accessible) continue;
        const link = (plan.linkId ? model.links.find(s => s.id === plan.linkId)?.pos : undefined) ||
            near(plan.workPosition, 1, STRUCTURE_LINK);
        if (link) {
            add(link, STRUCTURE_LINK, Math.min(8, sourceLinkRcl++), 51);
            matrix.set(link.x, link.y, 255);
        }
    }
    for (const mineral of model.minerals) {
        add(mineral.pos, STRUCTURE_EXTRACTOR, 6, 35);
        const container = model.containers.find(c => range(c.pos, mineral.pos) <= 1)?.pos ||
            near(mineral.pos, 1, STRUCTURE_CONTAINER);
        if (container) {
            add(container, STRUCTURE_CONTAINER, 6, 34);
            connect(container, 6);
        }
    }
    construction.plannedSites = planned;
    construction.lastRcl = model.controller.level;
    construction.revision = LAYOUT_REVISION;
    construction.anchorKey = positionKey(layout.anchor);
    construction.structureSignature = signature;
    construction.lastPlannedAt = Game.time;
    construction.blocked = {};
}

export function runConstruction(model: RoomModel): ConstructionDiagnostics {
    const memory = Memory.colonies[model.name].construction;
    const diagnostics: ConstructionDiagnostics = { created: 0, satisfied: 0, blocked: 0, deferred: 0 };
    const counts = new Map<StructureConstant, number>();
    for (const structure of [...model.structures, ...model.constructionSites]) {
        counts.set(structure.structureType, (counts.get(structure.structureType) || 0) + 1);
    }
    const globalFree = Math.max(0, MAX_CONSTRUCTION_SITES - policy.constructionSiteSafetyMargin -
        Object.keys(Game.constructionSites).length);
    const limit = Math.min(policy.constructionSitesPerTick, globalFree);
    const terrain = model.room.getTerrain();
    const created: PlannedStructure[] = [];
    const intentions = memory.plannedSites.slice().sort((a, b) =>
        (b.structureType === STRUCTURE_SPAWN && model.spawns.length === 0 ? 1000 : b.priority) -
        (a.structureType === STRUCTURE_SPAWN && model.spawns.length === 0 ? 1000 : a.priority) ||
        a.minimumRcl - b.minimumRcl || a.position.x - b.position.x || a.position.y - b.position.y);
    for (const intention of intentions) {
        const { position, structureType } = intention;
        if (intention.minimumRcl > model.controller.level) { diagnostics.deferred++; continue; }
        const key = `${positionKey(position)}:${structureType}`;
        const occupants = model.structures.filter(s => range(s.pos, position) === 0);
        const sites = model.constructionSites.filter(s => range(s.pos, position) === 0);
        if (occupants.some(s => s.structureType === structureType) || sites.some(s => s.structureType === structureType) ||
            created.some(s => range(s.position, position) === 0 && s.structureType === structureType)) {
            diagnostics.satisfied++;
            delete memory.blocked[key];
            continue;
        }
        const prior = memory.blocked[key];
        if (prior && (prior.permanent || prior.retryAt > Game.time)) { diagnostics.blocked++; continue; }
        const block = (reason: string, permanent: boolean): void => {
            memory.blocked[key] = { reason, permanent, attempts: (prior?.attempts || 0) + 1,
                retryAt: Game.time + (permanent ? 100000 : 25) };
            diagnostics.blocked++;
        };
        if (position.roomName !== model.name || position.x <= 0 || position.x >= 49 || position.y <= 0 || position.y >= 49 ||
            terrain.get(position.x, position.y) === TERRAIN_MASK_WALL) { block("Invalid terrain or coordinate", true); continue; }
        if (occupants.some(s => !compatible(structureType, s.structureType))) { block("Conflicting structure", true); continue; }
        if (sites.length || created.some(s => range(s.position, position) === 0)) { diagnostics.deferred++; continue; }
        const allowed = CONTROLLER_STRUCTURES[structureType][model.controller.level] || 0;
        if ((counts.get(structureType) || 0) >= allowed || diagnostics.created >= limit) { diagnostics.deferred++; continue; }
        const result = model.room.createConstructionSite(position.x, position.y, structureType);
        if (result === OK) {
            diagnostics.created++;
            created.push(intention);
            counts.set(structureType, (counts.get(structureType) || 0) + 1);
            delete memory.blocked[key];
        } else {
            block(`createConstructionSite ${result}`, result === ERR_INVALID_TARGET || result === ERR_INVALID_ARGS);
        }
    }
    return diagnostics;
}