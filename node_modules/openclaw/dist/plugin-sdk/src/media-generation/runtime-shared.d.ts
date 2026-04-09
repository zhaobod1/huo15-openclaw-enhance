import type { FallbackAttempt } from "../agents/model-fallback.types.js";
import type { OpenClawConfig } from "../config/config.js";
import type { AgentModelConfig } from "../config/types.agents-shared.js";
export type ParsedProviderModelRef = {
    provider: string;
    model: string;
};
export declare function resolveCapabilityModelCandidates(params: {
    cfg: OpenClawConfig;
    modelConfig: AgentModelConfig | undefined;
    modelOverride?: string;
    parseModelRef: (raw: string | undefined) => ParsedProviderModelRef | null;
}): ParsedProviderModelRef[];
export declare function throwCapabilityGenerationFailure(params: {
    capabilityLabel: string;
    attempts: FallbackAttempt[];
    lastError: unknown;
}): never;
export declare function buildNoCapabilityModelConfiguredMessage(params: {
    capabilityLabel: string;
    modelConfigKey: string;
    providers: Array<{
        id: string;
        defaultModel?: string | null;
    }>;
    fallbackSampleRef?: string;
}): string;
