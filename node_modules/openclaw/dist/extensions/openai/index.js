import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { t as buildOpenAIImageGenerationProvider } from "../../image-generation-provider-BFZk0pWY.js";
import { n as openaiCodexMediaUnderstandingProvider, r as openaiMediaUnderstandingProvider } from "../../media-understanding-provider-BUTtadCJ.js";
import { t as buildOpenAICodexProviderPlugin } from "../../openai-codex-provider-DgjQM521.js";
import { t as buildOpenAIProvider } from "../../openai-provider-BAfC6P8r.js";
import { a as resolveOpenAISystemPromptContribution, i as resolveOpenAIPromptOverlayMode } from "../../prompt-overlay-C7bzKreR.js";
import { t as buildOpenAIRealtimeTranscriptionProvider } from "../../realtime-transcription-provider-bNA6_A1g.js";
import { t as buildOpenAIRealtimeVoiceProvider } from "../../realtime-voice-provider-yoUEb44A.js";
import { t as buildOpenAISpeechProvider } from "../../speech-provider-24aOfHvW.js";
import { t as buildOpenAIVideoGenerationProvider } from "../../video-generation-provider-BYEBOmDU.js";
//#region extensions/openai/index.ts
var openai_default = definePluginEntry({
	id: "openai",
	name: "OpenAI Provider",
	description: "Bundled OpenAI provider plugins",
	register(api) {
		const promptOverlayMode = resolveOpenAIPromptOverlayMode(api.pluginConfig);
		const buildProviderWithPromptContribution = (provider) => ({
			...provider,
			resolveSystemPromptContribution: (ctx) => resolveOpenAISystemPromptContribution({
				mode: promptOverlayMode,
				modelProviderId: provider.id,
				modelId: ctx.modelId
			})
		});
		api.registerProvider(buildProviderWithPromptContribution(buildOpenAIProvider()));
		api.registerProvider(buildProviderWithPromptContribution(buildOpenAICodexProviderPlugin()));
		api.registerImageGenerationProvider(buildOpenAIImageGenerationProvider());
		api.registerRealtimeTranscriptionProvider(buildOpenAIRealtimeTranscriptionProvider());
		api.registerRealtimeVoiceProvider(buildOpenAIRealtimeVoiceProvider());
		api.registerSpeechProvider(buildOpenAISpeechProvider());
		api.registerMediaUnderstandingProvider(openaiMediaUnderstandingProvider);
		api.registerMediaUnderstandingProvider(openaiCodexMediaUnderstandingProvider);
		api.registerVideoGenerationProvider(buildOpenAIVideoGenerationProvider());
	}
});
//#endregion
export { openai_default as default };
