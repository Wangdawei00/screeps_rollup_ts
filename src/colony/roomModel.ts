export interface RoomModel {
    room: Room;
    name: string;
    stage: ColonyStage;
    controller: StructureController | undefined;
    spawns: StructureSpawn[];
    extensions: StructureExtension[];
    towers: StructureTower[];
    links: StructureLink[];
    containers: StructureContainer[];
    labs: StructureLab[];
    sources: Source[];
    constructionSites: ConstructionSite[];
    hostiles: Creep[];
    creepsByRole: Map<CreepRole, Creep[]>;
    droppedResources: Resource[];
    energyAvailable: number;
    energyCapacity: number;
    storageEnergy: number;
}

function determineColonyStage(roomModel: RoomModel): ColonyStage {
    // const previousStage = Memory.colonies[room.name]?.stage;

    // Determine the colony stage bootstrap
    let bootstrapEnergyAvailable = 0;
    const creep_miners = roomModel.creepsByRole.get("miner");
    if (creep_miners) {
        for (const miner of creep_miners) {
            if (miner.memory.assignment?.type === "source") {
                if (miner.spawning) {
                    bootstrapEnergyAvailable += miner.body.filter(
                        part => part.type === WORK).length * 3000;
                } else {
                    bootstrapEnergyAvailable += miner.body.filter(
                        part => part.type === WORK).length * 2 * miner.ticksToLive!;
                }
            }
        }
    }

    const creep_transporters = roomModel.creepsByRole.get("transporter");
}

export function createRoomModel(room: Room) {
    const colonyMemory = Memory.colonies[room.name];
    const result: RoomModel = {
        room: room,
        name: room.name,
        stage: "unknown",
        controller: room.controller,
        spawns: colonyMemory.spawns.flatMap(
            id => {
                const spawn = Game.getObjectById(id);
                if (!spawn) {
                    colonyMemory.spawns = colonyMemory.spawns.filter(item => item !== id);
                }
                return spawn ? spawn : [];
            }),
        extensions: colonyMemory.extensions.flatMap(
            id => {
                const extension = Game.getObjectById(id);
                if (!extension) {
                    colonyMemory.extensions = colonyMemory.extensions.filter(item => item !== id);
                }
                return extension ? extension : [];
            }),
        towers: colonyMemory.towers.flatMap(
            id => {
                const tower = Game.getObjectById(id);
                if (!tower) {
                    colonyMemory.towers = colonyMemory.towers.filter(item => item !== id);
                }
                return tower ? tower : [];
            }),
        links: colonyMemory.links.flatMap(
            id => {
                const link = Game.getObjectById(id);
                if (!link) {
                    colonyMemory.links = colonyMemory.links.filter(item => item !== id);
                }
                return link ? link : [];
            }),
        containers: colonyMemory.containers.flatMap(
            id => {
                const container = Game.getObjectById(id);
                if (!container) {
                    colonyMemory.containers = colonyMemory.containers.filter(item => item !== id);
                }
                return container ? container : [];
            }),
        labs: colonyMemory.labs.flatMap(
            id => {
                const lab = Game.getObjectById(id);
                if (!lab) {
                    colonyMemory.labs = colonyMemory.labs.filter(item => item !== id);
                }
                return lab ? lab : [];
            }),
        sources: colonyMemory.sources.flatMap(
            id => {
                const source = Game.getObjectById(id);
                if (!source) {
                    colonyMemory.sources = colonyMemory.sources.filter(item => item !== id);
                }
                return source ? source : [];
            }),
        constructionSites: colonyMemory.constructionSites.flatMap(
            id => {
                const site = Game.getObjectById(id);
                if (!site) {
                    colonyMemory.constructionSites = colonyMemory.constructionSites.filter(item => item !== id);
                }
                return site ? site : [];
            }),
        hostiles: room.find(FIND_HOSTILE_CREEPS),
        creepsByRole: new Map<CreepRole, Creep[]>(),
        energyAvailable: room.energyAvailable,
        energyCapacity: room.energyCapacityAvailable,
        storageEnergy: room.storage ? room.storage.store[RESOURCE_ENERGY] : 0,
    }
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.memory.homeRoom === room.name) {
            if (!result.creepsByRole.has(creep.memory.role)) {
                result.creepsByRole.set(creep.memory.role, []);
            }
            result.creepsByRole.get(creep.memory.role)?.push(creep);
        }
    }
    return result;
}