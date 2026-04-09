import type { OpenClawConfig } from "../../config/config.js";
import type { DeliveryContext } from "../../utils/delivery-context.js";
import { type MediaGenerationTaskHandle } from "./media-generate-background-shared.js";
export type VideoGenerationTaskHandle = MediaGenerationTaskHandle;
export declare function createVideoGenerationTaskRun(params: {
    sessionKey?: string;
    requesterOrigin?: DeliveryContext;
    prompt: string;
    providerId?: string;
}): VideoGenerationTaskHandle | null;
export declare function recordVideoGenerationTaskProgress(params: {
    handle: VideoGenerationTaskHandle | null;
    progressSummary: string;
    eventSummary?: string;
}): void;
export declare function completeVideoGenerationTaskRun(params: {
    handle: VideoGenerationTaskHandle | null;
    provider: string;
    model: string;
    count: number;
    paths: string[];
}): void;
export declare function failVideoGenerationTaskRun(params: {
    handle: VideoGenerationTaskHandle | null;
    error: unknown;
}): void;
export declare function wakeVideoGenerationTaskCompletion(params: {
    config?: OpenClawConfig;
    handle: VideoGenerationTaskHandle | null;
    status: "ok" | "error";
    statusLabel: string;
    result: string;
    mediaUrls?: string[];
    statsLine?: string;
}): Promise<void>;
