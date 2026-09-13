# Combat System Design

## Recommended Architecture

Replace the three independent combat roles with a small combat framework:

1. **Combat operations** decide why creeps are deployed.
2. **Squads** coordinate focus fire, formation, retreat, and rallying.
3. **Combat units** execute movement and actions using shared tactical utilities.

The existing roles cannot coordinate:

- `role.archer.ts` walks directly onto the flag, attacks the first unsorted hostile, and never kites.
- `role.healer.ts` ignores `rangedHeal`, self-healing, threat, and its intended patient.
- `role.melee.ts` mixes navigation and targeting; the Source Keeper branch does not actually chase the keeper.
- All three can continue walking despite being separated or critically injured.
- Missing flags are not consistently handled.
- Dead combat creeps are automatically recreated even if the operation has already failed or ended.

## 1. Model Combat as an Operation

Add persistent operation state rather than placing unrelated flags for every creep:

```ts
type CombatOperationType =
    | "defend"
    | "attack"
    | "harass"
    | "sourceKeeper";

type CombatOperationState =
    | "forming"
    | "travelling"
    | "engaging"
    | "retreating"
    | "complete";

interface CombatOperationMemory {
    type: CombatOperationType;
    state: CombatOperationState;

    homeRoom: string;
    targetRoom: string;
    rallyFlag: string;

    targetFlag?: string;
    focusTargetId?: Id<Creep | Structure>;

    retreatHitsRatio: number;
    required: {
        melee: number;
        ranger: number;
        healer: number;
    };
}

interface Memory {
    combatOperations: Record<string, CombatOperationMemory>;
}
```

Each creep only needs an operation and combat class:

```ts
type CombatClass = "melee" | "ranger" | "healer";

interface CreepMemory {
    operationId?: string;
    combatClass?: CombatClass;
    partnerName?: string;
    targetId?: Id<Creep | Structure>;
}
```

Do not persist a complete member list. Derive members each tick by filtering
`Game.creeps`; this avoids stale names after deaths.

## 2. Introduce a Combat Coordinator

Run the coordinator after room management and before `creep.runRole()`:

```ts
runCombatOperations();
```

Define and export it from
`src/modules/combat/combat.operation.ts`:

```ts
export function runCombatOperations(): void {
    Memory.combatOperations ??= {};

    for (const operationId in Memory.combatOperations) {
        const operation = Memory.combatOperations[operationId];
        const members = Object.values(Game.creeps).filter(
            creep => creep.memory.operationId === operationId
        );

        if (operation.state === "complete") {
            continue;
        }

        const counts = {
            melee: members.filter(
                creep => creep.memory.combatClass === "melee"
            ).length,
            ranger: members.filter(
                creep => creep.memory.combatClass === "ranger"
            ).length,
            healer: members.filter(
                creep => creep.memory.combatClass === "healer"
            ).length,
        };

        const ready =
            counts.melee >= operation.required.melee &&
            counts.ranger >= operation.required.ranger &&
            counts.healer >= operation.required.healer;

        const shouldRetreat = members.some(
            creep =>
                creep.hits / creep.hitsMax <
                operation.retreatHitsRatio
        );

        if (shouldRetreat) {
            operation.state = "retreating";
        } else if (operation.state === "forming" && ready) {
            operation.state = "travelling";
        } else if (
            operation.state === "travelling" &&
            members.length > 0 &&
            members.every(
                creep => creep.room.name === operation.targetRoom
            )
        ) {
            operation.state = "engaging";
        }
    }
}
```

Declare the coordinator fields on `CreepMemory` in
`src/modules/interface/combat.d.ts`:

```ts
type CombatClass = "melee" | "ranger" | "healer";

interface CreepMemory {
    operationId?: string;
    combatClass?: CombatClass;
    partnerName?: string;
    targetId?: Id<Creep | Structure>;
}
```

Import the function in `src/main.ts`:

```ts
import {
    runCombatOperations
} from "./modules/combat/combat.operation";
```

