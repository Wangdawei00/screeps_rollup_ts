# Improvement Recommendations

The project has a clear role-based structure, centralized prototypes, strict TypeScript settings, and separate one-time
build and watch commands. The recommendations below reflect the current codebase and omit completed work.

## Prioritized Improvements

- [ ] 
    1. **Guard invalid memory references and stale cached IDs**

    - `src/modules/prototype/prototype.creep.ts:51-52,88-93,168-173`
    - `src/main.ts:15-18`
    - `src/modules/prototype/prototype.room.ts:28-32,43-44,69-70`
    - Several role modules still dereference flags or room objects without validating them, including `role.archer.ts`,
      `role.healer.ts`, `role.melee.ts`, `role.reserver.ts`, `role.s2sTrain.ts`, `role.train.ts`, and
      `role.upgrader.ts`.
    - Some roles now guard missing flags, so retain those checks and apply the same pattern consistently.
    - Validate `this.memory.role` before dispatching it. Invalid roles currently cause
      `roles[this.memory.role].run(this)` to fail.
    - Filter null results from `Game.getObjectById()` and rebuild stale room-cache entries before dereferencing them. A
      destroyed cached structure can otherwise abort the room loop.
    - Report contextual errors without allowing one invalid creep or cache entry to abort the entire tick.

- [ ] 
    2. **Fix remaining resource-state and transfer edge cases**

    - `src/modules/role/role.s2sTrain.ts:7-18,27-33`
    - `src/modules/role/role.upgrader.ts:17-20,43-45`
    - `src/modules/role/role.repairer.ts:37-41`
    - `src/modules/role/role.wallRepairer.ts:32-36`
    - `role.train.ts` now bases its state on the selected resource, but `role.s2sTrain.ts` still checks only
      `RESOURCE_ENERGY`. Use the selected resource type or total store capacity consistently.
    - Allow `s2sTrain` creeps to withdraw a partial load instead of requiring storage to contain a full creep-load.
    - Restrict upgrader dropped-resource pickup to energy. Also report the actual `upgradeController` return code
      instead of treating every failure as a positioning error.
    - Use `>=` when checking whether a container has the requested repairer or wall-repairer withdrawal amount; exact
      available amounts are currently skipped.

- [ ] 
    3. **Prevent spawn-queue deadlocks**

    - `src/modules/prototype/prototype.spawn.ts:17-23`
    - The queue removes a request only when `spawnCreep` returns `OK`, so a permanently invalid request remains at the
      front forever.
    - Keep requests for transient failures such as `ERR_NOT_ENOUGH_ENERGY` and `ERR_BUSY`, but remove or quarantine
      requests that return permanent errors such as `ERR_INVALID_ARGS`, `ERR_NAME_EXISTS`, or an invalid body.
    - Log the rejected request with its spawn result so malformed queue producers can be corrected.

- [ ] 
    4. **Strengthen creep-memory and role-registry types**

    - `src/modules/interface/creep.d.ts:2-3`
    - `src/modules/prototype/prototype.creep.ts:23-52`
    - Replace `CreepMemory.role: string` with a union of supported role names and type the role registry with the same
      union.
    - Prefer a discriminated union for role-specific memory so required fields such as source flags, destination flags,
      and resource types are enforced when creeps are queued.
    - Add runtime validation because persisted Screeps memory can remain invalid even after compile-time types change.

- [ ] 
    5. **Finish the room cache and reduce per-tick CPU work**

    - `src/modules/prototype/prototype.room.ts:2-30` already caches room structure IDs; preserve this improvement and
      make cache refresh safe when structures are built or destroyed.
    - Remaining repeated searches occur in `prototype.link.ts:2-9`, `role.builder.ts:33-35,65-76`,
      `role.repairer.ts:26-49`, `role.transferer.ts:18-39`, `role.wallRepairer.ts:15-40`, and `prototype.room.ts:69-83`.
    - Cache stable infrastructure IDs and fixed creep assignments, resolving them with `Game.getObjectById()`. Do not
      persist complete game objects.
    - Continue searching for short-lived targets such as dropped resources, tombstones, hostiles, injured creeps, and
      construction sites, or refresh those targets frequently.
    - Avoid repeated `findClosestByPath` calls in the same tick, use appropriate `moveTo` path reuse, and skip link or
      lab work when cooldown or resource constraints make the action impossible.
    - Reduce unconditional per-tick logging such as spawn queue length and successful spawn status, or gate diagnostics
      behind a configurable debug flag.

- [ ] 
    6. **Repair the test configuration and add regression coverage**

    - `jest.config.js:12-14` references `test/setup.ts`, but that file and the test directory do not exist.
    - Add the intended Screeps test setup or remove the setup entry so Jest can start.
    - Add focused tests for invalid role and flag memory, stale cached IDs, resource-state transitions, partial
      withdrawals, and permanent versus transient spawn errors.

- [ ] 
    7. **Synchronize the README with the package scripts**

    - `README.md:45-53` says `npm run build` starts watch mode, but the current build command is a one-time Rollup
      build.
    - Document `npm run build` as the one-time build and the existing watch command as the development workflow.
