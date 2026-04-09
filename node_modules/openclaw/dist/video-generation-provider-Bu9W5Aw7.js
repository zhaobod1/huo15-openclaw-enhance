import { n as fetchWithSsrFGuard } from "./fetch-guard-Bl48brXk.js";
import { o as resolveProviderHttpRequestConfig, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { l as ssrfPolicyFromDangerouslyAllowPrivateNetwork } from "./ssrf-policy-Cb9w9jMO.js";
import "./ssrf-runtime-DGIvmaoK.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
//#region extensions/fal/video-generation-provider.ts
const DEFAULT_FAL_BASE_URL = "https://fal.run";
const DEFAULT_FAL_QUEUE_BASE_URL = "https://queue.fal.run";
const DEFAULT_FAL_VIDEO_MODEL = "fal-ai/minimax/video-01-live";
const DEFAULT_HTTP_TIMEOUT_MS = 3e4;
const DEFAULT_OPERATION_TIMEOUT_MS = 6e5;
const POLL_INTERVAL_MS = 5e3;
let falFetchGuard = fetchWithSsrFGuard;
function _setFalVideoFetchGuardForTesting(impl) {
	falFetchGuard = impl ?? fetchWithSsrFGuard;
}
function toDataUrl(buffer, mimeType) {
	return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
function buildPolicy(allowPrivateNetwork) {
	return allowPrivateNetwork ? ssrfPolicyFromDangerouslyAllowPrivateNetwork(true) : void 0;
}
function extractFalVideoEntry(payload) {
	if (payload.video?.url?.trim()) return payload.video;
	return payload.videos?.find((entry) => entry.url?.trim());
}
async function downloadFalVideo(url, policy) {
	const { response, release } = await falFetchGuard({
		url,
		timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
		policy,
		auditContext: "fal-video-download"
	});
	try {
		await assertOkOrThrowHttpError(response, "fal generated video download failed");
		const mimeType = response.headers.get("content-type")?.trim() || "video/mp4";
		const arrayBuffer = await response.arrayBuffer();
		return {
			buffer: Buffer.from(arrayBuffer),
			mimeType,
			fileName: `video-1.${mimeType.includes("webm") ? "webm" : "mp4"}`
		};
	} finally {
		await release();
	}
}
function resolveFalQueueBaseUrl(baseUrl) {
	try {
		const url = new URL(baseUrl);
		if (url.hostname === "fal.run") {
			url.hostname = "queue.fal.run";
			return url.toString().replace(/\/$/, "");
		}
		return baseUrl.replace(/\/$/, "");
	} catch {
		return DEFAULT_FAL_QUEUE_BASE_URL;
	}
}
function isFalMiniMaxLiveModel(model) {
	return model.trim().toLowerCase() === DEFAULT_FAL_VIDEO_MODEL;
}
function buildFalVideoRequestBody(params) {
	const requestBody = { prompt: params.req.prompt };
	const input = params.req.inputImages?.[0];
	if (input) requestBody.image_url = input.url?.trim() ? input.url.trim() : input.buffer ? toDataUrl(input.buffer, input.mimeType?.trim() || "image/png") : void 0;
	if (isFalMiniMaxLiveModel(params.model)) return requestBody;
	if (params.req.aspectRatio?.trim()) requestBody.aspect_ratio = params.req.aspectRatio.trim();
	if (params.req.size?.trim()) requestBody.size = params.req.size.trim();
	if (params.req.resolution) requestBody.resolution = params.req.resolution;
	if (typeof params.req.durationSeconds === "number" && Number.isFinite(params.req.durationSeconds)) requestBody.duration = Math.max(1, Math.round(params.req.durationSeconds));
	return requestBody;
}
async function fetchFalJson(params) {
	const { response, release } = await falFetchGuard({
		url: params.url,
		init: params.init,
		timeoutMs: params.timeoutMs,
		policy: params.policy,
		dispatcherPolicy: params.dispatcherPolicy,
		auditContext: params.auditContext
	});
	try {
		await assertOkOrThrowHttpError(response, params.errorContext);
		return await response.json();
	} finally {
		await release();
	}
}
async function waitForFalQueueResult(params) {
	const deadline = Date.now() + params.timeoutMs;
	let lastStatus = "unknown";
	while (Date.now() < deadline) {
		const payload = await fetchFalJson({
			url: params.statusUrl,
			init: {
				method: "GET",
				headers: params.headers
			},
			timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
			policy: params.policy,
			dispatcherPolicy: params.dispatcherPolicy,
			auditContext: "fal-video-status",
			errorContext: "fal video status request failed"
		});
		const status = payload.status?.trim().toUpperCase();
		if (status) lastStatus = status;
		if (status === "COMPLETED") return await fetchFalJson({
			url: params.responseUrl,
			init: {
				method: "GET",
				headers: params.headers
			},
			timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
			policy: params.policy,
			dispatcherPolicy: params.dispatcherPolicy,
			auditContext: "fal-video-result",
			errorContext: "fal video result request failed"
		});
		if (status === "FAILED" || status === "CANCELLED") throw new Error(payload.detail?.trim() || payload.error?.message?.trim() || `fal video generation ${status.toLowerCase()}`);
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	throw new Error(`fal video generation did not finish in time (last status: ${lastStatus})`);
}
function extractFalVideoPayload(payload) {
	if (payload.response && typeof payload.response === "object") return payload.response;
	return payload;
}
function buildFalVideoGenerationProvider() {
	return {
		id: "fal",
		label: "fal",
		defaultModel: DEFAULT_FAL_VIDEO_MODEL,
		models: [
			DEFAULT_FAL_VIDEO_MODEL,
			"fal-ai/kling-video/v2.1/master/text-to-video",
			"fal-ai/wan/v2.2-a14b/text-to-video",
			"fal-ai/wan/v2.2-a14b/image-to-video"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "fal",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 0,
			supportsAspectRatio: true,
			supportsResolution: true,
			supportsSize: true
		},
		async generateVideo(req) {
			if ((req.inputVideos?.length ?? 0) > 0) throw new Error("fal video generation does not support video reference inputs.");
			if ((req.inputImages?.length ?? 0) > 1) throw new Error("fal video generation supports at most one image reference.");
			const auth = await resolveApiKeyForProvider({
				provider: "fal",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("fal API key missing");
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: req.cfg?.models?.providers?.fal?.baseUrl?.trim(),
				defaultBaseUrl: DEFAULT_FAL_BASE_URL,
				allowPrivateNetwork: false,
				defaultHeaders: {
					Authorization: `Key ${auth.apiKey}`,
					"Content-Type": "application/json"
				},
				provider: "fal",
				capability: "video",
				transport: "http"
			});
			const model = req.model?.trim() || DEFAULT_FAL_VIDEO_MODEL;
			const requestBody = buildFalVideoRequestBody({
				req,
				model
			});
			const policy = buildPolicy(allowPrivateNetwork);
			const submitted = await fetchFalJson({
				url: `${resolveFalQueueBaseUrl(baseUrl)}/${model}`,
				init: {
					method: "POST",
					headers,
					body: JSON.stringify(requestBody)
				},
				timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
				policy,
				dispatcherPolicy,
				auditContext: "fal-video-submit",
				errorContext: "fal video generation failed"
			});
			const statusUrl = submitted.status_url?.trim();
			const responseUrl = submitted.response_url?.trim();
			if (!statusUrl || !responseUrl) throw new Error("fal video generation response missing queue URLs");
			const videoPayload = extractFalVideoPayload(await waitForFalQueueResult({
				statusUrl,
				responseUrl,
				headers,
				timeoutMs: req.timeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS,
				policy,
				dispatcherPolicy
			}));
			const url = extractFalVideoEntry(videoPayload)?.url?.trim();
			if (!url) throw new Error("fal video generation response missing output URL");
			return {
				videos: [await downloadFalVideo(url, policy)],
				model,
				metadata: {
					...submitted.request_id?.trim() ? { requestId: submitted.request_id.trim() } : {},
					...videoPayload.prompt ? { prompt: videoPayload.prompt } : {}
				}
			};
		}
	};
}
//#endregion
export { buildFalVideoGenerationProvider as n, _setFalVideoFetchGuardForTesting as t };
