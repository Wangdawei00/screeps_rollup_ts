import roleHarvester from "@/modules/role.harvester";
import roleUpgrader from "@/modules/role.upgrader";
import roleBuilder from "@/modules/role.builder";
import roleRepairer from "@/modules/role.repairer";
import roleMiner from "@/modules/role.miner";
import roleLorry from "@/modules/role.lorry";
import roleReserver from "@/modules/role.reserver";
import roleAdvancedUpgrader from "@/modules/role.advancedUpgrader";
import roleLongDistanceHarvester from "@/modules/role.longDistanceHarvester";
import roleGarbageCollector from "@/modules/role.garbageCollector";
import roleMeleeAttacker from "@/modules/role.meleeAttacker";
import roleRangedAttacker from "@/modules/role.rangedAttacker";
import roleControllerAttacker from "@/modules/role.controllerAttacker";

const roles: Record<string, { run: (c: Creep) => void }> = {
    "harvester": roleHarvester,
    "upgrader": roleUpgrader,
    "builder": roleBuilder,
    "repairer": roleRepairer,
    "miner": roleMiner,
    "lorry": roleLorry,
    "advancedUpgrader": roleAdvancedUpgrader,
    "reserver": roleReserver,
    "longDistanceHarvester": roleLongDistanceHarvester,
    "garbageCollector": roleGarbageCollector,
    "meleeAttacker": roleMeleeAttacker,
    "rangedAttacker": roleRangedAttacker,
    "controllerAttacker": roleControllerAttacker,
};

Creep.prototype.runRole = function () {
    roles[this.memory.role].run(this);
}

Creep.prototype.getEnergy =
    function (useContainer: boolean, useSource: boolean) {
        /** @type {StructureContainer} */
        let container: StructureContainer | null = null;
        // if the Creep should look for containers
        if (useContainer) {
            // find closest container
            container = this.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                    s.store[RESOURCE_ENERGY] > 0
            });
            // if one was found
            if (container !== null) {
                // try to withdraw energy, if the container is not in range
                if (this.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    // move towards it
                    this.moveTo(container);
                }
            }
        }
        // if no container was found and the Creep should look for Sources
        if (container === null && useSource) {
            // find closest source
            const source = this.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source !== null) {
                // try to harvest energy, if the source is not in range
                if (this.harvest(source) === ERR_NOT_IN_RANGE) {
                    // move towards it
                    this.moveTo(source);
                }
            }


        }
    };


Creep.prototype.MoveFromHomeToTarget = function () {
    if (this.memory.target && this.room.name !== this.memory.target) {
        const exit = this.room.findExitTo(this.memory.target);
        if (exit !== ERR_NO_PATH && exit !== ERR_INVALID_ARGS) {
            const exitPoint = this.pos.findClosestByRange(exit);
            if (exitPoint) {
                this.moveTo(exitPoint);
            }
        }
    }
}

Creep.prototype.MoveFromTargetToHome = function () {
    if (this.memory.home && this.room.name !== this.memory.home) {
        const exit = this.room.findExitTo(this.memory.home);
        if (exit !== ERR_NO_PATH && exit !== ERR_INVALID_ARGS) {
            const exitPoint = this.pos.findClosestByRange(exit);
            if (exitPoint) {
                this.moveTo(exitPoint);
            }
        }
    }
}

Creep.prototype.WithdrawFromContainerOrStorage = function () {
    const source = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > this.store.getFreeCapacity() &&
            this.room.memory.sourceContainerIds.includes(structure.id)
    });
    if (source) {
        if (this.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(source);
        }
    } else {
        if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY] > this.store.getFreeCapacity(RESOURCE_ENERGY)) {
            if (this.withdraw(this.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(this.room.storage)
            }
        }
    }
}

Creep.prototype.WithdrawFromContainer = function () {
    const source = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > this.store.getCapacity(RESOURCE_ENERGY) &&
            this.room.memory.sourceContainerIds.includes(structure.id)
    });
    if (source) {
        if (this.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(source);
        }
    }
}