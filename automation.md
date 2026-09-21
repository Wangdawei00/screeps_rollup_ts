# Autonomous Screeps Architecture

The current codebase automates **execution**, but not **decision-making**. Creeps perform configured jobs, while flags,
manually prepared bodies, `myconsole.ts`, `LinkPairs`, `LabList`, and queue entries decide what the colony should do.
To become fully autonomous, those instructions must be replaced by managers that continuously
**observe, plan, reconcile, and execute**.

## Current Automation Gaps

| Area | Current behavior | Autonomous replacement |
|---|---|---|
| Population | Manual entries in `myconsole.ts`; dead creeps requeue themselves | A population planner calculates required creep slots every tick |
| Bodies | Explicit `body` arrays in memory | Body builders scale against available and capacity energy |
| Sources and destinations | `srcFlagName`, `destFlagName`, `IdleFlagName` | Discover sources, structures, controllers, and work positions by ID |
| Construction | Construction sites must already exist | RCL-aware layout planner creates sites |
| Logistics | Dedicated flag-to-flag roles | A prioritized transport-job system |
| Links and labs | Manual `LinkPairs` and `LabList` | Infer structure purpose and production plans |
| Expansion | Manual reserver and claimer flags | Intel, remote scoring, and expansion state machines |
| Recovery | Assumes queues, rooms, and valid memory exist | Bootstrap mode that can recover from zero creeps |
| Strategy | Distributed through creep configuration | Room and empire policy with measurable objectives |

## Recommended Architecture

Individual creeps should not decide colony strategy. Decisions should live in managers, while roles remain small
executors. Managers decide desired state, planners calculate solutions, and roles and structure runners only execute
assignments:

```text
src/
  main.ts
  kernel/
    kernel.ts
    scheduler.ts
    memory.ts
  config/
    policy.ts
  domain/
    types.ts
  colony/
    colonyManager.ts
    roomModel.ts
    populationPlanner.ts
    spawnManager.ts
    defenseManager.ts
    constructionManager.ts
    logisticsManager.ts
    structureManager.ts
  empire/
    intelManager.ts
    remoteManager.ts
    expansionManager.ts
    marketManager.ts
  planning/
    bodyBuilder.ts
    layoutPlanner.ts
    sourcePlanner.ts
  roles/
    index.ts
    harvester.ts
    miner.ts
    hauler.ts
    worker.ts
    upgrader.ts
    reserver.ts
    defender.ts
  interface/
    memory.d.ts
```

The main loop should become approximately:

```ts
export function runKernel(): void {
    migrateMemory();
    cleanupMemory();
    collectIntel();

    const colonies = getOwnedRooms().map(buildRoomModel);

    for (const colony of colonies) {
        runColonyManager(colony);
    }

    runEmpireStrategy(colonies);

    for (const colony of colonies) {
        runSpawnManager(colony);
    }

    runCreeps();
}
```

Use process-level error boundaries so one malformed creep or stale structure ID does not prevent every other room
from running. Errors should identify the process and the relevant room, creep, or structure.

## File Responsibilities

### Entrypoint and Kernel

#### `main.ts`

This file should only import required global type augmentation, install the error mapper, and export the Screeps loop:

```ts
import {runKernel} from "@/kernel/kernel";
import {errorMapper} from "@/modules/errorMapper";

export const loop = errorMapper(runKernel);
```

It should not clean memory, dispatch roles, inspect rooms, or enqueue creeps directly.

#### `kernel/kernel.ts`

This is the composition root. It owns tick phase ordering, builds each room model once, and passes models to colony
and empire managers. It should not contain the implementation of planning, spawning, or role behavior.

#### `kernel/scheduler.ts`

Provide a lightweight scheduler for named processes with a priority and interval:

```ts
interface Process {
    name: string;
    priority: "critical" | "normal" | "low";
    interval: number;
    run(): void;
}
```

Defense, bootstrap, spawning, and creep execution are critical and run every tick. Construction reconciliation can
run every few ticks, remote scoring every hundred ticks, and market analysis only with a healthy CPU bucket. Do not
turn this into a complicated operating-system abstraction.

