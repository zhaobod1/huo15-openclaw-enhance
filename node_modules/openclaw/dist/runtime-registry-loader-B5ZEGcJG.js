import { r as getActivePluginRegistry } from "./runtime-Dji2WXDE.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { t as applyPluginAutoEnable } from "./plugin-auto-enable-B7CYXHId.js";
import { n as loadOpenClawPlugins } from "./loader-BkajlJCF.js";
import "./config-dzPpvDz6.js";
import "./logging-C4AfZy9u.js";
import { n as resolveConfiguredChannelPluginIds, t as resolveChannelPluginIds } from "./channel-plugin-ids-oYGsMsRP.js";
//#region src/plugins/runtime/runtime-registry-loader.ts
const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded = "none";
function scopeRank(scope) {
	switch (scope) {
		case "none": return 0;
		case "configured-channels": return 1;
		case "channels": return 2;
		case "all": return 3;
	}
}
function activeRegistrySatisfiesScope(scope, active, expectedChannelPluginIds, requestedPluginIds) {
	if (!active) return false;
	if (requestedPluginIds.length > 0) {
		const activePluginIds = new Set(active.plugins.filter((plugin) => plugin.status === "loaded").map((plugin) => plugin.id));
		return requestedPluginIds.every((pluginId) => activePluginIds.has(pluginId));
	}
	const activeChannelPluginIds = new Set(active.channels.map((entry) => entry.plugin.id));
	switch (scope) {
		case "configured-channels":
		case "channels": return active.channels.length > 0 && expectedChannelPluginIds.every((pluginId) => activeChannelPluginIds.has(pluginId));
		case "all": return false;
	}
}
function ensurePluginRegistryLoaded(options) {
	const scope = options?.scope ?? "all";
	const requestedPluginIds = options?.onlyPluginIds?.map((pluginId) => pluginId.trim()).filter(Boolean) ?? [];
	const scopedLoad = requestedPluginIds.length > 0;
	if (!scopedLoad && scopeRank(pluginRegistryLoaded) >= scopeRank(scope)) return;
	const env = options?.env ?? process.env;
	const baseConfig = options?.config ?? loadConfig();
	const autoEnabled = applyPluginAutoEnable({
		config: baseConfig,
		env
	});
	const resolvedConfig = autoEnabled.config;
	const workspaceDir = resolveAgentWorkspaceDir(resolvedConfig, resolveDefaultAgentId(resolvedConfig));
	const expectedChannelPluginIds = scopedLoad ? requestedPluginIds : scope === "configured-channels" ? resolveConfiguredChannelPluginIds({
		config: resolvedConfig,
		workspaceDir,
		env
	}) : scope === "channels" ? resolveChannelPluginIds({
		config: resolvedConfig,
		workspaceDir,
		env
	}) : [];
	const active = getActivePluginRegistry();
	if ((pluginRegistryLoaded === "none" || scopedLoad) && activeRegistrySatisfiesScope(scope, active, expectedChannelPluginIds, expectedChannelPluginIds)) {
		if (!scopedLoad) pluginRegistryLoaded = scope;
		return;
	}
	loadOpenClawPlugins({
		config: resolvedConfig,
		activationSourceConfig: options?.activationSourceConfig ?? baseConfig,
		autoEnabledReasons: autoEnabled.autoEnabledReasons,
		workspaceDir,
		logger: {
			info: (msg) => log.info(msg),
			warn: (msg) => log.warn(msg),
			error: (msg) => log.error(msg),
			debug: (msg) => log.debug(msg)
		},
		throwOnLoadError: true,
		...expectedChannelPluginIds.length > 0 ? { onlyPluginIds: expectedChannelPluginIds } : {}
	});
	if (!scopedLoad) pluginRegistryLoaded = scope;
}
const __testing = { resetPluginRegistryLoadedForTests() {
	pluginRegistryLoaded = "none";
} };
//#endregion
export { ensurePluginRegistryLoaded as n, __testing as t };
