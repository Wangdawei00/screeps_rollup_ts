const listOfRoles = ['linkStorageCommunicator', 'lorry', 'harvester', 'upgrader', "transferer", 'repairer',
    "garbageCollector", "controllerAttacker", "claimer", 'builder', 'mineralHarvester', 'wallRepairer', 'rampartRepairer'
];
const specialLorryRoles = ["toStorageLorry", 'fromStorageLorry'];
const communicatorRole = {
    'linkStorageCommunicator': "linkStorageCommunicatorFlagNames",
    'containerLinkCommunicator': "containerLinkCommunicatorFlagNames",
    'storageLinkCommunicator': "storageLinkCommunicatorFlagNames"
}

const outpostRoles = ["meleeAttacker", "rangedAttacker",/* "healer"*/ "reserver", "longDistanceBuilder", "longDistanceRepairer", 'interRoomGarbageCollector']//, "longDistanceUpgrader"];
StructureSpawn.prototype.SpawnCreepsIfNecessary =
    function () {
        // noinspection JSMismatchedCollectionQueryUpdate
        const outposts: string[] = ["E53S53", "E53S52"];//["E54S53"]//, "E56S53"]
        const minCreeps: Record<string, number> = {
            harvester: 0,
            upgrader: 0,
            builder: this.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES) ? 1 : 0,
            repairer: 1,
            lorry: 0, //this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? 0 : 0,
            reserver: 1,
            longDistanceHarvester: 0,
            garbageCollector: 1,
            meleeAttacker: outposts.length > 0 ? 1 : 0,
            rangedAttacker: outposts.length > 0 ? 1 : 0,
            healer: outposts.length > 0 ? 1 : 0,
            controllerAttacker: outposts.length > 0 ? 0 : 0,
            claimer: 0,
            toStorageLorry: 1,
            fromStorageLorry: this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? 0 : 1,
            transferer: 2,
            longDistanceBuilder: 1,
            longDistanceRepairer: 1,
            interRoomLorry: 2,
            longDistanceUpgrader: 2,
            mineralHarvester: 1,
            wallRepairer: 0,
            rampartRepairer: 0,
            interRoomGarbageCollector: 1,
        }

        const transferWorkerRole = ['toStorageLorry', 'fromStorageLorry', 'transferer', 'lorry',
            "garbageCollector"]
        const crossRoomRoles = ['longDistanceHarvester', 'longDistanceBuilder', 'reserver', 'claimer',
            'meleeAttacker', 'rangedAttacker', 'controllerAttacker', 'longDistanceRepairer', 'linkStorageCommunicator']
        const claimRoom = ['E53S55']
        const room = this.room;
        // find all creeps in room
        let creepsInRoom = room.find(FIND_MY_CREEPS);

        // count the number of creeps alive for each role in this room
        // _.sum will count the number of properties in Game.creeps filtered by the
        //  arrow function, which checks for the creep being a specific role
        /** @type {Object.<string, number>} */
        let numberOfCreeps: Record<string, number> = {};
        for (const role of listOfRoles) {
            if (crossRoomRoles.includes(role)) {
                numberOfCreeps[role] = _.sum(Game.creeps, c => c.memory.role === role ? 1 : 0);
            } else {
                numberOfCreeps[role] = _.sum(creepsInRoom, c => c.memory.role === role ? 1 : 0);
            }
        }
        numberOfCreeps['toStorageLorry'] = _.sum(creepsInRoom, c => c.memory.role === 'toStorageLorry' ? 1 : 0);
        let maxEnergy = room.energyCapacityAvailable;
        let name = undefined;

        if (this.room.storage) {
            if (numberOfCreeps['harvester'] === 0 && numberOfCreeps['transferer'] === 0 && numberOfCreeps['toStorageLorry'] === 0) {
                if (numberOfCreeps['miner'] > 0 || (this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) +
                    this.room.energyAvailable >= 600 + 650)) {
                    name = this.CreateTransportWorker(600, "transferer", null, this.room.name);
                } else {
                    name = this.CreateCustomCreep(room.energyAvailable, 'harvester');
                }
            }
        } else {
            if (numberOfCreeps['harvester'] == 0 && numberOfCreeps['lorry'] == 0) {
                // if there are still miners or enough energy in Storage left
                if (numberOfCreeps['miner'] > 0 || (room.storage != undefined &&
                    room.storage.store[RESOURCE_ENERGY] >= 150 + 550)) {
                    // create a lorry
                    name = this.CreateTransportWorker(600, "lorry", null, this.room.name);
                }
                // if there is no miner and not enough energy in Storage left
                else {
                    // create a harvester because it can work on its own
                    name = this.CreateCustomCreep(room.energyAvailable, 'harvester');
                }
            }
        }
        if (name == undefined) {
            // check if all sources have miners
            let sources = room.find(FIND_SOURCES);
            // iterate over all sources
            for (let source of sources) {
                // if the source has no miner
                if (!_.some(creepsInRoom, c => c.memory.role == 'miner' && c.memory.sourceId == source.id)) {
                    // check whether the source has a container
                    // let containers: StructureContainer[] = source.pos.findInRange(FIND_STRUCTURES, 1, {
                    //     filter: s => s.structureType == STRUCTURE_CONTAINER
                    // });
                    // if there is a container next to the source
                    // if (containers.length > 0) {
                    // spawn a miner
                    name = this.CreateMiner(source.id);
                    break;
                    // }
                }
            }
        }
        // if no harvesters are left AND either no miners or no lorries are left
        //  create a backup creep
        if (name === undefined) {
            for (let role of specialLorryRoles) {
                const ids = role === 'toStorageLorry' ? this.room.memory.sourceContainerIds : this.room.memory.sinkContainerIds;
                if (ids === undefined) continue;
                for (const containerId of ids) {
                    const num = _.sum(Game.creeps, (creep) => {
                        return creep.memory.role === role && creep.memory.containerId === containerId ? 1 : 0;
                    });
                    if (num < minCreeps[role]) {
                        name = this.CreateTransportWorker(600, role, containerId, this.room.name);
                        break;
                    }
                }
                if (name) break;
            }
        }
        // if no backup creep is required

        for (const role in communicatorRole) {
            // @ts-ignore
            const flagNames = this.room.memory[communicatorRole[role]];
            for (const flagName of flagNames) {
                if (!_.some(Game.creeps, (creep) => creep.memory.role === role && creep.memory.targetFlagName === flagName)) {
                    name = this.CreateCommunicator(role, flagName);
                    break;
                }

            }
            if (name) {
                break;
            }
        }
        if (name == undefined) {
            for (let role of listOfRoles) {
                if (numberOfCreeps[role] < minCreeps[role]) {
                    if (transferWorkerRole.includes(role)) {
                        name = this.CreateTransportWorker(600, role, null, this.room.name);
                    } else if (role === 'claimer' && (!Game.rooms[claimRoom[0]] || !Game.rooms[claimRoom[0]].controller?.my)) {
                        name = this.CreateClaimer(claimRoom[0]);
                    } else if (role === 'linkStorageCommunicator') {
                        name = this.CreateLinkStorageCommunicator();
                    } else if (role === 'mineralHarvester') {
                        if (this.room.controller && this.room.controller.level >= 6 && this.room.find(FIND_MY_STRUCTURES, {
                            filter: s => s.structureType === STRUCTURE_EXTRACTOR
                        }).length > 0) {
                            const mineral = this.room.find(FIND_MINERALS)[0]
                            if (mineral.mineralAmount > 0) {
                                name = this.CreateMineralHarvester(mineral.mineralType, mineral.id, maxEnergy);
                            }
                        }
                    } else {
                        name = this.CreateCustomCreep(maxEnergy, role);
                    }
                    if (name) break;
                }
            }
        }
        if (name === undefined) {
            for (const room of outposts) {
                if (Game.rooms[room]) {
                    const sources = Game.rooms[room].find(FIND_SOURCES);
                    for (const source of sources) {
                        if (!_.some(Game.creeps, c =>
                            c.memory.role == 'interRoomMiner' && c.memory.sourceId == source.id
                        )) {
                            const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                                filter: s => s.structureType == STRUCTURE_CONTAINER
                            })
                            if (container.length > 0) {
                                name = this.CreateInterRoomMiner(source.id, room, <Id<StructureContainer>>container[0].id);
                                break;
                            } else {
                                name = this.CreateInterRoomMiner(source.id, room);
                                break;
                            }
                        }
                    }
                }

            }

        }
        // if none of the above caused a spawn command check for other roles
        if (name === undefined) {
            for (const invasionRole of outpostRoles) {
                for (const invasionRoom of outposts) {
                    const num = _.sum(Game.creeps, (creep) => {
                        return creep.memory.role === invasionRole && creep.memory.target === invasionRoom ? 1 : 0;
                    });
                    console.log(invasionRoom + invasionRole + num)
                    if (num < minCreeps[invasionRole]) {
                        if (invasionRole === 'longDistanceBuilder') {
                            if (Game.rooms[invasionRoom] && Game.rooms[invasionRoom].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                                name = this.CreateOutpostCreep(invasionRoom, maxEnergy, invasionRole);
                                break;
                            }
                        } else {
                            name = this.CreateOutpostCreep(invasionRoom, maxEnergy, invasionRole);
                            break;
                        }

                    }
                }
                if (name) {
                    break;
                }
            }
        }

        //InterRoomLorry
        if (name === undefined) {
            for (const room of outposts) {
                if (Game.rooms[room]) {
                    const sources = Game.rooms[room].find(FIND_SOURCES);
                    for (const source of sources) {
                        const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => s.structureType == STRUCTURE_CONTAINER
                        })
                        if (containers.length > 0) {
                            const container = <StructureContainer>containers[0];
                            const num = _.sum(Game.creeps, (creep) => {
                                return creep.memory.role === 'interRoomLorry' && creep.memory.containerId === container.id ? 1 : 0;
                            })
                            if (num < minCreeps['interRoomLorry']) {
                                name = this.CreateInterRoomLorry(container.id, room, 'E54S53');
                                break;
                            }
                        }
                    }
                }
            }
        }


        // if (name === undefined) {
        //     const dismantleFlagNames: string[] = [];
        //     for (let i = 0; i < 3; i++) {
        //         dismantleFlagNames.push("DismantleFlag" + i);
        //     }
        //     for (const flagName of dismantleFlagNames) {
        //
        //         if (!_.some(Game.creeps, c => c.memory.role == 'dismantler'
        //             && c.memory.targetFlagName == flagName)) {
        //             const walls = Game.flags[flagName]?.pos.lookFor(LOOK_STRUCTURES).filter(s =>
        //                 s.structureType === STRUCTURE_WALL);
        //             if (walls?.length !== 0) {
        //                 name = this.CreateDismantler(maxEnergy, flagName);
        //                 break;
        //             }
        //         }
        //     }
        // }

        if (name == undefined && this.room.find(FIND_MY_CONSTRUCTION_SITES).length === 0) {
            // check for advanced upgraders
            const advancedUpgraderFlagNames = [/*"ControllerRoadEndpoint"*/];
            for (let i = 1; i < 2; i++) {
                advancedUpgraderFlagNames.push("UpgraderPosition" + i);
            }
            for (const flagName of advancedUpgraderFlagNames) {
                if (!_.some(Game.creeps, c =>
                    c.memory.role == 'advancedUpgrader' && c.memory.upgradePosFlagName == flagName
                ) && this.room.name === Game.flags[flagName].room?.name) {
                    name = this.CreateAdvancedUpgrader(flagName, maxEnergy);
                    break;
                }
            }
        }
        //InterRoomMiner


        // // if none of the above caused a spawn command check for LongDistanceHarvesters
        // /** @type {Object.<string, number>} */

        // print name to console if spawning was a success
        if (name != undefined && _.isString(name)) {
            // consle.log(tohis.name + " spawned new creep: " + name + " (" + Game.creeps[name].memory.role + ")");
            for (let role of listOfRoles) {
                console.log(role + ": " + numberOfCreeps[role]);
            }
            // for (let roomName in numberOfLongDistanceHarvesters) {
            //     console.log("LongDistanceHarvester" + roomName + ": " + numberOfLongDistanceHarvesters[roomName]);
            // }
        }
    };

