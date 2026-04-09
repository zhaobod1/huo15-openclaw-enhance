import { o as discoverOpenClawPlugins, s as resolvePluginCacheInputs } from "./ids-Dm8ff2qI.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { n as buildPluginLoaderJitiOptions, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { t as buildPluginApi } from "./api-builder-CXqFEA2-.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
//#region src/plugins/setup-registry.ts
const SETUP_API_EXTENSIONS = [
	".js",
	".mjs",
	".cjs",
	".ts",
	".mts",
	".cts"
];
const CURRENT_MODULE_PATH = fileURLToPath(import.meta.url);
const RUNNING_FROM_BUILT_ARTIFACT = CURRENT_MODULE_PATH.includes(`${path.sep}dist${path.sep}`) || CURRENT_MODULE_PATH.includes(`${path.sep}dist-runtime${path.sep}`);
const EMPTY_RUNTIME = {};
const NOOP_LOGGER = {
	info() {},
	warn() {},
	error() {}
};
const jitiLoaders = /* @__PURE__ */ new Map();
const setupRegistryCache = /* @__PURE__ */ new Map();
const setupProviderCache = /* @__PURE__ */ new Map();
function getJiti(modulePath) {
	const aliasMap = buildPluginLoaderAliasMap(modulePath, process.argv[1], import.meta.url);
	const cacheKey = JSON.stringify({
		tryNative: shouldPreferNativeJiti(modulePath),
		aliasMap: Object.entries(aliasMap).toSorted(([left], [right]) => left.localeCompare(right))
	});
	const cached = jitiLoaders.get(cacheKey);
	if (cached) return cached;
	const loader = createJiti(modulePath, buildPluginLoaderJitiOptions(aliasMap));
	jitiLoaders.set(cacheKey, loader);
	return loader;
}
function buildSetupRegistryCacheKey(params) {
	const { roots, loadPaths } = resolvePluginCacheInputs({
		workspaceDir: params.workspaceDir,
		env: params.env
	});
	return JSON.stringify({
		roots,
		loadPaths
	});
}
function buildSetupProviderCacheKey(params) {
	return JSON.stringify({
		provider: normalizeProviderId(params.provider),
		registry: buildSetupRegistryCacheKey(params)
	});
}
function resolveSetupApiPath(rootDir) {
	const orderedExtensions = RUNNING_FROM_BUILT_ARTIFACT ? SETUP_API_EXTENSIONS : [...SETUP_API_EXTENSIONS.slice(3), ...SETUP_API_EXTENSIONS.slice(0, 3)];
	const findSetupApi = (candidateRootDir) => {
		for (const extension of orderedExtensions) {
			const candidate = path.join(candidateRootDir, `setup-api${extension}`);
			if (fs.existsSync(candidate)) return candidate;
		}
		return null;
	};
	const direct = findSetupApi(rootDir);
	if (direct) return direct;
	const bundledExtensionDir = path.basename(rootDir);
	const repoRoot = path.resolve(path.dirname(CURRENT_MODULE_PATH), "..", "..");
	const sourceExtensionRoot = path.join(repoRoot, "extensions", bundledExtensionDir);
	if (sourceExtensionRoot !== rootDir) {
		const sourceFallback = findSetupApi(sourceExtensionRoot);
		if (sourceFallback) return sourceFallback;
	}
	return null;
}
function resolveRegister(mod) {
	if (typeof mod === "function") return { register: mod };
	if (mod && typeof mod === "object" && typeof mod.register === "function") return {
		definition: mod,
		register: mod.register.bind(mod)
	};
	return {};
}
function matchesProvider(provider, providerId) {
	const normalized = normalizeProviderId(providerId);
	if (normalizeProviderId(provider.id) === normalized) return true;
	return [...provider.aliases ?? [], ...provider.hookAliases ?? []].some((alias) => normalizeProviderId(alias) === normalized);
}
function resolvePluginSetupRegistry(params) {
	const env = params?.env ?? process.env;
	const cacheKey = buildSetupRegistryCacheKey({
		workspaceDir: params?.workspaceDir,
		env
	});
	const cached = setupRegistryCache.get(cacheKey);
	if (cached) return cached;
	const providers = [];
	const configMigrations = [];
	const autoEnableProbes = [];
	const providerKeys = /* @__PURE__ */ new Set();
	const discovery = discoverOpenClawPlugins({
		workspaceDir: params?.workspaceDir,
		env,
		cache: true
	});
	const manifestRegistry = loadPluginManifestRegistry({
		workspaceDir: params?.workspaceDir,
		env,
		cache: true,
		candidates: discovery.candidates,
		diagnostics: discovery.diagnostics
	});
	for (const record of manifestRegistry.plugins) {
		const setupSource = resolveSetupApiPath(record.rootDir);
		if (!setupSource) continue;
		let mod;
		try {
			mod = getJiti(setupSource)(setupSource);
		} catch {
			continue;
		}
		const resolved = resolveRegister(mod.default ?? mod);
		if (!resolved.register) continue;
		if (resolved.definition?.id && resolved.definition.id !== record.id) continue;
		const api = buildPluginApi({
			id: record.id,
			name: record.name ?? record.id,
			version: record.version,
			description: record.description,
			source: setupSource,
			rootDir: record.rootDir,
			registrationMode: "setup-only",
			config: {},
			runtime: EMPTY_RUNTIME,
			logger: NOOP_LOGGER,
			resolvePath: (input) => input,
			handlers: {
				registerProvider(provider) {
					const key = `${record.id}:${normalizeProviderId(provider.id)}`;
					if (providerKeys.has(key)) return;
					providerKeys.add(key);
					providers.push({
						pluginId: record.id,
						provider
					});
				},
				registerConfigMigration(migrate) {
					configMigrations.push({
						pluginId: record.id,
						migrate
					});
				},
				registerAutoEnableProbe(probe) {
					autoEnableProbes.push({
						pluginId: record.id,
						probe
					});
				}
			}
		});
		try {
			const result = resolved.register(api);
			if (result && typeof result.then === "function") {}
		} catch {
			continue;
		}
	}
	const registry = {
		providers,
		configMigrations,
		autoEnableProbes
	};
	setupRegistryCache.set(cacheKey, registry);
	return registry;
}
function resolvePluginSetupProvider(params) {
	const cacheKey = buildSetupProviderCacheKey(params);
	if (setupProviderCache.has(cacheKey)) return setupProviderCache.get(cacheKey) ?? void 0;
	const env = params.env ?? process.env;
	const normalizedProvider = normalizeProviderId(params.provider);
	const discovery = discoverOpenClawPlugins({
		workspaceDir: params.workspaceDir,
		env,
		cache: true
	});
	const record = loadPluginManifestRegistry({
		workspaceDir: params.workspaceDir,
		env,
		cache: true,
		candidates: discovery.candidates,
		diagnostics: discovery.diagnostics
	}).plugins.find((entry) => entry.providers.some((providerId) => normalizeProviderId(providerId) === normalizedProvider));
	if (!record) {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	const setupSource = record.setupSource ?? resolveSetupApiPath(record.rootDir);
	if (!setupSource) {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	let mod;
	try {
		mod = getJiti(setupSource)(setupSource);
	} catch {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	const resolved = resolveRegister(mod.default ?? mod);
	if (!resolved.register) {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	if (resolved.definition?.id && resolved.definition.id !== record.id) {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	let matchedProvider;
	const localProviderKeys = /* @__PURE__ */ new Set();
	const api = buildPluginApi({
		id: record.id,
		name: record.name ?? record.id,
		version: record.version,
		description: record.description,
		source: setupSource,
		rootDir: record.rootDir,
		registrationMode: "setup-only",
		config: {},
		runtime: EMPTY_RUNTIME,
		logger: NOOP_LOGGER,
		resolvePath: (input) => input,
		handlers: {
			registerProvider(provider) {
				const key = normalizeProviderId(provider.id);
				if (localProviderKeys.has(key)) return;
				localProviderKeys.add(key);
				if (matchesProvider(provider, normalizedProvider)) matchedProvider = provider;
			},
			registerConfigMigration() {},
			registerAutoEnableProbe() {}
		}
	});
	try {
		const result = resolved.register(api);
		if (result && typeof result.then === "function") {}
	} catch {
		setupProviderCache.set(cacheKey, null);
		return;
	}
	setupProviderCache.set(cacheKey, matchedProvider ?? null);
	return matchedProvider;
}
function runPluginSetupConfigMigrations(params) {
	let next = params.config;
	const changes = [];
	for (const entry of resolvePluginSetupRegistry(params).configMigrations) {
		const migration = entry.migrate(next);
		if (!migration || migration.changes.length === 0) continue;
		next = migration.config;
		changes.push(...migration.changes);
	}
	return {
		config: next,
		changes
	};
}
function resolvePluginSetupAutoEnableReasons(params) {
	const env = params.env ?? process.env;
	const reasons = [];
	const seen = /* @__PURE__ */ new Set();
	for (const entry of resolvePluginSetupRegistry({
		workspaceDir: params.workspaceDir,
		env
	}).autoEnableProbes) {
		const raw = entry.probe({
			config: params.config,
			env
		});
		const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
		for (const reason of values) {
			const normalized = reason.trim();
			if (!normalized) continue;
			const key = `${entry.pluginId}:${normalized}`;
			if (seen.has(key)) continue;
			seen.add(key);
			reasons.push({
				pluginId: entry.pluginId,
				reason: normalized
			});
		}
	}
	return reasons;
}
//#endregion
export { resolvePluginSetupProvider as n, runPluginSetupConfigMigrations as r, resolvePluginSetupAutoEnableReasons as t };
