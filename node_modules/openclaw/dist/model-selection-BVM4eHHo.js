import { r as stripAnsi, t as sanitizeForLog } from "./ansi-DpBQLMEp.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { f as resolveThinkingDefaultForModel } from "./thinking.shared-CA8xx4G3.js";
import { n as resolveAgentModelPrimaryValue, r as toAgentModelListLike, t as resolveAgentModelFallbackValues } from "./model-input-BvHDuFyu.js";
import { i as resolveAgentConfig, o as resolveAgentEffectiveModelPrimary, u as resolveAgentModelFallbacksOverride } from "./agent-scope-CXWTwwic.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-I0_TmVEm.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { n as normalizeStaticProviderModelId, t as modelKey$1 } from "./model-ref-shared-CPgWlDyj.js";
import { createRequire } from "node:module";
//#region src/agents/configured-provider-fallback.ts
function resolveConfiguredProviderFallback(params) {
	const configuredProviders = params.cfg.models?.providers;
	if (!configuredProviders || typeof configuredProviders !== "object") return null;
	const defaultProviderConfig = configuredProviders[params.defaultProvider];
	const defaultModel = params.defaultModel?.trim();
	const defaultProviderHasDefaultModel = !!defaultProviderConfig && !!defaultModel && Array.isArray(defaultProviderConfig.models) && defaultProviderConfig.models.some((model) => model?.id === defaultModel);
	if (defaultProviderConfig && (!defaultModel || defaultProviderHasDefaultModel)) return null;
	const availableProvider = Object.entries(configuredProviders).find(([, providerCfg]) => providerCfg && Array.isArray(providerCfg.models) && providerCfg.models.length > 0 && providerCfg.models[0]?.id);
	if (!availableProvider) return null;
	const [provider, providerCfg] = availableProvider;
	return {
		provider,
		model: providerCfg.models[0].id
	};
}
//#endregion
//#region src/agents/model-ref-profile.ts
function splitTrailingAuthProfile(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return { model: "" };
	const lastSlash = trimmed.lastIndexOf("/");
	let profileDelimiter = trimmed.indexOf("@", lastSlash + 1);
	if (profileDelimiter <= 0) return { model: trimmed };
	const versionSuffix = trimmed.slice(profileDelimiter + 1);
	if (/^\d{8}(?:@|$)/.test(versionSuffix)) {
		const nextDelimiter = trimmed.indexOf("@", profileDelimiter + 9);
		if (nextDelimiter < 0) return { model: trimmed };
		profileDelimiter = nextDelimiter;
	}
	const model = trimmed.slice(0, profileDelimiter).trim();
	const profile = trimmed.slice(profileDelimiter + 1).trim();
	if (!model || !profile) return { model: trimmed };
	return {
		model,
		profile
	};
}
//#endregion
//#region src/agents/provider-model-normalization.runtime.ts
const require = createRequire(import.meta.url);
const PROVIDER_RUNTIME_CANDIDATES = ["../plugins/provider-runtime.js", "../plugins/provider-runtime.ts"];
let providerRuntimeModule;
function loadProviderRuntime() {
	if (providerRuntimeModule) return providerRuntimeModule;
	for (const candidate of PROVIDER_RUNTIME_CANDIDATES) try {
		providerRuntimeModule = require(candidate);
		return providerRuntimeModule;
	} catch {}
	return null;
}
function normalizeProviderModelIdWithRuntime(params) {
	return loadProviderRuntime()?.normalizeProviderModelIdWithPlugin(params);
}
//#endregion
//#region src/agents/model-selection.ts
let log = null;
function getLog() {
	log ??= createSubsystemLogger("model-selection");
	return log;
}
function normalizeAliasKey(value) {
	return value.trim().toLowerCase();
}
function sanitizeModelWarningValue(value) {
	const stripped = value ? stripAnsi(value) : "";
	let controlBoundary = -1;
	for (let index = 0; index < stripped.length; index += 1) {
		const code = stripped.charCodeAt(index);
		if (code <= 31 || code === 127) {
			controlBoundary = index;
			break;
		}
	}
	if (controlBoundary === -1) return sanitizeForLog(stripped);
	return sanitizeForLog(stripped.slice(0, controlBoundary));
}
function modelKey(provider, model) {
	return modelKey$1(provider, model);
}
function legacyModelKey(provider, model) {
	const providerId = provider.trim();
	const modelId = model.trim();
	if (!providerId || !modelId) return null;
	const rawKey = `${providerId}/${modelId}`;
	return rawKey === modelKey(providerId, modelId) ? null : rawKey;
}
function normalizeProviderModelId(provider, model) {
	const staticModelId = normalizeStaticProviderModelId(provider, model);
	return normalizeProviderModelIdWithRuntime({
		provider,
		context: {
			provider,
			modelId: staticModelId
		}
	}) ?? staticModelId;
}
function normalizeModelRef(provider, model, options) {
	const normalizedProvider = normalizeProviderId(provider);
	return {
		provider: normalizedProvider,
		model: options?.allowPluginNormalization === false ? model.trim() : normalizeProviderModelId(normalizedProvider, model.trim())
	};
}
function parseModelRef(raw, defaultProvider, options) {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const slash = trimmed.indexOf("/");
	if (slash === -1) return normalizeModelRef(defaultProvider, trimmed, options);
	const providerRaw = trimmed.slice(0, slash).trim();
	const model = trimmed.slice(slash + 1).trim();
	if (!providerRaw || !model) return null;
	return normalizeModelRef(providerRaw, model, options);
}
function resolvePersistedModelRef(params) {
	const defaultProvider = params.defaultProvider.trim();
	const runtimeProvider = params.runtimeProvider?.trim();
	const runtimeModel = params.runtimeModel?.trim();
	if (runtimeModel) {
		if (runtimeProvider) return {
			provider: runtimeProvider,
			model: runtimeModel
		};
		return parseModelRef(runtimeModel, defaultProvider) ?? {
			provider: defaultProvider,
			model: runtimeModel
		};
	}
	const overrideProvider = params.overrideProvider?.trim();
	const overrideModel = params.overrideModel?.trim();
	if (!overrideModel) return null;
	return parseModelRef(overrideProvider ? `${overrideProvider}/${overrideModel}` : overrideModel, defaultProvider) ?? {
		provider: overrideProvider || defaultProvider,
		model: overrideModel
	};
}
function inferUniqueProviderFromConfiguredModels(params) {
	const model = params.model.trim();
	if (!model) return;
	const normalized = model.toLowerCase();
	const providers = /* @__PURE__ */ new Set();
	const addProvider = (provider) => {
		const normalizedProvider = normalizeProviderId(provider);
		if (!normalizedProvider) return;
		providers.add(normalizedProvider);
	};
	const configuredModels = params.cfg.agents?.defaults?.models;
	if (configuredModels) for (const key of Object.keys(configuredModels)) {
		const ref = key.trim();
		if (!ref || !ref.includes("/")) continue;
		const parsed = parseModelRef(ref, DEFAULT_PROVIDER, { allowPluginNormalization: false });
		if (!parsed) continue;
		if (parsed.model === model || parsed.model.toLowerCase() === normalized) {
			addProvider(parsed.provider);
			if (providers.size > 1) return;
		}
	}
	const configuredProviders = params.cfg.models?.providers;
	if (configuredProviders) for (const [providerId, providerConfig] of Object.entries(configuredProviders)) {
		const models = providerConfig?.models;
		if (!Array.isArray(models)) continue;
		for (const entry of models) {
			const modelId = entry?.id?.trim();
			if (!modelId) continue;
			if (modelId === model || modelId.toLowerCase() === normalized) addProvider(providerId);
		}
		if (providers.size > 1) return;
	}
	if (providers.size !== 1) return;
	return providers.values().next().value;
}
function resolveAllowlistModelKey(raw, defaultProvider) {
	const parsed = parseModelRef(raw, defaultProvider);
	if (!parsed) return null;
	return modelKey(parsed.provider, parsed.model);
}
function buildConfiguredAllowlistKeys(params) {
	const rawAllowlist = Object.keys(params.cfg?.agents?.defaults?.models ?? {});
	if (rawAllowlist.length === 0) return null;
	const keys = /* @__PURE__ */ new Set();
	for (const raw of rawAllowlist) {
		const key = resolveAllowlistModelKey(String(raw ?? ""), params.defaultProvider);
		if (key) keys.add(key);
	}
	return keys.size > 0 ? keys : null;
}
function buildModelAliasIndex(params) {
	const byAlias = /* @__PURE__ */ new Map();
	const byKey = /* @__PURE__ */ new Map();
	const rawModels = params.cfg.agents?.defaults?.models ?? {};
	for (const [keyRaw, entryRaw] of Object.entries(rawModels)) {
		const parsed = parseModelRef(String(keyRaw ?? ""), params.defaultProvider, { allowPluginNormalization: params.allowPluginNormalization });
		if (!parsed) continue;
		const alias = String(entryRaw?.alias ?? "").trim();
		if (!alias) continue;
		const aliasKey = normalizeAliasKey(alias);
		byAlias.set(aliasKey, {
			alias,
			ref: parsed
		});
		const key = modelKey(parsed.provider, parsed.model);
		const existing = byKey.get(key) ?? [];
		existing.push(alias);
		byKey.set(key, existing);
	}
	return {
		byAlias,
		byKey
	};
}
function resolveModelRefFromString(params) {
	const { model } = splitTrailingAuthProfile(params.raw);
	if (!model) return null;
	if (!model.includes("/")) {
		const aliasKey = normalizeAliasKey(model);
		const aliasMatch = params.aliasIndex?.byAlias.get(aliasKey);
		if (aliasMatch) return {
			ref: aliasMatch.ref,
			alias: aliasMatch.alias
		};
	}
	const parsed = parseModelRef(model, params.defaultProvider, { allowPluginNormalization: params.allowPluginNormalization });
	if (!parsed) return null;
	return { ref: parsed };
}
function resolveConfiguredModelRef(params) {
	const rawModel = resolveAgentModelPrimaryValue(params.cfg.agents?.defaults?.model) ?? "";
	if (rawModel) {
		const trimmed = rawModel.trim();
		const aliasIndex = buildModelAliasIndex({
			cfg: params.cfg,
			defaultProvider: params.defaultProvider,
			allowPluginNormalization: params.allowPluginNormalization
		});
		if (!trimmed.includes("/")) {
			const aliasKey = normalizeAliasKey(trimmed);
			const aliasMatch = aliasIndex.byAlias.get(aliasKey);
			if (aliasMatch) return aliasMatch.ref;
			const inferredProvider = inferUniqueProviderFromConfiguredModels({
				cfg: params.cfg,
				model: trimmed
			});
			if (inferredProvider) return {
				provider: inferredProvider,
				model: trimmed
			};
			const safeTrimmed = sanitizeModelWarningValue(trimmed);
			const safeResolved = sanitizeForLog(`${params.defaultProvider}/${safeTrimmed}`);
			getLog().warn(`Model "${safeTrimmed}" specified without provider. Falling back to "${safeResolved}". Please use "${safeResolved}" in your config.`);
			return {
				provider: params.defaultProvider,
				model: trimmed
			};
		}
		const resolved = resolveModelRefFromString({
			raw: trimmed,
			defaultProvider: params.defaultProvider,
			aliasIndex,
			allowPluginNormalization: params.allowPluginNormalization
		});
		if (resolved) return resolved.ref;
		const safe = sanitizeForLog(trimmed);
		const safeFallback = sanitizeForLog(`${params.defaultProvider}/${params.defaultModel}`);
		getLog().warn(`Model "${safe}" could not be resolved. Falling back to default "${safeFallback}".`);
	}
	const fallbackProvider = resolveConfiguredProviderFallback({
		cfg: params.cfg,
		defaultProvider: params.defaultProvider
	});
	if (fallbackProvider) return fallbackProvider;
	return {
		provider: params.defaultProvider,
		model: params.defaultModel
	};
}
function resolveDefaultModelForAgent(params) {
	const agentModelOverride = params.agentId ? resolveAgentEffectiveModelPrimary(params.cfg, params.agentId) : void 0;
	return resolveConfiguredModelRef({
		cfg: agentModelOverride && agentModelOverride.length > 0 ? {
			...params.cfg,
			agents: {
				...params.cfg.agents,
				defaults: {
					...params.cfg.agents?.defaults,
					model: {
						...toAgentModelListLike(params.cfg.agents?.defaults?.model),
						primary: agentModelOverride
					}
				}
			}
		} : params.cfg,
		defaultProvider: DEFAULT_PROVIDER,
		defaultModel: DEFAULT_MODEL
	});
}
function resolveAllowedFallbacks(params) {
	if (params.agentId) {
		const override = resolveAgentModelFallbacksOverride(params.cfg, params.agentId);
		if (override !== void 0) return override;
	}
	return resolveAgentModelFallbackValues(params.cfg.agents?.defaults?.model);
}
function resolveSubagentConfiguredModelSelection(params) {
	const agentConfig = resolveAgentConfig(params.cfg, params.agentId);
	return normalizeModelSelection(agentConfig?.subagents?.model) ?? normalizeModelSelection(agentConfig?.model) ?? normalizeModelSelection(params.cfg.agents?.defaults?.subagents?.model);
}
function resolveSubagentSpawnModelSelection(params) {
	const runtimeDefault = resolveDefaultModelForAgent({
		cfg: params.cfg,
		agentId: params.agentId
	});
	return normalizeModelSelection(params.modelOverride) ?? resolveSubagentConfiguredModelSelection({
		cfg: params.cfg,
		agentId: params.agentId
	}) ?? normalizeModelSelection(resolveAgentModelPrimaryValue(params.cfg.agents?.defaults?.model)) ?? `${runtimeDefault.provider}/${runtimeDefault.model}`;
}
function buildAllowedModelSet(params) {
	const rawAllowlist = (() => {
		const modelMap = params.cfg.agents?.defaults?.models ?? {};
		return Object.keys(modelMap);
	})();
	const allowAny = rawAllowlist.length === 0;
	const defaultModel = params.defaultModel?.trim();
	const defaultRef = defaultModel && params.defaultProvider ? parseModelRef(defaultModel, params.defaultProvider) : null;
	const defaultKey = defaultRef ? modelKey(defaultRef.provider, defaultRef.model) : void 0;
	const catalogKeys = new Set(params.catalog.map((entry) => modelKey(entry.provider, entry.id)));
	if (allowAny) {
		if (defaultKey) catalogKeys.add(defaultKey);
		return {
			allowAny: true,
			allowedCatalog: params.catalog,
			allowedKeys: catalogKeys
		};
	}
	const allowedKeys = /* @__PURE__ */ new Set();
	const syntheticCatalogEntries = /* @__PURE__ */ new Map();
	const resolveConfiguredSyntheticEntry = (provider, model) => {
		const configuredModels = params.cfg.models?.providers?.[provider]?.models;
		if (!Array.isArray(configuredModels)) return null;
		const configured = configuredModels.find((entry) => typeof entry?.id === "string" && entry.id.trim() === model);
		if (!configured) return null;
		return {
			provider,
			id: model,
			name: typeof configured.name === "string" && configured.name.trim().length > 0 ? configured.name.trim() : model,
			contextWindow: typeof configured.contextWindow === "number" && configured.contextWindow > 0 ? configured.contextWindow : void 0,
			reasoning: typeof configured.reasoning === "boolean" ? configured.reasoning : void 0,
			input: Array.isArray(configured.input) ? configured.input : void 0
		};
	};
	for (const raw of rawAllowlist) {
		const parsed = parseModelRef(String(raw), params.defaultProvider);
		if (!parsed) continue;
		const key = modelKey(parsed.provider, parsed.model);
		allowedKeys.add(key);
		if (!catalogKeys.has(key) && !syntheticCatalogEntries.has(key)) {
			const configuredSynthetic = resolveConfiguredSyntheticEntry(parsed.provider, parsed.model);
			syntheticCatalogEntries.set(key, {
				...configuredSynthetic,
				id: parsed.model,
				name: configuredSynthetic?.name ?? parsed.model,
				provider: parsed.provider
			});
		}
	}
	for (const fallback of resolveAllowedFallbacks({
		cfg: params.cfg,
		agentId: params.agentId
	})) {
		const parsed = parseModelRef(String(fallback), params.defaultProvider);
		if (parsed) {
			const key = modelKey(parsed.provider, parsed.model);
			allowedKeys.add(key);
			if (!catalogKeys.has(key) && !syntheticCatalogEntries.has(key)) syntheticCatalogEntries.set(key, {
				id: parsed.model,
				name: parsed.model,
				provider: parsed.provider
			});
		}
	}
	if (defaultKey) allowedKeys.add(defaultKey);
	const allowedCatalog = [...params.catalog.filter((entry) => {
		const key = modelKey(entry.provider, entry.id);
		return allowedKeys.has(key) && !syntheticCatalogEntries.has(key);
	}), ...syntheticCatalogEntries.values()];
	if (allowedCatalog.length === 0 && allowedKeys.size === 0) {
		if (defaultKey) catalogKeys.add(defaultKey);
		return {
			allowAny: true,
			allowedCatalog: params.catalog,
			allowedKeys: catalogKeys
		};
	}
	return {
		allowAny: false,
		allowedCatalog,
		allowedKeys
	};
}
function buildConfiguredModelCatalog(params) {
	const providers = params.cfg.models?.providers;
	if (!providers || typeof providers !== "object") return [];
	const catalog = [];
	for (const [providerRaw, provider] of Object.entries(providers)) {
		const providerId = normalizeProviderId(providerRaw);
		if (!providerId || !Array.isArray(provider?.models)) continue;
		for (const model of provider.models) {
			const id = typeof model?.id === "string" ? model.id.trim() : "";
			if (!id) continue;
			const name = typeof model?.name === "string" && model.name.trim() ? model.name.trim() : id;
			const contextWindow = typeof model?.contextWindow === "number" && model.contextWindow > 0 ? model.contextWindow : void 0;
			const reasoning = typeof model?.reasoning === "boolean" ? model.reasoning : void 0;
			const input = Array.isArray(model?.input) ? model.input : void 0;
			catalog.push({
				provider: providerId,
				id,
				name,
				contextWindow,
				reasoning,
				input
			});
		}
	}
	return catalog;
}
function getModelRefStatus(params) {
	const allowed = buildAllowedModelSet({
		cfg: params.cfg,
		catalog: params.catalog,
		defaultProvider: params.defaultProvider,
		defaultModel: params.defaultModel
	});
	const key = modelKey(params.ref.provider, params.ref.model);
	return {
		key,
		inCatalog: params.catalog.some((entry) => modelKey(entry.provider, entry.id) === key),
		allowAny: allowed.allowAny,
		allowed: allowed.allowAny || allowed.allowedKeys.has(key)
	};
}
function resolveAllowedModelRef(params) {
	const trimmed = params.raw.trim();
	if (!trimmed) return { error: "invalid model: empty" };
	const aliasIndex = buildModelAliasIndex({
		cfg: params.cfg,
		defaultProvider: params.defaultProvider
	});
	const resolved = resolveModelRefFromString({
		raw: trimmed,
		defaultProvider: !trimmed.includes("/") ? inferUniqueProviderFromConfiguredModels({
			cfg: params.cfg,
			model: trimmed
		}) ?? params.defaultProvider : params.defaultProvider,
		aliasIndex
	});
	if (!resolved) return { error: `invalid model: ${trimmed}` };
	const status = getModelRefStatus({
		cfg: params.cfg,
		catalog: params.catalog,
		ref: resolved.ref,
		defaultProvider: params.defaultProvider,
		defaultModel: params.defaultModel
	});
	if (!status.allowed) return { error: `model not allowed: ${status.key}` };
	return {
		ref: resolved.ref,
		key: status.key
	};
}
function resolveThinkingDefault(params) {
	const normalizedProvider = normalizeProviderId(params.provider);
	const normalizedModel = params.model.toLowerCase().replace(/\./g, "-");
	const catalogCandidate = params.catalog?.find((entry) => entry.provider === params.provider && entry.id === params.model);
	const configuredModels = params.cfg.agents?.defaults?.models;
	const canonicalKey = modelKey(params.provider, params.model);
	const legacyKey = legacyModelKey(params.provider, params.model);
	const primarySelection = normalizeModelSelection(params.cfg.agents?.defaults?.model);
	const normalizedPrimarySelection = typeof primarySelection === "string" ? primarySelection.trim().toLowerCase() : void 0;
	const explicitModelConfigured = (configuredModels ? canonicalKey in configuredModels : false) || Boolean(legacyKey && configuredModels && legacyKey in configuredModels) || normalizedPrimarySelection === canonicalKey.toLowerCase() || Boolean(legacyKey && normalizedPrimarySelection === legacyKey.toLowerCase()) || normalizedPrimarySelection === params.model.trim().toLowerCase();
	const perModelThinking = configuredModels?.[canonicalKey]?.params?.thinking ?? (legacyKey ? configuredModels?.[legacyKey]?.params?.thinking : void 0);
	if (perModelThinking === "off" || perModelThinking === "minimal" || perModelThinking === "low" || perModelThinking === "medium" || perModelThinking === "high" || perModelThinking === "xhigh" || perModelThinking === "adaptive") return perModelThinking;
	const configured = params.cfg.agents?.defaults?.thinkingDefault;
	if (configured) return configured;
	if (normalizedProvider === "anthropic" && explicitModelConfigured && typeof catalogCandidate?.name === "string" && /4\.6\b/.test(catalogCandidate.name) && (normalizedModel.startsWith("claude-opus-4-6") || normalizedModel.startsWith("claude-sonnet-4-6"))) return "adaptive";
	return resolveThinkingDefaultForModel({
		provider: params.provider,
		model: params.model,
		catalog: params.catalog
	});
}
/** Default reasoning level when session/directive do not set it: "on" if model supports reasoning, else "off". */
function resolveReasoningDefault(params) {
	const key = modelKey(params.provider, params.model);
	return (params.catalog?.find((entry) => entry.provider === params.provider && entry.id === params.model || entry.provider === key && entry.id === params.model))?.reasoning === true ? "on" : "off";
}
/**
* Resolve the model configured for Gmail hook processing.
* Returns null if hooks.gmail.model is not set.
*/
function resolveHooksGmailModel(params) {
	const hooksModel = params.cfg.hooks?.gmail?.model;
	if (!hooksModel?.trim()) return null;
	const aliasIndex = buildModelAliasIndex({
		cfg: params.cfg,
		defaultProvider: params.defaultProvider
	});
	return resolveModelRefFromString({
		raw: hooksModel,
		defaultProvider: params.defaultProvider,
		aliasIndex
	})?.ref ?? null;
}
/**
* Normalize a model selection value (string or `{primary?: string}`) to a
* plain trimmed string.  Returns `undefined` when the input is empty/missing.
* Shared by sessions-spawn and cron isolated-agent model resolution.
*/
function normalizeModelSelection(value) {
	if (typeof value === "string") return value.trim() || void 0;
	if (!value || typeof value !== "object") return;
	const primary = value.primary;
	if (typeof primary === "string" && primary.trim()) return primary.trim();
}
//#endregion
export { splitTrailingAuthProfile as C, resolveThinkingDefault as S, resolveModelRefFromString as _, getModelRefStatus as a, resolveSubagentConfiguredModelSelection as b, modelKey as c, parseModelRef as d, resolveAllowedModelRef as f, resolveHooksGmailModel as g, resolveDefaultModelForAgent as h, buildModelAliasIndex as i, normalizeModelRef as l, resolveConfiguredModelRef as m, buildConfiguredAllowlistKeys as n, inferUniqueProviderFromConfiguredModels as o, resolveAllowlistModelKey as p, buildConfiguredModelCatalog as r, legacyModelKey as s, buildAllowedModelSet as t, normalizeModelSelection as u, resolvePersistedModelRef as v, resolveConfiguredProviderFallback as w, resolveSubagentSpawnModelSelection as x, resolveReasoningDefault as y };
