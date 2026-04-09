import { t as getActivePluginChannelRegistry } from "./runtime-Dji2WXDE.js";
import { b as isAcpSessionKey, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { n as listAcpBindings } from "./bindings-DkGhVRYX.js";
import { r as getSessionBindingService, s as normalizeConversationText } from "./session-binding-service-1Qw5xtDF.js";
import { t as resolveConversationBindingContext } from "./conversation-binding-context-D6hhkV1S.js";
import { o as buildConfiguredAcpSessionKey, r as resolveConfiguredBindingRecord, s as normalizeBindingConfig } from "./binding-registry-eKkVLEIK.js";
//#region src/auto-reply/reply/acp-reset-target.ts
const acpResetTargetDeps = {
	getSessionBindingService,
	listAcpBindings,
	resolveConfiguredBindingRecord
};
function normalizeText(value) {
	return value?.trim() ?? "";
}
function resolveResetTargetAccountId(params) {
	const explicit = normalizeText(params.accountId);
	if (explicit) return explicit;
	const configuredDefault = params.cfg.channels[params.channel]?.defaultAccount;
	return typeof configuredDefault === "string" && configuredDefault.trim() ? configuredDefault.trim() : DEFAULT_ACCOUNT_ID;
}
function resolveRawConfiguredAcpSessionKey(params) {
	for (const binding of acpResetTargetDeps.listAcpBindings(params.cfg)) {
		const bindingChannel = normalizeText(binding.match.channel).toLowerCase();
		if (!bindingChannel || bindingChannel !== params.channel) continue;
		const bindingAccountId = normalizeText(binding.match.accountId);
		if (bindingAccountId && bindingAccountId !== "*" && bindingAccountId !== params.accountId) continue;
		const peerId = normalizeText(binding.match.peer?.id);
		const matchedConversationId = peerId === params.conversationId ? params.conversationId : peerId && peerId === params.parentConversationId ? params.parentConversationId : void 0;
		if (!matchedConversationId) continue;
		const acp = normalizeBindingConfig(binding.acp);
		return buildConfiguredAcpSessionKey({
			channel: params.channel,
			accountId: bindingAccountId && bindingAccountId !== "*" ? bindingAccountId : params.accountId,
			conversationId: matchedConversationId,
			...params.parentConversationId ? { parentConversationId: params.parentConversationId } : {},
			agentId: binding.agentId,
			mode: acp.mode === "oneshot" ? "oneshot" : "persistent",
			...acp.cwd ? { cwd: acp.cwd } : {},
			...acp.backend ? { backend: acp.backend } : {},
			...acp.label ? { label: acp.label } : {}
		});
	}
}
function resolveEffectiveResetTargetSessionKey(params) {
	const activeSessionKey = normalizeText(params.activeSessionKey);
	const activeAcpSessionKey = activeSessionKey && isAcpSessionKey(activeSessionKey) ? activeSessionKey : void 0;
	const activeIsNonAcp = Boolean(activeSessionKey) && !activeAcpSessionKey;
	const channel = normalizeText(params.channel).toLowerCase();
	const conversationId = normalizeText(params.conversationId);
	if (!channel || !conversationId) return activeAcpSessionKey;
	const accountId = resolveResetTargetAccountId({
		cfg: params.cfg,
		channel,
		accountId: params.accountId
	});
	const parentConversationId = normalizeText(params.parentConversationId) || void 0;
	const allowNonAcpBindingSessionKey = Boolean(params.allowNonAcpBindingSessionKey);
	const serviceBinding = acpResetTargetDeps.getSessionBindingService().resolveByConversation({
		channel,
		accountId,
		conversationId,
		parentConversationId
	});
	const serviceSessionKey = serviceBinding?.targetKind === "session" ? serviceBinding.targetSessionKey.trim() : "";
	if (serviceSessionKey) {
		if (allowNonAcpBindingSessionKey) return serviceSessionKey;
		return isAcpSessionKey(serviceSessionKey) ? serviceSessionKey : void 0;
	}
	if (activeIsNonAcp && params.skipConfiguredFallbackWhenActiveSessionNonAcp) return;
	const configuredBinding = acpResetTargetDeps.resolveConfiguredBindingRecord({
		cfg: params.cfg,
		channel,
		accountId,
		conversationId,
		parentConversationId
	});
	const configuredSessionKey = configuredBinding?.record.targetKind === "session" ? configuredBinding.record.targetSessionKey.trim() : "";
	if (configuredSessionKey) {
		if (allowNonAcpBindingSessionKey) return configuredSessionKey;
		return isAcpSessionKey(configuredSessionKey) ? configuredSessionKey : void 0;
	}
	const rawConfiguredSessionKey = resolveRawConfiguredAcpSessionKey({
		cfg: params.cfg,
		channel,
		accountId,
		conversationId,
		...parentConversationId ? { parentConversationId } : {}
	});
	if (rawConfiguredSessionKey) return rawConfiguredSessionKey;
	if (params.fallbackToActiveAcpWhenUnbound === false) return;
	return activeAcpSessionKey;
}
//#endregion
//#region src/auto-reply/reply/conversation-binding-input.ts
function resolveBindingChannel(ctx, commandChannel) {
	return normalizeConversationText(ctx.OriginatingChannel ?? commandChannel ?? ctx.Surface ?? ctx.Provider).toLowerCase();
}
function resolveBindingAccountId(params) {
	const channel = resolveBindingChannel(params.ctx, params.commandChannel);
	const plugin = getActivePluginChannelRegistry()?.channels.find((entry) => entry.plugin.id === channel)?.plugin;
	return normalizeConversationText(params.ctx.AccountId) || normalizeConversationText(plugin?.config.defaultAccountId?.(params.cfg)) || "default";
}
function resolveBindingThreadId(threadId) {
	return (threadId != null ? normalizeConversationText(String(threadId)) : void 0) || void 0;
}
function resolveConversationBindingContextFromMessage(params) {
	const channel = resolveBindingChannel(params.ctx);
	return resolveConversationBindingContext({
		cfg: params.cfg,
		channel,
		accountId: resolveBindingAccountId({
			ctx: params.ctx,
			cfg: params.cfg,
			commandChannel: channel
		}),
		chatType: params.ctx.ChatType,
		threadId: resolveBindingThreadId(params.ctx.MessageThreadId),
		threadParentId: params.ctx.ThreadParentId,
		senderId: params.senderId ?? params.ctx.SenderId,
		sessionKey: params.sessionKey ?? params.ctx.SessionKey,
		parentSessionKey: params.parentSessionKey ?? params.ctx.ParentSessionKey,
		originatingTo: params.ctx.OriginatingTo,
		commandTo: params.commandTo,
		fallbackTo: params.ctx.To,
		from: params.ctx.From,
		nativeChannelId: params.ctx.NativeChannelId
	});
}
function resolveConversationBindingContextFromAcpCommand(params) {
	return resolveConversationBindingContextFromMessage({
		cfg: params.cfg,
		ctx: params.ctx,
		senderId: params.command.senderId,
		sessionKey: params.sessionKey,
		parentSessionKey: params.ctx.ParentSessionKey,
		commandTo: params.command.to
	});
}
function resolveConversationBindingChannelFromMessage(ctx, commandChannel) {
	return resolveBindingChannel(ctx, commandChannel);
}
function resolveConversationBindingAccountIdFromMessage(params) {
	return resolveBindingAccountId(params);
}
function resolveConversationBindingThreadIdFromMessage(ctx) {
	return resolveBindingThreadId(ctx.MessageThreadId);
}
//#endregion
export { resolveConversationBindingThreadIdFromMessage as a, resolveConversationBindingContextFromMessage as i, resolveConversationBindingChannelFromMessage as n, resolveEffectiveResetTargetSessionKey as o, resolveConversationBindingContextFromAcpCommand as r, resolveConversationBindingAccountIdFromMessage as t };