#### `kernel/memory.ts`

Own all persistent-memory lifecycle concerns:

- Define `CURRENT_MEMORY_VERSION` and sequential migrations.
- Initialize missing empire and colony records.
- Delete memory for dead creeps without requeueing their old configuration.
- Expire logistics leases and obsolete jobs.
- Validate persisted IDs and spawn requests.
- Quarantine or remove permanently invalid requests.

Never store complete game objects or `RoomPosition` instances. Store IDs and serialized coordinates.

### Shared Configuration and Domain Types

#### `config/policy.ts`

Replace `myconsole.ts` as the normal way to influence behavior. Policy should express strategy and safety limits,
not individual creeps:

```ts
interface EmpirePolicy {
    minimumTowerEnergy: number;
    storageEnergyReserve: number;
    upgradeEnergySurplus: number;
    wallTargetHitsByRcl: Partial<Record<number, number>>;
    maxRemoteDistance: number;
    expansionEnabled: boolean;
    marketEnabled: boolean;
    debug: boolean;
}
```

#### `domain/types.ts`

Define contracts shared by managers, planners, memory, and roles:

```ts
type CreepRole =
    | "harvester"
    | "miner"
    | "hauler"
    | "worker"
    | "upgrader"
    | "reserver"
    | "defender";

interface SerializedPosition {
    x: number;
    y: number;
    roomName: string;
}

interface SpawnRequest extends CreepDemand {
    createdAt: number;
    attempts: number;
}
```

Use a discriminated union instead of an untyped assignment string:

```ts
type CreepAssignment =
    | {
          type: "source";
          sourceId: Id<Source>;
          containerId?: Id<StructureContainer>;
          workPosition: SerializedPosition;
      }
    | {
          type: "logistics";
          jobId?: string;
      }
    | {
          type: "controller";
          controllerId: Id<StructureController>;
          energySourceId?: Id<AnyStoreStructure>;
      }
    | {
          type: "remote";
          targetRoom: string;
      }
    | {
          type: "defense";
          targetRoom: string;
      };
```

### Colony Layer

#### `colony/colonyManager.ts`

Coordinate one owned room. Determine its stage, then run defense, construction, logistics, population reconciliation,
and owned structures. It should not move creeps or call `spawnCreep` directly.

Suggested stage meanings:

- `bootstrap`: there is no reliable source-to-spawn income pipeline.
- `developing`: income works, but storage or important RCL structures are missing.
- `stable`: income is reliable and reserves satisfy policy.
- `recovering`: essential creeps were lost or available energy is critically low.
- `underAttack`: a meaningful hostile threat is present.

#### `colony/roomModel.ts`

Build one immutable, per-tick snapshot of a visible owned room:

```ts
interface RoomModel {
    room: Room;
    name: string;
    stage: ColonyStage;
    controller: StructureController;
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    towers: StructureTower[];
    links: StructureLink[];
    containers: StructureContainer[];
    labs: StructureLab[];
    sources: Source[];
    constructionSites: ConstructionSite[];
    hostiles: Creep[];
    creepsByRole: Map<CreepRole, Creep[]>;
    energyAvailable: number;
    energyCapacity: number;
    storageEnergy: number;
}
```

This centralizes room searches instead of making each manager repeatedly call `room.find`. Stable planned IDs can be
stored in memory, but visible objects should be resolved and stale IDs filtered while building the model.

#### `colony/populationPlanner.ts`

Derive `CreepDemand[]` from the room model, compare each demand key against living, spawning, and queued creeps, then
enqueue only missing slots. Remove obsolete requests that have not started. Never copy a dead creep's entire memory
back into the queue.

Use stable keys such as:

```text
W49N44:bootstrap:harvester:0
W49N44:source:<sourceId>:miner
W49N44:source:<sourceId>:hauler:0
W49N44:worker:0
W49N44:controller:upgrader:0
W49N44:defender:0
```

A creep near death should stop satisfying its slot when its remaining life is less than its spawn time plus estimated
travel time. The planner will then request the replacement without creep-controlled respawn flags.

