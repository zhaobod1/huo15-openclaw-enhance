import { y as postTrustedWebToolsJson } from "./provider-web-search-D_E69gvc.js";
import { c as wrapWebContent } from "./external-content-Ds1GARoy.js";
import { a as buildXaiResponsesToolBody, i as XAI_RESPONSES_ENDPOINT, n as resolveNormalizedXaiToolModel, r as resolvePositiveIntegerToolConfig, s as resolveXaiResponseTextAndCitations, t as coerceXaiToolConfig } from "./tool-config-shared-CHm62UQN.js";
//#region extensions/xai/src/x-search-config.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneRecord(value) {
	if (!value) return value;
	return { ...value };
}
function resolveLegacyXSearchConfig(config) {
	const xSearch = (config?.tools?.web)?.x_search;
	return isRecord(xSearch) ? cloneRecord(xSearch) : void 0;
}
function resolvePluginXSearchConfig(config) {
	const pluginConfig = config?.plugins?.entries?.xai?.config;
	if (!isRecord(pluginConfig?.xSearch)) return;
	return cloneRecord(pluginConfig.xSearch);
}
function resolveEffectiveXSearchConfig(config) {
	const legacy = resolveLegacyXSearchConfig(config);
	const pluginOwned = resolvePluginXSearchConfig(config);
	if (!legacy) return pluginOwned;
	if (!pluginOwned) return legacy;
	return {
		...legacy,
		...pluginOwned
	};
}
function setPluginXSearchConfigValue(configTarget, key, value) {
	const plugins = configTarget.plugins ??= {};
	const entries = plugins.entries ??= {};
	const entry = entries.xai ??= {};
	const config = entry.config ??= {};
	const xSearch = config.xSearch ??= {};
	xSearch[key] = value;
}
//#endregion
//#region extensions/xai/src/x-search-shared.ts
const XAI_X_SEARCH_ENDPOINT = XAI_RESPONSES_ENDPOINT;
const XAI_DEFAULT_X_SEARCH_MODEL = "grok-4-1-fast-non-reasoning";
function resolveXaiXSearchConfig(config) {
	return coerceXaiToolConfig(config);
}
function resolveXaiXSearchModel(config) {
	return resolveNormalizedXaiToolModel({
		config,
		defaultModel: XAI_DEFAULT_X_SEARCH_MODEL
	});
}
function resolveXaiXSearchInlineCitations(config) {
	return resolveXaiXSearchConfig(config).inlineCitations === true;
}
function resolveXaiXSearchMaxTurns(config) {
	return resolvePositiveIntegerToolConfig(config, "maxTurns");
}
function buildXSearchTool(options) {
	return {
		type: "x_search",
		...options.allowedXHandles?.length ? { allowed_x_handles: options.allowedXHandles } : {},
		...options.excludedXHandles?.length ? { excluded_x_handles: options.excludedXHandles } : {},
		...options.fromDate ? { from_date: options.fromDate } : {},
		...options.toDate ? { to_date: options.toDate } : {},
		...options.enableImageUnderstanding ? { enable_image_understanding: true } : {},
		...options.enableVideoUnderstanding ? { enable_video_understanding: true } : {}
	};
}
function buildXaiXSearchPayload(params) {
	return {
		query: params.query,
		provider: "xai",
		model: params.model,
		tookMs: params.tookMs,
		externalContent: {
			untrusted: true,
			source: "x_search",
			provider: "xai",
			wrapped: true
		},
		content: wrapWebContent(params.content, "web_search"),
		citations: params.citations,
		...params.inlineCitations ? { inlineCitations: params.inlineCitations } : {},
		...params.options?.allowedXHandles?.length ? { allowedXHandles: params.options.allowedXHandles } : {},
		...params.options?.excludedXHandles?.length ? { excludedXHandles: params.options.excludedXHandles } : {},
		...params.options?.fromDate ? { fromDate: params.options.fromDate } : {},
		...params.options?.toDate ? { toDate: params.options.toDate } : {},
		...params.options?.enableImageUnderstanding ? { enableImageUnderstanding: true } : {},
		...params.options?.enableVideoUnderstanding ? { enableVideoUnderstanding: true } : {}
	};
}
async function requestXaiXSearch(params) {
	return await postTrustedWebToolsJson({
		url: XAI_X_SEARCH_ENDPOINT,
		timeoutSeconds: params.timeoutSeconds,
		apiKey: params.apiKey,
		body: buildXaiResponsesToolBody({
			model: params.model,
			inputText: params.options.query,
			tools: [buildXSearchTool(params.options)],
			maxTurns: params.maxTurns
		}),
		errorLabel: "xAI"
	}, async (response) => {
		const data = await response.json();
		const { content, citations } = resolveXaiResponseTextAndCitations(data);
		return {
			content,
			citations,
			inlineCitations: params.inlineCitations && Array.isArray(data.inline_citations) ? data.inline_citations : void 0
		};
	});
}
//#endregion
export { resolveXaiXSearchMaxTurns as a, setPluginXSearchConfigValue as c, resolveXaiXSearchInlineCitations as i, buildXaiXSearchPayload as n, resolveXaiXSearchModel as o, requestXaiXSearch as r, resolveEffectiveXSearchConfig as s, XAI_DEFAULT_X_SEARCH_MODEL as t };
