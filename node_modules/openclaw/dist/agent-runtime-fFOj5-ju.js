import "./auth-profiles-gRFfbuWd.js";
import { a as resolveAgentDir, o as resolveAgentEffectiveModelPrimary } from "./agent-scope-CXWTwwic.js";
import { C as splitTrailingAuthProfile, _ as resolveModelRefFromString, h as resolveDefaultModelForAgent, i as buildModelAliasIndex } from "./model-selection-BVM4eHHo.js";
import "./defaults-I0_TmVEm.js";
import "./model-auth-markers-DBBQxeVp.js";
import "./common-B7pbdYUb.js";
import "./web-fetch-utils-D_FD0Y6K.js";
import "./model-catalog-CQDWCU0w.js";
import "./identity-BnWdHPUW.js";
import "./tts-DjM75vMW.js";
import { n as applyLocalNoAuthHeaderOverride, r as getApiKeyForModel } from "./model-auth-BbESr7Je.js";
import "./sandbox-paths-B1-hAAsM.js";
import "./pi-embedded-utils-BkjmxXgM.js";
import "./typebox-o06rY0vc.js";
import { t as resolveModel } from "./model-D9GwM6aS.js";
import "./identity-avatar-ChtGMF31.js";
import "./agent-command-DCy1nGSb.js";
import { complete } from "@mariozechner/pi-ai";
//#region src/agents/simple-completion-runtime.ts
function resolveSimpleCompletionSelectionForAgent(params) {
	const fallbackRef = resolveDefaultModelForAgent({
		cfg: params.cfg,
		agentId: params.agentId
	});
	const modelRef = params.modelRef?.trim() || resolveAgentEffectiveModelPrimary(params.cfg, params.agentId);
	const split = modelRef ? splitTrailingAuthProfile(modelRef) : null;
	const aliasIndex = buildModelAliasIndex({
		cfg: params.cfg,
		defaultProvider: fallbackRef.provider || "openai"
	});
	const resolved = split ? resolveModelRefFromString({
		raw: split.model,
		defaultProvider: fallbackRef.provider || "openai",
		aliasIndex
	}) : null;
	const provider = resolved?.ref.provider ?? fallbackRef.provider;
	const modelId = resolved?.ref.model ?? fallbackRef.model;
	if (!provider || !modelId) return null;
	return {
		provider,
		modelId,
		profileId: split?.profile || void 0,
		agentDir: resolveAgentDir(params.cfg, params.agentId)
	};
}
async function setRuntimeApiKeyForCompletion(params) {
	if (params.model.provider === "github-copilot") {
		const { resolveCopilotApiToken } = await import("./github-copilot-token-CVThwDW7.js");
		const copilotToken = await resolveCopilotApiToken({ githubToken: params.apiKey });
		params.authStorage.setRuntimeApiKey(params.model.provider, copilotToken.token);
		return {
			apiKey: copilotToken.token,
			baseUrl: copilotToken.baseUrl
		};
	}
	params.authStorage.setRuntimeApiKey(params.model.provider, params.apiKey);
	return { apiKey: params.apiKey };
}
function hasMissingApiKeyAllowance(params) {
	return Boolean(params.allowMissingApiKeyModes?.includes(params.mode));
}
async function prepareSimpleCompletionModel(params) {
	const resolved = resolveModel(params.provider, params.modelId, params.agentDir, params.cfg);
	if (!resolved.model) return { error: resolved.error ?? `Unknown model: ${params.provider}/${params.modelId}` };
	let auth;
	try {
		auth = await getApiKeyForModel({
			model: resolved.model,
			cfg: params.cfg,
			agentDir: params.agentDir,
			profileId: params.profileId,
			preferredProfile: params.preferredProfile
		});
	} catch (err) {
		return { error: `Auth lookup failed for provider "${resolved.model.provider}": ${err instanceof Error ? err.message : String(err)}` };
	}
	const rawApiKey = auth.apiKey?.trim();
	if (!rawApiKey && !hasMissingApiKeyAllowance({
		mode: auth.mode,
		allowMissingApiKeyModes: params.allowMissingApiKeyModes
	})) return {
		error: `No API key resolved for provider "${resolved.model.provider}" (auth mode: ${auth.mode}).`,
		auth
	};
	let resolvedApiKey = rawApiKey;
	let resolvedModel = resolved.model;
	if (rawApiKey) {
		const runtimeCredential = await setRuntimeApiKeyForCompletion({
			authStorage: resolved.authStorage,
			model: resolved.model,
			apiKey: rawApiKey
		});
		resolvedApiKey = runtimeCredential.apiKey;
		const runtimeBaseUrl = runtimeCredential.baseUrl?.trim();
		if (runtimeBaseUrl) resolvedModel = {
			...resolvedModel,
			baseUrl: runtimeBaseUrl
		};
	}
	const resolvedAuth = {
		...auth,
		apiKey: resolvedApiKey
	};
	return {
		model: applyLocalNoAuthHeaderOverride(resolvedModel, resolvedAuth),
		auth: resolvedAuth
	};
}
async function prepareSimpleCompletionModelForAgent(params) {
	const selection = resolveSimpleCompletionSelectionForAgent({
		cfg: params.cfg,
		agentId: params.agentId,
		modelRef: params.modelRef
	});
	if (!selection) return { error: `No model configured for agent ${params.agentId}.` };
	const prepared = await prepareSimpleCompletionModel({
		cfg: params.cfg,
		provider: selection.provider,
		modelId: selection.modelId,
		agentDir: selection.agentDir,
		profileId: selection.profileId,
		preferredProfile: params.preferredProfile,
		allowMissingApiKeyModes: params.allowMissingApiKeyModes
	});
	if ("error" in prepared) return {
		...prepared,
		selection
	};
	return {
		selection,
		model: prepared.model,
		auth: prepared.auth
	};
}
async function completeWithPreparedSimpleCompletionModel(params) {
	return await complete(params.model, params.context, {
		...params.options,
		apiKey: params.auth.apiKey
	});
}
//#endregion
export { resolveSimpleCompletionSelectionForAgent as i, prepareSimpleCompletionModel as n, prepareSimpleCompletionModelForAgent as r, completeWithPreparedSimpleCompletionModel as t };
