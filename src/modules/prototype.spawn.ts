const listOfRoles = ['lorry', 'harvester', 'upgrader', 'builder', 'repairer', 'reserver',
    "longDistanceHarvester", "garbageCollector", "meleeAttacker", "rangedAttacker","controllerAttacker"];

StructureSpawn.prototype.SpawnCreepsIfNecessary =
    function () {
        const invasionRooms: string[] = ["E54S53"]
        const minCreeps: Record<string, number> = {
            harvester: 0,
            upgrader: 0,
            builder: this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? 4 : 0,
            repairer: 1,
            lorry: this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? 2 : 7,
            reserver: 0,
            longDistanceHarvester: 6,
            garbageCollector: 1,
            meleeAttacker: invasionRooms.length > 0 ? 1 : 0,
            rangedAttacker: invasionRooms.length > 0 ? 0 : 0,
            controllerAttacker: invasionRooms.length > 0 ? 1 : 0,
        }
        const room = this.room;
        // find all creeps in room
        let creepsInRoom = room.find(FIND_MY_CREEPS);

        // count the number of creeps alive for each role in this room
        // _.sum will count the number of properties in Game.creeps filtered by the
        //  arrow function, which checks for the creep being a specific role
        /** @type {Object.<string, number>} */
        let numberOfCreeps: Record<string, number> = {};
        for (const role of listOfRoles) {
            if (role === 'reserver' || role === 'longDistanceHarvester' || role === 'meleeAttacker' || role === 'rangedAttacker'|| role === 'controllerAttacker') {
                numberOfCreeps[role] = _.sum(Game.creeps, c => c.memory.role === role ? 1 : 0);
            } else {
                numberOfCreeps[role] = _.sum(creepsInRoom, c => c.memory.role === role ? 1 : 0);
            }
        }
        let maxEnergy = room.energyCapacityAvailable;
        let name = undefined;

        // if no harvesters are left AND either no miners or no lorries are left
        //  create a backup creep
        if (numberOfCreeps['harvester'] == 0 && numberOfCreeps['lorry'] == 0) {
            // if there are still miners or enough energy in Storage left
            if (numberOfCreeps['miner'] > 0 || (room.storage != undefined &&
                room.storage.store[RESOURCE_ENERGY] >= 150 + 550)) {
                // create a lorry
                name = this.CreateLorryOrGarbageCollector(300, "lorry");
            }
            // if there is no miner and not enough energy in Storage left
            else {
                // create a harvester because it can work on its own
                name = this.CreateCustomCreep(room.energyAvailable, 'harvester');
            }
        }
        // if no backup creep is required
        else {
            // check if all sources have miners
            let sources = room.find(FIND_SOURCES);
            // iterate over all sources
            for (let source of sources) {
                // if the source has no miner
                if (!_.some(creepsInRoom, c => c.memory.role == 'miner' && c.memory.sourceId == source.id)) {
                    // check whether the source has a container
                    let containers: StructureContainer[] = source.pos.findInRange(FIND_STRUCTURES, 1, {
                        filter: s => s.structureType == STRUCTURE_CONTAINER
                    });
                    // if there is a container next to the source
                    if (containers.length > 0) {
                        // spawn a miner
                        name = this.CreateMiner(source.id);
                        break;
                    }
                }
            }
        }

        // if none of the above caused a spawn command check for other roles
        if (name == undefined) {
            // check for advanced upgraders
            const advancedUpgraderFlagNames = ["UpgraderPosition1", "UpgraderPosition2", "ControllerRoadEndpoint"];
            for (const flagName of advancedUpgraderFlagNames) {
                if (!_.some(creepsInRoom, c => c.memory.role == 'advancedUpgrader' && c.memory.upgradePosFlagName == flagName)) {
                    name = this.CreateAdvancedUpgrader(flagName);
                    break;
                }
            }
        }
        if (name == undefined) {
            for (let role of listOfRoles) {
                // check for claim order
                // if (role == 'claimer' && this.memory.claimRoom != undefined) {
                //     // try to spawn a claimer
                //     name = this.createClaimer(this.memory.claimRoom);
                //     // if that worked
                //     if (name != undefined && _.isString(name)) {
                //         // delete the claim order
                //         delete this.memory.claimRoom;
                //     }
                // }
                // if no claim order was found, check other roles
                if (numberOfCreeps[role] < minCreeps[role]) {
                    if (role == 'lorry'|| role == 'garbageCollector') {
                        name = this.CreateLorryOrGarbageCollector(300, role);
                    } else if (role === 'reserver') {
                        name = this.CreateReserverOrControllerAttacker('E57S53', role);
                    } else if (role === 'longDistanceHarvester') {
                        if (Memory.lastLongDistanceTargetRoomName && Memory.lastLongDistanceTargetRoomName === 'E56S53') {
                            Memory.lastLongDistanceTargetRoomName = 'E57S53';
                        } else {
                            Memory.lastLongDistanceTargetRoomName = 'E56S53';
                        }
                        name = this.CreateLongDistanceHarvester(Memory.lastLongDistanceTargetRoomName, 'E55S53', maxEnergy);
                    } else if (role === 'meleeAttacker' && invasionRooms.length > 0) {
                        name = this.CreateMeleeAttacker(invasionRooms[0], maxEnergy);
                    } else if (role === 'rangedAttacker' && invasionRooms.length > 0) {
                        name = this.CreateRangedAttacker(invasionRooms[0], maxEnergy);
                    } else if (role === 'controllerAttacker' && invasionRooms.length > 0) {
                        name = this.CreateReserverOrControllerAttacker(invasionRooms[0], role);
                    } else {
                        name = this.CreateCustomCreep(maxEnergy, role);
                    }
                    break;
                }
            }
        }

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


StructureSpawn.prototype.CreateMiner =
    function (sourceId: Id<Source>) {
        const name = 'Miner' + Game.time.toString()
        const source = Game.getObjectById(sourceId);
        if (source !== null) {
            const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType == STRUCTURE_CONTAINER
            })
            if (containers.length > 0) {
                const containerId = containers[0].id;
                this.spawnCreep([WORK, WORK, WORK, WORK, WORK, MOVE], name, {
                    memory: {
                        role: 'miner',
                        sourceId: sourceId,
                        containerId: <Id<StructureContainer>>containerId
                    }
                });
                return name;
            }
        }
    };


