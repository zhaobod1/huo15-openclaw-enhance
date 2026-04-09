import { r as fetchWithTimeout } from "./fetch-timeout-BoLO0G3U.js";
import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
import "./models-eJXVucds.js";
//#region extensions/qwen/video-generation-provider.ts
const DEFAULT_QWEN_VIDEO_BASE_URL = "https://dashscope-intl.aliyuncs.com";
const DEFAULT_QWEN_VIDEO_MODEL = "wan2.6-t2v";
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 12e4;
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;
const RESOLUTION_TO_SIZE = {
	"480P": "832*480",
	"720P": "1280*720",
	"1080P": "1920*1080"
};
function resolveQwenVideoBaseUrl(req) {
	const direct = req.cfg?.models?.providers?.qwen?.baseUrl?.trim();
	if (!direct) return DEFAULT_QWEN_VIDEO_BASE_URL;
	try {
		return new URL(direct).toString();
	} catch {
		return DEFAULT_QWEN_VIDEO_BASE_URL;
	}
}
function resolveDashscopeAigcApiBaseUrl(baseUrl) {
	try {
		const url = new URL(baseUrl);
		if (url.hostname === "coding-intl.dashscope.aliyuncs.com" || url.hostname === "coding.dashscope.aliyuncs.com" || url.hostname === "dashscope-intl.aliyuncs.com" || url.hostname === "dashscope.aliyuncs.com") return url.origin;
	} catch {}
	if (baseUrl.startsWith("https://dashscope.aliyuncs.com/compatible-mode/v1")) return "https://dashscope.aliyuncs.com";
	if (baseUrl.startsWith("https://dashscope-intl.aliyuncs.com/compatible-mode/v1")) return DEFAULT_QWEN_VIDEO_BASE_URL;
	return baseUrl.replace(/\/+$/u, "");
}
function resolveReferenceUrls(inputImages, inputVideos) {
	return [...inputImages ?? [], ...inputVideos ?? []].map((asset) => asset.url?.trim()).filter((value) => Boolean(value));
}
function assertQwenReferenceInputsSupported(inputImages, inputVideos) {
	if ([...inputImages ?? [], ...inputVideos ?? []].some((asset) => !asset.url?.trim() && asset.buffer)) throw new Error("Qwen video generation currently requires remote http(s) URLs for reference images/videos.");
}
function buildQwenVideoGenerationInput(req) {
	assertQwenReferenceInputsSupported(req.inputImages, req.inputVideos);
	const input = { prompt: req.prompt };
	const referenceUrls = resolveReferenceUrls(req.inputImages, req.inputVideos);
	if (referenceUrls.length === 1 && (req.inputImages?.length ?? 0) === 1 && !req.inputVideos?.length) input.img_url = referenceUrls[0];
	else if (referenceUrls.length > 0) input.reference_urls = referenceUrls;
	return input;
}
function buildQwenVideoGenerationParameters(req) {
	const parameters = {};
	const size = req.size?.trim() || (req.resolution ? RESOLUTION_TO_SIZE[req.resolution] : void 0);
	if (size) parameters.size = size;
	if (req.aspectRatio?.trim()) parameters.aspect_ratio = req.aspectRatio.trim();
	if (typeof req.durationSeconds === "number" && Number.isFinite(req.durationSeconds)) parameters.duration = Math.max(1, Math.round(req.durationSeconds));
	if (typeof req.audio === "boolean") parameters.enable_audio = req.audio;
	if (typeof req.watermark === "boolean") parameters.watermark = req.watermark;
	return Object.keys(parameters).length > 0 ? parameters : void 0;
}
function extractVideoUrls(payload) {
	const urls = [...payload.output?.results?.map((entry) => entry.video_url).filter(Boolean) ?? [], payload.output?.video_url].filter((value) => typeof value === "string" && value.trim().length > 0);
	return [...new Set(urls)];
}
async function pollTaskUntilComplete(params) {
	for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
		const response = await fetchWithTimeout(`${params.baseUrl}/api/v1/tasks/${params.taskId}`, {
			method: "GET",
			headers: params.headers
		}, params.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "Qwen video-generation task poll failed");
		const payload = await response.json();
		const status = payload.output?.task_status?.trim().toUpperCase();
		if (status === "SUCCEEDED") return payload;
		if (status === "FAILED" || status === "CANCELED") throw new Error(payload.output?.message?.trim() || payload.message?.trim() || `Qwen video generation task ${params.taskId} ${status.toLowerCase()}`);
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	throw new Error(`Qwen video generation task ${params.taskId} did not finish in time`);
}
async function downloadGeneratedVideos(params) {
	const videos = [];
	for (const [index, url] of params.urls.entries()) {
		const response = await fetchWithTimeout(url, { method: "GET" }, params.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "Qwen generated video download failed");
		const arrayBuffer = await response.arrayBuffer();
		videos.push({
			buffer: Buffer.from(arrayBuffer),
			mimeType: response.headers.get("content-type")?.trim() || "video/mp4",
			fileName: `video-${index + 1}.mp4`,
			metadata: { sourceUrl: url }
		});
	}
	return videos;
}
function buildQwenVideoGenerationProvider() {
	return {
		id: "qwen",
		label: "Qwen Cloud",
		defaultModel: DEFAULT_QWEN_VIDEO_MODEL,
		models: [
			"wan2.6-t2v",
			"wan2.6-i2v",
			"wan2.6-r2v",
			"wan2.6-r2v-flash",
			"wan2.7-r2v"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "qwen",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 4,
			maxDurationSeconds: 10,
			supportsSize: true,
			supportsAspectRatio: true,
			supportsResolution: true,
			supportsAudio: true,
			supportsWatermark: true
		},
		async generateVideo(req) {
			const fetchFn = fetch;
			const auth = await resolveApiKeyForProvider({
				provider: "qwen",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Qwen API key missing");
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveQwenVideoBaseUrl(req),
				defaultBaseUrl: DEFAULT_QWEN_VIDEO_BASE_URL,
				defaultHeaders: {
					Authorization: `Bearer ${auth.apiKey}`,
					"Content-Type": "application/json",
					"X-DashScope-Async": "enable"
				},
				provider: "qwen",
				capability: "video",
				transport: "http"
			});
			const model = req.model?.trim() || DEFAULT_QWEN_VIDEO_MODEL;
			const { response, release } = await postJsonRequest({
				url: `${resolveDashscopeAigcApiBaseUrl(baseUrl)}/api/v1/services/aigc/video-generation/video-synthesis`,
				headers,
				body: {
					model,
					input: buildQwenVideoGenerationInput(req),
					parameters: buildQwenVideoGenerationParameters({
						...req,
						durationSeconds: req.durationSeconds ?? DEFAULT_DURATION_SECONDS
					})
				},
				timeoutMs: req.timeoutMs,
				fetchFn,
				allowPrivateNetwork,
				dispatcherPolicy
			});
			try {
				await assertOkOrThrowHttpError(response, "Qwen video generation failed");
				const submitted = await response.json();
				const taskId = submitted.output?.task_id?.trim();
				if (!taskId) throw new Error("Qwen video generation response missing task_id");
				const completed = await pollTaskUntilComplete({
					taskId,
					headers,
					timeoutMs: req.timeoutMs,
					fetchFn,
					baseUrl: resolveDashscopeAigcApiBaseUrl(baseUrl)
				});
				const urls = extractVideoUrls(completed);
				if (urls.length === 0) throw new Error("Qwen video generation completed without output video URLs");
				return {
					videos: await downloadGeneratedVideos({
						urls,
						timeoutMs: req.timeoutMs,
						fetchFn
					}),
					model,
					metadata: {
						requestId: submitted.request_id,
						taskId,
						taskStatus: completed.output?.task_status
					}
				};
			} finally {
				await release();
			}
		}
	};
}
//#endregion
export { buildQwenVideoGenerationProvider as t };
