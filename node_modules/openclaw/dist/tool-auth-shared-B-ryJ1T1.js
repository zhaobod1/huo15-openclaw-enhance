import { i as coerceSecretRef, l as normalizeSecretInputString } from "./types.secrets-BZdSA8i7.js";
import { m as resolveNonEnvSecretRefApiKeyMarker } from "./model-auth-markers-DBBQxeVp.js";
import { S as readProviderEnvValue, o as resolveProviderWebSearchPluginConfig, x as readConfiguredSecretString } from "./provider-web-search-D_E69gvc.js";
import "./secret-input-D5U3kuko.js";
import "./provider-auth-BI9t-Krp.js";
//#region extensions/xai/src/tool-auth-shared.ts
function readConfiguredOrManagedApiKey(value) {
	const literal = normalizeSecretInputString(value);
	if (literal) return literal;
	const ref = coerceSecretRef(value);
	return ref ? resolveNonEnvSecretRefApiKeyMarker(ref.source) : void 0;
}
function readLegacyGrokFallbackAuth(cfg) {
	const search = cfg?.tools?.web?.search;
	if (!search || typeof search !== "object") return;
	const grok = search.grok;
	const apiKey = readConfiguredOrManagedApiKey(grok && typeof grok === "object" ? grok.apiKey : void 0);
	return apiKey ? {
		apiKey,
		source: "tools.web.search.grok.apiKey"
	} : void 0;
}
function readLegacyGrokApiKey(cfg) {
	const search = cfg?.tools?.web?.search;
	if (!search || typeof search !== "object") return;
	const grok = search.grok;
	return readConfiguredSecretString(grok && typeof grok === "object" ? grok.apiKey : void 0, "tools.web.search.grok.apiKey");
}
function readPluginXaiWebSearchApiKey(cfg) {
	return readConfiguredSecretString(resolveProviderWebSearchPluginConfig(cfg, "xai")?.apiKey, "plugins.entries.xai.config.webSearch.apiKey");
}
function resolveFallbackXaiAuth(cfg) {
	const pluginApiKey = readConfiguredOrManagedApiKey(resolveProviderWebSearchPluginConfig(cfg, "xai")?.apiKey);
	if (pluginApiKey) return {
		apiKey: pluginApiKey,
		source: "plugins.entries.xai.config.webSearch.apiKey"
	};
	return readLegacyGrokFallbackAuth(cfg);
}
function resolveFallbackXaiApiKey(cfg) {
	return readPluginXaiWebSearchApiKey(cfg) ?? readLegacyGrokApiKey(cfg);
}
function resolveXaiToolApiKey(params) {
	return resolveFallbackXaiApiKey(params.runtimeConfig) ?? resolveFallbackXaiApiKey(params.sourceConfig) ?? readProviderEnvValue(["XAI_API_KEY"]);
}
function isXaiToolEnabled(params) {
	if (params.enabled === false) return false;
	return Boolean(resolveXaiToolApiKey(params));
}
//#endregion
export { resolveFallbackXaiAuth as n, resolveXaiToolApiKey as r, isXaiToolEnabled as t };
