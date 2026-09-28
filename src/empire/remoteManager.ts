import policy from "@/config/policy";
import type {RoomModel} from "@/colony/roomModel";
import type {CreepDemand, RemoteRecord, SerializedPosition, SourcePlan} from "@/domain/types";
import {serializePosition} from "@/domain/types";
import {
    buildDefender,
    buildMiner,
    buildReserver,
    buildTransporter,
    buildWorker,
    bodyCost
} from "@/planning/bodyBuilder";
import {planningMatrix} from "@/planning/geometry";
import {upsertLogisticsJob} from "@/colony/logisticsManager";
import {isIntelStale, nearbyRooms, safeRoute, username} from "@/empire/intelManager";

const evaluated = new Map<string, number>();

export function healthyOrigin(model: RoomModel): boolean {
    return model.stage === "stable" && model.spawns.length > 0 && !!model.storage &&
        model.storageEnergy >= policy.storageEnergyReserve && !model.hostiles.length;
}

function suspend(record: RemoteRecord, reason: string): void {
    if (record.stage !== "suspended" || record.reason !== reason) {
        record.changedAt = Game.time;
        record.suspendedUntil = Game.time + policy.remoteSuspensionDuration;
    }
    record.stage = "suspended";
    record.reason = reason;
}

function planRemote(model: RoomModel, room: Room, route: { room: string }[]): Record<string, SourcePlan> {
    const home = model.storage?.pos || model.spawns[0].pos;
    const allowed = new Set([model.name, ...route.map(step => step.room)]);
    const matrices = new Map<string, CostMatrix>();
    for (const name of allowed) {
        const visible = Game.rooms[name];
        if (visible) matrices.set(name, planningMatrix(visible, visible.find(FIND_STRUCTURES), visible.find(FIND_CONSTRUCTION_SITES)));
    }
    const structures = room.find(FIND_STRUCTURES);
    const terrain = room.getTerrain();
    const plans: Record<string, SourcePlan> = {};
    const occupied = new Set<string>();
    for (const source of room.find(FIND_SOURCES)) {
        let best: { position: SerializedPosition; result: PathFinderPath; score: number } | undefined;
        for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
            if (x < 1 || x > 48 || y < 1 || y > 48 || (x === source.pos.x && y === source.pos.y) ||
                terrain.get(x, y) === TERRAIN_MASK_WALL || matrices.get(room.name)?.get(x, y) === 255 ||
                occupied.has(`${x}:${y}`)) continue;
            const result = PathFinder.search(new RoomPosition(x, y, room.name), {pos: home, range: 1}, {
                maxRooms: allowed.size, maxOps: 20000, plainCost: 2, swampCost: 10,
                roomCallback: name => allowed.has(name) ? matrices.get(name) || true : false
            });
            if (result.incomplete) continue;
            const container = structures.some(s => s.structureType === STRUCTURE_CONTAINER && s.pos.x === x && s.pos.y === y);
            const score = result.cost - (container ? 1000 : 0);
            if (!best || score < best.score) best = {position: {x, y, roomName: room.name}, result, score};
        }
        if (!best) continue;
        const selected = best;
        occupied.add(`${selected.position.x}:${selected.position.y}`);
        const container = structures.find((s): s is StructureContainer => s.structureType === STRUCTURE_CONTAINER &&
            s.pos.x === selected.position.x && s.pos.y === selected.position.y);
        const path = selected.result.path.map(serializePosition);
        const returnTicks = path.reduce((sum, pos) => sum +
            (Game.map.getRoomTerrain(pos.roomName).get(pos.x, pos.y) === TERRAIN_MASK_SWAMP ? 5 : 1), 0);
        const income = source.energyCapacity / ENERGY_REGEN_TIME;
        plans[source.id] = {
            sourceId: source.id, workPosition: selected.position, containerPosition: selected.position,
            containerId: container?.id, path, pathLength: path.length, expectedIncome: income,
            carryRequirement: Math.ceil(income * (path.length + returnTicks + 2) / CARRY_CAPACITY),
            revision: Game.time, accessible: true
        };
    }
    return plans;
}

