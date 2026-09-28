import type {ThreatAssessment} from "@/domain/types";

const COST: Record<BodyPartConstant, number> = {
    move: 50, work: 100, carry: 50, attack: 80, ranged_attack: 150, heal: 250, claim: 600, tough: 10
};

export function bodyCost(body: readonly BodyPartConstant[]): number {
    return body.reduce((cost, part) => cost + COST[part], 0);
}

function affordable(body: BodyPartConstant[], budget: number): boolean {
    return Number.isFinite(budget) && body.length <= 50 && bodyCost(body) <= budget;
}

function repeat(unit: BodyPartConstant[], budget: number, limit = 50): BodyPartConstant[] {
    if (!Number.isFinite(budget) || budget < bodyCost(unit)) return [];
    const count = Math.max(0, Math.min(Math.floor(budget / bodyCost(unit)), Math.floor(limit / unit.length)));
    return Array.from({length: count}, () => unit).flat();
}

// An impossible (or non-finite) budget returns []; demand producers must skip empty bodies.
export function buildHarvester(budget: number): BodyPartConstant[] {
    return repeat(["work", "carry", "move"], budget);
}

export function buildMiner(budget: number, road = false): BodyPartConstant[] {
    for (let work = 5; work >= 1; work--) {
        const move = road ? Math.ceil((work + 1) / 2) : work + 1;
        const body: BodyPartConstant[] = [
            ...Array<BodyPartConstant>(work).fill("work"), "carry", ...Array<BodyPartConstant>(move).fill("move")
        ];
        if (affordable(body, budget)) return body;
    }
    return [];
}

export function buildTransporter(budget: number, carryParts = 32, road = false): BodyPartConstant[] {
    if (!Number.isFinite(carryParts)) return [];
    for (let carry = Math.min(33, Math.floor(carryParts)); carry >= 1; carry--) {
        const move = road ? Math.ceil(carry / 2) : carry;
        const body: BodyPartConstant[] = [
            ...Array<BodyPartConstant>(carry).fill("carry"), ...Array<BodyPartConstant>(move).fill("move")
        ];
        if (affordable(body, budget)) return body;
    }
    return [];
}

export function buildWorker(budget: number): BodyPartConstant[] {
    return repeat(["work", "carry", "carry", "move", "move"], budget);
}

export function buildUpgrader(budget: number, workParts = 15): BodyPartConstant[] {
    if (!Number.isFinite(workParts)) return [];
    for (let work = Math.min(31, Math.floor(workParts)); work >= 1; work--) {
        const carry = Math.max(1, Math.ceil(work / 5));
        const move = Math.ceil((work + carry) / 2);
        const body: BodyPartConstant[] = [
            ...Array<BodyPartConstant>(work).fill("work"),
            ...Array<BodyPartConstant>(carry).fill("carry"), ...Array<BodyPartConstant>(move).fill("move")
        ];
        if (affordable(body, budget)) return body;
    }
    return [];
}

export function buildReserver(budget: number): BodyPartConstant[] {
    return repeat(["claim", "move"], budget, 4);
}

export function buildDefender(budget: number, threat: ThreatAssessment): BodyPartConstant[] {
    const ranged = threat.attack + threat.dismantle > threat.ranged && budget >= 200;
    const weapon: BodyPartConstant = ranged ? "ranged_attack" : "attack";
    let body: BodyPartConstant[] = [weapon, "move"];
    if (!affordable(body, budget)) return [];
    if (threat.total > 0 && affordable([...body, "move", "heal"], budget)) body.push("move", "heal");
    while (affordable([...body, weapon, "move"], budget)) body.push(weapon, "move");
    while (affordable(["tough", ...body, "move"], budget)) body = ["tough", ...body, "move"];
    const order: Record<BodyPartConstant, number> = {
        tough: 0, work: 1, carry: 1, attack: 2, ranged_attack: 2, claim: 3, move: 4, heal: 5
    };
    return body.sort((a, b) => order[a] - order[b]);
}