import {buildCombatBody} from "./combat.bodies";
import {effectiveIncomingDamage, healPower, incomingDamage} from "./combat.damage";
import {executeCombatMovement} from "./combat.movement";
import {planHealer, planMelee, planRanger} from "./combat.tactics";
import {hasAssaultTarget, hostileCreeps, hostileTowers, selectFocusTarget} from "./combat.targeting";
import {CombatContext} from "./combat.types";

const combatClasses: CombatClass[] = ["melee", "ranger", "healer"];

function slotId(operationId: string, combatClass: CombatClass, index: number): string {
    return `${operationId}:${combatClass}:${index}`;
}

function classFromRole(role: string): CombatClass | undefined {
    switch (role) {
        case "melee":
            return "melee";
        case "ranger":
        case "archer":
            return "ranger";
        case "healer":
            return "healer";
        default:
            return undefined;
    }
}

export function isCombatCreepMemory(memory: CreepMemory): boolean {
    return !!memory.operationId ||
        ["combatant", "melee", "ranger", "healer", "archer"].includes(memory.role);
}

function hasCombatRole(memory: CreepMemory): boolean {
    if (memory.role === "combatant") {
        return !!memory.combatClass && combatClasses.includes(memory.combatClass);
    }
    const roleClass = classFromRole(memory.role);
    return roleClass !== undefined && roleClass === memory.combatClass;
}

function canDeploy(creep: Creep, operation: CombatOperationMemory): boolean {
    if (creep.getActiveBodyparts(MOVE) === 0) {
        return false;
    }
    switch (creep.memory.combatClass) {
        case "melee":
            return creep.getActiveBodyparts(operation.assaultTarget === "controller" ?
                CLAIM : ATTACK) > 0;
        case "ranger":
            return creep.getActiveBodyparts(RANGED_ATTACK) > 0;
        case "healer":
            return creep.getActiveBodyparts(HEAL) > 0;
        default:
            return false;
    }
}

function isValidOperation(operationId: string, operation: CombatOperationMemory): boolean {
    const rally = Game.flags[operation.rallyFlag];
    const target = operation.targetFlag ? Game.flags[operation.targetFlag] : undefined;
    const counts = operation.required &&
        combatClasses.map(combatClass => operation.required[combatClass]);
    let error: string | undefined;
    if (!["defend", "attack", "harass", "sourceKeeper"].includes(operation.type) ||
        !["forming", "travelling", "engaging", "retreating", "complete"].includes(operation.state)) {
        error = "invalid type or state";
    } else if (!Game.rooms[operation.homeRoom]) {
        error = `home room ${operation.homeRoom} is not visible`;
    } else if (!rally || rally.pos.roomName !== operation.homeRoom) {
        error = `rally flag ${operation.rallyFlag} is missing or outside ${operation.homeRoom}`;
    } else if (operation.targetFlag && (!target || target.pos.roomName !== operation.targetRoom)) {
        error = `target flag ${operation.targetFlag} is missing or outside ${operation.targetRoom}`;
    } else if (!counts || counts.some(count => !Number.isInteger(count) || count < 0) ||
        operation.required.melee + operation.required.ranger < 1) {
        error = "required slots must include a front-line unit and be nonnegative integers";
    } else if (!(operation.retreatHitsRatio > 0 && operation.retreatHitsRatio < 1)) {
        error = "retreatHitsRatio must be between zero and one";
    } else if (operation.type === "attack" &&
        (operation.assaultTarget === "wall" || operation.assaultTarget === "rampart") &&
        !operation.breachTargetId && !operation.targetFlag) {
        error = "wall and rampart assaults need a breachTargetId or targetFlag";
    } else if (operation.type === "attack" && operation.assaultTarget === "controller" &&
        operation.required.melee < 1) {
        error = "controller assaults require a melee slot with CLAIM parts";
    }
    if (error) {
        console.log(`Combat operation ${operationId}: ${error}`);
        return false;
    }
    return true;
}

function objectiveComplete(operation: CombatOperationMemory): boolean {
    if (operation.state !== "engaging" || !Game.rooms[operation.targetRoom]) {
        return false;
    }
    if (operation.type === "attack" && operation.assaultTarget &&
        operation.assaultTarget !== "hostileCreep") {
        return !hasAssaultTarget(operation);
    }
    return (operation.type === "attack" || operation.type === "harass") &&
        operation.noTargetSince !== undefined && Game.time - operation.noTargetSince >= 10;
}

