const listOfRoles = ['lorry', 'harvester', 'upgrader', 'builder', 'repairer'];

StructureSpawn.prototype.SpawnCreepsIfNecessary =
    function () {
        const minCreeps: Record<string, number> = {
            harvester: 1,
            upgrader: 0,
            builder: 4,
            repairer: 2,
            lorry: 8,
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
            numberOfCreeps[role] = _.sum(creepsInRoom, c => c.memory.role === role ? 1 : 0);
            // numberOfCreeps[role] = _.sum(creepsInRoom, (c) => c.memory.role == role);
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
                name = this.CreateLorry(150);
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
                const flag = Game.flags[flagName];
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
                    if (role == 'lorry') {
                        name = this.CreateLorry(150);
                    } else {
                        name = this.CreateCustomCreep(maxEnergy, role);
                    }
                    break;
                }
            }
        }

        // // if none of the above caused a spawn command check for LongDistanceHarvesters
        // /** @type {Object.<string, number>} */
        // let numberOfLongDistanceHarvesters :Record<any, any>= {};
        // if (name == undefined) {
        //     // count the number of long distance harvesters globally
        //     for (let roomName in this.memory.minLongDistanceHarvesters) {
        //         numberOfLongDistanceHarvesters[roomName] = _.sum(Game.creeps, (c) =>
        //             c.memory.role == 'longDistanceHarvester' && c.memory.target == roomName)
        //
        //         if (numberOfLongDistanceHarvesters[roomName] < this.memory.minLongDistanceHarvesters[roomName]) {
        //             name = this.createLongDistanceHarvester(maxEnergy, 2, room.name, roomName, 0);
        //         }
        //     }
        // }

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


StructureSpawn.prototype.CreateLorry =
    function (energy: number) {
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
        const name = 'Lorry' + Game.time.toString();
        this.spawnCreep(body, name, {memory: {role: 'lorry', working: false}});
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
    const config = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]
    const name = 'AdvancedUpgrader' + Game.time.toString();
    if (this.spawnCreep(config, name, {memory: {role: 'advancedUpgrader', upgradePosFlagName: flagName}}) == OK) {
        return name;
    }
}