export function runRemotes(models: ReadonlyMap<string, RoomModel>): CreepDemand[] {
    const demands: CreepDemand[] = [];
    if (!policy.remoteEnabled) return demands;
    const mine = username();
    const assigned = new Set<string>();
    for (const model of [...models.values()].sort((a, b) => a.name.localeCompare(b.name))) {
        const colony = Memory.colonies[model.name];
        const evaluate = !evaluated.has(model.name) || Game.time - evaluated.get(model.name)! >= 100;
        if (evaluate && healthyOrigin(model)) {
            evaluated.set(model.name, Game.time);
            for (const name of nearbyRooms(model.name)) {
                if (models.has(name)) continue;
                colony.remotes[name] ||= {
                    stage: "unknown", changedAt: Game.time, score: 0, sourcePlans: {}, losses: 0, knownCreeps: []
                };
            }
        }
        for (const [target, record] of Object.entries(colony.remotes)) {
            if (!healthyOrigin(model)) {
                suspend(record, "Origin unhealthy");
                continue;
            }
            if (models.has(target) || assigned.has(target)) {
                suspend(record, "Owned or assigned elsewhere");
                continue;
            }
            const intel = Memory.intel[target];
            if (record.stage === "suspended") {
                if ((record.suspendedUntil || 0) > Game.time) continue;
                record.stage = "scouting";
                record.changedAt = Game.time;
                record.losses = 0;
                record.knownCreeps = [];
            }
            if (intel?.inaccessibleUntil && intel.inaccessibleUntil > Game.time) {
                suspend(record, "Inaccessible");
                continue;
            }
            const prefix = `remote:${target}:`;
            const push = (role: CreepDemand["role"], suffix: string, body: BodyPartConstant[],
                          assignment: CreepDemand["assignment"], priority = 35, travelEstimate = 50): void => {
                if (body.length) demands.push({
                    key: prefix + suffix,
                    role,
                    homeRoom: model.name,
                    priority,
                    body,
                    assignment,
                    travelEstimate
                });
            };
            if (isIntelStale(intel) || (record.reason && intel.lastSeen <= record.changedAt)) {
                record.stage = "scouting";
                if (safeRoute(model.name, target, false)) push("scout", "scout", [MOVE], {
                    type: "remote",
                    targetRoom: target
                }, 20);
                continue;
            }
            if (intel.owner || !intel.controller || !intel.sources.length || intel.keeper || intel.highway ||
                (intel.reservation && intel.reservation.username !== mine &&
                    intel.reservation.ticksToEnd > Game.time - intel.lastSeen && !policy.attackHostileReservations)) {
                suspend(record, "Occupation or unsuitable room");
                continue;
            }
            const prematureDeaths = record.knownCreeps.filter(name => !Game.creeps[name]).length;
            record.losses += prematureDeaths;
            record.knownCreeps = Object.values(Game.creeps).filter(creep => creep.memory.homeRoom === model.name &&
                creep.memory.demandKey?.startsWith(prefix) && (creep.spawning || (creep.ticksToLive || 0) > 100)).map(creep => creep.name);
            if (record.losses >= 3 || intel.threat.total > 120) {
                suspend(record, "Threat or repeated losses");
                continue;
            }
            if (intel.threat.total > 0) {
                push("defender", "defender", buildDefender(model.energyCapacity, intel.threat),
                    {type: "defense", targetRoom: target}, 55);
                continue;
            }
            const route = safeRoute(model.name, target);
            if (!route || route.length > policy.maxRemoteDistance) {
                const unknown = safeRoute(model.name, target, false);
                const next = unknown?.find(step => isIntelStale(Memory.intel[step.room]));
                if (next) push("scout", "route-scout", [MOVE], {type: "remote", targetRoom: next.room}, 20);
                else suspend(record, "Unsafe route");
                continue;
            }
            assigned.add(target);
            record.reason = undefined;
            if (evaluate || !Object.keys(record.sourcePlans).length) {
                if (Game.rooms[target]) record.sourcePlans = planRemote(model, Game.rooms[target], route);
                record.score = Object.values(record.sourcePlans).reduce((sum, plan) => sum + plan.expectedIncome -
                    bodyCost(buildMiner(model.energyCapacity)) / 1500 - plan.carryRequirement * 100 / 1500 -
                    plan.pathLength * 0.01, 0) - 650 / 600;
                if (!Object.keys(record.sourcePlans).length) {
                    record.stage = "candidate";
                    push("scout", "scout", [MOVE], {type: "remote", targetRoom: target}, 20);
                    continue;
                }
                if (record.score <= 0) {
                    suspend(record, "Negative profitability");
                    continue;
                }
                record.stage = "candidate";
            }
            const reserved = intel.reservation && intel.reservation.username === mine &&
                intel.reservation.ticksToEnd - (Game.time - intel.lastSeen) > route.length * 50 + 500;
            record.stage = reserved ? "mining" : "reserving";
            if (!reserved) push("reserver", "reserver", buildReserver(model.energyCapacity), {
                type: "remote",
                targetRoom: target
            }, 38, route.length * 50);
            let carry = 0;
            let travel = 0;
            let needsBuilder = false;
            for (const plan of Object.values(record.sourcePlans)) {
                if (!plan.accessible) continue;
                push("miner", `miner:${plan.sourceId}`, buildMiner(model.energyCapacity), {
                    type: "source",
                    sourceId: plan.sourceId,
                    containerId: plan.containerId,
                    workPosition: plan.workPosition
                }, 40, plan.pathLength);
                carry += plan.carryRequirement;
                travel = Math.max(travel, plan.pathLength);
                const visible = Game.rooms[target];
                const container = visible?.lookForAt(LOOK_STRUCTURES, plan.containerPosition.x, plan.containerPosition.y)
                    .find((s): s is StructureContainer => s.structureType === STRUCTURE_CONTAINER);
                if (visible) plan.containerId = container?.id;
                needsBuilder ||= !plan.containerId;
                if (container && container.store[RESOURCE_ENERGY] > 0 && model.storage) {
                    upsertLogisticsJob(model.name, {
                            type: "store",
                            id: container.id,
                            position: serializePosition(container.pos)
                        },
                        {type: "store", id: model.storage.id, position: serializePosition(model.storage.pos)},
                        RESOURCE_ENERGY, container.store[RESOURCE_ENERGY], 50);
                }
            }
            if (Game.rooms[target] && model.storage) for (const drop of Game.rooms[target].find(FIND_DROPPED_RESOURCES)) {
                if (drop.resourceType === RESOURCE_ENERGY) upsertLogisticsJob(model.name,
                    {type: "drop", id: drop.id, position: serializePosition(drop.pos)},
                    {type: "store", id: model.storage.id, position: serializePosition(model.storage.pos)},
                    RESOURCE_ENERGY, drop.amount, 52);
            }
            if (needsBuilder) push("worker", "builder", buildWorker(Math.min(model.energyCapacity, 1000)),
                {type: "remote", targetRoom: target}, 32, travel);
            const body = buildTransporter(model.energyCapacity, carry);
            const capacity = body.filter(part => part === CARRY).length;
            for (let index = 0; capacity && index < Math.ceil(carry / capacity); index++) {
                push("transporter", `hauler:${index}`, body, {type: "logistics", targetRoom: target}, 39, travel);
            }
        }
    }
    return demands;
}