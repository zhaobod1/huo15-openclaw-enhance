import { n as getActivePluginChannelRegistryVersion } from "./runtime-Dji2WXDE.js";
import { v as normalizeOptionalAccountId } from "./session-key-BR3Z-ljs.js";
import { r as normalizeChannelId, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { i as isMessagingToolDuplicate } from "./pi-embedded-helpers-T2IjifdJ.js";
//#region src/infra/outbound/target-normalization.ts
function normalizeChannelTargetInput(raw) {
	return raw.trim();
}
const targetNormalizerCacheByChannelId = /* @__PURE__ */ new Map();
function resolveTargetNormalizer(channelId) {
	const version = getActivePluginChannelRegistryVersion();
	const cached = targetNormalizerCacheByChannelId.get(channelId);
	if (cached?.version === version) return cached.normalizer;
	const normalizer = getChannelPlugin(channelId)?.messaging?.normalizeTarget;
	targetNormalizerCacheByChannelId.set(channelId, {
		version,
		normalizer
	});
	return normalizer;
}
function normalizeTargetForProvider(provider, raw) {
	if (!raw) return;
	const fallback = raw.trim() || void 0;
	if (!fallback) return;
	const providerId = normalizeChannelId(provider);
	return ((providerId ? resolveTargetNormalizer(providerId) : void 0)?.(raw) ?? fallback) || void 0;
}
function buildTargetResolverSignature(channel) {
	const resolver = getChannelPlugin(channel)?.messaging?.targetResolver;
	const hint = resolver?.hint ?? "";
	const looksLike = resolver?.looksLikeId;
	return hashSignature(`${hint}|${looksLike ? looksLike.toString() : ""}`);
}
function hashSignature(value) {
	let hash = 5381;
	for (let i = 0; i < value.length; i += 1) hash = (hash << 5) + hash ^ value.charCodeAt(i);
	return (hash >>> 0).toString(36);
}
//#endregion
//#region src/auto-reply/reply/reply-payloads-dedupe.ts
function filterMessagingToolDuplicates(params) {
	const { payloads, sentTexts } = params;
	if (sentTexts.length === 0) return payloads;
	return payloads.filter((payload) => !isMessagingToolDuplicate(payload.text ?? "", sentTexts));
}
function filterMessagingToolMediaDuplicates(params) {
	const normalizeMediaForDedupe = (value) => {
		const trimmed = value.trim();
		if (!trimmed) return "";
		if (!trimmed.toLowerCase().startsWith("file://")) return trimmed;
		try {
			const parsed = new URL(trimmed);
			if (parsed.protocol === "file:") return decodeURIComponent(parsed.pathname || "");
		} catch {}
		return trimmed.replace(/^file:\/\//i, "");
	};
	const { payloads, sentMediaUrls } = params;
	if (sentMediaUrls.length === 0) return payloads;
	const sentSet = new Set(sentMediaUrls.map(normalizeMediaForDedupe).filter(Boolean));
	return payloads.map((payload) => {
		const mediaUrl = payload.mediaUrl;
		const mediaUrls = payload.mediaUrls;
		const stripSingle = mediaUrl && sentSet.has(normalizeMediaForDedupe(mediaUrl));
		const filteredUrls = mediaUrls?.filter((u) => !sentSet.has(normalizeMediaForDedupe(u)));
		if (!stripSingle && (!mediaUrls || filteredUrls?.length === mediaUrls.length)) return payload;
		return {
			...payload,
			mediaUrl: stripSingle ? void 0 : mediaUrl,
			mediaUrls: filteredUrls?.length ? filteredUrls : void 0
		};
	});
}
function normalizeProviderForComparison(value) {
	const trimmed = value?.trim();
	if (!trimmed) return;
	const lowered = trimmed.toLowerCase();
	const normalizedChannel = normalizeChannelId(trimmed);
	if (normalizedChannel) return normalizedChannel;
	return lowered;
}
function normalizeThreadIdForComparison(value) {
	const trimmed = value?.trim();
	if (!trimmed) return;
	if (/^-?\d+$/.test(trimmed)) return String(Number.parseInt(trimmed, 10));
	return trimmed.toLowerCase();
}
function resolveTargetProviderForComparison(params) {
	const targetProvider = normalizeProviderForComparison(params.targetProvider);
	if (!targetProvider || targetProvider === "message") return params.currentProvider;
	return targetProvider;
}
function targetsMatchForSuppression(params) {
	const pluginMatch = getChannelPlugin(params.provider)?.outbound?.targetsMatchForReplySuppression;
	if (pluginMatch) return pluginMatch({
		originTarget: params.originTarget,
		targetKey: params.targetKey,
		targetThreadId: normalizeThreadIdForComparison(params.targetThreadId)
	});
	return params.targetKey === params.originTarget;
}
function shouldSuppressMessagingToolReplies(params) {
	const provider = normalizeProviderForComparison(params.messageProvider);
	if (!provider) return false;
	const originTarget = normalizeTargetForProvider(provider, params.originatingTo);
	if (!originTarget) return false;
	const originAccount = normalizeOptionalAccountId(params.accountId);
	const sentTargets = params.messagingToolSentTargets ?? [];
	if (sentTargets.length === 0) return false;
	return sentTargets.some((target) => {
		const targetProvider = resolveTargetProviderForComparison({
			currentProvider: provider,
			targetProvider: target?.provider
		});
		if (targetProvider !== provider) return false;
		const targetKey = normalizeTargetForProvider(targetProvider, target.to);
		if (!targetKey) return false;
		const targetAccount = normalizeOptionalAccountId(target.accountId);
		if (originAccount && targetAccount && originAccount !== targetAccount) return false;
		return targetsMatchForSuppression({
			provider,
			originTarget,
			targetKey,
			targetThreadId: target.threadId
		});
	});
}
//#endregion
export { normalizeChannelTargetInput as a, buildTargetResolverSignature as i, filterMessagingToolMediaDuplicates as n, normalizeTargetForProvider as o, shouldSuppressMessagingToolReplies as r, filterMessagingToolDuplicates as t };
