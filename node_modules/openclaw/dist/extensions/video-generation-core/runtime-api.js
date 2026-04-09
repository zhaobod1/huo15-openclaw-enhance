import { t as createSubsystemLogger } from "../../subsystem-CVf5iEWk.js";
import { i as isFailoverError, r as describeFailoverError } from "../../failover-error-Qb-CdGBo.js";
import { n as resolveCapabilityModelCandidates, r as throwCapabilityGenerationFailure, t as buildNoCapabilityModelConfiguredMessage } from "../../runtime-shared-DRsysdDu.js";
import { n as listVideoGenerationProviders, r as parseVideoGenerationModelRef, t as getVideoGenerationProvider } from "../../provider-registry-d7ZJnhTy.js";
import "../../media-generation-runtime-shared-CQnp7meK.js";
import "../../api-BTyMLgn6.js";
//#region extensions/video-generation-core/src/runtime.ts
const log = createSubsystemLogger("video-generation");
function buildNoVideoGenerationModelConfiguredMessage(cfg) {
	return buildNoCapabilityModelConfiguredMessage({
		capabilityLabel: "video-generation",
		modelConfigKey: "videoGenerationModel",
		providers: listVideoGenerationProviders(cfg),
		fallbackSampleRef: "qwen/wan2.6-t2v"
	});
}
function listRuntimeVideoGenerationProviders(params) {
	return listVideoGenerationProviders(params?.config);
}
function resolveProviderVideoGenerationOverrides(params) {
	const caps = params.provider.capabilities;
	const ignoredOverrides = [];
	let size = params.size;
	let aspectRatio = params.aspectRatio;
	let resolution = params.resolution;
	let audio = params.audio;
	let watermark = params.watermark;
	if (size && !caps.supportsSize) {
		ignoredOverrides.push({
			key: "size",
			value: size
		});
		size = void 0;
	}
	if (aspectRatio && !caps.supportsAspectRatio) {
		ignoredOverrides.push({
			key: "aspectRatio",
			value: aspectRatio
		});
		aspectRatio = void 0;
	}
	if (resolution && !caps.supportsResolution) {
		ignoredOverrides.push({
			key: "resolution",
			value: resolution
		});
		resolution = void 0;
	}
	if (typeof audio === "boolean" && !caps.supportsAudio) {
		ignoredOverrides.push({
			key: "audio",
			value: audio
		});
		audio = void 0;
	}
	if (typeof watermark === "boolean" && !caps.supportsWatermark) {
		ignoredOverrides.push({
			key: "watermark",
			value: watermark
		});
		watermark = void 0;
	}
	return {
		size,
		aspectRatio,
		resolution,
		audio,
		watermark,
		ignoredOverrides
	};
}
async function generateVideo(params) {
	const candidates = resolveCapabilityModelCandidates({
		cfg: params.cfg,
		modelConfig: params.cfg.agents?.defaults?.videoGenerationModel,
		modelOverride: params.modelOverride,
		parseModelRef: parseVideoGenerationModelRef
	});
	if (candidates.length === 0) throw new Error(buildNoVideoGenerationModelConfiguredMessage(params.cfg));
	const attempts = [];
	let lastError;
	for (const candidate of candidates) {
		const provider = getVideoGenerationProvider(candidate.provider, params.cfg);
		if (!provider) {
			const error = `No video-generation provider registered for ${candidate.provider}`;
			attempts.push({
				provider: candidate.provider,
				model: candidate.model,
				error
			});
			lastError = new Error(error);
			continue;
		}
		try {
			const sanitized = resolveProviderVideoGenerationOverrides({
				provider,
				size: params.size,
				aspectRatio: params.aspectRatio,
				resolution: params.resolution,
				audio: params.audio,
				watermark: params.watermark
			});
			const result = await provider.generateVideo({
				provider: candidate.provider,
				model: candidate.model,
				prompt: params.prompt,
				cfg: params.cfg,
				agentDir: params.agentDir,
				authStore: params.authStore,
				size: sanitized.size,
				aspectRatio: sanitized.aspectRatio,
				resolution: sanitized.resolution,
				durationSeconds: params.durationSeconds,
				audio: sanitized.audio,
				watermark: sanitized.watermark,
				inputImages: params.inputImages,
				inputVideos: params.inputVideos
			});
			if (!Array.isArray(result.videos) || result.videos.length === 0) throw new Error("Video generation provider returned no videos.");
			return {
				videos: result.videos,
				provider: candidate.provider,
				model: result.model ?? candidate.model,
				attempts,
				ignoredOverrides: sanitized.ignoredOverrides,
				metadata: result.metadata
			};
		} catch (err) {
			lastError = err;
			const described = isFailoverError(err) ? describeFailoverError(err) : void 0;
			attempts.push({
				provider: candidate.provider,
				model: candidate.model,
				error: described?.message ?? (err instanceof Error ? err.message : String(err)),
				reason: described?.reason,
				status: described?.status,
				code: described?.code
			});
			log.debug(`video-generation candidate failed: ${candidate.provider}/${candidate.model}`);
		}
	}
	throwCapabilityGenerationFailure({
		capabilityLabel: "video generation",
		attempts,
		lastError
	});
}
//#endregion
export { generateVideo, listRuntimeVideoGenerationProviders };
