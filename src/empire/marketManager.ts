import policy from "@/config/policy";
import type {RoomModel} from "@/colony/roomModel";
import {healthyOrigin} from "@/empire/remoteManager";
import {available, outgoing, prepare, stock} from "@/empire/resources";

function transferAmount(model: RoomModel, destination: string, resource: ResourceConstant, requested: number,
                        buying = false): number {
    const terminal = model.terminal!;
    let low = 0;
    let high = Math.max(0, Math.floor(Math.min(requested, buying ? terminal.store.getFreeCapacity(resource) :
        Math.min(available(model, resource), (terminal.store[resource] || 0) - outgoing(model, terminal.id, resource)))));
    const energy = Math.min(available(model, RESOURCE_ENERGY),
        terminal.store[RESOURCE_ENERGY] - policy.terminalEnergyReserve - outgoing(model, terminal.id, RESOURCE_ENERGY));
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        const cost = Game.market.calcTransactionCost(middle, model.name, destination);
        if (cost + (!buying && resource === RESOURCE_ENERGY ? middle : 0) <= energy) low = middle;
        else high = middle - 1;
    }
    return low;
}

function netPrice(model: RoomModel, order: Order, amount: number, buying: boolean): number {
    const energy = Game.market.calcTransactionCost(amount, model.name, order.roomName!);
    return order.price + (buying ? 1 : -1) * energy * policy.marketEnergyPrice / amount;
}

