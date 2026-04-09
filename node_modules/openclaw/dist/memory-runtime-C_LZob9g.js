import { t as applyPluginAutoEnable } from "./plugin-auto-enable-B7CYXHId.js";
import { i as resolveRuntimePluginRegistry } from "./loader-BkajlJCF.js";
import { a as getMemoryRuntime } from "./memory-state-BWbQIcQt.js";
//#region src/plugins/memory-runtime.ts
function ensureMemoryRuntime(cfg) {
	const current = getMemoryRuntime();
	if (current || !cfg) return current;
	const autoEnabled = applyPluginAutoEnable({
		config: cfg,
		env: process.env
	});
	resolveRuntimePluginRegistry({
		config: autoEnabled.config,
		activationSourceConfig: cfg,
		autoEnabledReasons: autoEnabled.autoEnabledReasons
	});
	return getMemoryRuntime();
}
async function getActiveMemorySearchManager(params) {
	const runtime = ensureMemoryRuntime(params.cfg);
	if (!runtime) return {
		manager: null,
		error: "memory plugin unavailable"
	};
	return await runtime.getMemorySearchManager(params);
}
function resolveActiveMemoryBackendConfig(params) {
	return ensureMemoryRuntime(params.cfg)?.resolveMemoryBackendConfig(params) ?? null;
}
async function closeActiveMemorySearchManagers(cfg) {
	await getMemoryRuntime()?.closeAllMemorySearchManagers?.();
}
//#endregion
export { getActiveMemorySearchManager as n, resolveActiveMemoryBackendConfig as r, closeActiveMemorySearchManagers as t };
