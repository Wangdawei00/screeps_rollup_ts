import policy from "@/config/policy";
import {assignmentMatchesRole, CREEP_ROLES, hasRoleParts, isAssignment, isCreepRole} from "@/domain/types";
import type {ColonyStage, CreepRole} from "@/domain/types";

export interface RoomModel {
    room: Room;
    name: string;
    stage: ColonyStage;
    controller: StructureController;
    structures: AnyStructure[];
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    towers: StructureTower[];
    links: StructureLink[];
    containers: StructureContainer[];
    labs: StructureLab[];
    factories: StructureFactory[];
    observers: StructureObserver[];
    powerSpawns: StructurePowerSpawn[];
    storage?: StructureStorage;
    terminal?: StructureTerminal;
    sources: Source[];
    minerals: Mineral[];
    constructionSites: ConstructionSite[];
    hostiles: Creep[];
    friendlyCreeps: Creep[];
    creepsByRole: Map<CreepRole, Creep[]>;
    droppedResources: Resource[];
    ruins: Ruin[];
    tombstones: Tombstone[];
    energyAvailable: number;
    energyCapacity: number;
    storageEnergy: number;
}

export function determineColonyStage(model: RoomModel): ColonyStage {
    const memory = Memory.colonies[model.name];
    const active = (role: CreepRole): Creep[] => (model.creepsByRole.get(role) || [])
        .filter(creep => !creep.spawning && creep.room.name === model.name &&
            !creep.memory.demandKey.startsWith("remote:") && !creep.memory.demandKey.startsWith("expansion:") &&
            hasRoleParts(role, part => creep.getActiveBodyparts(part) > 0));
    const meaningfulThreat = model.hostiles.some(creep =>
        [ATTACK, RANGED_ATTACK, WORK, HEAL].some(part => creep.getActiveBodyparts(part) > 0));
    if (meaningfulThreat) return "underAttack";
    const miners = active("miner").filter(creep => creep.getActiveBodyparts(WORK) > 0);
    const haulers = active("transporter").filter(creep => creep.getActiveBodyparts(CARRY) > 0);
    const harvesters = active("harvester").filter(creep =>
        creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0);
    const pipeline = miners.length > 0 && haulers.length > 0;
    if (memory.established && (!pipeline || (model.storageEnergy === 0 && model.energyAvailable < 200 && harvesters.length === 0))) {
        return "recovering";
    }
    if (!pipeline) return "bootstrap";
    const extensionCount = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][model.controller.level];
    return model.storageEnergy >= policy.storageEnergyReserve && model.extensions.length >= extensionCount ? "stable" : "developing";
}

export function buildRoomModel(room: Room): RoomModel {
    if (!room.controller?.my) throw new Error(`Cannot model unowned room ${room.name}`);
    const structures = room.find(FIND_STRUCTURES);
    const owned = <T extends AnyOwnedStructure>(type: T["structureType"]): T[] =>
        structures.filter((structure): structure is T => structure.structureType === type && "my" in structure && structure.my);
    const creepsByRole = new Map<CreepRole, Creep[]>(CREEP_ROLES.map(role => [role, []]));
    for (const creep of Object.values(Game.creeps)) {
        if (creep.memory && creep.memory.homeRoom === room.name && isCreepRole(creep.memory.role) &&
            typeof creep.memory.demandKey === "string" && creep.memory.demandKey.length > 0 &&
            (creep.memory.assignment === undefined || isAssignment(creep.memory.assignment)) &&
            assignmentMatchesRole(creep.memory.role, creep.memory.assignment)) {
            creepsByRole.get(creep.memory.role)!.push(creep);
        }
    }
    const model: RoomModel = {
        room,
        name: room.name,
        stage: "bootstrap",
        controller: room.controller,
        structures,
        spawns: owned<StructureSpawn>(STRUCTURE_SPAWN),
        extensions: owned<StructureExtension>(STRUCTURE_EXTENSION),
        towers: owned<StructureTower>(STRUCTURE_TOWER),
        links: owned<StructureLink>(STRUCTURE_LINK),
        labs: owned<StructureLab>(STRUCTURE_LAB),
        factories: owned<StructureFactory>(STRUCTURE_FACTORY),
        observers: owned<StructureObserver>(STRUCTURE_OBSERVER),
        powerSpawns: owned<StructurePowerSpawn>(STRUCTURE_POWER_SPAWN),
        containers: structures.filter((structure): structure is StructureContainer => structure.structureType === STRUCTURE_CONTAINER),
        storage: room.storage,
        terminal: room.terminal,
        sources: room.find(FIND_SOURCES),
        minerals: room.find(FIND_MINERALS),
        constructionSites: room.find(FIND_MY_CONSTRUCTION_SITES),
        hostiles: room.find(FIND_HOSTILE_CREEPS),
        friendlyCreeps: room.find(FIND_MY_CREEPS),
        creepsByRole,
        droppedResources: room.find(FIND_DROPPED_RESOURCES),
        ruins: room.find(FIND_RUINS),
        tombstones: room.find(FIND_TOMBSTONES),
        energyAvailable: room.energyAvailable,
        energyCapacity: room.energyCapacityAvailable,
        storageEnergy: room.storage?.store[RESOURCE_ENERGY] || 0
    };
    model.stage = determineColonyStage(model);
    return model;
}
