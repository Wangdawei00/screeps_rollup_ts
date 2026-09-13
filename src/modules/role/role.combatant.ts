/**
 * Memory Usage: role, body, room. Managed by combat operation instead of player
 */

const roleCombatant = {
    run: (creep: Creep) => {
        creep.runCombatRole();
    }
}

export default roleCombatant;