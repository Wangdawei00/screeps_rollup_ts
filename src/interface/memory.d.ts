import type {
    ColonyStage, CreepAssignment, CreepRole, DefensePlan, ExpansionStage, LogisticsJob, PlannedStructure,
    ProductionGoal, RemoteRecord, SerializedPosition, SourcePlan, SpawnRequest, TerminalGoal, ThreatAssessment, WorkJob
} from "@/domain/types";

declare global {
    interface Memory {
        schemaVersion: number;
        colonies: Record<string, ColonyMemory>;
        intel: Record<string, RoomIntelMemory>;
        empire: EmpireMemory;
    }

    interface CreepMemory {
        role: CreepRole;
        homeRoom: string;
        demandKey: string;
        assignment?: CreepAssignment;
        state?: "pickup" | "deliver" | "working";
        working?: boolean;
    }

    interface EmpireMemory {
        expansion: ExpansionMemory;
        market: MarketMemory;
        production: Record<string, ProductionGoal>;
        createdAt: number;
    }

    interface ColonyMemory {
        stage: ColonyStage;
        stageChangedAt: number;
        established: boolean;
        anchor?: SerializedPosition;
        sourcePlans: Record<string, SourcePlanMemory>;
        spawnQueue: SpawnRequest[];
        quarantine: { key: string; reason: string; tick: number }[];
        logisticsJobs: Record<string, LogisticsJob>;
        workJobs: Record<string, WorkJob>;
        construction: ConstructionMemory;
        defense: DefenseMemory;
        remotes: Record<string, RemoteRecord>;
    }

    interface SourcePlanMemory extends SourcePlan {
    }

    interface ConstructionMemory {
        lastRcl: number;
        revision: number;
        anchorKey: string;
        structureSignature: string;
        plannedSites: PlannedStructure[];
        blocked: Record<string, { reason: string; attempts: number; retryAt: number; permanent: boolean }>;
        lastPlannedAt: number;
    }

    interface DefenseMemory {
        lastThreatTick: number;
        history: { tick: number; strength: number }[];
        lastSafeModeAttempt: number;
        plan?: DefensePlan;
    }

    interface RoomIntelMemory {
        lastSeen: number;
        owner?: string;
        reservation?: { username: string; ticksToEnd: number };
        controller?: { id: Id<StructureController>; position: SerializedPosition; level: number };
        sources: { id: Id<Source>; position: SerializedPosition; capacity: number }[];
        mineral?: { id: Id<Mineral>; type: MineralConstant; position: SerializedPosition };
        threat: ThreatAssessment;
        keeper: boolean;
        highway: boolean;
        routes: Record<string, { distance: number; updatedAt: number }>;
        inaccessibleUntil?: number;
    }

    interface ExpansionMemory {
        stage: ExpansionStage;
        candidates: string[];
        selectedRoom?: string;
        originRoom?: string;
        changedAt: number;
        failureReason?: string;
        anchor?: SerializedPosition;
        retryAt?: number;
    }

    interface MarketMemory {
        lastAnalysis: number;
        terminalGoals: TerminalGoal[];
        orders: Record<string, { id: string; price: number; expiresAt: number }>;
    }
}

export {};
