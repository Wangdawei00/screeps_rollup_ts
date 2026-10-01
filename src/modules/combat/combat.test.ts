import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {buildCombatBody} from "./combat.bodies";
import {effectiveIncomingDamage, healPower, incomingDamage, towerDamage} from "./combat.damage";
import {combatCostMatrix, executeCombatMovement} from "./combat.movement";
import {
    runCombatOperations, runCombatUnit, shouldSpawnCombatCreep
} from "./combat.operation";
import {planHealer, planMelee, planRanger} from "./combat.tactics";
import {selectFocusTarget, shouldEngage} from "./combat.targeting";
import {CombatContext} from "./combat.types";

const homeName = "W1N1";
const targetName = "W1N2";
const objects = new Map<string, Creep | Structure>();
const rooms = new Map<string, TestRoom>();
let tick = 100;

class TestPosition {
    constructor(public x: number, public y: number, public roomName: string) {}

    private position(target: RoomPosition | {pos: RoomPosition}): RoomPosition {
        return "pos" in target ? target.pos : target;
    }

    getRangeTo(target: RoomPosition | {pos: RoomPosition}): number {
        const pos = this.position(target);
        return this.roomName === pos.roomName
            ? Math.max(Math.abs(this.x - pos.x), Math.abs(this.y - pos.y)) : 50;
    }

    inRangeTo(target: RoomPosition | {pos: RoomPosition}, range: number): boolean {
        return this.getRangeTo(target) <= range;
    }

    isNearTo(target: RoomPosition | {pos: RoomPosition}): boolean {
        return this.inRangeTo(target, 1);
    }

    isEqualTo(target: RoomPosition | {pos: RoomPosition}): boolean {
        return this.getRangeTo(target) === 0;
    }

    getDirectionTo(): DirectionConstant {
        return 1;
    }

    lookFor(type: string): Array<Creep | Structure> {
        const room = rooms.get(this.roomName);
        if (!room) {
            return [];
        }
        const objectsInRoom: Array<Creep | Structure> = type === LOOK_STRUCTURES
            ? room.structures : type === LOOK_CREEPS
                ? [...room.myCreeps, ...room.hostiles] : [];
        return objectsInRoom.filter(object => this.isEqualTo(object.pos));
    }

    findInRange(type: number, range: number): Array<Creep | Structure> {
        const room = rooms.get(this.roomName);
        return (room?.find(type) ?? []).filter(object => this.inRangeTo(object.pos, range));
    }
}

function position(x: number, y: number, roomName = homeName): RoomPosition {
    return new TestPosition(x, y, roomName) as unknown as RoomPosition;
}

class TestRoom {
    memory = {queue: [] as CreepMemory[]};
    energyCapacityAvailable = 600;
    controller?: StructureController;
    myCreeps: Creep[] = [];
    hostiles: Creep[] = [];
    structures: Structure[] = [];

    constructor(public name: string) {}

    find(type: number): Array<Creep | Structure> {
        if (type === FIND_HOSTILE_CREEPS) {
            return this.hostiles;
        }
        if (type === FIND_CREEPS) {
            return [...this.myCreeps, ...this.hostiles];
        }
        if (type === FIND_STRUCTURES) {
            return this.structures;
        }
        if (type === FIND_HOSTILE_STRUCTURES) {
            return this.structures.filter(structure =>
                !("my" in structure) || !structure.my);
        }
        if (type === FIND_MY_STRUCTURES) {
            return this.structures.filter(structure =>
                "my" in structure && structure.my);
        }
        return [];
    }

    getTerrain(): {get: (x: number, y: number) => number} {
        return {get: () => 0};
    }
}

class TestCreep {
    id: Id<Creep>;
    owner = {username: "Me"};
    body: BodyPartDefinition[];
    hits = 100;
    hitsMax = 100;
    ticksToLive = 1000;
    fatigue = 0;
    spawning = false;
    actions: Array<{method: string; target?: Creep | Structure}> = [];
    moves: string[] = [];
    paths: RoomPosition[][] = [];