export function shouldRespawnCombatCreep(operationId?: string): boolean {
    const operation = operationId && Memory.combatOperations?.[operationId];
    return !!operation && operation.state !== "complete" && !objectiveComplete(operation) &&
        isValidOperation(operationId, operation);
}

function replacementLeadTime(memory: CreepMemory, operation: CombatOperationMemory): number {
    const travelRooms = Game.map.getRoomLinearDistance(operation.homeRoom, operation.targetRoom);
    return memory.body.length * CREEP_SPAWN_TIME + travelRooms * 50 + 25;
}

export function shouldSpawnCombatCreep(memory: CreepMemory): boolean {
    const operationId = memory.operationId;
    const combatClass = memory.combatClass;
    const id = memory.slotId;
    if (!operationId || !combatClass || !id || !memory.body?.length ||
        !hasCombatRole(memory) ||
        !shouldRespawnCombatCreep(operationId) || !combatClasses.includes(combatClass)) {
        return false;
    }
    const operation = Memory.combatOperations[operationId];
    const slots = Array.from({length: operation.required[combatClass]},
        (_, index) => slotId(operationId, combatClass, index));
    if (!slots.includes(id)) {
        return false;
    }
    const occupants = Object.values(Game.creeps).filter(creep =>
        creep.memory.operationId === operationId && creep.memory.slotId === id &&
        hasCombatRole(creep.memory));
    return occupants.length === 0 ||
        (occupants.length === 1 && !occupants[0].spawning &&
            (!canDeploy(occupants[0], operation) ||
                (occupants[0].ticksToLive !== undefined &&
                    occupants[0].ticksToLive <= replacementLeadTime(memory, operation))));
}

function assignSlots(operationId: string, operation: CombatOperationMemory, creeps: Creep[]): void {
    for (const combatClass of combatClasses) {
        const slots = Array.from({length: operation.required[combatClass]},
            (_, index) => slotId(operationId, combatClass, index));
        const ofClass = creeps.filter(creep => creep.memory.combatClass === combatClass);
        const used = new Set(ofClass.map(creep => creep.memory.slotId)
            .filter((id): id is string => !!id && slots.includes(id)));
        for (const creep of ofClass) {
            if (creep.memory.slotId && slots.includes(creep.memory.slotId)) {
                continue;
            }
            const free = slots.find(id => !used.has(id));
            if (free) {
                creep.memory.slotId = free;
                used.add(free);
            } else {
                delete creep.memory.slotId;
            }
        }
    }
}

function pairHealers(members: Creep[]): void {
    const frontline = members.filter(member => member.memory.combatClass !== "healer")
        .sort((a, b) => (a.memory.combatClass === "melee" ? 0 : 1) -
            (b.memory.combatClass === "melee" ? 0 : 1) || a.name.localeCompare(b.name));
    const healers = members.filter(member => member.memory.combatClass === "healer")
        .sort((a, b) => a.name.localeCompare(b.name));
    for (const member of members) {
        delete member.memory.partnerName;
    }
    if (frontline.length === 0) {
        return;
    }
    for (const [index, healer] of healers.entries()) {
        const partner = frontline[index % frontline.length];
        if (partner) {
            healer.memory.partnerName = partner.name;
            partner.memory.partnerName ??= healer.name;
        }
    }
}

function retreatNeeded(
    operation: CombatOperationMemory,
    members: Creep[],
    ready: boolean
): boolean {
    if (!ready) {
        return true;
    }
    return members.some(member => {
        if (member.hits / member.hitsMax < operation.retreatHitsRatio) {
            return true;
        }
        const hostiles = member.room.find(FIND_HOSTILE_CREEPS);
        const towers = hostileTowers(member.room, operation);
        const damage = effectiveIncomingDamage(member,
            incomingDamage(member.pos, hostiles, towers));
        const healing = members.filter(healer =>
            healer.memory.combatClass === "healer" && healer.room.name === member.room.name &&
            healer.pos.inRangeTo(member, 3))
            .reduce((total, healer) => total + healPower(healer,
                !healer.pos.isNearTo(member)), 0);
        if (damage > 0 && member.hits <= damage - healing) {
            return true;
        }
        return operation.required.healer > 0 && member.memory.combatClass !== "healer" &&
            (hostiles.length > 0 || towers.length > 0) &&
            !members.some(healer => healer.memory.combatClass === "healer" &&
                healer.room.name === member.room.name && healer.pos.inRangeTo(member, 5));
    });
}

function clearQueuedMembers(operationId: string): void {
    for (const room of Object.values(Game.rooms)) {
        if (room.memory.queue) {
            room.memory.queue = room.memory.queue.filter(memory => memory.operationId !== operationId);
        }
    }
}

