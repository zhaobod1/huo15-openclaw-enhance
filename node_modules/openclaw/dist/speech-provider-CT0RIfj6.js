import { c as normalizeResolvedSecretInputString } from "./types.secrets-BZdSA8i7.js";
import "./secret-input-D5U3kuko.js";
import { a as normalizeMinimaxTtsBaseUrl, i as minimaxTTS, n as MINIMAX_TTS_MODELS, r as MINIMAX_TTS_VOICES } from "./tts-CsA_agg1.js";
//#region extensions/minimax/speech-provider.ts
function trimToUndefined(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function normalizeMinimaxProviderConfig(rawConfig) {
	const raw = asObject(asObject(rawConfig.providers)?.minimax) ?? asObject(rawConfig.minimax);
	return {
		apiKey: normalizeResolvedSecretInputString({
			value: raw?.apiKey,
			path: "messages.tts.providers.minimax.apiKey"
		}),
		baseUrl: normalizeMinimaxTtsBaseUrl(trimToUndefined(raw?.baseUrl) ?? trimToUndefined(process.env.MINIMAX_API_HOST) ?? "https://api.minimax.io"),
		model: trimToUndefined(raw?.model) ?? trimToUndefined(process.env.MINIMAX_TTS_MODEL) ?? "speech-2.8-hd",
		voiceId: trimToUndefined(raw?.voiceId) ?? trimToUndefined(process.env.MINIMAX_TTS_VOICE_ID) ?? "English_expressive_narrator",
		speed: asNumber(raw?.speed),
		vol: asNumber(raw?.vol),
		pitch: asNumber(raw?.pitch)
	};
}
function readMinimaxProviderConfig(config) {
	const normalized = normalizeMinimaxProviderConfig({});
	return {
		apiKey: trimToUndefined(config.apiKey) ?? normalized.apiKey,
		baseUrl: trimToUndefined(config.baseUrl) ?? normalized.baseUrl,
		model: trimToUndefined(config.model) ?? normalized.model,
		voiceId: trimToUndefined(config.voiceId) ?? normalized.voiceId,
		speed: asNumber(config.speed) ?? normalized.speed,
		vol: asNumber(config.vol) ?? normalized.vol,
		pitch: asNumber(config.pitch) ?? normalized.pitch
	};
}
function readMinimaxOverrides(overrides) {
	if (!overrides) return {};
	return {
		model: trimToUndefined(overrides.model),
		voiceId: trimToUndefined(overrides.voiceId),
		speed: asNumber(overrides.speed),
		vol: asNumber(overrides.vol),
		pitch: asNumber(overrides.pitch)
	};
}
function parseDirectiveToken(ctx) {
	switch (ctx.key) {
		case "voice":
		case "voiceid":
		case "voice_id":
		case "minimax_voice":
		case "minimaxvoice":
			if (!ctx.policy.allowVoice) return { handled: true };
			return {
				handled: true,
				overrides: { voiceId: ctx.value }
			};
		case "model":
		case "minimax_model":
		case "minimaxmodel":
			if (!ctx.policy.allowModelId) return { handled: true };
			return {
				handled: true,
				overrides: { model: ctx.value }
			};
		case "speed": {
			if (!ctx.policy.allowVoiceSettings) return { handled: true };
			const speed = Number(ctx.value);
			if (!Number.isFinite(speed) || speed < .5 || speed > 2) return {
				handled: true,
				warnings: [`invalid MiniMax speed "${ctx.value}" (0.5-2.0)`]
			};
			return {
				handled: true,
				overrides: { speed }
			};
		}
		case "vol":
		case "volume": {
			if (!ctx.policy.allowVoiceSettings) return { handled: true };
			const vol = Number(ctx.value);
			if (!Number.isFinite(vol) || vol <= 0 || vol > 10) return {
				handled: true,
				warnings: [`invalid MiniMax volume "${ctx.value}" (0-10, exclusive)`]
			};
			return {
				handled: true,
				overrides: { vol }
			};
		}
		case "pitch": {
			if (!ctx.policy.allowVoiceSettings) return { handled: true };
			const pitch = Number(ctx.value);
			if (!Number.isFinite(pitch) || pitch < -12 || pitch > 12) return {
				handled: true,
				warnings: [`invalid MiniMax pitch "${ctx.value}" (-12 to 12)`]
			};
			return {
				handled: true,
				overrides: { pitch }
			};
		}
		default: return { handled: false };
	}
}
function buildMinimaxSpeechProvider() {
	return {
		id: "minimax",
		label: "MiniMax",
		autoSelectOrder: 40,
		models: MINIMAX_TTS_MODELS,
		voices: MINIMAX_TTS_VOICES,
		resolveConfig: ({ rawConfig }) => normalizeMinimaxProviderConfig(rawConfig),
		parseDirectiveToken,
		resolveTalkConfig: ({ baseTtsConfig, talkProviderConfig }) => {
			return {
				...normalizeMinimaxProviderConfig(baseTtsConfig),
				...talkProviderConfig.apiKey === void 0 ? {} : { apiKey: normalizeResolvedSecretInputString({
					value: talkProviderConfig.apiKey,
					path: "talk.providers.minimax.apiKey"
				}) },
				...trimToUndefined(talkProviderConfig.baseUrl) == null ? {} : { baseUrl: normalizeMinimaxTtsBaseUrl(trimToUndefined(talkProviderConfig.baseUrl)) },
				...trimToUndefined(talkProviderConfig.modelId) == null ? {} : { model: trimToUndefined(talkProviderConfig.modelId) },
				...trimToUndefined(talkProviderConfig.voiceId) == null ? {} : { voiceId: trimToUndefined(talkProviderConfig.voiceId) },
				...asNumber(talkProviderConfig.speed) == null ? {} : { speed: asNumber(talkProviderConfig.speed) },
				...asNumber(talkProviderConfig.vol) == null ? {} : { vol: asNumber(talkProviderConfig.vol) },
				...asNumber(talkProviderConfig.pitch) == null ? {} : { pitch: asNumber(talkProviderConfig.pitch) }
			};
		},
		resolveTalkOverrides: ({ params }) => ({
			...trimToUndefined(params.voiceId) == null ? {} : { voiceId: trimToUndefined(params.voiceId) },
			...trimToUndefined(params.modelId) == null ? {} : { model: trimToUndefined(params.modelId) },
			...asNumber(params.speed) == null ? {} : { speed: asNumber(params.speed) },
			...asNumber(params.vol) == null ? {} : { vol: asNumber(params.vol) },
			...asNumber(params.pitch) == null ? {} : { pitch: asNumber(params.pitch) }
		}),
		listVoices: async () => MINIMAX_TTS_VOICES.map((voice) => ({
			id: voice,
			name: voice
		})),
		isConfigured: ({ providerConfig }) => Boolean(readMinimaxProviderConfig(providerConfig).apiKey || process.env.MINIMAX_API_KEY),
		synthesize: async (req) => {
			const config = readMinimaxProviderConfig(req.providerConfig);
			const overrides = readMinimaxOverrides(req.providerOverrides);
			const apiKey = config.apiKey || process.env.MINIMAX_API_KEY;
			if (!apiKey) throw new Error("MiniMax API key missing");
			return {
				audioBuffer: await minimaxTTS({
					text: req.text,
					apiKey,
					baseUrl: config.baseUrl,
					model: overrides.model ?? config.model,
					voiceId: overrides.voiceId ?? config.voiceId,
					speed: overrides.speed ?? config.speed,
					vol: overrides.vol ?? config.vol,
					pitch: overrides.pitch ?? config.pitch,
					timeoutMs: req.timeoutMs
				}),
				outputFormat: "mp3",
				fileExtension: ".mp3",
				voiceCompatible: false
			};
		}
	};
}
//#endregion
export { buildMinimaxSpeechProvider as t };
