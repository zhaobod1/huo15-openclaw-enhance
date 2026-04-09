import { n as resolveOpenClawPackageRootSync } from "./openclaw-root-D7WzFglX.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
//#region src/plugins/sdk-alias.ts
const STARTUP_ARGV1 = process.argv[1];
function normalizeJitiAliasTargetPath(targetPath) {
	return process.platform === "win32" ? targetPath.replace(/\\/g, "/") : targetPath;
}
function resolveLoaderModulePath(params = {}) {
	return params.modulePath ?? fileURLToPath(params.moduleUrl ?? import.meta.url);
}
function readPluginSdkPackageJson(packageRoot) {
	try {
		const pkgRaw = fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8");
		return JSON.parse(pkgRaw);
	} catch {
		return null;
	}
}
function isSafePluginSdkSubpathSegment(subpath) {
	return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(subpath);
}
function listPluginSdkSubpathsFromPackageJson(pkg) {
	return Object.keys(pkg.exports ?? {}).filter((key) => key.startsWith("./plugin-sdk/")).map((key) => key.slice(13)).filter((subpath) => isSafePluginSdkSubpathSegment(subpath)).toSorted();
}
function hasTrustedOpenClawRootIndicator(params) {
	const packageExports = params.packageJson.exports ?? {};
	if (!Object.prototype.hasOwnProperty.call(packageExports, "./plugin-sdk")) return false;
	const hasCliEntryExport = Object.prototype.hasOwnProperty.call(packageExports, "./cli-entry");
	const hasOpenClawBin = typeof params.packageJson.bin === "string" && params.packageJson.bin.toLowerCase().includes("openclaw") || typeof params.packageJson.bin === "object" && params.packageJson.bin !== null && typeof params.packageJson.bin.openclaw === "string";
	const hasOpenClawEntrypoint = fs.existsSync(path.join(params.packageRoot, "openclaw.mjs"));
	return hasCliEntryExport || hasOpenClawBin || hasOpenClawEntrypoint;
}
function readPluginSdkSubpathsFromPackageRoot(packageRoot) {
	const pkg = readPluginSdkPackageJson(packageRoot);
	if (!pkg) return null;
	if (!hasTrustedOpenClawRootIndicator({
		packageRoot,
		packageJson: pkg
	})) return null;
	const subpaths = listPluginSdkSubpathsFromPackageJson(pkg);
	return subpaths.length > 0 ? subpaths : null;
}
function resolveTrustedOpenClawRootFromArgvHint(params) {
	if (!params.argv1) return null;
	const packageRoot = resolveOpenClawPackageRootSync({
		cwd: params.cwd,
		argv1: params.argv1
	});
	if (!packageRoot) return null;
	const packageJson = readPluginSdkPackageJson(packageRoot);
	if (!packageJson) return null;
	return hasTrustedOpenClawRootIndicator({
		packageRoot,
		packageJson
	}) ? packageRoot : null;
}
function findNearestPluginSdkPackageRoot(startDir, maxDepth = 12) {
	let cursor = path.resolve(startDir);
	for (let i = 0; i < maxDepth; i += 1) {
		if (readPluginSdkSubpathsFromPackageRoot(cursor)) return cursor;
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
	return null;
}
function resolveLoaderPackageRoot(params) {
	const cwd = params.cwd ?? path.dirname(params.modulePath);
	const fromModulePath = resolveOpenClawPackageRootSync({ cwd });
	if (fromModulePath) return fromModulePath;
	const argv1 = params.argv1 ?? process.argv[1];
	const moduleUrl = params.moduleUrl ?? (params.modulePath ? void 0 : import.meta.url);
	return resolveOpenClawPackageRootSync({
		cwd,
		...argv1 ? { argv1 } : {},
		...moduleUrl ? { moduleUrl } : {}
	});
}
function resolveLoaderPluginSdkPackageRoot(params) {
	const cwd = params.cwd ?? path.dirname(params.modulePath);
	const fromCwd = resolveOpenClawPackageRootSync({ cwd });
	const fromExplicitHints = resolveTrustedOpenClawRootFromArgvHint({
		cwd,
		argv1: params.argv1
	}) ?? (params.moduleUrl ? resolveOpenClawPackageRootSync({
		cwd,
		moduleUrl: params.moduleUrl
	}) : null);
	return fromCwd ?? fromExplicitHints ?? findNearestPluginSdkPackageRoot(path.dirname(params.modulePath)) ?? (params.cwd ? findNearestPluginSdkPackageRoot(params.cwd) : null) ?? findNearestPluginSdkPackageRoot(process.cwd());
}
function resolvePluginSdkAliasCandidateOrder(params) {
	if (params.pluginSdkResolution === "dist") return ["dist", "src"];
	if (params.pluginSdkResolution === "src") return ["src", "dist"];
	return params.modulePath.replace(/\\/g, "/").includes("/dist/") || params.isProduction ? ["dist", "src"] : ["src", "dist"];
}
function listPluginSdkAliasCandidates(params) {
	const orderedKinds = resolvePluginSdkAliasCandidateOrder({
		modulePath: params.modulePath,
		isProduction: true,
		pluginSdkResolution: params.pluginSdkResolution
	});
	const packageRoot = resolveLoaderPluginSdkPackageRoot(params);
	if (packageRoot) {
		const candidateMap = {
			src: path.join(packageRoot, "src", "plugin-sdk", params.srcFile),
			dist: path.join(packageRoot, "dist", "plugin-sdk", params.distFile)
		};
		return orderedKinds.map((kind) => candidateMap[kind]);
	}
	let cursor = path.dirname(params.modulePath);
	const candidates = [];
	for (let i = 0; i < 6; i += 1) {
		const candidateMap = {
			src: path.join(cursor, "src", "plugin-sdk", params.srcFile),
			dist: path.join(cursor, "dist", "plugin-sdk", params.distFile)
		};
		for (const kind of orderedKinds) candidates.push(candidateMap[kind]);
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
	return candidates;
}
function resolvePluginSdkAliasFile(params) {
	try {
		const modulePath = resolveLoaderModulePath(params);
		for (const candidate of listPluginSdkAliasCandidates({
			srcFile: params.srcFile,
			distFile: params.distFile,
			modulePath,
			argv1: params.argv1,
			cwd: params.cwd,
			moduleUrl: params.moduleUrl,
			pluginSdkResolution: params.pluginSdkResolution
		})) if (fs.existsSync(candidate)) return candidate;
	} catch {}
	return null;
}
const cachedPluginSdkExportedSubpaths = /* @__PURE__ */ new Map();
const cachedPluginSdkScopedAliasMaps = /* @__PURE__ */ new Map();
function listPluginSdkExportedSubpaths(params = {}) {
	const packageRoot = resolveLoaderPluginSdkPackageRoot({
		modulePath: params.modulePath ?? fileURLToPath(import.meta.url),
		argv1: params.argv1,
		moduleUrl: params.moduleUrl
	});
	if (!packageRoot) return [];
	const cached = cachedPluginSdkExportedSubpaths.get(packageRoot);
	if (cached) return cached;
	const subpaths = readPluginSdkSubpathsFromPackageRoot(packageRoot) ?? [];
	cachedPluginSdkExportedSubpaths.set(packageRoot, subpaths);
	return subpaths;
}
function resolvePluginSdkScopedAliasMap(params = {}) {
	const modulePath = params.modulePath ?? fileURLToPath(import.meta.url);
	const packageRoot = resolveLoaderPluginSdkPackageRoot({
		modulePath,
		argv1: params.argv1,
		moduleUrl: params.moduleUrl
	});
	if (!packageRoot) return {};
	const orderedKinds = resolvePluginSdkAliasCandidateOrder({
		modulePath,
		isProduction: true,
		pluginSdkResolution: params.pluginSdkResolution
	});
	const cacheKey = `${packageRoot}::${orderedKinds.join(",")}`;
	const cached = cachedPluginSdkScopedAliasMaps.get(cacheKey);
	if (cached) return cached;
	const aliasMap = {};
	for (const subpath of listPluginSdkExportedSubpaths({
		modulePath,
		argv1: params.argv1,
		moduleUrl: params.moduleUrl,
		pluginSdkResolution: params.pluginSdkResolution
	})) {
		const candidateMap = {
			src: path.join(packageRoot, "src", "plugin-sdk", `${subpath}.ts`),
			dist: path.join(packageRoot, "dist", "plugin-sdk", `${subpath}.js`)
		};
		for (const kind of orderedKinds) {
			const candidate = candidateMap[kind];
			if (fs.existsSync(candidate)) {
				aliasMap[`openclaw/plugin-sdk/${subpath}`] = candidate;
				break;
			}
		}
	}
	cachedPluginSdkScopedAliasMaps.set(cacheKey, aliasMap);
	return aliasMap;
}
function resolveExtensionApiAlias(params = {}) {
	try {
		const modulePath = resolveLoaderModulePath(params);
		const packageRoot = resolveLoaderPackageRoot({
			...params,
			modulePath
		});
		if (!packageRoot) return null;
		const orderedKinds = resolvePluginSdkAliasCandidateOrder({
			modulePath,
			isProduction: true,
			pluginSdkResolution: params.pluginSdkResolution
		});
		const candidateMap = {
			src: path.join(packageRoot, "src", "extensionAPI.ts"),
			dist: path.join(packageRoot, "dist", "extensionAPI.js")
		};
		for (const kind of orderedKinds) {
			const candidate = candidateMap[kind];
			if (fs.existsSync(candidate)) return candidate;
		}
	} catch {}
	return null;
}
function buildPluginLoaderAliasMap(modulePath, argv1 = STARTUP_ARGV1, moduleUrl, pluginSdkResolution = "auto") {
	const pluginSdkAlias = resolvePluginSdkAliasFile({
		srcFile: "root-alias.cjs",
		distFile: "root-alias.cjs",
		modulePath,
		argv1,
		moduleUrl,
		pluginSdkResolution
	});
	const extensionApiAlias = resolveExtensionApiAlias({
		modulePath,
		pluginSdkResolution
	});
	return {
		...extensionApiAlias ? { "openclaw/extension-api": normalizeJitiAliasTargetPath(extensionApiAlias) } : {},
		...pluginSdkAlias ? { "openclaw/plugin-sdk": normalizeJitiAliasTargetPath(pluginSdkAlias) } : {},
		...Object.fromEntries(Object.entries(resolvePluginSdkScopedAliasMap({
			modulePath,
			argv1,
			moduleUrl,
			pluginSdkResolution
		})).map(([key, value]) => [key, normalizeJitiAliasTargetPath(value)]))
	};
}
function resolvePluginRuntimeModulePath(params = {}) {
	try {
		const modulePath = resolveLoaderModulePath(params);
		const orderedKinds = resolvePluginSdkAliasCandidateOrder({
			modulePath,
			isProduction: true,
			pluginSdkResolution: params.pluginSdkResolution
		});
		const packageRoot = resolveLoaderPackageRoot({
			...params,
			modulePath
		});
		const candidates = packageRoot ? orderedKinds.map((kind) => kind === "src" ? path.join(packageRoot, "src", "plugins", "runtime", "index.ts") : path.join(packageRoot, "dist", "plugins", "runtime", "index.js")) : [path.join(path.dirname(modulePath), "runtime", "index.ts"), path.join(path.dirname(modulePath), "runtime", "index.js")];
		for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
	} catch {}
	return null;
}
function buildPluginLoaderJitiOptions(aliasMap) {
	return {
		interopDefault: true,
		tryNative: true,
		extensions: [
			".ts",
			".tsx",
			".mts",
			".cts",
			".mtsx",
			".ctsx",
			".js",
			".mjs",
			".cjs",
			".json"
		],
		...Object.keys(aliasMap).length > 0 ? { alias: aliasMap } : {}
	};
}
function shouldPreferNativeJiti(modulePath) {
	if (typeof process.versions.bun === "string") return false;
	if (process.platform === "win32") return false;
	switch (path.extname(modulePath).toLowerCase()) {
		case ".js":
		case ".mjs":
		case ".cjs":
		case ".json": return true;
		default: return false;
	}
}
//#endregion
export { resolvePluginSdkAliasFile as a, resolvePluginRuntimeModulePath as i, buildPluginLoaderJitiOptions as n, resolvePluginSdkScopedAliasMap as o, resolveLoaderPackageRoot as r, shouldPreferNativeJiti as s, buildPluginLoaderAliasMap as t };
