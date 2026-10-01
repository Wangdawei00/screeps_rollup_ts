import roleMelee from "./role.melee";
import roleRanger from "./role.ranger";
import roleHealer from "./role.healer";

const roleCombatant = {
    run: (creep: Creep) => {
        switch (creep.memory.combatClass) {
            case "melee":
                roleMelee.run(creep);
                break;
            case "ranger":
                roleRanger.run(creep);
                break;
            case "healer":
                roleHealer.run(creep);
                break;
            default:
                console.log(`Combat creep ${creep.name} has no combatClass`);
        }
    }
};

export default roleCombatant;