Call it once per tick after room processing and dead-creep cleanup, but before
role execution:

```ts
for (const roomName in Game.rooms) {
    Game.rooms[roomName].run();
}

// Existing dead-creep cleanup.

runCombatOperations();

for (const name in Game.creeps) {
    Game.creeps[name].runRole();
}
```

Do not call the coordinator from individual roles. It makes shared decisions
once per tick; combat roles consume the resulting operation state, focus
target, and partner assignment.

For each operation, the coordinator should:

1. Find living members.
2. Decide whether enough members exist to leave the rally point.
3. Select the operation state.
4. Select one shared focus target.
5. Pair healers with front-line units.
6. Mark the operation as retreating when survival conditions fail.
7. Stop respawning members once the operation is complete.

Recommended state transitions:

```text
forming -> travelling -> engaging -> complete
                       -> retreating -> forming
```

A squad should not travel until its healer is present. This alone prevents many
expensive deaths.

## 3. Separate Decisions from Execution

Every combat creep should produce one plan per tick:

```ts
interface CombatPlan {
    action?: () => ScreepsReturnCode;
    movement?: RoomPosition;
    flee?: RoomPosition[];
}
```

Then execute at most:

- One combat or healing action.
- One movement intent.

This prevents branches from accidentally issuing competing `moveTo` calls.

Suggested modules:

```text
src/modules/combat/
    combat.operation.ts
    combat.targeting.ts
    combat.movement.ts
    combat.damage.ts
    combat.bodies.ts
    combat.types.ts

src/modules/role/
    role.melee.ts
    role.ranger.ts
    role.healer.ts
```

The role files should remain thin. Most logic belongs in reusable combat
modules.

## 4. Target Selection

Never use `hostileCreeps[0]`. Assign threat scores:

```ts
const score =
    activeHealParts * 50 +
    activeRangedParts * 35 +
    activeAttackParts * 30 +
    activeWorkParts * 10 -
    range * 5;
```

Prioritize approximately:

1. Hostile healers.
2. Dangerous units currently in attack range.
3. Ranged attackers.
4. Melee attackers.
5. Dismantlers.
6. Economic creeps.
7. Hostile structures required by the operation.

Keep a valid target for several ticks to prevent target oscillation. All damage
dealers in a squad should normally focus the same target.

Use an explicit owner policy:

```ts
shouldEngage(owner, operation.type);
```

Do not hard-code Source Keeper avoidance inside melee behavior. A defense
operation may ignore keepers, while a keeper-mining operation must deliberately
engage them.

## 5. Ranger Behavior

Rename `archer` to `ranger`. Its priorities should be:

1. Retreat if critically damaged or detached from healing.
2. Fire on the shared target if within range three.
3. Kite away from melee threats.
4. Maintain distance from the squad leader.
5. Travel toward the objective.

Movement rules:

- Against melee-only enemies, maintain range three.
- Against hostile ranged attackers, maintain squad cohesion rather than
  endlessly kiting.
- Avoid standing next to enemies unless mass attack is advantageous.
- Do not move onto the destination flag during combat.

Use `rangedMassAttack()` when its expected total damage exceeds a normal
attack. Its approximate damage is:

- Range 1: 10 per target.
- Range 2: 4 per target.
- Range 3: 1 per target.

Otherwise use `rangedAttack()` against the focus target.

## 6. Melee Behavior

Melee is the anchor rather than an independent hunter:

1. Attack the focus target when adjacent.
2. Move toward that target when the formation is healthy.
3. Stay near the healer if damaged.
4. Block enemies from reaching the ranger or healer.
5. Attack structures only when the operation permits it.
6. Retreat as a group instead of fighting until death.

For assault operations, distinguish target categories:

```ts
type AssaultTarget =
    | "hostileCreep"
    | "tower"
    | "spawn"
    | "rampart"
    | "wall"
    | "controller";
```

Do not let melee randomly attack walls. The operation should provide the breach
position or target structure.

## 7. Healer Behavior

A healer must be assigned to a patient or squad leader.

