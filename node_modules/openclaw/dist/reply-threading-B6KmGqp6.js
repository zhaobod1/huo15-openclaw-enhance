import { o as normalizeChannelId } from "./registry-DldQsVOb.js";
import { r as normalizeChannelId$1, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
//#region src/auto-reply/reply/reply-reference.ts
function isSingleUseReplyToMode(mode) {
	return mode === "first" || mode === "batched";
}
function createReplyReferencePlanner(options) {
	let hasReplied = options.hasReplied ?? false;
	const allowReference = options.allowReference !== false;
	const existingId = options.existingId?.trim();
	const startId = options.startId?.trim();
	const use = () => {
		if (!allowReference) return;
		if (options.replyToMode === "off") return;
		const id = existingId ?? startId;
		if (!id) return;
		if (options.replyToMode === "all") {
			hasReplied = true;
			return id;
		}
		if (isSingleUseReplyToMode(options.replyToMode) && hasReplied) return;
		hasReplied = true;
		return id;
	};
	const markSent = () => {
		hasReplied = true;
	};
	return {
		use,
		markSent,
		hasReplied: () => hasReplied
	};
}
//#endregion
//#region src/auto-reply/reply/reply-threading.ts
function normalizeReplyToModeChatType(chatType) {
	return chatType === "direct" || chatType === "group" || chatType === "channel" ? chatType : void 0;
}
function resolveReplyToModeChannelKey(channel) {
	if (typeof channel !== "string") return;
	return (normalizeChannelId(channel) ?? normalizeChannelId$1(channel) ?? channel.trim().toLowerCase()) || void 0;
}
function resolveConfiguredReplyToMode(cfg, channel, chatType) {
	const provider = resolveReplyToModeChannelKey(channel);
	if (!provider) return "all";
	const channelConfig = cfg.channels?.[provider];
	const normalizedChatType = normalizeReplyToModeChatType(chatType);
	if (normalizedChatType) {
		const scopedMode = channelConfig?.replyToModeByChatType?.[normalizedChatType];
		if (scopedMode !== void 0) return scopedMode;
	}
	if (normalizedChatType === "direct") {
		const legacyDirectMode = channelConfig?.dm?.replyToMode;
		if (legacyDirectMode !== void 0) return legacyDirectMode;
	}
	return channelConfig?.replyToMode ?? "all";
}
function resolveReplyToModeWithThreading(cfg, threading, params = {}) {
	return threading?.resolveReplyToMode?.({
		cfg,
		accountId: params.accountId,
		chatType: params.chatType
	}) ?? resolveConfiguredReplyToMode(cfg, params.channel, params.chatType);
}
function resolveReplyToMode(cfg, channel, accountId, chatType) {
	const provider = normalizeChannelId$1(channel);
	return resolveReplyToModeWithThreading(cfg, provider ? getChannelPlugin(provider)?.threading : void 0, {
		channel,
		accountId,
		chatType
	});
}
function createReplyToModeFilter(mode, opts = {}) {
	let hasThreaded = false;
	return (payload) => {
		if (!payload.replyToId) return payload;
		if (mode === "off") {
			const isExplicit = Boolean(payload.replyToTag) || Boolean(payload.replyToCurrent);
			if (opts.allowExplicitReplyTagsWhenOff && isExplicit && !payload.isCompactionNotice) return payload;
			return {
				...payload,
				replyToId: void 0
			};
		}
		if (mode === "all") return payload;
		if (isSingleUseReplyToMode(mode) && hasThreaded) {
			if (payload.isCompactionNotice) return payload;
			return {
				...payload,
				replyToId: void 0
			};
		}
		if (isSingleUseReplyToMode(mode) && !payload.isCompactionNotice) hasThreaded = true;
		return payload;
	};
}
function resolveImplicitCurrentMessageReplyAllowance(mode, policy) {
	const implicitCurrentMessage = policy?.implicitCurrentMessage ?? "default";
	if (implicitCurrentMessage === "allow") return true;
	if (implicitCurrentMessage === "deny") return false;
	return mode !== "batched";
}
function resolveBatchedReplyThreadingPolicy(mode, isBatched) {
	if (mode !== "batched") return;
	return { implicitCurrentMessage: isBatched ? "allow" : "deny" };
}
function createReplyToModeFilterForChannel(mode, channel) {
	const provider = normalizeChannelId$1(channel);
	const isWebchat = (typeof channel === "string" ? channel.trim().toLowerCase() : void 0) === "webchat";
	const threading = provider ? getChannelPlugin(provider)?.threading : void 0;
	return createReplyToModeFilter(mode, { allowExplicitReplyTagsWhenOff: provider ? threading?.allowExplicitReplyTagsWhenOff ?? threading?.allowTagsWhenOff ?? true : isWebchat });
}
//#endregion
export { createReplyReferencePlanner as a, resolveReplyToMode as i, resolveBatchedReplyThreadingPolicy as n, isSingleUseReplyToMode as o, resolveImplicitCurrentMessageReplyAllowance as r, createReplyToModeFilterForChannel as t };
