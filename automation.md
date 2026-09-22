# Autonomous Screeps Implementation Guide

This document describes only the new autonomous architecture under `src/kernel`, `src/config`, `src/domain`,
`src/colony`, `src/planning`, `src/roles`, `src/empire`, and `src/interface`. The code under `src/modules` is outside
the scope of this plan and should not influence new interfaces or manager behavior.

The target design separates decisions from execution:

- The kernel controls tick phases and failure isolation.
- Colony and empire managers decide desired state.
- Planners calculate reusable solutions.
- Spawn and structure managers reconcile desired state with the game.
- Roles execute typed assignments without deciding population or strategy.

## Current New-Code Status

The following new-architecture pieces are already represented in code and do not need their existing declarations
copied again:

| File | Already present | Still required |
|---|---|---|
| `main.ts` | Thin error-mapped `runKernel` entrypoint | Nothing unless import paths change |
| `config/policy.ts` | Base policy interface and values | Export the interface; restore wall targets; validate values |
| `domain/types.ts` | `CreepRole`, `SpawnRequest` shell, assignment union | Export types and add all missing domain contracts |
| `interface/memory.d.ts` | Draft global, creep, and colony memory shapes | Define referenced memory records and use serialized positions |
| `colony/roomModel.ts` | Draft `RoomModel` fields | Export it and implement the model builder |
| `planning/layoutPlanner.ts` | Draft `PlannedStructure` | Export it and implement deterministic planning |
| `kernel/kernel.ts` | Empty `runKernel` function | Implement all tick phases |
| `kernel/memory.ts` | Dependency import only | Implement the complete memory lifecycle |

All other new-architecture manager, planner, role, and empire files are empty. File existence is not considered
implementation.

There is currently no `kernel/scheduler.ts`. Add it when implementing scheduled processes.

## Canonical Type Placement

Do not declare shared interfaces inside manager files or rely on ambient globals for domain contracts. Use the
following ownership rules.

### `src/domain/types.ts`

Put runtime-independent contracts shared by managers, planners, and roles here. Export every declaration.

| Type | Required fields or variants |
|---|---|
| `CreepRole` | Existing autonomous role names |
| `ColonyStage` | `bootstrap`, `developing`, `stable`, `recovering`, `underAttack` |
| `RemoteStage` | `unknown`, `scouting`, `candidate`, `reserving`, `mining`, `suspended` |
| `ExpansionStage` | `idle`, `scouting`, `selected`, `claiming`, `spawnSite`, `bootstrapping`, `complete` |
| `SerializedPosition` | `x`, `y`, `roomName`; never persist `RoomPosition` |
| `CreepAssignment` | Existing union, changing `workPosition` to `SerializedPosition` |
| `CreepDemand` | `key`, `role`, `homeRoom`, `priority`, `body`, optional assignment and travel estimate |
| `SpawnRequest` | Existing demand plus `createdAt` and `attempts` |
| `LogisticsEndpoint` | Discriminated union for stores and dropped resources |
| `LogisticsJob` | ID, room, resource, amount, pickup, delivery, priority, lease, expiration |
| `SourcePlan` | Source ID, work/container positions, path, path length, expected income, carry requirement |
| `PlannedStructure` | Serialized position, type, minimum RCL, priority |
| `ThreatAssessment` | hostile heal, attack, ranged, dismantle strength; boosted values; target priority |
| `DefensePlan` | attack target, heal target, repair target, safe-mode decision, defender demands |
| `StructurePlan` | link transfers and tower actions; later lab, terminal, and factory actions |
| `ProcessPriority` | `critical`, `normal`, `low` |
| `ScheduledProcess` | name, priority, interval, optional CPU condition, `run` callback |

Use `import type` where a file only consumes these contracts. Keep interfaces based on live game objects, such as
`RoomModel`, beside their per-tick builders rather than in this file.

### `src/interface/memory.d.ts`

