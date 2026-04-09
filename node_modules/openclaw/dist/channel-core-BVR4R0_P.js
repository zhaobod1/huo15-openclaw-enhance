import { a as emptyChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { t as buildAccountScopedDmSecurityPolicy } from "./helpers-C-YC9Mfg.js";
import { r as createTopLevelChannelReplyToModeResolver, t as createScopedAccountReplyToModeResolver } from "./threading-helpers-DainoJbi.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-2NJCUHEq.js";
import "./secret-file-BIv887zc.js";
//#region src/plugin-sdk/channel-core.ts
function createInlineTextPairingAdapter(params) {
	return {
		idLabel: params.idLabel,
		normalizeAllowEntry: params.normalizeAllowEntry,
		notifyApproval: async (ctx) => {
			await params.notify({
				...ctx,
				message: params.message
			});
		}
	};
}
function createInlineAttachedChannelResultAdapter(params) {
	return {
		sendText: params.sendText ? async (ctx) => ({
			channel: params.channel,
			...await params.sendText(ctx)
		}) : void 0,
		sendMedia: params.sendMedia ? async (ctx) => ({
			channel: params.channel,
			...await params.sendMedia(ctx)
		}) : void 0,
		sendPoll: params.sendPoll ? async (ctx) => ({
			channel: params.channel,
			...await params.sendPoll(ctx)
		}) : void 0
	};
}
function resolveChatChannelSecurity(security) {
	if (!security) return;
	if (!("dm" in security)) return security;
	return {
		resolveDmPolicy: ({ cfg, accountId, account }) => buildAccountScopedDmSecurityPolicy({
			cfg,
			channelKey: security.dm.channelKey,
			accountId,
			fallbackAccountId: security.dm.resolveFallbackAccountId?.(account) ?? account.accountId,
			policy: security.dm.resolvePolicy(account),
			allowFrom: security.dm.resolveAllowFrom(account) ?? [],
			defaultPolicy: security.dm.defaultPolicy,
			allowFromPathSuffix: security.dm.allowFromPathSuffix,
			policyPathSuffix: security.dm.policyPathSuffix,
			approveChannelId: security.dm.approveChannelId,
			approveHint: security.dm.approveHint,
			normalizeEntry: security.dm.normalizeEntry
		}),
		...security.collectWarnings ? { collectWarnings: security.collectWarnings } : {},
		...security.collectAuditFindings ? { collectAuditFindings: security.collectAuditFindings } : {}
	};
}
function resolveChatChannelPairing(pairing) {
	if (!pairing) return;
	if (!("text" in pairing)) return pairing;
	return createInlineTextPairingAdapter(pairing.text);
}
function resolveChatChannelThreading(threading) {
	if (!threading) return;
	if (!("topLevelReplyToMode" in threading) && !("scopedAccountReplyToMode" in threading)) return threading;
	let resolveReplyToMode;
	if ("topLevelReplyToMode" in threading) resolveReplyToMode = createTopLevelChannelReplyToModeResolver(threading.topLevelReplyToMode);
	else resolveReplyToMode = createScopedAccountReplyToModeResolver(threading.scopedAccountReplyToMode);
	return {
		...threading,
		resolveReplyToMode
	};
}
function resolveChatChannelOutbound(outbound) {
	if (!outbound) return;
	if (!("attachedResults" in outbound)) return outbound;
	return {
		...outbound.base,
		...createInlineAttachedChannelResultAdapter(outbound.attachedResults)
	};
}
function defineChannelPluginEntry({ id, name, description, plugin, configSchema, setRuntime, registerCliMetadata, registerFull }) {
	return {
		id,
		name,
		description,
		configSchema: typeof configSchema === "function" ? configSchema() : configSchema ?? emptyChannelConfigSchema(),
		register(api) {
			if (api.registrationMode === "cli-metadata") {
				registerCliMetadata?.(api);
				return;
			}
			setRuntime?.(api.runtime);
			api.registerChannel({ plugin });
			if (api.registrationMode !== "full") return;
			registerCliMetadata?.(api);
			registerFull?.(api);
		},
		channelPlugin: plugin,
		...setRuntime ? { setChannelRuntime: setRuntime } : {}
	};
}
function defineSetupPluginEntry(plugin) {
	return { plugin };
}
function stripChannelTargetPrefix(raw, ...providers) {
	const trimmed = raw.trim();
	for (const provider of providers) {
		const prefix = `${provider.toLowerCase()}:`;
		if (trimmed.toLowerCase().startsWith(prefix)) return trimmed.slice(prefix.length).trim();
	}
	return trimmed;
}
function stripTargetKindPrefix(raw) {
	return raw.replace(/^(user|channel|group|conversation|room|dm):/i, "").trim();
}
function buildChannelOutboundSessionRoute(params) {
	const baseSessionKey = buildOutboundBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: params.channel,
		accountId: params.accountId,
		peer: params.peer
	});
	return {
		sessionKey: baseSessionKey,
		baseSessionKey,
		peer: params.peer,
		chatType: params.chatType,
		from: params.from,
		to: params.to,
		...params.threadId !== void 0 ? { threadId: params.threadId } : {}
	};
}
function createChatChannelPlugin(params) {
	return {
		...params.base,
		conversationBindings: {
			supportsCurrentConversationBinding: true,
			...params.base.conversationBindings
		},
		...params.security ? { security: resolveChatChannelSecurity(params.security) } : {},
		...params.pairing ? { pairing: resolveChatChannelPairing(params.pairing) } : {},
		...params.threading ? { threading: resolveChatChannelThreading(params.threading) } : {},
		...params.outbound ? { outbound: resolveChatChannelOutbound(params.outbound) } : {}
	};
}
//#endregion
export { stripChannelTargetPrefix as a, defineSetupPluginEntry as i, createChatChannelPlugin as n, stripTargetKindPrefix as o, defineChannelPluginEntry as r, buildChannelOutboundSessionRoute as t };
