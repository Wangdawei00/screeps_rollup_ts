# Improvement Recommendations

The project has a clear overall structure: roles are separated, prototypes centralize shared behavior, and strict TypeScript is enabled.

## Prioritized Improvements

- [ ] 1. **Guard missing roles, flags, and rooms**
   - `src/modules/prototype/prototype.creep.ts:52`
   - `src/main.ts:19`
   - Several role modules dereference `Game.flags[...]` without checking the result.
   - Validate these lookups and report contextual errors so one invalid memory value does not abort the entire game tick.

- [ ] 2. **Fix mineral transport state**
   - `src/modules/role/role.train.ts:7-11`
   - `src/modules/role/role.s2sTrain.ts:7-11`
   - The state transitions check only `RESOURCE_ENERGY`. A creep carrying minerals can therefore remain in collection mode instead of delivering its cargo.
   - Base the checks on the selected resource type or the creep's total used and free capacity.

- [ ] 3. **Prevent spawn-queue deadlocks**
   - `src/modules/prototype/prototype.spawn.ts:39-45`
   - A permanently invalid spawn request remains at the front of the queue forever.
   - Retain requests for temporary failures such as insufficient energy, but remove or quarantine requests that return permanent errors such as `ERR_INVALID_ARGS`.

- [ ] 4. **Strengthen creep-memory types**
   - Replace `CreepMemory.role: string` with a union of supported role names.
   - Prefer a discriminated union that requires the appropriate flags and options for each role.
   - Type the role registry with the same union so `roles[this.memory.role]` is checked by TypeScript.

- [ ] 5. **Reduce CPU usage**
   - Cache frequently used structure IDs in room memory instead of repeatedly searching the room.
   - Reduce repeated `findClosestByPath` calls and use suitable `moveTo` path-reuse options.
   - Skip link and lab operations when cooldown, capacity, or missing resources make the action impossible.

- [ ] 6. **Repair the test configuration**
   - `jest.config.js` references `test/setup.ts`, but that file does not exist.
   - Add the intended setup file or remove the configuration entry so the test suite can start.
   - Add focused tests for role state transitions, spawn-queue error handling, and invalid memory references.

- [ ] 7. **Separate build and watch commands**
   - The current `build` script uses `rollup -cw`, so it starts watch mode and does not exit.
   - Use `rollup -c` for a one-time build and provide a separate `watch` script using `rollup -cw`.

- [ ] 8. **Remove obsolete commented code**
   - Large commented sections in `prototype.spawn.ts` and `role.train.ts` obscure the active implementation.
   - Remove obsolete code and rely on Git history when an older implementation is needed.
