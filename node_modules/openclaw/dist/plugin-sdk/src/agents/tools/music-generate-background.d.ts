import type { OpenClawConfig } from "../../config/config.js";
import type { DeliveryContext } from "../../utils/delivery-context.js";
import { type MediaGenerationTaskHandle } from "./media-generate-background-shared.js";
export type MusicGenerationTaskHandle = MediaGenerationTaskHandle;
export declare function createMusicGenerationTaskRun(params: {
    sessionKey?: string;
    requesterOrigin?: DeliveryContext;
    prompt: string;
    providerId?: string;
}): MusicGenerationTaskHandle | null;
export declare function recordMusicGenerationTaskProgress(params: {
    handle: MusicGenerationTaskHandle | null;
    progressSummary: string;
    eventSummary?: string;
}): void;
export declare function completeMusicGenerationTaskRun(params: {
    handle: MusicGenerationTaskHandle | null;
    provider: string;
    model: string;
    count: number;
    paths: string[];
}): void;
export declare function failMusicGenerationTaskRun(params: {
    handle: MusicGenerationTaskHandle | null;
    error: unknown;
}): void;
export declare function wakeMusicGenerationTaskCompletion(params: {
    config?: OpenClawConfig;
    handle: MusicGenerationTaskHandle | null;
    status: "ok" | "error";
    statusLabel: string;
    result: string;
    mediaUrls?: string[];
    statsLine?: string;
}): Promise<void>;
