import { r as fetchWithTimeout } from "./fetch-timeout-BoLO0G3U.js";
import { i as postTranscriptionRequest, o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
//#region extensions/openai/video-generation-provider.ts
const DEFAULT_OPENAI_VIDEO_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_VIDEO_MODEL = "sora-2";
const DEFAULT_TIMEOUT_MS = 12e4;
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;
const OPENAI_VIDEO_SECONDS = [
	4,
	8,
	12
];
const OPENAI_VIDEO_SIZES = [
	"720x1280",
	"1280x720",
	"1024x1792",
	"1792x1024"
];
function resolveOpenAIVideoBaseUrl(req) {
	return req.cfg?.models?.providers?.openai?.baseUrl?.trim() || DEFAULT_OPENAI_VIDEO_BASE_URL;
}
function toBlobBytes(buffer) {
	const arrayBuffer = new ArrayBuffer(buffer.byteLength);
	new Uint8Array(arrayBuffer).set(buffer);
	return arrayBuffer;
}
function resolveDurationSeconds(durationSeconds) {
	if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) return;
	const rounded = Math.max(OPENAI_VIDEO_SECONDS[0], Math.round(durationSeconds));
	const nearest = OPENAI_VIDEO_SECONDS.reduce((best, current) => Math.abs(current - rounded) < Math.abs(best - rounded) ? current : best);
	return String(nearest);
}
function resolveSize(params) {
	const explicitSize = params.size?.trim();
	if (explicitSize && OPENAI_VIDEO_SIZES.includes(explicitSize)) return explicitSize;
	switch (params.aspectRatio?.trim()) {
		case "9:16": return "720x1280";
		case "16:9": return "1280x720";
		case "4:7": return "1024x1792";
		case "7:4": return "1792x1024";
		default: break;
	}
	if (params.resolution === "1080P") return "1792x1024";
}
function resolveReferenceAsset(req) {
	const allAssets = [...req.inputImages ?? [], ...req.inputVideos ?? []];
	if (allAssets.length === 0) return null;
	if (allAssets.length > 1) throw new Error("OpenAI video generation supports at most one reference image or video.");
	const [asset] = allAssets;
	if (!asset?.buffer) throw new Error("OpenAI video generation currently requires local image/video uploads for reference assets.");
	const mimeType = asset.mimeType?.trim() || ((req.inputVideos?.length ?? 0) > 0 ? "video/mp4" : "image/png");
	const extension = mimeType.includes("video") ? "mp4" : mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
	const fileName = asset.fileName?.trim() || `${(req.inputVideos?.length ?? 0) > 0 ? "reference-video" : "reference-image"}.${extension}`;
	return new File([toBlobBytes(asset.buffer)], fileName, { type: mimeType });
}
async function pollOpenAIVideo(params) {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
		const response = await fetchWithTimeout(`${params.baseUrl}/videos/${params.videoId}`, {
			method: "GET",
			headers: params.headers
		}, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "OpenAI video status request failed");
		const payload = await response.json();
		if (payload.status === "completed") return payload;
		if (payload.status === "failed") throw new Error(payload.error?.message?.trim() || "OpenAI video generation failed");
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	throw new Error(`OpenAI video generation task ${params.videoId} did not finish in time`);
}
async function downloadOpenAIVideo(params) {
	const url = new URL(`${params.baseUrl}/videos/${params.videoId}/content`);
	url.searchParams.set("variant", "video");
	const response = await fetchWithTimeout(url.toString(), {
		method: "GET",
		headers: new Headers({
			...Object.fromEntries(params.headers.entries()),
			Accept: "application/binary"
		})
	}, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
	await assertOkOrThrowHttpError(response, "OpenAI video download failed");
	const mimeType = response.headers.get("content-type")?.trim() || "video/mp4";
	const arrayBuffer = await response.arrayBuffer();
	return {
		buffer: Buffer.from(arrayBuffer),
		mimeType,
		fileName: `video-1.${mimeType.includes("webm") ? "webm" : "mp4"}`
	};
}
function buildOpenAIVideoGenerationProvider() {
	return {
		id: "openai",
		label: "OpenAI",
		defaultModel: DEFAULT_OPENAI_VIDEO_MODEL,
		models: [DEFAULT_OPENAI_VIDEO_MODEL, "sora-2-pro"],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "openai",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 1,
			maxDurationSeconds: 12,
			supportedDurationSeconds: OPENAI_VIDEO_SECONDS,
			supportsSize: true
		},
		async generateVideo(req) {
			const auth = await resolveApiKeyForProvider({
				provider: "openai",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("OpenAI API key missing");
			const fetchFn = fetch;
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveOpenAIVideoBaseUrl(req),
				defaultBaseUrl: DEFAULT_OPENAI_VIDEO_BASE_URL,
				allowPrivateNetwork: false,
				defaultHeaders: { Authorization: `Bearer ${auth.apiKey}` },
				provider: "openai",
				capability: "video",
				transport: "http"
			});
			const model = req.model?.trim() || DEFAULT_OPENAI_VIDEO_MODEL;
			const seconds = resolveDurationSeconds(req.durationSeconds);
			const size = resolveSize({
				size: req.size,
				aspectRatio: req.aspectRatio,
				resolution: req.resolution
			});
			const referenceAsset = resolveReferenceAsset(req);
			const { response, release } = referenceAsset ? await (() => {
				const form = new FormData();
				form.set("prompt", req.prompt);
				form.set("model", model);
				if (seconds) form.set("seconds", seconds);
				if (size) form.set("size", size);
				form.set("input_reference", referenceAsset);
				const multipartHeaders = new Headers(headers);
				multipartHeaders.delete("Content-Type");
				return postTranscriptionRequest({
					url: `${baseUrl}/videos`,
					headers: multipartHeaders,
					body: form,
					timeoutMs: req.timeoutMs,
					fetchFn,
					allowPrivateNetwork,
					dispatcherPolicy
				});
			})() : await (() => {
				const jsonHeaders = new Headers(headers);
				jsonHeaders.set("Content-Type", "application/json");
				return postJsonRequest({
					url: `${baseUrl}/videos`,
					headers: jsonHeaders,
					body: {
						prompt: req.prompt,
						model,
						...seconds ? { seconds } : {},
						...size ? { size } : {}
					},
					timeoutMs: req.timeoutMs,
					fetchFn,
					allowPrivateNetwork,
					dispatcherPolicy
				});
			})();
			try {
				await assertOkOrThrowHttpError(response, "OpenAI video generation failed");
				const submitted = await response.json();
				const videoId = submitted.id?.trim();
				if (!videoId) throw new Error("OpenAI video generation response missing video id");
				const completed = await pollOpenAIVideo({
					videoId,
					headers,
					timeoutMs: req.timeoutMs,
					baseUrl,
					fetchFn
				});
				return {
					videos: [await downloadOpenAIVideo({
						videoId,
						headers,
						timeoutMs: req.timeoutMs,
						baseUrl,
						fetchFn
					})],
					model: completed.model ?? submitted.model ?? model,
					metadata: {
						videoId,
						status: completed.status,
						seconds: completed.seconds ?? submitted.seconds,
						size: completed.size ?? submitted.size
					}
				};
			} finally {
				await release();
			}
		}
	};
}
//#endregion
export { buildOpenAIVideoGenerationProvider as t };
