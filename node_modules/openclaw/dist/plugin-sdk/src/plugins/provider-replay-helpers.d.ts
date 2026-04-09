import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ProviderReasoningOutputMode, ProviderReplayPolicy, ProviderReplayPolicyContext, ProviderSanitizeReplayHistoryContext } from "./types.js";
export declare function buildOpenAICompatibleReplayPolicy(modelApi: string | null | undefined): ProviderReplayPolicy | undefined;
export declare function buildStrictAnthropicReplayPolicy(options?: {
    dropThinkingBlocks?: boolean;
    sanitizeToolCallIds?: boolean;
    preserveNativeAnthropicToolUseIds?: boolean;
}): ProviderReplayPolicy;
export declare function buildAnthropicReplayPolicyForModel(modelId?: string): ProviderReplayPolicy;
export declare function buildNativeAnthropicReplayPolicyForModel(modelId?: string): ProviderReplayPolicy;
export declare function buildHybridAnthropicOrOpenAIReplayPolicy(ctx: ProviderReplayPolicyContext, options?: {
    anthropicModelDropThinkingBlocks?: boolean;
}): ProviderReplayPolicy | undefined;
export declare function buildGoogleGeminiReplayPolicy(): ProviderReplayPolicy;
export declare function buildPassthroughGeminiSanitizingReplayPolicy(modelId?: string): ProviderReplayPolicy;
export declare function sanitizeGoogleGeminiReplayHistory(ctx: ProviderSanitizeReplayHistoryContext): AgentMessage[];
export declare function resolveTaggedReasoningOutputMode(): ProviderReasoningOutputMode;