Put only Screeps global memory augmentation here. This file may import domain types with type-only imports and must
end with `export {}` so declarations are module-scoped augmentations.

Define these records here:

| Memory type | Purpose |
|---|---|
| `EmpireMemory` | Expansion campaign, global settings/version metadata, and optional market state |
| `ColonyMemory` | Stage, serialized anchor, source plans, spawn queue, logistics jobs, construction, defense |
| `SourcePlanMemory` | Persisted form of a source plan using IDs and serialized coordinates |
| `ConstructionMemory` | Last RCL, layout revision, planned sites, blocked coordinates with retry metadata |
| `DefenseMemory` | Last threat tick, hostile history, safe-mode cooldown metadata |
| `RoomIntelMemory` | Last seen, ownership/reservation, sources, mineral, controller, threat, route data |
| `ExpansionMemory` | Stage, candidates, selected room, origin room, state-change tick, failure reason |
| `MarketMemory` | Last analysis tick and pending terminal preparation goals |

Extend `CreepMemory` with runtime state only: role, home room, demand key, assignment, working state, and optional job
ID. Do not add bodies, planning policy, complete jobs, or live game objects.

Use optional fields only where migration or normal absence requires them. Managers should initialize records before
use rather than spreading undefined checks throughout the code.

### File-local types

Keep these close to their implementation because they contain live objects or implementation details:

- `RoomModel` and `buildRoomModel` in `colony/roomModel.ts`.
- Body-builder option types in `planning/bodyBuilder.ts`.
- Layout stamps and coordinate transforms in `planning/layoutPlanner.ts`.
- Spawn result classification in `colony/spawnManager.ts`.
- Runtime validators and role runner signatures in `roles/index.ts`.

## Runtime Invariants

Every implementation below should preserve these rules:

1. Persistent memory stores IDs, primitives, arrays, and serialized coordinates, never game objects.
2. Every demand has a stable key. Living, spawning, and queued creeps with that key satisfy the same slot.
3. Only `spawnManager` calls `spawnCreep`.
4. Only `constructionManager` calls `createConstructionSite`.
5. Role files do not enqueue replacements or choose population counts.
6. A missing object or invalid assignment affects one process or creep, not the whole tick.
7. Permanent spawn errors are removed or quarantined; transient errors remain retryable.
8. Emergency income and defense can bypass noncritical work.
9. Managers produce plans; executors perform plans.
10. Work must continue in a room with no flags and recover after losing all creeps.

## File-by-File Implementation

### `src/main.ts`

Keep the existing file minimal. It should import global declarations indirectly through the TypeScript build,
import `runKernel`, install the error mapper, and export the Screeps loop. Do not add cleanup, room scans, role
dispatch, console commands, or prototype installation.

**Complete when:** the file remains a composition entrypoint and all behavior starts in `runKernel`.

### `src/kernel/kernel.ts`

Implement the tick composition root.

1. Run memory migration and initialization before reading colony records.
2. Remove dead creep memory, expire leases/jobs, and validate queued requests.
3. Collect intel for visible rooms on its configured schedule.
4. Find visible rooms with an owned controller and build exactly one `RoomModel` per room.
5. Run each colony manager with its model.
6. Run empire-level remote, expansion, and market processes after local colony planning.
7. Run spawn managers after population and empire demand has been reconciled.
8. Run role executors last so assignments and logistics jobs are current.

Wrap each named process with a contextual error boundary. Include process name and room/creep identifier in errors.
Do not catch the entire tick with one local catch; the outer error mapper already covers catastrophic failures.

Avoid repeated room scans in this file. Managers receive models and return or persist plans.

**Complete when:** one broken colony or creep does not prevent other colonies and creeps from running, and phase order
is deterministic.

### `src/kernel/scheduler.ts`

Create a small scheduler, not a process operating system.

- Accept named processes with priority, interval, and a callback.
- A process is due when `Game.time % interval === 0`; interval must be at least one.
- Run `critical` before `normal`, and `normal` before `low`.
- Permit an optional predicate for CPU-sensitive work such as market analysis.
- Catch and report errors per process while allowing later processes to run.
- Detect duplicate process names during registration.

