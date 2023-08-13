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
import roleClaimer from "@/modules/role.claimer";
import roleToStorageLorry from "@/modules/role.toStorageLorry";
import roleFromStorageLorry from "@/modules/role.fromStorageLorry";
import roleTransferer from "@/modules/role.transferer";
import roleLongDistanceBuilder from "@/modules/role.longDistanceBuilder";
import roleLongDistanceRepairer from "@/modules/role.longDistanceRepairer";
import roleInterRoomMiner from "@/modules/role.interRoomMiner";
import roleInterRoomLorry from "@/modules/role.interRoomLorry";
import roleLinkStorageCommunicator from "@/modules/role.LinkStorageCommunicator";
import roleHealer from "@/modules/role.Healer";
import roleLongDistanceUpgrader from "@/modules/role.longDistanceUpgrader";
import roleMineralHarvester from "@/modules/role.mineralHarvester";
import roleContainerLinkCommunicator from "@/modules/role.containerLinkCommunicator";
import roleStorageLinkCommunicator from "@/modules/role.storageLinkCommunicator";
import roleWallRepairer from "@/modules/role.wallRepairer";
import roleRampartRepairer from "@/modules/role.rampartRepairer";
import roleDismantler from "@/modules/role.dismantler";
import roleInterRoomGarbageCollector from "@/modules/role.interRoomGarbageCollector";

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
    "claimer": roleClaimer,
    "toStorageLorry": roleToStorageLorry,
    "fromStorageLorry": roleFromStorageLorry,
    "transferer": roleTransferer,
    "longDistanceBuilder": roleLongDistanceBuilder,
    "longDistanceRepairer": roleLongDistanceRepairer,
    "interRoomMiner": roleInterRoomMiner,
    "interRoomLorry": roleInterRoomLorry,
    "linkStorageCommunicator": roleLinkStorageCommunicator,
    "healer": roleHealer,
    "longDistanceUpgrader": roleLongDistanceUpgrader,
    'mineralHarvester': roleMineralHarvester,
    'containerLinkCommunicator': roleContainerLinkCommunicator,
    'storageLinkCommunicator': roleStorageLinkCommunicator,
    'wallRepairer': roleWallRepairer,
    'rampartRepairer': roleRampartRepairer,
    'dismantler': roleDismantler,
    'interRoomGarbageCollector': roleInterRoomGarbageCollector,
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


Creep.prototype.MoveToTargetRoom = function () {
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

Creep.prototype.MoveToHomeRoom = function () {
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
        filter: (structure) => structure.structureType === STRUCTURE_CONTAINER && this.room.memory.sourceContainerIds &&
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
    const source = this.memory.containerId ? Game.getObjectById(this.memory.containerId) :
        this.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getCapacity(RESOURCE_ENERGY)
        });
    if (source) {
        if (this.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(source);
        }
    }
}

Creep.prototype.WithdrawFromStorage = function () {
    const source = this.room.storage;
    if (source && source.store.getUsedCapacity(RESOURCE_ENERGY) >= this.store.getFreeCapacity(RESOURCE_ENERGY)) {
        if (this.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(source);
        }
    } else {
        if (this.room.memory.idleFlagNames) {
            this.moveTo(Game.flags[this.room.memory.idleFlagNames[0]])
        }
    }
}


Creep.prototype.PickupGarbage = function () {
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
            const resource = this.room.find(FIND_DROPPED_RESOURCES, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY && r.room?.name === this.room.name
            });
            let target: Resource | undefined = undefined;
            for (const resourceElement of resource) {
                if (resourceElement.amount >= this.store.getFreeCapacity()) {
                    target = resourceElement;
                }
            }
            if (target) {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target);
                }
            } else {
                if (resource.length > 0) {
                    if (this.pickup(resource[0]) === ERR_NOT_IN_RANGE) {
                        this.moveTo(resource[0]);
                    }
                } else {
                    if (this.room.memory.idleFlagNames) {
                        this.moveTo(Game.flags[this.room.memory.idleFlagNames[0]]);
                    }
                }

            }
        }
    }
}

Creep.prototype.HarvestSource = function () {
    const source = this.memory.sourceId ? Game.getObjectById(this.memory.sourceId) : this.pos.findClosestByPath(FIND_SOURCES)
    if (source) {
        if (this.harvest(source) === ERR_NOT_IN_RANGE) {
            this.moveTo(source);
        }
    }
}

Creep.prototype.DepositToStorage = function () {
    const storage = this.room.storage;
    if (storage) {
        if (this.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(storage);
        }
    }
}

Creep.prototype.DepositToAnything = function () {
    const target = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => (structure.structureType === STRUCTURE_EXTENSION ||
                structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_TOWER ||
                structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_CONTAINER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    if (target) {
        if (this.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    }
}