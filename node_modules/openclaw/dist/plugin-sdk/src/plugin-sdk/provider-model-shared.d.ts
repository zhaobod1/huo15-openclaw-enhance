import { buildAnthropicReplayPolicyForModel, buildGoogleGeminiReplayPolicy, buildHybridAnthropicOrOpenAIReplayPolicy, buildNativeAnthropicReplayPolicyForModel, buildOpenAICompatibleReplayPolicy, buildPassthroughGeminiSanitizingReplayPolicy, buildStrictAnthropicReplayPolicy, resolveTaggedReasoningOutputMode, sanitizeGoogleGeminiReplayHistory } from "../plugins/provider-replay-helpers.js";
import type { ProviderPlugin } from "../plugins/types.js";
export type { ModelApi, ModelProviderConfig } from "../config/types.models.js";
export type { BedrockDiscoveryConfig, ModelCompatConfig, ModelDefinitionConfig, } from "../config/types.models.js";
export type { ProviderEndpointClass, ProviderEndpointResolution, } from "../agents/provider-attribution.js";
export type { ProviderPlugin } from "../plugins/types.js";
export type { KilocodeModelCatalogEntry } from "../plugins/provider-model-kilocode.js";
export { DEFAULT_CONTEXT_TOKENS } from "../agents/defaults.js";
export { resolveProviderEndpoint } from "../agents/provider-attribution.js";
export { applyModelCompatPatch, hasToolSchemaProfile, hasNativeWebSearchTool, normalizeModelCompat, resolveUnsupportedToolSchemaKeywords, resolveToolCallArgumentsEncoding, } from "../plugins/provider-model-compat.js";
export { normalizeProviderId } from "../agents/provider-id.js";
export { buildAnthropicReplayPolicyForModel, buildGoogleGeminiReplayPolicy, buildHybridAnthropicOrOpenAIReplayPolicy, buildNativeAnthropicReplayPolicyForModel, buildOpenAICompatibleReplayPolicy, buildPassthroughGeminiSanitizingReplayPolicy, resolveTaggedReasoningOutputMode, sanitizeGoogleGeminiReplayHistory, buildStrictAnthropicReplayPolicy, };
export { createMoonshotThinkingWrapper, resolveMoonshotThinkingType, } from "../agents/pi-embedded-runner/moonshot-thinking-stream-wrappers.js";
export { cloneFirstTemplateModel, matchesExactOrPrefix, } from "../plugins/provider-model-helpers.js";
export declare function getModelProviderHint(modelId: string): string | null;
export declare function isProxyReasoningUnsupportedModelHint(modelId: string): boolean;
export declare function normalizeGooglePreviewModelId(id: string): string;
export declare function normalizeAntigravityPreviewModelId(id: string): string;
export declare function normalizeNativeXaiModelId(id: string): string;
export type ProviderReplayFamily = "openai-compatible" | "anthropic-by-model" | "google-gemini" | "passthrough-gemini" | "hybrid-anthropic-openai";
type ProviderReplayFamilyHooks = Pick<ProviderPlugin, "buildReplayPolicy" | "sanitizeReplayHistory" | "resolveReasoningOutputMode">;
type BuildProviderReplayFamilyHooksOptions = {
    family: "openai-compatible";
} | {
    family: "anthropic-by-model";
} | {
    family: "google-gemini";
} | {
    family: "passthrough-gemini";
} | {
    family: "hybrid-anthropic-openai";
    anthropicModelDropThinkingBlocks?: boolean;
};
export declare function buildProviderReplayFamilyHooks(options: BuildProviderReplayFamilyHooksOptions): ProviderReplayFamilyHooks;
