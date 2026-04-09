import { i as openBoundaryFileSync } from "./boundary-file-read-CdxVvait.js";
import { i as listChannelCatalogEntries } from "./ids-Dm8ff2qI.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { _ as resolveStateDir } from "./paths-yyDPxM31.js";
import { n as buildPluginLoaderJitiOptions, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { t as listBundledChannelPluginIds } from "./bundled-ids-DTOingUD.js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createJiti } from "jiti";
//#region src/channels/plugins/package-state-probes.ts
const log = createSubsystemLogger("channels");
const nodeRequire = createRequire(import.meta.url);
const registryCache = /* @__PURE__ */ new Map();
function resolveChannelPackageStateMetadata(entry, metadataKey) {
	const metadata = entry.channel[metadataKey];
	if (!metadata || typeof metadata !== "object") return null;
	const specifier = typeof metadata.specifier === "string" ? metadata.specifier.trim() : "";
	const exportName = typeof metadata.exportName === "string" ? metadata.exportName.trim() : "";
	if (!specifier || !exportName) return null;
	return {
		specifier,
		exportName
	};
}
function createModuleLoader() {
	const jitiLoaders = /* @__PURE__ */ new Map();
	return (modulePath) => {
		const tryNative = shouldPreferNativeJiti(modulePath) || modulePath.includes(`${path.sep}dist${path.sep}`);
		const aliasMap = buildPluginLoaderAliasMap(modulePath, process.argv[1], import.meta.url);
		const cacheKey = JSON.stringify({
			tryNative,
			aliasMap: Object.entries(aliasMap).toSorted(([left], [right]) => left.localeCompare(right))
		});
		const cached = jitiLoaders.get(cacheKey);
		if (cached) return cached;
		const loader = createJiti(import.meta.url, {
			...buildPluginLoaderJitiOptions(aliasMap),
			tryNative
		});
		jitiLoaders.set(cacheKey, loader);
		return loader;
	};
}
const loadModule = createModuleLoader();
function getChannelPackageStateRegistry(metadataKey) {
	const cached = registryCache.get(metadataKey);
	if (cached) return cached;
	const catalog = listChannelCatalogEntries({ origin: "bundled" }).filter((entry) => Boolean(resolveChannelPackageStateMetadata(entry, metadataKey)));
	const registry = {
		catalog,
		entriesById: new Map(catalog.map((entry) => [entry.pluginId, entry])),
		checkerCache: /* @__PURE__ */ new Map()
	};
	registryCache.set(metadataKey, registry);
	return registry;
}
function resolveModuleCandidates(entry, specifier) {
	const normalizedSpecifier = specifier.replace(/\\/g, "/");
	const resolvedPath = path.resolve(entry.rootDir, normalizedSpecifier);
	if (path.extname(resolvedPath)) return [resolvedPath];
	return [
		resolvedPath,
		`${resolvedPath}.ts`,
		`${resolvedPath}.js`,
		`${resolvedPath}.mjs`,
		`${resolvedPath}.cjs`
	];
}
function resolveExistingModulePath(entry, specifier) {
	for (const candidate of resolveModuleCandidates(entry, specifier)) if (fs.existsSync(candidate)) return candidate;
	return path.resolve(entry.rootDir, specifier);
}
function loadChannelPackageStateModule(modulePath, rootDir) {
	const opened = openBoundaryFileSync({
		absolutePath: modulePath,
		rootPath: rootDir,
		boundaryLabel: "plugin root",
		rejectHardlinks: false,
		skipLexicalRootCheck: true
	});
	if (!opened.ok) throw new Error("plugin package-state module escapes plugin root or fails alias checks");
	const safePath = opened.path;
	fs.closeSync(opened.fd);
	if (process.platform === "win32" && [
		".js",
		".mjs",
		".cjs"
	].includes(path.extname(safePath).toLowerCase())) try {
		return nodeRequire(safePath);
	} catch {}
	return loadModule(safePath)(safePath);
}
function resolveChannelPackageStateChecker(params) {
	const registry = getChannelPackageStateRegistry(params.metadataKey);
	const cached = registry.checkerCache.get(params.entry.pluginId);
	if (cached !== void 0) return cached;
	const metadata = resolveChannelPackageStateMetadata(params.entry, params.metadataKey);
	if (!metadata) {
		registry.checkerCache.set(params.entry.pluginId, null);
		return null;
	}
	try {
		const checker = loadChannelPackageStateModule(resolveExistingModulePath(params.entry, metadata.specifier), params.entry.rootDir)[metadata.exportName];
		if (typeof checker !== "function") throw new Error(`missing ${params.metadataKey} export ${metadata.exportName}`);
		registry.checkerCache.set(params.entry.pluginId, checker);
		return checker;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		log.warn(`[channels] failed to load ${params.metadataKey} checker for ${params.entry.pluginId}: ${detail}`);
		registry.checkerCache.set(params.entry.pluginId, null);
		return null;
	}
}
function listBundledChannelIdsForPackageState(metadataKey) {
	return getChannelPackageStateRegistry(metadataKey).catalog.map((entry) => entry.pluginId);
}
function hasBundledChannelPackageState(params) {
	const entry = getChannelPackageStateRegistry(params.metadataKey).entriesById.get(params.channelId);
	if (!entry) return false;
	const checker = resolveChannelPackageStateChecker({
		entry,
		metadataKey: params.metadataKey
	});
	return checker ? Boolean(checker({
		cfg: params.cfg,
		env: params.env
	})) : false;
}
//#endregion
//#region src/channels/plugins/persisted-auth-state.ts
function listBundledChannelIdsWithPersistedAuthState() {
	return listBundledChannelIdsForPackageState("persistedAuthState");
}
function hasBundledChannelPersistedAuthState(params) {
	return hasBundledChannelPackageState({
		metadataKey: "persistedAuthState",
		channelId: params.channelId,
		cfg: params.cfg,
		env: params.env
	});
}
//#endregion
//#region src/channels/config-presence.ts
const IGNORED_CHANNEL_CONFIG_KEYS = new Set(["defaults", "modelByChannel"]);
function hasNonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}
function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasMeaningfulChannelConfig(value) {
	if (!isRecord(value)) return false;
	return Object.keys(value).some((key) => key !== "enabled");
}
function listChannelEnvPrefixes(channelIds) {
	return channelIds.map((channelId) => [`${channelId.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}_`, channelId]);
}
function hasPersistedChannelState(env) {
	return fs.existsSync(resolveStateDir(env, os.homedir));
}
const PERSISTED_AUTH_STATE_CHANNEL_IDS = listBundledChannelIdsWithPersistedAuthState();
function listPotentialConfiguredChannelIds(cfg, env = process.env, options = {}) {
	const configuredChannelIds = /* @__PURE__ */ new Set();
	const channelEnvPrefixes = listChannelEnvPrefixes(listBundledChannelPluginIds());
	const channels = isRecord(cfg.channels) ? cfg.channels : null;
	if (channels) for (const [key, value] of Object.entries(channels)) {
		if (IGNORED_CHANNEL_CONFIG_KEYS.has(key)) continue;
		if (hasMeaningfulChannelConfig(value)) configuredChannelIds.add(key);
	}
	for (const [key, value] of Object.entries(env)) {
		if (!hasNonEmptyString(value)) continue;
		for (const [prefix, channelId] of channelEnvPrefixes) if (key.startsWith(prefix)) configuredChannelIds.add(channelId);
	}
	if (options.includePersistedAuthState !== false && hasPersistedChannelState(env)) {
		for (const channelId of PERSISTED_AUTH_STATE_CHANNEL_IDS) if (hasBundledChannelPersistedAuthState({
			channelId,
			cfg,
			env
		})) configuredChannelIds.add(channelId);
	}
	return [...configuredChannelIds];
}
function hasEnvConfiguredChannel(cfg, env, options = {}) {
	const channelEnvPrefixes = listChannelEnvPrefixes(listBundledChannelPluginIds());
	for (const [key, value] of Object.entries(env)) {
		if (!hasNonEmptyString(value)) continue;
		if (channelEnvPrefixes.some(([prefix]) => key.startsWith(prefix))) return true;
	}
	if (options.includePersistedAuthState === false || !hasPersistedChannelState(env)) return false;
	return PERSISTED_AUTH_STATE_CHANNEL_IDS.some((channelId) => hasBundledChannelPersistedAuthState({
		channelId,
		cfg,
		env
	}));
}
function hasPotentialConfiguredChannels(cfg, env = process.env, options = {}) {
	const channels = isRecord(cfg?.channels) ? cfg.channels : null;
	if (channels) for (const [key, value] of Object.entries(channels)) {
		if (IGNORED_CHANNEL_CONFIG_KEYS.has(key)) continue;
		if (hasMeaningfulChannelConfig(value)) return true;
	}
	return hasEnvConfiguredChannel(cfg ?? {}, env, options);
}
//#endregion
export { hasBundledChannelPackageState as a, hasBundledChannelPersistedAuthState as i, hasPotentialConfiguredChannels as n, listPotentialConfiguredChannelIds as r, hasMeaningfulChannelConfig as t };
