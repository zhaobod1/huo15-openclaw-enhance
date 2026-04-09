import { o as getActivePluginRegistryWorkspaceDir } from "./runtime-Dji2WXDE.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { a as resolveEnabledProviderPluginIds, c as withBundledProviderVitestCompat, i as resolveDiscoveredProviderPluginIds, n as resolveBundledProviderCompatPluginIds, o as resolveOwningPluginIdsForModelRefs, s as resolveOwningPluginIdsForProvider } from "./plugin-auto-enable-B7CYXHId.js";
import { r as withActivatedPluginIds, t as resolveBundledPluginCompatibleActivationInputs } from "./activation-context-EoQ_S75w.js";
import { i as resolveRuntimePluginRegistry, n as loadOpenClawPlugins } from "./loader-BkajlJCF.js";
import { t as createPluginLoaderLogger } from "./logger-B9Q6R6gm.js";
//#region src/plugins/providers.runtime.ts
const log = createSubsystemLogger("plugins");
function resolvePluginProviders(params) {
	const env = params.env ?? process.env;
	const workspaceDir = params.workspaceDir ?? getActivePluginRegistryWorkspaceDir();
	const providerOwnedPluginIds = params.providerRefs?.length ? [...new Set(params.providerRefs.flatMap((provider) => resolveOwningPluginIdsForProvider({
		provider,
		config: params.config,
		workspaceDir,
		env
	}) ?? []))] : [];
	const modelOwnedPluginIds = params.modelRefs?.length ? resolveOwningPluginIdsForModelRefs({
		models: params.modelRefs,
		config: params.config,
		workspaceDir,
		env
	}) : [];
	const requestedPluginIds = params.onlyPluginIds || params.providerRefs?.length || params.modelRefs?.length || providerOwnedPluginIds.length > 0 || modelOwnedPluginIds.length > 0 ? [...new Set([
		...params.onlyPluginIds ?? [],
		...providerOwnedPluginIds,
		...modelOwnedPluginIds
	])].toSorted((left, right) => left.localeCompare(right)) : void 0;
	const runtimeConfig = withActivatedPluginIds({
		config: params.config,
		pluginIds: [...providerOwnedPluginIds, ...modelOwnedPluginIds]
	});
	if (params.mode === "setup") {
		const providerPluginIds = resolveDiscoveredProviderPluginIds({
			config: runtimeConfig,
			workspaceDir,
			env,
			onlyPluginIds: requestedPluginIds
		});
		if (providerPluginIds.length === 0) return [];
		return loadOpenClawPlugins({
			config: withActivatedPluginIds({
				config: runtimeConfig,
				pluginIds: providerPluginIds
			}),
			activationSourceConfig: runtimeConfig,
			autoEnabledReasons: {},
			workspaceDir,
			env,
			onlyPluginIds: providerPluginIds,
			pluginSdkResolution: params.pluginSdkResolution,
			cache: params.cache ?? false,
			activate: params.activate ?? false,
			logger: createPluginLoaderLogger(log)
		}).providers.map((entry) => ({
			...entry.provider,
			pluginId: entry.pluginId
		}));
	}
	const activation = resolveBundledPluginCompatibleActivationInputs({
		rawConfig: runtimeConfig,
		env,
		workspaceDir,
		onlyPluginIds: requestedPluginIds,
		applyAutoEnable: true,
		compatMode: {
			allowlist: params.bundledProviderAllowlistCompat,
			enablement: "allowlist",
			vitest: params.bundledProviderVitestCompat
		},
		resolveCompatPluginIds: resolveBundledProviderCompatPluginIds
	});
	const config = params.bundledProviderVitestCompat ? withBundledProviderVitestCompat({
		config: activation.config,
		pluginIds: activation.compatPluginIds,
		env
	}) : activation.config;
	const providerPluginIds = resolveEnabledProviderPluginIds({
		config,
		workspaceDir,
		env,
		onlyPluginIds: requestedPluginIds
	});
	const registry = resolveRuntimePluginRegistry({
		config,
		activationSourceConfig: activation.activationSourceConfig,
		autoEnabledReasons: activation.autoEnabledReasons,
		workspaceDir,
		env,
		onlyPluginIds: providerPluginIds,
		pluginSdkResolution: params.pluginSdkResolution,
		cache: params.cache ?? false,
		activate: params.activate ?? false,
		logger: createPluginLoaderLogger(log)
	});
	if (!registry) return [];
	return registry.providers.map((entry) => ({
		...entry.provider,
		pluginId: entry.pluginId
	}));
}
//#endregion
export { resolvePluginProviders as t };
