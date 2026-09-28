import { expect, it, jest } from "@jest/globals";
import { runKernel } from "@/kernel/kernel";
import { initializeMemory } from "@/kernel/memory";
import { addCreep, ownedRoom } from "./fixtures";

it("boots a flag-free room through the real kernel and retains its spawning demand across ticks", () => {
    const { room, spawn } = ownedRoom();
    jest.mocked(spawn.spawnCreep).mockImplementation((body, name, options) => {
        Memory.creeps[name] = options!.memory!;
        spawn.spawning = {
            name, needTime: body.length * CREEP_SPAWN_TIME, remainingTime: body.length * CREEP_SPAWN_TIME,
            spawn, cancel: () => OK, setDirections: () => OK
        };
        return OK;
    });
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    runKernel();
    expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
    expect(Memory.colonies[room.name].sourcePlans).not.toEqual({});
    expect(Memory.colonies[room.name].construction.plannedSites.length).toBeGreaterThan(0);
    Game.time++;
    runKernel();
    expect(spawn.spawnCreep).toHaveBeenCalledTimes(1);
    expect(Memory.colonies[room.name].spawnQueue.some(request => request.role === "harvester")).toBe(false);
    expect(log.mock.calls.map(call => String(call[0])).filter(message => /Error:|TypeError:/.test(message))).toEqual([]);
    log.mockRestore();
});

it("continues spawning in a healthy colony when another room model fails", () => {
    const broken = ownedRoom("W1N1");
    const healthy = ownedRoom("W2N2");
    jest.mocked(broken.room.find).mockImplementation(() => { throw new Error("damaged room fixture"); });
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    runKernel();
    expect(healthy.spawn.spawnCreep).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("model:W1N1"));
    log.mockRestore();
});

it("isolates malformed creeps without breaking local recovery or other executors", () => {
    const { room } = ownedRoom();
    initializeMemory();
    const malformed = addCreep(room, "harvester", "malformed");
    Reflect.set(malformed.memory, "role", "unsupported");
    const harvester = addCreep(room, "harvester", "local:harvester:W1N1:0");
    harvester.pos = new RoomPosition(11, 10, room.name);
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    Game.time = 100;
    runKernel();
    expect(harvester.harvest).toHaveBeenCalled();
    expect(malformed.harvest).not.toHaveBeenCalled();
    log.mockRestore();
});
