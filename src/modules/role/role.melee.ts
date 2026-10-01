import {runCombatUnit} from "@/modules/combat/combat.operation";

const roleMelee = {
    run: (creep: Creep) => runCombatUnit(creep, "melee")
};

export default roleMelee;
