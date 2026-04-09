import { a as shouldLogVerbose, r as logVerbose } from "./globals-B43CpcZo.js";
import { t as normalizeChatType } from "./chat-type-D78mkX3H.js";
import { a as normalizeMediaProviderId, i as resolveEffectiveMediaEntryCapabilities, t as buildMediaUnderstandingRegistry } from "./provider-registry-Qp9sisqM.js";
//#region src/media-understanding/defaults.ts
const MB = 1024 * 1024;
const DEFAULT_MAX_CHARS = 500;
const DEFAULT_MAX_CHARS_BY_CAPABILITY = {
	image: 500,
	audio: void 0,
	video: 500
};
const DEFAULT_MAX_BYTES = {
	image: 10 * MB,
	audio: 20 * MB,
	video: 50 * MB
};
const DEFAULT_TIMEOUT_SECONDS = {
	image: 60,
	audio: 60,
	video: 120
};
const DEFAULT_PROMPT = {
	image: "Describe the image.",
	audio: "Transcribe the audio.",
	video: "Describe the video."
};
const DEFAULT_VIDEO_MAX_BASE64_BYTES = 70 * MB;
const CLI_OUTPUT_MAX_BUFFER = 5 * MB;
const DEFAULT_MEDIA_CONCURRENCY = 2;
function providerSupportsCapability(provider, capability) {
	if (!provider) return false;
	if (capability === "audio") return Boolean(provider.transcribeAudio);
	if (capability === "image") return Boolean(provider.describeImage);
	return Boolean(provider.describeVideo);
}
function resolveDefaultRegistry(cfg) {
	return buildMediaUnderstandingRegistry(void 0, cfg ?? {});
}
function resolveDefaultMediaModel(params) {
	return (params.providerRegistry ?? resolveDefaultRegistry(params.cfg)).get(normalizeMediaProviderId(params.providerId))?.defaultModels?.[params.capability]?.trim() || void 0;
}
function resolveAutoMediaKeyProviders(params) {
	return [...(params.providerRegistry ?? resolveDefaultRegistry(params.cfg)).values()].filter((provider) => providerSupportsCapability(provider, params.capability)).map((provider) => {
		const priority = provider.autoPriority?.[params.capability];
		return typeof priority === "number" && Number.isFinite(priority) ? {
			provider,
			priority
		} : null;
	}).filter((entry) => entry !== null).toSorted((left, right) => {
		if (left.priority !== right.priority) return left.priority - right.priority;
		return left.provider.id.localeCompare(right.provider.id);
	}).map((entry) => normalizeMediaProviderId(entry.provider.id)).filter(Boolean);
}
function providerSupportsNativePdfDocument(params) {
	return (params.providerRegistry ?? resolveDefaultRegistry(params.cfg)).get(normalizeMediaProviderId(params.providerId))?.nativeDocumentInputs?.includes("pdf") ?? false;
}
/**
* Minimum audio file size in bytes below which transcription is skipped.
* Files smaller than this threshold are almost certainly empty or corrupt
* and would cause unhelpful API errors from Whisper/transcription providers.
*/
const MIN_AUDIO_FILE_BYTES = 1024;
//#endregion
//#region src/media-understanding/scope.ts
function normalizeDecision(value) {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "allow") return "allow";
	if (normalized === "deny") return "deny";
}
function normalizeMatch(value) {
	return value?.trim().toLowerCase() || void 0;
}
function normalizeMediaUnderstandingChatType(raw) {
	return normalizeChatType(raw ?? void 0);
}
function resolveMediaUnderstandingScope(params) {
	const scope = params.scope;
	if (!scope) return "allow";
	const channel = normalizeMatch(params.channel);
	const chatType = normalizeMediaUnderstandingChatType(params.chatType);
	const sessionKey = normalizeMatch(params.sessionKey) ?? "";
	for (const rule of scope.rules ?? []) {
		if (!rule) continue;
		const action = normalizeDecision(rule.action) ?? "allow";
		const match = rule.match ?? {};
		const matchChannel = normalizeMatch(match.channel);
		const matchChatType = normalizeMediaUnderstandingChatType(match.chatType);
		const matchPrefix = normalizeMatch(match.keyPrefix);
		if (matchChannel && matchChannel !== channel) continue;
		if (matchChatType && matchChatType !== chatType) continue;
		if (matchPrefix && !sessionKey.startsWith(matchPrefix)) continue;
		return action;
	}
	return normalizeDecision(scope.default) ?? "allow";
}
//#endregion
//#region src/media-understanding/resolve.ts
function resolveTimeoutMs(seconds, fallbackSeconds) {
	return Math.max(1e3, Math.floor((typeof seconds === "number" && Number.isFinite(seconds) ? seconds : fallbackSeconds) * 1e3));
}
function resolvePrompt(capability, prompt, maxChars) {
	const base = prompt?.trim() || DEFAULT_PROMPT[capability];
	if (!maxChars || capability === "audio") return base;
	return `${base} Respond in at most ${maxChars} characters.`;
}
function resolveMaxChars(params) {
	const { capability, entry, cfg } = params;
	const configured = entry.maxChars ?? params.config?.maxChars ?? cfg.tools?.media?.[capability]?.maxChars;
	if (typeof configured === "number") return configured;
	return DEFAULT_MAX_CHARS_BY_CAPABILITY[capability];
}
function resolveMaxBytes(params) {
	const configured = params.entry.maxBytes ?? params.config?.maxBytes ?? params.cfg.tools?.media?.[params.capability]?.maxBytes;
	if (typeof configured === "number") return configured;
	return DEFAULT_MAX_BYTES[params.capability];
}
function resolveScopeDecision(params) {
	return resolveMediaUnderstandingScope({
		scope: params.scope,
		sessionKey: params.ctx.SessionKey,
		channel: params.ctx.Surface ?? params.ctx.Provider,
		chatType: normalizeMediaUnderstandingChatType(params.ctx.ChatType)
	});
}
function resolveModelEntries(params) {
	const { cfg, capability, config } = params;
	const sharedModels = cfg.tools?.media?.models ?? [];
	const entries = [...(config?.models ?? []).map((entry) => ({
		entry,
		source: "capability"
	})), ...sharedModels.map((entry) => ({
		entry,
		source: "shared"
	}))];
	if (entries.length === 0) return [];
	return entries.filter(({ entry, source }) => {
		const caps = resolveEffectiveMediaEntryCapabilities({
			entry,
			source,
			providerRegistry: params.providerRegistry
		});
		if (!caps || caps.length === 0) {
			if (source === "shared") {
				if (shouldLogVerbose()) logVerbose(`Skipping shared media model without capabilities: ${entry.provider ?? entry.command ?? "unknown"}`);
				return false;
			}
			return true;
		}
		return caps.includes(capability);
	}).map(({ entry }) => entry);
}
function resolveConcurrency(cfg) {
	const configured = cfg.tools?.media?.concurrency;
	if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) return Math.floor(configured);
	return 2;
}
//#endregion
export { DEFAULT_VIDEO_MAX_BASE64_BYTES as _, resolvePrompt as a, resolveAutoMediaKeyProviders as b, normalizeMediaUnderstandingChatType as c, DEFAULT_MAX_BYTES as d, DEFAULT_MAX_CHARS as f, DEFAULT_TIMEOUT_SECONDS as g, DEFAULT_PROMPT as h, resolveModelEntries as i, resolveMediaUnderstandingScope as l, DEFAULT_MEDIA_CONCURRENCY as m, resolveMaxBytes as n, resolveScopeDecision as o, DEFAULT_MAX_CHARS_BY_CAPABILITY as p, resolveMaxChars as r, resolveTimeoutMs as s, resolveConcurrency as t, CLI_OUTPUT_MAX_BUFFER as u, MIN_AUDIO_FILE_BYTES as v, resolveDefaultMediaModel as x, providerSupportsNativePdfDocument as y };
