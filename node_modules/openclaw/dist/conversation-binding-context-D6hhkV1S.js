import { t as getActivePluginChannelRegistry } from "./runtime-Dji2WXDE.js";
import { a as normalizeAnyChannelId, o as normalizeChannelId } from "./registry-DldQsVOb.js";
import { n as parseExplicitTargetForChannel } from "./target-parsing-ONP8nSDX.js";
import { s as normalizeConversationText } from "./session-binding-service-1Qw5xtDF.js";
//#region src/infra/outbound/conversation-id.ts
function normalizeConversationId(value) {
	if (typeof value !== "string") return;
	return value.trim() || void 0;
}
function resolveExplicitConversationTargetId(target) {
	for (const prefix of [
		"channel:",
		"conversation:",
		"group:",
		"room:",
		"dm:"
	]) if (target.toLowerCase().startsWith(prefix)) return normalizeConversationId(target.slice(prefix.length));
}
function resolveConversationIdFromTargets(params) {
	const threadId = params.threadId != null ? normalizeConversationId(String(params.threadId)) : void 0;
	if (threadId) return threadId;
	for (const rawTarget of params.targets) {
		const target = normalizeConversationId(rawTarget);
		if (!target) continue;
		const explicitConversationId = resolveExplicitConversationTargetId(target);
		if (explicitConversationId) return explicitConversationId;
		if (target.includes(":") && explicitConversationId === void 0) continue;
		const mentionMatch = target.match(/^<#(\d+)>$/);
		if (mentionMatch?.[1]) return mentionMatch[1];
		if (/^\d{6,}$/.test(target)) return target;
	}
}
//#endregion
//#region src/channels/conversation-binding-context.ts
const CANONICAL_TARGET_PREFIXES = [
	"user:",
	"channel:",
	"conversation:",
	"group:",
	"room:",
	"dm:",
	"spaces/"
];
function normalizeText(value) {
	return normalizeConversationText(value) || void 0;
}
function getLoadedChannelPlugin(rawChannel) {
	const normalized = normalizeAnyChannelId(rawChannel) ?? normalizeText(rawChannel);
	if (!normalized) return;
	return getActivePluginChannelRegistry()?.channels.find((entry) => entry.plugin.id === normalized)?.plugin;
}
function shouldDefaultParentConversationToSelf(plugin) {
	return plugin?.bindings?.selfParentConversationByDefault === true;
}
function resolveBindingAccountId(params) {
	return normalizeText(params.rawAccountId) || normalizeText(params.plugin?.config.defaultAccountId?.(params.cfg)) || "default";
}
function resolveChannelTargetId(params) {
	const target = normalizeText(params.target);
	if (!target) return;
	const lower = target.toLowerCase();
	const channelPrefix = `${params.channel}:`;
	if (lower.startsWith(channelPrefix)) return resolveChannelTargetId({
		channel: params.channel,
		target: target.slice(channelPrefix.length)
	});
	if (CANONICAL_TARGET_PREFIXES.some((prefix) => lower.startsWith(prefix))) return target;
	const parsedTarget = normalizeText(parseExplicitTargetForChannel(params.channel, target)?.to);
	if (parsedTarget) return resolveConversationIdFromTargets({ targets: [parsedTarget] }) ?? parsedTarget;
	return resolveConversationIdFromTargets({ targets: [target] }) ?? target;
}
function buildThreadingContext(params) {
	const to = normalizeText(params.originatingTo) ?? normalizeText(params.fallbackTo);
	return {
		...to ? { To: to } : {},
		...params.from ? { From: params.from } : {},
		...params.chatType ? { ChatType: params.chatType } : {},
		...params.threadId ? { MessageThreadId: params.threadId } : {},
		...params.nativeChannelId ? { NativeChannelId: params.nativeChannelId } : {}
	};
}
function resolveConversationBindingContext(params) {
	const channel = normalizeAnyChannelId(params.channel) ?? normalizeChannelId(params.channel) ?? normalizeText(params.channel)?.toLowerCase();
	if (!channel) return null;
	const loadedPlugin = getLoadedChannelPlugin(channel);
	const accountId = resolveBindingAccountId({
		rawAccountId: params.accountId,
		plugin: loadedPlugin,
		cfg: params.cfg
	});
	const threadId = normalizeText(params.threadId != null ? String(params.threadId) : void 0);
	const resolvedByProvider = loadedPlugin?.bindings?.resolveCommandConversation?.({
		accountId,
		threadId,
		threadParentId: normalizeText(params.threadParentId),
		senderId: normalizeText(params.senderId),
		sessionKey: normalizeText(params.sessionKey),
		parentSessionKey: normalizeText(params.parentSessionKey),
		originatingTo: params.originatingTo ?? void 0,
		commandTo: params.commandTo ?? void 0,
		fallbackTo: params.fallbackTo ?? void 0
	});
	if (resolvedByProvider?.conversationId) {
		const resolvedParentConversationId = shouldDefaultParentConversationToSelf(loadedPlugin) && !threadId && !resolvedByProvider.parentConversationId ? resolvedByProvider.conversationId : resolvedByProvider.parentConversationId;
		return {
			channel,
			accountId,
			conversationId: resolvedByProvider.conversationId,
			...resolvedParentConversationId ? { parentConversationId: resolvedParentConversationId } : {},
			...threadId ? { threadId } : {}
		};
	}
	const focusedBinding = loadedPlugin?.threading?.resolveFocusedBinding?.({
		cfg: params.cfg,
		accountId,
		context: buildThreadingContext({
			fallbackTo: params.fallbackTo ?? void 0,
			originatingTo: params.originatingTo ?? void 0,
			threadId,
			from: normalizeText(params.from),
			chatType: normalizeText(params.chatType),
			nativeChannelId: normalizeText(params.nativeChannelId)
		})
	});
	if (focusedBinding?.conversationId) return {
		channel,
		accountId,
		conversationId: focusedBinding.conversationId,
		...focusedBinding.parentConversationId ? { parentConversationId: focusedBinding.parentConversationId } : {},
		...threadId ? { threadId } : {}
	};
	const baseConversationId = resolveChannelTargetId({
		channel,
		target: params.originatingTo
	}) ?? resolveChannelTargetId({
		channel,
		target: params.commandTo
	}) ?? resolveChannelTargetId({
		channel,
		target: params.fallbackTo
	});
	const parentConversationId = resolveChannelTargetId({
		channel,
		target: params.threadParentId
	}) ?? (threadId && baseConversationId && baseConversationId !== threadId ? baseConversationId : void 0);
	const conversationId = threadId || baseConversationId;
	if (!conversationId) return null;
	const normalizedParentConversationId = shouldDefaultParentConversationToSelf(loadedPlugin) && !threadId && !parentConversationId ? conversationId : parentConversationId;
	return {
		channel,
		accountId,
		conversationId,
		...normalizedParentConversationId ? { parentConversationId: normalizedParentConversationId } : {},
		...threadId ? { threadId } : {}
	};
}
//#endregion
export { resolveConversationIdFromTargets as n, resolveConversationBindingContext as t };
