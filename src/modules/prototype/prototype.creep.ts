import roleMiner from "@/modules/role/role.miner";
import roleP_Upgrader from "@/modules/role/role.p_upgrader";
import roleP_builder from "@/modules/role/role.p_builder";
import roleP_harverster from "@/modules/role/role.p_harverster";
import roleBuilder from "@/modules/role/role.builder";
import roleRepairer from "@/modules/role/role.repairer";
import roleTrain from "@/modules/role/role.train";
import roleTruck from "@/modules/role/role.truck";
import roleUpgrader from "@/modules/role/role.upgrader";
import roleReserver from "@/modules/role/role.reserver";
import roleGarbageCollector from "@/modules/role/role.garbageCollector";
import roleMelee from "@/modules/role/role.melee";
import roleTransferer from "@/modules/role/role.transferer";
import roleClaimer from "@/modules/role/role.claimer";

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
    "garbageCollector": roleGarbageCollector,
    "melee": roleMelee,
    "transferer": roleTransferer,
    "claimer": roleClaimer,
}


Creep.prototype.runRole = function () {
    // console.log(this.memory.role);
    // console.log("I am " + this.name)
    const tickToRespawn = this.memory.body.length * 3 + 50;
    roles[this.memory.role].run(this);

    if (this.ticksToLive && this.ticksToLive < tickToRespawn && !this.memory.respawnInformed) {
        const room = Game.rooms[this.memory.room];
        room.memory.queue.push(this.memory);
        if (this.memory.role === 'reserver') {
            if (this.memory.body.length !== 2) {
                this.memory.body = [CLAIM, MOVE]
                this.memory.reserveCnter = 0;
            } else {
                if (this.memory.reserveCnter !== undefined) {
                    this.memory.reserveCnter++;
                    if (this.memory.reserveCnter < 3) {
                        this.memory.body = [CLAIM, MOVE]
                    } else {
                        this.memory.body = [CLAIM, MOVE, CLAIM, MOVE]
                    }
                } else {
                    this.memory.body = [CLAIM, MOVE]
                    this.memory.reserveCnter = 0;
                }
            }
        }
        this.memory.respawnInformed = true;
    }

}


Creep.prototype.gotoIdleFlag = function () {
    if (this.memory.IdleFlagName) {
        const flag = Game.flags[this.memory.IdleFlagName];
        this.moveTo(flag);
    } else {
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
            console.error("asfjd")
        }
    }


}
Creep.prototype.pickupGarbage = function () {
    const ruin = this.pos.findClosestByPath(FIND_RUINS, {
        filter: (r) => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && r.room?.name === this.room.name
    })
    if (ruin) {
        if (this.withdraw(ruin, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(ruin);
        }
    } else {
        const tombstone = this.pos.findClosestByPath(FIND_TOMBSTONES, {
            filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && t.room?.name === this.room.name
        });
        if (tombstone) {
            if (this.withdraw(tombstone, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(tombstone);
            }
        } else {
            const resource = this.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY
            });
            if (resource) {
                if (this.pickup(resource) === ERR_NOT_IN_RANGE) {
                    this.moveTo(resource);
                }
            } else {
                this.gotoIdleFlag()
            }
        }
    }
}