import "./provider-attribution-DFA_ceCj.js";
import { i as normalizeModelCompat } from "./provider-model-compat-ddK_un1r.js";
import "./moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
//#region src/plugins/provider-replay-helpers.ts
function buildOpenAICompatibleReplayPolicy(modelApi) {
	if (modelApi !== "openai-completions" && modelApi !== "openai-responses" && modelApi !== "openai-codex-responses" && modelApi !== "azure-openai-responses") return;
	return {
		sanitizeToolCallIds: true,
		toolCallIdMode: "strict",
		...modelApi === "openai-completions" ? {
			applyAssistantFirstOrderingFix: true,
			validateGeminiTurns: true,
			validateAnthropicTurns: true
		} : {
			applyAssistantFirstOrderingFix: false,
			validateGeminiTurns: false,
			validateAnthropicTurns: false
		}
	};
}
function buildStrictAnthropicReplayPolicy(options = {}) {
	return {
		sanitizeMode: "full",
		...options.sanitizeToolCallIds ?? true ? {
			sanitizeToolCallIds: true,
			toolCallIdMode: "strict",
			...options.preserveNativeAnthropicToolUseIds ? { preserveNativeAnthropicToolUseIds: true } : {}
		} : {},
		preserveSignatures: true,
		repairToolUseResultPairing: true,
		validateAnthropicTurns: true,
		allowSyntheticToolResults: true,
		...options.dropThinkingBlocks ? { dropThinkingBlocks: true } : {}
	};
}
function buildAnthropicReplayPolicyForModel(modelId) {
	return buildStrictAnthropicReplayPolicy({ dropThinkingBlocks: (modelId?.toLowerCase() ?? "").includes("claude") });
}
function buildNativeAnthropicReplayPolicyForModel(modelId) {
	return buildStrictAnthropicReplayPolicy({
		dropThinkingBlocks: (modelId?.toLowerCase() ?? "").includes("claude"),
		sanitizeToolCallIds: true,
		preserveNativeAnthropicToolUseIds: true
	});
}
function buildHybridAnthropicOrOpenAIReplayPolicy(ctx, options = {}) {
	if (ctx.modelApi === "anthropic-messages" || ctx.modelApi === "bedrock-converse-stream") return buildStrictAnthropicReplayPolicy({ dropThinkingBlocks: options.anthropicModelDropThinkingBlocks && (ctx.modelId?.toLowerCase() ?? "").includes("claude") });
	return buildOpenAICompatibleReplayPolicy(ctx.modelApi);
}
const GOOGLE_TURN_ORDERING_CUSTOM_TYPE = "google-turn-ordering-bootstrap";
const GOOGLE_TURN_ORDER_BOOTSTRAP_TEXT = "(session bootstrap)";
function sanitizeGoogleAssistantFirstOrdering(messages) {
	const first = messages[0];
	const role = first?.role;
	const content = first?.content;
	if (role === "user" && typeof content === "string" && content.trim() === GOOGLE_TURN_ORDER_BOOTSTRAP_TEXT) return messages;
	if (role !== "assistant") return messages;
	return [{
		role: "user",
		content: GOOGLE_TURN_ORDER_BOOTSTRAP_TEXT,
		timestamp: Date.now()
	}, ...messages];
}
function hasGoogleTurnOrderingMarker(sessionState) {
	return sessionState.getCustomEntries().some((entry) => entry.customType === GOOGLE_TURN_ORDERING_CUSTOM_TYPE);
}
function markGoogleTurnOrderingMarker(sessionState) {
	sessionState.appendCustomEntry(GOOGLE_TURN_ORDERING_CUSTOM_TYPE, { timestamp: Date.now() });
}
function buildGoogleGeminiReplayPolicy() {
	return {
		sanitizeMode: "full",
		sanitizeToolCallIds: true,
		toolCallIdMode: "strict",
		sanitizeThoughtSignatures: {
			allowBase64Only: true,
			includeCamelCase: true
		},
		repairToolUseResultPairing: true,
		applyAssistantFirstOrderingFix: true,
		validateGeminiTurns: true,
		validateAnthropicTurns: false,
		allowSyntheticToolResults: true
	};
}
function buildPassthroughGeminiSanitizingReplayPolicy(modelId) {
	return {
		applyAssistantFirstOrderingFix: false,
		validateGeminiTurns: false,
		validateAnthropicTurns: false,
		...(modelId?.toLowerCase() ?? "").includes("gemini") ? { sanitizeThoughtSignatures: {
			allowBase64Only: true,
			includeCamelCase: true
		} } : {}
	};
}
function sanitizeGoogleGeminiReplayHistory(ctx) {
	const messages = sanitizeGoogleAssistantFirstOrdering(ctx.messages);
	if (messages !== ctx.messages && ctx.sessionState && !hasGoogleTurnOrderingMarker(ctx.sessionState)) markGoogleTurnOrderingMarker(ctx.sessionState);
	return messages;
}
function resolveTaggedReasoningOutputMode() {
	return "tagged";
}
//#endregion
//#region src/plugins/provider-model-helpers.ts
function matchesExactOrPrefix(id, values) {
	const normalizedId = id.trim().toLowerCase();
	return values.some((value) => {
		const normalizedValue = value.trim().toLowerCase();
		return normalizedId === normalizedValue || normalizedId.startsWith(normalizedValue);
	});
}
function cloneFirstTemplateModel(params) {
	const trimmedModelId = params.modelId.trim();
	for (const templateId of [...new Set(params.templateIds)].filter(Boolean)) {
		const template = params.ctx.modelRegistry.find(params.providerId, templateId);
		if (!template) continue;
		return normalizeModelCompat({
			...template,
			id: trimmedModelId,
			name: trimmedModelId,
			...params.patch
		});
	}
}
//#endregion
//#region src/plugin-sdk/provider-model-shared.ts
function getModelProviderHint(modelId) {
	const trimmed = modelId.trim().toLowerCase();
	const slashIndex = trimmed.indexOf("/");
	if (slashIndex <= 0) return null;
	return trimmed.slice(0, slashIndex) || null;
}
function isProxyReasoningUnsupportedModelHint(modelId) {
	return getModelProviderHint(modelId) === "x-ai";
}
const ANTIGRAVITY_BARE_PRO_IDS = new Set([
	"gemini-3-pro",
	"gemini-3.1-pro",
	"gemini-3-1-pro"
]);
function normalizeGooglePreviewModelId(id) {
	if (id === "gemini-3-pro") return "gemini-3-pro-preview";
	if (id === "gemini-3-flash") return "gemini-3-flash-preview";
	if (id === "gemini-3.1-pro") return "gemini-3.1-pro-preview";
	if (id === "gemini-3.1-flash-lite") return "gemini-3.1-flash-lite-preview";
	if (id === "gemini-3.1-flash" || id === "gemini-3.1-flash-preview") return "gemini-3-flash-preview";
	return id;
}
function normalizeAntigravityPreviewModelId(id) {
	if (ANTIGRAVITY_BARE_PRO_IDS.has(id)) return `${id}-low`;
	return id;
}
function normalizeNativeXaiModelId(id) {
	if (id === "grok-4-fast-reasoning") return "grok-4-fast";
	if (id === "grok-4-1-fast-reasoning") return "grok-4-1-fast";
	if (id === "grok-4.20-experimental-beta-0304-reasoning") return "grok-4.20-beta-latest-reasoning";
	if (id === "grok-4.20-experimental-beta-0304-non-reasoning") return "grok-4.20-beta-latest-non-reasoning";
	if (id === "grok-4.20-reasoning") return "grok-4.20-beta-latest-reasoning";
	if (id === "grok-4.20-non-reasoning") return "grok-4.20-beta-latest-non-reasoning";
	return id;
}
function buildProviderReplayFamilyHooks(options) {
	switch (options.family) {
		case "openai-compatible": return { buildReplayPolicy: (ctx) => buildOpenAICompatibleReplayPolicy(ctx.modelApi) };
		case "anthropic-by-model": return { buildReplayPolicy: ({ modelId }) => buildAnthropicReplayPolicyForModel(modelId) };
		case "google-gemini": return {
			buildReplayPolicy: () => buildGoogleGeminiReplayPolicy(),
			sanitizeReplayHistory: (ctx) => sanitizeGoogleGeminiReplayHistory(ctx),
			resolveReasoningOutputMode: (_ctx) => resolveTaggedReasoningOutputMode()
		};
		case "passthrough-gemini": return { buildReplayPolicy: ({ modelId }) => buildPassthroughGeminiSanitizingReplayPolicy(modelId) };
		case "hybrid-anthropic-openai": return { buildReplayPolicy: (ctx) => buildHybridAnthropicOrOpenAIReplayPolicy(ctx, { anthropicModelDropThinkingBlocks: options.anthropicModelDropThinkingBlocks }) };
	}
}
//#endregion
export { sanitizeGoogleGeminiReplayHistory as _, normalizeGooglePreviewModelId as a, matchesExactOrPrefix as c, buildHybridAnthropicOrOpenAIReplayPolicy as d, buildNativeAnthropicReplayPolicyForModel as f, resolveTaggedReasoningOutputMode as g, buildStrictAnthropicReplayPolicy as h, normalizeAntigravityPreviewModelId as i, buildAnthropicReplayPolicyForModel as l, buildPassthroughGeminiSanitizingReplayPolicy as m, getModelProviderHint as n, normalizeNativeXaiModelId as o, buildOpenAICompatibleReplayPolicy as p, isProxyReasoningUnsupportedModelHint as r, cloneFirstTemplateModel as s, buildProviderReplayFamilyHooks as t, buildGoogleGeminiReplayPolicy as u };