Suggested schedules:

| Process | Priority | Interval/condition |
|---|---|---|
| Memory cleanup, bootstrap, defense, spawning, creeps | Critical | Every tick |
| Construction reconciliation | Normal | Every 5 ticks or after RCL change |
| Intel for visible rooms | Normal | Every tick, cheap incremental update |
| Remote scoring | Low | Every 100 ticks |
| Expansion evaluation | Low | Every 250 ticks |
| Market analysis | Low | Every 100 ticks and only with a healthy CPU bucket |

**Complete when:** scheduling is deterministic, testable, and no skipped low-priority process can block critical work.

### `src/kernel/memory.ts`

Own the complete persistent-memory lifecycle.

- Define and export `CURRENT_MEMORY_VERSION`.
- Implement sequential migrations keyed by the previous version; never jump directly from an arbitrary old version.
- Initialize `Memory.colonies`, `Memory.intel`, and `Memory.empire`.
- Create a complete `ColonyMemory` record for every visible owned room.
- Remove `Memory.creeps[name]` when no matching `Game.creeps[name]` exists.
- Expire logistics jobs by `expiresAt` and release leases whose creep is dead or `leaseUntil` passed.
- Validate spawn requests: role, nonempty valid body, body length at most 50, affordable theoretical cost, home room,
  stable key, and assignment shape.
- Move permanently invalid requests into a bounded quarantine record with reason and tick, or log and remove them.
- Remove duplicate queued requests with the same demand key.
- Serialize/deserialize position helpers should live here only if they are memory-specific; otherwise put pure helpers
  in `domain/types.ts`.

Migrations must be idempotent at the version boundary: update the schema version only after a migration succeeds.
Do not silently replace malformed colony data with an empty success-shaped record; log the room and invalid field.

**Complete when:** an empty `Memory` object becomes valid in one tick and stale jobs/requests cannot permanently block
the colony.

### `src/config/policy.ts`

Retain the existing strategic values and make `EmpirePolicy` a named export.

Add:

- `wallTargetHitsByRcl`
- per-tick construction site limit
- global construction site safety margin
- logistics lease duration
- replacement travel buffer
- minimum CPU bucket for low-priority work
- expansion energy threshold
- remote suspension duration

Keep this file declarative. It must not inspect `Game`, mutate memory, or encode individual room names, creep bodies,
source IDs, or jobs. Add a startup validator for impossible values such as negative reserves or invalid RCL keys.

**Complete when:** operators can adjust goals and safety limits without configuring an individual creep.

### `src/domain/types.ts`

Finish and export the types listed in **Canonical Type Placement**.

Use discriminated unions wherever execution differs by target kind. In particular:

- A source assignment contains a source ID and serialized work position.
- A logistics assignment refers to a job rather than copying endpoints.
- A controller assignment contains the controller and optional energy structure ID.
- Remote and defense assignments carry room names.
- Logistics pickup distinguishes store-like objects from dropped resources.

Add runtime role constants, such as a readonly role array, so validators do not duplicate string lists. Avoid
declaring global interfaces in this file.

**Complete when:** new managers can compile without undeclared ambient types and invalid assignment combinations are
rejected by TypeScript.

### `src/colony/roomModel.ts`

Export `RoomModel` and implement `buildRoomModel(room)`.

- Require an owned controller; reject or return no model for other rooms.
- Perform one structure scan and partition results into spawns, extensions, towers, links, containers, labs, and
  relevant later-game structures.
- Scan sources, owned construction sites, hostile creeps, dropped resources, tombstones, and ruins once.
- Group owned creeps by validated autonomous role and home room.
- Resolve storage energy and room energy values.
- Resolve persisted source/container IDs and filter stale IDs without mutating planning state during model creation.
- Calculate the initial colony stage from income readiness, critical creep coverage, reserves, and threat.