function queueMissingMembers(
    operationId: string,
    operation: CombatOperationMemory,
    allMembers: Creep[]
): void {
    const room = Game.rooms[operation.homeRoom];
    const queue = room.memory.queue ??= [];
    const queuedSlots = new Set<string>();
    for (let index = 0; index < queue.length;) {
        const memory = queue[index];
        if (memory.operationId !== operationId) {
            index++;
            continue;
        }
        if (!memory.slotId || queuedSlots.has(memory.slotId)) {
            console.log(`Combat operation ${operationId}: queued member has no unique slotId`);
            queue.splice(index, 1);
            continue;
        }
        if (!shouldSpawnCombatCreep(memory)) {
            queue.splice(index, 1);
            continue;
        }
        queuedSlots.add(memory.slotId);
        index++;
    }

    for (const combatClass of combatClasses) {
        for (let index = 0; index < operation.required[combatClass]; index++) {
            const id = slotId(operationId, combatClass, index);
            if (queuedSlots.has(id)) {
                continue;
            }
            const occupants = allMembers.filter(member => member.memory.slotId === id);
            if (occupants.length > 1 || (occupants.length === 1 &&
                (occupants[0].spawning || occupants[0].ticksToLive === undefined))) {
                continue;
            }
            const body = buildCombatBody(combatClass, room.energyCapacityAvailable,
                operation.assaultTarget);
            if (!body.length) {
                console.log(`Combat operation ${operationId}: ${room.name} cannot afford a ${combatClass}`);
                continue;
            }
            const memory: CreepMemory = {
                role: "combatant", room: room.name, body, operationId, combatClass, slotId: id
            };
            if (shouldSpawnCombatCreep(memory)) {
                queue.push(memory);
                queuedSlots.add(id);
            }
        }
    }
}

export function runCombatOperations(): void {
    Memory.combatOperations ??= {};
    for (const operationId in Memory.combatOperations) {
        const operation = Memory.combatOperations[operationId];
        if (operation.state === "complete") {
            clearQueuedMembers(operationId);
            continue;
        }
        if (!isValidOperation(operationId, operation)) {
            if (operation.state === "travelling" || operation.state === "engaging") {
                operation.state = "retreating";
            }
            clearQueuedMembers(operationId);
            continue;
        }
        const operationMembers = Object.values(Game.creeps).filter(creep =>
            creep.memory.operationId === operationId);
        for (const creep of operationMembers) {
            const roleClass = classFromRole(creep.memory.role);
            if (roleClass && creep.memory.combatClass !== roleClass) {
                creep.memory.combatClass = roleClass;
            }
            if (!hasCombatRole(creep.memory)) {
                console.log(`Combat creep ${creep.name} has an invalid role or combatClass`);
            }
        }
        const allMembers = operationMembers.filter(creep => hasCombatRole(creep.memory));
        assignSlots(operationId, operation, allMembers);
        const members = allMembers.filter(creep => !creep.spawning &&
            creep.memory.combatClass && combatClasses.includes(creep.memory.combatClass));
        const deployable = members.filter(creep => canDeploy(creep, operation));
        for (const creep of members) {
            if (!canDeploy(creep, operation) && !creep.memory.respawnInformed) {
                console.log(`Combat creep ${creep.name} has lost an essential body part`);
                creep.memory.respawnInformed = true;
            }
        }
        pairHealers(deployable);
        const slots = combatClasses.flatMap(combatClass =>
            Array.from({length: operation.required[combatClass]},
                (_, index) => slotId(operationId, combatClass, index)));
        const ready = slots.every(id => deployable.some(member => member.memory.slotId === id));
        const travelTime = Game.map.getRoomLinearDistance(operation.homeRoom, operation.targetRoom) * 50;
        const readyToLeave = slots.every(id => deployable.some(member =>
            member.memory.slotId === id && member.ticksToLive !== undefined &&
            member.ticksToLive > travelTime + 25));
        const rally = Game.flags[operation.rallyFlag];
        const gathered = deployable.every(member => member.pos.inRangeTo(rally, 2)) &&
            deployable.filter(member => member.memory.combatClass === "healer")
                .every(healer => !healer.memory.partnerName ||
                    healer.pos.isNearTo(Game.creeps[healer.memory.partnerName]));
        const healed = deployable.every(member => member.hits / member.hitsMax >=
            Math.min(1, Math.max(0.9, operation.retreatHitsRatio + 0.2)));

        if (operation.state === "engaging") {
            const targetRoom = Game.rooms[operation.targetRoom];
            if (targetRoom && (operation.type === "harass" ||
                (operation.type === "attack" &&
                    (!operation.assaultTarget || operation.assaultTarget === "hostileCreep")))) {
                if (hostileCreeps(targetRoom, operation).length === 0) {
                    operation.noTargetSince ??= Game.time;
                } else {
                    delete operation.noTargetSince;
                }
            }
        }
        if (objectiveComplete(operation)) {
            operation.state = "complete";
            delete operation.focusTargetId;
            delete operation.focusUntil;
            clearQueuedMembers(operationId);
            continue;
        }

        if (operation.state === "retreating") {
            if (gathered && healed) {
                operation.state = "forming";
            }
        } else if ((operation.state === "travelling" || operation.state === "engaging") &&
            retreatNeeded(operation, deployable, ready)) {
            operation.state = "retreating";
        } else if (operation.state === "forming" && readyToLeave && gathered && healed) {
            operation.state = "travelling";
        } else if (operation.state === "travelling" && ready &&
            deployable.every(member => member.room.name === operation.targetRoom) &&
            deployable.every(member => !deployable[0] ||
                member.pos.inRangeTo(deployable[0], 5))) {
            operation.state = "engaging";
        }
        const focus = selectFocusTarget(operation, deployable);
        for (const member of members) {
            if (member.memory.combatClass === "healer") {
                continue;
            }
            if (focus) {
                member.memory.targetId = focus.id;
            } else {
                delete member.memory.targetId;
            }
        }
        if (shouldRespawnCombatCreep(operationId)) {
            queueMissingMembers(operationId, operation, allMembers);
        }
    }
}

