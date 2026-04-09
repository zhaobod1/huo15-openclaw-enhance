import { i as openBoundaryFileSync } from "./boundary-file-read-CdxVvait.js";
import { n as buildPluginLoaderJitiOptions, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { a as emptyChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
//#region src/plugin-sdk/channel-entry-contract.ts
const nodeRequire = createRequire(import.meta.url);
const jitiLoaders = /* @__PURE__ */ new Map();
const loadedModuleExports = /* @__PURE__ */ new Map();
function resolveSpecifierCandidates(modulePath) {
	const ext = path.extname(modulePath).toLowerCase();
	if (ext === ".js") return [modulePath, modulePath.slice(0, -3) + ".ts"];
	if (ext === ".mjs") return [modulePath, modulePath.slice(0, -4) + ".mts"];
	if (ext === ".cjs") return [modulePath, modulePath.slice(0, -4) + ".cts"];
	return [modulePath];
}
function resolveEntryBoundaryRoot(importMetaUrl) {
	return path.dirname(fileURLToPath(importMetaUrl));
}
function resolveBundledEntryModulePath(importMetaUrl, specifier) {
	const importerPath = fileURLToPath(importMetaUrl);
	const resolved = path.resolve(path.dirname(importerPath), specifier);
	const boundaryRoot = resolveEntryBoundaryRoot(importMetaUrl);
	const opened = openBoundaryFileSync({
		absolutePath: resolveSpecifierCandidates(resolved).find((entry) => fs.existsSync(entry)) ?? resolved,
		rootPath: boundaryRoot,
		boundaryLabel: "plugin root",
		rejectHardlinks: false,
		skipLexicalRootCheck: true
	});
	if (!opened.ok) throw new Error(`plugin entry path escapes plugin root: ${specifier}`);
	fs.closeSync(opened.fd);
	return opened.path;
}
function getJiti(modulePath) {
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
}
function loadBundledEntryModuleSync(importMetaUrl, specifier) {
	const modulePath = resolveBundledEntryModulePath(importMetaUrl, specifier);
	const cached = loadedModuleExports.get(modulePath);
	if (cached !== void 0) return cached;
	let loaded;
	if (process.platform === "win32" && modulePath.includes(`${path.sep}dist${path.sep}`) && [
		".js",
		".mjs",
		".cjs"
	].includes(path.extname(modulePath).toLowerCase())) try {
		loaded = nodeRequire(modulePath);
	} catch {
		loaded = getJiti(modulePath)(modulePath);
	}
	else loaded = getJiti(modulePath)(modulePath);
	loadedModuleExports.set(modulePath, loaded);
	return loaded;
}
function loadBundledEntryExportSync(importMetaUrl, reference) {
	const loaded = loadBundledEntryModuleSync(importMetaUrl, reference.specifier);
	const resolved = loaded && typeof loaded === "object" && "default" in loaded ? loaded.default : loaded;
	if (!reference.exportName) return resolved;
	const record = resolved ?? loaded;
	if (!record || !(reference.exportName in record)) throw new Error(`missing export "${reference.exportName}" from bundled entry module ${reference.specifier}`);
	return record[reference.exportName];
}
function defineBundledChannelEntry({ id, name, description, importMetaUrl, plugin, configSchema, runtime, registerCliMetadata, registerFull }) {
	const resolvedConfigSchema = typeof configSchema === "function" ? configSchema() : configSchema ?? emptyChannelConfigSchema();
	const loadChannelPlugin = () => loadBundledEntryExportSync(importMetaUrl, plugin);
	const setChannelRuntime = runtime ? (pluginRuntime) => {
		loadBundledEntryExportSync(importMetaUrl, runtime)(pluginRuntime);
	} : void 0;
	return {
		kind: "bundled-channel-entry",
		id,
		name,
		description,
		configSchema: resolvedConfigSchema,
		register(api) {
			if (api.registrationMode === "cli-metadata") {
				registerCliMetadata?.(api);
				return;
			}
			setChannelRuntime?.(api.runtime);
			api.registerChannel({ plugin: loadChannelPlugin() });
			if (api.registrationMode !== "full") return;
			registerCliMetadata?.(api);
			registerFull?.(api);
		},
		loadChannelPlugin,
		...setChannelRuntime ? { setChannelRuntime } : {}
	};
}
function defineBundledChannelSetupEntry({ importMetaUrl, plugin }) {
	return {
		kind: "bundled-channel-setup-entry",
		loadSetupPlugin: () => loadBundledEntryExportSync(importMetaUrl, plugin)
	};
}
//#endregion
export { defineBundledChannelSetupEntry as n, loadBundledEntryExportSync as r, defineBundledChannelEntry as t };