#### `colony/spawnManager.ts`

Consume typed `SpawnRequest`s and control all spawns in a colony:

- Sort by priority and creation time.
- Let multiple idle spawns consume separate requests in one tick.
- Generate unique names from role, room, and tick.
- Remove successful requests.
- Keep transient failures such as `ERR_BUSY` and `ERR_NOT_ENOUGH_ENERGY`.
- Quarantine permanent failures such as invalid bodies or arguments.
- Allow emergency affordable requests to bypass expensive noncritical requests.

The spawn queue should contain `SpawnRequest`, not `CreepMemory`. Only runtime role and assignment fields should be
placed in new creep memory.

#### `colony/defenseManager.ts`

Calculate hostile strength from active and boosted body parts, update the colony stage, select consistent tower
targets, generate defender demand, and activate safe mode under explicit breach conditions. Towers may heal when
there is no attack target and repair only when there is no threat and their energy exceeds policy reserves.

#### `colony/constructionManager.ts`

Reconcile the persisted layout with structures and construction sites:

- Detect RCL changes.
- Request the allowed layout from `layoutPlanner`.
- Request source containers and roads from `sourcePlanner`.
- Create only missing sites.
- Respect global and per-tick construction-site limits.
- Prioritize spawn recovery, source containers, extensions, towers, storage, and roads.
- Record blocked coordinates rather than retrying invalid sites forever.
- Never destroy conflicting structures automatically.

This manager decides what should be built. Worker creeps only choose among existing build tasks.

#### `colony/logisticsManager.ts`

Generate, merge, prioritize, lease, resize, and expire logistics jobs. It should also calculate hauler demand from
transport throughput and backlog. A hauler claims a job; it does not independently decide colony priorities.

Suggested priorities:

| Priority | Jobs |
|---:|---|
| 100 | Spawn and extension energy during bootstrap |
| 90 | Towers during an attack |
| 80 | Spawn and extension energy normally |
| 70 | Controller link or container |
| 60 | Labs, factory, and power spawn |
| 50 | Dropped resources, tombstones, and ruins |
| 40 | Storage and terminal balancing |
| 20 | Market and nonessential mineral transfers |

#### `colony/structureManager.ts`

Execute structure plans currently spread across `prototype.room.ts`, `prototype.link.ts`, and `prototype.tower.ts`:

- Tower attacks, healing, and repairs selected by `defenseManager`.
- Link transfers based on inferred source, controller, and storage link roles.
- Later, lab reactions, terminal transfers, factory production, and observer actions.

Replace `LinkPairs` with an inferred link plan and replace `LabList` with production goals. Structure execution should
consume those plans rather than decide empire strategy.

### Planning Layer

#### `planning/bodyBuilder.ts`

Contain pure body-generation functions. They must not inspect global memory or enqueue creeps:

```ts
buildBootstrapHarvesterBody(energyAvailable: number): BodyPartConstant[];
buildMinerBody(energyBudget: number, sourceIncome: number): BodyPartConstant[];
buildHaulerBody(energyBudget: number, carryParts: number, roads: boolean): BodyPartConstant[];
buildWorkerBody(energyBudget: number): BodyPartConstant[];
buildUpgraderBody(energyBudget: number, availableEnergy: number): BodyPartConstant[];
buildReserverBody(energyBudget: number, reservationNeed: number): BodyPartConstant[];
buildDefenderBody(energyBudget: number, threat: ThreatAssessment): BodyPartConstant[];
```

Every result must cost no more than its budget, contain no more than 50 parts, have an appropriate movement ratio,
and contain at least one useful role-specific part. Five `WORK` parts consume the full regeneration of an ordinary
source, so larger local energy-miner bodies normally waste energy.

#### `planning/sourcePlanner.ts`

Discover and persist accessible source tiles, preferred miner positions, container positions, paths to the colony,
path lengths, expected income, and required hauling capacity. A useful approximation is:

```ts
const requiredCarryParts = Math.ceil(
    sourceEnergyPerTick * roundTripTicks / CARRY_CAPACITY
);
```

