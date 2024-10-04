import roleMiner from "@/modules/role.miner";
import roleP_Upgrader from "@/modules/role.p_upgrader";
import roleP_builder from "@/modules/role.p_builder";
import roleP_harverster from "@/modules/role.p_harverster";

const roles: Record<string, { run: (c: Creep) => void }> = {
    "p_harvester": roleP_harverster,
    "miner": roleMiner,
    "p_builder": roleP_builder,
    "p_upgrader": roleP_Upgrader,
}


Creep.prototype.runRole = function () {
    // console.log(this.memory.role);
    roles[this.memory.role].run(this);
}