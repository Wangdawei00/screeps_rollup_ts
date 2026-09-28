import policy from "@/config/policy";
import type {RoomModel} from "@/colony/roomModel";
import {assessThreat} from "@/colony/defenseManager";
import {serializePosition} from "@/domain/types";

export function isIntelStale(intel: RoomIntelMemory | undefined): boolean {
    return !intel || Game.time - intel.lastSeen > policy.intelMaxAge;
}

export function username(): string | undefined {
    return Object.values(Game.rooms).find(room => room.controller?.my)?.controller?.owner?.username;
}

export function markRoomInaccessible(roomName: string, _reason?: string): void {
    const intel = Memory.intel[roomName] ||= {
        lastSeen: -policy.intelMaxAge - 1, sources: [], threat: assessThreat([]),
        keeper: false, highway: false, routes: {}
    };
    intel.inaccessibleUntil = Game.time + policy.remoteSuspensionDuration;
}

export function safeRoute(origin: string, target: string, fresh = true): {
    exit: ExitConstant;
    room: string
}[] | undefined {
    if (origin === target) return [];
    const mine = username();
    const allowed = (name: string): boolean => {
        if (name === origin || Game.rooms[name]?.controller?.my) return true;
        const intel = Memory.intel[name];
        if (intel?.inaccessibleUntil && intel.inaccessibleUntil > Game.time) return false;
        if (fresh && isIntelStale(intel)) return false;
        if (!fresh && isIntelStale(intel)) return !intel?.keeper;
        return !intel || (!intel.keeper && !intel.threat.total && (!intel.owner || intel.owner === mine));
    };
    if (!allowed(target)) return undefined;
    const route = Game.map.findRoute(origin, target, {routeCallback: name => allowed(name) ? 1 : Infinity});
    return typeof route === "number" || route.some(step => !allowed(step.room)) ? undefined : route;
}

export function updateIntel(room: Room, models?: ReadonlyMap<string, RoomModel>): void {
    const model = models?.get(room.name);
    const previous = Memory.intel[room.name];
    const coordinate = /^[WE](\d+)[NS](\d+)$/.exec(room.name);
    const x = coordinate ? Number(coordinate[1]) % 10 : -1;
    const y = coordinate ? Number(coordinate[2]) % 10 : -1;
    const mineral = (model?.minerals || room.find(FIND_MINERALS))[0];
    const routes = previous?.routes || {};
    const origins = models ? [...models.keys()] : Object.keys(Memory.colonies);
    for (const origin of origins) {
        if (routes[origin] && Game.time - routes[origin].updatedAt < policy.intelMaxAge) continue;
        const route = origin === room.name ? [] : Game.map.findRoute(origin, room.name);
        routes[origin] = {distance: typeof route === "number" ? -1 : route.length, updatedAt: Game.time};
    }
    Memory.intel[room.name] = {
        lastSeen: Game.time, owner: room.controller?.owner?.username,
        reservation: room.controller?.reservation ? {...room.controller.reservation} : undefined,
        controller: room.controller ? {
            id: room.controller.id, position: serializePosition(room.controller.pos), level: room.controller.level
        } : undefined,
        sources: (model?.sources || room.find(FIND_SOURCES)).map(source => ({
            id: source.id, position: serializePosition(source.pos), capacity: source.energyCapacity
        })),
        mineral: mineral ? {
            id: mineral.id,
            type: mineral.mineralType,
            position: serializePosition(mineral.pos)
        } : undefined,
        threat: assessThreat(model?.hostiles || room.find(FIND_HOSTILE_CREEPS)),
        keeper: x >= 4 && x <= 6 && y >= 4 && y <= 6 && !(x === 5 && y === 5),
        highway: x === 0 || y === 0, routes
    };
}

export function observeRoom(room: Room): void {
    updateIntel(room);
}

export function nearbyRooms(origin: string, distance = policy.maxRemoteDistance): string[] {
    const visited = new Set([origin]);
    let frontier = [origin];
    for (let depth = 0; depth < distance; depth++) {
        const next: string[] = [];
        for (const name of frontier) for (const neighbour of Object.values(Game.map.describeExits(name) || {})) {
            if (typeof neighbour === "string" && !visited.has(neighbour)) {
                visited.add(neighbour);
                next.push(neighbour);
            }
        }
        frontier = next;
    }
    visited.delete(origin);
    return [...visited].sort();
}