import { i as openBoundaryFileSync } from "./boundary-file-read-CdxVvait.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { n as buildPluginLoaderJitiOptions, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { t as listBundledChannelPluginIds } from "./bundled-ids-DTOingUD.js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
//#region src/channels/plugins/bundled.ts
const log = createSubsystemLogger("channels");
const nodeRequire = createRequire(import.meta.url);
function resolveChannelPluginModuleEntry(moduleExport) {
	const resolved = moduleExport && typeof moduleExport === "object" && "default" in moduleExport ? moduleExport.default : moduleExport;
	if (!resolved || typeof resolved !== "object") return null;
	const record = resolved;
	if (record.kind !== "bundled-channel-entry") return null;
	if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.description !== "string" || typeof record.register !== "function" || typeof record.loadChannelPlugin !== "function") return null;
	return record;
}
function resolveChannelSetupModuleEntry(moduleExport) {
	const resolved = moduleExport && typeof moduleExport === "object" && "default" in moduleExport ? moduleExport.default : moduleExport;
	if (!resolved || typeof resolved !== "object") return null;
	const record = resolved;
	if (record.kind !== "bundled-channel-setup-entry") return null;
	if (typeof record.loadSetupPlugin !== "function") return null;
	return record;
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
function loadBundledModule(modulePath, rootDir) {
	const opened = openBoundaryFileSync({
		absolutePath: modulePath,
		rootPath: resolveCompiledBundledModulePath(rootDir),
		boundaryLabel: "plugin root",
		rejectHardlinks: false,
		skipLexicalRootCheck: true
	});
	if (!opened.ok) throw new Error("plugin entry path escapes plugin root or fails alias checks");
	const safePath = opened.path;
	fs.closeSync(opened.fd);
	if (process.platform === "win32" && safePath.includes(`${path.sep}dist${path.sep}`) && [
		".js",
		".mjs",
		".cjs"
	].includes(path.extname(safePath).toLowerCase())) try {
		return nodeRequire(safePath);
	} catch {}
	return loadModule(safePath)(safePath);
}
function resolveCompiledBundledModulePath(modulePath) {
	const compiledDistModulePath = modulePath.replace(`${path.sep}dist-runtime${path.sep}`, `${path.sep}dist${path.sep}`);
	return compiledDistModulePath !== modulePath && fs.existsSync(compiledDistModulePath) ? compiledDistModulePath : modulePath;
}
function loadGeneratedBundledChannelEntries() {
	const manifestRegistry = loadPluginManifestRegistry({
		cache: false,
		config: {}
	});
	const entries = [];
	for (const manifest of manifestRegistry.plugins) {
		if (manifest.origin !== "bundled" || manifest.channels.length === 0) continue;
		try {
			const sourcePath = resolveCompiledBundledModulePath(manifest.source);
			const entry = resolveChannelPluginModuleEntry(loadBundledModule(sourcePath, manifest.rootDir));
			if (!entry) {
				log.warn(`[channels] bundled channel entry ${manifest.id} missing bundled-channel-entry contract from ${sourcePath}; skipping`);
				continue;
			}
			const setupEntry = manifest.setupSource ? resolveChannelSetupModuleEntry(loadBundledModule(resolveCompiledBundledModulePath(manifest.setupSource), manifest.rootDir)) : null;
			entries.push({
				id: manifest.id,
				entry,
				...setupEntry ? { setupEntry } : {}
			});
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			log.warn(`[channels] failed to load bundled channel ${manifest.id} from ${manifest.source}: ${detail}`);
		}
	}
	return entries;
}
const EMPTY_BUNDLED_CHANNEL_STATE = {
	entries: [],
	entriesById: /* @__PURE__ */ new Map(),
	setupEntriesById: /* @__PURE__ */ new Map(),
	sortedIds: [],
	pluginsById: /* @__PURE__ */ new Map(),
	setupPluginsById: /* @__PURE__ */ new Map(),
	runtimeSettersById: /* @__PURE__ */ new Map()
};
let cachedBundledChannelState = null;
let bundledChannelStateLoadInProgress = false;
const pluginLoadInProgressIds = /* @__PURE__ */ new Set();
const setupPluginLoadInProgressIds = /* @__PURE__ */ new Set();
function getBundledChannelState() {
	if (cachedBundledChannelState) return cachedBundledChannelState;
	if (bundledChannelStateLoadInProgress) return EMPTY_BUNDLED_CHANNEL_STATE;
	bundledChannelStateLoadInProgress = true;
	const entries = loadGeneratedBundledChannelEntries();
	const entriesById = /* @__PURE__ */ new Map();
	const setupEntriesById = /* @__PURE__ */ new Map();
	const runtimeSettersById = /* @__PURE__ */ new Map();
	for (const { entry } of entries) {
		if (entriesById.has(entry.id)) throw new Error(`duplicate bundled channel plugin id: ${entry.id}`);
		entriesById.set(entry.id, entry);
		if (entry.setChannelRuntime) runtimeSettersById.set(entry.id, entry.setChannelRuntime);
	}
	for (const { id, setupEntry } of entries) if (setupEntry) setupEntriesById.set(id, setupEntry);
	try {
		cachedBundledChannelState = {
			entries,
			entriesById,
			setupEntriesById,
			sortedIds: [...entriesById.keys()].toSorted((left, right) => left.localeCompare(right)),
			pluginsById: /* @__PURE__ */ new Map(),
			setupPluginsById: /* @__PURE__ */ new Map(),
			runtimeSettersById
		};
		return cachedBundledChannelState;
	} finally {
		bundledChannelStateLoadInProgress = false;
	}
}
function listBundledChannelPlugins() {
	return getBundledChannelState().sortedIds.flatMap((id) => {
		const plugin = getBundledChannelPlugin(id);
		return plugin ? [plugin] : [];
	});
}
function listBundledChannelSetupPlugins() {
	return getBundledChannelState().sortedIds.flatMap((id) => {
		const plugin = getBundledChannelSetupPlugin(id);
		return plugin ? [plugin] : [];
	});
}
function getBundledChannelPlugin(id) {
	const state = getBundledChannelState();
	const cached = state.pluginsById.get(id);
	if (cached) return cached;
	if (pluginLoadInProgressIds.has(id)) return;
	const entry = state.entriesById.get(id);
	if (!entry) return;
	pluginLoadInProgressIds.add(id);
	try {
		const plugin = entry.loadChannelPlugin();
		state.pluginsById.set(id, plugin);
		return plugin;
	} finally {
		pluginLoadInProgressIds.delete(id);
	}
}
function getBundledChannelSetupPlugin(id) {
	const state = getBundledChannelState();
	const cached = state.setupPluginsById.get(id);
	if (cached) return cached;
	if (setupPluginLoadInProgressIds.has(id)) return;
	const entry = state.setupEntriesById.get(id);
	if (!entry) return;
	setupPluginLoadInProgressIds.add(id);
	try {
		const plugin = entry.loadSetupPlugin();
		state.setupPluginsById.set(id, plugin);
		return plugin;
	} finally {
		setupPluginLoadInProgressIds.delete(id);
	}
}
function setBundledChannelRuntime(id, runtime) {
	const setter = getBundledChannelState().runtimeSettersById.get(id);
	if (!setter) throw new Error(`missing bundled channel runtime setter: ${id}`);
	setter(runtime);
}
//#endregion
//#region src/channels/plugins/bootstrap-registry.ts
let cachedBootstrapPlugins = null;
function mergePluginSection(runtimeValue, setupValue) {
	if (runtimeValue && setupValue && typeof runtimeValue === "object" && typeof setupValue === "object") return {
		...runtimeValue,
		...setupValue
	};
	return setupValue ?? runtimeValue;
}
function mergeBootstrapPlugin(runtimePlugin, setupPlugin) {
	return {
		...runtimePlugin,
		...setupPlugin,
		meta: mergePluginSection(runtimePlugin.meta, setupPlugin.meta),
		capabilities: mergePluginSection(runtimePlugin.capabilities, setupPlugin.capabilities),
		commands: mergePluginSection(runtimePlugin.commands, setupPlugin.commands),
		doctor: mergePluginSection(runtimePlugin.doctor, setupPlugin.doctor),
		reload: mergePluginSection(runtimePlugin.reload, setupPlugin.reload),
		config: mergePluginSection(runtimePlugin.config, setupPlugin.config),
		setup: mergePluginSection(runtimePlugin.setup, setupPlugin.setup),
		messaging: mergePluginSection(runtimePlugin.messaging, setupPlugin.messaging),
		actions: mergePluginSection(runtimePlugin.actions, setupPlugin.actions),
		secrets: mergePluginSection(runtimePlugin.secrets, setupPlugin.secrets)
	};
}
function buildBootstrapPlugins() {
	return {
		sortedIds: listBundledChannelPluginIds(),
		byId: /* @__PURE__ */ new Map(),
		missingIds: /* @__PURE__ */ new Set()
	};
}
function getBootstrapPlugins() {
	cachedBootstrapPlugins ??= buildBootstrapPlugins();
	return cachedBootstrapPlugins;
}
function listBootstrapChannelPluginIds() {
	return getBootstrapPlugins().sortedIds;
}
function* iterateBootstrapChannelPlugins() {
	for (const id of listBootstrapChannelPluginIds()) {
		const plugin = getBootstrapChannelPlugin(id);
		if (plugin) yield plugin;
	}
}
function getBootstrapChannelPlugin(id) {
	const resolvedId = String(id).trim();
	if (!resolvedId) return;
	const registry = getBootstrapPlugins();
	const cached = registry.byId.get(resolvedId);
	if (cached) return cached;
	if (registry.missingIds.has(resolvedId)) return;
	const runtimePlugin = getBundledChannelPlugin(resolvedId);
	const setupPlugin = getBundledChannelSetupPlugin(resolvedId);
	const merged = runtimePlugin && setupPlugin ? mergeBootstrapPlugin(runtimePlugin, setupPlugin) : setupPlugin ?? runtimePlugin;
	if (!merged) {
		registry.missingIds.add(resolvedId);
		return;
	}
	registry.byId.set(resolvedId, merged);
	return merged;
}
//#endregion
export { setBundledChannelRuntime as a, listBundledChannelSetupPlugins as i, iterateBootstrapChannelPlugins as n, listBundledChannelPlugins as r, getBootstrapChannelPlugin as t };
