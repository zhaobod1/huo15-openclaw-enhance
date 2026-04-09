import { n as ensureAuthProfileStore } from "../../store-HF_Z-jKz.js";
import { t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { n as listProfilesForProvider } from "../../profiles-DKQdaSwr.js";
import { t as formatCliCommand } from "../../command-format-D6RJqoCJ.js";
import "../../model-auth-markers-DBBQxeVp.js";
import { d as readNumberParam, h as readStringParam } from "../../common-B7pbdYUb.js";
import { C as resolveSearchCacheTtlMs, E as resolveSiteName, O as withTrustedWebSearchEndpoint, S as readProviderEnvValue, T as resolveSearchTimeoutSeconds, a as mergeScopedSearchConfig, b as readCachedSearchPayload, k as writeCachedSearchPayload, l as setTopLevelCredentialValue, o as resolveProviderWebSearchPluginConfig, p as buildSearchCacheKey, s as setProviderWebSearchPluginConfigValue, w as resolveSearchCount, x as readConfiguredSecretString } from "../../provider-web-search-D_E69gvc.js";
import { c as wrapWebContent } from "../../external-content-Ds1GARoy.js";
import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { t as createProviderApiKeyAuthMethod } from "../../provider-api-key-auth-4XNvOlkz.js";
import { t as buildOauthProviderAuthResult } from "../../provider-auth-result-C7_IeuCa.js";
import "../../provider-auth-BI9t-Krp.js";
import "../../provider-auth-api-key-9No7cznl.js";
import { t as buildProviderStreamFamilyHooks } from "../../provider-stream-family-DUY94MUj.js";
import { n as fetchMinimaxUsage } from "../../provider-usage-CjZ_bUoM.js";
import { o as isMiniMaxModernModelId, t as MINIMAX_DEFAULT_MODEL_ID } from "../../provider-models-7_LYZGw9.js";
import { n as buildMinimaxProvider, t as buildMinimaxPortalProvider } from "../../provider-catalog-CoZig-1o.js";
import { n as applyMinimaxApiConfigCn, t as applyMinimaxApiConfig } from "../../onboard-DWS-zR9W.js";
import "../../api-3UIolExN.js";
import { n as buildMinimaxPortalImageGenerationProvider, t as buildMinimaxImageGenerationProvider } from "../../image-generation-provider-ZMZpidGS.js";
import { n as minimaxPortalMediaUnderstandingProvider, t as minimaxMediaUnderstandingProvider } from "../../media-understanding-provider-BUvqqISt.js";
import { t as buildMinimaxMusicGenerationProvider } from "../../music-generation-provider-CT5XaY-W.js";
import { t as buildMinimaxSpeechProvider } from "../../speech-provider-CT0RIfj6.js";
import { t as buildMinimaxVideoGenerationProvider } from "../../video-generation-provider-CfWKEHQo.js";
import { Type } from "@sinclair/typebox";
//#region extensions/minimax/src/minimax-web-search-provider.ts
const MINIMAX_SEARCH_ENDPOINT_GLOBAL = "https://api.minimax.io/v1/coding_plan/search";
const MINIMAX_SEARCH_ENDPOINT_CN = "https://api.minimaxi.com/v1/coding_plan/search";
const MINIMAX_CODING_PLAN_ENV_VARS = ["MINIMAX_CODE_PLAN_KEY", "MINIMAX_CODING_API_KEY"];
function resolveMiniMaxApiKey(searchConfig) {
	return readConfiguredSecretString(searchConfig?.apiKey, "tools.web.search.apiKey") ?? readProviderEnvValue([...MINIMAX_CODING_PLAN_ENV_VARS, "MINIMAX_API_KEY"]);
}
function isMiniMaxCnHost(value) {
	const trimmed = value?.trim();
	if (!trimmed) return false;
	try {
		return new URL(trimmed).hostname.endsWith("minimaxi.com");
	} catch {
		return trimmed.includes("minimaxi.com");
	}
}
function resolveMiniMaxRegion(searchConfig, config) {
	const minimax = typeof searchConfig?.minimax === "object" && searchConfig.minimax !== null && !Array.isArray(searchConfig.minimax) ? searchConfig.minimax : void 0;
	if (typeof minimax?.region === "string" && minimax.region.trim()) return minimax.region === "cn" ? "cn" : "global";
	if (isMiniMaxCnHost(process.env.MINIMAX_API_HOST)) return "cn";
	const providers = (config?.models)?.providers;
	const minimaxProvider = providers?.minimax;
	const portalProvider = providers?.["minimax-portal"];
	const baseUrl = typeof minimaxProvider?.baseUrl === "string" ? minimaxProvider.baseUrl : "";
	const portalBaseUrl = typeof portalProvider?.baseUrl === "string" ? portalProvider.baseUrl : "";
	if (isMiniMaxCnHost(baseUrl) || isMiniMaxCnHost(portalBaseUrl)) return "cn";
	return "global";
}
function resolveMiniMaxEndpoint(searchConfig, config) {
	return resolveMiniMaxRegion(searchConfig, config) === "cn" ? MINIMAX_SEARCH_ENDPOINT_CN : MINIMAX_SEARCH_ENDPOINT_GLOBAL;
}
async function runMiniMaxSearch(params) {
	return withTrustedWebSearchEndpoint({
		url: params.endpoint,
		timeoutSeconds: params.timeoutSeconds,
		init: {
			method: "POST",
			headers: {
				Authorization: `Bearer ${params.apiKey}`,
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({ q: params.query })
		}
	}, async (res) => {
		if (!res.ok) {
			const detail = await res.text();
			throw new Error(`MiniMax Search API error (${res.status}): ${detail || res.statusText}`);
		}
		const data = await res.json();
		if (data.base_resp?.status_code && data.base_resp.status_code !== 0) throw new Error(`MiniMax Search API error (${data.base_resp.status_code}): ${data.base_resp.status_msg || "unknown error"}`);
		return {
			results: (Array.isArray(data.organic) ? data.organic : []).slice(0, params.count).map((entry) => {
				const title = entry.title ?? "";
				const url = entry.link ?? "";
				const snippet = entry.snippet ?? "";
				return {
					title: title ? wrapWebContent(title, "web_search") : "",
					url,
					description: snippet ? wrapWebContent(snippet, "web_search") : "",
					published: entry.date || void 0,
					siteName: resolveSiteName(url) || void 0
				};
			}),
			relatedSearches: Array.isArray(data.related_searches) ? data.related_searches.map((r) => r.query).filter((q) => typeof q === "string" && q.length > 0).map((q) => wrapWebContent(q, "web_search")) : void 0
		};
	});
}
const MiniMaxSearchSchema = Type.Object({
	query: Type.String({ description: "Search query string." }),
	count: Type.Optional(Type.Number({
		description: "Number of results to return (1-10).",
		minimum: 1,
		maximum: 10
	}))
});
function missingMiniMaxKeyPayload() {
	return {
		error: "missing_minimax_api_key",
		message: `web_search (minimax) needs a MiniMax Coding Plan key. Run \`${formatCliCommand("openclaw configure --section web")}\` to store it, or set MINIMAX_CODE_PLAN_KEY, MINIMAX_CODING_API_KEY, or MINIMAX_API_KEY in the Gateway environment.`,
		docs: "https://docs.openclaw.ai/tools/web"
	};
}
function createMiniMaxToolDefinition(searchConfig, config) {
	return {
		description: "Search the web using MiniMax Search API. Returns titles, URLs, snippets, and related search suggestions.",
		parameters: MiniMaxSearchSchema,
		execute: async (args) => {
			const apiKey = resolveMiniMaxApiKey(searchConfig);
			if (!apiKey) return missingMiniMaxKeyPayload();
			const params = args;
			const query = readStringParam(params, "query", { required: true });
			const resolvedCount = resolveSearchCount(readNumberParam(params, "count", { integer: true }) ?? searchConfig?.maxResults ?? void 0, 5);
			const endpoint = resolveMiniMaxEndpoint(searchConfig, config);
			const cacheKey = buildSearchCacheKey([
				"minimax",
				endpoint,
				query,
				resolvedCount
			]);
			const cached = readCachedSearchPayload(cacheKey);
			if (cached) return cached;
			const start = Date.now();
			const timeoutSeconds = resolveSearchTimeoutSeconds(searchConfig);
			const cacheTtlMs = resolveSearchCacheTtlMs(searchConfig);
			const { results, relatedSearches } = await runMiniMaxSearch({
				query,
				count: resolvedCount,
				apiKey,
				endpoint,
				timeoutSeconds
			});
			const payload = {
				query,
				provider: "minimax",
				count: results.length,
				tookMs: Date.now() - start,
				externalContent: {
					untrusted: true,
					source: "web_search",
					provider: "minimax",
					wrapped: true
				},
				results
			};
			if (relatedSearches && relatedSearches.length > 0) payload.relatedSearches = relatedSearches;
			writeCachedSearchPayload(cacheKey, payload, cacheTtlMs);
			return payload;
		}
	};
}
function createMiniMaxWebSearchProvider() {
	return {
		id: "minimax",
		label: "MiniMax Search",
		hint: "Structured results via MiniMax Coding Plan search API",
		credentialLabel: "MiniMax Coding Plan key",
		envVars: [...MINIMAX_CODING_PLAN_ENV_VARS],
		placeholder: "sk-cp-...",
		signupUrl: "https://platform.minimax.io/user-center/basic-information/interface-key",
		docsUrl: "https://docs.openclaw.ai/tools/minimax-search",
		autoDetectOrder: 15,
		credentialPath: "plugins.entries.minimax.config.webSearch.apiKey",
		inactiveSecretPaths: ["plugins.entries.minimax.config.webSearch.apiKey"],
		getCredentialValue: (searchConfig) => searchConfig?.apiKey,
		setCredentialValue: setTopLevelCredentialValue,
		getConfiguredCredentialValue: (config) => resolveProviderWebSearchPluginConfig(config, "minimax")?.apiKey,
		setConfiguredCredentialValue: (configTarget, value) => {
			setProviderWebSearchPluginConfigValue(configTarget, "minimax", "apiKey", value);
		},
		createTool: (ctx) => createMiniMaxToolDefinition(mergeScopedSearchConfig(ctx.searchConfig, "minimax", resolveProviderWebSearchPluginConfig(ctx.config, "minimax"), { mirrorApiKeyToTopLevel: true }), ctx.config)
	};
}
//#endregion
//#region extensions/minimax/index.ts
const API_PROVIDER_ID = "minimax";
const PORTAL_PROVIDER_ID = "minimax-portal";
const PROVIDER_LABEL = "MiniMax";
const DEFAULT_MODEL = MINIMAX_DEFAULT_MODEL_ID;
const DEFAULT_BASE_URL_CN = "https://api.minimaxi.com/anthropic";
const DEFAULT_BASE_URL_GLOBAL = "https://api.minimax.io/anthropic";
const MINIMAX_USAGE_ENV_VAR_KEYS = [
	"MINIMAX_OAUTH_TOKEN",
	"MINIMAX_CODE_PLAN_KEY",
	"MINIMAX_CODING_API_KEY",
	"MINIMAX_API_KEY"
];
const HYBRID_ANTHROPIC_OPENAI_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
	family: "hybrid-anthropic-openai",
	anthropicModelDropThinkingBlocks: true
});
const MINIMAX_FAST_MODE_STREAM_HOOKS = buildProviderStreamFamilyHooks("minimax-fast-mode");
function resolveMinimaxReasoningOutputMode() {
	return "native";
}
function getDefaultBaseUrl(region) {
	return region === "cn" ? DEFAULT_BASE_URL_CN : DEFAULT_BASE_URL_GLOBAL;
}
function apiModelRef(modelId) {
	return `${API_PROVIDER_ID}/${modelId}`;
}
function portalModelRef(modelId) {
	return `${PORTAL_PROVIDER_ID}/${modelId}`;
}
function buildPortalProviderCatalog(params) {
	return {
		...buildMinimaxPortalProvider(),
		baseUrl: params.baseUrl,
		apiKey: params.apiKey
	};
}
function resolveApiCatalog(ctx) {
	const apiKey = ctx.resolveProviderApiKey(API_PROVIDER_ID).apiKey;
	if (!apiKey) return null;
	return { provider: {
		...buildMinimaxProvider(ctx.env),
		apiKey
	} };
}
function resolvePortalCatalog(ctx) {
	const explicitProvider = ctx.config.models?.providers?.[PORTAL_PROVIDER_ID];
	const envApiKey = ctx.resolveProviderApiKey(PORTAL_PROVIDER_ID).apiKey;
	const hasProfiles = listProfilesForProvider(ensureAuthProfileStore(ctx.agentDir, { allowKeychainPrompt: false }), PORTAL_PROVIDER_ID).length > 0;
	const explicitApiKey = typeof explicitProvider?.apiKey === "string" ? explicitProvider.apiKey.trim() : void 0;
	const apiKey = envApiKey ?? explicitApiKey ?? (hasProfiles ? "minimax-oauth" : void 0);
	if (!apiKey) return null;
	return { provider: buildPortalProviderCatalog({
		baseUrl: (typeof explicitProvider?.baseUrl === "string" ? explicitProvider.baseUrl.trim() : void 0) || buildMinimaxPortalProvider(ctx.env).baseUrl,
		apiKey
	}) };
}
function createOAuthHandler(region) {
	const defaultBaseUrl = getDefaultBaseUrl(region);
	const regionLabel = region === "cn" ? "CN" : "Global";
	return async (ctx) => {
		const progress = ctx.prompter.progress(`Starting MiniMax OAuth (${regionLabel})…`);
		try {
			const { loginMiniMaxPortalOAuth } = await import("./oauth.runtime.js");
			const result = await loginMiniMaxPortalOAuth({
				openUrl: ctx.openUrl,
				note: ctx.prompter.note,
				progress,
				region
			});
			progress.stop("MiniMax OAuth complete");
			if (result.notification_message) await ctx.prompter.note(result.notification_message, "MiniMax OAuth");
			const baseUrl = result.resourceUrl || defaultBaseUrl;
			return buildOauthProviderAuthResult({
				providerId: PORTAL_PROVIDER_ID,
				defaultModel: portalModelRef(DEFAULT_MODEL),
				access: result.access,
				refresh: result.refresh,
				expires: result.expires,
				configPatch: {
					models: { providers: { [PORTAL_PROVIDER_ID]: {
						baseUrl,
						models: []
					} } },
					agents: { defaults: { models: {
						[portalModelRef("MiniMax-M2.7")]: { alias: "minimax-m2.7" },
						[portalModelRef("MiniMax-M2.7-highspeed")]: { alias: "minimax-m2.7-highspeed" }
					} } }
				},
				notes: [
					"MiniMax OAuth tokens auto-refresh. Re-run login if refresh fails or access is revoked.",
					`Base URL defaults to ${defaultBaseUrl}. Override models.providers.${PORTAL_PROVIDER_ID}.baseUrl if needed.`,
					...result.notification_message ? [result.notification_message] : []
				]
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			progress.stop(`MiniMax OAuth failed: ${errorMsg}`);
			await ctx.prompter.note("If OAuth fails, verify your MiniMax account has portal access and try again.", "MiniMax OAuth");
			throw err;
		}
	};
}
var minimax_default = definePluginEntry({
	id: API_PROVIDER_ID,
	name: "MiniMax",
	description: "Bundled MiniMax API-key and OAuth provider plugin",
	register(api) {
		api.registerProvider({
			id: API_PROVIDER_ID,
			label: PROVIDER_LABEL,
			hookAliases: ["minimax-cn"],
			docsPath: "/providers/minimax",
			envVars: ["MINIMAX_API_KEY"],
			auth: [createProviderApiKeyAuthMethod({
				providerId: API_PROVIDER_ID,
				methodId: "api-global",
				label: "MiniMax API key (Global)",
				hint: "Global endpoint - api.minimax.io",
				optionKey: "minimaxApiKey",
				flagName: "--minimax-api-key",
				envVar: "MINIMAX_API_KEY",
				promptMessage: "Enter MiniMax API key (sk-api- or sk-cp-)\nhttps://platform.minimax.io/user-center/basic-information/interface-key",
				profileId: "minimax:global",
				allowProfile: false,
				defaultModel: apiModelRef(DEFAULT_MODEL),
				expectedProviders: ["minimax"],
				applyConfig: (cfg) => applyMinimaxApiConfig(cfg),
				wizard: {
					choiceId: "minimax-global-api",
					choiceLabel: "MiniMax API key (Global)",
					choiceHint: "Global endpoint - api.minimax.io",
					groupId: "minimax",
					groupLabel: "MiniMax",
					groupHint: "M2.7 (recommended)"
				}
			}), createProviderApiKeyAuthMethod({
				providerId: API_PROVIDER_ID,
				methodId: "api-cn",
				label: "MiniMax API key (CN)",
				hint: "CN endpoint - api.minimaxi.com",
				optionKey: "minimaxApiKey",
				flagName: "--minimax-api-key",
				envVar: "MINIMAX_API_KEY",
				promptMessage: "Enter MiniMax CN API key (sk-api- or sk-cp-)\nhttps://platform.minimaxi.com/user-center/basic-information/interface-key",
				profileId: "minimax:cn",
				allowProfile: false,
				defaultModel: apiModelRef(DEFAULT_MODEL),
				expectedProviders: ["minimax", "minimax-cn"],
				applyConfig: (cfg) => applyMinimaxApiConfigCn(cfg),
				wizard: {
					choiceId: "minimax-cn-api",
					choiceLabel: "MiniMax API key (CN)",
					choiceHint: "CN endpoint - api.minimaxi.com",
					groupId: "minimax",
					groupLabel: "MiniMax",
					groupHint: "M2.7 (recommended)"
				}
			})],
			catalog: {
				order: "simple",
				run: async (ctx) => resolveApiCatalog(ctx)
			},
			resolveUsageAuth: async (ctx) => {
				const portalOauth = await ctx.resolveOAuthToken({ provider: PORTAL_PROVIDER_ID });
				if (portalOauth) return portalOauth;
				const apiKey = ctx.resolveApiKeyFromConfigAndStore({
					providerIds: [API_PROVIDER_ID, PORTAL_PROVIDER_ID],
					envDirect: MINIMAX_USAGE_ENV_VAR_KEYS.map((name) => ctx.env[name])
				});
				return apiKey ? { token: apiKey } : null;
			},
			...HYBRID_ANTHROPIC_OPENAI_REPLAY_HOOKS,
			...MINIMAX_FAST_MODE_STREAM_HOOKS,
			resolveReasoningOutputMode: () => resolveMinimaxReasoningOutputMode(),
			isModernModelRef: ({ modelId }) => isMiniMaxModernModelId(modelId),
			fetchUsageSnapshot: async (ctx) => await fetchMinimaxUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn)
		});
		api.registerMediaUnderstandingProvider(minimaxMediaUnderstandingProvider);
		api.registerMediaUnderstandingProvider(minimaxPortalMediaUnderstandingProvider);
		api.registerProvider({
			id: PORTAL_PROVIDER_ID,
			label: PROVIDER_LABEL,
			hookAliases: ["minimax-portal-cn"],
			docsPath: "/providers/minimax",
			envVars: ["MINIMAX_OAUTH_TOKEN", "MINIMAX_API_KEY"],
			catalog: { run: async (ctx) => resolvePortalCatalog(ctx) },
			auth: [{
				id: "oauth",
				label: "MiniMax OAuth (Global)",
				hint: "Global endpoint - api.minimax.io",
				kind: "device_code",
				wizard: {
					choiceId: "minimax-global-oauth",
					choiceLabel: "MiniMax OAuth (Global)",
					choiceHint: "Global endpoint - api.minimax.io",
					groupId: "minimax",
					groupLabel: "MiniMax",
					groupHint: "M2.7 (recommended)"
				},
				run: createOAuthHandler("global")
			}, {
				id: "oauth-cn",
				label: "MiniMax OAuth (CN)",
				hint: "CN endpoint - api.minimaxi.com",
				kind: "device_code",
				wizard: {
					choiceId: "minimax-cn-oauth",
					choiceLabel: "MiniMax OAuth (CN)",
					choiceHint: "CN endpoint - api.minimaxi.com",
					groupId: "minimax",
					groupLabel: "MiniMax",
					groupHint: "M2.7 (recommended)"
				},
				run: createOAuthHandler("cn")
			}],
			...HYBRID_ANTHROPIC_OPENAI_REPLAY_HOOKS,
			...MINIMAX_FAST_MODE_STREAM_HOOKS,
			resolveReasoningOutputMode: () => resolveMinimaxReasoningOutputMode(),
			isModernModelRef: ({ modelId }) => isMiniMaxModernModelId(modelId)
		});
		api.registerImageGenerationProvider(buildMinimaxImageGenerationProvider());
		api.registerImageGenerationProvider(buildMinimaxPortalImageGenerationProvider());
		api.registerMusicGenerationProvider(buildMinimaxMusicGenerationProvider());
		api.registerVideoGenerationProvider(buildMinimaxVideoGenerationProvider());
		api.registerSpeechProvider(buildMinimaxSpeechProvider());
		api.registerWebSearchProvider(createMiniMaxWebSearchProvider());
	}
});
//#endregion
export { minimax_default as default };
