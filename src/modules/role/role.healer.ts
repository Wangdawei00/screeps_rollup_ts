import {runCombatUnit} from "@/modules/combat/combat.operation";

const roleHealer = {
    run: (creep: Creep) => runCombatUnit(creep, "healer")
};

export default roleHealer;
