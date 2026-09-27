import policy from "../config/policy";
import type { RoomModel } from "../colony/roomModel";
import { reactionReagents, selectReactionLabs } from "../colony/structureManager";
import { healthyOrigin } from "./remoteManager";
import { available, drain, prepare, stock } from "./resources";
import { buildMiner } from "../planning/bodyBuilder";
import { serializePosition } from "../domain/types";
import type { CreepDemand } from "../domain/types";

const evaluated = new Map<string, number>();

function feasibleCompound(model: RoomModel, compound: MineralCompoundConstant): boolean {
    const reagents = reactionReagents(compound);
    return stock(model, compound) < policy.mineralRetain && !!selectReactionLabs(model.labs, compound) &&
        !!reagents && reagents.every(resource => stock(model, resource) >= policy.mineralRetain + LAB_REACTION_AMOUNT);
}

function feasibleFactory(model: RoomModel, resource: CommodityConstant): boolean {
    const recipe = COMMODITIES[resource];
    return !!recipe && !recipe.level && String(resource) !== RESOURCE_ENERGY &&
        stock(model, resource) < policy.mineralRetain && model.factories.some(factory => factory.my && factory.isActive() && !factory.level) &&
        Object.entries(recipe.components).every(([key, amount]) => {
            const component = key as ResourceConstant;
            return available(model, component, false) +
                model.factories.reduce((sum, factory) => sum + (factory.store[component] || 0), 0) >= amount!;
        });
}

export function runProduction(models: ReadonlyMap<string, RoomModel>): CreepDemand[] {
    const demands: CreepDemand[] = [];
    for (const name of Object.keys(Memory.empire.production)) if (!models.has(name)) delete Memory.empire.production[name];
    for (const model of models.values()) {
        let goal = Memory.empire.production[model.name] ||= {};
        if (!policy.productionEnabled || !healthyOrigin(model) || model.storageEnergy <= policy.storageEnergyReserve) {
            Memory.empire.production[model.name] = {};
            const productionIds = new Set<string>([...model.labs, ...model.factories].map(structure => structure.id));
            for (const [id, job] of Object.entries(Memory.colonies[model.name].logisticsJobs)) {
                if (productionIds.has(job.delivery.id) && !job.lease) delete Memory.colonies[model.name].logisticsJobs[id];
            }
            continue;
        }
        for (const mineral of model.minerals) {
            const extractor = model.structures.find((structure): structure is StructureExtractor =>
                structure.structureType === STRUCTURE_EXTRACTOR && structure.my &&
                structure.pos.isEqualTo(mineral.pos) && structure.isActive());
            const container = model.containers.find(structure => structure.pos.isNearTo(mineral.pos));
            const body = buildMiner(Math.min(model.energyCapacity, 1000));
            if (extractor && container && mineral.mineralAmount > 0 && stock(model, mineral.mineralType) < policy.mineralSurplus &&
                model.storage!.store.getFreeCapacity() >= policy.productionBatch && body.length) {
                demands.push({
                    key: `expansion:mineral:${mineral.id}`, role: "mineralMiner", homeRoom: model.name, priority: 15, body,
                    assignment: { type: "mineral", mineralId: mineral.id, containerId: container.id,
                        workPosition: serializePosition(container.pos) }, travelEstimate: 30
                });
            }
        }
        if (goal.compound && !feasibleCompound(model, goal.compound)) goal.compound = undefined;
        if (goal.factoryResource && !feasibleFactory(model, goal.factoryResource)) goal.factoryResource = undefined;
        if ((!evaluated.has(model.name) || Game.time - evaluated.get(model.name)! >= 100) && Game.cpu.bucket >= policy.minimumCpuBucket) {
            evaluated.set(model.name, Game.time);
            if (!goal.compound && model.labs.length >= 3) {
                const compounds = [...new Set(Object.values(REACTIONS).flatMap(values => Object.values(values)))]
                    .sort() as MineralCompoundConstant[];
                goal.compound = compounds.find(compound => feasibleCompound(model, compound) &&
                    reactionReagents(compound)!.every(resource => available(model, resource, false) >= policy.productionBatch));
            }
            if (!goal.factoryResource) goal.factoryResource = (Object.keys(COMMODITIES).sort() as CommodityConstant[])
                .find(resource => feasibleFactory(model, resource));
        }
        goal = Memory.empire.production[model.name];
        const cluster = goal.compound ? selectReactionLabs(model.labs, goal.compound) : undefined;
        for (const lab of model.labs) {
            const expected = cluster && (lab.id === cluster.inputA.id ? cluster.reagentA :
                lab.id === cluster.inputB.id ? cluster.reagentB : cluster.outputs.includes(lab) ? goal.compound : undefined);
            if (lab.mineralType && (!expected || lab.mineralType !== expected ||
                (cluster?.outputs.includes(lab) && lab.store[lab.mineralType] >= Math.min(policy.productionBatch, LAB_MINERAL_CAPACITY / 2)))) {
                drain(model, lab, lab.mineralType, lab.store[lab.mineralType]);
            }
        }
        if (cluster) {
            prepare(model, cluster.inputA, cluster.reagentA, Math.min(policy.productionBatch, LAB_MINERAL_CAPACITY));
            prepare(model, cluster.inputB, cluster.reagentB, Math.min(policy.productionBatch, LAB_MINERAL_CAPACITY));
        }
        for (const factory of model.factories) {
            const recipe = goal.factoryResource ? COMMODITIES[goal.factoryResource] : undefined;
            for (const resource of Object.keys(factory.store) as ResourceConstant[]) {
                if (!(recipe?.components as Partial<Record<ResourceConstant, number>> | undefined)?.[resource]) {
                    drain(model, factory, resource, factory.store[resource]);
                }
            }
            if (recipe && !factory.level) for (const [resource, amount] of Object.entries(recipe.components)) {
                prepare(model, factory, resource as ResourceConstant, amount!);
            }
        }
    }
    return demands;
}
