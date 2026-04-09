import { r as hasKind } from "./slots-C_o3k-JZ.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { a as normalizePluginsConfig, n as createPluginActivationSource, s as resolveEffectivePluginActivationState } from "./config-state-CKMpUUgI.js";
import { r as listPotentialConfiguredChannelIds } from "./config-presence-Bwyumb-a.js";
//#region src/plugins/channel-plugin-ids.ts
function hasRuntimeContractSurface(plugin) {
	return Boolean(plugin.providers.length > 0 || plugin.contracts?.speechProviders?.length || plugin.contracts?.mediaUnderstandingProviders?.length || plugin.contracts?.imageGenerationProviders?.length || plugin.contracts?.videoGenerationProviders?.length || plugin.contracts?.musicGenerationProviders?.length || plugin.contracts?.webFetchProviders?.length || plugin.contracts?.webSearchProviders?.length || plugin.contracts?.memoryEmbeddingProviders?.length || hasKind(plugin.kind, "memory"));
}
function isGatewayStartupSidecar(plugin) {
	return plugin.channels.length === 0 && !hasRuntimeContractSurface(plugin);
}
function resolveChannelPluginIds(params) {
	return loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => plugin.channels.length > 0).map((plugin) => plugin.id);
}
function resolveConfiguredChannelPluginIds(params) {
	const configuredChannelIds = new Set(listPotentialConfiguredChannelIds(params.config, params.env).map((id) => id.trim()));
	if (configuredChannelIds.size === 0) return [];
	return resolveChannelPluginIds(params).filter((pluginId) => configuredChannelIds.has(pluginId));
}
function resolveConfiguredDeferredChannelPluginIds(params) {
	const configuredChannelIds = new Set(listPotentialConfiguredChannelIds(params.config, params.env).map((id) => id.trim()));
	if (configuredChannelIds.size === 0) return [];
	return loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => plugin.channels.some((channelId) => configuredChannelIds.has(channelId)) && plugin.startupDeferConfiguredChannelFullLoadUntilAfterListen === true).map((plugin) => plugin.id);
}
function resolveGatewayStartupPluginIds(params) {
	const configuredChannelIds = new Set(listPotentialConfiguredChannelIds(params.config, params.env).map((id) => id.trim()));
	const pluginsConfig = normalizePluginsConfig(params.config.plugins);
	const activationSource = createPluginActivationSource({ config: params.activationSourceConfig ?? params.config });
	return loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => {
		if (plugin.channels.some((channelId) => configuredChannelIds.has(channelId))) return true;
		if (!isGatewayStartupSidecar(plugin)) return false;
		const activationState = resolveEffectivePluginActivationState({
			id: plugin.id,
			origin: plugin.origin,
			config: pluginsConfig,
			rootConfig: params.config,
			enabledByDefault: plugin.enabledByDefault,
			activationSource
		});
		if (!activationState.enabled) return false;
		if (plugin.origin !== "bundled") return activationState.explicitlyEnabled;
		return activationState.source === "explicit" || activationState.source === "default";
	}).map((plugin) => plugin.id);
}
//#endregion
export { resolveGatewayStartupPluginIds as i, resolveConfiguredChannelPluginIds as n, resolveConfiguredDeferredChannelPluginIds as r, resolveChannelPluginIds as t };
