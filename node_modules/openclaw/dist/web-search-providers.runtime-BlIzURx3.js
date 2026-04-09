import { o as getActivePluginRegistryWorkspaceDir } from "./runtime-Dji2WXDE.js";
import { l as isRecord } from "./utils-ms6h9yny.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { i as resolveManifestContractPluginIds, n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { r as withActivatedPluginIds, t as resolveBundledPluginCompatibleActivationInputs } from "./activation-context-EoQ_S75w.js";
import { i as resolveRuntimePluginRegistry, n as loadOpenClawPlugins, r as resolveCompatibleRuntimePluginRegistry } from "./loader-BkajlJCF.js";
import { t as createPluginLoaderLogger } from "./logger-B9Q6R6gm.js";
//#region src/plugins/cache-controls.ts
const DEFAULT_PLUGIN_DISCOVERY_CACHE_MS = 1e3;
const DEFAULT_PLUGIN_MANIFEST_CACHE_MS = 1e3;
function shouldUsePluginSnapshotCache(env) {
	if (env.OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE?.trim()) return false;
	if (env.OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE?.trim()) return false;
	if (env.OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS?.trim() === "0") return false;
	if (env.OPENCLAW_PLUGIN_MANIFEST_CACHE_MS?.trim() === "0") return false;
	return true;
}
function resolvePluginCacheMs(rawValue, defaultMs) {
	const raw = rawValue?.trim();
	if (raw === "" || raw === "0") return 0;
	if (!raw) return defaultMs;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return defaultMs;
	return Math.max(0, parsed);
}
function resolvePluginSnapshotCacheTtlMs(env) {
	const discoveryCacheMs = resolvePluginCacheMs(env.OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS, DEFAULT_PLUGIN_DISCOVERY_CACHE_MS);
	const manifestCacheMs = resolvePluginCacheMs(env.OPENCLAW_PLUGIN_MANIFEST_CACHE_MS, DEFAULT_PLUGIN_MANIFEST_CACHE_MS);
	return Math.min(discoveryCacheMs, manifestCacheMs);
}
function buildPluginSnapshotCacheEnvKey(env) {
	return {
		OPENCLAW_BUNDLED_PLUGINS_DIR: env.OPENCLAW_BUNDLED_PLUGINS_DIR ?? "",
		OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE: env.OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE ?? "",
		OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE: env.OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE ?? "",
		OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS: env.OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS ?? "",
		OPENCLAW_PLUGIN_MANIFEST_CACHE_MS: env.OPENCLAW_PLUGIN_MANIFEST_CACHE_MS ?? "",
		OPENCLAW_HOME: env.OPENCLAW_HOME ?? "",
		OPENCLAW_STATE_DIR: env.OPENCLAW_STATE_DIR ?? "",
		OPENCLAW_CONFIG_PATH: env.OPENCLAW_CONFIG_PATH ?? "",
		HOME: env.HOME ?? "",
		USERPROFILE: env.USERPROFILE ?? "",
		VITEST: env.VITEST ?? ""
	};
}
//#endregion
//#region src/plugins/web-search-providers.shared.ts
function resolveBundledWebSearchCompatPluginIds(params) {
	return resolveManifestContractPluginIds({
		contract: "webSearchProviders",
		origin: "bundled",
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	});
}
function compareWebSearchProvidersAlphabetically(left, right) {
	return left.id.localeCompare(right.id) || left.pluginId.localeCompare(right.pluginId);
}
function sortWebSearchProviders(providers) {
	return providers.toSorted(compareWebSearchProvidersAlphabetically);
}
function sortWebSearchProvidersForAutoDetect(providers) {
	return providers.toSorted((left, right) => {
		const leftOrder = left.autoDetectOrder ?? Number.MAX_SAFE_INTEGER;
		const rightOrder = right.autoDetectOrder ?? Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) return leftOrder - rightOrder;
		return compareWebSearchProvidersAlphabetically(left, right);
	});
}
function resolveBundledWebSearchResolutionConfig(params) {
	const activation = resolveBundledPluginCompatibleActivationInputs({
		rawConfig: params.config,
		env: params.env,
		workspaceDir: params.workspaceDir,
		applyAutoEnable: true,
		compatMode: {
			allowlist: params.bundledAllowlistCompat,
			enablement: "always",
			vitest: true
		},
		resolveCompatPluginIds: resolveBundledWebSearchCompatPluginIds
	});
	return {
		config: activation.config,
		normalized: activation.normalized,
		activationSourceConfig: activation.activationSourceConfig,
		autoEnabledReasons: activation.autoEnabledReasons
	};
}
//#endregion
//#region src/plugins/web-search-providers.runtime.ts
const log = createSubsystemLogger("plugins");
let webSearchProviderSnapshotCache = /* @__PURE__ */ new WeakMap();
function buildWebSearchSnapshotCacheKey(params) {
	return JSON.stringify({
		workspaceDir: params.workspaceDir ?? "",
		bundledAllowlistCompat: params.bundledAllowlistCompat === true,
		origin: params.origin ?? "",
		onlyPluginIds: [...new Set(params.onlyPluginIds ?? [])].toSorted((left, right) => left.localeCompare(right)),
		env: buildPluginSnapshotCacheEnvKey(params.env)
	});
}
function pluginManifestDeclaresWebSearch(record) {
	if ((record.contracts?.webSearchProviders?.length ?? 0) > 0) return true;
	if (Object.keys(record.configUiHints ?? {}).some((key) => key === "webSearch" || key.startsWith("webSearch."))) return true;
	if (!isRecord(record.configSchema)) return false;
	const properties = record.configSchema.properties;
	return isRecord(properties) && "webSearch" in properties;
}
function resolveWebSearchCandidatePluginIds(params) {
	const contractIds = new Set(resolveManifestContractPluginIds({
		contract: "webSearchProviders",
		origin: params.origin,
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env,
		onlyPluginIds: params.onlyPluginIds
	}));
	const onlyPluginIdSet = params.onlyPluginIds && params.onlyPluginIds.length > 0 ? new Set(params.onlyPluginIds) : null;
	const ids = loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => (!params.origin || plugin.origin === params.origin) && (!onlyPluginIdSet || onlyPluginIdSet.has(plugin.id)) && (contractIds.has(plugin.id) || pluginManifestDeclaresWebSearch(plugin))).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
	return ids.length > 0 ? ids : void 0;
}
function resolveWebSearchLoadOptions(params) {
	const env = params.env ?? process.env;
	const workspaceDir = params.workspaceDir ?? getActivePluginRegistryWorkspaceDir();
	const { config, activationSourceConfig, autoEnabledReasons } = resolveBundledWebSearchResolutionConfig({
		...params,
		workspaceDir,
		env
	});
	const onlyPluginIds = resolveWebSearchCandidatePluginIds({
		config,
		workspaceDir,
		env,
		onlyPluginIds: params.onlyPluginIds,
		origin: params.origin
	});
	return {
		env,
		config,
		activationSourceConfig,
		autoEnabledReasons,
		workspaceDir,
		cache: params.cache ?? false,
		activate: params.activate ?? false,
		...onlyPluginIds ? { onlyPluginIds } : {},
		logger: createPluginLoaderLogger(log)
	};
}
function mapRegistryWebSearchProviders(params) {
	const onlyPluginIdSet = params.onlyPluginIds && params.onlyPluginIds.length > 0 ? new Set(params.onlyPluginIds) : null;
	return sortWebSearchProviders(params.registry.webSearchProviders.filter((entry) => !onlyPluginIdSet || onlyPluginIdSet.has(entry.pluginId)).map((entry) => ({
		...entry.provider,
		pluginId: entry.pluginId
	})));
}
function resolvePluginWebSearchProviders(params) {
	const env = params.env ?? process.env;
	const workspaceDir = params.workspaceDir ?? getActivePluginRegistryWorkspaceDir();
	if (params.mode === "setup") {
		const pluginIds = resolveWebSearchCandidatePluginIds({
			config: params.config,
			workspaceDir,
			env,
			onlyPluginIds: params.onlyPluginIds,
			origin: params.origin
		}) ?? [];
		if (pluginIds.length === 0) return [];
		return mapRegistryWebSearchProviders({
			registry: loadOpenClawPlugins({
				config: withActivatedPluginIds({
					config: params.config,
					pluginIds
				}),
				activationSourceConfig: params.config,
				autoEnabledReasons: {},
				workspaceDir,
				env,
				onlyPluginIds: pluginIds,
				cache: params.cache ?? false,
				activate: params.activate ?? false,
				logger: createPluginLoaderLogger(log)
			}),
			onlyPluginIds: pluginIds
		});
	}
	const cacheOwnerConfig = params.config;
	const shouldMemoizeSnapshot = params.activate !== true && params.cache !== true && shouldUsePluginSnapshotCache(env);
	const cacheKey = buildWebSearchSnapshotCacheKey({
		config: cacheOwnerConfig,
		workspaceDir,
		bundledAllowlistCompat: params.bundledAllowlistCompat,
		onlyPluginIds: params.onlyPluginIds,
		origin: params.origin,
		env
	});
	if (cacheOwnerConfig && shouldMemoizeSnapshot) {
		const cached = (webSearchProviderSnapshotCache.get(cacheOwnerConfig)?.get(env))?.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) return cached.providers;
	}
	const loadOptions = resolveWebSearchLoadOptions({
		...params,
		workspaceDir
	});
	const resolved = mapRegistryWebSearchProviders({ registry: resolveCompatibleRuntimePluginRegistry(loadOptions) ?? loadOpenClawPlugins(loadOptions) });
	if (cacheOwnerConfig && shouldMemoizeSnapshot) {
		const ttlMs = resolvePluginSnapshotCacheTtlMs(env);
		let configCache = webSearchProviderSnapshotCache.get(cacheOwnerConfig);
		if (!configCache) {
			configCache = /* @__PURE__ */ new WeakMap();
			webSearchProviderSnapshotCache.set(cacheOwnerConfig, configCache);
		}
		let envCache = configCache.get(env);
		if (!envCache) {
			envCache = /* @__PURE__ */ new Map();
			configCache.set(env, envCache);
		}
		envCache.set(cacheKey, {
			expiresAt: Date.now() + ttlMs,
			providers: resolved
		});
	}
	return resolved;
}
function resolveRuntimeWebSearchProviders(params) {
	const runtimeRegistry = resolveRuntimePluginRegistry(params.config === void 0 ? void 0 : resolveWebSearchLoadOptions({
		...params,
		workspaceDir: params.workspaceDir ?? getActivePluginRegistryWorkspaceDir()
	}));
	if (runtimeRegistry) return mapRegistryWebSearchProviders({
		registry: runtimeRegistry,
		onlyPluginIds: params.onlyPluginIds
	});
	return resolvePluginWebSearchProviders(params);
}
//#endregion
export { buildPluginSnapshotCacheEnvKey as a, sortWebSearchProvidersForAutoDetect as i, resolveRuntimeWebSearchProviders as n, resolvePluginSnapshotCacheTtlMs as o, sortWebSearchProviders as r, shouldUsePluginSnapshotCache as s, resolvePluginWebSearchProviders as t };
