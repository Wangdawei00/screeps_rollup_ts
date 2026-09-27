import { jest } from "@jest/globals";
import type { CreepRole } from "../src/domain/types";

export function mock<T>(value: Partial<T>): T {
    return value as T;
}

export function store(energy = 0, capacity = 300, cargo: Partial<Record<ResourceConstant, number>> = {}): StoreDefinition {
    const resources = { energy, ...cargo };
    const used = (resource?: ResourceConstant): number => resource ? resources[resource] || 0 :
        Object.values(resources).reduce((sum, amount) => sum + (amount || 0), 0);
    return Object.assign(resources, {
        getUsedCapacity: (resource?: ResourceConstant) => used(resource),
        getCapacity: () => capacity,
        getFreeCapacity: () => Math.max(0, capacity - used())
    }) as StoreDefinition;
}

export function ownedRoom(name = "W1N1", energy = 300, level = 1) {
    const objects = new Map<string, { id: string }>();
    const controller = mock<StructureController>({
        id: `controller-${name}` as Id<StructureController>, my: true, level,
        owner: { username: "player" }, pos: new RoomPosition(25, 25, name),
        ticksToDowngrade: 20_000, safeModeAvailable: 1,
        activateSafeMode: jest.fn<StructureController["activateSafeMode"]>().mockReturnValue(OK)
    });
    const source = mock<Source>({
        id: `source-${name}` as Id<Source>, pos: new RoomPosition(10, 10, name),
        energy: 3000, energyCapacity: 3000
    });
    const spawn = mock<StructureSpawn>({
        id: `spawn-${name}` as Id<StructureSpawn>, name: `Spawn-${name}`, my: true,
        structureType: STRUCTURE_SPAWN, pos: new RoomPosition(22, 22, name),
        store: store(energy), hits: 5000, hitsMax: 5000,
        spawnCreep: jest.fn<StructureSpawn["spawnCreep"]>().mockReturnValue(OK),
        isActive: () => true
    });
    const structures: AnyStructure[] = [spawn];
    const sites: ConstructionSite[] = [];
    const hostiles: Creep[] = [];
    const drops: Resource[] = [];
    const tombstones: Tombstone[] = [];
    const ruins: Ruin[] = [];
    const minerals: Mineral[] = [];
    const finds: Record<number, unknown[]> = {
        [FIND_STRUCTURES]: structures, [FIND_MY_STRUCTURES]: structures,
        [FIND_SOURCES]: [source], [FIND_SOURCES_ACTIVE]: [source],
        [FIND_MY_CONSTRUCTION_SITES]: sites, [FIND_CONSTRUCTION_SITES]: sites,
        [FIND_HOSTILE_CREEPS]: hostiles, [FIND_MY_CREEPS]: [],
        [FIND_DROPPED_RESOURCES]: drops, [FIND_TOMBSTONES]: tombstones, [FIND_RUINS]: ruins,
        [FIND_MINERALS]: minerals
    };
    const room = mock<Room>({
        name, controller, energyAvailable: energy, energyCapacityAvailable: energy,
        find: jest.fn((type: FindConstant) => finds[type] || []) as Room["find"],
        getTerrain: () => mock<RoomTerrain>({ get: () => 0 }),
        lookForAt: ((type: LookConstant, x: number, y: number) => {
            if (type === LOOK_STRUCTURES) return structures.filter(s => s.pos.x === x && s.pos.y === y);
            if (type === LOOK_CONSTRUCTION_SITES) return sites.filter(s => s.pos.x === x && s.pos.y === y);
            if (type === LOOK_SOURCES) return source.pos.x === x && source.pos.y === y ? [source] : [];
            return [];
        }) as Room["lookForAt"],
        createConstructionSite: jest.fn<Room["createConstructionSite"]>().mockReturnValue(OK)
    });
    spawn.room = room;
    source.room = room;
    controller.room = room;
    objects.set(spawn.id, spawn);
    objects.set(source.id, source);
    objects.set(controller.id, controller);
    Game.rooms[name] = room;
    Game.spawns[spawn.name] = spawn;
    const previousGet = Game.getObjectById;
    Game.getObjectById = ((id: string) => objects.get(id) || previousGet(id)) as Game["getObjectById"];
    return { room, controller, source, spawn, structures, sites, hostiles, drops, tombstones, ruins, minerals, objects, finds };
}

export function addCreep(room: Room, role: CreepRole, demandKey: string, ticksToLive = 1500, name = demandKey): Creep {
    const body: BodyPartDefinition[] = [WORK, CARRY, MOVE].map(type => ({ type, hits: 100 }));
    const creep = mock<Creep>({
        id: name as Id<Creep>, name, room, pos: new RoomPosition(20, 20, room.name),
        memory: { role, demandKey, homeRoom: room.name }, ticksToLive, spawning: false,
        body, store: store(0, 50), hits: 300, hitsMax: 300, my: true,
        getActiveBodyparts: type => body.filter(part => part.type === type && part.hits > 0).length,
        moveTo: jest.fn<Creep["moveTo"]>().mockReturnValue(OK),
        harvest: jest.fn<Creep["harvest"]>().mockReturnValue(OK),
        transfer: jest.fn<Creep["transfer"]>().mockReturnValue(OK),
        withdraw: jest.fn<Creep["withdraw"]>().mockReturnValue(OK),
        pickup: jest.fn<Creep["pickup"]>().mockReturnValue(OK),
        build: jest.fn<Creep["build"]>().mockReturnValue(OK),
        repair: jest.fn<Creep["repair"]>().mockReturnValue(OK),
        upgradeController: jest.fn<Creep["upgradeController"]>().mockReturnValue(OK)
    });
    Game.creeps[name] = creep;
    Memory.creeps[name] = creep.memory;
    return creep;
}
