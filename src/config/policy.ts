export interface EmpirePolicy {
    minimumTowerEnergy: number;
    storageEnergyReserve: number;
    upgradeEnergySurplus: number;
    wallTargetHitsByRcl: Partial<Record<number, number>>;
    maxRemoteDistance: number;
    expansionEnabled: boolean;
    marketEnabled: boolean;
    debug: boolean;
    constructionSitesPerTick: number;
    constructionSiteSafetyMargin: number;
    logisticsLeaseDuration: number;
    replacementTravelBuffer: number;
    minimumCpuBucket: number;
    expansionEnergyThreshold: number;
    remoteSuspensionDuration: number;
    remoteEnabled: boolean;
    attackHostileReservations: boolean;
    intelMaxAge: number;
    expansionTimeout: number;
    terminalEnergyReserve: number;
    mineralRetain: number;
    mineralSurplus: number;
    mineralShortage: number;
    marketMinimumCredits: number;
    marketMinimumSellPrice: number;
    marketMaximumBuyPrice: number;
    marketEnergyPrice: number;
    productionEnabled: boolean;
    productionBatch: number;
}

const policy: EmpirePolicy = {
    minimumTowerEnergy: 500,
    storageEnergyReserve: 100_000,
    maxRemoteDistance: 2,
    upgradeEnergySurplus: 50_000,
    expansionEnabled: true,
    marketEnabled: true,
    debug: false,
    wallTargetHitsByRcl: { 2: 5_000, 3: 10_000, 4: 25_000, 5: 50_000, 6: 100_000, 7: 250_000, 8: 1_000_000 },
    constructionSitesPerTick: 5,
    constructionSiteSafetyMargin: 5,
    logisticsLeaseDuration: 25,
    replacementTravelBuffer: 15,
    minimumCpuBucket: 5_000,
    expansionEnergyThreshold: 200_000,
    remoteSuspensionDuration: 1_500,
    remoteEnabled: true,
    attackHostileReservations: false,
    intelMaxAge: 1_500,
    expansionTimeout: 10_000,
    terminalEnergyReserve: 30_000,
    mineralRetain: 5_000,
    mineralSurplus: 10_000,
    mineralShortage: 1_000,
    marketMinimumCredits: 100_000,
    marketMinimumSellPrice: 0.01,
    marketMaximumBuyPrice: 1,
    marketEnergyPrice: 0.05,
    productionEnabled: true,
    productionBatch: 1_000,
};

export function validatePolicy(value: EmpirePolicy = policy): void {
    for (const [key, amount] of Object.entries(value)) {
        if (typeof amount === "number" && (!Number.isFinite(amount) || amount < 0)) {
            throw new Error(`Invalid policy ${key}: ${amount}`);
        }
    }
    for (const [level, hits] of Object.entries(value.wallTargetHitsByRcl)) {
        if (!/^[1-8]$/.test(level) || !Number.isFinite(hits) || hits! < 0) {
            throw new Error(`Invalid wall policy at RCL ${level}`);
        }
    }
    if (value.constructionSitesPerTick < 1 || value.constructionSiteSafetyMargin >= 100 ||
        value.logisticsLeaseDuration < 1 || value.minimumCpuBucket > 10_000 || value.minimumTowerEnergy > 1_000 ||
        value.productionBatch < 1 ||
        value.mineralShortage > value.mineralRetain || value.mineralRetain > value.mineralSurplus) {
        throw new Error("Invalid policy limits");
    }
    for (const key of [
        "constructionSitesPerTick", "constructionSiteSafetyMargin", "logisticsLeaseDuration",
        "replacementTravelBuffer", "maxRemoteDistance", "remoteSuspensionDuration", "intelMaxAge", "expansionTimeout"
    ] as const) {
        if (!Number.isInteger(value[key])) throw new Error(`Policy ${key} must be an integer`);
    }
}

export default policy;