import { u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { _ as resolveModelRefFromString, i as buildModelAliasIndex, m as resolveConfiguredModelRef } from "./model-selection-BVM4eHHo.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-I0_TmVEm.js";
import { n as VERSION } from "./version-Bh_RSQ5Y.js";
import "./provider-attribution-DFA_ceCj.js";
import { r as streamWithPayloadPatch } from "./moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
import { t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { K as wrapProviderStreamFn, x as prepareProviderExtraParams } from "./provider-runtime-SgdEL2pb.js";
import { i as resolveMainSessionKey } from "./main-session-D-BGz7Y3.js";
import "./sessions-D5EF_laP.js";
import { i as resolveSessionFilePathOptions, r as resolveSessionFilePath } from "./paths-UazeViO92.js";
import { t as isCommandFlagEnabled } from "./commands-CjGDOH-W.js";
import { l as normalizeToolName } from "./tool-policy-CD0rHa6E.js";
import { n as resolveSandboxRuntimeStatus } from "./runtime-status-BNMb0UiT.js";
import { c as resolveModelAuthMode } from "./model-auth-BbESr7Je.js";
import { n as resolveSelectedAndActiveModel, t as formatProviderModelRef } from "./model-runtime-Bilsq5sB.js";
import { n as resolveContextTokensForModel } from "./context-BozTgpbo.js";
import { _ as createMinimaxThinkingDisabledWrapper, h as resolveOpenAITextVerbosity, n as createOpenRouterSystemCacheWrapper, u as createOpenAIResponsesContextManagementWrapper, v as log, y as createGoogleThinkingPayloadWrapper } from "./proxy-stream-wrappers-C_9sn9XU.js";
import { i as resolveAnthropicCacheRetentionFamily } from "./anthropic-cache-control-payload-CF5lf1Cs.js";
import "./sandbox-DMz_IPHy.js";
import { a as normalizeUsage, t as derivePromptTokens } from "./usage-CzcPoJlb.js";
import { t as resolveChannelModelOverride } from "./model-overrides-CR_YQgCX.js";
import { n as formatTimeAgo } from "./format-relative-Cdxcv0IJ.js";
import { n as resolveCommitHash } from "./git-commit-CCFZA5zV.js";
import { r as listPluginCommands } from "./commands-T_UGDmXI.js";
import { t as resolveStatusTtsSnapshot } from "./status-config-Mrd6EkDI.js";
import { a as resolveModelCostConfig, i as formatUsd, n as estimateUsageCost, r as formatTokenCount$1 } from "./usage-format-B6wsX5Cv.js";
import { c as listChatCommands, l as listChatCommandsForConfig } from "./commands-registry-CyAozniN.js";
import fs from "node:fs";
import { streamSimple } from "@mariozechner/pi-ai";
//#region src/agents/pi-embedded-runner/moonshot-stream-wrappers.ts
function shouldApplySiliconFlowThinkingOffCompat(params) {
	return params.provider === "siliconflow" && params.thinkingLevel === "off" && params.modelId.startsWith("Pro/");
}
function createSiliconFlowThinkingWrapper(baseStreamFn) {
	const underlying = baseStreamFn ?? streamSimple;
	return (model, context, options) => streamWithPayloadPatch(underlying, model, context, options, (payloadObj) => {
		if (payloadObj.thinking === "off") payloadObj.thinking = null;
	});
}
//#endregion
//#region src/agents/pi-embedded-runner/prompt-cache-retention.ts
function isGooglePromptCacheEligible(params) {
	if (params.modelApi !== "google-generative-ai") return false;
	const normalizedModelId = params.modelId?.trim().toLowerCase() ?? "";
	return normalizedModelId.startsWith("gemini-2.5") || normalizedModelId.startsWith("gemini-3");
}
function resolveCacheRetention(extraParams, provider, modelApi, modelId) {
	const family = resolveAnthropicCacheRetentionFamily({
		provider,
		modelApi,
		modelId,
		hasExplicitCacheConfig: extraParams?.cacheRetention !== void 0 || extraParams?.cacheControlTtl !== void 0
	});
	const googleEligible = isGooglePromptCacheEligible({
		modelApi,
		modelId
	});
	if (!family && !googleEligible) return;
	const newVal = extraParams?.cacheRetention;
	if (newVal === "none" || newVal === "short" || newVal === "long") return newVal;
	const legacy = extraParams?.cacheControlTtl;
	if (legacy === "5m") return "short";
	if (legacy === "1h") return "long";
	return family === "anthropic-direct" ? "short" : void 0;
}
const providerRuntimeDeps = {
	prepareProviderExtraParams,
	wrapProviderStreamFn
};
/**
* Resolve provider-specific extra params from model config.
* Used to pass through stream params like temperature/maxTokens.
*
* @internal Exported for testing only
*/
function resolveExtraParams(params) {
	const defaultParams = params.cfg?.agents?.defaults?.params ?? void 0;
	const modelKey = `${params.provider}/${params.modelId}`;
	const modelConfig = params.cfg?.agents?.defaults?.models?.[modelKey];
	const globalParams = modelConfig?.params ? { ...modelConfig.params } : void 0;
	const agentParams = params.agentId && params.cfg?.agents?.list ? params.cfg.agents.list.find((agent) => agent.id === params.agentId)?.params : void 0;
	const merged = Object.assign({}, defaultParams, globalParams, agentParams);
	const resolvedParallelToolCalls = resolveAliasedParamValue([
		defaultParams,
		globalParams,
		agentParams
	], "parallel_tool_calls", "parallelToolCalls");
	if (resolvedParallelToolCalls !== void 0) {
		merged.parallel_tool_calls = resolvedParallelToolCalls;
		delete merged.parallelToolCalls;
	}
	const resolvedTextVerbosity = resolveAliasedParamValue([globalParams, agentParams], "text_verbosity", "textVerbosity");
	if (resolvedTextVerbosity !== void 0) {
		merged.text_verbosity = resolvedTextVerbosity;
		delete merged.textVerbosity;
	}
	const resolvedCachedContent = resolveAliasedParamValue([
		defaultParams,
		globalParams,
		agentParams
	], "cached_content", "cachedContent");
	if (resolvedCachedContent !== void 0) {
		merged.cachedContent = resolvedCachedContent;
		delete merged.cached_content;
	}
	applyDefaultOpenAIGptRuntimeParams(params, merged);
	return Object.keys(merged).length > 0 ? merged : void 0;
}
function resolveSupportedTransport(value) {
	return value === "sse" || value === "websocket" || value === "auto" ? value : void 0;
}
function hasExplicitTransportSetting(settings) {
	return Object.hasOwn(settings, "transport");
}
function resolvePreparedExtraParams(params) {
	const resolvedExtraParams = params.resolvedExtraParams ?? resolveExtraParams({
		cfg: params.cfg,
		provider: params.provider,
		modelId: params.modelId,
		agentId: params.agentId
	});
	const override = params.extraParamsOverride && Object.keys(params.extraParamsOverride).length > 0 ? sanitizeExtraParamsRecord(Object.fromEntries(Object.entries(params.extraParamsOverride).filter(([, value]) => value !== void 0))) : void 0;
	const merged = {
		...sanitizeExtraParamsRecord(resolvedExtraParams),
		...override
	};
	const resolvedCachedContent = resolveAliasedParamValue([resolvedExtraParams, override], "cached_content", "cachedContent");
	if (resolvedCachedContent !== void 0) {
		merged.cachedContent = resolvedCachedContent;
		delete merged.cached_content;
	}
	return providerRuntimeDeps.prepareProviderExtraParams({
		provider: params.provider,
		config: params.cfg,
		context: {
			config: params.cfg,
			provider: params.provider,
			modelId: params.modelId,
			extraParams: merged,
			thinkingLevel: params.thinkingLevel
		}
	}) ?? merged;
}
function sanitizeExtraParamsRecord(value) {
	if (!value) return;
	return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "__proto__" && key !== "prototype" && key !== "constructor"));
}
function shouldApplyDefaultOpenAIGptRuntimeParams(params) {
	if (params.provider !== "openai" && params.provider !== "openai-codex") return false;
	return /^gpt-5(?:[.-]|$)/i.test(params.modelId);
}
function applyDefaultOpenAIGptRuntimeParams(params, merged) {
	if (!shouldApplyDefaultOpenAIGptRuntimeParams(params)) return;
	if (!Object.hasOwn(merged, "parallel_tool_calls") && !Object.hasOwn(merged, "parallelToolCalls")) merged.parallel_tool_calls = true;
	if (!Object.hasOwn(merged, "text_verbosity") && !Object.hasOwn(merged, "textVerbosity")) merged.text_verbosity = "low";
	if (!Object.hasOwn(merged, "openaiWsWarmup")) merged.openaiWsWarmup = true;
}
function resolveAgentTransportOverride(params) {
	const globalSettings = params.settingsManager.getGlobalSettings();
	const projectSettings = params.settingsManager.getProjectSettings();
	if (hasExplicitTransportSetting(globalSettings) || hasExplicitTransportSetting(projectSettings)) return;
	return resolveSupportedTransport(params.effectiveExtraParams?.transport);
}
function createStreamFnWithExtraParams(baseStreamFn, extraParams, provider, model) {
	if (!extraParams || Object.keys(extraParams).length === 0) return;
	const streamParams = {};
	if (typeof extraParams.temperature === "number") streamParams.temperature = extraParams.temperature;
	if (typeof extraParams.maxTokens === "number") streamParams.maxTokens = extraParams.maxTokens;
	const transport = resolveSupportedTransport(extraParams.transport);
	if (transport) streamParams.transport = transport;
	else if (extraParams.transport != null) {
		const transportSummary = typeof extraParams.transport === "string" ? extraParams.transport : typeof extraParams.transport;
		log.warn(`ignoring invalid transport param: ${transportSummary}`);
	}
	if (typeof extraParams.openaiWsWarmup === "boolean") streamParams.openaiWsWarmup = extraParams.openaiWsWarmup;
	const cachedContent = typeof extraParams.cachedContent === "string" ? extraParams.cachedContent : typeof extraParams.cached_content === "string" ? extraParams.cached_content : void 0;
	if (typeof cachedContent === "string" && cachedContent.trim()) streamParams.cachedContent = cachedContent.trim();
	const initialCacheRetention = resolveCacheRetention(extraParams, provider, typeof model?.api === "string" ? model.api : void 0, typeof model?.id === "string" ? model.id : void 0);
	if (Object.keys(streamParams).length > 0 || initialCacheRetention) {
		const debugParams = initialCacheRetention ? {
			...streamParams,
			cacheRetention: initialCacheRetention
		} : streamParams;
		log.debug(`creating streamFn wrapper with params: ${JSON.stringify(debugParams)}`);
	}
	const underlying = baseStreamFn ?? streamSimple;
	const wrappedStreamFn = (callModel, context, options) => {
		const cacheRetention = resolveCacheRetention(extraParams, provider, typeof callModel.api === "string" ? callModel.api : void 0, typeof callModel.id === "string" ? callModel.id : void 0);
		if (Object.keys(streamParams).length === 0 && !cacheRetention) return underlying(callModel, context, options);
		return underlying(callModel, context, {
			...streamParams,
			...cacheRetention ? { cacheRetention } : {},
			...options
		});
	};
	return wrappedStreamFn;
}
function resolveAliasedParamValue(sources, snakeCaseKey, camelCaseKey) {
	let resolved = void 0;
	let seen = false;
	for (const source of sources) {
		if (!source) continue;
		const hasSnakeCaseKey = Object.hasOwn(source, snakeCaseKey);
		if (!hasSnakeCaseKey && !Object.hasOwn(source, camelCaseKey)) continue;
		resolved = hasSnakeCaseKey ? source[snakeCaseKey] : source[camelCaseKey];
		seen = true;
	}
	return seen ? resolved : void 0;
}
function createParallelToolCallsWrapper(baseStreamFn, enabled) {
	const underlying = baseStreamFn ?? streamSimple;
	return (model, context, options) => {
		if (model.api !== "openai-completions" && model.api !== "openai-responses" && model.api !== "azure-openai-responses") return underlying(model, context, options);
		log.debug(`applying parallel_tool_calls=${enabled} for ${model.provider ?? "unknown"}/${model.id ?? "unknown"} api=${model.api}`);
		return streamWithPayloadPatch(underlying, model, context, options, (payloadObj) => {
			payloadObj.parallel_tool_calls = enabled;
		});
	};
}
function applyPrePluginStreamWrappers(ctx) {
	const wrappedStreamFn = createStreamFnWithExtraParams(ctx.agent.streamFn, ctx.effectiveExtraParams, ctx.provider, ctx.model);
	if (wrappedStreamFn) {
		log.debug(`applying extraParams to agent streamFn for ${ctx.provider}/${ctx.modelId}`);
		ctx.agent.streamFn = wrappedStreamFn;
	}
	if (shouldApplySiliconFlowThinkingOffCompat({
		provider: ctx.provider,
		modelId: ctx.modelId,
		thinkingLevel: ctx.thinkingLevel
	})) {
		log.debug(`normalizing thinking=off to thinking=null for SiliconFlow compatibility (${ctx.provider}/${ctx.modelId})`);
		ctx.agent.streamFn = createSiliconFlowThinkingWrapper(ctx.agent.streamFn);
	}
}
function applyPostPluginStreamWrappers(ctx) {
	ctx.agent.streamFn = createOpenRouterSystemCacheWrapper(ctx.agent.streamFn);
	if (!ctx.providerWrapperHandled) {
		ctx.agent.streamFn = createGoogleThinkingPayloadWrapper(ctx.agent.streamFn, ctx.thinkingLevel);
		ctx.agent.streamFn = createOpenAIResponsesContextManagementWrapper(ctx.agent.streamFn, ctx.effectiveExtraParams);
	}
	ctx.agent.streamFn = createMinimaxThinkingDisabledWrapper(ctx.agent.streamFn);
	const rawParallelToolCalls = resolveAliasedParamValue([ctx.resolvedExtraParams, ctx.override], "parallel_tool_calls", "parallelToolCalls");
	if (rawParallelToolCalls === void 0) return;
	if (typeof rawParallelToolCalls === "boolean") {
		ctx.agent.streamFn = createParallelToolCallsWrapper(ctx.agent.streamFn, rawParallelToolCalls);
		return;
	}
	if (rawParallelToolCalls === null) {
		log.debug("parallel_tool_calls suppressed by null override, skipping injection");
		return;
	}
	const summary = typeof rawParallelToolCalls === "string" ? rawParallelToolCalls : typeof rawParallelToolCalls;
	log.warn(`ignoring invalid parallel_tool_calls param: ${summary}`);
}
/**
* Apply extra params (like temperature) to an agent's streamFn.
* Also applies verified provider-specific request wrappers, such as OpenRouter attribution.
*
* @internal Exported for testing
*/
function applyExtraParamsToAgent(agent, cfg, provider, modelId, extraParamsOverride, thinkingLevel, agentId, workspaceDir, model, agentDir) {
	const resolvedExtraParams = resolveExtraParams({
		cfg,
		provider,
		modelId,
		agentId
	});
	const override = extraParamsOverride && Object.keys(extraParamsOverride).length > 0 ? Object.fromEntries(Object.entries(extraParamsOverride).filter(([, value]) => value !== void 0)) : void 0;
	const effectiveExtraParams = resolvePreparedExtraParams({
		cfg,
		provider,
		modelId,
		extraParamsOverride,
		thinkingLevel,
		agentId,
		resolvedExtraParams
	});
	const wrapperContext = {
		agent,
		cfg,
		provider,
		modelId,
		agentDir,
		workspaceDir,
		thinkingLevel,
		model,
		effectiveExtraParams,
		resolvedExtraParams,
		override
	};
	const providerStreamBase = agent.streamFn;
	const pluginWrappedStreamFn = providerRuntimeDeps.wrapProviderStreamFn({
		provider,
		config: cfg,
		context: {
			config: cfg,
			provider,
			modelId,
			extraParams: effectiveExtraParams,
			thinkingLevel,
			model,
			streamFn: providerStreamBase
		}
	});
	agent.streamFn = pluginWrappedStreamFn ?? providerStreamBase;
	applyPrePluginStreamWrappers(wrapperContext);
	const providerWrapperHandled = pluginWrappedStreamFn !== void 0 && pluginWrappedStreamFn !== providerStreamBase;
	applyPostPluginStreamWrappers({
		...wrapperContext,
		providerWrapperHandled
	});
	return { effectiveExtraParams };
}
//#endregion
//#region src/agents/tool-description-summary.ts
function normalizeSummaryWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}
function truncateSummary(value, maxLen = 120) {
	if (value.length <= maxLen) return value;
	const sliced = value.slice(0, maxLen - 3);
	const boundary = sliced.lastIndexOf(" ");
	return `${(boundary >= 48 ? sliced.slice(0, boundary) : sliced).trimEnd()}...`;
}
function isToolDocBlockStart(line) {
	const normalized = line.trim().toUpperCase();
	if (!normalized) return false;
	if (normalized === "ACTIONS:" || normalized === "JOB SCHEMA (FOR ADD ACTION):" || normalized === "JOB SCHEMA:" || normalized === "SESSION TARGET OPTIONS:" || normalized === "DEFAULT BEHAVIOR (UNCHANGED FOR BACKWARD COMPATIBILITY):" || normalized === "SCHEDULE TYPES (SCHEDULE.KIND):" || normalized === "PAYLOAD TYPES (PAYLOAD.KIND):" || normalized === "DELIVERY (TOP-LEVEL):" || normalized === "CRITICAL CONSTRAINTS:" || normalized === "WAKE MODES (FOR WAKE ACTION):") return true;
	return normalized.endsWith(":") && normalized === normalized.toUpperCase() && normalized.length > 12;
}
function summarizeToolDescriptionText(params) {
	const explicit = typeof params.displaySummary === "string" ? params.displaySummary.trim() : "";
	if (explicit) return truncateSummary(normalizeSummaryWhitespace(explicit), params.maxLen);
	const raw = typeof params.rawDescription === "string" ? params.rawDescription.trim() : "";
	if (!raw) return "Tool";
	const paragraphs = raw.split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean);
	for (const paragraph of paragraphs) {
		const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
		if (lines.length === 0) continue;
		const first = lines[0] ?? "";
		if (!first || isToolDocBlockStart(first)) continue;
		if (first.startsWith("{") || first.startsWith("[") || first.startsWith("- ")) continue;
		return truncateSummary(normalizeSummaryWhitespace(first), params.maxLen);
	}
	const firstLine = raw.split("\n").map((line) => line.trim()).find((line) => line.length > 0 && !isToolDocBlockStart(line) && !line.startsWith("{") && !line.startsWith("[") && !line.startsWith("- "));
	return firstLine ? truncateSummary(normalizeSummaryWhitespace(firstLine), params.maxLen) : "Tool";
}
function describeToolForVerbose(params) {
	const raw = typeof params.rawDescription === "string" ? params.rawDescription.trim() : "";
	if (!raw) return params.fallback;
	const lines = raw.split("\n").map((line) => line.trimEnd());
	const kept = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			if (kept.length > 0 && kept.at(-1) !== "") kept.push("");
			continue;
		}
		if (isToolDocBlockStart(trimmed) || trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("- ")) break;
		kept.push(trimmed);
		if (kept.join(" ").length >= (params.maxLen ?? 320)) break;
	}
	const normalized = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	if (!normalized) return params.fallback;
	const maxLen = params.maxLen ?? 320;
	if (normalized.length <= maxLen) return normalized;
	const sliced = normalized.slice(0, maxLen - 3);
	const boundary = sliced.lastIndexOf(" ");
	return `${(boundary >= Math.floor(maxLen / 2) ? sliced.slice(0, boundary) : sliced).trimEnd()}...`;
}
//#endregion
//#region src/auto-reply/fallback-state.ts
const FALLBACK_REASON_PART_MAX = 80;
function normalizeFallbackModelRef(value) {
	return String(value ?? "").trim() || void 0;
}
function truncateFallbackReasonPart(value, max = FALLBACK_REASON_PART_MAX) {
	const text = String(value ?? "").replace(/\s+/g, " ").trim();
	if (text.length <= max) return text;
	return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
function formatFallbackAttemptReason(attempt) {
	const reason = attempt.reason?.trim();
	if (reason) return reason.replace(/_/g, " ");
	const code = attempt.code?.trim();
	if (code) return code;
	if (typeof attempt.status === "number") return `HTTP ${attempt.status}`;
	return truncateFallbackReasonPart(attempt.error || "error");
}
function formatFallbackAttemptSummary(attempt) {
	return `${formatProviderModelRef(attempt.provider, attempt.model)} ${formatFallbackAttemptReason(attempt)}`;
}
function buildFallbackReasonSummary(attempts) {
	const firstAttempt = attempts[0];
	const firstReason = firstAttempt ? formatFallbackAttemptReason(firstAttempt) : "selected model unavailable";
	const moreAttempts = attempts.length > 1 ? ` (+${attempts.length - 1} more attempts)` : "";
	return `${truncateFallbackReasonPart(firstReason)}${moreAttempts}`;
}
function buildFallbackAttemptSummaries(attempts) {
	return attempts.map((attempt) => truncateFallbackReasonPart(formatFallbackAttemptSummary(attempt)));
}
function buildFallbackNotice(params) {
	const selected = formatProviderModelRef(params.selectedProvider, params.selectedModel);
	const active = formatProviderModelRef(params.activeProvider, params.activeModel);
	if (selected === active) return null;
	return `↪️ Model Fallback: ${active} (selected ${selected}; ${buildFallbackReasonSummary(params.attempts)})`;
}
function buildFallbackClearedNotice(params) {
	const selected = formatProviderModelRef(params.selectedProvider, params.selectedModel);
	const previous = normalizeFallbackModelRef(params.previousActiveModel);
	if (previous && previous !== selected) return `↪️ Model Fallback cleared: ${selected} (was ${previous})`;
	return `↪️ Model Fallback cleared: ${selected}`;
}
function resolveActiveFallbackState(params) {
	const selected = normalizeFallbackModelRef(params.state?.fallbackNoticeSelectedModel);
	const active = normalizeFallbackModelRef(params.state?.fallbackNoticeActiveModel);
	const reason = normalizeFallbackModelRef(params.state?.fallbackNoticeReason);
	const fallbackActive = params.selectedModelRef !== params.activeModelRef && selected === params.selectedModelRef && active === params.activeModelRef;
	return {
		active: fallbackActive,
		reason: fallbackActive ? reason : void 0
	};
}
function resolveFallbackTransition(params) {
	const selectedModelRef = formatProviderModelRef(params.selectedProvider, params.selectedModel);
	const activeModelRef = formatProviderModelRef(params.activeProvider, params.activeModel);
	const previousState = {
		selectedModel: normalizeFallbackModelRef(params.state?.fallbackNoticeSelectedModel),
		activeModel: normalizeFallbackModelRef(params.state?.fallbackNoticeActiveModel),
		reason: normalizeFallbackModelRef(params.state?.fallbackNoticeReason)
	};
	const fallbackActive = selectedModelRef !== activeModelRef;
	const fallbackTransitioned = fallbackActive && (previousState.selectedModel !== selectedModelRef || previousState.activeModel !== activeModelRef);
	const fallbackCleared = !fallbackActive && Boolean(previousState.selectedModel || previousState.activeModel);
	const reasonSummary = buildFallbackReasonSummary(params.attempts);
	const attemptSummaries = buildFallbackAttemptSummaries(params.attempts);
	const nextState = fallbackActive ? {
		selectedModel: selectedModelRef,
		activeModel: activeModelRef,
		reason: reasonSummary
	} : {
		selectedModel: void 0,
		activeModel: void 0,
		reason: void 0
	};
	return {
		selectedModelRef,
		activeModelRef,
		fallbackActive,
		fallbackTransitioned,
		fallbackCleared,
		reasonSummary,
		attemptSummaries,
		previousState,
		nextState,
		stateChanged: previousState.selectedModel !== nextState.selectedModel || previousState.activeModel !== nextState.activeModel || previousState.reason !== nextState.reason
	};
}
//#endregion
//#region src/auto-reply/status.ts
const formatTokenCount = formatTokenCount$1;
function normalizeAuthMode(value) {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return;
	if (normalized === "api-key" || normalized.startsWith("api-key ")) return "api-key";
	if (normalized === "oauth" || normalized.startsWith("oauth ")) return "oauth";
	if (normalized === "token" || normalized.startsWith("token ")) return "token";
	if (normalized === "aws-sdk" || normalized.startsWith("aws-sdk ")) return "aws-sdk";
	if (normalized === "mixed" || normalized.startsWith("mixed ")) return "mixed";
	if (normalized === "unknown") return "unknown";
}
function resolveConfiguredTextVerbosity(params) {
	const provider = params.provider?.trim();
	const model = params.model?.trim();
	if (!provider || !model || provider !== "openai" && provider !== "openai-codex") return;
	return resolveOpenAITextVerbosity(resolveExtraParams({
		cfg: params.config,
		provider,
		modelId: model,
		agentId: params.agentId
	}));
}
function resolveRuntimeLabel(args) {
	const sessionKey = args.sessionKey?.trim();
	if (args.config && sessionKey) {
		const runtimeStatus = resolveSandboxRuntimeStatus({
			cfg: args.config,
			sessionKey
		});
		const sandboxMode = runtimeStatus.mode ?? "off";
		if (sandboxMode === "off") return "direct";
		return `${runtimeStatus.sandboxed ? "docker" : sessionKey ? "direct" : "unknown"}/${sandboxMode}`;
	}
	const sandboxMode = args.agent?.sandbox?.mode ?? "off";
	if (sandboxMode === "off") return "direct";
	return `${(() => {
		if (!sessionKey) return false;
		if (sandboxMode === "all") return true;
		if (args.config) return resolveSandboxRuntimeStatus({
			cfg: args.config,
			sessionKey
		}).sandboxed;
		return sessionKey !== resolveMainSessionKey({ session: { scope: args.sessionScope ?? "per-sender" } }).trim();
	})() ? "docker" : sessionKey ? "direct" : "unknown"}/${sandboxMode}`;
}
const formatTokens = (total, contextTokens) => {
	const ctx = contextTokens ?? null;
	if (total == null) return `?/${ctx ? formatTokenCount(ctx) : "?"}`;
	const pct = ctx ? Math.min(999, Math.round(total / ctx * 100)) : null;
	return `${formatTokenCount(total)}/${ctx ? formatTokenCount(ctx) : "?"}${pct !== null ? ` (${pct}%)` : ""}`;
};
const formatContextUsageShort = (total, contextTokens) => `Context ${formatTokens(total, contextTokens ?? null)}`;
const formatQueueDetails = (queue) => {
	if (!queue) return "";
	const depth = typeof queue.depth === "number" ? `depth ${queue.depth}` : null;
	if (!queue.showDetails) return depth ? ` (${depth})` : "";
	const detailParts = [];
	if (depth) detailParts.push(depth);
	if (typeof queue.debounceMs === "number") {
		const ms = Math.max(0, Math.round(queue.debounceMs));
		const label = ms >= 1e3 ? `${ms % 1e3 === 0 ? ms / 1e3 : (ms / 1e3).toFixed(1)}s` : `${ms}ms`;
		detailParts.push(`debounce ${label}`);
	}
	if (typeof queue.cap === "number") detailParts.push(`cap ${queue.cap}`);
	if (queue.dropPolicy) detailParts.push(`drop ${queue.dropPolicy}`);
	return detailParts.length ? ` (${detailParts.join(" · ")})` : "";
};
const readUsageFromSessionLog = (sessionId, sessionEntry, agentId, sessionKey, storePath) => {
	if (!sessionId) return;
	let logPath;
	try {
		logPath = resolveSessionFilePath(sessionId, sessionEntry, resolveSessionFilePathOptions({
			agentId: agentId ?? (sessionKey ? resolveAgentIdFromSessionKey(sessionKey) : void 0),
			storePath
		}));
	} catch {
		return;
	}
	if (!fs.existsSync(logPath)) return;
	try {
		const TAIL_BYTES = 8192;
		const stat = fs.statSync(logPath);
		const offset = Math.max(0, stat.size - TAIL_BYTES);
		const buf = Buffer.alloc(Math.min(TAIL_BYTES, stat.size));
		const fd = fs.openSync(logPath, "r");
		try {
			fs.readSync(fd, buf, 0, buf.length, offset);
		} finally {
			fs.closeSync(fd);
		}
		const tail = buf.toString("utf-8");
		const lines = (offset > 0 ? tail.slice(tail.indexOf("\n") + 1) : tail).split(/\n+/);
		let input = 0;
		let output = 0;
		let promptTokens = 0;
		let model;
		let lastUsage;
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const parsed = JSON.parse(line);
				const usage = normalizeUsage(parsed.message?.usage ?? parsed.usage);
				if (usage) lastUsage = usage;
				model = parsed.message?.model ?? parsed.model ?? model;
			} catch {}
		}
		if (!lastUsage) return;
		input = lastUsage.input ?? 0;
		output = lastUsage.output ?? 0;
		promptTokens = derivePromptTokens(lastUsage) ?? lastUsage.total ?? input + output;
		const total = lastUsage.total ?? promptTokens + output;
		if (promptTokens === 0 && total === 0) return;
		return {
			input,
			output,
			cacheRead: lastUsage.cacheRead ?? 0,
			cacheWrite: lastUsage.cacheWrite ?? 0,
			promptTokens,
			total,
			model
		};
	} catch {
		return;
	}
};
const formatUsagePair = (input, output) => {
	if (input == null && output == null) return null;
	return `🧮 Tokens: ${typeof input === "number" ? formatTokenCount(input) : "?"} in / ${typeof output === "number" ? formatTokenCount(output) : "?"} out`;
};
const formatCacheLine = (input, cacheRead, cacheWrite) => {
	if (!cacheRead && !cacheWrite) return null;
	if ((typeof cacheRead !== "number" || cacheRead <= 0) && (typeof cacheWrite !== "number" || cacheWrite <= 0)) return null;
	const cachedLabel = typeof cacheRead === "number" ? formatTokenCount(cacheRead) : "0";
	const newLabel = typeof cacheWrite === "number" ? formatTokenCount(cacheWrite) : "0";
	const totalInput = (typeof cacheRead === "number" ? cacheRead : 0) + (typeof cacheWrite === "number" ? cacheWrite : 0) + (typeof input === "number" ? input : 0);
	return `🗄️ Cache: ${totalInput > 0 && typeof cacheRead === "number" ? Math.round(cacheRead / totalInput * 100) : 0}% hit · ${cachedLabel} cached, ${newLabel} new`;
};
const formatMediaUnderstandingLine = (decisions) => {
	if (!decisions || decisions.length === 0) return null;
	const parts = decisions.map((decision) => {
		const count = decision.attachments.length;
		const countLabel = count > 1 ? ` x${count}` : "";
		if (decision.outcome === "success") {
			const chosen = decision.attachments.find((entry) => entry.chosen)?.chosen;
			const provider = chosen?.provider?.trim();
			const model = chosen?.model?.trim();
			const modelLabel = provider ? model ? `${provider}/${model}` : provider : null;
			return `${decision.capability}${countLabel} ok${modelLabel ? ` (${modelLabel})` : ""}`;
		}
		if (decision.outcome === "no-attachment") return `${decision.capability} none`;
		if (decision.outcome === "disabled") return `${decision.capability} off`;
		if (decision.outcome === "scope-deny") return `${decision.capability} denied`;
		if (decision.outcome === "skipped") {
			const reason = decision.attachments.flatMap((entry) => entry.attempts.map((attempt) => attempt.reason).filter(Boolean)).find(Boolean);
			const shortReason = reason ? reason.split(":")[0]?.trim() : void 0;
			return `${decision.capability} skipped${shortReason ? ` (${shortReason})` : ""}`;
		}
		return null;
	}).filter((part) => part != null);
	if (parts.length === 0) return null;
	if (parts.every((part) => part.endsWith(" none"))) return null;
	return `📎 Media: ${parts.join(" · ")}`;
};
const formatVoiceModeLine = (config, sessionEntry) => {
	if (!config) return null;
	const snapshot = resolveStatusTtsSnapshot({
		cfg: config,
		sessionAuto: sessionEntry?.ttsAuto
	});
	if (!snapshot) return null;
	return `🔊 Voice: ${snapshot.autoMode} · provider=${snapshot.provider} · limit=${snapshot.maxLength} · summary=${snapshot.summarize ? "on" : "off"}`;
};
function buildStatusMessage(args) {
	const now = args.now ?? Date.now();
	const entry = args.sessionEntry;
	const selectionConfig = { agents: { defaults: args.agent ?? {} } };
	const contextConfig = args.config ? {
		...args.config,
		agents: {
			...args.config.agents,
			defaults: {
				...args.config.agents?.defaults,
				...args.agent
			}
		}
	} : { agents: { defaults: args.agent ?? {} } };
	const resolved = resolveConfiguredModelRef({
		cfg: selectionConfig,
		defaultProvider: DEFAULT_PROVIDER,
		defaultModel: DEFAULT_MODEL,
		allowPluginNormalization: false
	});
	const selectedProvider = entry?.providerOverride ?? resolved.provider ?? "openai";
	const selectedModel = entry?.modelOverride ?? resolved.model ?? "gpt-5.4";
	const modelRefs = resolveSelectedAndActiveModel({
		selectedProvider,
		selectedModel,
		sessionEntry: entry
	});
	const initialFallbackState = resolveActiveFallbackState({
		selectedModelRef: modelRefs.selected.label || "unknown",
		activeModelRef: modelRefs.active.label || "unknown",
		state: entry
	});
	let activeProvider = modelRefs.active.provider;
	let activeModel = modelRefs.active.model;
	let contextLookupProvider = activeProvider;
	let contextLookupModel = activeModel;
	const runtimeModelRaw = typeof entry?.model === "string" ? entry.model.trim() : "";
	const runtimeProviderRaw = typeof entry?.modelProvider === "string" ? entry.modelProvider.trim() : "";
	if (runtimeModelRaw && !runtimeProviderRaw && runtimeModelRaw.includes("/")) {
		const slashIndex = runtimeModelRaw.indexOf("/");
		const embeddedProvider = runtimeModelRaw.slice(0, slashIndex).trim().toLowerCase();
		const fallbackMatchesRuntimeModel = initialFallbackState.active && runtimeModelRaw.toLowerCase() === String(entry?.fallbackNoticeActiveModel ?? "").trim().toLowerCase();
		const runtimeMatchesSelectedModel = runtimeModelRaw.toLowerCase() === (modelRefs.selected.label || "unknown").toLowerCase();
		if ((fallbackMatchesRuntimeModel || runtimeMatchesSelectedModel) && embeddedProvider === activeProvider.toLowerCase()) {
			contextLookupProvider = activeProvider;
			contextLookupModel = activeModel;
		} else {
			contextLookupProvider = void 0;
			contextLookupModel = runtimeModelRaw;
		}
	}
	let inputTokens = entry?.inputTokens;
	let outputTokens = entry?.outputTokens;
	let cacheRead = entry?.cacheRead;
	let cacheWrite = entry?.cacheWrite;
	let totalTokens = entry?.totalTokens ?? (entry?.inputTokens ?? 0) + (entry?.outputTokens ?? 0);
	if (args.includeTranscriptUsage) {
		const logUsage = readUsageFromSessionLog(entry?.sessionId, entry, args.agentId, args.sessionKey, args.sessionStorePath);
		if (logUsage) {
			const candidate = logUsage.promptTokens || logUsage.total;
			if (!totalTokens || totalTokens === 0 || candidate > totalTokens) totalTokens = candidate;
			if (!entry?.model && logUsage.model) {
				const slashIndex = logUsage.model.indexOf("/");
				if (slashIndex > 0) {
					const provider = logUsage.model.slice(0, slashIndex).trim();
					const model = logUsage.model.slice(slashIndex + 1).trim();
					if (provider && model) {
						activeProvider = provider;
						activeModel = model;
						contextLookupProvider = void 0;
						contextLookupModel = logUsage.model;
					}
				} else {
					activeModel = logUsage.model;
					contextLookupProvider = activeProvider;
					contextLookupModel = logUsage.model;
				}
			}
			if (!inputTokens || inputTokens === 0) inputTokens = logUsage.input;
			if (!outputTokens || outputTokens === 0) outputTokens = logUsage.output;
			if (typeof cacheRead !== "number" || cacheRead <= 0) cacheRead = logUsage.cacheRead;
			if (typeof cacheWrite !== "number" || cacheWrite <= 0) cacheWrite = logUsage.cacheWrite;
		}
	}
	const activeModelLabel = formatProviderModelRef(activeProvider, activeModel) || "unknown";
	const runtimeDiffersFromSelected = activeModelLabel !== (modelRefs.selected.label || "unknown");
	const selectedContextTokens = resolveContextTokensForModel({
		cfg: contextConfig,
		provider: selectedProvider,
		model: selectedModel,
		allowAsyncLoad: false
	});
	const activeContextTokens = resolveContextTokensForModel({
		cfg: contextConfig,
		...contextLookupProvider ? { provider: contextLookupProvider } : {},
		model: contextLookupModel,
		allowAsyncLoad: false
	});
	const persistedContextTokens = typeof entry?.contextTokens === "number" && entry.contextTokens > 0 ? entry.contextTokens : void 0;
	const explicitRuntimeContextTokens = typeof args.runtimeContextTokens === "number" && args.runtimeContextTokens > 0 ? args.runtimeContextTokens : void 0;
	const explicitConfiguredContextTokens = typeof args.explicitConfiguredContextTokens === "number" && args.explicitConfiguredContextTokens > 0 ? args.explicitConfiguredContextTokens : void 0;
	const cappedConfiguredContextTokens = typeof explicitConfiguredContextTokens === "number" ? typeof activeContextTokens === "number" ? Math.min(explicitConfiguredContextTokens, activeContextTokens) : explicitConfiguredContextTokens : void 0;
	const contextTokens = runtimeDiffersFromSelected ? explicitRuntimeContextTokens ?? (() => {
		if (persistedContextTokens !== void 0) {
			if (typeof selectedContextTokens === "number" && persistedContextTokens === selectedContextTokens && typeof selectedContextTokens === "number" && typeof activeContextTokens === "number" && activeContextTokens !== selectedContextTokens && !(typeof explicitConfiguredContextTokens === "number" && explicitConfiguredContextTokens === persistedContextTokens)) return activeContextTokens;
			if (typeof activeContextTokens === "number") return Math.min(persistedContextTokens, activeContextTokens);
			return persistedContextTokens;
		}
		if (cappedConfiguredContextTokens !== void 0) return cappedConfiguredContextTokens;
		if (typeof activeContextTokens === "number") return activeContextTokens;
		return 2e5;
	})() : resolveContextTokensForModel({
		cfg: contextConfig,
		...contextLookupProvider ? { provider: contextLookupProvider } : {},
		model: contextLookupModel,
		contextTokensOverride: persistedContextTokens ?? args.agent?.contextTokens,
		fallbackContextTokens: 2e5,
		allowAsyncLoad: false
	}) ?? 2e5;
	const thinkLevel = args.resolvedThink ?? args.sessionEntry?.thinkingLevel ?? args.agent?.thinkingDefault ?? "off";
	const verboseLevel = args.resolvedVerbose ?? args.sessionEntry?.verboseLevel ?? args.agent?.verboseDefault ?? "off";
	const fastMode = args.resolvedFast ?? args.sessionEntry?.fastMode ?? false;
	const reasoningLevel = args.resolvedReasoning ?? args.sessionEntry?.reasoningLevel ?? "off";
	const elevatedLevel = args.resolvedElevated ?? args.sessionEntry?.elevatedLevel ?? args.agent?.elevatedDefault ?? "on";
	const runtime = { label: resolveRuntimeLabel(args) };
	const updatedAt = entry?.updatedAt;
	const sessionLine = [`Session: ${args.sessionKey ?? "unknown"}`, typeof updatedAt === "number" ? `updated ${formatTimeAgo(now - updatedAt)}` : "no activity"].filter(Boolean).join(" • ");
	const groupActivationValue = entry?.chatType === "group" || entry?.chatType === "channel" || Boolean(args.sessionKey?.includes(":group:")) || Boolean(args.sessionKey?.includes(":channel:")) ? args.groupActivation ?? entry?.groupActivation ?? "mention" : void 0;
	const contextLine = [`Context: ${formatTokens(totalTokens, contextTokens ?? null)}`, `🧹 Compactions: ${entry?.compactionCount ?? 0}`].filter(Boolean).join(" · ");
	const queueMode = args.queue?.mode ?? "unknown";
	const queueDetails = formatQueueDetails(args.queue);
	const verboseLabel = verboseLevel === "full" ? "verbose:full" : verboseLevel === "on" ? "verbose" : null;
	const elevatedLabel = elevatedLevel && elevatedLevel !== "off" ? elevatedLevel === "on" ? "elevated" : `elevated:${elevatedLevel}` : null;
	const textVerbosity = resolveConfiguredTextVerbosity({
		config: args.config,
		agentId: args.agentId,
		provider: activeProvider,
		model: activeModel
	});
	const optionsLine = [
		`Runtime: ${runtime.label}`,
		`Think: ${thinkLevel}`,
		fastMode ? "Fast: on" : null,
		textVerbosity ? `Text: ${textVerbosity}` : null,
		verboseLabel,
		reasoningLevel !== "off" ? `Reasoning: ${reasoningLevel}` : null,
		elevatedLabel
	].filter(Boolean).join(" · ");
	const activationLine = [groupActivationValue ? `👥 Activation: ${groupActivationValue}` : null, `🪢 Queue: ${queueMode}${queueDetails}`].filter(Boolean).join(" · ");
	const selectedAuthMode = normalizeAuthMode(args.modelAuth) ?? resolveModelAuthMode(selectedProvider, args.config);
	const selectedAuthLabelValue = args.modelAuth ?? (selectedAuthMode && selectedAuthMode !== "unknown" ? selectedAuthMode : void 0);
	const activeAuthMode = normalizeAuthMode(args.activeModelAuth) ?? resolveModelAuthMode(activeProvider, args.config);
	const activeAuthLabelValue = args.activeModelAuth ?? (activeAuthMode && activeAuthMode !== "unknown" ? activeAuthMode : void 0);
	const selectedModelLabel = modelRefs.selected.label || "unknown";
	const fallbackState = resolveActiveFallbackState({
		selectedModelRef: selectedModelLabel,
		activeModelRef: activeModelLabel,
		state: entry
	});
	const effectiveCostAuthMode = fallbackState.active ? activeAuthMode : selectedAuthMode ?? activeAuthMode;
	const showCost = effectiveCostAuthMode === "api-key" || effectiveCostAuthMode === "mixed";
	const costConfig = showCost ? resolveModelCostConfig({
		provider: activeProvider,
		model: activeModel,
		config: args.config,
		allowPluginNormalization: false
	}) : void 0;
	const hasUsage = typeof inputTokens === "number" || typeof outputTokens === "number";
	const cost = showCost && hasUsage ? estimateUsageCost({
		usage: {
			input: inputTokens ?? void 0,
			output: outputTokens ?? void 0
		},
		cost: costConfig
	}) : void 0;
	const costLabel = showCost && hasUsage ? formatUsd(cost) : void 0;
	const selectedAuthLabel = selectedAuthLabelValue ? ` · 🔑 ${selectedAuthLabelValue}` : "";
	const channelModelNote = (() => {
		if (!args.config || !entry) return;
		if (entry.modelOverride?.trim() || entry.providerOverride?.trim()) return;
		const channelOverride = resolveChannelModelOverride({
			cfg: args.config,
			channel: entry.channel ?? entry.origin?.provider,
			groupId: entry.groupId,
			groupChatType: entry.chatType ?? entry.origin?.chatType,
			groupChannel: entry.groupChannel,
			groupSubject: entry.subject,
			parentSessionKey: args.parentSessionKey
		});
		if (!channelOverride) return;
		const aliasIndex = buildModelAliasIndex({
			cfg: args.config,
			defaultProvider: DEFAULT_PROVIDER,
			allowPluginNormalization: false
		});
		const resolvedOverride = resolveModelRefFromString({
			raw: channelOverride.model,
			defaultProvider: DEFAULT_PROVIDER,
			aliasIndex,
			allowPluginNormalization: false
		});
		if (!resolvedOverride) return;
		if (resolvedOverride.ref.provider !== selectedProvider || resolvedOverride.ref.model !== selectedModel) return;
		return "channel override";
	})();
	const modelLine = `🧠 Model: ${selectedModelLabel}${selectedAuthLabel}${channelModelNote ? ` · ${channelModelNote}` : ""}`;
	const showFallbackAuth = activeAuthLabelValue && activeAuthLabelValue !== selectedAuthLabelValue;
	const fallbackLine = fallbackState.active ? `↪️ Fallback: ${activeModelLabel}${showFallbackAuth ? ` · 🔑 ${activeAuthLabelValue}` : ""} (${fallbackState.reason ?? "selected model unavailable"})` : null;
	const commit = resolveCommitHash({ moduleUrl: import.meta.url });
	const versionLine = `🦞 OpenClaw ${VERSION}${commit ? ` (${commit})` : ""}`;
	const usagePair = formatUsagePair(inputTokens, outputTokens);
	const cacheLine = formatCacheLine(inputTokens, cacheRead, cacheWrite);
	const costLine = costLabel ? `💵 Cost: ${costLabel}` : null;
	const usageCostLine = usagePair && costLine ? `${usagePair} · ${costLine}` : usagePair ?? costLine;
	const mediaLine = formatMediaUnderstandingLine(args.mediaDecisions);
	const voiceLine = formatVoiceModeLine(args.config, args.sessionEntry);
	return [
		versionLine,
		args.timeLine,
		modelLine,
		fallbackLine,
		usageCostLine,
		cacheLine,
		`📚 ${contextLine}`,
		mediaLine,
		args.usageLine,
		`🧵 ${sessionLine}`,
		args.subagentsLine,
		args.taskLine,
		`⚙️ ${optionsLine}`,
		voiceLine,
		activationLine
	].filter(Boolean).join("\n");
}
const CATEGORY_LABELS = {
	session: "Session",
	options: "Options",
	status: "Status",
	management: "Management",
	media: "Media",
	tools: "Tools",
	docks: "Docks"
};
const CATEGORY_ORDER = [
	"session",
	"options",
	"status",
	"management",
	"media",
	"tools",
	"docks"
];
function groupCommandsByCategory(commands) {
	const grouped = /* @__PURE__ */ new Map();
	for (const category of CATEGORY_ORDER) grouped.set(category, []);
	for (const command of commands) {
		const category = command.category ?? "tools";
		const list = grouped.get(category) ?? [];
		list.push(command);
		grouped.set(category, list);
	}
	return grouped;
}
function buildHelpMessage(cfg) {
	const lines = ["ℹ️ Help", ""];
	lines.push("Session");
	lines.push("  /new  |  /reset  |  /compact [instructions]  |  /stop");
	lines.push("");
	const optionParts = [
		"/think <level>",
		"/model <id>",
		"/fast status|on|off",
		"/verbose on|off"
	];
	if (isCommandFlagEnabled(cfg, "config")) optionParts.push("/config");
	if (isCommandFlagEnabled(cfg, "debug")) optionParts.push("/debug");
	lines.push("Options");
	lines.push(`  ${optionParts.join("  |  ")}`);
	lines.push("");
	lines.push("Status");
	lines.push("  /status  |  /tasks  |  /whoami  |  /context");
	lines.push("");
	lines.push("Skills");
	lines.push("  /skill <name> [input]");
	lines.push("");
	lines.push("More: /commands for full list, /tools for available capabilities");
	return lines.join("\n");
}
const COMMANDS_PER_PAGE = 8;
function sortToolsMessageItems(items) {
	return items.toSorted((a, b) => a.name.localeCompare(b.name));
}
function formatCompactToolEntry(tool) {
	if (tool.source === "plugin") return tool.pluginId ? `${tool.id} (${tool.pluginId})` : tool.id;
	if (tool.source === "channel") return tool.channelId ? `${tool.id} (${tool.channelId})` : tool.id;
	return tool.id;
}
function formatVerboseToolDescription(tool) {
	return describeToolForVerbose({
		rawDescription: tool.rawDescription,
		fallback: tool.description
	});
}
function buildToolsMessage(result, options) {
	const groups = result.groups.map((group) => ({
		label: group.label,
		tools: sortToolsMessageItems(group.tools.map((tool) => ({
			id: normalizeToolName(tool.id),
			name: tool.label,
			description: tool.description || "Tool",
			rawDescription: tool.rawDescription || tool.description || "Tool",
			source: tool.source,
			pluginId: tool.pluginId,
			channelId: tool.channelId
		})))
	})).filter((group) => group.tools.length > 0);
	if (groups.length === 0) return [
		"No tools are available for this agent right now.",
		"",
		`Profile: ${result.profile}`
	].join("\n");
	const verbose = options?.verbose === true;
	const lines = verbose ? [
		"Available tools",
		"",
		`Profile: ${result.profile}`,
		"What this agent can use right now:"
	] : [
		"Available tools",
		"",
		`Profile: ${result.profile}`
	];
	for (const group of groups) {
		lines.push("", group.label);
		if (verbose) {
			for (const tool of group.tools) lines.push(`  ${tool.name} - ${formatVerboseToolDescription(tool)}`);
			continue;
		}
		lines.push(`  ${group.tools.map((tool) => formatCompactToolEntry(tool)).join(", ")}`);
	}
	if (verbose) lines.push("", "Tool availability depends on this agent's configuration.");
	else lines.push("", "Use /tools verbose for descriptions.");
	return lines.join("\n");
}
function formatCommandEntry(command) {
	const primary = command.nativeName ? `/${command.nativeName}` : command.textAliases[0]?.trim() || `/${command.key}`;
	const seen = /* @__PURE__ */ new Set();
	const aliases = command.textAliases.map((alias) => alias.trim()).filter(Boolean).filter((alias) => alias.toLowerCase() !== primary.toLowerCase()).filter((alias) => {
		const key = alias.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return `${primary}${aliases.length ? ` (${aliases.join(", ")})` : ""}${command.scope === "text" ? " [text]" : ""} - ${command.description}`;
}
function buildCommandItems(commands, pluginCommands) {
	const grouped = groupCommandsByCategory(commands);
	const items = [];
	for (const category of CATEGORY_ORDER) {
		const categoryCommands = grouped.get(category) ?? [];
		if (categoryCommands.length === 0) continue;
		const label = CATEGORY_LABELS[category];
		for (const command of categoryCommands) items.push({
			label,
			text: formatCommandEntry(command)
		});
	}
	for (const command of pluginCommands) {
		const pluginLabel = command.pluginId ? ` (${command.pluginId})` : "";
		items.push({
			label: "Plugins",
			text: `/${command.name}${pluginLabel} - ${command.description}`
		});
	}
	return items;
}
function formatCommandList(items) {
	const lines = [];
	let currentLabel = null;
	for (const item of items) {
		if (item.label !== currentLabel) {
			if (lines.length > 0) lines.push("");
			lines.push(item.label);
			currentLabel = item.label;
		}
		lines.push(`  ${item.text}`);
	}
	return lines.join("\n");
}
function buildCommandsMessage(cfg, skillCommands, options) {
	return buildCommandsMessagePaginated(cfg, skillCommands, options).text;
}
function buildCommandsMessagePaginated(cfg, skillCommands, options) {
	const page = Math.max(1, options?.page ?? 1);
	const surface = options?.surface?.toLowerCase();
	const prefersPaginatedList = options?.forcePaginatedList === true || Boolean(surface && getChannelPlugin(surface)?.commands?.buildCommandsListChannelData);
	const items = buildCommandItems(cfg ? listChatCommandsForConfig(cfg, { skillCommands }) : listChatCommands({ skillCommands }), listPluginCommands());
	if (!prefersPaginatedList) {
		const lines = ["ℹ️ Slash commands", ""];
		lines.push(formatCommandList(items));
		lines.push("", "More: /tools for available capabilities");
		return {
			text: lines.join("\n").trim(),
			totalPages: 1,
			currentPage: 1,
			hasNext: false,
			hasPrev: false
		};
	}
	const totalCommands = items.length;
	const totalPages = Math.max(1, Math.ceil(totalCommands / COMMANDS_PER_PAGE));
	const currentPage = Math.min(page, totalPages);
	const startIndex = (currentPage - 1) * COMMANDS_PER_PAGE;
	const endIndex = startIndex + COMMANDS_PER_PAGE;
	const pageItems = items.slice(startIndex, endIndex);
	const lines = [`ℹ️ Commands (${currentPage}/${totalPages})`, ""];
	lines.push(formatCommandList(pageItems));
	return {
		text: lines.join("\n").trim(),
		totalPages,
		currentPage,
		hasNext: currentPage < totalPages,
		hasPrev: currentPage > 1
	};
}
//#endregion
export { buildToolsMessage as a, buildFallbackClearedNotice as c, summarizeToolDescriptionText as d, applyExtraParamsToAgent as f, resolveCacheRetention as h, buildStatusMessage as i, buildFallbackNotice as l, isGooglePromptCacheEligible as m, buildCommandsMessagePaginated as n, formatContextUsageShort as o, resolveAgentTransportOverride as p, buildHelpMessage as r, formatTokenCount as s, buildCommandsMessage as t, resolveFallbackTransition as u };
