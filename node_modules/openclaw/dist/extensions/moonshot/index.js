import { t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { t as buildProviderStreamFamilyHooks } from "../../provider-stream-family-DUY94MUj.js";
import { a as buildMoonshotProvider, i as applyMoonshotNativeStreamingUsageCompat } from "../../provider-catalog-vgYIVIha.js";
import { n as applyMoonshotConfig, r as applyMoonshotConfigCn, t as MOONSHOT_DEFAULT_MODEL_REF } from "../../onboard-Crxwn1zk.js";
import "../../api-DMINefA0.js";
import { r as moonshotMediaUnderstandingProvider } from "../../media-understanding-provider-DUOm4CbF.js";
import { n as createKimiWebSearchProvider } from "../../kimi-web-search-provider-DsICdtt8.js";
//#region extensions/moonshot/index.ts
const PROVIDER_ID = "moonshot";
const OPENAI_COMPATIBLE_REPLAY_HOOKS = buildProviderReplayFamilyHooks({ family: "openai-compatible" });
const MOONSHOT_THINKING_STREAM_HOOKS = buildProviderStreamFamilyHooks("moonshot-thinking");
var moonshot_default = defineSingleProviderPluginEntry({
	id: PROVIDER_ID,
	name: "Moonshot Provider",
	description: "Bundled Moonshot provider plugin",
	provider: {
		label: "Moonshot",
		docsPath: "/providers/moonshot",
		auth: [{
			methodId: "api-key",
			label: "Kimi API key (.ai)",
			hint: "Kimi K2.5 + Kimi",
			optionKey: "moonshotApiKey",
			flagName: "--moonshot-api-key",
			envVar: "MOONSHOT_API_KEY",
			promptMessage: "Enter Moonshot API key",
			defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyMoonshotConfig(cfg),
			wizard: { groupLabel: "Moonshot AI (Kimi K2.5)" }
		}, {
			methodId: "api-key-cn",
			label: "Kimi API key (.cn)",
			hint: "Kimi K2.5 + Kimi",
			optionKey: "moonshotApiKey",
			flagName: "--moonshot-api-key",
			envVar: "MOONSHOT_API_KEY",
			promptMessage: "Enter Moonshot API key (.cn)",
			defaultModel: MOONSHOT_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyMoonshotConfigCn(cfg),
			wizard: { groupLabel: "Moonshot AI (Kimi K2.5)" }
		}],
		catalog: {
			buildProvider: buildMoonshotProvider,
			allowExplicitBaseUrl: true
		},
		applyNativeStreamingUsageCompat: ({ providerConfig }) => applyMoonshotNativeStreamingUsageCompat(providerConfig),
		...OPENAI_COMPATIBLE_REPLAY_HOOKS,
		...MOONSHOT_THINKING_STREAM_HOOKS
	},
	register(api) {
		api.registerMediaUnderstandingProvider(moonshotMediaUnderstandingProvider);
		api.registerWebSearchProvider(createKimiWebSearchProvider());
	}
});
//#endregion
export { moonshot_default as default };