    constructor(
        public name: string,
        public room: TestRoom,
        public pos: RoomPosition,
        public memory: CreepMemory,
        body: BodyPartConstant[] = [ATTACK, MOVE]
    ) {
        this.id = name as Id<Creep>;
        this.body = body.map(type => ({type, hits: 100}));
    }

    getActiveBodyparts(type: BodyPartConstant): number {
        return this.body.filter(part => part.type === type && part.hits > 0).length;
    }

    attack(target: Creep | Structure): ScreepsReturnCode {
        this.actions.push({method: "attack", target});
        return OK;
    }

    attackController(target: StructureController): ScreepsReturnCode {
        this.actions.push({method: "attackController", target});
        return OK;
    }

    rangedAttack(target: Creep | Structure): ScreepsReturnCode {
        this.actions.push({method: "rangedAttack", target});
        return OK;
    }

    rangedMassAttack(): ScreepsReturnCode {
        this.actions.push({method: "rangedMassAttack"});
        return OK;
    }

    heal(target: Creep): ScreepsReturnCode {
        this.actions.push({method: "heal", target});
        return OK;
    }

    rangedHeal(target: Creep): ScreepsReturnCode {
        this.actions.push({method: "rangedHeal", target});
        return OK;
    }

    move(): ScreepsReturnCode {
        this.moves.push("move");
        return OK;
    }

    moveByPath(path: RoomPosition[]): ScreepsReturnCode {
        this.moves.push("moveByPath");
        this.paths.push(path);
        return OK;
    }

    moveTo(): ScreepsReturnCode {
        this.moves.push("moveTo");
        return OK;
    }
}

class TestCostMatrix {
    private costs = new Map<number, number>();

    get(x: number, y: number): number {
        return this.costs.get(x * 50 + y) ?? 0;
    }

    set(x: number, y: number, cost: number): void {
        this.costs.set(x * 50 + y, cost);
    }

    clone(): TestCostMatrix {
        const matrix = new TestCostMatrix();
        matrix.costs = new Map(this.costs);
        return matrix;
    }
}

function asGameRoom(room: TestRoom): Room {
    return room as unknown as Room;
}

function asGameCreep(creep: TestCreep): Creep {
    return creep as unknown as Creep;
}

function testRoom(name: string): TestRoom {
    const room = rooms.get(name);
    if (!room) {
        throw new Error(`Test room ${name} is missing`);
    }
    return room;
}

function addRoom(name: string): TestRoom {
    const room = new TestRoom(name);
    rooms.set(name, room);
    Game.rooms[name] = asGameRoom(room);
    return room;
}

function addFlag(name: string, pos: RoomPosition): void {
    Game.flags[name] = {name, pos} as Flag;
}

function addCreep(
    name: string,
    combatClass: CombatClass,
    room: TestRoom,
    pos: RoomPosition,
    operationId = "squad",
    body?: BodyPartConstant[]
): TestCreep {
    const creep = new TestCreep(name, room, pos, {
        role: "combatant", room: homeName, body: body ?? [ATTACK, MOVE],
        operationId, combatClass, slotId: `${operationId}:${combatClass}:0`
    }, body);
    room.myCreeps.push(asGameCreep(creep));
    Game.creeps[name] = asGameCreep(creep);
    objects.set(creep.id, asGameCreep(creep));
    return creep;
}

function addHostile(
    name: string, room: TestRoom, pos: RoomPosition, parts: BodyPartConstant[], owner = "Enemy"
): TestCreep {
    const hostile = new TestCreep(name, room, pos,
        {role: "combatant", room: room.name, body: parts}, parts);
    hostile.owner.username = owner;
    room.hostiles.push(asGameCreep(hostile));
    objects.set(hostile.id, asGameCreep(hostile));
    return hostile;
}

function addStructure(room: TestRoom, structure: Structure): void {
    room.structures.push(structure);
    objects.set(structure.id, structure);
}

function operation(overrides: Partial<CombatOperationMemory> = {}): CombatOperationMemory {
    return {
        type: "defend", state: "forming", homeRoom: homeName,
        targetRoom: targetName, rallyFlag: "Rally",
        retreatHitsRatio: 0.5, required: {melee: 1, ranger: 0, healer: 1},
        ...overrides
    };
}