Treat the model as immutable by convention. Include derived indexes needed by multiple managers to prevent repeated
`room.find` calls.

**Complete when:** all local managers can operate from the model without repeating broad room searches.

### `src/colony/colonyManager.ts`

Coordinate one owned room without moving creeps or spawning directly.

Run local phases in this order:

1. Determine and persist the colony stage.
2. Assess defense and persist a defense plan.
3. Reconcile source and layout plans when invalidated.
4. Generate construction intentions.
5. Generate and reconcile logistics jobs.
6. Calculate desired population and reconcile spawn requests.
7. Execute owned structure plans.

Stage rules should be explicit:

- `underAttack`: meaningful hostile combat strength is present.
- `recovering`: essential income roles are missing after having an established pipeline, or available energy is
  critically low.
- `bootstrap`: no reliable source-to-spawn pipeline exists.
- `developing`: income works but required RCL structures or reserves are incomplete.
- `stable`: source income is reliable and policy reserves are met.

Threat and recovery override normal development. Persist stage changes with a tick for diagnostics.

**Complete when:** this is the only local orchestration layer and its output is desired state, not direct creep
behavior.

### `src/colony/populationPlanner.ts`

Implement desired-state population reconciliation.

Generate stable `CreepDemand` keys for:

- emergency harvesters
- one miner per planned accessible source
- transporter slots based on required carry parts
- workers when build or repair backlog exists
- controller upgraders based on downgrade risk and energy surplus
- defenders from the defense plan
- later, reservers and remote workers supplied by the remote manager

For every demand, count:

1. Living creeps whose `demandKey` matches and whose remaining lifetime exceeds spawn time plus travel estimate.
2. Creeps currently spawning with that key.
3. Valid queued requests with that key.

Enqueue only the deficit. Remove requests for demand keys that are no longer desired unless already spawning.
Emergency harvesters must use currently available room energy and be requested when no creep can restore spawn
energy. Stable roles may use capacity-based bodies.

Transport demand should convert total required carry parts into a bounded number of practical transporter bodies,
not blindly create one creep per source.

**Complete when:** population converges after deaths and changing room conditions without any creep requeueing itself.

### `src/colony/spawnManager.ts`

Implement the only `spawnCreep` caller.

- Sort requests by descending priority, then ascending creation tick.
- Iterate all idle spawns and allow each to consume a different request in the same tick.
- Revalidate requests immediately before spawning.
- Generate collision-resistant names from role, home room, game tick, and a short sequence.
- Put only role, home room, demand key, assignment, and initial state in creep memory.
- Remove successful requests.
- Retain transient failures: `ERR_BUSY`, `ERR_NOT_ENOUGH_ENERGY`, and temporary RCL/capacity conditions.
- Quarantine permanent failures: invalid body, invalid arguments, impossible name/assignment, or body over 50 parts.
- Increment attempts and record last error for diagnostics.
- Let affordable critical bootstrap or defender requests bypass an unaffordable noncritical request.

Do not let one spawn mutate a queue while another iterates stale indexes. Select a request, remove it atomically on
success, then continue.

**Complete when:** multiple spawns work concurrently and no malformed front request can deadlock the queue.

### `src/colony/defenseManager.ts`

Produce a `ThreatAssessment` and `DefensePlan`.

- Calculate effective hostile attack, ranged attack, healing, dismantle, and toughness from active body parts.
- Account for boosts using Screeps boost multipliers.
- Prioritize hostiles by danger to critical structures and ability to heal.
- Select one consistent tower attack target so tower damage is concentrated.
- Select injured friendly creeps for healing only when no attack target has priority.
- Permit repairs only with no active threat and tower energy above policy reserve.
- Generate defender demands sized to observed threat rather than a permanent defender count.
- Activate safe mode only under explicit conditions: critical spawn/storage breach risk, available safe mode, no active
  safe mode, and insufficient immediate defense.

Persist compact threat history for recovery/suspension decisions, not live creep objects.

