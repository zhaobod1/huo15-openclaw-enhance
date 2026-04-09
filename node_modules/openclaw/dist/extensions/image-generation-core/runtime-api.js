import { t as createSubsystemLogger } from "../../subsystem-CVf5iEWk.js";
import { n as listImageGenerationProviders, r as parseImageGenerationModelRef, t as getImageGenerationProvider } from "../../provider-registry-W8uGvdHN.js";
import { i as isFailoverError, r as describeFailoverError } from "../../failover-error-Qb-CdGBo.js";
import { n as resolveCapabilityModelCandidates, r as throwCapabilityGenerationFailure, t as buildNoCapabilityModelConfiguredMessage } from "../../runtime-shared-DRsysdDu.js";
import "../../media-generation-runtime-shared-CQnp7meK.js";
import "../../api-Cm734jmJ.js";
//#region extensions/image-generation-core/src/runtime.ts
const log = createSubsystemLogger("image-generation");
function buildNoImageGenerationModelConfiguredMessage(cfg) {
	return buildNoCapabilityModelConfiguredMessage({
		capabilityLabel: "image-generation",
		modelConfigKey: "imageGenerationModel",
		providers: listImageGenerationProviders(cfg),
		fallbackSampleRef: "google/gemini-3-pro-image-preview"
	});
}
function listRuntimeImageGenerationProviders(params) {
	return listImageGenerationProviders(params?.config);
}
async function generateImage(params) {
	const candidates = resolveCapabilityModelCandidates({
		cfg: params.cfg,
		modelConfig: params.cfg.agents?.defaults?.imageGenerationModel,
		modelOverride: params.modelOverride,
		parseModelRef: parseImageGenerationModelRef
	});
	if (candidates.length === 0) throw new Error(buildNoImageGenerationModelConfiguredMessage(params.cfg));
	const attempts = [];
	let lastError;
	for (const candidate of candidates) {
		const provider = getImageGenerationProvider(candidate.provider, params.cfg);
		if (!provider) {
			const error = `No image-generation provider registered for ${candidate.provider}`;
			attempts.push({
				provider: candidate.provider,
				model: candidate.model,
				error
			});
			lastError = new Error(error);
			continue;
		}
		try {
			const result = await provider.generateImage({
				provider: candidate.provider,
				model: candidate.model,
				prompt: params.prompt,
				cfg: params.cfg,
				agentDir: params.agentDir,
				authStore: params.authStore,
				count: params.count,
				size: params.size,
				aspectRatio: params.aspectRatio,
				resolution: params.resolution,
				inputImages: params.inputImages
			});
			if (!Array.isArray(result.images) || result.images.length === 0) throw new Error("Image generation provider returned no images.");
			return {
				images: result.images,
				provider: candidate.provider,
				model: result.model ?? candidate.model,
				attempts,
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
			log.debug(`image-generation candidate failed: ${candidate.provider}/${candidate.model}`);
		}
	}
	throwCapabilityGenerationFailure({
		capabilityLabel: "image generation",
		attempts,
		lastError
	});
}
//#endregion
export { generateImage, listRuntimeImageGenerationProviders };
