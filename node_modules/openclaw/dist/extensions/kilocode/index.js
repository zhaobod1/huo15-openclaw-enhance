import { t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { t as buildProviderStreamFamilyHooks } from "../../provider-stream-family-DUY94MUj.js";
import { s as KILOCODE_DEFAULT_MODEL_REF } from "../../provider-models-CQySbvmG.js";
import { n as buildKilocodeProviderWithDiscovery } from "../../provider-catalog-D0TGvFuf.js";
import { t as applyKilocodeConfig } from "../../onboard-DBPsT5Zc.js";
//#region extensions/kilocode/index.ts
const PROVIDER_ID = "kilocode";
const PASSTHROUGH_GEMINI_REPLAY_HOOKS = buildProviderReplayFamilyHooks({ family: "passthrough-gemini" });
const KILOCODE_THINKING_STREAM_HOOKS = buildProviderStreamFamilyHooks("kilocode-thinking");
var kilocode_default = defineSingleProviderPluginEntry({
	id: PROVIDER_ID,
	name: "Kilo Gateway Provider",
	description: "Bundled Kilo Gateway provider plugin",
	provider: {
		label: "Kilo Gateway",
		docsPath: "/providers/kilocode",
		auth: [{
			methodId: "api-key",
			label: "Kilo Gateway API key",
			hint: "API key (OpenRouter-compatible)",
			optionKey: "kilocodeApiKey",
			flagName: "--kilocode-api-key",
			envVar: "KILOCODE_API_KEY",
			promptMessage: "Enter Kilo Gateway API key",
			defaultModel: KILOCODE_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyKilocodeConfig(cfg)
		}],
		catalog: { buildProvider: buildKilocodeProviderWithDiscovery },
		...PASSTHROUGH_GEMINI_REPLAY_HOOKS,
		...KILOCODE_THINKING_STREAM_HOOKS,
		isCacheTtlEligible: (ctx) => ctx.modelId.startsWith("anthropic/")
	}
});
//#endregion
export { kilocode_default as default };
