import { t as isProviderApiKeyConfigured } from "./provider-auth-BI9t-Krp.js";
import { t as resolveApiKeyForProvider } from "./provider-auth-runtime-BpC8I07I.js";
import { a as normalizeGoogleApiBaseUrl } from "./api-C29T3o68.js";
import { t as GoogleGenAI } from "./node-BcDgN2o4.js";
import path from "node:path";
import os from "node:os";
import { mkdtemp, readFile, rm } from "node:fs/promises";
//#region extensions/google/video-generation-provider.ts
const DEFAULT_GOOGLE_VIDEO_MODEL = "veo-3.1-fast-generate-preview";
const DEFAULT_TIMEOUT_MS = 18e4;
const POLL_INTERVAL_MS = 1e4;
const MAX_POLL_ATTEMPTS = 90;
const GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS = [
	4,
	6,
	8
];
const GOOGLE_VIDEO_MIN_DURATION_SECONDS = GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS[0];
const GOOGLE_VIDEO_MAX_DURATION_SECONDS = GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS[GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS.length - 1];
function resolveConfiguredGoogleVideoBaseUrl(req) {
	const configured = req.cfg?.models?.providers?.google?.baseUrl?.trim();
	return configured ? normalizeGoogleApiBaseUrl(configured) : void 0;
}
function resolveAspectRatio(params) {
	const direct = params.aspectRatio?.trim();
	if (direct === "16:9" || direct === "9:16") return direct;
	const size = params.size?.trim();
	if (!size) return;
	const match = /^(\d+)x(\d+)$/u.exec(size);
	if (!match) return;
	const width = Number.parseInt(match[1] ?? "", 10);
	const height = Number.parseInt(match[2] ?? "", 10);
	if (!Number.isFinite(width) || !Number.isFinite(height)) return;
	return width >= height ? "16:9" : "9:16";
}
function resolveResolution(params) {
	if (params.resolution === "720P") return "720p";
	if (params.resolution === "1080P") return "1080p";
	const size = params.size?.trim();
	if (!size) return;
	const match = /^(\d+)x(\d+)$/u.exec(size);
	if (!match) return;
	const width = Number.parseInt(match[1] ?? "", 10);
	const height = Number.parseInt(match[2] ?? "", 10);
	const maxEdge = Math.max(width, height);
	return maxEdge >= 1920 ? "1080p" : maxEdge >= 1280 ? "720p" : void 0;
}
function resolveDurationSeconds(durationSeconds) {
	if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) return;
	const rounded = Math.min(GOOGLE_VIDEO_MAX_DURATION_SECONDS, Math.max(GOOGLE_VIDEO_MIN_DURATION_SECONDS, Math.round(durationSeconds)));
	return GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS.reduce((best, current) => {
		const currentDistance = Math.abs(current - rounded);
		const bestDistance = Math.abs(best - rounded);
		if (currentDistance < bestDistance) return current;
		if (currentDistance === bestDistance && current > best) return current;
		return best;
	});
}
function resolveInputImage(req) {
	const input = req.inputImages?.[0];
	if (!input?.buffer) return;
	return {
		imageBytes: input.buffer.toString("base64"),
		mimeType: input.mimeType?.trim() || "image/png"
	};
}
function resolveInputVideo(req) {
	const input = req.inputVideos?.[0];
	if (!input?.buffer) return;
	return {
		videoBytes: input.buffer.toString("base64"),
		mimeType: input.mimeType?.trim() || "video/mp4"
	};
}
async function downloadGeneratedVideo(params) {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "openclaw-google-video-"));
	const downloadPath = path.join(tempDir, `video-${params.index + 1}.mp4`);
	try {
		await params.client.files.download({
			file: params.file,
			downloadPath
		});
		return {
			buffer: await readFile(downloadPath),
			mimeType: "video/mp4",
			fileName: `video-${params.index + 1}.mp4`
		};
	} finally {
		await rm(tempDir, {
			recursive: true,
			force: true
		});
	}
}
function buildGoogleVideoGenerationProvider() {
	return {
		id: "google",
		label: "Google",
		defaultModel: DEFAULT_GOOGLE_VIDEO_MODEL,
		models: [
			DEFAULT_GOOGLE_VIDEO_MODEL,
			"veo-3.1-generate-preview",
			"veo-3.1-lite-generate-preview",
			"veo-3.0-fast-generate-001",
			"veo-3.0-generate-001",
			"veo-2.0-generate-001"
		],
		isConfigured: ({ agentDir }) => isProviderApiKeyConfigured({
			provider: "google",
			agentDir
		}),
		capabilities: {
			maxVideos: 1,
			maxInputImages: 1,
			maxInputVideos: 1,
			maxDurationSeconds: GOOGLE_VIDEO_MAX_DURATION_SECONDS,
			supportedDurationSeconds: GOOGLE_VIDEO_ALLOWED_DURATION_SECONDS,
			supportsAspectRatio: true,
			supportsResolution: true,
			supportsSize: true,
			supportsAudio: true
		},
		async generateVideo(req) {
			if ((req.inputImages?.length ?? 0) > 1) throw new Error("Google video generation supports at most one input image.");
			if ((req.inputVideos?.length ?? 0) > 1) throw new Error("Google video generation supports at most one input video.");
			if ((req.inputImages?.length ?? 0) > 0 && (req.inputVideos?.length ?? 0) > 0) throw new Error("Google video generation does not support image and video inputs together.");
			const auth = await resolveApiKeyForProvider({
				provider: "google",
				cfg: req.cfg,
				agentDir: req.agentDir,
				store: req.authStore
			});
			if (!auth.apiKey) throw new Error("Google API key missing");
			const configuredBaseUrl = resolveConfiguredGoogleVideoBaseUrl(req);
			const durationSeconds = resolveDurationSeconds(req.durationSeconds);
			const client = new GoogleGenAI({
				apiKey: auth.apiKey,
				httpOptions: {
					...configuredBaseUrl ? { baseUrl: configuredBaseUrl } : {},
					timeout: req.timeoutMs ?? DEFAULT_TIMEOUT_MS
				}
			});
			let operation = await client.models.generateVideos({
				model: req.model?.trim() || DEFAULT_GOOGLE_VIDEO_MODEL,
				prompt: req.prompt,
				image: resolveInputImage(req),
				video: resolveInputVideo(req),
				config: {
					numberOfVideos: 1,
					...typeof durationSeconds === "number" ? { durationSeconds } : {},
					...resolveAspectRatio({
						aspectRatio: req.aspectRatio,
						size: req.size
					}) ? { aspectRatio: resolveAspectRatio({
						aspectRatio: req.aspectRatio,
						size: req.size
					}) } : {},
					...resolveResolution({
						resolution: req.resolution,
						size: req.size
					}) ? { resolution: resolveResolution({
						resolution: req.resolution,
						size: req.size
					}) } : {},
					...req.audio === true ? { generateAudio: true } : {}
				}
			});
			for (let attempt = 0; !(operation.done ?? false); attempt += 1) {
				if (attempt >= MAX_POLL_ATTEMPTS) throw new Error("Google video generation did not finish in time");
				await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				operation = await client.operations.getVideosOperation({ operation });
			}
			if (operation.error) throw new Error(JSON.stringify(operation.error));
			const generatedVideos = operation.response?.generatedVideos ?? [];
			if (generatedVideos.length === 0) throw new Error("Google video generation response missing generated videos");
			return {
				videos: await Promise.all(generatedVideos.map(async (entry, index) => {
					const inline = entry.video;
					if (inline?.videoBytes) return {
						buffer: Buffer.from(inline.videoBytes, "base64"),
						mimeType: inline.mimeType?.trim() || "video/mp4",
						fileName: `video-${index + 1}.mp4`
					};
					if (!inline) throw new Error("Google generated video missing file handle");
					return await downloadGeneratedVideo({
						client,
						file: inline,
						index
					});
				})),
				model: req.model?.trim() || DEFAULT_GOOGLE_VIDEO_MODEL,
				metadata: operation.name ? { operationName: operation.name } : void 0
			};
		}
	};
}
//#endregion
export { buildGoogleVideoGenerationProvider as t };
