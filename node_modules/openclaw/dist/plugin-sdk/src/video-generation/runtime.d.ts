import type { AuthProfileStore } from "../agents/auth-profiles.js";
import type { FallbackAttempt } from "../agents/model-fallback.types.js";
import type { OpenClawConfig } from "../config/config.js";
import type { GeneratedVideoAsset, VideoGenerationIgnoredOverride, VideoGenerationResolution, VideoGenerationSourceAsset } from "./types.js";
export type GenerateVideoParams = {
    cfg: OpenClawConfig;
    prompt: string;
    agentDir?: string;
    authStore?: AuthProfileStore;
    modelOverride?: string;
    size?: string;
    aspectRatio?: string;
    resolution?: VideoGenerationResolution;
    durationSeconds?: number;
    audio?: boolean;
    watermark?: boolean;
    inputImages?: VideoGenerationSourceAsset[];
    inputVideos?: VideoGenerationSourceAsset[];
};
export type GenerateVideoRuntimeResult = {
    videos: GeneratedVideoAsset[];
    provider: string;
    model: string;
    attempts: FallbackAttempt[];
    metadata?: Record<string, unknown>;
    ignoredOverrides: VideoGenerationIgnoredOverride[];
};
export declare function listRuntimeVideoGenerationProviders(params?: {
    config?: OpenClawConfig;
}): import("./types.js").VideoGenerationProvider[];
export declare function generateVideo(params: GenerateVideoParams): Promise<GenerateVideoRuntimeResult>;
