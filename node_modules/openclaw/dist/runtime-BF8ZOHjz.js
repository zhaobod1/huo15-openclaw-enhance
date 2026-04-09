import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { n as listImageGenerationProviders, r as parseImageGenerationModelRef, t as getImageGenerationProvider } from "./provider-registry-W8uGvdHN.js";
import { i as isFailoverError, r as describeFailoverError } from "./failover-error-Qb-CdGBo.js";
import { n as resolveCapabilityModelCandidates, r as throwCapabilityGenerationFailure, t as buildNoCapabilityModelConfiguredMessage } from "./runtime-shared-DRsysdDu.js";
import { n as listMusicGenerationProviders, r as parseMusicGenerationModelRef, t as getMusicGenerationProvider } from "./provider-registry-a7YT787z.js";
import { a as findTaskByRunId, b as resolveTaskForLookupToken, o as getTaskById, p as listTasksForRelatedSessionKey, z as buildTaskStatusSnapshot } from "./runtime-internal-CIE3v0YN.js";
import { n as listVideoGenerationProviders, r as parseVideoGenerationModelRef, t as getVideoGenerationProvider } from "./provider-registry-d7ZJnhTy.js";
//#region src/image-generation/runtime.ts
const log$2 = createSubsystemLogger("image-generation");
function buildNoImageGenerationModelConfiguredMessage(cfg) {
	return buildNoCapabilityModelConfiguredMessage({
		capabilityLabel: "image-generation",
		modelConfigKey: "imageGenerationModel",
		providers: listImageGenerationProviders(cfg)
	});
}
function listRuntimeImageGenerationProviders(params) {
	return listImageGenerationProviders(params?.config);
}
function resolveProviderImageGenerationOverrides(params) {
	const modeCaps = (params.inputImages?.length ?? 0) > 0 ? params.provider.capabilities.edit : params.provider.capabilities.generate;
	const geometry = params.provider.capabilities.geometry;
	const ignoredOverrides = [];
	let size = params.size;
	let aspectRatio = params.aspectRatio;
	let resolution = params.resolution;
	if (size && (!modeCaps.supportsSize || (geometry?.sizes?.length ?? 0) > 0 && !geometry?.sizes?.includes(size))) {
		ignoredOverrides.push({
			key: "size",
			value: size
		});
		size = void 0;
	}
	if (aspectRatio && (!modeCaps.supportsAspectRatio || (geometry?.aspectRatios?.length ?? 0) > 0 && !geometry?.aspectRatios?.includes(aspectRatio))) {
		ignoredOverrides.push({
			key: "aspectRatio",
			value: aspectRatio
		});
		aspectRatio = void 0;
	}
	if (resolution && (!modeCaps.supportsResolution || (geometry?.resolutions?.length ?? 0) > 0 && !geometry?.resolutions?.includes(resolution))) {
		ignoredOverrides.push({
			key: "resolution",
			value: resolution
		});
		resolution = void 0;
	}
	return {
		size,
		aspectRatio,
		resolution,
		ignoredOverrides
	};
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
			const sanitized = resolveProviderImageGenerationOverrides({
				provider,
				size: params.size,
				aspectRatio: params.aspectRatio,
				resolution: params.resolution,
				inputImages: params.inputImages
			});
			const result = await provider.generateImage({
				provider: candidate.provider,
				model: candidate.model,
				prompt: params.prompt,
				cfg: params.cfg,
				agentDir: params.agentDir,
				authStore: params.authStore,
				count: params.count,
				size: sanitized.size,
				aspectRatio: sanitized.aspectRatio,
				resolution: sanitized.resolution,
				inputImages: params.inputImages
			});
			if (!Array.isArray(result.images) || result.images.length === 0) throw new Error("Image generation provider returned no images.");
			return {
				images: result.images,
				provider: candidate.provider,
				model: result.model ?? candidate.model,
				attempts,
				metadata: result.metadata,
				ignoredOverrides: sanitized.ignoredOverrides
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
			log$2.debug(`image-generation candidate failed: ${candidate.provider}/${candidate.model}`);
		}
	}
	throwCapabilityGenerationFailure({
		capabilityLabel: "image generation",
		attempts,
		lastError
	});
}
//#endregion
//#region src/music-generation/runtime.ts
const log$1 = createSubsystemLogger("music-generation");
function listRuntimeMusicGenerationProviders(params) {
	return listMusicGenerationProviders(params?.config);
}
function resolveProviderMusicGenerationOverrides(params) {
	const caps = params.provider.capabilities;
	const ignoredOverrides = [];
	let lyrics = params.lyrics;
	let instrumental = params.instrumental;
	let durationSeconds = params.durationSeconds;
	let format = params.format;
	if (lyrics?.trim() && !caps.supportsLyrics) {
		ignoredOverrides.push({
			key: "lyrics",
			value: lyrics
		});
		lyrics = void 0;
	}
	if (typeof instrumental === "boolean" && !caps.supportsInstrumental) {
		ignoredOverrides.push({
			key: "instrumental",
			value: instrumental
		});
		instrumental = void 0;
	}
	if (typeof durationSeconds === "number" && !caps.supportsDuration) {
		ignoredOverrides.push({
			key: "durationSeconds",
			value: durationSeconds
		});
		durationSeconds = void 0;
	}
	if (format) {
		const supportedFormats = caps.supportedFormatsByModel?.[params.model] ?? caps.supportedFormats ?? [];
		if (!caps.supportsFormat || supportedFormats.length > 0 && !supportedFormats.includes(format)) {
			ignoredOverrides.push({
				key: "format",
				value: format
			});
			format = void 0;
		}
	}
	return {
		lyrics,
		instrumental,
		durationSeconds,
		format,
		ignoredOverrides
	};
}
async function generateMusic(params) {
	const candidates = resolveCapabilityModelCandidates({
		cfg: params.cfg,
		modelConfig: params.cfg.agents?.defaults?.musicGenerationModel,
		modelOverride: params.modelOverride,
		parseModelRef: parseMusicGenerationModelRef
	});
	if (candidates.length === 0) throw new Error(buildNoCapabilityModelConfiguredMessage({
		capabilityLabel: "music-generation",
		modelConfigKey: "musicGenerationModel",
		providers: listMusicGenerationProviders(params.cfg),
		fallbackSampleRef: "google/lyria-3-clip-preview"
	}));
	const attempts = [];
	let lastError;
	for (const candidate of candidates) {
		const provider = getMusicGenerationProvider(candidate.provider, params.cfg);
		if (!provider) {
			const error = `No music-generation provider registered for ${candidate.provider}`;
			attempts.push({
				provider: candidate.provider,
				model: candidate.model,
				error
			});
			lastError = new Error(error);
			continue;
		}
		try {
			const sanitized = resolveProviderMusicGenerationOverrides({
				provider,
				model: candidate.model,
				lyrics: params.lyrics,
				instrumental: params.instrumental,
				durationSeconds: params.durationSeconds,
				format: params.format
			});
			const result = await provider.generateMusic({
				provider: candidate.provider,
				model: candidate.model,
				prompt: params.prompt,
				cfg: params.cfg,
				agentDir: params.agentDir,
				authStore: params.authStore,
				lyrics: sanitized.lyrics,
				instrumental: sanitized.instrumental,
				durationSeconds: sanitized.durationSeconds,
				format: sanitized.format,
				inputImages: params.inputImages
			});
			if (!Array.isArray(result.tracks) || result.tracks.length === 0) throw new Error("Music generation provider returned no tracks.");
			return {
				tracks: result.tracks,
				provider: candidate.provider,
				model: result.model ?? candidate.model,
				attempts,
				lyrics: result.lyrics,
				metadata: result.metadata,
				ignoredOverrides: sanitized.ignoredOverrides
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
			log$1.debug(`music-generation candidate failed: ${candidate.provider}/${candidate.model}`);
		}
	}
	throwCapabilityGenerationFailure({
		capabilityLabel: "music generation",
		attempts,
		lastError
	});
}
//#endregion
//#region src/tasks/task-owner-access.ts
function normalizeOwnerKey(ownerKey) {
	const trimmed = ownerKey?.trim();
	return trimmed ? trimmed : void 0;
}
function canOwnerAccessTask(task, callerOwnerKey) {
	return task.scopeKind === "session" && normalizeOwnerKey(task.ownerKey) === normalizeOwnerKey(callerOwnerKey);
}
function getTaskByIdForOwner(params) {
	const task = getTaskById(params.taskId);
	return task && canOwnerAccessTask(task, params.callerOwnerKey) ? task : void 0;
}
function findTaskByRunIdForOwner(params) {
	const task = findTaskByRunId(params.runId);
	return task && canOwnerAccessTask(task, params.callerOwnerKey) ? task : void 0;
}
function listTasksForRelatedSessionKeyForOwner(params) {
	return listTasksForRelatedSessionKey(params.relatedSessionKey).filter((task) => canOwnerAccessTask(task, params.callerOwnerKey));
}
function buildTaskStatusSnapshotForRelatedSessionKeyForOwner(params) {
	return buildTaskStatusSnapshot(listTasksForRelatedSessionKeyForOwner({
		relatedSessionKey: params.relatedSessionKey,
		callerOwnerKey: params.callerOwnerKey
	}));
}
function findLatestTaskForRelatedSessionKeyForOwner(params) {
	return listTasksForRelatedSessionKeyForOwner(params)[0];
}
function resolveTaskForLookupTokenForOwner(params) {
	const direct = getTaskByIdForOwner({
		taskId: params.token,
		callerOwnerKey: params.callerOwnerKey
	});
	if (direct) return direct;
	const byRun = findTaskByRunIdForOwner({
		runId: params.token,
		callerOwnerKey: params.callerOwnerKey
	});
	if (byRun) return byRun;
	const related = findLatestTaskForRelatedSessionKeyForOwner({
		relatedSessionKey: params.token,
		callerOwnerKey: params.callerOwnerKey
	});
	if (related) return related;
	const raw = resolveTaskForLookupToken(params.token);
	return raw && canOwnerAccessTask(raw, params.callerOwnerKey) ? raw : void 0;
}
//#endregion
//#region src/video-generation/duration-support.ts
function normalizeSupportedDurationValues(values) {
	if (!Array.isArray(values) || values.length === 0) return;
	const normalized = [...new Set(values)].filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.round(value)).filter((value) => value > 0).toSorted((left, right) => left - right);
	return normalized.length > 0 ? normalized : void 0;
}
function resolveVideoGenerationSupportedDurations(params) {
	const caps = params.provider?.capabilities;
	const model = params.model?.trim();
	return normalizeSupportedDurationValues((model && caps?.supportedDurationSecondsByModel ? caps.supportedDurationSecondsByModel[model] : void 0) ?? caps?.supportedDurationSeconds);
}
function normalizeVideoGenerationDuration(params) {
	if (typeof params.durationSeconds !== "number" || !Number.isFinite(params.durationSeconds)) return;
	const rounded = Math.max(1, Math.round(params.durationSeconds));
	const supported = resolveVideoGenerationSupportedDurations(params);
	if (!supported || supported.length === 0) return rounded;
	return supported.reduce((best, current) => {
		const currentDistance = Math.abs(current - rounded);
		const bestDistance = Math.abs(best - rounded);
		if (currentDistance < bestDistance) return current;
		if (currentDistance === bestDistance && current > best) return current;
		return best;
	});
}
//#endregion
//#region src/video-generation/runtime.ts
const log = createSubsystemLogger("video-generation");
function buildNoVideoGenerationModelConfiguredMessage(cfg) {
	return buildNoCapabilityModelConfiguredMessage({
		capabilityLabel: "video-generation",
		modelConfigKey: "videoGenerationModel",
		providers: listVideoGenerationProviders(cfg)
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
			const requestedDurationSeconds = typeof params.durationSeconds === "number" && Number.isFinite(params.durationSeconds) ? Math.max(1, Math.round(params.durationSeconds)) : void 0;
			const normalizedDurationSeconds = normalizeVideoGenerationDuration({
				provider,
				model: candidate.model,
				durationSeconds: requestedDurationSeconds
			});
			const supportedDurationSeconds = resolveVideoGenerationSupportedDurations({
				provider,
				model: candidate.model
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
				durationSeconds: normalizedDurationSeconds,
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
				metadata: typeof requestedDurationSeconds === "number" && typeof normalizedDurationSeconds === "number" && requestedDurationSeconds !== normalizedDurationSeconds ? {
					...result.metadata,
					requestedDurationSeconds,
					normalizedDurationSeconds,
					...supportedDurationSeconds ? { supportedDurationSeconds } : {}
				} : result.metadata
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
export { findLatestTaskForRelatedSessionKeyForOwner as a, listTasksForRelatedSessionKeyForOwner as c, listRuntimeMusicGenerationProviders as d, generateImage as f, buildTaskStatusSnapshotForRelatedSessionKeyForOwner as i, resolveTaskForLookupTokenForOwner as l, listRuntimeVideoGenerationProviders as n, findTaskByRunIdForOwner as o, listRuntimeImageGenerationProviders as p, resolveVideoGenerationSupportedDurations as r, getTaskByIdForOwner as s, generateVideo as t, generateMusic as u };
