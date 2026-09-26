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
    ruins: Ruin[];
    tombstones: Tombstone[];
    energyAvailable: number;
    energyCapacity: number;
    storageEnergy: number;

}

function determineColonyStage(roomModel: RoomModel) {
    // Determine the colony stage bootstrap
    let bootstrapEnergyAvailable = 0;
    const rcl = roomModel.controller?.level ?? 0;
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
    if (roomModel.spawns.length === 0) { // This is either a new colony or a remote room. skip
        return
    }

    const creep_transporters = roomModel.creepsByRole.get("transporter");
}

function initializeRoomMemory(room: Room) {
    room.memory.spawns ??= [];
    room.memory.extensions ??= [];
    room.memory.towers ??= [];
    room.memory.links ??= [];
    room.memory.containers ??= [];
    room.memory.labs ??= [];
    room.memory.sources ??= [];
    room.memory.constructionSites ??= [];

}

export function createRoomModel(room: Room) {
    initializeRoomMemory(room);
    const roomMemory = room.memory

    const result: RoomModel = {
        room: room,
        name: room.name,
        stage: "unknown",
        controller: room.controller,
        spawns: roomMemory.spawns.flatMap(
            id => {
                const spawn = Game.getObjectById(id);
                if (!spawn) {
                    roomMemory.spawns = roomMemory.spawns.filter(item => item !== id);
                }
                return spawn ? spawn : [];
            }),
        extensions: roomMemory.extensions.flatMap(
            id => {
                const extension = Game.getObjectById(id);
                if (!extension) {
                    roomMemory.extensions = roomMemory.extensions.filter(item => item !== id);
                }
                return extension ? extension : [];
            }),
        towers: roomMemory.towers.flatMap(
            id => {
                const tower = Game.getObjectById(id);
                if (!tower) {
                    roomMemory.towers = roomMemory.towers.filter(item => item !== id);
                }
                return tower ? tower : [];
            }),
        links: roomMemory.links.flatMap(
            id => {
                const link = Game.getObjectById(id);
                if (!link) {
                    roomMemory.links = roomMemory.links.filter(item => item !== id);
                }
                return link ? link : [];
            }),
        containers: roomMemory.containers.flatMap(
            id => {
                const container = Game.getObjectById(id);
                if (!container) {
                    roomMemory.containers = roomMemory.containers.filter(item => item !== id);
                }
                return container ? container : [];
            }),
        labs: roomMemory.labs.flatMap(
            id => {
                const lab = Game.getObjectById(id);
                if (!lab) {
                    roomMemory.labs = roomMemory.labs.filter(item => item !== id);
                }
                return lab ? lab : [];
            }),
        sources: roomMemory.sources.flatMap(
            id => {
                const source = Game.getObjectById(id);
                if (!source) {
                    roomMemory.sources = roomMemory.sources.filter(item => item !== id);
                }
                return source ? source : [];
            }),
        constructionSites: roomMemory.constructionSites.flatMap(
            id => {
                const site = Game.getObjectById(id);
                if (!site) {
                    roomMemory.constructionSites = roomMemory.constructionSites.filter(item => item !== id);
                }
                return site ? site : [];
            }),
        hostiles: room.find(FIND_HOSTILE_CREEPS),
        tombstones: room.find(FIND_TOMBSTONES),
        ruins: room.find(FIND_RUINS),
        droppedResources: room.find(FIND_DROPPED_RESOURCES),
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