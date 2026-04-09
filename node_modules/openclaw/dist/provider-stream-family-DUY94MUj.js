import { n as resolveMoonshotThinkingType, t as createMoonshotThinkingWrapper } from "./moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
import { a as createCodexNativeWebSearchWrapper, c as createOpenAIFastModeWrapper, d as createOpenAIServiceTierWrapper, f as createOpenAITextVerbosityWrapper, g as createMinimaxFastModeWrapper, h as resolveOpenAITextVerbosity, i as isProxyReasoningUnsupported, l as createOpenAIReasoningCompatibilityWrapper, m as resolveOpenAIServiceTier, o as createOpenAIAttributionHeadersWrapper, p as resolveOpenAIFastMode, r as createOpenRouterWrapper, t as createKilocodeWrapper, u as createOpenAIResponsesContextManagementWrapper, y as createGoogleThinkingPayloadWrapper } from "./proxy-stream-wrappers-C_9sn9XU.js";
import { t as createToolStreamWrapper } from "./zai-stream-wrappers-CO8RBNV4.js";
import "./openrouter-model-capabilities-BNkRfEYl.js";
//#region src/plugin-sdk/provider-stream-family.ts
function buildProviderStreamFamilyHooks(family) {
	switch (family) {
		case "google-thinking": return { wrapStreamFn: (ctx) => createGoogleThinkingPayloadWrapper(ctx.streamFn, ctx.thinkingLevel) };
		case "moonshot-thinking": return { wrapStreamFn: (ctx) => {
			const thinkingType = resolveMoonshotThinkingType({
				configuredThinking: ctx.extraParams?.thinking,
				thinkingLevel: ctx.thinkingLevel
			});
			return createMoonshotThinkingWrapper(ctx.streamFn, thinkingType);
		} };
		case "kilocode-thinking": return { wrapStreamFn: (ctx) => {
			const thinkingLevel = ctx.modelId === "kilo/auto" || isProxyReasoningUnsupported(ctx.modelId) ? void 0 : ctx.thinkingLevel;
			return createKilocodeWrapper(ctx.streamFn, thinkingLevel);
		} };
		case "minimax-fast-mode": return { wrapStreamFn: (ctx) => createMinimaxFastModeWrapper(ctx.streamFn, ctx.extraParams?.fastMode === true) };
		case "openai-responses-defaults": return { wrapStreamFn: (ctx) => {
			let nextStreamFn = createOpenAIAttributionHeadersWrapper(ctx.streamFn);
			if (resolveOpenAIFastMode(ctx.extraParams)) nextStreamFn = createOpenAIFastModeWrapper(nextStreamFn);
			const serviceTier = resolveOpenAIServiceTier(ctx.extraParams);
			if (serviceTier) nextStreamFn = createOpenAIServiceTierWrapper(nextStreamFn, serviceTier);
			const textVerbosity = resolveOpenAITextVerbosity(ctx.extraParams);
			if (textVerbosity) nextStreamFn = createOpenAITextVerbosityWrapper(nextStreamFn, textVerbosity);
			nextStreamFn = createCodexNativeWebSearchWrapper(nextStreamFn, {
				config: ctx.config,
				agentDir: ctx.agentDir
			});
			return createOpenAIResponsesContextManagementWrapper(createOpenAIReasoningCompatibilityWrapper(nextStreamFn), ctx.extraParams);
		} };
		case "openrouter-thinking": return { wrapStreamFn: (ctx) => {
			const thinkingLevel = ctx.modelId === "auto" || isProxyReasoningUnsupported(ctx.modelId) ? void 0 : ctx.thinkingLevel;
			return createOpenRouterWrapper(ctx.streamFn, thinkingLevel);
		} };
		case "tool-stream-default-on": return { wrapStreamFn: (ctx) => createToolStreamWrapper(ctx.streamFn, ctx.extraParams?.tool_stream !== false) };
	}
}
//#endregion
export { buildProviderStreamFamilyHooks as t };
