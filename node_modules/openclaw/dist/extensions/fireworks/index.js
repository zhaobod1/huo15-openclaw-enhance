import "../../defaults-I0_TmVEm.js";
import { s as cloneFirstTemplateModel, t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { i as normalizeModelCompat } from "../../provider-model-compat-ddK_un1r.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { o as buildFireworksProvider } from "../../provider-catalog-CRM9mDzK.js";
import { n as applyFireworksConfig, t as FIREWORKS_DEFAULT_MODEL_REF } from "../../onboard-D0d1qzbk.js";
//#region extensions/fireworks/index.ts
const PROVIDER_ID = "fireworks";
const OPENAI_COMPATIBLE_REPLAY_HOOKS = buildProviderReplayFamilyHooks({ family: "openai-compatible" });
function resolveFireworksDynamicModel(ctx) {
	const modelId = ctx.modelId.trim();
	if (!modelId) return;
	return cloneFirstTemplateModel({
		providerId: PROVIDER_ID,
		modelId,
		templateIds: ["accounts/fireworks/routers/kimi-k2p5-turbo"],
		ctx,
		patch: { provider: PROVIDER_ID }
	}) ?? normalizeModelCompat({
		id: modelId,
		name: modelId,
		provider: PROVIDER_ID,
		api: "openai-completions",
		baseUrl: "https://api.fireworks.ai/inference/v1",
		reasoning: true,
		input: ["text", "image"],
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0
		},
		contextWindow: 256e3,
		maxTokens: 256e3
	});
}
var fireworks_default = defineSingleProviderPluginEntry({
	id: PROVIDER_ID,
	name: "Fireworks Provider",
	description: "Bundled Fireworks AI provider plugin",
	provider: {
		label: "Fireworks",
		aliases: ["fireworks-ai"],
		docsPath: "/providers/fireworks",
		auth: [{
			methodId: "api-key",
			label: "Fireworks API key",
			hint: "API key",
			optionKey: "fireworksApiKey",
			flagName: "--fireworks-api-key",
			envVar: "FIREWORKS_API_KEY",
			promptMessage: "Enter Fireworks API key",
			defaultModel: FIREWORKS_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyFireworksConfig(cfg)
		}],
		catalog: {
			buildProvider: buildFireworksProvider,
			allowExplicitBaseUrl: true
		},
		...OPENAI_COMPATIBLE_REPLAY_HOOKS,
		resolveDynamicModel: (ctx) => resolveFireworksDynamicModel(ctx),
		isModernModelRef: () => true
	}
});
//#endregion
export { fireworks_default as default };
