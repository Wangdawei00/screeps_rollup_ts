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
import roleWallRepairer from "@/modules/role/role.wallRepairer";
import roleDismantler from "@/modules/role/role.dismantler";
import roleHealer from "@/modules/role/role.healer";
import roleArcher from "@/modules/role/role.archer";
import roleInterRoomGarbageCollector from "@/modules/role/role.interRoomGarbageCollector";
import roleControllerAttacker from "@/modules/role/role.controllerAttacker";
import roleS2sTrain from "@/modules/role/role.s2sTrain";

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
    "wallRepairer": roleWallRepairer,
    "dismantler": roleDismantler,
    "healer": roleHealer,
    "archer": roleArcher,
    "interRoomGarbageCollector": roleInterRoomGarbageCollector,
    "controllerAttacker": roleControllerAttacker,
    "s2sTrain": roleS2sTrain,
}


Creep.prototype.runRole = function () {
    // console.log(this.memory.role);
    // console.log("I am " + this.name)
    const tickToRespawn = this.memory.body.length * 3 + 50;
    roles[this.memory.role].run(this);

    if (this.ticksToLive && this.ticksToLive < tickToRespawn && !this.memory.respawnInformed) {
        const room = Game.rooms[this.memory.room];
        if (this.memory.role === 'truck') {
            room.memory.queue.splice(0, 0, this.memory)
        } else {
            room.memory.queue.push(this.memory);
        }
        if (this.memory.role === 'reserver') {
            if (this.memory.body.length !== 2) {
                this.memory.body = [CLAIM, MOVE]
                this.memory.reserveCnter = 0;
            } else {
                if (this.memory.reserveCnter !== undefined) {
                    this.memory.reserveCnter++;
                    if (this.memory.reserveCnter < 5) {
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
        this.memory.upgraded = false;
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
                    console.log("There is no flag")
                } else {
                    this.moveTo(flags[0]);
                }
            }
        } else {
            console.log("No Idle Flags found, Check the code or the memory of creep " + this.name)
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