import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
import { a as DEFAULT_VYDRA_VIDEO_MODEL, c as extractVydraResultUrls, d as resolveVydraErrorMessage, f as resolveVydraResponseJobId, h as waitForVydraJob, n as DEFAULT_VYDRA_BASE_URL, p as resolveVydraResponseStatus, s as downloadVydraAsset, u as resolveVydraBaseUrlFromConfig } from "./shared-4wH7oUiC.js";
//#region extensions/vydra/video-generation-provider.ts
const VYDRA_KLING_MODEL = "kling";
function resolveVydraVideoRequestBody(req) {
	const model = req.model?.trim() || "veo3";
	if (model === VYDRA_KLING_MODEL) {
		const imageUrl = (req.inputImages?.[0])?.url?.trim();
		if (!imageUrl) throw new Error("Vydra kling currently requires a remote image URL reference.");
		return {
			model,
			body: {
				prompt: req.prompt,
				image_url: imageUrl
			}
		};
	}
	if ((req.inputImages?.length ?? 0) > 0) throw new Error(`Vydra ${model} does not support image reference inputs in the bundled plugin.`);
	return {
		model,
		body: { prompt: req.prompt }
	};
}
function buildVydraVideoGenerationProvider() {
	return {
		id: "vydra",
		label: "Vydra",
		defaultModel: DEFAULT_VYDRA_VIDEO_MODEL,
		models: [DEFAULT_VYDRA_VIDEO_MODEL, VYDRA_KLING_MODEL],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "vydra",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 0
		},
		async generateVideo(req) {
			if ((req.inputVideos?.length ?? 0) > 0) throw new Error("Vydra video generation does not support video reference inputs.");
			const auth = await resolveApiKeyForProvider({
				provider: "vydra",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Vydra API key missing");
			const fetchFn = fetch;
			const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
				baseUrl: resolveVydraBaseUrlFromConfig(req.cfg),
				defaultBaseUrl: DEFAULT_VYDRA_BASE_URL,
				allowPrivateNetwork: false,
				defaultHeaders: {
					Authorization: `Bearer ${auth.apiKey}`,
					"Content-Type": "application/json"
				},
				provider: "vydra",
				capability: "video",
				transport: "http"
			});
			const { model, body } = resolveVydraVideoRequestBody(req);
			const { response, release } = await postJsonRequest({
				url: `${baseUrl}/models/${model}`,
				headers,
				body,
				timeoutMs: req.timeoutMs,
				fetchFn,
				allowPrivateNetwork,
				dispatcherPolicy
			});
			try {
				await assertOkOrThrowHttpError(response, "Vydra video generation failed");
				const submitted = await response.json();
				const completedPayload = resolveVydraResponseStatus(submitted) === "completed" || extractVydraResultUrls(submitted, "video").length > 0 ? submitted : await (() => {
					const jobId = resolveVydraResponseJobId(submitted);
					if (!jobId) throw new Error(resolveVydraErrorMessage(submitted) ?? "Vydra video generation response missing job id");
					return waitForVydraJob({
						baseUrl,
						jobId,
						headers,
						timeoutMs: req.timeoutMs,
						fetchFn,
						kind: "video"
					});
				})();
				const videoUrl = extractVydraResultUrls(completedPayload, "video")[0];
				if (!videoUrl) throw new Error("Vydra video generation completed without a video URL");
				const video = await downloadVydraAsset({
					url: videoUrl,
					kind: "video",
					timeoutMs: req.timeoutMs,
					fetchFn
				});
				return {
					videos: [{
						buffer: video.buffer,
						mimeType: video.mimeType,
						fileName: video.fileName
					}],
					model,
					metadata: {
						jobId: resolveVydraResponseJobId(completedPayload) ?? resolveVydraResponseJobId(submitted),
						videoUrl,
						status: resolveVydraResponseStatus(completedPayload) ?? "completed"
					}
				};
			} finally {
				await release();
			}
		}
	};
}
//#endregion
export { buildVydraVideoGenerationProvider as t };