StructureSpawn.prototype.CreateInterRoomMiner = function (sourceId, target, containerId) {
    const name = 'InterRoomMiner' + Game.time.toString();
    if (this.spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE], name, {
        memory: {
            role: 'interRoomMiner',
            sourceId: sourceId,
            containerId: containerId,
            target: target
        }
    }) === OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateInterRoomLorry = function (containerId, target, home) {
    const name = 'InterRoomLorry' + Game.time.toString();
    if (this.spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], name, {
        memory: {
            role: 'interRoomLorry',
            containerId: containerId,
            target: target,
            home: home
        }
    }) === OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateMiner =
    function (sourceId: Id<Source>) {
        const name = 'Miner' + Game.time.toString()
        const source = Game.getObjectById(sourceId);
        if (source !== null) {
            const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            })
            if (this.spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE], name, {
                memory: {
                    role: 'miner',
                    sourceId: sourceId,
                    containerId: containers.length > 0 ? <Id<StructureContainer>>containers[0].id : undefined
                }
            }) === OK) {
                return name;
            }
        }
    };


StructureSpawn.prototype.CreateTransportWorker =
    function (energy: number, role: string = "lorry", containerId: Id<StructureContainer> | null, homeRoomName) {
        // create a body with twice as many CARRY as MOVE parts
        let numberOfParts = Math.floor(energy / 150);
        // make sure the creep is not too big (more than 50 parts)
        numberOfParts = Math.min(numberOfParts, Math.floor(50 / 3));
        const body: BodyPartConstant[] = [];
        for (let i = 0; i < numberOfParts * 2; i++) {
            body.push(CARRY);
        }
        for (let i = 0; i < numberOfParts; i++) {
            body.push(MOVE);
        }

        // create creep with the created body and the role 'lorry'
        const name = role + Game.time.toString();
        this.spawnCreep(body, name, {
            memory: {
                role: role,
                working: false,
                containerId: containerId ? containerId : undefined,
                home: homeRoomName
            }
        });
        return name;
    };

