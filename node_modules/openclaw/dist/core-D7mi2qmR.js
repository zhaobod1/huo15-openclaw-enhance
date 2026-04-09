import { n as CHAT_CHANNEL_ORDER } from "./ids-Dm8ff2qI.js";
import { d as resolveChannelExposure } from "./registry-DldQsVOb.js";
import "./subsystem-CVf5iEWk.js";
import "./paths-yyDPxM31.js";
import { r as listBundledPluginMetadata } from "./zod-schema-C3jh3SvI.js";
import { a as emptyChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import "./net-DwNAtbJy.js";
import "./common-B7pbdYUb.js";
import "./delegate-YbaLRmDx.js";
import "./typebox-o06rY0vc.js";
import "./resolve-route-CavttejP.js";
import { t as buildAccountScopedDmSecurityPolicy } from "./helpers-C-YC9Mfg.js";
import { r as createTopLevelChannelReplyToModeResolver, t as createScopedAccountReplyToModeResolver } from "./threading-helpers-DainoJbi.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-2NJCUHEq.js";
import "./setup-helpers-BiAtGxsL.js";
import "./secret-file-BIv887zc.js";
import "./tailscale-status-CVJtHbBv.js";
import "./persistent-bindings.lifecycle-wrc8bySJ.js";
//#region src/plugin-sdk/core.ts
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
var cachedSdkChatChannelMeta;
var cachedSdkChatChannelIdSet;
function getSdkChatChannelIdSet() {
	cachedSdkChatChannelIdSet ??= new Set(CHAT_CHANNEL_ORDER);
	return cachedSdkChatChannelIdSet;
}
function toSdkChatChannelMeta(params) {
	const label = params.channel.label?.trim();
	if (!label) throw new Error(`Missing label for bundled chat channel "${params.id}"`);
	const exposure = resolveChannelExposure(params.channel);
	return {
		id: params.id,
		label,
		selectionLabel: params.channel.selectionLabel?.trim() || label,
		docsPath: params.channel.docsPath?.trim() || `/channels/${params.id}`,
		docsLabel: params.channel.docsLabel?.trim() || void 0,
		blurb: params.channel.blurb?.trim() || "",
		...params.channel.aliases?.length ? { aliases: params.channel.aliases } : {},
		...params.channel.order !== void 0 ? { order: params.channel.order } : {},
		...params.channel.selectionDocsPrefix !== void 0 ? { selectionDocsPrefix: params.channel.selectionDocsPrefix } : {},
		...params.channel.selectionDocsOmitLabel !== void 0 ? { selectionDocsOmitLabel: params.channel.selectionDocsOmitLabel } : {},
		...params.channel.selectionExtras?.length ? { selectionExtras: params.channel.selectionExtras } : {},
		...params.channel.detailLabel?.trim() ? { detailLabel: params.channel.detailLabel.trim() } : {},
		...params.channel.systemImage?.trim() ? { systemImage: params.channel.systemImage.trim() } : {},
		...params.channel.markdownCapable !== void 0 ? { markdownCapable: params.channel.markdownCapable } : {},
		exposure,
		...params.channel.quickstartAllowFrom !== void 0 ? { quickstartAllowFrom: params.channel.quickstartAllowFrom } : {},
		...params.channel.forceAccountBinding !== void 0 ? { forceAccountBinding: params.channel.forceAccountBinding } : {},
		...params.channel.preferSessionLookupForAnnounceTarget !== void 0 ? { preferSessionLookupForAnnounceTarget: params.channel.preferSessionLookupForAnnounceTarget } : {},
		...params.channel.preferOver?.length ? { preferOver: params.channel.preferOver } : {}
	};
}
function buildChatChannelMetaById() {
	const entries = /* @__PURE__ */ new Map();
	for (const entry of listBundledPluginMetadata({
		includeChannelConfigs: true,
		includeSyntheticChannelConfigs: false
	})) {
		const channel = entry.packageManifest && "channel" in entry.packageManifest ? entry.packageManifest.channel : void 0;
		if (!channel) continue;
		const rawId = channel.id?.trim();
		if (!rawId || !getSdkChatChannelIdSet().has(rawId)) continue;
		const id = rawId;
		entries.set(id, toSdkChatChannelMeta({
			id,
			channel
		}));
	}
	return Object.freeze(Object.fromEntries(entries));
}
function resolveSdkChatChannelMeta(id) {
	cachedSdkChatChannelMeta ??= buildChatChannelMetaById();
	return cachedSdkChatChannelMeta[id];
}
function getChatChannelMeta(id) {
	return resolveSdkChatChannelMeta(id);
}
/** Remove one of the known provider prefixes from a free-form target string. */
function stripChannelTargetPrefix(raw, ...providers) {
	const trimmed = raw.trim();
	for (const provider of providers) {
		const prefix = `${provider.toLowerCase()}:`;
		if (trimmed.toLowerCase().startsWith(prefix)) return trimmed.slice(prefix.length).trim();
	}
	return trimmed;
}
/** Remove generic target-kind prefixes such as `user:` or `group:`. */
function stripTargetKindPrefix(raw) {
	return raw.replace(/^(user|channel|group|conversation|room|dm):/i, "").trim();
}
/**
* Build the canonical outbound session route payload returned by channel
* message adapters.
*/
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
/**
* Canonical entry helper for channel plugins.
*
* This wraps `definePluginEntry(...)`, registers the channel capability, and
* optionally exposes extra full-runtime registration such as tools or gateway
* handlers that only make sense outside setup-only registration modes.
*/
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
/**
* Minimal setup-entry helper for channels that ship a separate `setup-entry.ts`.
*
* The setup entry only needs to export `{ plugin }`, but using this helper
* keeps the shape explicit in examples and generated typings.
*/
function defineSetupPluginEntry(plugin) {
	return { plugin };
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
function createChannelPluginBase(params) {
	return {
		id: params.id,
		meta: {
			...resolveSdkChatChannelMeta(params.id),
			...params.meta
		},
		...params.setupWizard ? { setupWizard: params.setupWizard } : {},
		...params.capabilities ? { capabilities: params.capabilities } : {},
		...params.commands ? { commands: params.commands } : {},
		...params.doctor ? { doctor: params.doctor } : {},
		...params.agentPrompt ? { agentPrompt: params.agentPrompt } : {},
		...params.streaming ? { streaming: params.streaming } : {},
		...params.reload ? { reload: params.reload } : {},
		...params.gatewayMethods ? { gatewayMethods: params.gatewayMethods } : {},
		...params.configSchema ? { configSchema: params.configSchema } : {},
		...params.config ? { config: params.config } : {},
		...params.security ? { security: params.security } : {},
		...params.groups ? { groups: params.groups } : {},
		setup: params.setup
	};
}
//#endregion
export { defineSetupPluginEntry as a, stripTargetKindPrefix as c, defineChannelPluginEntry as i, createChannelPluginBase as n, getChatChannelMeta as o, createChatChannelPlugin as r, stripChannelTargetPrefix as s, buildChannelOutboundSessionRoute as t };
