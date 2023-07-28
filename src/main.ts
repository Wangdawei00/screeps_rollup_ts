import "./modules/prototype.creep"
module.exports.loop = function () {

    const standardConfigForSpawn = [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    const harvesterNum = 3;
    const upgraderNum = 4;
    const builderNum = 4;
    const repairerNum = 2;
    // BuildRoad(Game.spawns["Spawn1"].room, Game.spawns["Spawn1"].pos, Game.flags['FarHarvest'].pos);
    // BuildRoad(Game.spawns["Spawn1"].room, Game.spawns["Spawn1"].pos, Game.flags['ControllerRoadEndpoint'].pos);
    let newName;
    let name;
    for (name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'harvester');
    const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader');
    const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder');
    const repairers = _.filter(Game.creeps, (creep) => creep.memory.role === 'repairer');
    if (harvesters.length < harvesterNum) {
        newName = 'Harvester' + Game.time;
        Game.spawns['Spawn1'].spawnCreep(standardConfigForSpawn, newName,
            {memory: {role: 'harvester'}});
    }

    if (harvesters.length === harvesterNum && upgraders.length < upgraderNum) {
        newName = 'Upgrader' + Game.time;
        console.log('Spawning new upgrader: ' + newName);
        Game.spawns['Spawn1'].spawnCreep(standardConfigForSpawn, newName,
            {memory: {role: 'upgrader'}});
    }
    if (harvesters.length === harvesterNum && upgraders.length === upgraderNum && builders.length < builderNum) {
        newName = 'Builder' + Game.time;
        console.log('Spawning new builder: ' + newName);
        Game.spawns['Spawn1'].spawnCreep(standardConfigForSpawn, newName,
            {memory: {role: 'builder'}});
    }
    if (harvesters.length === harvesterNum && upgraders.length === upgraderNum && builders.length === builderNum
        && repairers.length < repairerNum) {
        newName = 'Repairer' + Game.time;
        Game.spawns.Spawn1.spawnCreep(standardConfigForSpawn, newName,
            {memory: {role: 'repairer'}});
    }
    if (Game.spawns['Spawn1'].spawning) {
        const spawningCreep = Game.creeps[Game.spawns['Spawn1'].spawning.name];
        Game.spawns['Spawn1'].room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            Game.spawns['Spawn1'].pos.x + 1,
            Game.spawns['Spawn1'].pos.y,
            {align: 'left', opacity: 0.8});
    }

    for (name in Game.creeps) {
        const creep = Game.creeps[name];
        creep.runRole();
    }
}