StructureSpawn.prototype.CreateCustomCreep = function (energy: number, roleName: string) {
    // create a balanced body as big as possible with the given energy
    let numberOfParts = Math.floor(energy / 200);
    // make sure the creep is not too big (more than 50 parts)
    numberOfParts = Math.min(numberOfParts, Math.floor(50 / 3));
    const body: BodyPartConstant[] = [];
    for (let i = 0; i < numberOfParts; i++) {
        body.push(WORK);
    }
    for (let i = 0; i < numberOfParts; i++) {
        body.push(CARRY);
    }
    for (let i = 0; i < numberOfParts; i++) {
        body.push(MOVE);
    }

    // create creep with the created body and the given role
    const name = roleName + Game.time.toString();
    this.spawnCreep(body, name, {memory: {role: roleName}});
    return name;
}

StructureSpawn.prototype.CreateAdvancedUpgrader = function (flagName: string, energy: number) {

    const config: BodyPartConstant[] = []
    const name = 'AdvancedUpgrader' + Game.time.toString();
    const numberOfMoveParts = Math.floor((energy - 200) / 250);
    const numberOfWorkParts = numberOfMoveParts * 2;
    for (let i = 0; i < numberOfWorkParts; i++) {
        config.push(WORK);
    }
    for (let i = 0; i < numberOfMoveParts; i++) {
        config.push(MOVE);
    }
    for (let i = 0; i < 4; i++) {
        config.push(CARRY);

    }
    if (this.spawnCreep(config, name, {memory: {role: 'advancedUpgrader', upgradePosFlagName: flagName}}) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateReserverOrControllerAttacker = function (targetRoomName: string, role: string) {
    const config = [CLAIM, CLAIM, MOVE, MOVE]
    const name = role + Game.time.toString();
    if (this.spawnCreep(config, name, {memory: {role: role, target: targetRoomName}}) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateLongDistanceWorker =
    function (targetRoomName: string, homeRoomName: string, energy: number, role: string) {
        const config: BodyPartConstant[] = [];
        const numberOfWorkParts = Math.floor(energy / 250);
        for (let i = 0; i < numberOfWorkParts; i++) {
            config.push(WORK);
        }
        for (let i = 0; i < numberOfWorkParts; i++) {
            config.push(CARRY);
        }
        for (let i = 0; i < numberOfWorkParts * 2; i++) {
            config.push(MOVE);
        }
        const name = role + Game.time.toString();
        if (this.spawnCreep(config, name, {
            memory: {
                role: role,
                home: homeRoomName,
                target: targetRoomName,
            }
        }) == OK) {
            return name;
        }
    };

StructureSpawn.prototype.CreateMeleeAttacker =
    function (target, energy) {
        const config: BodyPartConstant[] = [];
        const numberOfAttackParts = Math.floor(energy / 250);
        for (let i = 0; i < numberOfAttackParts * 2; i++) {
            config.push(TOUGH);
        }
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(ATTACK);
        }
        for (let i = 0; i < numberOfAttackParts * 3; i++) {
            config.push(MOVE)
        }
        const name = 'MeleeAttacker' + Game.time.toString();
        if (this.spawnCreep(config, name, {
            memory: {
                role: 'meleeAttacker',
                target: target,
            }
        }) == OK) {
            return name;
        }
    };

StructureSpawn.prototype.CreateRangedAttacker =
    function (target, energy) {
        const config: BodyPartConstant[] = [];
        const numberOfAttackParts = Math.floor((energy - 300) / 260);
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(TOUGH);
        }
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(RANGED_ATTACK);
        }
        for (let i = 0; i < numberOfAttackParts * 2 + 1; i++) {
            config.push(MOVE);
        }
        config.push(HEAL);
        const name = 'RangedAttacker' + Game.time.toString();
        if (this.spawnCreep(config, name, {
            memory: {
                role: 'rangedAttacker',
                target: target,
            }
        }) == OK) {
            return name;
        }
    };

StructureSpawn.prototype.CreateLinkStorageCommunicator = function () {
    const CarryParts = 1;
    const config: BodyPartConstant[] = [];
    for (let i = 0; i < CarryParts; i++) {
        config.push(CARRY);
    }
    config.push(MOVE)
    const name = 'LinkStorageCommunicator' + Game.time.toString();
    if (this.spawnCreep(config, name, {
        memory: {
            role: 'linkStorageCommunicator',
        }
    }) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateOutpostCreep = function (target, energy, role) {
    if (role == 'meleeAttacker') {
        return this.CreateMeleeAttacker(target, energy);
    } else if (role === 'rangedAttacker') {
        return this.CreateRangedAttacker(target, energy);
    } else if (role === 'healer') {
        return this.CreateHealer(target, energy);

    } else if (role === 'interRoomGarbageCollector') {
        return this.CreateInterRoomGarbageCollector(target, this.room.name, 1200);
    } else {
        if (role === 'reserver') {
            return this.CreateReserverOrControllerAttacker(target, role);
        } else {
            return this.CreateLongDistanceWorker(target, this.room.name, energy, role);
        }

    }
}

StructureSpawn.prototype.CreateHealer = function (targetRoomName: string, energy) {
    const config: BodyPartConstant[] = [];
    const numberOfHealParts = Math.floor(energy / 320);
    for (let i = 0; i < numberOfHealParts; i++) {
        config.push(TOUGH);
    }
    for (let i = 0; i < numberOfHealParts; i++) {
        config.push(HEAL);
    }
    for (let i = 0; i < numberOfHealParts * 2; i++) {
        config.push(MOVE);
    }
    const name = 'Healer' + Game.time.toString();
    if (this.spawnCreep(config, name, {
        memory: {
            role: 'healer',
            target: targetRoomName,
        }
    }) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateClaimer = function (target) {
    const config = [CLAIM, MOVE]
    const name = 'Claimer' + Game.time.toString();
    if (this.spawnCreep(config, name, {memory: {role: 'claimer', target: target}}) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateMineralHarvester = function (target, id, energy) {
    // create a balanced body as big as possible with the given energy
    let numberOfParts = Math.floor(energy / 200);
    // make sure the creep is not too big (more than 50 parts)
    numberOfParts = Math.min(numberOfParts, Math.floor(50 / 3));
    const body: BodyPartConstant[] = [];
    for (let i = 0; i < numberOfParts; i++) {
        body.push(WORK);
    }
    for (let i = 0; i < numberOfParts; i++) {
        body.push(CARRY);
    }
    for (let i = 0; i < numberOfParts; i++) {
        body.push(MOVE);
    }
    const name = 'MineralHarvester' + Game.time.toString();
    if (this.spawnCreep(body, name, {
        memory: {
            role: 'mineralHarvester',
            mineralType: target,
            sourceId: id,
        }
    }) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateCommunicator = function (role, flagName) {
    const config = [CARRY, CARRY, MOVE];

    const name = role + Game.time.toString();
    if (this.spawnCreep(config, name, {
        memory: {
            role: role,
            targetFlagName: flagName,
        }
    }) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateDismantler = function (energy, targetFlag) {
    const config: BodyPartConstant[] = [];
    const numberOfAttackParts = Math.floor(energy / 250);
    for (let i = 0; i < numberOfAttackParts * 2; i++) {
        config.push(WORK);
    }
    for (let i = 0; i < numberOfAttackParts; i++) {
        config.push(MOVE);
    }
    const name = 'Dismantler' + Game.time.toString();
    if (this.spawnCreep(config, name, {
        memory: {
            role: 'dismantler',
            targetFlagName: targetFlag,
        }
    }) == OK) {
        return name;
    }
}

StructureSpawn.prototype.CreateInterRoomGarbageCollector = function (targetRoomName, homeRoom, energy) {
    const config: BodyPartConstant[] = [];
    const numberOfCarryParts = Math.floor(energy / 100);
    for (let i = 0; i < numberOfCarryParts; i++) {
        config.push(CARRY);
    }
    for (let i = 0; i < numberOfCarryParts; i++) {
        config.push(MOVE);
    }
    const name = 'InterRoomGarbageCollector' + Game.time.toString();
    if (this.spawnCreep(config, name, {
        memory: {
            role: 'interRoomGarbageCollector',
            target: targetRoomName,
            home: homeRoom,
        }
    }) == OK) {
        return name;
    }
}