function context(
    op: CombatOperationMemory, creep: TestCreep, members: TestCreep[],
    hostiles: TestCreep[] = [], partner?: TestCreep
): CombatContext {
    return {
        operation: op, members: members.map(asGameCreep), hostiles: hostiles.map(asGameCreep),
        threats: hostiles.map(asGameCreep), towers: [], rally: Game.flags.Rally.pos,
        objective: position(25, 25, op.targetRoom),
        focus: hostiles[0] ? asGameCreep(hostiles[0]) : undefined,
        partner: partner ? asGameCreep(partner) : undefined,
        leader: members[0] ? asGameCreep(members[0]) : undefined
    };
}

beforeEach(() => {
    objects.clear();
    rooms.clear();
    Object.assign(globalThis, {
        OK: 0, ERR_TIRED: -11, MOVE: "move", TOUGH: "tough", ATTACK: "attack",
        RANGED_ATTACK: "ranged_attack", HEAL: "heal", WORK: "work", CLAIM: "claim",
        FIND_HOSTILE_CREEPS: 1, FIND_CREEPS: 2, FIND_STRUCTURES: 3,
        FIND_HOSTILE_STRUCTURES: 4, FIND_MY_STRUCTURES: 5,
        LOOK_STRUCTURES: "structure", LOOK_CREEPS: "creep",
        STRUCTURE_ROAD: "road", STRUCTURE_CONTAINER: "container",
        STRUCTURE_RAMPART: "rampart",
        STRUCTURE_TOWER: "tower", STRUCTURE_SPAWN: "spawn", STRUCTURE_WALL: "constructedWall",
        STRUCTURE_CONTROLLER: "controller",
        OBSTACLE_OBJECT_TYPES: ["spawn", "tower", "constructedWall"],
        TERRAIN_MASK_WALL: 1, TERRAIN_MASK_SWAMP: 2,
        BODYPART_COST: {
            tough: 10, attack: 80, move: 50, heal: 250, ranged_attack: 150, claim: 600
        },
        BOOSTS: {
            attack: {XUH2O: {attack: 4}},
            heal: {XLHO2: {heal: 4, rangedHeal: 4}},
            ranged_attack: {XKHO2: {rangedAttack: 3, rangedMassAttack: 3}},
            tough: {XGHO2: {damage: 0.3}}
        },
        MAX_CREEP_SIZE: 50, CREEP_SPAWN_TIME: 3, ATTACK_POWER: 30,
        RANGED_ATTACK_POWER: 10, HEAL_POWER: 12, RANGED_HEAL_POWER: 4,
        TOWER_ENERGY_COST: 10, TOWER_POWER_ATTACK: 600,
        TOWER_OPTIMAL_RANGE: 5, TOWER_FALLOFF_RANGE: 20, TOWER_FALLOFF: 0.75,
        RESOURCE_ENERGY: "energy",
        RoomPosition: TestPosition,
        PathFinder: {
            CostMatrix: TestCostMatrix,
            search: jest.fn((start: RoomPosition) => ({
                path: [position(start.x - 1, start.y, start.roomName)],
                ops: 1, cost: 1, incomplete: false
            }))
        },
        Game: {
            time: ++tick, rooms: {}, flags: {}, creeps: {},
            spawns: {Spawn1: {owner: {username: "Me"}}},
            map: {getRoomLinearDistance: (from: string, to: string) => from === to ? 0 : 1},
            getObjectById: (id: string) => objects.get(id) ?? null
        },
        Memory: {combatOperations: {}, creeps: {}}
    });
    addRoom(homeName);
    addRoom(targetName);
    addFlag("Rally", position(10, 10));
    jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("combat bodies and damage", () => {
    test("builds affordable, mobile squads with TOUGH in front", () => {
        expect(buildCombatBody("melee", 760)).toEqual([
            TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK,
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
        ]);
        expect(buildCombatBody("ranger", 600)).toEqual([
            RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE, RANGED_ATTACK, MOVE
        ]);
        expect(buildCombatBody("healer", 600)).toEqual([HEAL, MOVE, HEAL, MOVE]);
        expect(buildCombatBody("melee", 1300, "controller")).toEqual([
            CLAIM, MOVE, CLAIM, MOVE
        ]);
        expect(buildCombatBody("healer", 20000)).toHaveLength(MAX_CREEP_SIZE);
        expect(buildCombatBody("healer", 200)).toEqual([]);
    });

    test("accounts for boosts, tower falloff and rampart protection", () => {
        const room = testRoom(homeName);
        const healer = addCreep("healer", "healer", room, position(10, 10), "squad", [HEAL, MOVE]);
        healer.body[0].boost = "XLHO2";
        expect(healPower(asGameCreep(healer))).toBe(48);
        const tough = addCreep("tough", "melee", room, position(10, 11),
            "squad", [TOUGH, ATTACK, MOVE]);
        tough.body[0].boost = "XGHO2";
        expect(effectiveIncomingDamage(asGameCreep(tough), 100)).toBeCloseTo(30);
        const tower = {
            id: "tower", pos: position(10, 10), structureType: STRUCTURE_TOWER,
            my: false, owner: {username: "Enemy"},
            store: {getUsedCapacity: () => 100}
        } as StructureTower;
        addStructure(room, tower);
        expect(towerDamage(tower, position(10, 10))).toBe(600);
        expect(towerDamage(tower, position(30, 30))).toBe(150);
        const rampart = {
            id: "rampart", pos: tough.pos, structureType: STRUCTURE_RAMPART,
            my: true, isPublic: false, hits: 10000
        } as StructureRampart;
        addStructure(room, rampart);
        expect(incomingDamage(tough.pos, [], [tower])).toBe(0);
        rampart.hits = 1;
        expect(incomingDamage(tough.pos, [], [tower])).toBeGreaterThan(0);
    });
});

describe("combat operations", () => {
    test("requires a gathered healer, pairs the squad and recovers after retreat", () => {
        const op = operation();
        Memory.combatOperations.squad = op;
        const home = testRoom(homeName);
        const target = testRoom(targetName);
        runCombatOperations();
        expect(home.memory.queue.map(memory => memory.slotId)).toEqual([
            "squad:melee:0", "squad:healer:0"
        ]);
        const melee = addCreep("melee", "melee", home, position(10, 10));
        const healer = addCreep("healer", "healer", home, position(20, 20), "squad", [HEAL, MOVE]);
        runCombatOperations();
        expect(op.state).toBe("forming");
        expect(melee.memory.partnerName).toBe("healer");
        expect(healer.memory.partnerName).toBe("melee");
        healer.pos = position(11, 10);
        runCombatOperations();
        expect(op.state).toBe("travelling");

        home.myCreeps.length = 0;
        target.myCreeps.push(asGameCreep(melee), asGameCreep(healer));
        melee.room = target;
        healer.room = target;
        melee.pos = position(25, 25, targetName);
        healer.pos = position(26, 25, targetName);
        runCombatOperations();
        expect(op.state).toBe("engaging");
        melee.hits = 40;
        runCombatOperations();
        expect(op.state).toBe("retreating");
        melee.hits = 100;
        melee.room = home;
        healer.room = home;
        melee.pos = position(10, 10);
        healer.pos = position(11, 10);
        runCombatOperations();
        expect(op.state).toBe("forming");
    });

    test("uses stable replacement slots without duplicate respawns", () => {
        const op = operation({
            targetRoom: homeName, state: "engaging",
            required: {melee: 0, ranger: 1, healer: 0}
        });
        Memory.combatOperations.squad = op;
        const room = testRoom(homeName);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        ranger.ticksToLive = 20;
        runCombatOperations();
        expect(room.memory.queue).toHaveLength(1);
        expect(room.memory.queue[0].slotId).toBe("squad:ranger:0");
        expect(shouldSpawnCombatCreep(room.memory.queue[0])).toBe(true);
        runCombatOperations();
        expect(room.memory.queue).toHaveLength(1);
        const replacement = addCreep("replacement", "ranger", room, position(11, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        runCombatOperations();
        expect(shouldSpawnCombatCreep(room.memory.queue[0] ??
            replacement.memory)).toBe(false);
        expect(room.memory.queue).toHaveLength(0);
        op.state = "complete";
        room.memory.queue.push({
            ...replacement.memory, body: [RANGED_ATTACK, MOVE]
        });
        runCombatOperations();
        expect(room.memory.queue).toHaveLength(0);
        expect(shouldSpawnCombatCreep(replacement.memory)).toBe(false);
    });

    test("waits for a fresh healer before leaving and retreats from ignored keeper damage", () => {
        const op = operation({
            targetRoom: homeName,
            required: {melee: 0, ranger: 1, healer: 1}
        });
        Memory.combatOperations.squad = op;
        const room = testRoom(homeName);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        const healer = addCreep("healer", "healer", room, position(11, 10),
            "squad", [HEAL, MOVE]);
        healer.ticksToLive = 20;
        runCombatOperations();
        expect(op.state).toBe("forming");
        healer.ticksToLive = 1000;
        runCombatOperations();
        expect(op.state).toBe("travelling");
        runCombatOperations();
        expect(op.state).toBe("engaging");
        const keeper = addHostile("keeper", room, position(11, 11), [
            ATTACK, ATTACK, ATTACK, ATTACK
        ], "Source Keeper");
        ranger.hits = 80;
        runCombatOperations();
        expect(op.focusTargetId).toBeUndefined();
        expect(op.state).toBe("retreating");
        expect(keeper.actions).toHaveLength(0);
    });

    test("replaces a healer that has lost HEAL without deploying the disabled member", () => {
        const op = operation({
            targetRoom: homeName, state: "engaging",
            required: {melee: 0, ranger: 1, healer: 1}
        });
        Memory.combatOperations.squad = op;
        const room = testRoom(homeName);
        addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        const disabled = addCreep("disabled", "healer", room, position(11, 10),
            "squad", [HEAL, MOVE]);
        disabled.body[0].hits = 0;
        runCombatOperations();
        expect(op.state).toBe("retreating");
        expect(room.memory.queue.map(memory => memory.slotId)).toEqual(["squad:healer:0"]);
        expect(shouldSpawnCombatCreep(room.memory.queue[0])).toBe(true);
        runCombatOperations();
        expect(room.memory.queue).toHaveLength(1);
        expect(op.state).toBe("forming");

        const replacement = addCreep("replacement", "healer", room, position(11, 11),
            "squad", [HEAL, MOVE]);
        runCombatOperations();
        expect(op.state).toBe("travelling");
        expect(replacement.memory.partnerName).toBe("ranger");
        expect(room.memory.queue).toHaveLength(0);
    });

    test("breaches only an explicit structure, then completes the assault", () => {
        const op = operation({
            type: "attack", state: "engaging", assaultTarget: "rampart",
            targetFlag: "Breach", required: {melee: 1, ranger: 0, healer: 0}
        });
        addFlag("Breach", position(22, 22, targetName));
        Memory.combatOperations.squad = op;
        const target = testRoom(targetName);
        const melee = addCreep("melee", "melee", target, position(21, 22, targetName));
        addHostile("protected", target, position(22, 22, targetName), [HEAL]);
        const rampart = {
            id: "breach", pos: position(22, 22, targetName),
            structureType: STRUCTURE_RAMPART, my: false, isPublic: false
        } as StructureRampart;
        addStructure(target, rampart);
        runCombatOperations();
        expect(op.focusTargetId).toBe(rampart.id);
        expect(melee.memory.targetId).toBe(rampart.id);
        target.structures.length = 0;
        objects.delete(rampart.id);
        const home = testRoom(homeName);
        home.memory.queue.push({
            role: "combatant", room: homeName, body: [ATTACK, MOVE],
            operationId: "squad", combatClass: "melee", slotId: "squad:melee:0"
        });
        runCombatOperations();
        expect(op.state).toBe("complete");
        expect(home.memory.queue).toHaveLength(0);
    });

    test("retreats to the rally when a target flag disappears", () => {
        const op = operation({
            state: "travelling", targetFlag: "Lost",
            required: {melee: 1, ranger: 0, healer: 0}
        });
        Memory.combatOperations.squad = op;
        const target = testRoom(targetName);
        const melee = addCreep("melee", "melee", target, position(25, 25, targetName));
        runCombatOperations();
        expect(op.state).toBe("retreating");
        runCombatUnit(asGameCreep(melee), "melee");
        expect(melee.moves).toEqual(["moveTo"]);
    });

    test("does not respawn a completed squad or block other spawn work", () => {
        Memory.combatOperations.squad = operation({
            targetRoom: homeName, state: "complete",
            required: {melee: 1, ranger: 0, healer: 0}
        });
        const room = testRoom(homeName);
        room.memory.queue.push({
            role: "combatant", room: homeName, body: [ATTACK, MOVE],
            operationId: "squad", combatClass: "melee", slotId: "squad:melee:0"
        }, {role: "truck", room: homeName, body: [MOVE]});

        class TestSpawn {
            calls: string[] = [];
            room = room;
            name = "Spawn1";

            spawnCreep(_body: BodyPartConstant[], name: string): ScreepsReturnCode {
                this.calls.push(name);
                return OK;
            }
        }
        Object.assign(globalThis, {StructureSpawn: TestSpawn});
        require("../prototype/prototype.spawn");
        const spawn = new TestSpawn();
        (spawn as unknown as StructureSpawn).SpawnCreepsIfNecessary();
        expect(spawn.calls).toEqual([`truck${Game.time}`]);
        expect(room.memory.queue).toHaveLength(0);
    });

    test("does not use the generic early-respawn path for combat roles", () => {
        Memory.combatOperations.squad = operation({
            targetRoom: homeName, state: "complete",
            required: {melee: 0, ranger: 1, healer: 0}
        });
        const room = testRoom(homeName);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        ranger.ticksToLive = 1;
        Object.assign(globalThis, {Creep: TestCreep});
        require("../prototype/prototype.creep");
        asGameCreep(ranger).runRole();
        expect(room.memory.queue).toHaveLength(0);
    });

    test("attacks a controller only with CLAIM parts and completes after capture", () => {
        const op = operation({
            type: "attack", assaultTarget: "controller", state: "engaging",
            required: {melee: 1, ranger: 0, healer: 0}
        });
        Memory.combatOperations.squad = op;
        const target = testRoom(targetName);
        const controller = {
            id: "controller", pos: position(25, 25, targetName),
            structureType: STRUCTURE_CONTROLLER, level: 3, my: false
        } as StructureController;
        target.controller = controller;
        objects.set(controller.id, controller);
        const claimant = addCreep("claimant", "melee", target,
            position(24, 25, targetName), "squad", [CLAIM, MOVE]);
        runCombatOperations();
        expect(op.focusTargetId).toBe(controller.id);
        runCombatUnit(asGameCreep(claimant), "melee");
        expect(claimant.actions).toEqual([{method: "attackController", target: controller}]);
        expect(claimant.moves).toHaveLength(0);
        controller.my = true;
        runCombatOperations();
        expect(op.state).toBe("complete");
    });

    test("ends creep-only raids after the target room stays clear", () => {
        const op = operation({
            type: "harass", state: "engaging",
            required: {melee: 1, ranger: 0, healer: 0}
        });
        Memory.combatOperations.squad = op;
        addCreep("raider", "melee", testRoom(targetName), position(25, 25, targetName));
        runCombatOperations();
        expect(op.noTargetSince).toBe(Game.time);
        Game.time += 9;
        runCombatOperations();
        expect(op.state).toBe("engaging");
        Game.time++;
        runCombatOperations();
        expect(op.state).toBe("complete");
    });
});

describe("targeting and tactics", () => {
    test("focuses healers, locks targets briefly and obeys keeper policy", () => {
        const op = operation();
        const room = testRoom(targetName);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10, targetName));
        const healer = addHostile("enemyHealer", room, position(15, 10, targetName),
            [HEAL, HEAL]);
        addHostile("keeper", room, position(11, 10, targetName), [ATTACK], "Source Keeper");
        expect(shouldEngage("Source Keeper", "defend")).toBe(false);
        expect(shouldEngage("Source Keeper", "sourceKeeper")).toBe(true);
        expect(selectFocusTarget(op, [asGameCreep(ranger)])).toBe(healer);
        const dangerous = addHostile("danger", room, position(11, 11, targetName),
            [ATTACK, ATTACK, RANGED_ATTACK]);
        expect(selectFocusTarget(op, [asGameCreep(ranger)])).toBe(healer);
        Game.time += 6;
        expect(selectFocusTarget(op, [asGameCreep(ranger)])).toBe(dangerous);
    });

    test("heals an adjacent dying member before a distant partner and uses rangedHeal", () => {
        const op = operation({state: "engaging"});
        const room = testRoom(homeName);
        const healer = addCreep("healer", "healer", room, position(10, 10),
            "squad", [HEAL, MOVE]);
        const partner = addCreep("partner", "melee", room, position(14, 10));
        partner.hits = 60;
        healer.memory.partnerName = partner.name;
        const ally = addCreep("ally", "ranger", room, position(11, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        ally.hits = 10;
        const enemy = addHostile("enemy", room, position(12, 10), [ATTACK]);
        let plan = planHealer(asGameCreep(healer),
            context(op, healer, [healer, partner, ally], [enemy], partner));
        plan.action?.();
        expect(healer.actions[0]).toEqual({method: "heal", target: ally});
        ally.hits = 100;
        partner.pos = position(13, 10);
        plan = planHealer(asGameCreep(healer),
            context(op, healer, [healer, partner, ally], [], partner));
        plan.action?.();
        expect(healer.actions[1]).toEqual({method: "rangedHeal", target: partner});
        partner.hits = 99;
        ally.hits = 20;
        ally.pos = position(12, 10);
        plan = planHealer(asGameCreep(healer),
            context(op, healer, [healer, partner, ally], [], partner));
        plan.action?.();
        expect(healer.actions[2]).toEqual({method: "rangedHeal", target: ally});
    });

    test("self-heals and avoids even enemies its operation will not attack", () => {
        const op = operation({state: "retreating"});
        const room = testRoom(homeName);
        const healer = addCreep("healer", "healer", room, position(10, 10),
            "squad", [HEAL, MOVE]);
        healer.hits = 40;
        const keeper = addHostile("keeper", room, position(11, 10), [ATTACK], "Source Keeper");
        const ctx = context(op, healer, [healer]);
        ctx.threats = [asGameCreep(keeper)];
        const plan = planHealer(asGameCreep(healer), ctx);
        plan.action?.();
        expect(healer.actions).toEqual([{method: "heal", target: healer}]);
        expect(plan.flee).toEqual([keeper.pos]);
        const matrix = combatCostMatrix(homeName, op);
        expect(matrix.get(12, 10)).toBeGreaterThan(0);
        expect(selectFocusTarget(op, [asGameCreep(healer)])).toBeUndefined();
        op.type = "sourceKeeper";
        expect(selectFocusTarget(op, [asGameCreep(healer)])).toBe(keeper);
    });

    test("uses mass attack only when it beats focus fire, and flees melee threats", () => {
        const op = operation({state: "engaging"});
        Memory.combatOperations.squad = op;
        const room = testRoom(homeName);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        const first = addHostile("first", room, position(11, 10), [ATTACK]);
        const second = addHostile("second", room, position(10, 11), [ATTACK]);
        let plan = planRanger(asGameCreep(ranger),
            context(op, ranger, [ranger], [first, second]));
        plan.action?.();
        expect(ranger.actions[0]?.method).toBe("rangedMassAttack");
        expect(plan.flee).toHaveLength(2);
        addStructure(room, {
            id: "road", pos: position(10, 10), structureType: STRUCTURE_ROAD
        } as StructureRoad);
        plan = planRanger(asGameCreep(ranger),
            context(op, ranger, [ranger], [first, second]));
        plan.action?.();
        expect(ranger.actions[1]?.method).toBe("rangedMassAttack");
        room.hostiles.pop();
        plan = planRanger(asGameCreep(ranger), context(op, ranger, [ranger], [first]));
        plan.action?.();
        expect(ranger.actions[2]).toEqual({method: "rangedAttack", target: first});
        op.focusTargetId = first.id;
        runCombatUnit(asGameCreep(ranger), "ranger");
        expect(ranger.moves).toEqual(["moveByPath"]);
    });

    test("reunites detached fighters and keeps a CLAIM-only melee behind its escort", () => {
        const op = operation({state: "engaging", assaultTarget: "controller"});
        const room = testRoom(homeName);
        const healer = addCreep("healer", "healer", room, position(20, 20),
            "squad", [HEAL, MOVE]);
        const ranger = addCreep("ranger", "ranger", room, position(10, 10),
            "squad", [RANGED_ATTACK, MOVE]);
        let plan = planRanger(asGameCreep(ranger), context(op, ranger, [ranger, healer]));
        expect(plan.movement).toBe(healer.pos);
        expect(plan.movementRange).toBe(2);

        const claimant = addCreep("claimant", "melee", room, position(11, 10),
            "squad", [CLAIM, MOVE]);
        const enemy = addHostile("enemy", room, position(14, 10), [ATTACK]);
        plan = planMelee(asGameCreep(claimant),
            context(op, claimant, [claimant, ranger, healer], [enemy], healer));
        expect(plan.action).toBeUndefined();
        expect(plan.movement).toBe(ranger.pos);
    });

    test("moves the melee anchor to intercept threats near its healer", () => {
        const op = operation({state: "engaging"});
        const room = testRoom(homeName);
        const melee = addCreep("melee", "melee", room, position(10, 10));
        const healer = addCreep("healer", "healer", room, position(12, 10),
            "squad", [HEAL, MOVE]);
        const threat = addHostile("threat", room, position(14, 10), [ATTACK]);
        const focus = addHostile("focus", room, position(20, 20), [RANGED_ATTACK]);
        const ctx = context(op, melee, [melee, healer], [threat, focus], healer);
        ctx.focus = asGameCreep(focus);
        const plan = planMelee(asGameCreep(melee), ctx);
        expect(plan.movement).toBe(threat.pos);
    });

    test("cost matrices penalize tower fire and block walls but prefer friendly ramparts", () => {
        const room = testRoom(homeName);
        const tower = {
            id: "tower", pos: position(10, 10), structureType: STRUCTURE_TOWER,
            my: false, owner: {username: "Enemy"},
            store: {getUsedCapacity: () => 100}
        } as StructureTower;
        addStructure(room, tower);
        addStructure(room, {
            id: "wall", pos: position(12, 10), structureType: STRUCTURE_WALL
        } as StructureWall);
        addStructure(room, {
            id: "rampart", pos: position(11, 10),
            structureType: STRUCTURE_RAMPART, my: true, isPublic: false
        } as StructureRampart);
        const matrix = combatCostMatrix(homeName, operation());
        expect(matrix.get(10, 11)).toBeGreaterThan(0);
        expect(matrix.get(12, 10)).toBe(255);
        expect(matrix.get(11, 10)).toBe(1);
    });

    test("flee movement follows a PathFinder route across a room exit", () => {
        const op = operation({state: "retreating"});
        const room = testRoom(homeName);
        const ranger = addCreep("ranger", "ranger", room, position(49, 20),
            "squad", [RANGED_ATTACK, MOVE]);
        const threat = addHostile("threat", room, position(48, 20), [ATTACK]);
        const step = position(0, 20, targetName);
        jest.spyOn(PathFinder, "search").mockReturnValue({
            path: [step], ops: 1, cost: 2, incomplete: false
        });
        const ctx = context(op, ranger, [ranger], [threat]);
        const plan = planRanger(asGameCreep(ranger), ctx);
        executeCombatMovement(asGameCreep(ranger), plan, ctx);
        expect(ranger.paths).toEqual([[step]]);
        expect(ranger.moves).toEqual(["moveByPath"]);
    });
});