StructureSpawn.prototype.CreateLorryOrGarbageCollector =
    function (energy: number, role: string = "lorry") {
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
        this.spawnCreep(body, name, {memory: {role: role, working: false}});
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
    this.spawnCreep(body, name, {memory: {role: roleName, working: false}});
    return name;
}

StructureSpawn.prototype.CreateAdvancedUpgrader = function (flagName: string) {
    const config = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    const name = 'AdvancedUpgrader' + Game.time.toString();
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

StructureSpawn.prototype.CreateLongDistanceHarvester =
    function (targetRoomName: string, homeRoomName: string, energy: number) {
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
        const name = 'LongDistanceHarvester' + Game.time.toString();
        if (this.spawnCreep(config, name, {
            memory: {
                role: 'longDistanceHarvester',
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
            config.push(MOVE);
        }
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(ATTACK);
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
        const numberOfAttackParts = Math.floor(energy / 260);
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(TOUGH);
            config.push(MOVE);
        }
        for (let i = 0; i < numberOfAttackParts; i++) {
            config.push(RANGED_ATTACK);
            config.push(MOVE)
        }
        const name = 'RangedAttacker' + Game.time.toString();
        if (this.spawnCreep(config, name, {
            memory: {
                role: 'rangedAttacker',
                target: target,
            }
        }) == OK) {
            return name;
        }
    }