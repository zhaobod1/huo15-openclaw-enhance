import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID, u as resolveAgentIdFromSessionKey } from "../../session-key-BR3Z-ljs.js";
import { c as createScopedChannelConfigAdapter, m as formatTrimmedAllowFromEntries, t as adaptScopedAccountAccessor } from "../../channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "../../lazy-runtime-BwFSOU2O.js";
import { a as registerSessionBindingAdapter, o as unregisterSessionBindingAdapter } from "../../session-binding-service-1Qw5xtDF.js";
import { l as resolveThreadBindingMaxAgeMsForChannel, o as resolveThreadBindingIdleTimeoutMsForChannel } from "../../thread-bindings-policy-C5NA_pbl.js";
import { n as describeAccountSnapshot } from "../../account-helpers-A6tF0W1f.js";
import { t as buildOutboundBaseSessionKey } from "../../base-session-key-2NJCUHEq.js";
import { n as createChannelPluginBase, o as getChatChannelMeta } from "../../core-D7mi2qmR.js";
import "../../routing-DdBDhOmH.js";
import { n as createRestrictSendersChannelSecurity } from "../../channel-policy-DIVRdPsQ.js";
import { a as resolveServicePrefixedChatTarget, i as resolveServicePrefixedAllowTarget, n as parseChatAllowTargetPrefixes, o as resolveServicePrefixedOrChatAllowTarget, r as parseChatTargetPrefixesOrThrow, s as resolveServicePrefixedTarget, t as createAllowedChatSenderMatcher } from "../../channel-targets-BmwNqxOt.js";
import { c as collectStatusIssuesFromLastError, d as createDefaultChannelRuntimeState, u as createComputedAccountStatusAdapter } from "../../status-helpers-ChR3_7qO.js";
import { t as sanitizeForPlainText } from "../../sanitize-text-9E3ODlSk.js";
import "../../outbound-runtime-BSC4z6CP.js";
import "../../conversation-runtime-D-TUyzoB.js";
import { t as resolveThreadBindingConversationIdFromBindingId } from "../../thread-binding-id-tykT1Khd.js";
import { n as buildDmGroupAccountAllowlistAdapter } from "../../allowlist-config-edit-CWwW-8J5.js";
import { n as buildPassiveProbedChannelStatusSummary } from "../../extension-shared-CKz43ndd.js";
import { n as createChatChannelPlugin } from "../../channel-core-BVR4R0_P.js";
import { a as listIMessageAccountIds, i as listEnabledIMessageAccounts, n as resolveIMessageAttachmentRoots, o as resolveDefaultIMessageAccountId, r as resolveIMessageRemoteAttachmentRoots, s as resolveIMessageAccount } from "../../media-contract-C8ZK0sub.js";
import { _ as normalizeIMessageMessagingTarget, a as matchIMessageAcpConversation, c as formatIMessageChatTarget, d as looksLikeIMessageExplicitTargetId, f as normalizeIMessageHandle, g as looksLikeIMessageTargetId, h as chunkTextForOutbound, i as resolveIMessageInboundConversationId, l as inferIMessageTargetChatType, m as parseIMessageTarget, o as normalizeIMessageAcpConversationId, p as parseIMessageAllowTarget, r as DEFAULT_IMESSAGE_PROBE_TIMEOUT_MS, s as resolveIMessageConversationIdFromTarget, t as probeIMessage, u as isAllowedIMessageSender } from "../../probe-4P3jCy_Z.js";
import { n as resolveIMessageGroupToolPolicy, t as resolveIMessageGroupRequireMention } from "../../group-policy-MjFVlUPy.js";
import { o as imessageSetupAdapter, r as createIMessageSetupWizardProxy, t as IMESSAGE_LEGACY_OUTBOUND_SEND_DEP_KEYS } from "../../outbound-send-deps-B50ET6q4.js";
import { t as IMessageChannelConfigSchema } from "../../config-schema-BmoKGfln.js";
//#region extensions/imessage/src/conversation-bindings.ts
const IMESSAGE_CONVERSATION_BINDINGS_STATE_KEY = Symbol.for("openclaw.imessageConversationBindingsState");
let state;
function getState() {
	if (!state) {
		const globalStore = globalThis;
		state = globalStore[IMESSAGE_CONVERSATION_BINDINGS_STATE_KEY] ?? {
			managersByAccountId: /* @__PURE__ */ new Map(),
			bindingsByAccountConversation: /* @__PURE__ */ new Map()
		};
		globalStore[IMESSAGE_CONVERSATION_BINDINGS_STATE_KEY] = state;
	}
	return state;
}
function resolveBindingKey(params) {
	return `${params.accountId}:${params.conversationId}`;
}
function toSessionBindingTargetKind(raw) {
	return raw === "subagent" ? "subagent" : "session";
}
function toIMessageTargetKind(raw) {
	return raw === "subagent" ? "subagent" : "acp";
}
function toSessionBindingRecord(record, defaults) {
	const idleExpiresAt = defaults.idleTimeoutMs > 0 ? record.lastActivityAt + defaults.idleTimeoutMs : void 0;
	const maxAgeExpiresAt = defaults.maxAgeMs > 0 ? record.boundAt + defaults.maxAgeMs : void 0;
	const expiresAt = idleExpiresAt != null && maxAgeExpiresAt != null ? Math.min(idleExpiresAt, maxAgeExpiresAt) : idleExpiresAt ?? maxAgeExpiresAt;
	return {
		bindingId: resolveBindingKey({
			accountId: record.accountId,
			conversationId: record.conversationId
		}),
		targetSessionKey: record.targetSessionKey,
		targetKind: toSessionBindingTargetKind(record.targetKind),
		conversation: {
			channel: "imessage",
			accountId: record.accountId,
			conversationId: record.conversationId
		},
		status: "active",
		boundAt: record.boundAt,
		expiresAt,
		metadata: {
			agentId: record.agentId,
			label: record.label,
			boundBy: record.boundBy,
			lastActivityAt: record.lastActivityAt,
			idleTimeoutMs: defaults.idleTimeoutMs,
			maxAgeMs: defaults.maxAgeMs
		}
	};
}
function createIMessageConversationBindingManager(params) {
	const accountId = normalizeAccountId(params.accountId);
	const existing = getState().managersByAccountId.get(accountId);
	if (existing) return existing;
	const idleTimeoutMs = resolveThreadBindingIdleTimeoutMsForChannel({
		cfg: params.cfg,
		channel: "imessage",
		accountId
	});
	const maxAgeMs = resolveThreadBindingMaxAgeMsForChannel({
		cfg: params.cfg,
		channel: "imessage",
		accountId
	});
	const manager = {
		accountId,
		getByConversationId: (conversationId) => getState().bindingsByAccountConversation.get(resolveBindingKey({
			accountId,
			conversationId
		})),
		listBySessionKey: (targetSessionKey) => [...getState().bindingsByAccountConversation.values()].filter((record) => record.accountId === accountId && record.targetSessionKey === targetSessionKey),
		bindConversation: ({ conversationId, targetKind, targetSessionKey, metadata }) => {
			const normalizedConversationId = conversationId.trim();
			const normalizedTargetSessionKey = targetSessionKey.trim();
			if (!normalizedConversationId || !normalizedTargetSessionKey) return null;
			const now = Date.now();
			const record = {
				accountId,
				conversationId: normalizedConversationId,
				targetKind: toIMessageTargetKind(targetKind),
				targetSessionKey: normalizedTargetSessionKey,
				agentId: typeof metadata?.agentId === "string" && metadata.agentId.trim() ? metadata.agentId.trim() : resolveAgentIdFromSessionKey(normalizedTargetSessionKey),
				label: typeof metadata?.label === "string" && metadata.label.trim() ? metadata.label.trim() : void 0,
				boundBy: typeof metadata?.boundBy === "string" && metadata.boundBy.trim() ? metadata.boundBy.trim() : void 0,
				boundAt: now,
				lastActivityAt: now
			};
			getState().bindingsByAccountConversation.set(resolveBindingKey({
				accountId,
				conversationId: normalizedConversationId
			}), record);
			return record;
		},
		touchConversation: (conversationId, at = Date.now()) => {
			const key = resolveBindingKey({
				accountId,
				conversationId
			});
			const existingRecord = getState().bindingsByAccountConversation.get(key);
			if (!existingRecord) return null;
			const updated = {
				...existingRecord,
				lastActivityAt: at
			};
			getState().bindingsByAccountConversation.set(key, updated);
			return updated;
		},
		unbindConversation: (conversationId) => {
			const key = resolveBindingKey({
				accountId,
				conversationId
			});
			const existingRecord = getState().bindingsByAccountConversation.get(key);
			if (!existingRecord) return null;
			getState().bindingsByAccountConversation.delete(key);
			return existingRecord;
		},
		unbindBySessionKey: (targetSessionKey) => {
			const removed = [];
			for (const record of [...getState().bindingsByAccountConversation.values()]) {
				if (record.accountId !== accountId || record.targetSessionKey !== targetSessionKey) continue;
				getState().bindingsByAccountConversation.delete(resolveBindingKey({
					accountId,
					conversationId: record.conversationId
				}));
				removed.push(record);
			}
			return removed;
		},
		stop: () => {
			for (const key of [...getState().bindingsByAccountConversation.keys()]) if (key.startsWith(`${accountId}:`)) getState().bindingsByAccountConversation.delete(key);
			getState().managersByAccountId.delete(accountId);
			unregisterSessionBindingAdapter({
				channel: "imessage",
				accountId,
				adapter: sessionBindingAdapter
			});
		}
	};
	const sessionBindingAdapter = {
		channel: "imessage",
		accountId,
		capabilities: { placements: ["current"] },
		bind: async (input) => {
			if (input.conversation.channel !== "imessage" || input.placement === "child") return null;
			const bound = manager.bindConversation({
				conversationId: input.conversation.conversationId,
				targetKind: input.targetKind,
				targetSessionKey: input.targetSessionKey,
				metadata: input.metadata
			});
			return bound ? toSessionBindingRecord(bound, {
				idleTimeoutMs,
				maxAgeMs
			}) : null;
		},
		listBySession: (targetSessionKey) => manager.listBySessionKey(targetSessionKey).map((entry) => toSessionBindingRecord(entry, {
			idleTimeoutMs,
			maxAgeMs
		})),
		resolveByConversation: (ref) => {
			if (ref.channel !== "imessage") return null;
			const found = manager.getByConversationId(ref.conversationId);
			return found ? toSessionBindingRecord(found, {
				idleTimeoutMs,
				maxAgeMs
			}) : null;
		},
		touch: (bindingId, at) => {
			const conversationId = resolveThreadBindingConversationIdFromBindingId({
				accountId,
				bindingId
			});
			if (conversationId) manager.touchConversation(conversationId, at);
		},
		unbind: async (input) => {
			if (input.targetSessionKey?.trim()) return manager.unbindBySessionKey(input.targetSessionKey.trim()).map((entry) => toSessionBindingRecord(entry, {
				idleTimeoutMs,
				maxAgeMs
			}));
			const conversationId = resolveThreadBindingConversationIdFromBindingId({
				accountId,
				bindingId: input.bindingId
			});
			if (!conversationId) return [];
			const removed = manager.unbindConversation(conversationId);
			return removed ? [toSessionBindingRecord(removed, {
				idleTimeoutMs,
				maxAgeMs
			})] : [];
		}
	};
	registerSessionBindingAdapter(sessionBindingAdapter);
	getState().managersByAccountId.set(accountId, manager);
	return manager;
}
const __testing = { resetIMessageConversationBindingsForTests() {
	for (const manager of getState().managersByAccountId.values()) manager.stop();
	getState().managersByAccountId.clear();
	getState().bindingsByAccountConversation.clear();
} };
//#endregion
//#region extensions/imessage/src/shared.ts
const IMESSAGE_CHANNEL = "imessage";
async function loadIMessageChannelRuntime$1() {
	return await import("../../channel.runtime-BinkpRV6.js");
}
const imessageSetupWizard = createIMessageSetupWizardProxy(async () => (await loadIMessageChannelRuntime$1()).imessageSetupWizard);
const imessageConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: IMESSAGE_CHANNEL,
	listAccountIds: listIMessageAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveIMessageAccount),
	defaultAccountId: resolveDefaultIMessageAccountId,
	clearBaseFields: [
		"cliPath",
		"dbPath",
		"service",
		"region",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatTrimmedAllowFromEntries(allowFrom),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const imessageSecurityAdapter = createRestrictSendersChannelSecurity({
	channelKey: IMESSAGE_CHANNEL,
	resolveDmPolicy: (account) => account.config.dmPolicy,
	resolveDmAllowFrom: (account) => account.config.allowFrom,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "iMessage groups",
	openScope: "any member",
	groupPolicyPath: "channels.imessage.groupPolicy",
	groupAllowFromPath: "channels.imessage.groupAllowFrom",
	mentionGated: false,
	policyPathSuffix: "dmPolicy"
});
function createIMessagePluginBase(params) {
	return {
		...createChannelPluginBase({
			id: IMESSAGE_CHANNEL,
			meta: {
				...getChatChannelMeta(IMESSAGE_CHANNEL),
				aliases: ["imsg"],
				showConfigured: false
			},
			setupWizard: params.setupWizard,
			capabilities: {
				chatTypes: ["direct", "group"],
				media: true
			},
			reload: { configPrefixes: ["channels.imessage"] },
			configSchema: IMessageChannelConfigSchema,
			config: {
				...imessageConfigAdapter,
				isConfigured: (account) => account.configured,
				describeAccount: (account) => describeAccountSnapshot({
					account,
					configured: account.configured
				})
			},
			security: imessageSecurityAdapter,
			setup: params.setup
		}),
		messaging: {
			resolveInboundAttachmentRoots: (params) => resolveIMessageAttachmentRoots({
				accountId: params.accountId,
				cfg: params.cfg
			}),
			resolveRemoteInboundAttachmentRoots: (params) => resolveIMessageRemoteAttachmentRoots({
				accountId: params.accountId,
				cfg: params.cfg
			})
		}
	};
}
//#endregion
//#region extensions/imessage/src/channel.ts
const loadIMessageChannelRuntime = createLazyRuntimeModule(() => import("../../channel.runtime-BinkpRV6.js"));
function buildIMessageBaseSessionKey(params) {
	return buildOutboundBaseSessionKey({
		...params,
		channel: "imessage"
	});
}
function resolveIMessageOutboundSessionRoute(params) {
	const parsed = parseIMessageTarget(params.target);
	if (parsed.kind === "handle") {
		const handle = normalizeIMessageHandle(parsed.to);
		if (!handle) return null;
		const peer = {
			kind: "direct",
			id: handle
		};
		const baseSessionKey = buildIMessageBaseSessionKey({
			cfg: params.cfg,
			agentId: params.agentId,
			accountId: params.accountId,
			peer
		});
		return {
			sessionKey: baseSessionKey,
			baseSessionKey,
			peer,
			chatType: "direct",
			from: `imessage:${handle}`,
			to: `imessage:${handle}`
		};
	}
	const peerId = parsed.kind === "chat_id" ? String(parsed.chatId) : parsed.kind === "chat_guid" ? parsed.chatGuid : parsed.chatIdentifier;
	if (!peerId) return null;
	const peer = {
		kind: "group",
		id: peerId
	};
	const baseSessionKey = buildIMessageBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: params.accountId,
		peer
	});
	const toPrefix = parsed.kind === "chat_id" ? "chat_id" : parsed.kind === "chat_guid" ? "chat_guid" : "chat_identifier";
	return {
		sessionKey: baseSessionKey,
		baseSessionKey,
		peer,
		chatType: "group",
		from: `imessage:group:${peerId}`,
		to: `${toPrefix}:${peerId}`
	};
}
const imessagePlugin = createChatChannelPlugin({
	base: {
		...createIMessagePluginBase({
			setupWizard: imessageSetupWizard,
			setup: imessageSetupAdapter
		}),
		allowlist: buildDmGroupAccountAllowlistAdapter({
			channelId: "imessage",
			resolveAccount: resolveIMessageAccount,
			normalize: ({ values }) => formatTrimmedAllowFromEntries(values),
			resolveDmAllowFrom: (account) => account.config.allowFrom,
			resolveGroupAllowFrom: (account) => account.config.groupAllowFrom,
			resolveDmPolicy: (account) => account.config.dmPolicy,
			resolveGroupPolicy: (account) => account.config.groupPolicy
		}),
		groups: {
			resolveRequireMention: resolveIMessageGroupRequireMention,
			resolveToolPolicy: resolveIMessageGroupToolPolicy
		},
		doctor: { groupAllowFromFallbackToAllowFrom: false },
		conversationBindings: {
			supportsCurrentConversationBinding: true,
			createManager: ({ cfg, accountId }) => createIMessageConversationBindingManager({
				cfg,
				accountId: accountId ?? void 0
			})
		},
		bindings: {
			compileConfiguredBinding: ({ conversationId }) => normalizeIMessageAcpConversationId(conversationId),
			matchInboundConversation: ({ compiledBinding, conversationId }) => matchIMessageAcpConversation({
				bindingConversationId: compiledBinding.conversationId,
				conversationId
			}),
			resolveCommandConversation: ({ originatingTo, commandTo, fallbackTo }) => {
				const conversationId = resolveIMessageConversationIdFromTarget(originatingTo ?? "") ?? resolveIMessageConversationIdFromTarget(commandTo ?? "") ?? resolveIMessageConversationIdFromTarget(fallbackTo ?? "");
				return conversationId ? { conversationId } : null;
			}
		},
		messaging: {
			normalizeTarget: normalizeIMessageMessagingTarget,
			inferTargetChatType: ({ to }) => inferIMessageTargetChatType(to),
			resolveOutboundSessionRoute: (params) => resolveIMessageOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: looksLikeIMessageExplicitTargetId,
				hint: "<handle|chat_id:ID>",
				resolveTarget: async ({ normalized }) => {
					const to = normalized?.trim();
					if (!to) return null;
					const chatType = inferIMessageTargetChatType(to);
					if (!chatType) return null;
					return {
						to,
						kind: chatType === "direct" ? "user" : "group",
						source: "normalized"
					};
				}
			}
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID, {
				cliPath: null,
				dbPath: null
			}),
			collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("imessage", accounts),
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot, {
				cliPath: snapshot.cliPath ?? null,
				dbPath: snapshot.dbPath ?? null
			}),
			probeAccount: async ({ account, timeoutMs }) => await (await loadIMessageChannelRuntime()).probeIMessageAccount({
				timeoutMs,
				cliPath: account.config.cliPath,
				dbPath: account.config.dbPath
			}),
			resolveAccountSnapshot: ({ account, runtime }) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.configured,
				extra: {
					cliPath: runtime?.cliPath ?? account.config.cliPath ?? null,
					dbPath: runtime?.dbPath ?? account.config.dbPath ?? null
				}
			}),
			resolveAccountState: ({ enabled }) => enabled ? "enabled" : "disabled"
		}),
		gateway: { startAccount: async (ctx) => {
			const conversationBindings = createIMessageConversationBindingManager({
				cfg: ctx.cfg,
				accountId: ctx.accountId
			});
			try {
				return await (await loadIMessageChannelRuntime()).startIMessageGatewayAccount(ctx);
			} finally {
				conversationBindings.stop();
			}
		} }
	},
	pairing: { text: {
		idLabel: "imessageSenderId",
		message: "OpenClaw: your access has been approved.",
		notify: async ({ id }) => await (await loadIMessageChannelRuntime()).notifyIMessageApproval(id)
	} },
	security: imessageSecurityAdapter,
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: chunkTextForOutbound,
			chunkerMode: "text",
			textChunkLimit: 4e3,
			sanitizeText: ({ text }) => sanitizeForPlainText(text)
		},
		attachedResults: {
			channel: "imessage",
			sendText: async ({ cfg, to, text, accountId, deps, replyToId }) => await (await loadIMessageChannelRuntime()).sendIMessageOutbound({
				cfg,
				to,
				text,
				accountId: accountId ?? void 0,
				deps,
				replyToId: replyToId ?? void 0
			}),
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, replyToId }) => await (await loadIMessageChannelRuntime()).sendIMessageOutbound({
				cfg,
				to,
				text,
				mediaUrl,
				mediaLocalRoots,
				accountId: accountId ?? void 0,
				deps,
				replyToId: replyToId ?? void 0
			})
		}
	}
});
//#endregion
//#region extensions/imessage/src/channel.setup.ts
const imessageSetupPlugin = { ...createIMessagePluginBase({
	setupWizard: imessageSetupWizard,
	setup: imessageSetupAdapter
}) };
//#endregion
export { DEFAULT_IMESSAGE_PROBE_TIMEOUT_MS, IMESSAGE_LEGACY_OUTBOUND_SEND_DEP_KEYS, __testing, createAllowedChatSenderMatcher, createIMessageConversationBindingManager, formatIMessageChatTarget, imessagePlugin, imessageSetupPlugin, inferIMessageTargetChatType, isAllowedIMessageSender, listEnabledIMessageAccounts, listIMessageAccountIds, looksLikeIMessageExplicitTargetId, looksLikeIMessageTargetId, matchIMessageAcpConversation, normalizeIMessageAcpConversationId, normalizeIMessageHandle, normalizeIMessageMessagingTarget, parseChatAllowTargetPrefixes, parseChatTargetPrefixesOrThrow, parseIMessageAllowTarget, parseIMessageTarget, probeIMessage, resolveDefaultIMessageAccountId, resolveIMessageAccount, resolveIMessageConversationIdFromTarget, resolveIMessageGroupRequireMention, resolveIMessageGroupToolPolicy, resolveIMessageInboundConversationId, resolveServicePrefixedAllowTarget, resolveServicePrefixedChatTarget, resolveServicePrefixedOrChatAllowTarget, resolveServicePrefixedTarget };
