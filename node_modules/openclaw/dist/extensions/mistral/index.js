import { n as resolveProviderRequestCapabilities } from "../../provider-attribution-DFA_ceCj.js";
import "../../provider-http-BuJ3ne_x.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { t as buildMistralProvider } from "../../provider-catalog-CwYoMY4_.js";
import { n as applyMistralConfig, t as MISTRAL_DEFAULT_MODEL_REF } from "../../onboard-OIycKCvE.js";
import { n as applyMistralModelCompat, t as MISTRAL_MODEL_COMPAT_PATCH } from "../../api-seV5dXHH.js";
import { t as mistralMediaUnderstandingProvider } from "../../media-understanding-provider-J8hNX8s9.js";
//#region extensions/mistral/index.ts
const PROVIDER_ID = "mistral";
const MISTRAL_MODEL_HINTS = [
	"mistral",
	"mistralai",
	"mixtral",
	"codestral",
	"pixtral",
	"devstral",
	"ministral"
];
function isMistralModelHint(modelId) {
	const normalized = modelId.trim().toLowerCase();
	return MISTRAL_MODEL_HINTS.some((hint) => normalized === hint || normalized.startsWith(`${hint}/`) || normalized.startsWith(`${hint}-`) || normalized.startsWith(`${hint}:`));
}
function shouldContributeMistralCompat(params) {
	if (params.model.api !== "openai-completions") return false;
	const capabilities = resolveProviderRequestCapabilities({
		provider: typeof params.model.provider === "string" ? params.model.provider : void 0,
		api: "openai-completions",
		baseUrl: typeof params.model.baseUrl === "string" ? params.model.baseUrl : void 0,
		capability: "llm",
		transport: "stream",
		modelId: params.modelId,
		compat: params.model.compat && typeof params.model.compat === "object" ? params.model.compat : void 0
	});
	return capabilities.knownProviderFamily === "mistral" || capabilities.endpointClass === "mistral-public" || isMistralModelHint(params.modelId);
}
function buildMistralReplayPolicy() {
	return {
		sanitizeToolCallIds: true,
		toolCallIdMode: "strict9"
	};
}
var mistral_default = defineSingleProviderPluginEntry({
	id: PROVIDER_ID,
	name: "Mistral Provider",
	description: "Bundled Mistral provider plugin",
	provider: {
		label: "Mistral",
		docsPath: "/providers/models",
		auth: [{
			methodId: "api-key",
			label: "Mistral API key",
			hint: "API key",
			optionKey: "mistralApiKey",
			flagName: "--mistral-api-key",
			envVar: "MISTRAL_API_KEY",
			promptMessage: "Enter Mistral API key",
			defaultModel: MISTRAL_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyMistralConfig(cfg),
			wizard: { groupLabel: "Mistral AI" }
		}],
		catalog: {
			buildProvider: buildMistralProvider,
			allowExplicitBaseUrl: true
		},
		matchesContextOverflowError: ({ errorMessage }) => /\bmistral\b.*(?:input.*too long|token limit.*exceeded)/i.test(errorMessage),
		normalizeResolvedModel: ({ model }) => applyMistralModelCompat(model),
		contributeResolvedModelCompat: ({ modelId, model }) => shouldContributeMistralCompat({
			modelId,
			model
		}) ? MISTRAL_MODEL_COMPAT_PATCH : void 0,
		buildReplayPolicy: () => buildMistralReplayPolicy()
	},
	register(api) {
		api.registerMediaUnderstandingProvider(mistralMediaUnderstandingProvider);
	}
});
//#endregion
export { mistral_default as default };
