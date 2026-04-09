import { n as ensureAuthProfileStore, p as CODEX_CLI_PROFILE_ID } from "./store-HF_Z-jKz.js";
import "./defaults-I0_TmVEm.js";
import { c as matchesExactOrPrefix, s as cloneFirstTemplateModel } from "./provider-model-shared-DUTxdm38.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { i as normalizeModelCompat } from "./provider-model-compat-ddK_un1r.js";
import { n as listProfilesForProvider } from "./profiles-DKQdaSwr.js";
import { t as buildOauthProviderAuthResult } from "./provider-auth-result-C7_IeuCa.js";
import "./provider-auth-BI9t-Krp.js";
import { r as loginOpenAICodexOAuth } from "./provider-auth-login-q3SY3eqZ.js";
import { a as findCatalogTemplate } from "./provider-catalog-shared-CEuY8K3k.js";
import { t as buildProviderStreamFamilyHooks } from "./provider-stream-family-DUY94MUj.js";
import { i as fetchCodexUsage } from "./provider-usage-CjZ_bUoM.js";
import { t as OPENAI_CODEX_DEFAULT_MODEL } from "./default-models-Dm-mq9ty.js";
import { n as resolveCodexAuthIdentity } from "./openai-codex-auth-identity-4yP8CrjV.js";
import { n as buildOpenAICodexProvider } from "./openai-codex-catalog-DR1Kv0zf.js";
import { t as buildOpenAIReplayPolicy } from "./replay-policy-s3mu3i0L.js";
import { n as isOpenAIApiBaseUrl } from "./shared-BGtdAlDq.js";
import { n as resolveOpenAIWebSocketSessionPolicy, t as resolveOpenAITransportTurnState } from "./transport-policy-Ca1UY3z9.js";
//#region extensions/openai/openai-codex-provider.ts
const PROVIDER_ID = "openai-codex";
const OPENAI_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const OPENAI_CODEX_GPT_54_MODEL_ID = "gpt-5.4";
const OPENAI_CODEX_GPT_54_MINI_MODEL_ID = "gpt-5.4-mini";
const OPENAI_CODEX_GPT_54_NATIVE_CONTEXT_TOKENS = 105e4;
const OPENAI_CODEX_GPT_54_DEFAULT_CONTEXT_TOKENS = 272e3;
const OPENAI_CODEX_GPT_54_MINI_CONTEXT_TOKENS = 272e3;
const OPENAI_CODEX_GPT_54_MAX_TOKENS = 128e3;
const OPENAI_CODEX_GPT_54_COST = {
	input: 2.5,
	output: 15,
	cacheRead: .25,
	cacheWrite: 0
};
const OPENAI_CODEX_GPT_54_MINI_COST = {
	input: .75,
	output: 4.5,
	cacheRead: .075,
	cacheWrite: 0
};
const OPENAI_CODEX_GPT_54_TEMPLATE_MODEL_IDS = ["gpt-5.3-codex", "gpt-5.2-codex"];
const OPENAI_CODEX_GPT_54_MINI_TEMPLATE_MODEL_IDS = [
	OPENAI_CODEX_GPT_54_MODEL_ID,
	"gpt-5.1-codex-mini",
	...OPENAI_CODEX_GPT_54_TEMPLATE_MODEL_IDS
];
const OPENAI_CODEX_GPT_53_MODEL_ID = "gpt-5.3-codex";
const OPENAI_CODEX_GPT_53_SPARK_MODEL_ID = "gpt-5.3-codex-spark";
const OPENAI_CODEX_GPT_53_SPARK_CONTEXT_TOKENS = 128e3;
const OPENAI_CODEX_GPT_53_SPARK_MAX_TOKENS = 128e3;
const OPENAI_CODEX_TEMPLATE_MODEL_IDS = ["gpt-5.2-codex"];
const OPENAI_CODEX_XHIGH_MODEL_IDS = [
	OPENAI_CODEX_GPT_54_MODEL_ID,
	OPENAI_CODEX_GPT_54_MINI_MODEL_ID,
	OPENAI_CODEX_GPT_53_MODEL_ID,
	OPENAI_CODEX_GPT_53_SPARK_MODEL_ID,
	"gpt-5.2-codex",
	"gpt-5.1-codex"
];
const OPENAI_CODEX_MODERN_MODEL_IDS = [
	OPENAI_CODEX_GPT_54_MODEL_ID,
	OPENAI_CODEX_GPT_54_MINI_MODEL_ID,
	"gpt-5.2",
	"gpt-5.2-codex",
	OPENAI_CODEX_GPT_53_MODEL_ID,
	OPENAI_CODEX_GPT_53_SPARK_MODEL_ID
];
const OPENAI_RESPONSES_STREAM_HOOKS = buildProviderStreamFamilyHooks("openai-responses-defaults");
function isOpenAICodexBaseUrl(baseUrl) {
	const trimmed = baseUrl?.trim();
	if (!trimmed) return false;
	return /^https?:\/\/chatgpt\.com\/backend-api\/?$/i.test(trimmed);
}
function normalizeCodexTransport(model) {
	const api = (!model.baseUrl || isOpenAIApiBaseUrl(model.baseUrl) || isOpenAICodexBaseUrl(model.baseUrl)) && model.api === "openai-responses" ? "openai-codex-responses" : model.api;
	const baseUrl = api === "openai-codex-responses" && (!model.baseUrl || isOpenAIApiBaseUrl(model.baseUrl)) ? OPENAI_CODEX_BASE_URL : model.baseUrl;
	if (api === model.api && baseUrl === model.baseUrl) return model;
	return {
		...model,
		api,
		baseUrl
	};
}
function resolveCodexForwardCompatModel(ctx) {
	const trimmedModelId = ctx.modelId.trim();
	const lower = trimmedModelId.toLowerCase();
	let templateIds;
	let patch;
	if (lower === OPENAI_CODEX_GPT_54_MODEL_ID) {
		templateIds = OPENAI_CODEX_GPT_54_TEMPLATE_MODEL_IDS;
		patch = {
			contextWindow: OPENAI_CODEX_GPT_54_NATIVE_CONTEXT_TOKENS,
			contextTokens: OPENAI_CODEX_GPT_54_DEFAULT_CONTEXT_TOKENS,
			maxTokens: OPENAI_CODEX_GPT_54_MAX_TOKENS,
			cost: OPENAI_CODEX_GPT_54_COST
		};
	} else if (lower === OPENAI_CODEX_GPT_54_MINI_MODEL_ID) {
		templateIds = OPENAI_CODEX_GPT_54_MINI_TEMPLATE_MODEL_IDS;
		patch = {
			contextWindow: OPENAI_CODEX_GPT_54_MINI_CONTEXT_TOKENS,
			maxTokens: OPENAI_CODEX_GPT_54_MAX_TOKENS,
			cost: OPENAI_CODEX_GPT_54_MINI_COST
		};
	} else if (lower === OPENAI_CODEX_GPT_53_SPARK_MODEL_ID) {
		templateIds = [OPENAI_CODEX_GPT_53_MODEL_ID, ...OPENAI_CODEX_TEMPLATE_MODEL_IDS];
		patch = {
			api: "openai-codex-responses",
			provider: PROVIDER_ID,
			baseUrl: OPENAI_CODEX_BASE_URL,
			reasoning: true,
			input: ["text"],
			cost: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0
			},
			contextWindow: OPENAI_CODEX_GPT_53_SPARK_CONTEXT_TOKENS,
			maxTokens: OPENAI_CODEX_GPT_53_SPARK_MAX_TOKENS
		};
	} else if (lower === OPENAI_CODEX_GPT_53_MODEL_ID) templateIds = OPENAI_CODEX_TEMPLATE_MODEL_IDS;
	else return;
	return cloneFirstTemplateModel({
		providerId: PROVIDER_ID,
		modelId: trimmedModelId,
		templateIds,
		ctx,
		patch
	}) ?? normalizeModelCompat({
		id: trimmedModelId,
		name: trimmedModelId,
		api: "openai-codex-responses",
		provider: PROVIDER_ID,
		baseUrl: OPENAI_CODEX_BASE_URL,
		reasoning: true,
		input: ["text", "image"],
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0
		},
		contextWindow: patch?.contextWindow ?? 2e5,
		contextTokens: patch?.contextTokens,
		maxTokens: patch?.maxTokens ?? 2e5
	});
}
async function refreshOpenAICodexOAuthCredential(cred) {
	try {
		const { refreshOpenAICodexToken } = await import("./extensions/openai/openai-codex-provider.runtime.js");
		const refreshed = await refreshOpenAICodexToken(cred.refresh);
		return {
			...cred,
			...refreshed,
			type: "oauth",
			provider: PROVIDER_ID,
			email: cred.email,
			displayName: cred.displayName
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (/extract\s+accountid\s+from\s+token/i.test(message) && typeof cred.access === "string" && cred.access.trim().length > 0) return cred;
		throw error;
	}
}
async function runOpenAICodexOAuth(ctx) {
	let creds;
	try {
		creds = await loginOpenAICodexOAuth({
			prompter: ctx.prompter,
			runtime: ctx.runtime,
			isRemote: ctx.isRemote,
			openUrl: ctx.openUrl,
			localBrowserMessage: "Complete sign-in in browser…"
		});
	} catch {
		return { profiles: [] };
	}
	if (!creds) return { profiles: [] };
	const identity = resolveCodexAuthIdentity({
		accessToken: creds.access,
		email: typeof creds.email === "string" ? creds.email : void 0
	});
	return buildOauthProviderAuthResult({
		providerId: PROVIDER_ID,
		defaultModel: OPENAI_CODEX_DEFAULT_MODEL,
		access: creds.access,
		refresh: creds.refresh,
		expires: creds.expires,
		email: identity.email,
		profileName: identity.profileName
	});
}
function buildOpenAICodexAuthDoctorHint(ctx) {
	if (ctx.profileId !== "openai-codex:codex-cli") return;
	return "Deprecated profile. Run `openclaw models auth login --provider openai-codex` or `openclaw configure`.";
}
function buildSyntheticCatalogEntry(template, entry) {
	if (!template) return;
	return {
		...template,
		id: entry.id,
		name: entry.id,
		reasoning: entry.reasoning,
		input: [...entry.input],
		contextWindow: entry.contextWindow,
		...entry.contextTokens === void 0 ? {} : { contextTokens: entry.contextTokens }
	};
}
function buildOpenAICodexProviderPlugin() {
	return {
		id: PROVIDER_ID,
		label: "OpenAI Codex",
		docsPath: "/providers/models",
		deprecatedProfileIds: [CODEX_CLI_PROFILE_ID],
		auth: [{
			id: "oauth",
			label: "ChatGPT OAuth",
			hint: "Browser sign-in",
			kind: "oauth",
			run: async (ctx) => await runOpenAICodexOAuth(ctx)
		}],
		wizard: { setup: {
			choiceId: "openai-codex",
			choiceLabel: "OpenAI Codex (ChatGPT OAuth)",
			choiceHint: "Browser sign-in",
			methodId: "oauth"
		} },
		catalog: {
			order: "profile",
			run: async (ctx) => {
				if (listProfilesForProvider(ensureAuthProfileStore(ctx.agentDir, { allowKeychainPrompt: false }), PROVIDER_ID).length === 0) return null;
				return { provider: buildOpenAICodexProvider() };
			}
		},
		resolveDynamicModel: (ctx) => resolveCodexForwardCompatModel(ctx),
		buildAuthDoctorHint: (ctx) => buildOpenAICodexAuthDoctorHint(ctx),
		supportsXHighThinking: ({ modelId }) => matchesExactOrPrefix(modelId, OPENAI_CODEX_XHIGH_MODEL_IDS),
		isModernModelRef: ({ modelId }) => matchesExactOrPrefix(modelId, OPENAI_CODEX_MODERN_MODEL_IDS),
		buildReplayPolicy: buildOpenAIReplayPolicy,
		prepareExtraParams: (ctx) => {
			const transport = ctx.extraParams?.transport;
			if (transport === "auto" || transport === "sse" || transport === "websocket") return ctx.extraParams;
			return {
				...ctx.extraParams,
				transport: "auto"
			};
		},
		...OPENAI_RESPONSES_STREAM_HOOKS,
		resolveTransportTurnState: (ctx) => resolveOpenAITransportTurnState(ctx),
		resolveWebSocketSessionPolicy: (ctx) => resolveOpenAIWebSocketSessionPolicy(ctx),
		resolveReasoningOutputMode: () => "native",
		normalizeResolvedModel: (ctx) => {
			if (normalizeProviderId(ctx.provider) !== PROVIDER_ID) return;
			return normalizeCodexTransport(ctx.model);
		},
		resolveUsageAuth: async (ctx) => await ctx.resolveOAuthToken(),
		fetchUsageSnapshot: async (ctx) => await fetchCodexUsage(ctx.token, ctx.accountId, ctx.timeoutMs, ctx.fetchFn),
		refreshOAuth: async (cred) => await refreshOpenAICodexOAuthCredential(cred),
		augmentModelCatalog: (ctx) => {
			const gpt54Template = findCatalogTemplate({
				entries: ctx.entries,
				providerId: PROVIDER_ID,
				templateIds: OPENAI_CODEX_GPT_54_TEMPLATE_MODEL_IDS
			});
			const gpt54MiniTemplate = findCatalogTemplate({
				entries: ctx.entries,
				providerId: PROVIDER_ID,
				templateIds: OPENAI_CODEX_GPT_54_MINI_TEMPLATE_MODEL_IDS
			});
			const sparkTemplate = findCatalogTemplate({
				entries: ctx.entries,
				providerId: PROVIDER_ID,
				templateIds: [OPENAI_CODEX_GPT_53_MODEL_ID, ...OPENAI_CODEX_TEMPLATE_MODEL_IDS]
			});
			return [
				buildSyntheticCatalogEntry(gpt54Template, {
					id: OPENAI_CODEX_GPT_54_MODEL_ID,
					reasoning: true,
					input: ["text", "image"],
					contextWindow: OPENAI_CODEX_GPT_54_NATIVE_CONTEXT_TOKENS,
					contextTokens: OPENAI_CODEX_GPT_54_DEFAULT_CONTEXT_TOKENS
				}),
				buildSyntheticCatalogEntry(gpt54MiniTemplate, {
					id: OPENAI_CODEX_GPT_54_MINI_MODEL_ID,
					reasoning: true,
					input: ["text", "image"],
					contextWindow: OPENAI_CODEX_GPT_54_MINI_CONTEXT_TOKENS
				}),
				buildSyntheticCatalogEntry(sparkTemplate, {
					id: OPENAI_CODEX_GPT_53_SPARK_MODEL_ID,
					reasoning: true,
					input: ["text"],
					contextWindow: OPENAI_CODEX_GPT_53_SPARK_CONTEXT_TOKENS
				})
			].filter((entry) => entry !== void 0);
		}
	};
}
//#endregion
export { buildOpenAICodexProviderPlugin as t };
