import { r as fetchWithTimeout } from "./fetch-timeout-BoLO0G3U.js";
import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
//#region extensions/alibaba/video-generation-provider.ts
const DEFAULT_ALIBABA_VIDEO_BASE_URL = "https://dashscope-intl.aliyuncs.com";
const DEFAULT_ALIBABA_VIDEO_MODEL = "wan2.6-t2v";
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_TIMEOUT_MS = 12e4;
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 120;
const RESOLUTION_TO_SIZE = {
	"480P": "832*480",
	"720P": "1280*720",
	"1080P": "1920*1080"
};
function resolveAlibabaVideoBaseUrl(req) {
	return req.cfg?.models?.providers?.alibaba?.baseUrl?.trim() || DEFAULT_ALIBABA_VIDEO_BASE_URL;
}
function resolveDashscopeAigcApiBaseUrl(baseUrl) {
	return baseUrl.replace(/\/+$/u, "");
}
function resolveReferenceUrls(inputImages, inputVideos) {
	return [...inputImages ?? [], ...inputVideos ?? []].map((asset) => asset.url?.trim()).filter((value) => Boolean(value));
}
function assertAlibabaReferenceInputsSupported(inputImages, inputVideos) {
	if ([...inputImages ?? [], ...inputVideos ?? []].some((asset) => !asset.url?.trim() && asset.buffer)) throw new Error("Alibaba Wan video generation currently requires remote http(s) URLs for reference images/videos.");
}
function buildAlibabaVideoGenerationInput(req) {
	assertAlibabaReferenceInputsSupported(req.inputImages, req.inputVideos);
	const input = { prompt: req.prompt };
	const referenceUrls = resolveReferenceUrls(req.inputImages, req.inputVideos);
	if (referenceUrls.length === 1 && (req.inputImages?.length ?? 0) === 1 && !req.inputVideos?.length) input.img_url = referenceUrls[0];
	else if (referenceUrls.length > 0) input.reference_urls = referenceUrls;
	return input;
}
function buildAlibabaVideoGenerationParameters(req) {
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
		}, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "Alibaba Wan video-generation task poll failed");
		const payload = await response.json();
		const status = payload.output?.task_status?.trim().toUpperCase();
		if (status === "SUCCEEDED") return payload;
		if (status === "FAILED" || status === "CANCELED") throw new Error(payload.output?.message?.trim() || payload.message?.trim() || `Alibaba Wan video generation task ${params.taskId} ${status?.toLowerCase()}`);
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	throw new Error(`Alibaba Wan video generation task ${params.taskId} did not finish in time`);
}
async function downloadGeneratedVideos(params) {
	const videos = [];
	for (const [index, url] of params.urls.entries()) {
		const response = await fetchWithTimeout(url, { method: "GET" }, params.timeoutMs ?? DEFAULT_TIMEOUT_MS, params.fetchFn);
		await assertOkOrThrowHttpError(response, "Alibaba Wan generated video download failed");
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
function buildAlibabaVideoGenerationProvider() {
	return {
		id: "alibaba",
		label: "Alibaba Model Studio",
		defaultModel: DEFAULT_ALIBABA_VIDEO_MODEL,
		models: [
			"wan2.6-t2v",
			"wan2.6-i2v",
			"wan2.6-r2v",
			"wan2.6-r2v-flash",
			"wan2.7-r2v"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "alibaba",
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
				provider: "alibaba",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Alibaba Model Studio API key missing");
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveAlibabaVideoBaseUrl(req),
				defaultBaseUrl: DEFAULT_ALIBABA_VIDEO_BASE_URL,
				defaultHeaders: {
					Authorization: `Bearer ${auth.apiKey}`,
					"Content-Type": "application/json",
					"X-DashScope-Async": "enable"
				},
				provider: "alibaba",
				capability: "video",
				transport: "http"
			});
			const model = req.model?.trim() || DEFAULT_ALIBABA_VIDEO_MODEL;
			const { response, release } = await postJsonRequest({
				url: `${resolveDashscopeAigcApiBaseUrl(baseUrl)}/api/v1/services/aigc/video-generation/video-synthesis`,
				headers,
				body: {
					model,
					input: buildAlibabaVideoGenerationInput(req),
					parameters: buildAlibabaVideoGenerationParameters({
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
				await assertOkOrThrowHttpError(response, "Alibaba Wan video generation failed");
				const submitted = await response.json();
				const taskId = submitted.output?.task_id?.trim();
				if (!taskId) throw new Error("Alibaba Wan video generation response missing task_id");
				const completed = await pollTaskUntilComplete({
					taskId,
					headers,
					timeoutMs: req.timeoutMs,
					fetchFn,
					baseUrl: resolveDashscopeAigcApiBaseUrl(baseUrl)
				});
				const urls = extractVideoUrls(completed);
				if (urls.length === 0) throw new Error("Alibaba Wan video generation completed without output video URLs");
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
export { buildAlibabaVideoGenerationProvider as t };
