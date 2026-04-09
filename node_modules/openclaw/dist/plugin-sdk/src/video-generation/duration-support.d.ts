import type { VideoGenerationProvider } from "./types.js";
export declare function resolveVideoGenerationSupportedDurations(params: {
    provider?: VideoGenerationProvider;
    model?: string;
}): number[] | undefined;
export declare function normalizeVideoGenerationDuration(params: {
    provider?: VideoGenerationProvider;
    model?: string;
    durationSeconds?: number;
}): number | undefined;
