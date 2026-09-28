import policy from "@/config/policy";
import type {RoomModel} from "@/colony/roomModel";
import type {CreepDemand, ExpansionStage} from "@/domain/types";
import {ensureColony} from "@/kernel/memory";
import {planLayout} from "@/planning/layoutPlanner";
import {buildWorker} from "@/planning/bodyBuilder";
import {healthyOrigin} from "@/empire/remoteManager";
import {isIntelStale, markRoomInaccessible, nearbyRooms, safeRoute, username} from "@/empire/intelManager";

let lastEvaluation = -Infinity;

function transition(campaign: ExpansionMemory, stage: ExpansionStage): void {
    if (campaign.stage !== stage) {
        campaign.stage = stage;
        campaign.changedAt = Game.time;
    }
}

function fail(campaign: ExpansionMemory, reason: string): void {
    if (campaign.selectedRoom) markRoomInaccessible(campaign.selectedRoom, reason);
    campaign.failureReason = reason;
    campaign.retryAt = Game.time + policy.remoteSuspensionDuration;
    campaign.selectedRoom = undefined;
    campaign.originRoom = undefined;
    campaign.anchor = undefined;
    campaign.candidates = [];
    transition(campaign, "idle");
}

export function runExpansion(models: ReadonlyMap<string, RoomModel>): CreepDemand[] {
    const campaign = Memory.empire.expansion;
    const demands: CreepDemand[] = [];
    if (!policy.expansionEnabled) {
        if (campaign.stage !== "idle" && campaign.stage !== "complete") fail(campaign, "Expansion disabled");
        return demands;
    }
    if (campaign.retryAt && campaign.retryAt > Game.time) return demands;
    if (campaign.stage !== "idle" && campaign.stage !== "complete" &&
        Game.time - campaign.changedAt >= policy.expansionTimeout) {
        fail(campaign, `${campaign.stage} timed out`);
        return demands;
    }
    const evaluate = Game.time - lastEvaluation >= 250 || Game.time < lastEvaluation;
    const existing = [...models.values()].filter(model => model.name !== campaign.selectedRoom);
    if (campaign.stage === "complete") {
        if (!evaluate) return demands;
        transition(campaign, "idle");
        campaign.selectedRoom = undefined;
        campaign.originRoom = undefined;
        campaign.anchor = undefined;
    }
    if (campaign.stage === "idle") {
        if (!evaluate || Game.cpu.bucket < policy.minimumCpuBucket) return demands;
        lastEvaluation = Game.time;
        if (models.size >= Game.gcl.level || !existing.length || existing.some(model => !healthyOrigin(model))) return demands;
        const origin = existing.filter(model => model.storageEnergy >= policy.expansionEnergyThreshold && model.energyCapacity >= 650)
            .sort((a, b) => b.storageEnergy - a.storageEnergy || a.name.localeCompare(b.name))[0];
        if (!origin) return demands;
        campaign.originRoom = origin.name;
        campaign.candidates = nearbyRooms(origin.name).filter(name => !models.has(name));
        campaign.failureReason = undefined;
        transition(campaign, "scouting");
    }
    const origin = campaign.originRoom ? models.get(campaign.originRoom) : undefined;
    if (!origin || !healthyOrigin(origin) || existing.some(model => !healthyOrigin(model))) {
        fail(campaign, "Origin or existing colony unhealthy");
        return demands;
    }
    const push = (role: CreepDemand["role"], target: string, suffix: string, body: BodyPartConstant[], priority: number): void => {
        if (body.length) demands.push({
            key: `expansion:${target}:${suffix}`, role, homeRoom: origin.name, body, priority,
            assignment: {type: "remote", targetRoom: target},
            travelEstimate: (Memory.intel[target]?.routes[origin.name]?.distance || policy.maxRemoteDistance) * 50
        });
    };
    if (campaign.stage === "scouting") {
        if (models.size >= Game.gcl.level) {
            fail(campaign, "No free GCL");
            return demands;
        }
        if (origin.storageEnergy < policy.expansionEnergyThreshold) return demands;
        const candidates = campaign.candidates.filter(name => {
            const intel = Memory.intel[name];
            return !(intel?.inaccessibleUntil && intel.inaccessibleUntil > Game.time) &&
                (!intel || (!intel.owner && !intel.keeper && !intel.highway && !intel.threat.total &&
                    (!intel.reservation || intel.reservation.username === username() ||
                        intel.reservation.ticksToEnd <= Game.time - intel.lastSeen)));
        }).sort((a, b) => {
            const score = (name: string): number => {
                const intel = Memory.intel[name];
                return (intel?.sources.length || 0) * 100 - (intel?.routes[origin.name]?.distance || 10) * 10;
            };
            return score(b) - score(a) || a.localeCompare(b);
        });
        for (const target of candidates) {
            const intel = Memory.intel[target];
            const route = safeRoute(origin.name, target, false);
            if (!route || route.length > policy.maxRemoteDistance) continue;
            const stale = route.find(step => isIntelStale(Memory.intel[step.room]));
            if (stale) {
                push("scout", stale.room, "scout", [MOVE], 15);
                return demands;
            }
            if (!intel?.controller || intel.sources.length < 2) continue;
            if (!Game.rooms[target]) {
                push("scout", target, "scout", [MOVE], 15);
                return demands;
            }
            if (!evaluate && Game.time !== campaign.changedAt) return demands;
            lastEvaluation = Game.time;
            const layout = planLayout(Game.rooms[target]);
            if (!layout || !layout.structures.some(site => site.structureType === STRUCTURE_SPAWN && site.minimumRcl === 1)) {
                markRoomInaccessible(target, "No viable layout");
                continue;
            }
            campaign.selectedRoom = target;
            campaign.anchor = layout.anchor;
            transition(campaign, "selected");
            break;
        }
        if (campaign.stage === "scouting") {
            if (!candidates.length) fail(campaign, "No viable candidates");
            return demands;
        }
    }
    const target = campaign.selectedRoom;
    if (!target || !campaign.anchor) {
        fail(campaign, "Invalid campaign");
        return demands;
    }
    const targetModel = models.get(target);
    const room = Game.rooms[target];
    const intel = Memory.intel[target];
    if (intel?.threat.total || (intel?.owner && intel.owner !== username()) ||
        (intel?.inaccessibleUntil && intel.inaccessibleUntil > Game.time)) {
        fail(campaign, "Target unsafe");
        return demands;
    }
    if (!room?.controller?.my && models.size >= Game.gcl.level) {
        fail(campaign, "No free GCL");
        return demands;
    }
    const route = safeRoute(origin.name, target);
    if (!route || route.length > policy.maxRemoteDistance) {
        const exploration = safeRoute(origin.name, target, false);
        const stale = exploration?.find(step => isIntelStale(Memory.intel[step.room]));
        if (stale) push("scout", stale.room, "route-scout", [MOVE], 20);
        else fail(campaign, "Route unsafe");
        return demands;
    }
    if (room?.controller?.my) {
        const colony = ensureColony(target);
        colony.anchor = {...campaign.anchor};
        if (campaign.stage === "selected" || campaign.stage === "claiming") transition(campaign, "spawnSite");
        const hasSpawn = targetModel ? targetModel.spawns.length > 0 : room.find(FIND_MY_SPAWNS).length > 0;
        if (campaign.stage === "spawnSite" && hasSpawn) transition(campaign, "bootstrapping");
        if (campaign.stage === "bootstrapping" && targetModel && hasSpawn &&
            (targetModel.stage === "developing" || targetModel.stage === "stable")) {
            transition(campaign, "complete");
            return demands;
        }
        for (let index = 0; index < 2; index++) push("worker", target, `support:${index}`,
            buildWorker(Math.min(origin.energyCapacity, 1600)), 35);
    } else {
        if (campaign.stage === "spawnSite" || campaign.stage === "bootstrapping") {
            if (room) fail(campaign, "Lost target ownership");
            else push("scout", target, "scout", [MOVE], 20);
            return demands;
        }
        transition(campaign, "claiming");
        push("claimer", target, "claimer", [CLAIM, MOVE], 30);
    }
    return demands;
}