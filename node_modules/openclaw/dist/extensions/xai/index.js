import { o as normalizeNativeXaiModelId, t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { c as jsonResult } from "../../common-B7pbdYUb.js";
import { S as readProviderEnvValue } from "../../provider-web-search-D_E69gvc.js";
import { i as applyXaiModelCompat, l as resolveXaiModelCompatPatch } from "../../provider-tools-CSRWZ4nU.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { t as buildXaiProvider } from "../../provider-catalog-DFRFFz3S.js";
import { n as applyXaiConfig, t as XAI_DEFAULT_MODEL_REF } from "../../onboard-BV3nQ7rP.js";
import { a as resolveXaiForwardCompatModel, i as isModernXaiModel, n as resolveXaiTransport, r as shouldContributeXaiCompat } from "../../api-Bk8dwvku.js";
import { n as resolveFallbackXaiAuth } from "../../tool-auth-shared-B-ryJ1T1.js";
import { s as resolveEffectiveXSearchConfig } from "../../x-search-shared-BuqiTWV3.js";
import { i as wrapXaiProviderStream } from "../../stream-C0inNVSr.js";
import { t as buildXaiVideoGenerationProvider } from "../../video-generation-provider-B_N37P8v.js";
import { n as createXaiWebSearchProvider } from "../../web-search-CapA1hK6.js";
import { Type } from "@sinclair/typebox";
//#region extensions/xai/index.ts
const PROVIDER_ID = "xai";
const OPENAI_COMPATIBLE_REPLAY_HOOKS = buildProviderReplayFamilyHooks({ family: "openai-compatible" });
function hasResolvableXaiApiKey(config) {
	return Boolean(resolveFallbackXaiAuth(config)?.apiKey || readProviderEnvValue(["XAI_API_KEY"]));
}
function isCodeExecutionEnabled(config) {
	if (!config || typeof config !== "object") return hasResolvableXaiApiKey(config);
	const entries = config.plugins;
	const pluginEntries = entries && typeof entries === "object" ? entries.entries : void 0;
	const xaiEntry = pluginEntries && typeof pluginEntries.xai === "object" ? pluginEntries.xai : void 0;
	const pluginConfig = xaiEntry && typeof xaiEntry.config === "object" ? xaiEntry.config : void 0;
	if ((pluginConfig && typeof pluginConfig.codeExecution === "object" ? pluginConfig.codeExecution : void 0)?.enabled === false) return false;
	return hasResolvableXaiApiKey(config);
}
function isXSearchEnabled(config) {
	if ((config && typeof config === "object" ? resolveEffectiveXSearchConfig(config) : void 0)?.enabled === false) return false;
	return hasResolvableXaiApiKey(config);
}
function createLazyCodeExecutionTool(ctx) {
	if (!isCodeExecutionEnabled(ctx.runtimeConfig ?? ctx.config)) return null;
	return {
		label: "Code Execution",
		name: "code_execution",
		description: "Run sandboxed Python analysis with xAI. Use for calculations, tabulation, summaries, and chart-style analysis without local machine access.",
		parameters: Type.Object({ task: Type.String({ description: "The full analysis task for xAI's remote Python sandbox. Include any data to analyze directly in the task." }) }),
		execute: async (toolCallId, args) => {
			const { createCodeExecutionTool } = await import("./code-execution.js");
			const tool = createCodeExecutionTool({
				config: ctx.config,
				runtimeConfig: ctx.runtimeConfig ?? null
			});
			if (!tool) return jsonResult({
				error: "missing_xai_api_key",
				message: "code_execution needs an xAI API key. Set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
				docs: "https://docs.openclaw.ai/tools/code-execution"
			});
			return await tool.execute(toolCallId, args);
		}
	};
}
function createLazyXSearchTool(ctx) {
	if (!isXSearchEnabled(ctx.runtimeConfig ?? ctx.config)) return null;
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
		execute: async (toolCallId, args) => {
			const { createXSearchTool } = await import("./x-search.js");
			const tool = createXSearchTool({
				config: ctx.config,
				runtimeConfig: ctx.runtimeConfig ?? null
			});
			if (!tool) return jsonResult({
				error: "missing_xai_api_key",
				message: "x_search needs an xAI API key. Set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
				docs: "https://docs.openclaw.ai/tools/web"
			});
			return await tool.execute(toolCallId, args);
		}
	};
}
var xai_default = defineSingleProviderPluginEntry({
	id: "xai",
	name: "xAI Plugin",
	description: "Bundled xAI plugin",
	provider: {
		label: "xAI",
		aliases: ["x-ai"],
		docsPath: "/providers/xai",
		auth: [{
			methodId: "api-key",
			label: "xAI API key",
			hint: "API key",
			optionKey: "xaiApiKey",
			flagName: "--xai-api-key",
			envVar: "XAI_API_KEY",
			promptMessage: "Enter xAI API key",
			defaultModel: XAI_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyXaiConfig(cfg),
			wizard: { groupLabel: "xAI (Grok)" }
		}],
		catalog: { buildProvider: buildXaiProvider },
		...OPENAI_COMPATIBLE_REPLAY_HOOKS,
		prepareExtraParams: (ctx) => {
			const extraParams = ctx.extraParams;
			if (extraParams && extraParams.tool_stream !== void 0) return extraParams;
			return {
				...extraParams ?? {},
				tool_stream: true
			};
		},
		wrapStreamFn: wrapXaiProviderStream,
		resolveSyntheticAuth: ({ config }) => {
			const fallbackAuth = resolveFallbackXaiAuth(config);
			if (!fallbackAuth) return;
			return {
				apiKey: fallbackAuth.apiKey,
				source: fallbackAuth.source,
				mode: "api-key"
			};
		},
		normalizeResolvedModel: ({ model }) => applyXaiModelCompat(model),
		normalizeTransport: ({ provider, api, baseUrl }) => resolveXaiTransport({
			provider,
			api,
			baseUrl
		}),
		contributeResolvedModelCompat: ({ modelId, model }) => shouldContributeXaiCompat({
			modelId,
			model
		}) ? resolveXaiModelCompatPatch() : void 0,
		normalizeModelId: ({ modelId }) => normalizeNativeXaiModelId(modelId),
		resolveDynamicModel: (ctx) => resolveXaiForwardCompatModel({
			providerId: PROVIDER_ID,
			ctx
		}),
		isModernModelRef: ({ modelId }) => isModernXaiModel(modelId)
	},
	register(api) {
		api.registerWebSearchProvider(createXaiWebSearchProvider());
		api.registerVideoGenerationProvider(buildXaiVideoGenerationProvider());
		api.registerTool((ctx) => createLazyCodeExecutionTool(ctx), { name: "code_execution" });
		api.registerTool((ctx) => createLazyXSearchTool(ctx), { name: "x_search" });
	}
});
//#endregion
export { xai_default as default };
