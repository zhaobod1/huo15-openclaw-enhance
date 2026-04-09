import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import "./provider-http-BuJ3ne_x.js";
import { c as extractVydraResultUrls, d as resolveVydraErrorMessage, f as resolveVydraResponseJobId, h as waitForVydraJob, n as DEFAULT_VYDRA_BASE_URL, p as resolveVydraResponseStatus, r as DEFAULT_VYDRA_IMAGE_MODEL, s as downloadVydraAsset, u as resolveVydraBaseUrlFromConfig } from "./shared-4wH7oUiC.js";
//#region extensions/vydra/image-generation-provider.ts
function buildVydraImageGenerationProvider() {
	return {
		id: "vydra",
		label: "Vydra",
		defaultModel: DEFAULT_VYDRA_IMAGE_MODEL,
		models: [DEFAULT_VYDRA_IMAGE_MODEL],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "vydra",
			agentDir
		}),
		capabilities: {
			generate: {
				maxCount: 1,
				supportsSize: false,
				supportsAspectRatio: false,
				supportsResolution: false
			},
			edit: {
				enabled: false,
				maxCount: 1,
				maxInputImages: 0,
				supportsSize: false,
				supportsAspectRatio: false,
				supportsResolution: false
			}
		},
		async generateImage(req) {
			if ((req.inputImages?.length ?? 0) > 0) throw new Error("Vydra image generation currently supports text-to-image only in the bundled plugin.");
			if ((req.count ?? 1) > 1) throw new Error("Vydra image generation supports at most one image per request.");
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
				capability: "image",
				transport: "http"
			});
			const model = req.model?.trim() || "grok-imagine";
			const { response, release } = await postJsonRequest({
				url: `${baseUrl}/models/${model}`,
				headers,
				body: {
					prompt: req.prompt,
					model: "text-to-image"
				},
				timeoutMs: req.timeoutMs,
				fetchFn,
				allowPrivateNetwork,
				dispatcherPolicy
			});
			try {
				await assertOkOrThrowHttpError(response, "Vydra image generation failed");
				const submitted = await response.json();
				const completedPayload = resolveVydraResponseStatus(submitted) === "completed" || extractVydraResultUrls(submitted, "image").length > 0 ? submitted : await (() => {
					const jobId = resolveVydraResponseJobId(submitted);
					if (!jobId) throw new Error(resolveVydraErrorMessage(submitted) ?? "Vydra image generation response missing job id");
					return waitForVydraJob({
						baseUrl,
						jobId,
						headers,
						timeoutMs: req.timeoutMs,
						fetchFn,
						kind: "image"
					});
				})();
				const imageUrl = extractVydraResultUrls(completedPayload, "image")[0];
				if (!imageUrl) throw new Error("Vydra image generation completed without an image URL");
				const image = await downloadVydraAsset({
					url: imageUrl,
					kind: "image",
					timeoutMs: req.timeoutMs,
					fetchFn
				});
				return {
					images: [{
						buffer: image.buffer,
						mimeType: image.mimeType,
						fileName: image.fileName
					}],
					model,
					metadata: {
						jobId: resolveVydraResponseJobId(completedPayload) ?? resolveVydraResponseJobId(submitted),
						imageUrl,
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
export { buildVydraImageGenerationProvider as t };