export function runCombatUnit(creep: Creep, combatClass: CombatClass): void {
    const operationId = creep.memory.operationId;
    const operation = operationId && Memory.combatOperations?.[operationId];
    if (!operation || !operationId) {
        console.log(`Combat creep ${creep.name} has no active operation`);
        return;
    }
    if (creep.spawning) {
        return;
    }
    if (creep.memory.combatClass !== combatClass) {
        console.log(`Combat creep ${creep.name} has an invalid combatClass`);
        return;
    }
    const members = Object.values(Game.creeps).filter(member =>
        !member.spawning && member.memory.operationId === operationId);
    const leaderClass: CombatClass = operation.assaultTarget === "controller" ? "ranger" : "melee";
    const frontline = members.filter(member => member.memory.combatClass !== "healer" &&
        canDeploy(member, operation))
        .sort((a, b) => Number(a.memory.combatClass !== leaderClass) -
            Number(b.memory.combatClass !== leaderClass) || a.name.localeCompare(b.name));
    const partner = creep.memory.partnerName && Game.creeps[creep.memory.partnerName];
    const focus = operation.focusTargetId ?
        Game.getObjectById(operation.focusTargetId) ?? undefined : undefined;
    const targetFlag = operation.targetFlag && Game.flags[operation.targetFlag];
    if (operation.targetFlag && !targetFlag && operation.state !== "complete") {
        operation.state = "retreating";
    }
    const rallyFlag = Game.flags[operation.rallyFlag];
    if (!rallyFlag || rallyFlag.pos.roomName !== operation.homeRoom) {
        console.log(`Combat creep ${creep.name}: rally flag ${operation.rallyFlag} is unavailable`);
    }
    const context: CombatContext = {
        operation, members,
        hostiles: hostileCreeps(creep.room, operation),
        threats: creep.room.find(FIND_HOSTILE_CREEPS),
        towers: hostileTowers(creep.room, operation),
        rally: rallyFlag?.pos.roomName === operation.homeRoom
            ? rallyFlag.pos : new RoomPosition(25, 25, operation.homeRoom),
        objective: targetFlag ? targetFlag.pos : new RoomPosition(25, 25, operation.targetRoom),
        focus,
        partner: partner && partner.memory.operationId === operationId ? partner : undefined,
        leader: frontline[0]
    };
    const plan = combatClass === "melee" ? planMelee(creep, context)
        : combatClass === "ranger" ? planRanger(creep, context) : planHealer(creep, context);
    if (!canDeploy(creep, operation)) {
        plan.movement = creep.getActiveBodyparts(MOVE) > 0 ? context.rally : undefined;
        plan.movementRange = 2;
        plan.flee = undefined;
    }
    if (plan.action) {
        const result = plan.action();
        if (result !== OK) {
            console.log(`Combat action failed for ${creep.name}: ${result}`);
        }
    }
    executeCombatMovement(creep, plan, context);
}