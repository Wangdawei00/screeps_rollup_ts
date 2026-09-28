import { expect, it, jest } from "@jest/globals";
import policy, { validatePolicy } from "../src/config/policy";
import { assignmentMatchesRole, hasRoleParts, isAssignment, isPosition, serializePosition } from "@/domain/types";
import { initializeMemory, spawnRequestError } from "@/kernel/memory";

it("persists positions as plain coordinate records and rejects malformed assignments", () => {
    const position = new RoomPosition(10, 11, "W1N1");
    expect(serializePosition(position)).toEqual({ x: 10, y: 11, roomName: "W1N1" });
    expect(Object.getPrototypeOf(serializePosition(position))).toBe(Object.prototype);
    expect(isPosition({ x: 50, y: 1, roomName: "W1N1" })).toBe(false);
    expect(isAssignment({ type: "source", sourceId: "source" })).toBe(false);
    expect(isAssignment({ type: "logistics", jobId: 1 })).toBe(false);
    expect(assignmentMatchesRole("miner", { type: "logistics" })).toBe(false);
    expect(hasRoleParts("harvester", part => part !== WORK)).toBe(false);
    expect(hasRoleParts("defender", part => part === MOVE || part === RANGED_ATTACK)).toBe(true);
});

it("validates strategic policy without consulting the game", () => {
    expect(() => validatePolicy()).not.toThrow();
    expect(() => validatePolicy({ ...policy, minimumTowerEnergy: -1 })).toThrow("Invalid policy");
    expect(() => validatePolicy({ ...policy, wallTargetHitsByRcl: { 9: 100 } })).toThrow("wall policy");
    expect(() => validatePolicy({ ...policy, constructionSitesPerTick: 1.5 })).toThrow("integer");
    expect(() => validatePolicy({ ...policy, logisticsLeaseDuration: 0 })).toThrow("limits");
});

it("repairs malformed fields explicitly without losing unaffected memory", () => {
    initializeMemory();
    Memory.empire.market.lastAnalysis = 42;
    Reflect.set(Memory.empire, "production", null);
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    initializeMemory();
    expect(Memory.empire.production).toEqual({});
    expect(Memory.empire.market.lastAnalysis).toBe(42);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("invalid production"));
    log.mockRestore();
});

it("rejects unsupported schema versions instead of overwriting future memory", () => {
    Reflect.set(Memory, "schemaVersion", 999);
    expect(() => initializeMemory()).toThrow("Unsupported memory");
    expect(Memory.schemaVersion).toBe(999);
});

it("checks theoretical affordability, role body parts, and matching assignment at the queue boundary", () => {
    const request = {
        key: "harvester", homeRoom: "W1N1", role: "harvester",
        priority: 1, attempts: 0, createdAt: 1, body: [WORK, CARRY, MOVE]
    };
    expect(spawnRequestError(request, "W1N1")).toBeUndefined();
    expect(spawnRequestError({ ...request, body: [WORK, MOVE] })).toContain("carry");
    expect(spawnRequestError({ ...request, body: Array(50).fill(CLAIM) })).toContain("theoretical");
    expect(spawnRequestError({ ...request, role: "miner" })).toContain("assignment");
    expect(spawnRequestError({ ...request, body: ["__proto__"] })).toContain("body part");
});