**Complete when:** towers and defenders respond to measured danger and peaceful repair cannot consume defensive
reserves.

### `src/colony/constructionManager.ts`

Reconcile layout intent against the visible room.

- Trigger planning on first initialization, RCL change, anchor change, layout revision change, or invalidated source
  plan.
- Combine allowed layout structures with source containers and essential roads.
- Compare each planned coordinate with existing structures and construction sites.
- Create only missing sites whose minimum RCL is met.
- Sort by recovery spawn, source containers, extensions, towers, storage, roads, then later structures.
- Enforce the configured room-per-tick limit and preserve space under the global 100-site limit.
- Record invalid coordinates with reason, attempt count, and retry tick.
- Retry transient failures; stop retrying permanent terrain or conflict failures until the plan changes.
- Never destroy a conflicting structure automatically.

Return diagnostics such as created, already satisfied, blocked, and deferred counts.

**Complete when:** a new room advances through early RCL construction without manually placed sites.

### `src/colony/logisticsManager.ts`

Implement a persistent, reconciled job board.

Generate desired jobs from the current model:

| Priority | Job |
|---:|---|
| 100 | Spawn and extension energy during bootstrap/recovery |
| 90 | Towers during an attack |
| 80 | Spawn and extension energy normally |
| 70 | Controller container or link |
| 60 | Labs, factory, and power spawn |
| 50 | Dropped resources, tombstones, and ruins |
| 40 | Storage and terminal balancing |
| 20 | Market and other nonessential transfers |

Use deterministic job IDs derived from resource, pickup, and delivery so reconciliation updates an existing job
instead of duplicating it. Clamp amounts to source availability and destination capacity. Merge compatible jobs when
doing so does not obscure priority.

Implement:

- claim with a lease
- lease renewal while making progress
- release on invalid target, death, or timeout
- resize as stores change
- completion when the desired deficit is satisfied
- expiration for opportunistic pickup jobs

Calculate hauling demand from unresolved throughput, source path round trips, existing carry capacity, and backlog
age.

**Complete when:** transporters can keep local energy targets supplied without fixed source/destination configuration.

### `src/colony/structureManager.ts`

Execute plans already selected by defense and colony logic.

- Run tower attack/heal/repair actions from `DefensePlan`.
- Infer source links from proximity to source plans, controller links from controller proximity, and storage links
  from storage proximity.
- Transfer source-link energy toward controller/storage demand while respecting cooldown and target capacity.
- Avoid link loops by assigning one role per link and producing directed actions.
- Validate every persisted ID before use and report stale plan entries.

Later additions should follow the same pattern:

- labs execute a reaction goal selected by an empire production planner
- terminals execute balancing/market preparation goals
- factories execute selected recipes
- observers execute an intel scan schedule

Do not choose market strategy or lab compounds here.

**Complete when:** structures execute explicit plans and link behavior requires no manually paired IDs.

### `src/planning/bodyBuilder.ts`

Implement pure body-generation functions for bootstrap harvesters, miners, transporters, workers, upgraders,
reservers, and defenders.

Every builder must:

- accept all inputs as arguments
- never read `Game` or `Memory`
- return a body costing no more than the budget
- return no more than 50 parts
- contain at least one useful role part
- provide enough movement for its expected terrain/load
- return body parts in a deliberate damage order

Specific rules:

- Bootstrap harvester: repeat balanced `WORK`, `CARRY`, `MOVE` units using available energy.
- Miner: cap normal source harvesting at five unboosted `WORK` parts and add movement for the path.
- Transporter: size to requested carry parts; use road and off-road movement ratios.
- Worker: balanced work/carry/move with a useful 300-energy minimum.
- Upgrader: scale work only when energy supply supports it and preserve carry/movement.
- Reserver: scale `CLAIM`/`MOVE` pairs to reservation need and controller limits.
- Defender: derive attack/heal/tough/move composition from `ThreatAssessment` and available boosts.

