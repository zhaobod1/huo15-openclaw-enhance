import { s as cloneFirstTemplateModel } from "./provider-model-shared-DUTxdm38.js";
//#region extensions/google/provider-models.ts
const GEMINI_2_5_PRO_PREFIX = "gemini-2.5-pro";
const GEMINI_2_5_FLASH_LITE_PREFIX = "gemini-2.5-flash-lite";
const GEMINI_2_5_FLASH_PREFIX = "gemini-2.5-flash";
const GEMINI_3_1_PRO_PREFIX = "gemini-3.1-pro";
const GEMINI_3_1_FLASH_LITE_PREFIX = "gemini-3.1-flash-lite";
const GEMINI_3_1_FLASH_PREFIX = "gemini-3.1-flash";
const GOOGLE_GEMINI_CLI_PROVIDER_ID = "google-gemini-cli";
const GEMINI_2_5_PRO_TEMPLATE_IDS = ["gemini-2.5-pro"];
const GEMINI_2_5_FLASH_LITE_TEMPLATE_IDS = ["gemini-2.5-flash-lite"];
const GEMINI_2_5_FLASH_TEMPLATE_IDS = ["gemini-2.5-flash"];
const GEMINI_3_1_PRO_TEMPLATE_IDS = ["gemini-3-pro-preview"];
const GEMINI_3_1_FLASH_LITE_TEMPLATE_IDS = ["gemini-3.1-flash-lite-preview"];
const GEMINI_3_1_FLASH_TEMPLATE_IDS = ["gemini-3-flash-preview"];
function cloneGoogleTemplateModel(params) {
	return cloneFirstTemplateModel({
		providerId: params.templateProviderId,
		modelId: params.modelId,
		templateIds: params.templateIds,
		ctx: params.ctx,
		patch: {
			...params.patch,
			provider: params.providerId
		}
	});
}
function isGoogleGeminiCliProvider(providerId) {
	return providerId.trim().toLowerCase() === GOOGLE_GEMINI_CLI_PROVIDER_ID;
}
function templateIdsForProvider(templateProviderId, family) {
	return isGoogleGeminiCliProvider(templateProviderId) ? family.cliTemplateIds : family.googleTemplateIds;
}
function buildGoogleTemplateSources(params) {
	const defaultTemplateProviderId = params.templateProviderId?.trim() ? params.templateProviderId : isGoogleGeminiCliProvider(params.providerId) ? "google" : GOOGLE_GEMINI_CLI_PROVIDER_ID;
	const orderedTemplateProviderIds = isGoogleGeminiCliProvider(params.providerId) && params.family.preferExternalFirstForCli === true ? [defaultTemplateProviderId, params.providerId] : [params.providerId, defaultTemplateProviderId];
	const seen = /* @__PURE__ */ new Set();
	const sources = [];
	for (const providerId of orderedTemplateProviderIds) {
		const trimmed = providerId?.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		sources.push({
			templateProviderId: trimmed,
			templateIds: templateIdsForProvider(trimmed, params.family)
		});
	}
	return sources;
}
function resolveGoogleGeminiForwardCompatModel(params) {
	const trimmed = params.ctx.modelId.trim();
	const lower = trimmed.toLowerCase();
	let family;
	let patch;
	if (lower.startsWith(GEMINI_2_5_PRO_PREFIX)) family = {
		googleTemplateIds: GEMINI_2_5_PRO_TEMPLATE_IDS,
		cliTemplateIds: GEMINI_3_1_PRO_TEMPLATE_IDS,
		preferExternalFirstForCli: true
	};
	else if (lower.startsWith(GEMINI_2_5_FLASH_LITE_PREFIX)) family = {
		googleTemplateIds: GEMINI_2_5_FLASH_LITE_TEMPLATE_IDS,
		cliTemplateIds: GEMINI_3_1_FLASH_LITE_TEMPLATE_IDS,
		preferExternalFirstForCli: true
	};
	else if (lower.startsWith(GEMINI_2_5_FLASH_PREFIX)) family = {
		googleTemplateIds: GEMINI_2_5_FLASH_TEMPLATE_IDS,
		cliTemplateIds: GEMINI_3_1_FLASH_TEMPLATE_IDS,
		preferExternalFirstForCli: true
	};
	else if (lower.startsWith(GEMINI_3_1_PRO_PREFIX)) {
		family = {
			googleTemplateIds: GEMINI_3_1_PRO_TEMPLATE_IDS,
			cliTemplateIds: GEMINI_3_1_PRO_TEMPLATE_IDS
		};
		if (params.providerId === "google" || params.providerId === GOOGLE_GEMINI_CLI_PROVIDER_ID) patch = { reasoning: true };
	} else if (lower.startsWith(GEMINI_3_1_FLASH_LITE_PREFIX)) family = {
		googleTemplateIds: GEMINI_3_1_FLASH_LITE_TEMPLATE_IDS,
		cliTemplateIds: GEMINI_3_1_FLASH_LITE_TEMPLATE_IDS
	};
	else if (lower.startsWith(GEMINI_3_1_FLASH_PREFIX)) family = {
		googleTemplateIds: GEMINI_3_1_FLASH_TEMPLATE_IDS,
		cliTemplateIds: GEMINI_3_1_FLASH_TEMPLATE_IDS
	};
	else return;
	for (const source of buildGoogleTemplateSources({
		providerId: params.providerId,
		templateProviderId: params.templateProviderId,
		family
	})) {
		const model = cloneGoogleTemplateModel({
			providerId: params.providerId,
			modelId: trimmed,
			templateProviderId: source.templateProviderId,
			templateIds: source.templateIds,
			ctx: params.ctx,
			patch
		});
		if (model) return model;
	}
}
function isModernGoogleModel(modelId) {
	const lower = modelId.trim().toLowerCase();
	return lower.startsWith("gemini-2.5") || lower.startsWith("gemini-3");
}
//#endregion
export { resolveGoogleGeminiForwardCompatModel as n, isModernGoogleModel as t };
