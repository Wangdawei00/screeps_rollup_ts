import {errorMapper} from './modules/errorMapper'
import {runKernel} from "@/kernel/kernel";

export const loop = errorMapper(runKernel);