Healing priority:

1. Self if critically injured and threatened.
2. Adjacent squad member likely to die.
3. Assigned partner.
4. Other damaged combat member.
5. Healthy partner for movement coordination.

Use both healing methods:

```ts
if (creep.pos.isNearTo(patient)) {
    creep.heal(patient);
} else if (creep.pos.inRangeTo(patient, 3)) {
    creep.rangedHeal(patient);
}
```

Movement priorities:

- Stay at range one from the assigned front-line unit.
- Never walk ahead of the front line.
- Follow the retreating unit when the operation retreats.
- If separated, prioritize reunion over reaching the target room.
- Avoid positions within enemy melee range.

Choose patients based on missing effective health and incoming damage, not
simply the first damaged creep.

## 8. Tactical Movement

For strong combat behavior, score all nine possible positions: the current tile
plus eight adjacent tiles.

Example score components:

```text
+ distance from hostile melee
+ proximity to assigned healer or leader
+ ability to attack focus target
+ friendly rampart protection
- estimated incoming damage
- swamp cost
- hostile tower damage
- room-edge danger
- formation separation
```

Estimate incoming damage using active body parts:

- `ATTACK`: 30 at range one.
- `RANGED_ATTACK`: up to 10 within range three.
- `HEAL`: 12 adjacent or 4 ranged per active part.
- Towers: 600 damage at close range, falling to 150 at long range.

Use `PathFinder.search(..., { flee: true })` for emergency retreat. Use a
combat `CostMatrix` to penalize hostile attack ranges, towers, blocked terrain,
and non-friendly ramparts.

A scored local movement system is considerably more reliable than unconditional
`moveTo(target)`.

## 9. Body Construction

Generate bodies from available energy instead of storing manually written
arrays everywhere.

| Unit | Basic unboosted ratio | Notes |
| --- | --- | --- |
| Melee | `TOUGH`, `ATTACK`, `MOVE` | Keep enough `MOVE` for intended terrain |
| Ranger | `RANGED_ATTACK`, `MOVE` | Usually one `MOVE` per combat part off-road |
| Healer | `HEAL`, `MOVE` | Match the speed of its patient |

Important rules:

- Put `TOUGH` parts first so they absorb damage first.
- Put essential offensive and healing parts behind `TOUGH`.
- On plains, use roughly one `MOVE` per non-`MOVE` part for full speed.
- Design paired units to have the same movement speed.
- Do not create oversized attackers that their healer cannot sustain.
- If using boosted `TOUGH`, also use boosted healing and calculate expected
  damage reduction.

Useful initial squads:

- **Room defense:** one ranger plus towers; add a healer against serious
  threats.
- **Remote defense:** one ranger plus one healer.
- **Keeper mining:** one melee or ranger plus one healer.
- **Assault:** one melee anchor, one ranger, and one healer.
- **Heavy assault:** two synchronized pairs or a four-creep squad, not loose
  individual roles.

## 10. Respawning

Combat respawning must be operation-aware. Replace unconditional requeueing
with:

```ts
shouldRespawnCombatCreep(creep.memory.operationId);
```

Respawn only when:

- The operation still exists.
- Its state is not `complete`.
- The required slot is not already queued.
- The replacement can arrive before it is needed.

Give queue entries a stable slot ID so a dead creep and its early replacement
cannot create duplicates.

## Practical Implementation Order

1. Create shared hostile filtering and threat-based target selection.
2. Rewrite healer behavior with pairing, self-heal, and `rangedHeal`.
3. Add ranger kiting with `PathFinder` flee behavior.
4. Add operation state and operation-aware respawning.
5. Add shared focus targets and retreat conditions.
6. Replace flee pathing with adjacent-tile tactical scoring.
7. Add generated bodies, boosts, tower-risk calculation, and structure
   assaults.

The best first usable result is a **melee or ranger plus assigned healer pair**
that rallies, travels together, focus-fires, and retreats together. That will
outperform three sophisticated but independent role scripts.
