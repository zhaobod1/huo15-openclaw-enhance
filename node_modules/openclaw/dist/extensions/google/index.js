import { t as buildProviderReplayFamilyHooks } from "../../provider-model-shared-DUTxdm38.js";
import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { t as createProviderApiKeyAuthMethod } from "../../provider-api-key-auth-4XNvOlkz.js";
import "../../provider-auth-api-key-9No7cznl.js";
import { t as buildProviderStreamFamilyHooks } from "../../provider-stream-family-DUY94MUj.js";
import { n as normalizeGoogleModelId } from "../../model-id-BhCNWqjh.js";
import { d as resolveGoogleGenerativeAiTransport, n as GOOGLE_GEMINI_DEFAULT_MODEL, r as applyGoogleGeminiModelDefault, s as normalizeGoogleProviderConfig } from "../../api-C29T3o68.js";
import { n as resolveGoogleGeminiForwardCompatModel, t as isModernGoogleModel } from "../../provider-models-DI1bz4LW.js";
import { t as registerGoogleGeminiCliProvider } from "../../gemini-cli-provider-B577TJTD.js";
import { t as buildGoogleMusicGenerationProvider } from "../../music-generation-provider-dnDyA4q1.js";
import { t as createGeminiWebSearchProvider } from "../../gemini-web-search-provider-B_Upv8nS.js";
import { t as buildGoogleVideoGenerationProvider } from "../../video-generation-provider-mHdiDeSf.js";
//#region extensions/google/index.ts
let googleImageGenerationProviderPromise = null;
let googleMediaUnderstandingProviderPromise = null;
const GOOGLE_GEMINI_PROVIDER_HOOKS = {
	...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
	...buildProviderStreamFamilyHooks("google-thinking")
};
async function loadGoogleImageGenerationProvider() {
	if (!googleImageGenerationProviderPromise) googleImageGenerationProviderPromise = import("./image-generation-provider.js").then((mod) => mod.buildGoogleImageGenerationProvider());
	return await googleImageGenerationProviderPromise;
}
async function loadGoogleMediaUnderstandingProvider() {
	if (!googleMediaUnderstandingProviderPromise) googleMediaUnderstandingProviderPromise = import("./media-understanding-provider.js").then((mod) => mod.googleMediaUnderstandingProvider);
	return await googleMediaUnderstandingProviderPromise;
}
async function loadGoogleRequiredMediaUnderstandingProvider() {
	const provider = await loadGoogleMediaUnderstandingProvider();
	if (!provider.describeImage || !provider.describeImages || !provider.transcribeAudio || !provider.describeVideo) throw new Error("google media understanding provider missing required handlers");
	return provider;
}
function createLazyGoogleImageGenerationProvider() {
	return {
		id: "google",
		label: "Google",
		defaultModel: "gemini-3.1-flash-image-preview",
		models: ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"],
		capabilities: {
			generate: {
				maxCount: 4,
				supportsSize: true,
				supportsAspectRatio: true,
				supportsResolution: true
			},
			edit: {
				enabled: true,
				maxCount: 4,
				maxInputImages: 5,
				supportsSize: true,
				supportsAspectRatio: true,
				supportsResolution: true
			},
			geometry: {
				sizes: [
					"1024x1024",
					"1024x1536",
					"1536x1024",
					"1024x1792",
					"1792x1024"
				],
				aspectRatios: [
					"1:1",
					"2:3",
					"3:2",
					"3:4",
					"4:3",
					"4:5",
					"5:4",
					"9:16",
					"16:9",
					"21:9"
				],
				resolutions: [
					"1K",
					"2K",
					"4K"
				]
			}
		},
		generateImage: async (req) => (await loadGoogleImageGenerationProvider()).generateImage(req)
	};
}
function createLazyGoogleMediaUnderstandingProvider() {
	return {
		id: "google",
		capabilities: [
			"image",
			"audio",
			"video"
		],
		defaultModels: {
			image: "gemini-3-flash-preview",
			audio: "gemini-3-flash-preview",
			video: "gemini-3-flash-preview"
		},
		autoPriority: {
			image: 30,
			audio: 40,
			video: 10
		},
		nativeDocumentInputs: ["pdf"],
		describeImage: async (...args) => await (await loadGoogleRequiredMediaUnderstandingProvider()).describeImage(...args),
		describeImages: async (...args) => await (await loadGoogleRequiredMediaUnderstandingProvider()).describeImages(...args),
		transcribeAudio: async (...args) => await (await loadGoogleRequiredMediaUnderstandingProvider()).transcribeAudio(...args),
		describeVideo: async (...args) => await (await loadGoogleRequiredMediaUnderstandingProvider()).describeVideo(...args)
	};
}
var google_default = definePluginEntry({
	id: "google",
	name: "Google Plugin",
	description: "Bundled Google plugin",
	register(api) {
		registerGoogleGeminiCliProvider(api);
		api.registerProvider({
			id: "google",
			label: "Google AI Studio",
			docsPath: "/providers/models",
			hookAliases: ["google-antigravity", "google-vertex"],
			envVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
			auth: [createProviderApiKeyAuthMethod({
				providerId: "google",
				methodId: "api-key",
				label: "Google Gemini API key",
				hint: "AI Studio / Gemini API key",
				optionKey: "geminiApiKey",
				flagName: "--gemini-api-key",
				envVar: "GEMINI_API_KEY",
				promptMessage: "Enter Gemini API key",
				defaultModel: GOOGLE_GEMINI_DEFAULT_MODEL,
				expectedProviders: ["google"],
				applyConfig: (cfg) => applyGoogleGeminiModelDefault(cfg).next,
				wizard: {
					choiceId: "gemini-api-key",
					choiceLabel: "Google Gemini API key",
					groupId: "google",
					groupLabel: "Google",
					groupHint: "Gemini API key"
				}
			})],
			normalizeTransport: ({ api, baseUrl }) => resolveGoogleGenerativeAiTransport({
				api,
				baseUrl
			}),
			normalizeConfig: ({ provider, providerConfig }) => normalizeGoogleProviderConfig(provider, providerConfig),
			normalizeModelId: ({ modelId }) => normalizeGoogleModelId(modelId),
			resolveDynamicModel: (ctx) => resolveGoogleGeminiForwardCompatModel({
				providerId: ctx.provider,
				ctx
			}),
			...GOOGLE_GEMINI_PROVIDER_HOOKS,
			isModernModelRef: ({ modelId }) => isModernGoogleModel(modelId)
		});
		api.registerImageGenerationProvider(createLazyGoogleImageGenerationProvider());
		api.registerMediaUnderstandingProvider(createLazyGoogleMediaUnderstandingProvider());
		api.registerMusicGenerationProvider(buildGoogleMusicGenerationProvider());
		api.registerVideoGenerationProvider(buildGoogleVideoGenerationProvider());
		api.registerWebSearchProvider(createGeminiWebSearchProvider());
	}
});
//#endregion
export { google_default as default };
