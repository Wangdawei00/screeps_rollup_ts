import roleMiner from "@/modules/role.miner";
import roleP_Upgrader from "@/modules/role.p_upgrader";
import roleP_builder from "@/modules/role.p_builder";
import roleP_harverster from "@/modules/role.p_harverster";
import roleBuilder from "@/modules/role.builder";
import roleRepairer from "@/modules/role.repairer";
import roleTrain from "@/modules/role.train";
import roleTruck from "@/modules/role.truck";
import roleUpgrader from "@/modules/role.upgrader";
import roleReserver from "@/modules/role.reserver";

const roles: Record<string, { run: (c: Creep) => void }> = {
    "p_harvester": roleP_harverster,
    "miner": roleMiner,
    "p_builder": roleP_builder,
    "p_upgrader": roleP_Upgrader,
    "builder": roleBuilder,
    "repairer": roleRepairer,
    "train": roleTrain,
    "truck": roleTruck,
    "upgrader": roleUpgrader,
    'reserver': roleReserver,
}


Creep.prototype.runRole = function () {
    // console.log(this.memory.role);
    const tickToRespawn = this.memory.body.length * 3 + 50;
    roles[this.memory.role].run(this);

    if (this.ticksToLive && this.ticksToLive < tickToRespawn && !this.memory.respawnInformed) {
        Memory.stack.push(this.memory);
        this.memory.respawnInformed = true;
    }

}

/**Must have a srcFlag*/
Creep.prototype.gotoIdleFlag = function () {
    if (this.memory.srcFlagName) {
        const room = Game.flags[this.memory.srcFlagName].room;
        if (room) {
            const flags = room.find(FIND_FLAGS, {
                filter: f => f.name.startsWith("Idle")
            })
            if (flags.length !== 1) {
                console.error("There is no flag")
            } else {
                this.moveTo(flags[0]);
            }
        }

    } else {
        console.error("askjfa")
    }

}