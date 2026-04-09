import { a as isComfyCapabilityConfigured, s as runComfyWorkflow, t as DEFAULT_COMFY_MODEL } from "./workflow-runtime-CVir5_fU.js";
//#region extensions/comfy/video-generation-provider.ts
function toComfyInputImage(inputImage) {
	if (!inputImage) return;
	if (!inputImage.buffer || !inputImage.mimeType) throw new Error("Comfy video generation requires a local reference image file");
	return {
		buffer: inputImage.buffer,
		mimeType: inputImage.mimeType,
		fileName: inputImage.fileName
	};
}
function buildComfyVideoGenerationProvider() {
	return {
		id: "comfy",
		label: "ComfyUI",
		defaultModel: DEFAULT_COMFY_MODEL,
		models: [DEFAULT_COMFY_MODEL],
		isConfigured: ({ cfg, agentDir }) => isComfyCapabilityConfigured({
			cfg,
			agentDir,
			capability: "video"
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 0,
			supportsSize: false,
			supportsAspectRatio: false,
			supportsResolution: false,
			supportsAudio: false,
			supportsWatermark: false
		},
		async generateVideo(req) {
			if ((req.inputImages?.length ?? 0) > 1) throw new Error("Comfy video generation currently supports at most one reference image");
			if ((req.inputVideos?.length ?? 0) > 0) throw new Error("Comfy video generation does not support input videos");
			const result = await runComfyWorkflow({
				cfg: req.cfg,
				agentDir: req.agentDir,
				authStore: req.authStore,
				prompt: req.prompt,
				model: req.model,
				timeoutMs: req.timeoutMs,
				capability: "video",
				outputKinds: ["gifs", "videos"],
				inputImage: toComfyInputImage(req.inputImages?.[0])
			});
			return {
				videos: result.assets.map((asset) => ({
					buffer: asset.buffer,
					mimeType: asset.mimeType,
					fileName: asset.fileName,
					metadata: {
						nodeId: asset.nodeId,
						promptId: result.promptId
					}
				})),
				model: result.model,
				metadata: {
					promptId: result.promptId,
					outputNodeIds: result.outputNodeIds
				}
			};
		}
	};
}
//#endregion
export { buildComfyVideoGenerationProvider as t };
