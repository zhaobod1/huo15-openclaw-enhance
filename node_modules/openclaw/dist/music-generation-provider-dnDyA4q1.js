import { n as extensionForMime } from "./mime-MVyX1IzB.js";
import "./msteams-COQVwdGN.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import { a as normalizeGoogleApiBaseUrl } from "./api-C29T3o68.js";
import { t as GoogleGenAI } from "./node-BcDgN2o4.js";
//#region extensions/google/music-generation-provider.ts
const DEFAULT_GOOGLE_MUSIC_MODEL = "lyria-3-clip-preview";
const GOOGLE_PRO_MUSIC_MODEL = "lyria-3-pro-preview";
const DEFAULT_TIMEOUT_MS = 18e4;
const GOOGLE_MAX_INPUT_IMAGES = 10;
function resolveConfiguredGoogleMusicBaseUrl(req) {
	const configured = req.cfg?.models?.providers?.google?.baseUrl?.trim();
	return configured ? normalizeGoogleApiBaseUrl(configured) : void 0;
}
function buildMusicPrompt(req) {
	const parts = [req.prompt.trim()];
	const lyrics = req.lyrics?.trim();
	if (req.instrumental === true) parts.push("Instrumental only. No vocals, no sung lyrics, no spoken word.");
	if (lyrics) parts.push(`Lyrics:\n${lyrics}`);
	return parts.join("\n\n");
}
function resolveSupportedFormats(model) {
	return model === GOOGLE_PRO_MUSIC_MODEL ? ["mp3", "wav"] : ["mp3"];
}
function resolveTrackFileName(params) {
	const ext = extensionForMime(params.mimeType)?.replace(/^\./u, "") || (params.model === GOOGLE_PRO_MUSIC_MODEL ? "wav" : "mp3");
	return `track-${params.index + 1}.${ext}`;
}
function extractTracks(params) {
	const lyrics = [];
	const tracks = [];
	for (const part of params.payload.candidates?.[0]?.content?.parts ?? []) {
		if (part.text?.trim()) {
			lyrics.push(part.text.trim());
			continue;
		}
		const inline = part.inlineData ?? part.inline_data;
		const data = inline?.data?.trim();
		if (!data) continue;
		const mimeType = inline?.mimeType?.trim() || inline?.mime_type?.trim() || "audio/mpeg";
		tracks.push({
			buffer: Buffer.from(data, "base64"),
			mimeType,
			fileName: resolveTrackFileName({
				index: tracks.length,
				mimeType,
				model: params.model
			})
		});
	}
	return {
		tracks,
		lyrics
	};
}
function buildGoogleMusicGenerationProvider() {
	return {
		id: "google",
		label: "Google",
		defaultModel: DEFAULT_GOOGLE_MUSIC_MODEL,
		models: [DEFAULT_GOOGLE_MUSIC_MODEL, GOOGLE_PRO_MUSIC_MODEL],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "google",
			agentDir
		}),
		capabilities: {
			maxTracks: 1,
			maxInputImages: GOOGLE_MAX_INPUT_IMAGES,
			supportsLyrics: true,
			supportsInstrumental: true,
			supportsFormat: true,
			supportedFormatsByModel: {
				[DEFAULT_GOOGLE_MUSIC_MODEL]: ["mp3"],
				[GOOGLE_PRO_MUSIC_MODEL]: ["mp3", "wav"]
			}
		},
		async generateMusic(req) {
			if ((req.inputImages?.length ?? 0) > GOOGLE_MAX_INPUT_IMAGES) throw new Error(`Google music generation supports at most ${GOOGLE_MAX_INPUT_IMAGES} reference images.`);
			const auth = await resolveApiKeyForProvider({
				provider: "google",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Google API key missing");
			const model = req.model?.trim() || DEFAULT_GOOGLE_MUSIC_MODEL;
			if (req.format) {
				const supportedFormats = resolveSupportedFormats(model);
				if (!supportedFormats.includes(req.format)) throw new Error(`Google music generation model ${model} supports ${supportedFormats.join(", ")} output.`);
			}
			const { tracks, lyrics } = extractTracks({
				payload: await new GoogleGenAI({
					apiKey: auth.apiKey,
					httpOptions: {
						...resolveConfiguredGoogleMusicBaseUrl(req) ? { baseUrl: resolveConfiguredGoogleMusicBaseUrl(req) } : {},
						timeout: req.timeoutMs ?? DEFAULT_TIMEOUT_MS
					}
				}).models.generateContent({
					model,
					contents: [{ text: buildMusicPrompt(req) }, ...(req.inputImages ?? []).map((image) => ({ inlineData: {
						mimeType: image.mimeType?.trim() || "image/png",
						data: image.buffer?.toString("base64") ?? ""
					} }))],
					config: { responseModalities: ["AUDIO", "TEXT"] }
				}),
				model
			});
			if (tracks.length === 0) throw new Error("Google music generation response missing audio data");
			return {
				tracks,
				...lyrics.length > 0 ? { lyrics } : {},
				model,
				metadata: {
					inputImageCount: req.inputImages?.length ?? 0,
					instrumental: req.instrumental === true,
					...req.lyrics?.trim() ? { requestedLyrics: true } : {},
					...req.format ? { requestedFormat: req.format } : {}
				}
			};
		}
	};
}
//#endregion
export { buildGoogleMusicGenerationProvider as t };
