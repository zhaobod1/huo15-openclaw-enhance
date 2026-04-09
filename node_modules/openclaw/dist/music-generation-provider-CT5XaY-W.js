import { n as extensionForMime } from "./mime-MVyX1IzB.js";
import { r as fetchWithTimeout } from "./fetch-timeout-BoLO0G3U.js";
import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import "./msteams-COQVwdGN.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
//#region extensions/minimax/music-generation-provider.ts
const DEFAULT_MINIMAX_MUSIC_BASE_URL = "https://api.minimax.io";
const DEFAULT_MINIMAX_MUSIC_MODEL = "music-2.5+";
const DEFAULT_TIMEOUT_MS = 12e4;
function resolveMinimaxMusicBaseUrl(cfg) {
	const direct = cfg?.models?.providers?.minimax?.baseUrl?.trim();
	if (!direct) return DEFAULT_MINIMAX_MUSIC_BASE_URL;
	try {
		return new URL(direct).origin;
	} catch {
		return DEFAULT_MINIMAX_MUSIC_BASE_URL;
	}
}
function assertMinimaxBaseResp(baseResp, context) {
	if (!baseResp || typeof baseResp.status_code !== "number" || baseResp.status_code === 0) return;
	throw new Error(`${context} (${baseResp.status_code}): ${baseResp.status_msg ?? "unknown error"}`);
}
function decodePossibleBinary(data) {
	const trimmed = data.trim();
	if (/^[0-9a-f]+$/iu.test(trimmed) && trimmed.length % 2 === 0) return Buffer.from(trimmed, "hex");
	return Buffer.from(trimmed, "base64");
}
function decodePossibleText(data) {
	const trimmed = data.trim();
	if (!trimmed) return "";
	if (/^[0-9a-f]+$/iu.test(trimmed) && trimmed.length % 2 === 0) return Buffer.from(trimmed, "hex").toString("utf8").trim();
	return trimmed;
}
async function downloadTrackFromUrl(params) {
	const response = await fetchWithTimeout(params.url, { method: "GET" }, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
	await assertOkOrThrowHttpError(response, "MiniMax generated music download failed");
	const mimeType = response.headers.get("content-type")?.trim() || "audio/mpeg";
	const ext = extensionForMime(mimeType)?.replace(/^\./u, "") || "mp3";
	return {
		buffer: Buffer.from(await response.arrayBuffer()),
		mimeType,
		fileName: `track-1.${ext}`
	};
}
function buildPrompt(req) {
	const parts = [req.prompt.trim()];
	if (typeof req.durationSeconds === "number" && Number.isFinite(req.durationSeconds)) parts.push(`Target duration: about ${Math.max(1, Math.round(req.durationSeconds))} seconds.`);
	return parts.join("\n\n");
}
function buildMinimaxMusicGenerationProvider() {
	return {
		id: "minimax",
		label: "MiniMax",
		defaultModel: DEFAULT_MINIMAX_MUSIC_MODEL,
		models: [
			DEFAULT_MINIMAX_MUSIC_MODEL,
			"music-2.5",
			"music-2.0"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "minimax",
			agentDir
		}),
		capabilities: {
			maxTracks: 1,
			supportsLyrics: true,
			supportsInstrumental: true,
			supportsDuration: true,
			supportsFormat: true,
			supportedFormats: ["mp3"]
		},
		async generateMusic(req) {
			if ((req.inputImages?.length ?? 0) > 0) throw new Error("MiniMax music generation does not support image reference inputs.");
			if (req.instrumental === true && req.lyrics?.trim()) throw new Error("MiniMax music generation cannot use lyrics when instrumental=true.");
			if (req.format && req.format !== "mp3") throw new Error("MiniMax music generation currently supports mp3 output only.");
			const auth = await resolveApiKeyForProvider({
				provider: "minimax",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("MiniMax API key missing");
			const fetchFn = fetch;
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveMinimaxMusicBaseUrl(req.cfg),
				defaultBaseUrl: DEFAULT_MINIMAX_MUSIC_BASE_URL,
				allowPrivateNetwork: false,
				defaultHeaders: { Authorization: `Bearer ${auth.apiKey}` }
			});
			const model = req.model?.trim() || DEFAULT_MINIMAX_MUSIC_MODEL;
			const body = {
				model,
				prompt: buildPrompt(req),
				...req.instrumental === true ? { is_instrumental: true } : {},
				...req.lyrics?.trim() ? { lyrics: req.lyrics.trim() } : req.instrumental === true ? {} : { lyrics_optimizer: true },
				output_format: "url",
				audio_setting: { format: "mp3" }
			};
			const { response: res, release } = await postJsonRequest({
				url: `${baseUrl}/v1/music_generation`,
				headers,
				body,
				timeoutMs: req.timeoutMs ?? DEFAULT_TIMEOUT_MS,
				fetchFn,
				pinDns: false,
				allowPrivateNetwork,
				dispatcherPolicy
			});
			try {
				await assertOkOrThrowHttpError(res, "MiniMax music generation failed");
				const payload = await res.json();
				assertMinimaxBaseResp(payload.base_resp, "MiniMax music generation failed");
				const audioUrl = payload.audio_url?.trim() || payload.data?.audio_url?.trim();
				const inlineAudio = payload.audio?.trim() || payload.data?.audio?.trim();
				const lyrics = decodePossibleText(payload.lyrics ?? payload.data?.lyrics ?? "");
				const track = audioUrl ? await downloadTrackFromUrl({
					url: audioUrl,
					timeoutMs: req.timeoutMs,
					fetchFn
				}) : inlineAudio ? {
					buffer: decodePossibleBinary(inlineAudio),
					mimeType: "audio/mpeg",
					fileName: "track-1.mp3"
				} : null;
				if (!track) throw new Error("MiniMax music generation response missing audio output");
				return {
					tracks: [track],
					...lyrics ? { lyrics: [lyrics] } : {},
					model,
					metadata: {
						...payload.task_id?.trim() ? { taskId: payload.task_id.trim() } : {},
						...audioUrl ? { audioUrl } : {},
						instrumental: req.instrumental === true,
						...req.lyrics?.trim() ? { requestedLyrics: true } : {},
						...typeof req.durationSeconds === "number" ? { requestedDurationSeconds: req.durationSeconds } : {}
					}
				};
			} finally {
				await release();
			}
		}
	};
}
//#endregion
export { buildMinimaxMusicGenerationProvider as t };
