import { r as fetchWithTimeout } from "./fetch-timeout-BoLO0G3U.js";
import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
import { t as TOGETHER_BASE_URL } from "./models-HCTb6R3I.js";
//#region extensions/together/video-generation-provider.ts
const DEFAULT_TOGETHER_VIDEO_MODEL = "Wan-AI/Wan2.2-T2V-A14B";
const DEFAULT_TIMEOUT_MS = 12e4;
const POLL_INTERVAL_MS = 5e3;
const MAX_POLL_ATTEMPTS = 120;
function resolveTogetherVideoBaseUrl(req) {
	return req.cfg?.models?.providers?.together?.baseUrl?.trim() || "https://api.together.xyz/v1";
}
function toDataUrl(buffer, mimeType) {
	return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
function extractTogetherVideoUrl(payload) {
	if (Array.isArray(payload.outputs)) {
		for (const entry of payload.outputs) {
			const url = entry.video_url?.trim() || entry.url?.trim();
			if (url) return url;
		}
		return;
	}
	return payload.outputs?.video_url?.trim() || payload.outputs?.url?.trim();
}
async function pollTogetherVideo(params) {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
		const response = await fetchWithTimeout(`${params.baseUrl}/videos/${params.videoId}`, {
			method: "GET",
			headers: params.headers
		}, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "Together video status request failed");
		const payload = await response.json();
		if (payload.status === "completed") return payload;
		if (payload.status === "failed") throw new Error(payload.error?.message?.trim() || "Together video generation failed");
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	throw new Error(`Together video generation task ${params.videoId} did not finish in time`);
}
async function downloadTogetherVideo(params) {
	const response = await fetchWithTimeout(params.url, { method: "GET" }, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
	await assertOkOrThrowHttpError(response, "Together generated video download failed");
	const mimeType = response.headers.get("content-type")?.trim() || "video/mp4";
	const arrayBuffer = await response.arrayBuffer();
	return {
		buffer: Buffer.from(arrayBuffer),
		mimeType,
		fileName: `video-1.${mimeType.includes("webm") ? "webm" : "mp4"}`
	};
}
function buildTogetherVideoGenerationProvider() {
	return {
		id: "together",
		label: "Together",
		defaultModel: DEFAULT_TOGETHER_VIDEO_MODEL,
		models: [
			DEFAULT_TOGETHER_VIDEO_MODEL,
			"Wan-AI/Wan2.2-I2V-A14B",
			"minimax/Hailuo-02",
			"Kwai/Kling-2.1-Master"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "together",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 0,
			maxDurationSeconds: 12,
			supportsSize: true
		},
		async generateVideo(req) {
			if ((req.inputVideos?.length ?? 0) > 0) throw new Error("Together video generation does not support video reference inputs.");
			const auth = await resolveApiKeyForProvider({
				provider: "together",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Together API key missing");
			const fetchFn = fetch;
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveTogetherVideoBaseUrl(req),
				defaultBaseUrl: TOGETHER_BASE_URL,
				allowPrivateNetwork: false,
				defaultHeaders: {
					Authorization: `Bearer ${auth.apiKey}`,
					"Content-Type": "application/json"
				},
				provider: "together",
				capability: "video",
				transport: "http"
			});
			const body = {
				model: req.model?.trim() || DEFAULT_TOGETHER_VIDEO_MODEL,
				prompt: req.prompt
			};
			if (typeof req.durationSeconds === "number" && Number.isFinite(req.durationSeconds)) body.seconds = String(Math.max(1, Math.round(req.durationSeconds)));
			if (req.size?.trim()) {
				const match = /^(\d+)x(\d+)$/u.exec(req.size.trim());
				if (match) {
					body.width = Number.parseInt(match[1] ?? "", 10);
					body.height = Number.parseInt(match[2] ?? "", 10);
				}
			}
			if (req.inputImages?.[0]) {
				const input = req.inputImages[0];
				const value = input.url?.trim() ? input.url.trim() : input.buffer ? toDataUrl(input.buffer, input.mimeType?.trim() || "image/png") : void 0;
				if (!value) throw new Error("Together reference image is missing image data.");
				body.reference_images = [value];
			}
			const { response, release } = await postJsonRequest({
				url: `${baseUrl}/videos`,
				headers,
				body,
				timeoutMs: req.timeoutMs,
				fetchFn,
				allowPrivateNetwork,
				dispatcherPolicy
			});
			try {
				await assertOkOrThrowHttpError(response, "Together video generation failed");
				const videoId = (await response.json()).id?.trim();
				if (!videoId) throw new Error("Together video generation response missing id");
				const completed = await pollTogetherVideo({
					videoId,
					headers,
					timeoutMs: req.timeoutMs,
					baseUrl,
					fetchFn
				});
				const videoUrl = extractTogetherVideoUrl(completed);
				if (!videoUrl) throw new Error("Together video generation completed without an output URL");
				return {
					videos: [await downloadTogetherVideo({
						url: videoUrl,
						timeoutMs: req.timeoutMs,
						fetchFn
					})],
					model: completed.model ?? req.model ?? DEFAULT_TOGETHER_VIDEO_MODEL,
					metadata: {
						videoId,
						status: completed.status,
						videoUrl
					}
				};
			} finally {
				await release();
			}
		}
	};
}
//#endregion
export { buildTogetherVideoGenerationProvider as t };
