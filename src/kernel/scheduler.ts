import type {ScheduledProcess} from "@/domain/types";
import {reportError} from "@/kernel/errors";

export function runIsolated(name: string, run: () => void): void {
    try {
        run();
    } catch (error) {
        reportError(name, error);
    }
}

export class Scheduler {
    private readonly processes = new Map<string, ScheduledProcess>();

    register(process: ScheduledProcess): void {
        if (this.processes.has(process.name)) throw new Error(`Duplicate process: ${process.name}`);
        if (!Number.isInteger(process.interval) || process.interval < 1) {
            throw new Error(`Invalid interval for ${process.name}: ${process.interval}`);
        }
        this.processes.set(process.name, process);
    }

    run(): void {
        const order = {critical: 0, normal: 1, low: 2};
        const processes = Array.from(this.processes.values()).sort((a, b) => order[a.priority] - order[b.priority]);
        for (const process of processes) {
            if (Game.time % process.interval !== 0) continue;
            runIsolated(process.name, () => {
                if (!process.condition || process.condition()) process.run();
            });
        }
    }
}