Recalculate only when the colony anchor changes, a planned tile becomes blocked, or relevant structures change.

#### `planning/layoutPlanner.ts`

Choose or validate a deterministic anchor and return planned coordinates:

```ts
interface PlannedStructure {
    x: number;
    y: number;
    structureType: BuildableStructureConstant;
    minimumRcl: number;
    priority: number;
}
```

It should reject terrain walls and invalid coordinates, account for existing structures, reserve source and
controller paths, and persist a compact plan. It returns intent and never calls `createConstructionSite` itself.

### Empire Layer

These managers should be added when their feature is implemented rather than existing as empty abstractions.

#### `empire/intelManager.ts`

Store last-seen tick, ownership, reservation, source and mineral count, controller position, hostile strength, route
distance, and Keeper/highway status for visible rooms. Old observations must be explicitly treated as stale.

#### `empire/remoteManager.ts`

Score remote profitability using path distance, reservation cost, hauling demand, and danger. Advance remote rooms
through their state machine, generate reserver/miner/hauler/defender demand, and suspend rooms after repeated losses
or occupation.

#### `empire/expansionManager.ts`

Own persistent expansion campaigns:

```text
idle -> scouting -> selected -> claiming -> spawnSite -> bootstrapping -> complete
```

Check free GCL, existing-colony health, stored energy, target source count, layout viability, route safety, and
whether another campaign is already active. Hand the room to the normal colony manager after its spawn and basic
income are established.

#### `empire/marketManager.ts`

Implement this last. Maintain terminal energy reserves, evaluate transaction energy cost, select resources to retain
or trade, and create logistics jobs to prepare terminals. Disable market activity during bootstrap and recovery.

### Role Executors

#### `roles/index.ts`

Provide the typed role registry and `runCreeps` dispatch. Validate persisted role and assignment data at runtime.
Unknown roles should produce a contextual error without aborting the rest of the tick. This file does not manage
respawning.

#### `roles/harvester.ts`

Emergency bootstrap executor. Harvest an assigned or discoverable source and deliver directly to spawns, extensions,
and towers. It should exist only while the normal miner-container-hauler pipeline is unavailable. This replaces
`role.p_harverster.ts`.

#### `roles/miner.ts`

Move to an assigned work position, harvest the assigned source, and transfer into its container or link when possible.
Fall back to dropping energy if planned infrastructure is incomplete. Mineral extraction should eventually use a
separate assignment because its lifecycle differs from energy mining.

#### `roles/hauler.ts`

Replace `truck`, `train`, `transferer`, `garbageCollector`, `interRoomGarbageCollector`, and `s2sTrain`. Validate or
claim one job, execute its pickup and delivery, handle partial loads and deliveries, then complete or release it.

#### `roles/worker.ts`

Replace primitive/advanced builders, ordinary repairers, and wall repairers. Obtain energy and execute an assigned
build or repair task. Repair critical roads and containers before cosmetic damage, and repair walls or ramparts only
to policy targets. Population planning determines whether workers should exist.

#### `roles/upgrader.ts`

Move to the controller work area, withdraw from the assigned controller container or link, and upgrade. It should
recover from missing infrastructure but never decide how many upgraders the colony needs.

#### `roles/reserver.ts`

Travel to `targetRoom` and reserve its controller. It should report inaccessible or hostile rooms through intel and
must not mutate its own future body or respawn count.

#### `roles/defender.ts`

Travel to the assigned room, prioritize dangerous combat creeps, protect critical structures, and heal when its body
allows it. Specialized offensive dismantlers, controller attackers, and coordinated squads should remain separate
campaign executors rather than part of the autonomous economic core.

### Memory Interface

#### `interface/memory.d.ts`

Replace the flag-oriented memory definitions with typed persistent state:

```ts
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
    jobId?: string;
}

interface ColonyMemory {
    stage: ColonyStage;
    anchor?: SerializedPosition;
    lastRcl?: number;
    sourcePlans: Record<string, SourcePlanMemory>;
    spawnQueue: SpawnRequest[];
    logisticsJobs: Record<string, LogisticsJob>;
    construction: ConstructionMemory;
    defense: DefenseMemory;
}
```

