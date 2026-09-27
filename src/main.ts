import { errorMapper } from "./kernel/errors";
import { runKernel } from "./kernel/kernel";

export const loop = errorMapper(runKernel);
