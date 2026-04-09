import { n as resolveMoonshotThinkingType, r as streamWithPayloadPatch, t as createMoonshotThinkingWrapper } from "../moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
import { a as createCodexNativeWebSearchWrapper, b as sanitizeGoogleThinkingPayload, c as createOpenAIFastModeWrapper, d as createOpenAIServiceTierWrapper, f as createOpenAITextVerbosityWrapper, g as createMinimaxFastModeWrapper, h as resolveOpenAITextVerbosity, i as isProxyReasoningUnsupported, l as createOpenAIReasoningCompatibilityWrapper, m as resolveOpenAIServiceTier, n as createOpenRouterSystemCacheWrapper, o as createOpenAIAttributionHeadersWrapper, p as resolveOpenAIFastMode, r as createOpenRouterWrapper, s as createOpenAIDefaultTransportWrapper, t as createKilocodeWrapper, u as createOpenAIResponsesContextManagementWrapper, y as createGoogleThinkingPayloadWrapper } from "../proxy-stream-wrappers-C_9sn9XU.js";
import { t as isAnthropicBedrockModel } from "../anthropic-cache-control-payload-CF5lf1Cs.js";
import { n as applyAnthropicPayloadPolicyToParams, r as resolveAnthropicPayloadPolicy, t as applyAnthropicEphemeralCacheControlMarkers } from "../anthropic-payload-policy-DdUEVGSh.js";
import { r as hasCopilotVisionInput, t as buildCopilotDynamicHeaders } from "../copilot-dynamic-headers-BocFCAcC.js";
import { n as createZaiToolStreamWrapper, t as createToolStreamWrapper } from "../zai-stream-wrappers-CO8RBNV4.js";
import { n as loadOpenRouterModelCapabilities, t as getOpenRouterModelCapabilities } from "../openrouter-model-capabilities-BNkRfEYl.js";
import { t as createBedrockNoCacheWrapper } from "../bedrock-stream-wrappers-DERe20oA.js";
import { streamSimple } from "@mariozechner/pi-ai";
//#region src/agents/pi-embedded-runner/anthropic-family-tool-payload-compat.ts
function hasOpenAiAnthropicToolPayloadCompatFlag(model) {
	if (!model.compat || typeof model.compat !== "object" || Array.isArray(model.compat)) return false;
	return model.compat.requiresOpenAiAnthropicToolPayload === true;
}
function requiresAnthropicToolPayloadCompatibilityForModel(model, options) {
	if (model.api !== "anthropic-messages") return false;
	return Boolean(options?.toolSchemaMode || options?.toolChoiceMode) || hasOpenAiAnthropicToolPayloadCompatFlag(model);
}
function usesOpenAiFunctionAnthropicToolSchemaForModel(model, options) {
	return options?.toolSchemaMode === "openai-functions" || hasOpenAiAnthropicToolPayloadCompatFlag(model);
}
function usesOpenAiStringModeAnthropicToolChoiceForModel(model, options) {
	return options?.toolChoiceMode === "openai-string-modes" || hasOpenAiAnthropicToolPayloadCompatFlag(model);
}
function normalizeOpenAiFunctionAnthropicToolDefinition(tool) {
	if (!tool || typeof tool !== "object" || Array.isArray(tool)) return;
	const toolObj = tool;
	if (toolObj.function && typeof toolObj.function === "object") return toolObj;
	const rawName = typeof toolObj.name === "string" ? toolObj.name.trim() : "";
	if (!rawName) return toolObj;
	const functionSpec = {
		name: rawName,
		parameters: toolObj.input_schema && typeof toolObj.input_schema === "object" ? toolObj.input_schema : toolObj.parameters && typeof toolObj.parameters === "object" ? toolObj.parameters : {
			type: "object",
			properties: {}
		}
	};
	if (typeof toolObj.description === "string" && toolObj.description.trim()) functionSpec.description = toolObj.description;
	if (typeof toolObj.strict === "boolean") functionSpec.strict = toolObj.strict;
	return {
		type: "function",
		function: functionSpec
	};
}
function normalizeOpenAiStringModeAnthropicToolChoice(toolChoice) {
	if (!toolChoice || typeof toolChoice !== "object" || Array.isArray(toolChoice)) return toolChoice;
	const choice = toolChoice;
	if (choice.type === "auto") return "auto";
	if (choice.type === "none") return "none";
	if (choice.type === "required" || choice.type === "any") return "required";
	if (choice.type === "tool" && typeof choice.name === "string" && choice.name.trim()) return {
		type: "function",
		function: { name: choice.name.trim() }
	};
	return toolChoice;
}
function createAnthropicToolPayloadCompatibilityWrapper(baseStreamFn, options) {
	const underlying = baseStreamFn ?? streamSimple;
	return (model, context, streamOptions) => {
		const originalOnPayload = streamOptions?.onPayload;
		return underlying(model, context, {
			...streamOptions,
			onPayload: (payload) => {
				if (payload && typeof payload === "object" && requiresAnthropicToolPayloadCompatibilityForModel(model, options)) {
					const payloadObj = payload;
					if (Array.isArray(payloadObj.tools) && usesOpenAiFunctionAnthropicToolSchemaForModel(model, options)) payloadObj.tools = payloadObj.tools.map((tool) => normalizeOpenAiFunctionAnthropicToolDefinition(tool)).filter((tool) => !!tool);
					if (usesOpenAiStringModeAnthropicToolChoiceForModel(model, options)) payloadObj.tool_choice = normalizeOpenAiStringModeAnthropicToolChoice(payloadObj.tool_choice);
				}
				return originalOnPayload?.(payload, model);
			}
		});
	};
}
function createOpenAIAnthropicToolPayloadCompatibilityWrapper(baseStreamFn) {
	return createAnthropicToolPayloadCompatibilityWrapper(baseStreamFn, {
		toolSchemaMode: "openai-functions",
		toolChoiceMode: "openai-string-modes"
	});
}
//#endregion
//#region src/plugin-sdk/provider-stream.ts
function composeProviderStreamWrappers(baseStreamFn, ...wrappers) {
	return wrappers.reduce((streamFn, wrapper) => wrapper ? wrapper(streamFn) : streamFn, baseStreamFn);
}
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
export { applyAnthropicEphemeralCacheControlMarkers, applyAnthropicPayloadPolicyToParams, buildCopilotDynamicHeaders, buildProviderStreamFamilyHooks, composeProviderStreamWrappers, createAnthropicToolPayloadCompatibilityWrapper, createBedrockNoCacheWrapper, createCodexNativeWebSearchWrapper, createGoogleThinkingPayloadWrapper, createKilocodeWrapper, createMinimaxFastModeWrapper, createMoonshotThinkingWrapper, createOpenAIAnthropicToolPayloadCompatibilityWrapper, createOpenAIAttributionHeadersWrapper, createOpenAIDefaultTransportWrapper, createOpenAIFastModeWrapper, createOpenAIReasoningCompatibilityWrapper, createOpenAIResponsesContextManagementWrapper, createOpenAIServiceTierWrapper, createOpenAITextVerbosityWrapper, createOpenRouterSystemCacheWrapper, createOpenRouterWrapper, createToolStreamWrapper, createZaiToolStreamWrapper, getOpenRouterModelCapabilities, hasCopilotVisionInput, isAnthropicBedrockModel, isProxyReasoningUnsupported, loadOpenRouterModelCapabilities, resolveAnthropicPayloadPolicy, resolveMoonshotThinkingType, resolveOpenAIFastMode, resolveOpenAIServiceTier, resolveOpenAITextVerbosity, sanitizeGoogleThinkingPayload, streamWithPayloadPatch };