In the final schema, do not retain `body` in living creep memory, `respawnInformed`, flag names, generic per-creep
cache timers, `LinkPairs`, or `LabList`. These fields can remain optional only during a staged migration.

## Desired-State Population

Replace the current "creep dies, copy its memory back into the queue" mechanism in `main.ts` and
`prototype.creep.ts`. It preserves configuration forever and cannot adjust to changing conditions.

Instead, calculate desired creep **slots**:

```ts
interface CreepDemand {
    key: string;              // For example, "W49N44:source:<sourceId>:miner"
    role: CreepRole;
    homeRoom: string;
    priority: number;
    body: BodyPartConstant[];
    assignment?: CreepAssignment;
}
```

For each owned room, derive demand from game state:

- One miner per accessible source.
- Enough hauling capacity for source income and path distance.
- Emergency harvesters if no functioning income chain exists.
- Builders only when construction work exists.
- Repairers based on the repair backlog, not a permanent count.
- Upgraders based on available energy surplus and controller downgrade risk.
- Defenders based on observed hostile strength.
- Reservers based on reservation ticks and remote profitability.

Compare demand with living creeps and queued requests, then enqueue only missing slots. This eliminates duplicate
respawns and lets the colony change composition automatically.

Bodies should be generated by functions such as:

```ts
buildMinerBody(energyCapacity, sourceCapacity);
buildHaulerBody(energyAvailable, requiredCarryParts);
buildWorkerBody(energyAvailable);
buildDefenderBody(energyCapacity, hostileThreat);
```

Use `room.energyAvailable` during bootstrap and emergencies, and `room.energyCapacityAvailable` during stable
operation.

## Remove Flags from the Economic Core

Flags are currently fundamental to nearly every role. Replace them gradually with IDs and assignments:

- Miner memory: `sourceId`, `containerId`, and `workPosition`.
- Hauler memory: no fixed source flag; claim a logistics job.
- Upgrader memory: `controllerId` and an inferred controller container or link.
- Builder memory: dynamically selected construction-site ID.
- Reserver memory: `targetRoom`, not a flag.
- Idle positions: calculated around the spawn or storage rather than flagged.

Flags can remain as optional manual overrides, such as `disableRemote`, `rally`, or `forceAttack`. The economy must
continue functioning if every flag is removed.

## Introduce a Logistics Job Board

The `truck`, `train`, `transferer`, `garbageCollector`, and `s2sTrain` roles overlap significantly. Replace most of
them with a generic hauler that consumes jobs:

```ts
interface LogisticsJob {
    id: string;
    roomName: string;
    resourceType: ResourceConstant;
    amount: number;
    pickup:
        | { type: "store"; id: Id<AnyStoreStructure | Tombstone | Ruin> }
        | { type: "dropped"; id: Id<Resource> };
    deliveryId: Id<AnyStoreStructure>;
    priority: number;
    assignedCreep?: string;
    leaseUntil?: number;
    expiresAt: number;
}
```

The pickup is a discriminated union because dropped resources, tombstones, and ruins are not all
`AnyStoreStructure`s.

The room manager should generate jobs in this order:

1. Spawn and extensions.
2. Towers during threats.
3. Controller containers and links.
4. Labs and power structures.
5. Storage balancing.
6. Dropped resources, tombstones, and ruins.
7. Terminal and market transfers.

This system adapts automatically as structures fill, disappear, or are constructed.

## Add Construction and Room Planning

There is currently no `createConstructionSite` logic. Autonomous growth requires:

- Detecting controller-level changes.
- Choosing and persisting an anchor.
- Planning spawns, extensions, roads, towers, storage, terminals, and labs.
- Computing miner positions and source containers.
- Building roads from actual traffic or planned paths.
- Respecting the five-site-per-tick and global construction-site limits.
- Replanning safely when terrain or existing structures conflict.

Start with a simple deterministic bunker or stamp layout rather than an optimization-heavy planner. Store planned
coordinates in room memory so CPU is not spent recomputing them every tick.

