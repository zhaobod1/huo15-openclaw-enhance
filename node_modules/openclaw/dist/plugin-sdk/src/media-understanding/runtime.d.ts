import type { OpenClawConfig } from "../config/config.js";
import { runCapability, type ActiveMediaModel } from "../plugin-sdk/media-runtime.js";
type MediaUnderstandingCapability = "image" | "audio" | "video";
type MediaUnderstandingOutput = Awaited<ReturnType<typeof runCapability>>["outputs"][number];
export type RunMediaUnderstandingFileParams = {
    capability: MediaUnderstandingCapability;
    filePath: string;
    cfg: OpenClawConfig;
    agentDir?: string;
    mime?: string;
    activeModel?: ActiveMediaModel;
};
export type RunMediaUnderstandingFileResult = {
    text: string | undefined;
    provider?: string;
    model?: string;
    output?: MediaUnderstandingOutput;
};
export declare function runMediaUnderstandingFile(params: RunMediaUnderstandingFileParams): Promise<RunMediaUnderstandingFileResult>;
export declare function describeImageFile(params: {
    filePath: string;
    cfg: OpenClawConfig;
    agentDir?: string;
    mime?: string;
    activeModel?: ActiveMediaModel;
}): Promise<RunMediaUnderstandingFileResult>;
export declare function describeImageFileWithModel(params: {
    filePath: string;
    cfg: OpenClawConfig;
    agentDir?: string;
    mime?: string;
    provider: string;
    model: string;
    prompt: string;
    maxTokens?: number;
    timeoutMs?: number;
}): Promise<import("./types.ts").ImageDescriptionResult>;
export declare function describeVideoFile(params: {
    filePath: string;
    cfg: OpenClawConfig;
    agentDir?: string;
    mime?: string;
    activeModel?: ActiveMediaModel;
}): Promise<RunMediaUnderstandingFileResult>;
export declare function transcribeAudioFile(params: {
    filePath: string;
    cfg: OpenClawConfig;
    agentDir?: string;
    mime?: string;
    activeModel?: ActiveMediaModel;
}): Promise<{
    text: string | undefined;
}>;
export {};
