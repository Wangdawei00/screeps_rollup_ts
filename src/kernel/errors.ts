import {SourceMapConsumer} from "source-map";

let consumer: SourceMapConsumer | undefined;

export function formatError(error: unknown): string {
    const stack = error instanceof Error ? error.stack || error.message : String(error);
    // Simulation stacks have no uploaded bundle map.
    if (typeof Game !== "undefined" && Game.rooms.sim) return stack;
    if (!consumer) {
        try {
            consumer = new SourceMapConsumer(require("main.js.map"));
        } catch {
            return stack;
        }
    }
    return stack.replace(/main:(\d+):(\d+)/g, (frame, line: string, column: string) => {
        const position = consumer!.originalPositionFor({line: Number(line), column: Number(column) - 1});
        return position.source ? `${position.source}:${position.line}:${position.column}` : frame;
    });
}

export function reportError(context: string, error: unknown): void {
    console.log(`[${Game.time}] ${context}: ${formatError(error)}`);
}

export function errorMapper(loop: () => void): () => void {
    return () => {
        try {
            loop();
        } catch (error) {
            reportError("kernel:fatal", error);
        }
    };
}
