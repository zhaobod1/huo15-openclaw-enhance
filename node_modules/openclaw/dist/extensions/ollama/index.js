import { t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { t as normalizeOptionalSecretInput } from "../../normalize-secret-input-DUjA3r3_.js";
import { u as isNonSecretApiKeyMarker } from "../../model-auth-markers-DBBQxeVp.js";
import { d as readNumberParam, h as readStringParam } from "../../common-B7pbdYUb.js";
import { n as fetchWithSsrFGuard } from "../../fetch-guard-Bl48brXk.js";
import { a as truncateText, u as readResponseText } from "../../web-fetch-utils-D_FD0Y6K.js";
import { E as resolveSiteName, w as resolveSearchCount } from "../../provider-web-search-D_E69gvc.js";
import { t as enablePluginInConfig } from "../../enable-eqPAfbGq.js";
import { c as wrapWebContent } from "../../external-content-Ds1GARoy.js";
import { t as resolveEnvApiKey } from "../../model-auth-env--oAvogL1.js";
import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import "../../ssrf-runtime-DGIvmaoK.js";
import "../../provider-auth-BI9t-Krp.js";
import "../../provider-auth-runtime-BpC8I07I.js";
import { S as OLLAMA_DEFAULT_BASE_URL, h as buildOllamaBaseUrlSsrFPolicy, o as createConfiguredOllamaCompatStreamWrapper, s as createConfiguredOllamaStreamFn, v as fetchOllamaModels, x as resolveOllamaApiBase } from "../../stream-DaZ9JB7F.js";
import { a as promptAndConfigureOllama, i as ensureOllamaModelPulled, n as checkOllamaCloudAuth, r as configureOllamaNonInteractive, t as buildOllamaProvider } from "../../api-C_Mlbkmu.js";
import { n as createOllamaEmbeddingProvider, t as DEFAULT_OLLAMA_EMBEDDING_MODEL } from "../../embedding-provider-DXHOGUhG.js";
import { Type } from "@sinclair/typebox";
//#region extensions/ollama/src/memory-embedding-adapter.ts
const ollamaMemoryEmbeddingProviderAdapter = {
	id: "ollama",
	defaultModel: DEFAULT_OLLAMA_EMBEDDING_MODEL,
	transport: "remote",
	create: async (options) => {
		const { provider, client } = await createOllamaEmbeddingProvider({
			...options,
			provider: "ollama",
			fallback: "none"
		});
		return {
			provider,
			runtime: {
				id: "ollama",
				cacheKeyData: {
					provider: "ollama",
					model: client.model
				}
			}
		};
	}
};
//#endregion
//#region extensions/ollama/src/web-search-provider.ts
const OLLAMA_WEB_SEARCH_SCHEMA = Type.Object({
	query: Type.String({ description: "Search query string." }),
	count: Type.Optional(Type.Number({
		description: "Number of results to return (1-10).",
		minimum: 1,
		maximum: 10
	}))
}, { additionalProperties: false });
const OLLAMA_WEB_SEARCH_PATH = "/api/experimental/web_search";
const DEFAULT_OLLAMA_WEB_SEARCH_COUNT = 5;
const DEFAULT_OLLAMA_WEB_SEARCH_TIMEOUT_MS = 15e3;
const OLLAMA_WEB_SEARCH_SNIPPET_MAX_CHARS = 300;
function resolveOllamaWebSearchApiKey(config) {
	const providerApiKey = normalizeOptionalSecretInput(config?.models?.providers?.ollama?.apiKey);
	if (providerApiKey && !isNonSecretApiKeyMarker(providerApiKey)) return providerApiKey;
	return resolveEnvApiKey("ollama")?.apiKey;
}
function resolveOllamaWebSearchBaseUrl(config) {
	const configuredBaseUrl = config?.models?.providers?.ollama?.baseUrl;
	if (typeof configuredBaseUrl === "string" && configuredBaseUrl.trim()) return resolveOllamaApiBase(configuredBaseUrl);
	return OLLAMA_DEFAULT_BASE_URL;
}
function normalizeOllamaWebSearchResult(result) {
	const url = typeof result.url === "string" ? result.url.trim() : "";
	if (!url) return null;
	return {
		title: typeof result.title === "string" ? result.title.trim() : "",
		url,
		content: typeof result.content === "string" ? result.content.trim() : ""
	};
}
async function runOllamaWebSearch(params) {
	const query = params.query.trim();
	if (!query) throw new Error("query parameter is required");
	const baseUrl = resolveOllamaWebSearchBaseUrl(params.config);
	const apiKey = resolveOllamaWebSearchApiKey(params.config);
	const count = resolveSearchCount(params.count, DEFAULT_OLLAMA_WEB_SEARCH_COUNT);
	const startedAt = Date.now();
	const headers = { "Content-Type": "application/json" };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
	const { response, release } = await fetchWithSsrFGuard({
		url: `${baseUrl}${OLLAMA_WEB_SEARCH_PATH}`,
		init: {
			method: "POST",
			headers,
			body: JSON.stringify({
				query,
				max_results: count
			}),
			signal: AbortSignal.timeout(DEFAULT_OLLAMA_WEB_SEARCH_TIMEOUT_MS)
		},
		policy: buildOllamaBaseUrlSsrFPolicy(baseUrl),
		auditContext: "ollama-web-search.search"
	});
	try {
		if (response.status === 401) throw new Error("Ollama web search authentication failed. Run `ollama signin`.");
		if (response.status === 403) throw new Error("Ollama web search is unavailable. Ensure cloud-backed web search is enabled on the Ollama host.");
		if (!response.ok) {
			const detail = await readResponseText(response, { maxBytes: 64e3 });
			throw new Error(`Ollama web search failed (${response.status}): ${detail.text || ""}`.trim());
		}
		const payload = await response.json();
		const results = Array.isArray(payload.results) ? payload.results.map(normalizeOllamaWebSearchResult).filter((result) => result !== null).slice(0, count) : [];
		return {
			query,
			provider: "ollama",
			count: results.length,
			tookMs: Date.now() - startedAt,
			externalContent: {
				untrusted: true,
				source: "web_search",
				provider: "ollama",
				wrapped: true
			},
			results: results.map((result) => {
				const snippet = truncateText(result.content, OLLAMA_WEB_SEARCH_SNIPPET_MAX_CHARS).text;
				return {
					title: result.title ? wrapWebContent(result.title, "web_search") : "",
					url: result.url,
					snippet: snippet ? wrapWebContent(snippet, "web_search") : "",
					siteName: resolveSiteName(result.url) || void 0
				};
			})
		};
	} finally {
		await release();
	}
}
async function warnOllamaWebSearchPrereqs(params) {
	const baseUrl = resolveOllamaWebSearchBaseUrl(params.config);
	const { reachable } = await fetchOllamaModels(baseUrl);
	if (!reachable) {
		await params.prompter.note([
			"Ollama Web Search requires Ollama to be running.",
			`Expected host: ${baseUrl}`,
			"Start Ollama before using this provider."
		].join("\n"), "Ollama Web Search");
		return params.config;
	}
	const auth = await checkOllamaCloudAuth(baseUrl);
	if (!auth.signedIn) await params.prompter.note(["Ollama Web Search requires `ollama signin`.", ...auth.signinUrl ? [auth.signinUrl] : ["Run `ollama signin`."]].join("\n"), "Ollama Web Search");
	return params.config;
}
function createOllamaWebSearchProvider() {
	return {
		id: "ollama",
		label: "Ollama Web Search",
		hint: "Local Ollama host · requires ollama signin",
		onboardingScopes: ["text-inference"],
		requiresCredential: false,
		envVars: [],
		placeholder: "(run ollama signin)",
		signupUrl: "https://ollama.com/",
		docsUrl: "https://docs.openclaw.ai/tools/web",
		autoDetectOrder: 110,
		credentialPath: "",
		getCredentialValue: () => void 0,
		setCredentialValue: () => {},
		applySelectionConfig: (config) => enablePluginInConfig(config, "ollama").config,
		runSetup: async (ctx) => await warnOllamaWebSearchPrereqs({
			config: ctx.config,
			prompter: ctx.prompter
		}),
		createTool: (ctx) => ({
			description: "Search the web using Ollama's experimental web search API. Returns titles, URLs, and snippets from the configured Ollama host.",
			parameters: OLLAMA_WEB_SEARCH_SCHEMA,
			execute: async (args) => await runOllamaWebSearch({
				config: ctx.config,
				query: readStringParam(args, "query", { required: true }),
				count: readNumberParam(args, "count", { integer: true })
			})
		})
	};
}
//#endregion
//#region extensions/ollama/index.ts
const PROVIDER_ID = "ollama";
const DEFAULT_API_KEY = "ollama-local";
const OPENAI_COMPATIBLE_REPLAY_HOOKS = buildProviderReplayFamilyHooks({ family: "openai-compatible" });
function resolveOllamaDiscoveryApiKey(params) {
	const envApiKey = params.env.OLLAMA_API_KEY?.trim() ? "OLLAMA_API_KEY" : void 0;
	const explicitApiKey = params.explicitApiKey?.trim() || void 0;
	const resolvedApiKey = params.resolvedApiKey?.trim() || void 0;
	return envApiKey ?? explicitApiKey ?? resolvedApiKey ?? DEFAULT_API_KEY;
}
function shouldSkipAmbientOllamaDiscovery(env) {
	return Boolean(env.VITEST) || env.NODE_ENV === "test";
}
var ollama_default = definePluginEntry({
	id: "ollama",
	name: "Ollama Provider",
	description: "Bundled Ollama provider plugin",
	register(api) {
		api.registerMemoryEmbeddingProvider(ollamaMemoryEmbeddingProviderAdapter);
		const pluginConfig = api.pluginConfig ?? {};
		api.registerWebSearchProvider(createOllamaWebSearchProvider());
		api.registerProvider({
			id: PROVIDER_ID,
			label: "Ollama",
			docsPath: "/providers/ollama",
			envVars: ["OLLAMA_API_KEY"],
			auth: [{
				id: "local",
				label: "Ollama",
				hint: "Cloud and local open models",
				kind: "custom",
				run: async (ctx) => {
					const result = await promptAndConfigureOllama({
						cfg: ctx.config,
						prompter: ctx.prompter,
						isRemote: ctx.isRemote,
						openUrl: ctx.openUrl
					});
					return {
						profiles: [{
							profileId: "ollama:default",
							credential: {
								type: "api_key",
								provider: PROVIDER_ID,
								key: DEFAULT_API_KEY
							}
						}],
						configPatch: result.config
					};
				},
				runNonInteractive: async (ctx) => {
					return await configureOllamaNonInteractive({
						nextConfig: ctx.config,
						opts: {
							customBaseUrl: ctx.opts.customBaseUrl,
							customModelId: ctx.opts.customModelId
						},
						runtime: ctx.runtime,
						agentDir: ctx.agentDir
					});
				}
			}],
			discovery: {
				order: "late",
				run: async (ctx) => {
					const explicit = ctx.config.models?.providers?.ollama;
					const hasExplicitModels = Array.isArray(explicit?.models) && explicit.models.length > 0;
					const discoveryEnabled = pluginConfig.discovery?.enabled ?? ctx.config.models?.ollamaDiscovery?.enabled;
					if (!hasExplicitModels && discoveryEnabled === false) return null;
					const ollamaKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
					const explicitApiKey = typeof explicit?.apiKey === "string" ? explicit.apiKey : void 0;
					if (hasExplicitModels && explicit) return { provider: {
						...explicit,
						baseUrl: typeof explicit.baseUrl === "string" && explicit.baseUrl.trim() ? resolveOllamaApiBase(explicit.baseUrl) : OLLAMA_DEFAULT_BASE_URL,
						api: explicit.api ?? "ollama",
						apiKey: resolveOllamaDiscoveryApiKey({
							env: ctx.env,
							explicitApiKey,
							resolvedApiKey: ollamaKey
						})
					} };
					if (!ollamaKey && !explicit && shouldSkipAmbientOllamaDiscovery(ctx.env)) return null;
					const provider = await buildOllamaProvider(explicit?.baseUrl, { quiet: !ollamaKey && !explicit });
					if (provider.models.length === 0 && !ollamaKey && !explicit?.apiKey) return null;
					return { provider: {
						...provider,
						apiKey: resolveOllamaDiscoveryApiKey({
							env: ctx.env,
							explicitApiKey,
							resolvedApiKey: ollamaKey
						})
					} };
				}
			},
			wizard: {
				setup: {
					choiceId: "ollama",
					choiceLabel: "Ollama",
					choiceHint: "Cloud and local open models",
					groupId: "ollama",
					groupLabel: "Ollama",
					groupHint: "Cloud and local open models",
					methodId: "local",
					modelSelection: {
						promptWhenAuthChoiceProvided: true,
						allowKeepCurrent: false
					}
				},
				modelPicker: {
					label: "Ollama (custom)",
					hint: "Detect models from a local or remote Ollama instance",
					methodId: "local"
				}
			},
			onModelSelected: async ({ config, model, prompter }) => {
				if (!model.startsWith("ollama/")) return;
				await ensureOllamaModelPulled({
					config,
					model,
					prompter
				});
			},
			createStreamFn: ({ config, model }) => {
				return createConfiguredOllamaStreamFn({
					model,
					providerBaseUrl: config?.models?.providers?.ollama?.baseUrl
				});
			},
			...OPENAI_COMPATIBLE_REPLAY_HOOKS,
			resolveReasoningOutputMode: () => "native",
			wrapStreamFn: createConfiguredOllamaCompatStreamWrapper,
			createEmbeddingProvider: async ({ config, model, remote }) => {
				const { provider, client } = await createOllamaEmbeddingProvider({
					config,
					remote,
					model: model || "nomic-embed-text"
				});
				return {
					...provider,
					client
				};
			},
			matchesContextOverflowError: ({ errorMessage }) => /\bollama\b.*(?:context length|too many tokens|context window)/i.test(errorMessage) || /\btruncating input\b.*\btoo long\b/i.test(errorMessage),
			resolveSyntheticAuth: ({ providerConfig }) => {
				if (!(Boolean(providerConfig?.api?.trim()) || Boolean(providerConfig?.baseUrl?.trim()) || Array.isArray(providerConfig?.models) && providerConfig.models.length > 0)) return;
				return {
					apiKey: DEFAULT_API_KEY,
					source: "models.providers.ollama (synthetic local key)",
					mode: "api-key"
				};
			},
			shouldDeferSyntheticProfileAuth: ({ resolvedApiKey }) => resolvedApiKey?.trim() === DEFAULT_API_KEY,
			buildUnknownModelHint: () => "Ollama requires authentication to be registered as a provider. Set OLLAMA_API_KEY=\"ollama-local\" (any value works) or run \"openclaw configure\". See: https://docs.openclaw.ai/providers/ollama"
		});
	}
});
//#endregion
export { ollama_default as default };
