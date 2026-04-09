import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { n as resolveProviderRequestCapabilities } from "./provider-attribution-DFA_ceCj.js";
import "./provider-http-BuJ3ne_x.js";
//#region src/plugins/provider-catalog.ts
function findCatalogTemplate(params) {
	return params.templateIds.map((templateId) => params.entries.find((entry) => normalizeProviderId(entry.provider) === normalizeProviderId(params.providerId) && entry.id.toLowerCase() === templateId.toLowerCase())).find((entry) => entry !== void 0);
}
async function buildSingleProviderApiKeyCatalog(params) {
	const providerId = normalizeProviderId(params.providerId);
	const apiKey = params.ctx.resolveProviderApiKey(providerId).apiKey;
	if (!apiKey) return null;
	const explicitProvider = params.allowExplicitBaseUrl && params.ctx.config.models?.providers ? Object.entries(params.ctx.config.models.providers).find(([configuredProviderId]) => normalizeProviderId(configuredProviderId) === providerId)?.[1] : void 0;
	const explicitBaseUrl = typeof explicitProvider?.baseUrl === "string" ? explicitProvider.baseUrl.trim() : "";
	return { provider: {
		...await params.buildProvider(),
		...explicitBaseUrl ? { baseUrl: explicitBaseUrl } : {},
		apiKey
	} };
}
async function buildPairedProviderApiKeyCatalog(params) {
	const apiKey = params.ctx.resolveProviderApiKey(normalizeProviderId(params.providerId)).apiKey;
	if (!apiKey) return null;
	const providers = await params.buildProviders();
	return { providers: Object.fromEntries(Object.entries(providers).map(([id, provider]) => [id, {
		...provider,
		apiKey
	}])) };
}
//#endregion
//#region src/plugin-sdk/provider-catalog-shared.ts
function withStreamingUsageCompat(provider) {
	if (!Array.isArray(provider.models) || provider.models.length === 0) return provider;
	let changed = false;
	const models = provider.models.map((model) => {
		if (model.compat?.supportsUsageInStreaming !== void 0) return model;
		changed = true;
		return {
			...model,
			compat: {
				...model.compat,
				supportsUsageInStreaming: true
			}
		};
	});
	return changed ? {
		...provider,
		models
	} : provider;
}
function supportsNativeStreamingUsageCompat(params) {
	return resolveProviderRequestCapabilities({
		provider: params.providerId,
		api: "openai-completions",
		baseUrl: params.baseUrl,
		capability: "llm",
		transport: "stream"
	}).supportsNativeStreamingUsageCompat;
}
function applyProviderNativeStreamingUsageCompat(params) {
	return supportsNativeStreamingUsageCompat({
		providerId: params.providerId,
		baseUrl: params.providerConfig.baseUrl
	}) ? withStreamingUsageCompat(params.providerConfig) : params.providerConfig;
}
//#endregion
export { findCatalogTemplate as a, buildSingleProviderApiKeyCatalog as i, supportsNativeStreamingUsageCompat as n, buildPairedProviderApiKeyCatalog as r, applyProviderNativeStreamingUsageCompat as t };
