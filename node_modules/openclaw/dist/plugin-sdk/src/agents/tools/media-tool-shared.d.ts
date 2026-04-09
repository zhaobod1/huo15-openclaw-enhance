import { type Api, type Model } from "@mariozechner/pi-ai";
import type { OpenClawConfig } from "../../config/config.js";
import type { AgentModelConfig } from "../../config/types.agents-shared.js";
import type { ImageModelConfig } from "./image-tool.helpers.js";
import { type ToolModelConfig } from "./model-config.helpers.js";
type TextToolAttempt = {
    provider: string;
    model: string;
    error: string;
};
type TextToolResult = {
    text: string;
    provider: string;
    model: string;
    attempts: TextToolAttempt[];
};
export declare function applyImageModelConfigDefaults(cfg: OpenClawConfig | undefined, imageModelConfig: ImageModelConfig): OpenClawConfig | undefined;
export declare function applyImageGenerationModelConfigDefaults(cfg: OpenClawConfig | undefined, imageGenerationModelConfig: ToolModelConfig): OpenClawConfig | undefined;
export declare function applyVideoGenerationModelConfigDefaults(cfg: OpenClawConfig | undefined, videoGenerationModelConfig: ToolModelConfig): OpenClawConfig | undefined;
export declare function applyMusicGenerationModelConfigDefaults(cfg: OpenClawConfig | undefined, musicGenerationModelConfig: ToolModelConfig): OpenClawConfig | undefined;
type CapabilityProvider = {
    id: string;
    aliases?: string[];
    defaultModel?: string;
    isConfigured?: (ctx: {
        cfg?: OpenClawConfig;
        agentDir?: string;
    }) => boolean;
};
export declare function findCapabilityProviderById<T extends CapabilityProvider>(params: {
    providers: T[];
    providerId?: string;
}): T | undefined;
export declare function isCapabilityProviderConfigured<T extends CapabilityProvider>(params: {
    providers: T[];
    provider?: T;
    providerId?: string;
    cfg?: OpenClawConfig;
    agentDir?: string;
}): boolean;
export declare function resolveCapabilityModelCandidatesForTool<T extends CapabilityProvider>(params: {
    cfg?: OpenClawConfig;
    agentDir?: string;
    providers: T[];
}): string[];
export declare function resolveCapabilityModelConfigForTool<T extends CapabilityProvider>(params: {
    cfg?: OpenClawConfig;
    agentDir?: string;
    modelConfig?: AgentModelConfig;
    providers: T[];
}): ToolModelConfig | null;
export declare function resolveMediaToolLocalRoots(workspaceDirRaw: string | undefined, options?: {
    workspaceOnly?: boolean;
}, _mediaSources?: readonly string[]): string[];
export declare function resolvePromptAndModelOverride(args: Record<string, unknown>, defaultPrompt: string): {
    prompt: string;
    modelOverride?: string;
};
export declare function buildTextToolResult(result: TextToolResult, extraDetails: Record<string, unknown>): {
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: Record<string, unknown>;
};
export declare function resolveModelFromRegistry(params: {
    modelRegistry: {
        find: (provider: string, modelId: string) => unknown;
    };
    provider: string;
    modelId: string;
}): Model<Api>;
export declare function resolveModelRuntimeApiKey(params: {
    model: Model<Api>;
    cfg: OpenClawConfig | undefined;
    agentDir: string;
    authStorage: {
        setRuntimeApiKey: (provider: string, apiKey: string) => void;
    };
}): Promise<string>;
export {};
