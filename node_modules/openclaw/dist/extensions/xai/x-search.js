import { n as getRuntimeConfigSnapshot } from "../../runtime-snapshot-BQtdTwL2.js";
import { c as jsonResult, h as readStringParam, p as readStringArrayParam } from "../../common-B7pbdYUb.js";
import { d as resolveCacheTtlMs, f as resolveTimeoutSeconds, l as readCache, m as writeCache } from "../../web-fetch-utils-D_FD0Y6K.js";
import "../../provider-web-search-D_E69gvc.js";
import "../../config-runtime-OuR9WVXH.js";
import { r as resolveXaiToolApiKey, t as isXaiToolEnabled } from "../../tool-auth-shared-B-ryJ1T1.js";
import { a as resolveXaiXSearchMaxTurns, i as resolveXaiXSearchInlineCitations, n as buildXaiXSearchPayload, o as resolveXaiXSearchModel, r as requestXaiXSearch, s as resolveEffectiveXSearchConfig } from "../../x-search-shared-BuqiTWV3.js";
import { Type } from "@sinclair/typebox";
//#region extensions/xai/x-search.ts
var PluginToolInputError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ToolInputError";
	}
};
const X_SEARCH_CACHE_KEY = Symbol.for("openclaw.xai.x-search.cache");
function getSharedXSearchCache() {
	const root = globalThis;
	const existing = root[X_SEARCH_CACHE_KEY];
	if (existing instanceof Map) return existing;
	const next = /* @__PURE__ */ new Map();
	root[X_SEARCH_CACHE_KEY] = next;
	return next;
}
const X_SEARCH_CACHE = getSharedXSearchCache();
function resolveXSearchConfig(cfg) {
	return resolveEffectiveXSearchConfig(cfg);
}
function resolveXSearchEnabled(params) {
	return isXaiToolEnabled({
		enabled: params.config?.enabled,
		runtimeConfig: params.runtimeConfig,
		sourceConfig: params.cfg
	});
}
function resolveXSearchApiKey(params) {
	return resolveXaiToolApiKey(params);
}
function normalizeOptionalIsoDate(value, label) {
	if (!value) return;
	const trimmed = value.trim();
	if (!trimmed) return;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new PluginToolInputError(`${label} must use YYYY-MM-DD`);
	const [year, month, day] = trimmed.split("-").map((entry) => Number.parseInt(entry, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new PluginToolInputError(`${label} must be a valid calendar date`);
	return trimmed;
}
function buildXSearchCacheKey(params) {
	return JSON.stringify([
		"x_search",
		params.model,
		params.query,
		params.inlineCitations,
		params.maxTurns ?? null,
		params.options.allowedXHandles ?? null,
		params.options.excludedXHandles ?? null,
		params.options.fromDate ?? null,
		params.options.toDate ?? null,
		params.options.enableImageUnderstanding ?? false,
		params.options.enableVideoUnderstanding ?? false
	]);
}
function createXSearchTool(options) {
	const xSearchConfig = resolveXSearchConfig(options?.config);
	const runtimeConfig = options?.runtimeConfig ?? getRuntimeConfigSnapshot();
	if (!resolveXSearchEnabled({
		cfg: options?.config,
		config: xSearchConfig,
		runtimeConfig: runtimeConfig ?? void 0
	})) return null;
	return {
		label: "X Search",
		name: "x_search",
		description: "Search X (formerly Twitter) using xAI, including targeted post or thread lookups. For per-post stats like reposts, replies, bookmarks, or views, prefer the exact post URL or status ID.",
		parameters: Type.Object({
			query: Type.String({ description: "X search query string." }),
			allowed_x_handles: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { description: "Only include posts from these X handles." })),
			excluded_x_handles: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { description: "Exclude posts from these X handles." })),
			from_date: Type.Optional(Type.String({ description: "Only include posts on or after this date (YYYY-MM-DD)." })),
			to_date: Type.Optional(Type.String({ description: "Only include posts on or before this date (YYYY-MM-DD)." })),
			enable_image_understanding: Type.Optional(Type.Boolean({ description: "Allow xAI to inspect images attached to matching posts." })),
			enable_video_understanding: Type.Optional(Type.Boolean({ description: "Allow xAI to inspect videos attached to matching posts." }))
		}),
		execute: async (_toolCallId, args) => {
			const apiKey = resolveXSearchApiKey({
				sourceConfig: options?.config,
				runtimeConfig: runtimeConfig ?? void 0
			});
			if (!apiKey) return jsonResult({
				error: "missing_xai_api_key",
				message: "x_search needs an xAI API key. Set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
				docs: "https://docs.openclaw.ai/tools/web"
			});
			const query = readStringParam(args, "query", { required: true });
			const allowedXHandles = readStringArrayParam(args, "allowed_x_handles");
			const excludedXHandles = readStringArrayParam(args, "excluded_x_handles");
			const fromDate = normalizeOptionalIsoDate(readStringParam(args, "from_date"), "from_date");
			const toDate = normalizeOptionalIsoDate(readStringParam(args, "to_date"), "to_date");
			if (fromDate && toDate && fromDate > toDate) throw new PluginToolInputError("from_date must be on or before to_date");
			const xSearchOptions = {
				query,
				allowedXHandles,
				excludedXHandles,
				fromDate,
				toDate,
				enableImageUnderstanding: args.enable_image_understanding === true,
				enableVideoUnderstanding: args.enable_video_understanding === true
			};
			const xSearchConfigRecord = xSearchConfig;
			const model = resolveXaiXSearchModel(xSearchConfigRecord);
			const inlineCitations = resolveXaiXSearchInlineCitations(xSearchConfigRecord);
			const maxTurns = resolveXaiXSearchMaxTurns(xSearchConfigRecord);
			const cacheKey = buildXSearchCacheKey({
				query,
				model,
				inlineCitations,
				maxTurns,
				options: {
					allowedXHandles,
					excludedXHandles,
					fromDate,
					toDate,
					enableImageUnderstanding: xSearchOptions.enableImageUnderstanding,
					enableVideoUnderstanding: xSearchOptions.enableVideoUnderstanding
				}
			});
			const cached = readCache(X_SEARCH_CACHE, cacheKey);
			if (cached) return jsonResult({
				...cached.value,
				cached: true
			});
			const startedAt = Date.now();
			const result = await requestXaiXSearch({
				apiKey,
				model,
				timeoutSeconds: resolveTimeoutSeconds(xSearchConfig?.timeoutSeconds, 30),
				inlineCitations,
				maxTurns,
				options: xSearchOptions
			});
			const payload = buildXaiXSearchPayload({
				query,
				model,
				tookMs: Date.now() - startedAt,
				content: result.content,
				citations: result.citations,
				inlineCitations: result.inlineCitations,
				options: xSearchOptions
			});
			writeCache(X_SEARCH_CACHE, cacheKey, payload, resolveCacheTtlMs(xSearchConfig?.cacheTtlMinutes, 15));
			return jsonResult(payload);
		}
	};
}
//#endregion
export { createXSearchTool };
