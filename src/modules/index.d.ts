interface CreepMemory {
    role: string;
    building?: boolean;
    working?: boolean;
    upgrading?: boolean;
}

interface Creep {
    // prototype: Creep;
    getEnergy(useContainer: boolean, useSource: boolean): void;
    runRole(): void;
}