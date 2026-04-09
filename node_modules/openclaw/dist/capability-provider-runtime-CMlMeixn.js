import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { n as withBundledPluginEnablementCompat, r as withBundledPluginVitestCompat } from "./bundled-compat-DQFbvTG5.js";
import { i as resolveRuntimePluginRegistry } from "./loader-BkajlJCF.js";
//#region src/plugins/capability-provider-runtime.ts
const CAPABILITY_CONTRACT_KEY = {
	memoryEmbeddingProviders: "memoryEmbeddingProviders",
	speechProviders: "speechProviders",
	realtimeTranscriptionProviders: "realtimeTranscriptionProviders",
	realtimeVoiceProviders: "realtimeVoiceProviders",
	mediaUnderstandingProviders: "mediaUnderstandingProviders",
	imageGenerationProviders: "imageGenerationProviders",
	videoGenerationProviders: "videoGenerationProviders",
	musicGenerationProviders: "musicGenerationProviders"
};
function resolveBundledCapabilityCompatPluginIds(params) {
	const contractKey = CAPABILITY_CONTRACT_KEY[params.key];
	return loadPluginManifestRegistry({
		config: params.cfg,
		env: process.env
	}).plugins.filter((plugin) => plugin.origin === "bundled" && (plugin.contracts?.[contractKey]?.length ?? 0) > 0).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
}
function resolveCapabilityProviderConfig(params) {
	const pluginIds = resolveBundledCapabilityCompatPluginIds(params);
	return withBundledPluginVitestCompat({
		config: withBundledPluginEnablementCompat({
			config: params.cfg,
			pluginIds
		}),
		pluginIds,
		env: process.env
	});
}
function resolvePluginCapabilityProviders(params) {
	const activeProviders = resolveRuntimePluginRegistry()?.[params.key] ?? [];
	if (activeProviders.length > 0) return activeProviders.map((entry) => entry.provider);
	const compatConfig = resolveCapabilityProviderConfig({
		key: params.key,
		cfg: params.cfg
	});
	return (resolveRuntimePluginRegistry(compatConfig === void 0 ? void 0 : { config: compatConfig })?.[params.key] ?? []).map((entry) => entry.provider);
}
//#endregion
export { resolvePluginCapabilityProviders as t };