Add a shared body-cost helper and invariant checks. Unit-test boundary budgets, especially 200/300 energy, capacity
ceilings, and 50-part truncation.

**Complete when:** every generated body satisfies cost and size invariants across a broad budget range.

### `src/planning/sourcePlanner.ts`

Discover and persist the local source economy.

For each source:

- enumerate adjacent walkable tiles
- score miner positions by path access, construction conflicts, and adjacency
- choose a container coordinate
- path from the container to the colony anchor or primary delivery point
- persist the serialized path and length
- calculate expected income, accounting for source capacity and reservation where relevant
- calculate required carry parts from income per tick and round-trip duration
- resolve any existing container or source link by ID

Recalculate only when the anchor/layout revision changes, the source tile becomes blocked, the path is invalid, or
relevant structures change. Keep planning deterministic so unchanged rooms do not churn memory.

Handle inaccessible sources explicitly and exclude them from miner demand while recording the reason.

**Complete when:** population and construction managers can consume source plans without flags or repeated pathfinding.

### `src/planning/layoutPlanner.ts`

Keep the existing `PlannedStructure` concept but persist serialized coordinates rather than `RoomPosition`.

Implement a deterministic early-RCL stamp:

- choose an anchor near the controller and sources while leaving upgrade and source paths open
- transform relative stamp coordinates into room coordinates
- reject borders, terrain walls, source/controller exclusion zones, and occupied incompatible tiles
- include spawns, extensions, towers, storage, roads, and later terminal/lab positions by minimum RCL
- reserve road corridors to sources and the controller
- produce stable priorities consumed by the construction manager
- assign a layout revision so future changes can trigger safe replanning

Prefer validating several candidate anchors over building an optimization-heavy solver. Existing compatible
structures should score positively; conflicts should disqualify or penalize candidates. Never destroy structures.

**Complete when:** the same room and revision always produce the same valid plan and planning does not run every tick.

### `src/roles/index.ts`

Create the typed role registry and `runCreeps`.

- Export runtime validators for roles and assignment discriminants.
- Map every `CreepRole` to exactly one executor.
- Validate role, home room, demand key, and required assignment fields before dispatch.
- Run each creep inside its own contextual error boundary.
- Report unknown roles and invalid memory once at a controlled cadence.
- Do not enqueue replacements or alter bodies.

If a job or object becomes invalid, the executor should release its job/assignment where appropriate and allow its
manager to reconcile on the next tick.

**Complete when:** one malformed creep cannot abort other creep execution.

### `src/roles/harvester.ts`

Implement the emergency income executor.

- Use the assigned source when valid; otherwise choose a reachable local source as a bootstrap fallback.
- Harvest until carrying energy, then fill spawns and extensions, followed by towers below reserve.
- If all immediate consumers are full, deliver to a container/storage or upgrade the controller as a last-resort
  anti-idle action.
- Re-evaluate invalid targets rather than caching stale IDs indefinitely.

Do not create logistics jobs or decide whether another harvester is needed.

**Complete when:** one affordable harvester can restart a room from zero creeps and empty spawn energy.

### `src/roles/miner.ts`

Implement fixed-source harvesting.

- Require a source assignment and deserialize the work position.
- Move to the work tile without standing on the source/container conflict tile incorrectly.
- Harvest the assigned source.
- Transfer to an adjacent container/link when possible.
- If infrastructure is incomplete, drop energy on the planned container tile so transporters can collect it.
- Report missing/inaccessible sources through controlled diagnostics.

Do not select another colony's source, mutate its future body, or enqueue a replacement.

**Complete when:** a miner maintains continuous local source extraction before and after its container is built.

### `src/roles/transporter.ts`

Execute logistics jobs as a state machine.

1. Validate the current leased job or claim the highest-priority compatible unleased job.
2. In pickup state, move to the endpoint and withdraw/pick up the requested resource.
3. In delivery state, move to the destination and transfer what it carries.
4. Update remaining amount, renew the lease after progress, and complete/release the job.