## Add Room and Empire State Machines

Each colony should have a state such as:

```ts
type ColonyStage =
    | "bootstrap"
    | "developing"
    | "stable"
    | "recovering"
    | "underAttack";
```

Remote rooms should separately progress through:

```text
unknown -> scouting -> candidate -> reserving -> mining -> suspended
```

Expansion should only occur when policy thresholds are met: available GCL, sufficient stored energy, healthy
existing rooms, route safety, source count, and distance. Expansion itself should be a persistent state machine:
scout, choose room, claim, bootstrap a spawn, establish the economy, and then hand the room over to the normal colony
manager.

## Preserve Configuration as Policy

Fully autonomous should not mean no configuration. Replace per-creep configuration with strategic policy:

```ts
const policy = {
    minimumTowerEnergy: 500,
    storageEnergyReserve: 100_000,
    maxRemoteDistance: 2,
    upgradeEnergySurplus: 50_000,
    expansionEnabled: true,
    marketEnabled: true,
};
```

The code decides **how** to satisfy these goals. Configuration only expresses preferences and safety limits.

## Migration from the Current Code

| Current code | New owner |
|---|---|
| `main.ts` dead-creep requeue | Removed; `populationPlanner.ts` detects missing slots |
| `prototype.creep.ts` role registry | `roles/index.ts` |
| `prototype.creep.ts` flag/container helpers | Typed assignments and logistics jobs |
| `prototype.spawn.ts` | `colony/spawnManager.ts` |
| `prototype.room.ts` orchestration | `kernel.ts`, `colonyManager.ts`, and `structureManager.ts` |
| `prototype.tower.ts` | `defenseManager.ts` and `structureManager.ts` |
| `prototype.link.ts` and `LinkPairs` | Inferred link plans in `structureManager.ts` |
| `myconsole.ts` queue entries | `policy.ts` plus optional manual override commands |
| Primitive harvester/builder/upgrader | Bootstrap behavior in the consolidated roles |
| Builder/repairer/wall-repairer roles | `worker.ts` |
| Truck/train/transfer roles | `hauler.ts` |
| Reserver destination flag | A `targetRoom` assignment |
| Combat destination flags | Defense assignments or optional campaign overrides |

## Implementation Order

1. **Harden the existing runtime.** Validate role dispatch, missing home rooms, stale cached IDs, and queue entries.
   Permanent spawn errors currently block the queue indefinitely. Add memory schema versions and migrations.
2. **Build autonomous bootstrap and population planning.** Support RCL 1-3 from zero creeps without flags. This is
   the foundational milestone.
3. **Replace source flags with source assignments.** Add miner-position discovery, dynamic bodies,
   hauling-capacity calculation, and slot-based spawning.
4. **Implement the logistics board.** Consolidate fixed transport roles into generic hauling.
5. **Add construction planning.** Automate containers, extensions, roads, towers, storage, and later structures.
6. **Add defense and recovery states.** Add threat assessment, tower priorities, defender demand, safe-mode
   activation, and economy recovery.
7. **Add remotes and expansion.** Add persistent intel, route scoring, reservation, remote profitability, and
   claiming.
8. **Automate links, labs, terminals, and the market last.** These systems should consume colony goals rather than
   hard-coded pairs.

## First Autonomous Milestone

The first deliverable should have a strict success condition:

> Place the code in a fresh owned room with no flags and no creep configuration, and have it bootstrap, maintain
> source income, spawn replacements, construct through early RCLs, upgrade, and recover from losing every creep.

The milestone should implement only the kernel, memory migration, domain types, policy, room model, colony stages,
source planning, body building, population planning, spawning, bootstrap harvester, miner, hauler, worker, upgrader,
local energy logistics, early-RCL construction, tower defense, and zero-creep recovery.

Leave remotes, expansion, labs, market automation, minerals, and offensive combat on the existing system until the
local-room pipeline works without flags. This provides a staged migration instead of requiring every current role to
be rewritten at once.

Once that works, remote mining and empire strategy can be added without preserving the current manual architecture.
