import { f as resolveConfigDir, l as isRecord, m as resolveUserPath } from "./utils-ms6h9yny.js";
import { r as normalizeChatChannelId } from "./ids-Dm8ff2qI.js";
import { s as getChatChannelMeta } from "./registry-DldQsVOb.js";
import { t as isBlockedObjectKey } from "./prototype-keys-DxnN-2X5.js";
import "./model-selection-BVM4eHHo.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { n as loadPluginManifestRegistry, r as resolveManifestContractOwnerPluginId } from "./manifest-registry-Cqdpf6fh.js";
import { r as withBundledPluginVitestCompat } from "./bundled-compat-DQFbvTG5.js";
import { a as normalizePluginsConfig, s as resolveEffectivePluginActivationState } from "./config-state-CKMpUUgI.js";
import { n as hasPotentialConfiguredChannels, r as listPotentialConfiguredChannelIds } from "./config-presence-Bwyumb-a.js";
import { t as resolvePluginSetupAutoEnableReasons } from "./setup-registry-CLKO_jQP.js";
import { t as isChannelConfigured } from "./channel-configured-CS3pHvH2.js";
import { t as ensurePluginAllowlisted } from "./plugins-allowlist-X8FGAYR0.js";
import fs from "node:fs";
import path from "node:path";
//#region src/plugins/providers.ts
function withBundledProviderVitestCompat(params) {
	return withBundledPluginVitestCompat(params);
}
function resolveBundledProviderCompatPluginIds(params) {
	const onlyPluginIdSet = params.onlyPluginIds ? new Set(params.onlyPluginIds) : null;
	return loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => plugin.origin === "bundled" && plugin.providers.length > 0 && (!onlyPluginIdSet || onlyPluginIdSet.has(plugin.id))).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
}
function resolveEnabledProviderPluginIds(params) {
	const onlyPluginIdSet = params.onlyPluginIds ? new Set(params.onlyPluginIds) : null;
	const registry = loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	});
	const normalizedConfig = normalizePluginsConfig(params.config?.plugins);
	return registry.plugins.filter((plugin) => plugin.providers.length > 0 && (!onlyPluginIdSet || onlyPluginIdSet.has(plugin.id)) && resolveEffectivePluginActivationState({
		id: plugin.id,
		origin: plugin.origin,
		config: normalizedConfig,
		rootConfig: params.config,
		enabledByDefault: plugin.enabledByDefault
	}).activated).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
}
function resolveDiscoveredProviderPluginIds(params) {
	const onlyPluginIdSet = params.onlyPluginIds ? new Set(params.onlyPluginIds) : null;
	return loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => plugin.providers.length > 0 && (!onlyPluginIdSet || onlyPluginIdSet.has(plugin.id))).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
}
function resolveManifestRegistry(params) {
	return params.manifestRegistry ?? loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	});
}
function stripModelProfileSuffix(value) {
	const trimmed = value.trim();
	const at = trimmed.indexOf("@");
	return at <= 0 ? trimmed : trimmed.slice(0, at).trim();
}
function splitExplicitModelRef(rawModel) {
	const trimmed = rawModel.trim();
	if (!trimmed) return null;
	const slash = trimmed.indexOf("/");
	if (slash === -1) {
		const modelId = stripModelProfileSuffix(trimmed);
		return modelId ? { modelId } : null;
	}
	const provider = normalizeProviderId(trimmed.slice(0, slash));
	const modelId = stripModelProfileSuffix(trimmed.slice(slash + 1));
	if (!provider || !modelId) return null;
	return {
		provider,
		modelId
	};
}
function resolveModelSupportMatchKind(plugin, modelId) {
	const patterns = plugin.modelSupport?.modelPatterns ?? [];
	for (const patternSource of patterns) try {
		if (new RegExp(patternSource, "u").test(modelId)) return "pattern";
	} catch {
		continue;
	}
	const prefixes = plugin.modelSupport?.modelPrefixes ?? [];
	for (const prefix of prefixes) if (modelId.startsWith(prefix)) return "prefix";
}
function dedupeSortedPluginIds(values) {
	return [...new Set(values)].toSorted((left, right) => left.localeCompare(right));
}
function resolvePreferredManifestPluginIds(registry, matchedPluginIds) {
	if (matchedPluginIds.length === 0) return;
	const uniquePluginIds = dedupeSortedPluginIds(matchedPluginIds);
	if (uniquePluginIds.length <= 1) return uniquePluginIds;
	const nonBundledPluginIds = uniquePluginIds.filter((pluginId) => {
		return registry.plugins.find((entry) => entry.id === pluginId)?.origin !== "bundled";
	});
	if (nonBundledPluginIds.length === 1) return nonBundledPluginIds;
	if (nonBundledPluginIds.length > 1) return;
}
function resolveOwningPluginIdsForProvider(params) {
	const normalizedProvider = normalizeProviderId(params.provider);
	if (!normalizedProvider) return;
	const pluginIds = resolveManifestRegistry(params).plugins.filter((plugin) => plugin.providers.some((providerId) => normalizeProviderId(providerId) === normalizedProvider)).map((plugin) => plugin.id);
	return pluginIds.length > 0 ? pluginIds : void 0;
}
function resolveOwningPluginIdsForModelRef(params) {
	const parsed = splitExplicitModelRef(params.model);
	if (!parsed) return;
	if (parsed.provider) return resolveOwningPluginIdsForProvider({
		provider: parsed.provider,
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env,
		manifestRegistry: params.manifestRegistry
	});
	const registry = resolveManifestRegistry(params);
	const preferredPatternPluginIds = resolvePreferredManifestPluginIds(registry, registry.plugins.filter((plugin) => resolveModelSupportMatchKind(plugin, parsed.modelId) === "pattern").map((plugin) => plugin.id));
	if (preferredPatternPluginIds) return preferredPatternPluginIds;
	return resolvePreferredManifestPluginIds(registry, registry.plugins.filter((plugin) => resolveModelSupportMatchKind(plugin, parsed.modelId) === "prefix").map((plugin) => plugin.id));
}
function resolveOwningPluginIdsForModelRefs(params) {
	const registry = resolveManifestRegistry(params);
	return dedupeSortedPluginIds(params.models.flatMap((model) => resolveOwningPluginIdsForModelRef({
		model,
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env,
		manifestRegistry: registry
	}) ?? []));
}
function resolveCatalogHookProviderPluginIds(params) {
	const registry = loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	});
	const normalizedConfig = normalizePluginsConfig(params.config?.plugins);
	const enabledProviderPluginIds = registry.plugins.filter((plugin) => plugin.providers.length > 0 && resolveEffectivePluginActivationState({
		id: plugin.id,
		origin: plugin.origin,
		config: normalizedConfig,
		rootConfig: params.config,
		enabledByDefault: plugin.enabledByDefault
	}).activated).map((plugin) => plugin.id);
	const bundledCompatPluginIds = resolveBundledProviderCompatPluginIds(params);
	return [...new Set([...enabledProviderPluginIds, ...bundledCompatPluginIds])].toSorted((left, right) => left.localeCompare(right));
}
//#endregion
//#region src/config/plugin-auto-enable.prefer-over.ts
const ENV_CATALOG_PATHS = ["OPENCLAW_PLUGIN_CATALOG_PATHS", "OPENCLAW_MPM_CATALOG_PATHS"];
function splitEnvPaths(value) {
	const trimmed = value.trim();
	if (!trimmed) return [];
	return trimmed.split(/[;,]/g).flatMap((chunk) => chunk.split(path.delimiter)).map((entry) => entry.trim()).filter(Boolean);
}
function resolveExternalCatalogPaths(env) {
	for (const key of ENV_CATALOG_PATHS) {
		const raw = env[key];
		if (raw && raw.trim()) return splitEnvPaths(raw);
	}
	const configDir = resolveConfigDir(env);
	return [
		path.join(configDir, "mpm", "plugins.json"),
		path.join(configDir, "mpm", "catalog.json"),
		path.join(configDir, "plugins", "catalog.json")
	];
}
function parseExternalCatalogChannelEntries(raw) {
	const list = (() => {
		if (Array.isArray(raw)) return raw;
		if (!isRecord(raw)) return [];
		const entries = raw.entries ?? raw.packages ?? raw.plugins;
		return Array.isArray(entries) ? entries : [];
	})();
	const channels = [];
	for (const entry of list) {
		if (!isRecord(entry) || !isRecord(entry.openclaw) || !isRecord(entry.openclaw.channel)) continue;
		const channel = entry.openclaw.channel;
		const id = typeof channel.id === "string" ? channel.id.trim() : "";
		if (!id) continue;
		const preferOver = Array.isArray(channel.preferOver) ? channel.preferOver.filter((value) => typeof value === "string") : [];
		channels.push({
			id,
			preferOver
		});
	}
	return channels;
}
function resolveExternalCatalogPreferOver(channelId, env) {
	for (const rawPath of resolveExternalCatalogPaths(env)) {
		const resolved = resolveUserPath(rawPath, env);
		if (!fs.existsSync(resolved)) continue;
		try {
			const channel = parseExternalCatalogChannelEntries(JSON.parse(fs.readFileSync(resolved, "utf-8"))).find((entry) => entry.id === channelId);
			if (channel) return channel.preferOver;
		} catch {}
	}
	return [];
}
function resolvePreferredOverIds(pluginId, env, registry) {
	const normalized = normalizeChatChannelId(pluginId);
	if (normalized) return [...getChatChannelMeta(normalized).preferOver ?? []];
	const installedPlugin = registry.plugins.find((record) => record.id === pluginId);
	const manifestChannelPreferOver = installedPlugin?.channelConfigs?.[pluginId]?.preferOver;
	if (manifestChannelPreferOver?.length) return [...manifestChannelPreferOver];
	const installedChannelMeta = installedPlugin?.channelCatalogMeta;
	if (installedChannelMeta?.preferOver?.length) return [...installedChannelMeta.preferOver];
	return resolveExternalCatalogPreferOver(pluginId, env);
}
function shouldSkipPreferredPluginAutoEnable(params) {
	for (const other of params.configured) {
		if (other.pluginId === params.entry.pluginId) continue;
		if (params.isPluginDenied(params.config, other.pluginId) || params.isPluginExplicitlyDisabled(params.config, other.pluginId)) continue;
		if (resolvePreferredOverIds(other.pluginId, params.env, params.registry).includes(params.entry.pluginId)) return true;
	}
	return false;
}
//#endregion
//#region src/config/plugin-auto-enable.shared.ts
const EMPTY_PLUGIN_MANIFEST_REGISTRY = {
	plugins: [],
	diagnostics: []
};
function resolveAutoEnableProviderPluginIds(registry) {
	const entries = /* @__PURE__ */ new Map();
	for (const plugin of registry.plugins) for (const providerId of plugin.autoEnableWhenConfiguredProviders ?? []) if (!entries.has(providerId)) entries.set(providerId, plugin.id);
	return Object.fromEntries(entries);
}
function collectModelRefs(cfg) {
	const refs = [];
	const pushModelRef = (value) => {
		if (typeof value === "string" && value.trim()) refs.push(value.trim());
	};
	const collectFromAgent = (agent) => {
		if (!agent) return;
		const model = agent.model;
		if (typeof model === "string") pushModelRef(model);
		else if (isRecord(model)) {
			pushModelRef(model.primary);
			const fallbacks = model.fallbacks;
			if (Array.isArray(fallbacks)) for (const entry of fallbacks) pushModelRef(entry);
		}
		const models = agent.models;
		if (isRecord(models)) for (const key of Object.keys(models)) pushModelRef(key);
	};
	collectFromAgent(cfg.agents?.defaults);
	const list = cfg.agents?.list;
	if (Array.isArray(list)) {
		for (const entry of list) if (isRecord(entry)) collectFromAgent(entry);
	}
	return refs;
}
function extractProviderFromModelRef(value) {
	const trimmed = value.trim();
	const slash = trimmed.indexOf("/");
	if (slash <= 0) return null;
	return normalizeProviderId(trimmed.slice(0, slash));
}
function isProviderConfigured(cfg, providerId) {
	const normalized = normalizeProviderId(providerId);
	const profiles = cfg.auth?.profiles;
	if (profiles && typeof profiles === "object") for (const profile of Object.values(profiles)) {
		if (!isRecord(profile)) continue;
		if (normalizeProviderId(String(profile.provider ?? "")) === normalized) return true;
	}
	const providerConfig = cfg.models?.providers;
	if (providerConfig && typeof providerConfig === "object") {
		for (const key of Object.keys(providerConfig)) if (normalizeProviderId(key) === normalized) return true;
	}
	for (const ref of collectModelRefs(cfg)) {
		const provider = extractProviderFromModelRef(ref);
		if (provider && provider === normalized) return true;
	}
	return false;
}
function hasPluginOwnedWebSearchConfig(cfg, pluginId) {
	const pluginConfig = cfg.plugins?.entries?.[pluginId]?.config;
	return isRecord(pluginConfig) && isRecord(pluginConfig.webSearch);
}
function hasPluginOwnedWebFetchConfig(cfg, pluginId) {
	const pluginConfig = cfg.plugins?.entries?.[pluginId]?.config;
	return isRecord(pluginConfig) && isRecord(pluginConfig.webFetch);
}
function hasPluginOwnedToolConfig(cfg, pluginId) {
	const pluginConfig = cfg.plugins?.entries?.xai?.config;
	const web = cfg.tools?.web;
	return pluginId === "xai" && Boolean(isRecord(web?.x_search) || isRecord(pluginConfig) && (isRecord(pluginConfig.xSearch) || isRecord(pluginConfig.codeExecution)));
}
function resolveProviderPluginsWithOwnedWebSearch(registry) {
	return new Set(registry.plugins.filter((plugin) => plugin.providers.length > 0).filter((plugin) => (plugin.contracts?.webSearchProviders?.length ?? 0) > 0).map((plugin) => plugin.id));
}
function resolveProviderPluginsWithOwnedWebFetch(registry) {
	return new Set(registry.plugins.filter((plugin) => (plugin.contracts?.webFetchProviders?.length ?? 0) > 0).map((plugin) => plugin.id));
}
function resolvePluginIdForConfiguredWebFetchProvider(providerId, env) {
	return resolveManifestContractOwnerPluginId({
		contract: "webFetchProviders",
		value: typeof providerId === "string" ? providerId.trim().toLowerCase() : "",
		origin: "bundled",
		env
	});
}
function buildChannelToPluginIdMap(registry) {
	const map = /* @__PURE__ */ new Map();
	for (const record of registry.plugins) for (const channelId of record.channels) if (channelId && !map.has(channelId)) map.set(channelId, record.id);
	return map;
}
function resolvePluginIdForChannel(channelId, channelToPluginId) {
	const builtInId = normalizeChatChannelId(channelId);
	if (builtInId) return builtInId;
	return channelToPluginId.get(channelId) ?? channelId;
}
function collectCandidateChannelIds(cfg, env) {
	return listPotentialConfiguredChannelIds(cfg, env).map((channelId) => normalizeChatChannelId(channelId) ?? channelId);
}
function hasConfiguredWebSearchPluginEntry(cfg) {
	const entries = cfg.plugins?.entries;
	return !!entries && typeof entries === "object" && Object.values(entries).some((entry) => isRecord(entry) && isRecord(entry.config) && isRecord(entry.config.webSearch));
}
function hasConfiguredWebFetchPluginEntry(cfg) {
	const entries = cfg.plugins?.entries;
	return !!entries && typeof entries === "object" && Object.values(entries).some((entry) => isRecord(entry) && isRecord(entry.config) && isRecord(entry.config.webFetch));
}
function configMayNeedPluginManifestRegistry(cfg) {
	const pluginEntries = cfg.plugins?.entries;
	if (pluginEntries && Object.values(pluginEntries).some((entry) => isRecord(entry) && isRecord(entry.config))) return true;
	if (cfg.auth?.profiles && Object.keys(cfg.auth.profiles).length > 0) return true;
	if (cfg.models?.providers && Object.keys(cfg.models.providers).length > 0) return true;
	if (collectModelRefs(cfg).length > 0) return true;
	const configuredChannels = cfg.channels;
	if (!configuredChannels || typeof configuredChannels !== "object") return false;
	for (const key of Object.keys(configuredChannels)) {
		if (key === "defaults" || key === "modelByChannel") continue;
		if (!normalizeChatChannelId(key)) return true;
	}
	return false;
}
function configMayNeedPluginAutoEnable(cfg, env) {
	if (hasPotentialConfiguredChannels(cfg, env)) return true;
	if (cfg.auth?.profiles && Object.keys(cfg.auth.profiles).length > 0) return true;
	if (cfg.models?.providers && Object.keys(cfg.models.providers).length > 0) return true;
	if (collectModelRefs(cfg).length > 0) return true;
	const web = cfg.tools?.web;
	if (isRecord(web?.x_search) || hasConfiguredWebSearchPluginEntry(cfg) || hasConfiguredWebFetchPluginEntry(cfg)) return true;
	return resolvePluginSetupAutoEnableReasons({
		config: cfg,
		env
	}).length > 0;
}
function resolvePluginAutoEnableCandidateReason(candidate) {
	switch (candidate.kind) {
		case "channel-configured": return `${candidate.channelId} configured`;
		case "provider-auth-configured": return `${candidate.providerId} auth configured`;
		case "provider-model-configured": return `${candidate.modelRef} model configured`;
		case "web-fetch-provider-selected": return `${candidate.providerId} web fetch provider selected`;
		case "plugin-web-search-configured": return `${candidate.pluginId} web search configured`;
		case "plugin-web-fetch-configured": return `${candidate.pluginId} web fetch configured`;
		case "plugin-tool-configured": return `${candidate.pluginId} tool configured`;
		case "setup-auto-enable": return candidate.reason;
	}
}
function resolveConfiguredPluginAutoEnableCandidates(params) {
	const changes = [];
	const channelToPluginId = buildChannelToPluginIdMap(params.registry);
	for (const channelId of collectCandidateChannelIds(params.config, params.env)) {
		const pluginId = resolvePluginIdForChannel(channelId, channelToPluginId);
		if (isChannelConfigured(params.config, channelId, params.env)) changes.push({
			pluginId,
			kind: "channel-configured",
			channelId
		});
	}
	for (const [providerId, pluginId] of Object.entries(resolveAutoEnableProviderPluginIds(params.registry))) if (isProviderConfigured(params.config, providerId)) changes.push({
		pluginId,
		kind: "provider-auth-configured",
		providerId
	});
	for (const modelRef of collectModelRefs(params.config)) {
		const owningPluginIds = resolveOwningPluginIdsForModelRef({
			model: modelRef,
			config: params.config,
			env: params.env,
			manifestRegistry: params.registry
		});
		if (owningPluginIds?.length === 1) changes.push({
			pluginId: owningPluginIds[0],
			kind: "provider-model-configured",
			modelRef
		});
	}
	const webFetchProvider = typeof params.config.tools?.web?.fetch?.provider === "string" ? params.config.tools.web.fetch.provider : void 0;
	const webFetchPluginId = resolvePluginIdForConfiguredWebFetchProvider(webFetchProvider, params.env);
	if (webFetchPluginId) changes.push({
		pluginId: webFetchPluginId,
		kind: "web-fetch-provider-selected",
		providerId: String(webFetchProvider).trim().toLowerCase()
	});
	for (const pluginId of resolveProviderPluginsWithOwnedWebSearch(params.registry)) {
		if (hasPluginOwnedWebSearchConfig(params.config, pluginId)) changes.push({
			pluginId,
			kind: "plugin-web-search-configured"
		});
		if (hasPluginOwnedToolConfig(params.config, pluginId)) changes.push({
			pluginId,
			kind: "plugin-tool-configured"
		});
	}
	for (const pluginId of resolveProviderPluginsWithOwnedWebFetch(params.registry)) if (hasPluginOwnedWebFetchConfig(params.config, pluginId)) changes.push({
		pluginId,
		kind: "plugin-web-fetch-configured"
	});
	for (const entry of resolvePluginSetupAutoEnableReasons({
		config: params.config,
		env: params.env
	})) changes.push({
		pluginId: entry.pluginId,
		kind: "setup-auto-enable",
		reason: entry.reason
	});
	return changes;
}
function isPluginExplicitlyDisabled(cfg, pluginId) {
	const builtInChannelId = normalizeChatChannelId(pluginId);
	if (builtInChannelId) {
		const channelConfig = cfg.channels?.[builtInChannelId];
		if (channelConfig && typeof channelConfig === "object" && !Array.isArray(channelConfig) && channelConfig.enabled === false) return true;
	}
	return cfg.plugins?.entries?.[pluginId]?.enabled === false;
}
function isPluginDenied(cfg, pluginId) {
	const deny = cfg.plugins?.deny;
	return Array.isArray(deny) && deny.includes(pluginId);
}
function isBuiltInChannelAlreadyEnabled(cfg, channelId) {
	const channelConfig = cfg.channels?.[channelId];
	return !!channelConfig && typeof channelConfig === "object" && !Array.isArray(channelConfig) && channelConfig.enabled === true;
}
function registerPluginEntry(cfg, pluginId) {
	const builtInChannelId = normalizeChatChannelId(pluginId);
	if (builtInChannelId) {
		const existing = cfg.channels?.[builtInChannelId];
		const existingRecord = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
		return {
			...cfg,
			channels: {
				...cfg.channels,
				[builtInChannelId]: {
					...existingRecord,
					enabled: true
				}
			}
		};
	}
	return {
		...cfg,
		plugins: {
			...cfg.plugins,
			entries: {
				...cfg.plugins?.entries,
				[pluginId]: {
					...cfg.plugins?.entries?.[pluginId],
					enabled: true
				}
			}
		}
	};
}
function formatAutoEnableChange(entry) {
	let reason = resolvePluginAutoEnableCandidateReason(entry).trim();
	const channelId = normalizeChatChannelId(entry.pluginId);
	if (channelId) {
		const label = getChatChannelMeta(channelId).label;
		reason = reason.replace(new RegExp(`^${channelId}\\b`, "i"), label);
	}
	return `${reason}, enabled automatically.`;
}
function resolvePluginAutoEnableManifestRegistry(params) {
	return params.manifestRegistry ?? (configMayNeedPluginManifestRegistry(params.config) ? loadPluginManifestRegistry({
		config: params.config,
		env: params.env
	}) : EMPTY_PLUGIN_MANIFEST_REGISTRY);
}
function materializePluginAutoEnableCandidatesInternal(params) {
	let next = params.config ?? {};
	const changes = [];
	const autoEnabledReasons = /* @__PURE__ */ new Map();
	if (next.plugins?.enabled === false) return {
		config: next,
		changes,
		autoEnabledReasons: {}
	};
	for (const entry of params.candidates) {
		const builtInChannelId = normalizeChatChannelId(entry.pluginId);
		if (isPluginDenied(next, entry.pluginId) || isPluginExplicitlyDisabled(next, entry.pluginId)) continue;
		if (shouldSkipPreferredPluginAutoEnable({
			config: next,
			entry,
			configured: params.candidates,
			env: params.env,
			registry: params.manifestRegistry,
			isPluginDenied,
			isPluginExplicitlyDisabled
		})) continue;
		const allow = next.plugins?.allow;
		const allowMissing = builtInChannelId == null && Array.isArray(allow) && !allow.includes(entry.pluginId);
		if ((builtInChannelId != null ? isBuiltInChannelAlreadyEnabled(next, builtInChannelId) : next.plugins?.entries?.[entry.pluginId]?.enabled === true) && !allowMissing) continue;
		next = registerPluginEntry(next, entry.pluginId);
		if (!builtInChannelId) next = ensurePluginAllowlisted(next, entry.pluginId);
		const reason = resolvePluginAutoEnableCandidateReason(entry);
		autoEnabledReasons.set(entry.pluginId, [...autoEnabledReasons.get(entry.pluginId) ?? [], reason]);
		changes.push(formatAutoEnableChange(entry));
	}
	const autoEnabledReasonRecord = Object.create(null);
	for (const [pluginId, reasons] of autoEnabledReasons) if (!isBlockedObjectKey(pluginId)) autoEnabledReasonRecord[pluginId] = [...reasons];
	return {
		config: next,
		changes,
		autoEnabledReasons: autoEnabledReasonRecord
	};
}
//#endregion
//#region src/config/plugin-auto-enable.detect.ts
function detectPluginAutoEnableCandidates(params) {
	const env = params.env ?? process.env;
	const config = params.config ?? {};
	if (!configMayNeedPluginAutoEnable(config, env)) return [];
	return resolveConfiguredPluginAutoEnableCandidates({
		config,
		env,
		registry: resolvePluginAutoEnableManifestRegistry({
			config,
			env,
			manifestRegistry: params.manifestRegistry
		})
	});
}
//#endregion
//#region src/config/plugin-auto-enable.apply.ts
function materializePluginAutoEnableCandidates(params) {
	const env = params.env ?? process.env;
	const config = params.config ?? {};
	const manifestRegistry = resolvePluginAutoEnableManifestRegistry({
		config,
		env,
		manifestRegistry: params.manifestRegistry
	});
	return materializePluginAutoEnableCandidatesInternal({
		config,
		candidates: params.candidates,
		env,
		manifestRegistry
	});
}
function applyPluginAutoEnable(params) {
	const candidates = detectPluginAutoEnableCandidates(params);
	return materializePluginAutoEnableCandidates({
		config: params.config,
		candidates,
		env: params.env,
		manifestRegistry: params.manifestRegistry
	});
}
//#endregion
export { resolveEnabledProviderPluginIds as a, withBundledProviderVitestCompat as c, resolveDiscoveredProviderPluginIds as i, resolveBundledProviderCompatPluginIds as n, resolveOwningPluginIdsForModelRefs as o, resolveCatalogHookProviderPluginIds as r, resolveOwningPluginIdsForProvider as s, applyPluginAutoEnable as t };
