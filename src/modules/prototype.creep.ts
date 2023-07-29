import roleHarvester from "@/modules/role.harvester";
import roleUpgrader from "@/modules/role.upgrader";
import roleBuilder from "@/modules/role.builder";
import roleRepairer from "@/modules/role.repairer";
import roleMiner from "@/modules/role.miner";
import roleLorry from "@/modules/role.lorry";
import roleAdvancedUpgrader from "@/modules/role.advancedUpgrader";
const roles: Record<string, { run: (c: Creep) => void }> = {
    "harvester": roleHarvester,
    "upgrader": roleUpgrader,
    "builder": roleBuilder,
    "repairer": roleRepairer,
    "miner": roleMiner,
    "lorry": roleLorry,
    "advancedUpgrader": roleAdvancedUpgrader
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