Handle partial source availability, destination capacity changes, mixed cargo, dropped resource disappearance, and
creep death through lease expiration. A transporter should unload incompatible cargo through a generated balancing
job or a safe storage fallback, not silently discard it.

Do not independently rank colony destinations; job priority belongs to the logistics manager.

**Complete when:** multiple transporters cannot claim the same exclusive amount and stale leases recover automatically.

### `src/roles/worker.ts`

Implement build and repair execution.

- Acquire energy through a suitable local logistics source or an assigned energy structure.
- Prefer critical construction selected by construction priority.
- Repair containers and roads that threaten income flow before ordinary damage.
- Repair ramparts/walls only up to the policy target for the current RCL.
- Fall back to controller upgrading when no build/repair task remains, without changing population demand.
- Revalidate target IDs as sites finish or structures disappear.

Keep target selection deterministic enough to reduce creep contention. Population planning decides whether workers
exist.

**Complete when:** workers build planned sites and maintain critical infrastructure without permanent dedicated
builder/repairer counts.

### `src/roles/upgrader.ts`

Implement controller upgrading.

- Require a controller assignment.
- Prefer the assigned controller link/container as an energy source.
- Fall back to nearby storage or room energy sources when planned infrastructure is missing.
- Maintain an efficient controller working range and upgrade while energy is available.
- Surface invalid ownership or inaccessible-controller conditions.

Do not decide upgrader quantity or upgrade budget.

**Complete when:** upgrading survives controller-container/link construction changes without flag-based positioning.

### `src/roles/reserver.ts`

Implement remote controller reservation.

- Require a remote assignment containing `targetRoom`.
- Travel by room route and move to the target controller.
- Reserve when neutral or already reserved by the player.
- Attack hostile reservations only if remote policy explicitly permits it.
- Record inaccessible, owned, or dangerous target observations through the intel manager's update API.

Do not change its body, count reservation attempts in creep memory, or request its own replacement.

**Complete when:** reservation behavior is driven entirely by remote demand and target-room assignment.

### `src/roles/defender.ts`

Implement local/remote defensive execution.

- Travel to the assigned defense room.
- Prioritize hostile healers, high-damage attackers, and threats near critical structures using the defense plan.
- Use ranged mass attack only when its calculated value exceeds focused attack and friendly constraints permit it.
- Heal self or nearby friendly units when equipped.
- Hold near a defensible rally position when no target is currently visible.

Do not implement offensive campaigns, dismantling squads, or controller attacks in this economic defender.

**Complete when:** defenders respond to assessed threats and safely idle/recycle after their demand disappears.

### `src/empire/intelManager.ts`

Maintain persistent room observations.

For every visible room record:

- last-seen tick
- owner and reservation username/ticks
- controller position and level
- source IDs/count and mineral type
- hostile combat strength
- keeper/highway classification
- route distance from relevant colonies

Expose a helper that marks intel stale based on age. Consumers must distinguish unknown, current, and stale data.
Keep updates incremental and avoid route recalculation for every room every tick.

**Complete when:** remote and expansion managers can make decisions without requiring current vision while still
accounting for stale information.

### `src/empire/remoteManager.ts`

Implement the remote-room state machine:

`unknown -> scouting -> candidate -> reserving -> mining -> suspended`

- Discover rooms within policy distance.
- Score sources against route length, hauling cost, reservation cost, danger, and expected income.
- Request scouting when intel is absent/stale.
- Select candidates only when the origin colony is healthy.
- Generate reserver, miner, transporter, and defender demands with stable remote keys.
- Suspend a remote after occupation, excessive threat, repeated losses, or negative profitability.
- Retry after the configured suspension period and fresh intel.

Keep remote demand separate from local bootstrap demand but submit both through the same spawn queue contract.

**Complete when:** profitable remotes enter and leave service automatically as risk and colony health change.

### `src/empire/expansionManager.ts`

Implement one persistent expansion campaign at a time:

