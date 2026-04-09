import "./model-selection-BVM4eHHo.js";
import "./defaults-I0_TmVEm.js";
import { n as findNormalizedProviderValue, r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { i as normalizeModelCompat } from "./provider-model-compat-ddK_un1r.js";
import { n as normalizeStaticProviderModelId } from "./model-ref-shared-CPgWlDyj.js";
import { H as runProviderDynamicModel, _ as normalizeProviderResolvedModelWithPlugin, b as prepareProviderDynamicModel, c as buildProviderUnknownModelHintWithPlugin, i as applyProviderResolvedTransportWithPlugin, r as applyProviderResolvedModelCompatWithPlugins, u as clearProviderRuntimeHookCache, y as normalizeProviderTransportWithPlugin } from "./provider-runtime-SgdEL2pb.js";
import { t as resolveOpenClawAgentDir } from "./agent-paths-BQP0rGzW.js";
import { f as isSecretRefHeaderValueMarker } from "./model-auth-markers-DBBQxeVp.js";
import { i as discoverModels, r as discoverAuthStorage } from "./pi-model-discovery-DD-HA-nv.js";
import { l as sanitizeConfiguredModelProviderRequest, s as resolveProviderRequestConfig, t as attachModelProviderRequestTransport } from "./provider-request-config-BRDGCVdB.js";
import { n as normalizeGoogleApiBaseUrl } from "./google-api-base-url-DQpGB4Lb.js";
import { n as shouldSuppressBuiltInModel, t as buildSuppressedBuiltInModelError } from "./model-suppression-UFWYusPX.js";
//#region src/agents/model-alias-lines.ts
function buildModelAliasLines(cfg) {
	const models = cfg?.agents?.defaults?.models ?? {};
	const entries = [];
	for (const [keyRaw, entryRaw] of Object.entries(models)) {
		const model = String(keyRaw ?? "").trim();
		if (!model) continue;
		const alias = String(entryRaw?.alias ?? "").trim();
		if (!alias) continue;
		entries.push({
			alias,
			model
		});
	}
	return entries.toSorted((a, b) => a.alias.localeCompare(b.alias)).map((entry) => `- ${entry.alias}: ${entry.model}`);
}
//#endregion
//#region src/agents/pi-embedded-runner/model.inline-provider.ts
function normalizeResolvedTransportApi(api) {
	switch (api) {
		case "anthropic-messages":
		case "bedrock-converse-stream":
		case "github-copilot":
		case "google-generative-ai":
		case "ollama":
		case "openai-codex-responses":
		case "openai-completions":
		case "openai-responses":
		case "azure-openai-responses": return api;
		default: return;
	}
}
function sanitizeModelHeaders(headers, opts) {
	if (!headers || typeof headers !== "object" || Array.isArray(headers)) return;
	const next = {};
	for (const [headerName, headerValue] of Object.entries(headers)) {
		if (typeof headerValue !== "string") continue;
		if (opts?.stripSecretRefMarkers && isSecretRefHeaderValueMarker(headerValue)) continue;
		next[headerName] = headerValue;
	}
	return Object.keys(next).length > 0 ? next : void 0;
}
function isLegacyFoundryVisionModelCandidate(params) {
	if (params.provider?.trim().toLowerCase() !== "microsoft-foundry") return false;
	return [params.modelId, params.modelName].filter((value) => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean).some((candidate) => candidate.startsWith("gpt-") || candidate.startsWith("o1") || candidate.startsWith("o3") || candidate.startsWith("o4") || candidate === "computer-use-preview");
}
function resolveProviderModelInput(params) {
	const resolvedInput = Array.isArray(params.input) ? params.input : params.fallbackInput;
	const normalizedInput = Array.isArray(resolvedInput) ? resolvedInput.filter((item) => item === "text" || item === "image") : [];
	if (normalizedInput.length > 0 && !normalizedInput.includes("image") && isLegacyFoundryVisionModelCandidate(params)) return ["text", "image"];
	return normalizedInput.length > 0 ? normalizedInput : ["text"];
}
function resolveInlineProviderTransport(params) {
	const api = normalizeResolvedTransportApi(params.api);
	return {
		api,
		baseUrl: api === "google-generative-ai" ? normalizeGoogleApiBaseUrl(params.baseUrl) : params.baseUrl
	};
}
function buildInlineProviderModels(providers) {
	return Object.entries(providers).flatMap(([providerId, entry]) => {
		const trimmed = providerId.trim();
		if (!trimmed) return [];
		const providerHeaders = sanitizeModelHeaders(entry?.headers, { stripSecretRefMarkers: true });
		const providerRequest = sanitizeConfiguredModelProviderRequest(entry?.request);
		return (entry?.models ?? []).map((model) => {
			const transport = resolveInlineProviderTransport({
				api: model.api ?? entry?.api,
				baseUrl: entry?.baseUrl
			});
			const modelHeaders = sanitizeModelHeaders(model.headers, { stripSecretRefMarkers: true });
			const requestConfig = resolveProviderRequestConfig({
				provider: trimmed,
				api: transport.api ?? model.api,
				baseUrl: transport.baseUrl,
				providerHeaders,
				modelHeaders,
				authHeader: entry?.authHeader,
				request: providerRequest,
				capability: "llm",
				transport: "stream"
			});
			return attachModelProviderRequestTransport({
				...model,
				input: resolveProviderModelInput({
					provider: trimmed,
					modelId: model.id,
					modelName: model.name,
					input: model.input
				}),
				provider: trimmed,
				baseUrl: requestConfig.baseUrl ?? transport.baseUrl,
				api: requestConfig.api ?? model.api,
				headers: requestConfig.headers
			}, providerRequest);
		});
	});
}
//#endregion
//#region src/agents/pi-embedded-runner/model.provider-normalization.ts
function normalizeResolvedProviderModel(params) {
	return normalizeModelCompat(params.model);
}
//#endregion
//#region src/agents/pi-embedded-runner/model.ts
const DEFAULT_PROVIDER_RUNTIME_HOOKS = {
	applyProviderResolvedModelCompatWithPlugins,
	applyProviderResolvedTransportWithPlugin,
	buildProviderUnknownModelHintWithPlugin,
	clearProviderRuntimeHookCache,
	prepareProviderDynamicModel,
	runProviderDynamicModel,
	normalizeProviderResolvedModelWithPlugin,
	normalizeProviderTransportWithPlugin
};
const STATIC_PROVIDER_RUNTIME_HOOKS = {
	applyProviderResolvedModelCompatWithPlugins: () => void 0,
	applyProviderResolvedTransportWithPlugin: () => void 0,
	buildProviderUnknownModelHintWithPlugin: () => void 0,
	clearProviderRuntimeHookCache: () => {},
	prepareProviderDynamicModel: async () => {},
	runProviderDynamicModel: () => void 0,
	normalizeProviderResolvedModelWithPlugin: () => void 0,
	normalizeProviderTransportWithPlugin: () => void 0
};
function resolveRuntimeHooks(params) {
	if (params?.skipProviderRuntimeHooks) return STATIC_PROVIDER_RUNTIME_HOOKS;
	return params?.runtimeHooks ?? DEFAULT_PROVIDER_RUNTIME_HOOKS;
}
function applyResolvedTransportFallback(params) {
	const normalized = params.runtimeHooks.normalizeProviderTransportWithPlugin({
		provider: params.provider,
		config: params.cfg,
		context: {
			provider: params.provider,
			api: params.model.api,
			baseUrl: params.model.baseUrl
		}
	});
	if (!normalized) return;
	const nextApi = normalizeResolvedTransportApi(normalized.api) ?? params.model.api;
	const nextBaseUrl = normalized.baseUrl ?? params.model.baseUrl;
	if (nextApi === params.model.api && nextBaseUrl === params.model.baseUrl) return;
	return {
		...params.model,
		api: nextApi,
		baseUrl: nextBaseUrl
	};
}
function normalizeResolvedModel(params) {
	const normalizedInputModel = {
		...params.model,
		input: resolveProviderModelInput({
			provider: params.provider,
			modelId: params.model.id,
			modelName: params.model.name,
			input: params.model.input
		})
	};
	const runtimeHooks = params.runtimeHooks ?? DEFAULT_PROVIDER_RUNTIME_HOOKS;
	const pluginNormalized = runtimeHooks.normalizeProviderResolvedModelWithPlugin({
		provider: params.provider,
		config: params.cfg,
		context: {
			config: params.cfg,
			agentDir: params.agentDir,
			provider: params.provider,
			modelId: normalizedInputModel.id,
			model: normalizedInputModel
		}
	});
	const compatNormalized = runtimeHooks.applyProviderResolvedModelCompatWithPlugins?.({
		provider: params.provider,
		config: params.cfg,
		context: {
			config: params.cfg,
			agentDir: params.agentDir,
			provider: params.provider,
			modelId: normalizedInputModel.id,
			model: pluginNormalized ?? normalizedInputModel
		}
	});
	const fallbackTransportNormalized = runtimeHooks.applyProviderResolvedTransportWithPlugin?.({
		provider: params.provider,
		config: params.cfg,
		context: {
			config: params.cfg,
			agentDir: params.agentDir,
			provider: params.provider,
			modelId: normalizedInputModel.id,
			model: compatNormalized ?? pluginNormalized ?? normalizedInputModel
		}
	}) ?? applyResolvedTransportFallback({
		provider: params.provider,
		cfg: params.cfg,
		runtimeHooks,
		model: compatNormalized ?? pluginNormalized ?? normalizedInputModel
	});
	return normalizeResolvedProviderModel({
		provider: params.provider,
		model: fallbackTransportNormalized ?? compatNormalized ?? pluginNormalized ?? normalizedInputModel
	});
}
function resolveProviderTransport(params) {
	const normalized = (params.runtimeHooks ?? DEFAULT_PROVIDER_RUNTIME_HOOKS).normalizeProviderTransportWithPlugin({
		provider: params.provider,
		config: params.cfg,
		context: {
			provider: params.provider,
			api: params.api,
			baseUrl: params.baseUrl
		}
	});
	return {
		api: normalizeResolvedTransportApi(normalized?.api ?? params.api),
		baseUrl: normalized?.baseUrl ?? params.baseUrl
	};
}
function findInlineModelMatch(params) {
	const inlineModels = buildInlineProviderModels(params.providers);
	const exact = inlineModels.find((entry) => entry.provider === params.provider && entry.id === params.modelId);
	if (exact) return exact;
	const normalizedProvider = normalizeProviderId(params.provider);
	return inlineModels.find((entry) => normalizeProviderId(entry.provider) === normalizedProvider && entry.id === params.modelId);
}
function resolveConfiguredProviderConfig(cfg, provider) {
	const configuredProviders = cfg?.models?.providers;
	if (!configuredProviders) return;
	const exactProviderConfig = configuredProviders[provider];
	if (exactProviderConfig) return exactProviderConfig;
	return findNormalizedProviderValue(configuredProviders, provider);
}
function applyConfiguredProviderOverrides(params) {
	const { discoveredModel, providerConfig, modelId } = params;
	if (!providerConfig) return {
		...discoveredModel,
		headers: sanitizeModelHeaders(discoveredModel.headers, { stripSecretRefMarkers: true })
	};
	const configuredModel = providerConfig.models?.find((candidate) => candidate.id === modelId);
	const discoveredHeaders = sanitizeModelHeaders(discoveredModel.headers, { stripSecretRefMarkers: true });
	const providerHeaders = sanitizeModelHeaders(providerConfig.headers, { stripSecretRefMarkers: true });
	const providerRequest = sanitizeConfiguredModelProviderRequest(providerConfig.request);
	const configuredHeaders = sanitizeModelHeaders(configuredModel?.headers, { stripSecretRefMarkers: true });
	if (!configuredModel && !providerConfig.baseUrl && !providerConfig.api && !providerHeaders && !providerRequest) return {
		...discoveredModel,
		headers: discoveredHeaders
	};
	const normalizedInput = resolveProviderModelInput({
		provider: params.provider,
		modelId,
		modelName: configuredModel?.name ?? discoveredModel.name,
		input: configuredModel?.input,
		fallbackInput: discoveredModel.input
	});
	const resolvedTransport = resolveProviderTransport({
		provider: params.provider,
		api: configuredModel?.api ?? providerConfig.api ?? discoveredModel.api,
		baseUrl: providerConfig.baseUrl ?? discoveredModel.baseUrl,
		cfg: params.cfg,
		runtimeHooks: params.runtimeHooks
	});
	const requestConfig = resolveProviderRequestConfig({
		provider: params.provider,
		api: resolvedTransport.api ?? normalizeResolvedTransportApi(discoveredModel.api) ?? "openai-responses",
		baseUrl: resolvedTransport.baseUrl ?? discoveredModel.baseUrl,
		discoveredHeaders,
		providerHeaders,
		modelHeaders: configuredHeaders,
		authHeader: providerConfig.authHeader,
		request: providerRequest,
		capability: "llm",
		transport: "stream"
	});
	return attachModelProviderRequestTransport({
		...discoveredModel,
		api: requestConfig.api ?? "openai-responses",
		baseUrl: requestConfig.baseUrl ?? discoveredModel.baseUrl,
		reasoning: configuredModel?.reasoning ?? discoveredModel.reasoning,
		input: normalizedInput,
		cost: configuredModel?.cost ?? discoveredModel.cost,
		contextWindow: configuredModel?.contextWindow ?? discoveredModel.contextWindow,
		contextTokens: configuredModel?.contextTokens ?? discoveredModel.contextTokens,
		maxTokens: configuredModel?.maxTokens ?? discoveredModel.maxTokens,
		headers: requestConfig.headers,
		compat: configuredModel?.compat ?? discoveredModel.compat
	}, providerRequest);
}
function resolveExplicitModelWithRegistry(params) {
	const { provider, modelId, modelRegistry, cfg, agentDir, runtimeHooks } = params;
	if (shouldSuppressBuiltInModel({
		provider,
		id: modelId
	})) return { kind: "suppressed" };
	const providerConfig = resolveConfiguredProviderConfig(cfg, provider);
	const inlineMatch = findInlineModelMatch({
		providers: cfg?.models?.providers ?? {},
		provider,
		modelId
	});
	if (inlineMatch?.api) return {
		kind: "resolved",
		model: normalizeResolvedModel({
			provider,
			cfg,
			agentDir,
			model: inlineMatch,
			runtimeHooks
		})
	};
	const model = modelRegistry.find(provider, modelId);
	if (model) return {
		kind: "resolved",
		model: normalizeResolvedModel({
			provider,
			cfg,
			agentDir,
			model: applyConfiguredProviderOverrides({
				provider,
				discoveredModel: model,
				providerConfig,
				modelId,
				cfg,
				runtimeHooks
			}),
			runtimeHooks
		})
	};
	const fallbackInlineMatch = findInlineModelMatch({
		providers: cfg?.models?.providers ?? {},
		provider,
		modelId
	});
	if (fallbackInlineMatch?.api) return {
		kind: "resolved",
		model: normalizeResolvedModel({
			provider,
			cfg,
			agentDir,
			model: fallbackInlineMatch,
			runtimeHooks
		})
	};
}
function resolvePluginDynamicModelWithRegistry(params) {
	const { provider, modelId, modelRegistry, cfg, agentDir } = params;
	const runtimeHooks = params.runtimeHooks ?? DEFAULT_PROVIDER_RUNTIME_HOOKS;
	const providerConfig = resolveConfiguredProviderConfig(cfg, provider);
	const pluginDynamicModel = runtimeHooks.runProviderDynamicModel({
		provider,
		config: cfg,
		context: {
			config: cfg,
			agentDir,
			provider,
			modelId,
			modelRegistry,
			providerConfig
		}
	});
	if (!pluginDynamicModel) return;
	return normalizeResolvedModel({
		provider,
		cfg,
		agentDir,
		model: applyConfiguredProviderOverrides({
			provider,
			discoveredModel: pluginDynamicModel,
			providerConfig,
			modelId,
			cfg,
			runtimeHooks
		}),
		runtimeHooks
	});
}
function resolveConfiguredFallbackModel(params) {
	const { provider, modelId, cfg, agentDir, runtimeHooks } = params;
	const providerConfig = resolveConfiguredProviderConfig(cfg, provider);
	const configuredModel = providerConfig?.models?.find((candidate) => candidate.id === modelId);
	const providerHeaders = sanitizeModelHeaders(providerConfig?.headers, { stripSecretRefMarkers: true });
	const providerRequest = sanitizeConfiguredModelProviderRequest(providerConfig?.request);
	const modelHeaders = sanitizeModelHeaders(configuredModel?.headers, { stripSecretRefMarkers: true });
	if (!providerConfig && !modelId.startsWith("mock-")) return;
	const fallbackTransport = resolveProviderTransport({
		provider,
		api: providerConfig?.api ?? "openai-responses",
		baseUrl: providerConfig?.baseUrl,
		cfg,
		runtimeHooks
	});
	const requestConfig = resolveProviderRequestConfig({
		provider,
		api: fallbackTransport.api ?? "openai-responses",
		baseUrl: fallbackTransport.baseUrl,
		providerHeaders,
		modelHeaders,
		authHeader: providerConfig?.authHeader,
		request: providerRequest,
		capability: "llm",
		transport: "stream"
	});
	return normalizeResolvedModel({
		provider,
		cfg,
		agentDir,
		model: attachModelProviderRequestTransport({
			id: modelId,
			name: modelId,
			api: requestConfig.api ?? "openai-responses",
			provider,
			baseUrl: requestConfig.baseUrl,
			reasoning: configuredModel?.reasoning ?? false,
			input: resolveProviderModelInput({
				provider,
				modelId,
				modelName: configuredModel?.name ?? modelId,
				input: configuredModel?.input
			}),
			cost: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0
			},
			contextWindow: configuredModel?.contextWindow ?? providerConfig?.models?.[0]?.contextWindow ?? 2e5,
			contextTokens: configuredModel?.contextTokens ?? providerConfig?.models?.[0]?.contextTokens,
			maxTokens: configuredModel?.maxTokens ?? providerConfig?.models?.[0]?.maxTokens ?? 2e5,
			headers: requestConfig.headers
		}, providerRequest),
		runtimeHooks
	});
}
function resolveModelWithRegistry(params) {
	const normalizedRef = {
		provider: params.provider,
		model: normalizeStaticProviderModelId(normalizeProviderId(params.provider), params.modelId)
	};
	const normalizedParams = {
		...params,
		provider: normalizedRef.provider,
		modelId: normalizedRef.model
	};
	const explicitModel = resolveExplicitModelWithRegistry(normalizedParams);
	if (explicitModel?.kind === "suppressed") return;
	if (explicitModel?.kind === "resolved") return explicitModel.model;
	const pluginDynamicModel = resolvePluginDynamicModelWithRegistry(normalizedParams);
	if (pluginDynamicModel) return pluginDynamicModel;
	return resolveConfiguredFallbackModel(normalizedParams);
}
function resolveModel(provider, modelId, agentDir, cfg, options) {
	const normalizedRef = {
		provider,
		model: normalizeStaticProviderModelId(normalizeProviderId(provider), modelId)
	};
	const resolvedAgentDir = agentDir ?? resolveOpenClawAgentDir();
	const authStorage = options?.authStorage ?? discoverAuthStorage(resolvedAgentDir);
	const modelRegistry = options?.modelRegistry ?? discoverModels(authStorage, resolvedAgentDir);
	const runtimeHooks = resolveRuntimeHooks(options);
	const model = resolveModelWithRegistry({
		provider: normalizedRef.provider,
		modelId: normalizedRef.model,
		modelRegistry,
		cfg,
		agentDir: resolvedAgentDir,
		runtimeHooks
	});
	if (model) return {
		model,
		authStorage,
		modelRegistry
	};
	return {
		error: buildUnknownModelError({
			provider: normalizedRef.provider,
			modelId: normalizedRef.model,
			cfg,
			agentDir: resolvedAgentDir,
			runtimeHooks
		}),
		authStorage,
		modelRegistry
	};
}
async function resolveModelAsync(provider, modelId, agentDir, cfg, options) {
	const normalizedRef = {
		provider,
		model: normalizeStaticProviderModelId(normalizeProviderId(provider), modelId)
	};
	const resolvedAgentDir = agentDir ?? resolveOpenClawAgentDir();
	const authStorage = options?.authStorage ?? discoverAuthStorage(resolvedAgentDir);
	const modelRegistry = options?.modelRegistry ?? discoverModels(authStorage, resolvedAgentDir);
	const runtimeHooks = resolveRuntimeHooks(options);
	const explicitModel = resolveExplicitModelWithRegistry({
		provider: normalizedRef.provider,
		modelId: normalizedRef.model,
		modelRegistry,
		cfg,
		agentDir: resolvedAgentDir,
		runtimeHooks
	});
	if (explicitModel?.kind === "suppressed") return {
		error: buildUnknownModelError({
			provider: normalizedRef.provider,
			modelId: normalizedRef.model,
			cfg,
			agentDir: resolvedAgentDir,
			runtimeHooks
		}),
		authStorage,
		modelRegistry
	};
	const providerConfig = resolveConfiguredProviderConfig(cfg, normalizedRef.provider);
	const resolveDynamicAttempt = async (attemptOptions) => {
		if (attemptOptions?.clearHookCache) runtimeHooks.clearProviderRuntimeHookCache();
		await runtimeHooks.prepareProviderDynamicModel({
			provider: normalizedRef.provider,
			config: cfg,
			context: {
				config: cfg,
				agentDir: resolvedAgentDir,
				provider: normalizedRef.provider,
				modelId: normalizedRef.model,
				modelRegistry,
				providerConfig
			}
		});
		return resolveModelWithRegistry({
			provider: normalizedRef.provider,
			modelId: normalizedRef.model,
			modelRegistry,
			cfg,
			agentDir: resolvedAgentDir,
			runtimeHooks
		});
	};
	let model = explicitModel?.kind === "resolved" ? explicitModel.model : await resolveDynamicAttempt();
	if (!model && !explicitModel && options?.retryTransientProviderRuntimeMiss) model = await resolveDynamicAttempt({ clearHookCache: true });
	if (model) return {
		model,
		authStorage,
		modelRegistry
	};
	return {
		error: buildUnknownModelError({
			provider: normalizedRef.provider,
			modelId: normalizedRef.model,
			cfg,
			agentDir: resolvedAgentDir,
			runtimeHooks
		}),
		authStorage,
		modelRegistry
	};
}
/**
* Build a more helpful error when the model is not found.
*
* Some provider plugins only become available after setup/auth has registered
* them. When users point `agents.defaults.model.primary` at one of those
* providers before setup, the raw `Unknown model` error is too vague. Provider
* plugins can append a targeted recovery hint here.
*
* See: https://github.com/openclaw/openclaw/issues/17328
*/
function buildUnknownModelError(params) {
	const suppressed = buildSuppressedBuiltInModelError({
		provider: params.provider,
		id: params.modelId
	});
	if (suppressed) return suppressed;
	const base = `Unknown model: ${params.provider}/${params.modelId}`;
	const hint = (params.runtimeHooks ?? DEFAULT_PROVIDER_RUNTIME_HOOKS).buildProviderUnknownModelHintWithPlugin({
		provider: params.provider,
		config: params.cfg,
		env: process.env,
		context: {
			config: params.cfg,
			agentDir: params.agentDir,
			env: process.env,
			provider: params.provider,
			modelId: params.modelId
		}
	});
	return hint ? `${base}. ${hint}` : base;
}
//#endregion
export { buildModelAliasLines as i, resolveModelAsync as n, resolveModelWithRegistry as r, resolveModel as t };