export function runMarket(models: ReadonlyMap<string, RoomModel>): void {
    const memory = Memory.empire.market;
    for (const [key, order] of Object.entries(memory.orders)) if (order.expiresAt <= Game.time) delete memory.orders[key];
    memory.terminalGoals = [];
    const rooms = [...models.values()].filter(model => healthyOrigin(model) && model.terminal?.my && model.terminal.isActive())
        .sort((a, b) => a.name.localeCompare(b.name));
    const goal = (model: RoomModel, resource: ResourceConstant, amount: number): void => {
        const existing = memory.terminalGoals.find(item => item.roomName === model.name && item.resource === resource);
        if (existing) existing.amount = Math.max(existing.amount, amount);
        else memory.terminalGoals.push({roomName: model.name, resource, amount});
        prepare(model, model.terminal!, resource, amount, 40, false);
    };
    for (const model of rooms) goal(model, RESOURCE_ENERGY, policy.terminalEnergyReserve + policy.productionBatch);
    if (!policy.marketEnabled) return;
    const used = new Set<string>();
    const incoming = new Map<string, number>();
    const incomingResource = new Map<string, number>();
    let credits = Game.market.credits;
    for (const donor of rooms) {
        if (donor.terminal!.cooldown || used.has(donor.name)) continue;
        const resources = [...new Set<ResourceConstant>([
            RESOURCE_ENERGY, ...Object.keys(donor.storage!.store) as ResourceConstant[],
            ...Object.keys(donor.terminal!.store) as ResourceConstant[]
        ])];
        for (const resource of resources) {
            const surplus = resource === RESOURCE_ENERGY ? policy.expansionEnergyThreshold + policy.terminalEnergyReserve : policy.mineralSurplus;
            if (stock(donor, resource) <= surplus || available(donor, resource) <= 0) continue;
            const recipient = rooms.find(other => other.name !== donor.name &&
                stock(other, resource) + (incomingResource.get(`${other.name}:${resource}`) || 0) < (resource === RESOURCE_ENERGY ?
                    policy.storageEnergyReserve + policy.terminalEnergyReserve + policy.upgradeEnergySurplus : policy.mineralShortage) &&
                other.terminal!.store.getFreeCapacity() - (incoming.get(other.name) || 0) > 0);
            if (!recipient) continue;
            const shortage = (resource === RESOURCE_ENERGY ?
                    policy.storageEnergyReserve + policy.terminalEnergyReserve + policy.upgradeEnergySurplus : policy.mineralRetain) -
                stock(recipient, resource) - (incomingResource.get(`${recipient.name}:${resource}`) || 0);
            const desired = Math.min(policy.productionBatch, available(donor, resource), shortage,
                recipient.terminal!.store.getFreeCapacity() - (incoming.get(recipient.name) || 0));
            goal(donor, resource, desired + (resource === RESOURCE_ENERGY ? policy.terminalEnergyReserve : 0));
            const amount = transferAmount(donor, recipient.name, resource, desired);
            if (amount <= 0) continue;
            if (donor.terminal!.send(resource, amount, recipient.name, "Empire balance") === OK) {
                used.add(donor.name);
                incoming.set(recipient.name, (incoming.get(recipient.name) || 0) + amount);
                incomingResource.set(`${recipient.name}:${resource}`, (incomingResource.get(`${recipient.name}:${resource}`) || 0) + amount);
                break;
            }
        }
    }
    const analyse = Game.cpu.bucket >= policy.minimumCpuBucket &&
        (memory.lastAnalysis === 0 || Game.time - memory.lastAnalysis >= 100);
    if (analyse) memory.lastAnalysis = Game.time;
    const minerals: ResourceConstant[] = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM,
        RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST];
    for (const model of rooms) {
        const terminal = model.terminal!;
        if (used.has(model.name) || terminal.cooldown) continue;
        const resources = [...new Set([...Object.keys(model.storage!.store), ...Object.keys(terminal.store), ...minerals])]
            .filter(resource => resource !== RESOURCE_ENERGY && resource !== RESOURCE_POWER) as ResourceConstant[];
        let scans = 0;
        for (const resource of resources) {
            const quantity = stock(model, resource) + (incomingResource.get(`${model.name}:${resource}`) || 0);
            const selling = quantity > policy.mineralSurplus && available(model, resource) > 0;
            const buying = !selling && minerals.includes(resource) && quantity < policy.mineralShortage &&
                credits > policy.marketMinimumCredits;
            if (!selling && !buying) continue;
            const key = `${buying ? "buy" : "sell"}:${model.name}:${resource}`;
            const desired = Math.min(policy.productionBatch, buying ? policy.mineralRetain - quantity : available(model, resource));
            if (selling) goal(model, resource, desired);
            if (analyse && scans < 3) {
                scans++;
                const orders = Game.market.getAllOrders({type: buying ? ORDER_SELL : ORDER_BUY, resourceType: resource})
                    .filter(order => order.remainingAmount > 0 && !!order.roomName && !Game.market.orders[order.id]);
                const scored = orders.map(order => {
                    const amount = Math.min(desired, order.remainingAmount);
                    return {order, price: netPrice(model, order, amount, buying)};
                }).filter(item => Number.isFinite(item.price) && (buying ?
                    item.price <= policy.marketMaximumBuyPrice : item.price >= policy.marketMinimumSellPrice));
                scored.sort((a, b) => (buying ? a.price - b.price : b.price - a.price) || a.order.id.localeCompare(b.order.id));
                if (scored[0]) memory.orders[key] = {
                    id: scored[0].order.id,
                    price: scored[0].price,
                    expiresAt: Game.time + 100
                };
                else delete memory.orders[key];
            }
            const cached = memory.orders[key];
            if (!cached || cached.expiresAt <= Game.time) continue;
            const order = Game.market.getOrderById(cached.id);
            if (!order || !order.roomName || order.resourceType !== resource || order.type !== (buying ? ORDER_SELL : ORDER_BUY) ||
                order.remainingAmount <= 0 || Game.market.orders[order.id]) {
                delete memory.orders[key];
                continue;
            }
            let requested = Math.min(desired, order.remainingAmount);
            if (buying) requested = Math.min(requested, Math.floor((credits - policy.marketMinimumCredits) / order.price),
                terminal.store.getFreeCapacity() - (incoming.get(model.name) || 0));
            const amount = transferAmount(model, order.roomName, resource, requested, buying);
            if (amount <= 0) continue;
            const price = netPrice(model, order, amount, buying);
            if (buying ? price > policy.marketMaximumBuyPrice : price < policy.marketMinimumSellPrice) continue;
            const result = Game.market.deal(order.id, amount, model.name);
            if (result === OK) {
                if (buying) credits -= amount * order.price;
                used.add(model.name);
                delete memory.orders[key];
                break;
            }
            if (result === ERR_INVALID_ARGS || result === ERR_NOT_FOUND) delete memory.orders[key];
        }
    }
}