`idle -> scouting -> selected -> claiming -> spawnSite -> bootstrapping -> complete`

Before selection require:

- free GCL
- healthy existing colonies
- sufficient stored energy
- fresh route and threat intel
- acceptable distance
- adequate source count
- a viable layout anchor

Persist the selected target and state-change tick. Generate scout/claimer/support demands through origin colonies.
After claiming, place the first spawn site through construction planning. Once the room has a spawn and reliable
income, initialize normal colony memory and mark the campaign complete.

Every state needs timeout and failure transitions so a lost claimer or invalid site cannot stall the campaign.

**Complete when:** a campaign can resume after a global reset and hands a functioning room to `colonyManager`.

### `src/empire/marketManager.ts`

Implement only after local logistics and terminal balancing are stable.

- Skip bootstrap, recovering, and threatened colonies.
- Maintain terminal energy reserves.
- Calculate transaction energy cost before comparing orders.
- Define retain, surplus, and shortage thresholds per resource.
- Create logistics jobs to prepare terminal inventory.
- Select deals only after net price and transfer cost meet policy.
- Rate-limit order scanning and cache short-lived analysis results.

Keep direct market calls here; transporters only satisfy terminal preparation jobs.

**Complete when:** market activity cannot starve colony energy or bypass logistics accounting.

### `src/interface/memory.d.ts`

Finish the declarations listed in **Canonical Type Placement** and correct the current persisted position fields.

Add global augmentation for `Memory` and `CreepMemory`; use explicit records rather than index signatures where keys
have known meanings. Keep all fields JSON-serializable. Ensure declarations match the initialization performed by
`kernel/memory.ts`.

Do not duplicate domain interfaces in this file. Import them as types.

**Complete when:** strict TypeScript reports missing initialization or invalid memory shapes instead of relying on
undeclared globals.

## Implementation Sequence

Implement in vertical slices so each step leaves a runnable loop:

1. Domain exports, memory declarations, migrations, scheduler, room model, and contextual process errors.
2. Pure body builders, source planning, bootstrap harvester, population reconciliation, and spawning.
3. Miner and transporter roles with local energy logistics.
4. Deterministic layout and early-RCL construction with workers and upgraders.
5. Threat assessment, tower plans, defenders, safe mode, and recovery transitions.
6. Link inference and remaining owned-structure execution.
7. Intel, remote state machine, and reservers.
8. Expansion campaigns.
9. Labs, terminals, factories, and market automation.

Do not begin remotes or market behavior until the local room can recover from zero creeps.

## First Autonomous Milestone

The first milestone includes:

- kernel phase ordering and process isolation
- memory initialization and migration
- strict shared domain and memory types
- strategic policy
- one per-tick room model
- colony stages
- source and body planning
- desired-state population
- robust multi-spawn queue consumption
- bootstrap harvester, miner, transporter, worker, and upgrader
- local energy logistics
- deterministic early-RCL construction
- basic tower defense and defender demand
- zero-creep recovery

The acceptance scenario is:

> Deploy the new loop to a fresh owned room with no flags and no preconfigured creep entries. The room must create an
> affordable bootstrap creep, establish source income, replace aging creeps through stable demand keys, build through
> early RCLs, upgrade its controller, defend itself with available towers/defenders, and recover after every creep is
> removed.

Verify the milestone with unit tests for pure planners and mocked integration tests for at least:

1. Empty memory initialization.
2. Zero-creep bootstrap at 300 available energy.
3. Duplicate-demand prevention across living, spawning, and queued creeps.
4. Replacement timing before a miner dies.
5. Permanent spawn request quarantine.
6. Emergency request bypass of an expensive request.
7. Logistics lease expiration after transporter death.
8. RCL-change construction reconciliation.
9. Hostile threat changing stage to `underAttack`.
10. Full population loss changing an established room to `recovering` and restoring income.

Remotes, expansion, minerals, labs, market automation, and offensive combat are explicitly outside this first
milestone.
