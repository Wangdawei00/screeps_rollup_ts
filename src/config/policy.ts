interface EmpirePolicy {
    minimumTowerEnergy: number;
    storageEnergyReserve: number;
    upgradeEnergySurplus: number;
    // wallTargetHitsByRcl: Partial<Record<number, number>>;
    maxRemoteDistance: number;
    expansionEnabled: boolean;
    marketEnabled: boolean;
    debug: boolean;
}

const policy: EmpirePolicy = {
    minimumTowerEnergy: 500,
    storageEnergyReserve: 100_000,
    maxRemoteDistance: 2,
    upgradeEnergySurplus: 50_000,
    expansionEnabled: true,
    marketEnabled: true,
    debug: false,
};

export default policy;