import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { t as applyPluginAutoEnable } from "./plugin-auto-enable-B7CYXHId.js";
import { n as loadOpenClawPlugins } from "./loader-BkajlJCF.js";
import "./config-dzPpvDz6.js";
import "./logging-C4AfZy9u.js";
//#region src/plugins/runtime/metadata-registry-loader.ts
const log = createSubsystemLogger("plugins");
function loadPluginMetadataRegistrySnapshot(options) {
	const env = options?.env ?? process.env;
	const baseConfig = options?.config ?? loadConfig();
	const autoEnabled = applyPluginAutoEnable({
		config: baseConfig,
		env
	});
	const resolvedConfig = autoEnabled.config;
	const workspaceDir = options?.workspaceDir ?? resolveAgentWorkspaceDir(resolvedConfig, resolveDefaultAgentId(resolvedConfig));
	return loadOpenClawPlugins({
		config: resolvedConfig,
		activationSourceConfig: options?.activationSourceConfig ?? baseConfig,
		autoEnabledReasons: autoEnabled.autoEnabledReasons,
		workspaceDir,
		env,
		logger: {
			info: (message) => log.info(message),
			warn: (message) => log.warn(message),
			error: (message) => log.error(message),
			debug: (message) => log.debug(message)
		},
		throwOnLoadError: true,
		cache: false,
		activate: false,
		mode: "validate",
		loadModules: options?.loadModules,
		...options?.onlyPluginIds?.length ? { onlyPluginIds: options.onlyPluginIds } : {}
	});
}
//#endregion
export { loadPluginMetadataRegistrySnapshot as t };
