import {beforeEach} from "@jest/globals";

Object.assign(globalThis, require("@screeps/common/lib/constants"));
Object.assign(globalThis, {_: require("lodash")});

class TestRoomPosition {
    constructor(public x: number, public y: number, public roomName: string) {
    }

    getRangeTo(target: RoomPosition | { pos: RoomPosition } | number, y?: number): number {
        if (typeof target === "number") return Math.max(Math.abs(this.x - target), Math.abs(this.y - y!));
        const position = "pos" in target ? target.pos : target;
        return position.roomName !== this.roomName ? Infinity :
            Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y));
    }

    inRangeTo(target: RoomPosition | { pos: RoomPosition }, range: number): boolean {
        return this.getRangeTo(target) <= range;
    }

    isNearTo(target: RoomPosition | { pos: RoomPosition }): boolean {
        return this.inRangeTo(target, 1);
    }

    isEqualTo(target: RoomPosition | { pos: RoomPosition } | number, y?: number): boolean {
        return this.getRangeTo(target, y) === 0;
    }

    findClosestByRange<T extends { pos: RoomPosition }>(targets: T[]): T | null {
        return [...targets].sort((a, b) => this.getRangeTo(a) - this.getRangeTo(b))[0] || null;
    }

    findClosestByPath<T extends { pos: RoomPosition }>(targets: T[]): T | null {
        return this.findClosestByRange(targets);
    }

    lookFor(type: LookConstant): unknown[] {
        return Game.rooms[this.roomName]?.lookForAt(type, this.x, this.y) || [];
    }
}

class TestCostMatrix {
    private readonly costs = new Map<string, number>();

    set(x: number, y: number, cost: number): void {
        this.costs.set(`${x}:${y}`, cost);
    }

    get(x: number, y: number): number {
        return this.costs.get(`${x}:${y}`) || 0;
    }
}

Object.assign(globalThis, {
    RoomPosition: TestRoomPosition,
    Room: {
        Terrain: class {
            get(): number {
                return 0;
            }
        }
    },
    PathFinder: {
        CostMatrix: TestCostMatrix,
        search: (origin: RoomPosition, goal: { pos: RoomPosition; range: number } | {
            pos: RoomPosition;
            range: number
        }[]) => {
            const target = Array.isArray(goal) ? goal[0] : goal;
            const path: RoomPosition[] = [];
            let {x, y} = origin;
            for (let step = 0; step < 100 &&
            Math.max(Math.abs(x - target.pos.x), Math.abs(y - target.pos.y)) > target.range; step++) {
                x += Math.sign(target.pos.x - x);
                y += Math.sign(target.pos.y - y);
                path.push(new RoomPosition(x, y, target.pos.roomName));
            }
            return {path, incomplete: false, ops: path.length, cost: path.length};
        }
    }
});

beforeEach(() => {
    Object.assign(globalThis, {
        Memory: {},
        Game: {
            time: 1, creeps: {}, rooms: {}, spawns: {}, constructionSites: {}, flags: {},
            getObjectById: () => null,
            cpu: {bucket: 10_000, getUsed: () => 0, limit: 20},
            gcl: {level: 1},
            map: {
                getRoomTerrain: () => ({get: () => 0}),
                describeExits: () => ({}),
                findRoute: () => [],
                getRoomLinearDistance: () => 1,
                getRoomStatus: () => ({status: "normal", timestamp: null})
            },
            market: {credits: 0}
        }
    });
});
