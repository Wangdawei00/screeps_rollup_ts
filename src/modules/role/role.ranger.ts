import {runCombatUnit} from "@/modules/combat/combat.operation";

const roleRanger = {
    run: (creep: Creep) => runCombatUnit(creep, "ranger")
};

export default roleRanger;
