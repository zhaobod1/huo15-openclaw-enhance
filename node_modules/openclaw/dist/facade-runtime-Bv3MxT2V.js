import { i as openBoundaryFileSync } from "./boundary-file-read-CdxVvait.js";
import { l as resolveBundledPluginsDir } from "./ids-Dm8ff2qI.js";
import { o as resolveConfigPath } from "./paths-yyDPxM31.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { n as buildPluginLoaderJitiOptions, r as resolveLoaderPackageRoot, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { a as normalizePluginsConfig, n as createPluginActivationSource, s as resolveEffectivePluginActivationState } from "./config-state-CKMpUUgI.js";
import { t as applyPluginAutoEnable } from "./plugin-auto-enable-B7CYXHId.js";
import { n as getRuntimeConfigSnapshot } from "./runtime-snapshot-BQtdTwL2.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { createJiti } from "jiti";
//#region src/plugins/public-surface-runtime.ts
const PUBLIC_SURFACE_SOURCE_EXTENSIONS$1 = [
	".ts",
	".mts",
	".js",
	".mjs",
	".cts",
	".cjs"
];
function resolveBundledPluginPublicSurfacePath(params) {
	const artifactBasename = params.artifactBasename.replace(/^\.\//u, "");
	if (!artifactBasename) return null;
	const explicitBundledPluginsDir = params.bundledPluginsDir ?? resolveBundledPluginsDir(params.env ?? process.env);
	if (explicitBundledPluginsDir) {
		const explicitPluginDir = path.resolve(explicitBundledPluginsDir, params.dirName);
		const explicitBuiltCandidate = path.join(explicitPluginDir, artifactBasename);
		if (fs.existsSync(explicitBuiltCandidate)) return explicitBuiltCandidate;
		const sourceBaseName = artifactBasename.replace(/\.js$/u, "");
		for (const ext of PUBLIC_SURFACE_SOURCE_EXTENSIONS$1) {
			const sourceCandidate = path.join(explicitPluginDir, `${sourceBaseName}${ext}`);
			if (fs.existsSync(sourceCandidate)) return sourceCandidate;
		}
	}
	for (const candidate of [path.resolve(params.rootDir, "dist", "extensions", params.dirName, artifactBasename), path.resolve(params.rootDir, "dist-runtime", "extensions", params.dirName, artifactBasename)]) if (fs.existsSync(candidate)) return candidate;
	const sourceBaseName = artifactBasename.replace(/\.js$/u, "");
	for (const ext of PUBLIC_SURFACE_SOURCE_EXTENSIONS$1) {
		const sourceCandidate = path.resolve(params.rootDir, "extensions", params.dirName, `${sourceBaseName}${ext}`);
		if (fs.existsSync(sourceCandidate)) return sourceCandidate;
	}
	return null;
}
//#endregion
//#region src/plugin-sdk/facade-runtime.ts
const OPENCLAW_PACKAGE_ROOT = resolveLoaderPackageRoot({
	modulePath: fileURLToPath(import.meta.url),
	moduleUrl: import.meta.url
}) ?? fileURLToPath(new URL("../..", import.meta.url));
const CURRENT_MODULE_PATH = fileURLToPath(import.meta.url);
const PUBLIC_SURFACE_SOURCE_EXTENSIONS = [
	".ts",
	".mts",
	".js",
	".mjs",
	".cts",
	".cjs"
];
const ALWAYS_ALLOWED_RUNTIME_DIR_NAMES = new Set([
	"image-generation-core",
	"media-understanding-core",
	"speech-core"
]);
const EMPTY_FACADE_BOUNDARY_CONFIG = {};
const jitiLoaders = /* @__PURE__ */ new Map();
const loadedFacadeModules = /* @__PURE__ */ new Map();
const loadedFacadePluginIds = /* @__PURE__ */ new Set();
let cachedBoundaryRawConfig;
let cachedBoundaryResolvedConfig;
function resolveSourceFirstPublicSurfacePath(params) {
	const sourceBaseName = params.artifactBasename.replace(/\.js$/u, "");
	const sourceRoot = params.bundledPluginsDir ?? path.resolve(OPENCLAW_PACKAGE_ROOT, "extensions");
	for (const ext of PUBLIC_SURFACE_SOURCE_EXTENSIONS) {
		const candidate = path.resolve(sourceRoot, params.dirName, `${sourceBaseName}${ext}`);
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}
function resolveRegistryPluginModuleLocation(params) {
	const { config } = getFacadeBoundaryResolvedConfig();
	const registry = loadPluginManifestRegistry({
		config,
		cache: true
	}).plugins;
	const tiers = [
		(plugin) => plugin.id === params.dirName,
		(plugin) => path.basename(plugin.rootDir) === params.dirName,
		(plugin) => plugin.channels.includes(params.dirName)
	];
	const artifactBasename = params.artifactBasename.replace(/^\.\//u, "");
	const sourceBaseName = artifactBasename.replace(/\.js$/u, "");
	for (const matchFn of tiers) for (const record of registry.filter(matchFn)) {
		const rootDir = path.resolve(record.rootDir);
		const builtCandidate = path.join(rootDir, artifactBasename);
		if (fs.existsSync(builtCandidate)) return {
			modulePath: builtCandidate,
			boundaryRoot: rootDir
		};
		for (const ext of PUBLIC_SURFACE_SOURCE_EXTENSIONS) {
			const sourceCandidate = path.join(rootDir, `${sourceBaseName}${ext}`);
			if (fs.existsSync(sourceCandidate)) return {
				modulePath: sourceCandidate,
				boundaryRoot: rootDir
			};
		}
	}
	return null;
}
function resolveFacadeModuleLocation(params) {
	const bundledPluginsDir = resolveBundledPluginsDir();
	if (!CURRENT_MODULE_PATH.includes(`${path.sep}dist${path.sep}`)) {
		const modulePath = resolveSourceFirstPublicSurfacePath({
			...params,
			...bundledPluginsDir ? { bundledPluginsDir } : {}
		}) ?? resolveSourceFirstPublicSurfacePath(params) ?? resolveBundledPluginPublicSurfacePath({
			rootDir: OPENCLAW_PACKAGE_ROOT,
			...bundledPluginsDir ? { bundledPluginsDir } : {},
			dirName: params.dirName,
			artifactBasename: params.artifactBasename
		});
		if (modulePath) return {
			modulePath,
			boundaryRoot: bundledPluginsDir && modulePath.startsWith(path.resolve(bundledPluginsDir) + path.sep) ? path.resolve(bundledPluginsDir) : OPENCLAW_PACKAGE_ROOT
		};
		return resolveRegistryPluginModuleLocation(params);
	}
	const modulePath = resolveBundledPluginPublicSurfacePath({
		rootDir: OPENCLAW_PACKAGE_ROOT,
		...bundledPluginsDir ? { bundledPluginsDir } : {},
		dirName: params.dirName,
		artifactBasename: params.artifactBasename
	});
	if (modulePath) return {
		modulePath,
		boundaryRoot: bundledPluginsDir && modulePath.startsWith(path.resolve(bundledPluginsDir) + path.sep) ? path.resolve(bundledPluginsDir) : OPENCLAW_PACKAGE_ROOT
	};
	return resolveRegistryPluginModuleLocation(params);
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
function readFacadeBoundaryConfigSafely() {
	try {
		const runtimeSnapshot = getRuntimeConfigSnapshot();
		if (runtimeSnapshot) return runtimeSnapshot;
		const configPath = resolveConfigPath();
		if (!fs.existsSync(configPath)) return EMPTY_FACADE_BOUNDARY_CONFIG;
		const raw = fs.readFileSync(configPath, "utf8");
		const parsed = JSON5.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : EMPTY_FACADE_BOUNDARY_CONFIG;
	} catch {
		return EMPTY_FACADE_BOUNDARY_CONFIG;
	}
}
function getFacadeBoundaryResolvedConfig() {
	const rawConfig = readFacadeBoundaryConfigSafely();
	if (cachedBoundaryResolvedConfig && cachedBoundaryRawConfig === rawConfig) return cachedBoundaryResolvedConfig;
	const autoEnabled = applyPluginAutoEnable({
		config: rawConfig,
		env: process.env
	});
	const config = autoEnabled.config;
	const resolved = {
		rawConfig,
		config,
		normalizedPluginsConfig: normalizePluginsConfig(config?.plugins),
		activationSource: createPluginActivationSource({ config: rawConfig }),
		autoEnabledReasons: autoEnabled.autoEnabledReasons
	};
	cachedBoundaryRawConfig = rawConfig;
	cachedBoundaryResolvedConfig = resolved;
	return resolved;
}
function resolveBundledPluginManifestRecord(params) {
	const { config } = getFacadeBoundaryResolvedConfig();
	const registry = loadPluginManifestRegistry({
		config,
		cache: true
	}).plugins;
	const location = resolveFacadeModuleLocation(params);
	if (location) {
		const normalizedModulePath = path.resolve(location.modulePath);
		const matchedRecord = registry.find((plugin) => {
			const normalizedRootDir = path.resolve(plugin.rootDir);
			return normalizedModulePath === normalizedRootDir || normalizedModulePath.startsWith(`${normalizedRootDir}${path.sep}`);
		});
		if (matchedRecord) return matchedRecord;
	}
	return registry.find((plugin) => plugin.id === params.dirName) ?? registry.find((plugin) => path.basename(plugin.rootDir) === params.dirName) ?? registry.find((plugin) => plugin.channels.includes(params.dirName)) ?? null;
}
function resolveTrackedFacadePluginId(params) {
	return resolveBundledPluginManifestRecord(params)?.id ?? params.dirName;
}
function resolveBundledPluginPublicSurfaceAccess(params) {
	if (params.artifactBasename === "runtime-api.js" && ALWAYS_ALLOWED_RUNTIME_DIR_NAMES.has(params.dirName)) return {
		allowed: true,
		pluginId: params.dirName
	};
	const manifestRecord = resolveBundledPluginManifestRecord(params);
	if (!manifestRecord) return {
		allowed: false,
		reason: `no bundled plugin manifest found for ${params.dirName}`
	};
	const { config, normalizedPluginsConfig, activationSource, autoEnabledReasons } = getFacadeBoundaryResolvedConfig();
	const activationState = resolveEffectivePluginActivationState({
		id: manifestRecord.id,
		origin: manifestRecord.origin,
		config: normalizedPluginsConfig,
		rootConfig: config,
		enabledByDefault: manifestRecord.enabledByDefault,
		activationSource,
		autoEnabledReason: autoEnabledReasons[manifestRecord.id]?.[0]
	});
	if (activationState.enabled) return {
		allowed: true,
		pluginId: manifestRecord.id
	};
	return {
		allowed: false,
		pluginId: manifestRecord.id,
		reason: activationState.reason ?? "plugin runtime is not activated"
	};
}
function createLazyFacadeValueLoader(load) {
	let loaded = false;
	let value;
	return () => {
		if (!loaded) {
			value = load();
			loaded = true;
		}
		return value;
	};
}
function createLazyFacadeProxyValue(params) {
	const resolve = createLazyFacadeValueLoader(params.load);
	return new Proxy(params.target, {
		defineProperty(_target, property, descriptor) {
			return Reflect.defineProperty(resolve(), property, descriptor);
		},
		deleteProperty(_target, property) {
			return Reflect.deleteProperty(resolve(), property);
		},
		get(_target, property, receiver) {
			return Reflect.get(resolve(), property, receiver);
		},
		getOwnPropertyDescriptor(_target, property) {
			return Reflect.getOwnPropertyDescriptor(resolve(), property);
		},
		getPrototypeOf() {
			return Reflect.getPrototypeOf(resolve());
		},
		has(_target, property) {
			return Reflect.has(resolve(), property);
		},
		isExtensible() {
			return Reflect.isExtensible(resolve());
		},
		ownKeys() {
			return Reflect.ownKeys(resolve());
		},
		preventExtensions() {
			return Reflect.preventExtensions(resolve());
		},
		set(_target, property, value, receiver) {
			return Reflect.set(resolve(), property, value, receiver);
		},
		setPrototypeOf(_target, prototype) {
			return Reflect.setPrototypeOf(resolve(), prototype);
		}
	});
}
function createLazyFacadeObjectValue(load) {
	return createLazyFacadeProxyValue({
		load,
		target: {}
	});
}
function createLazyFacadeArrayValue(load) {
	return createLazyFacadeProxyValue({
		load,
		target: []
	});
}
function loadBundledPluginPublicSurfaceModuleSync(params) {
	const location = resolveFacadeModuleLocation(params);
	if (!location) throw new Error(`Unable to resolve bundled plugin public surface ${params.dirName}/${params.artifactBasename}`);
	const cached = loadedFacadeModules.get(location.modulePath);
	if (cached) return cached;
	const opened = openBoundaryFileSync({
		absolutePath: location.modulePath,
		rootPath: location.boundaryRoot,
		boundaryLabel: location.boundaryRoot === OPENCLAW_PACKAGE_ROOT ? "OpenClaw package root" : (() => {
			const bundledDir = resolveBundledPluginsDir();
			return bundledDir && path.resolve(location.boundaryRoot) === path.resolve(bundledDir) ? "bundled plugin directory" : "plugin root";
		})(),
		rejectHardlinks: false
	});
	if (!opened.ok) throw new Error(`Unable to open bundled plugin public surface ${params.dirName}/${params.artifactBasename}`, { cause: opened.error });
	fs.closeSync(opened.fd);
	const sentinel = {};
	loadedFacadeModules.set(location.modulePath, sentinel);
	let loaded;
	try {
		loaded = getJiti(location.modulePath)(location.modulePath);
		Object.assign(sentinel, loaded);
		loadedFacadePluginIds.add(resolveTrackedFacadePluginId(params));
	} catch (err) {
		loadedFacadeModules.delete(location.modulePath);
		throw err;
	}
	return sentinel;
}
function loadActivatedBundledPluginPublicSurfaceModuleSync(params) {
	const access = resolveBundledPluginPublicSurfaceAccess(params);
	if (!access.allowed) {
		const pluginLabel = access.pluginId ?? params.dirName;
		throw new Error(`Bundled plugin public surface access blocked for "${pluginLabel}" via ${params.dirName}/${params.artifactBasename}: ${access.reason ?? "plugin runtime is not activated"}`);
	}
	return loadBundledPluginPublicSurfaceModuleSync(params);
}
function tryLoadActivatedBundledPluginPublicSurfaceModuleSync(params) {
	if (!resolveBundledPluginPublicSurfaceAccess(params).allowed) return null;
	return loadBundledPluginPublicSurfaceModuleSync(params);
}
function listImportedBundledPluginFacadeIds() {
	return [...loadedFacadePluginIds].toSorted((left, right) => left.localeCompare(right));
}
//#endregion
export { loadBundledPluginPublicSurfaceModuleSync as a, loadActivatedBundledPluginPublicSurfaceModuleSync as i, createLazyFacadeObjectValue as n, tryLoadActivatedBundledPluginPublicSurfaceModuleSync as o, listImportedBundledPluginFacadeIds as r, createLazyFacadeArrayValue as t };
