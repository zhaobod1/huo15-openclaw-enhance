import { n as getModelProviderHint } from "./provider-model-shared-DUTxdm38.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { t as resolveProviderEndpoint } from "./provider-attribution-DFA_ceCj.js";
import { i as normalizeModelCompat } from "./provider-model-compat-ddK_un1r.js";
import { i as applyXaiModelCompat } from "./provider-tools-CSRWZ4nU.js";
import { f as resolveXaiCatalogEntry } from "./model-definitions-CcgZRJOB.js";
import "./provider-catalog-DFRFFz3S.js";
import "./onboard-BV3nQ7rP.js";
//#region extensions/xai/provider-models.ts
const XAI_MODERN_MODEL_PREFIXES = [
	"grok-3",
	"grok-4",
	"grok-code-fast"
];
function isModernXaiModel(modelId) {
	const lower = modelId.trim().toLowerCase();
	if (!lower || lower.includes("multi-agent")) return false;
	return XAI_MODERN_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
function resolveXaiForwardCompatModel(params) {
	const definition = resolveXaiCatalogEntry(params.ctx.modelId);
	if (!definition) return;
	return applyXaiModelCompat(normalizeModelCompat({
		id: definition.id,
		name: definition.name,
		api: params.ctx.providerConfig?.api ?? "openai-responses",
		provider: params.providerId,
		baseUrl: params.ctx.providerConfig?.baseUrl ?? "https://api.x.ai/v1",
		reasoning: definition.reasoning,
		input: definition.input,
		cost: definition.cost,
		contextWindow: definition.contextWindow,
		maxTokens: definition.maxTokens
	}));
}
//#endregion
//#region extensions/xai/api.ts
function isXaiNativeEndpoint(baseUrl) {
	return typeof baseUrl === "string" && resolveProviderEndpoint(baseUrl).endpointClass === "xai-native";
}
function isXaiModelHint(modelId) {
	return getModelProviderHint(modelId) === "x-ai";
}
function shouldUseXaiResponsesTransport(params) {
	if (params.api !== "openai-completions") return false;
	if (isXaiNativeEndpoint(params.baseUrl)) return true;
	return normalizeProviderId(params.provider) === "xai" && !params.baseUrl;
}
function shouldContributeXaiCompat(params) {
	if (params.model.api !== "openai-completions") return false;
	return isXaiNativeEndpoint(params.model.baseUrl) || isXaiModelHint(params.modelId);
}
function resolveXaiTransport(params) {
	if (!shouldUseXaiResponsesTransport(params)) return;
	return {
		api: "openai-responses",
		baseUrl: typeof params.baseUrl === "string" ? params.baseUrl : void 0
	};
}
//#endregion
export { resolveXaiForwardCompatModel as a, isModernXaiModel as i, resolveXaiTransport as n, shouldContributeXaiCompat as r, isXaiModelHint as t };
