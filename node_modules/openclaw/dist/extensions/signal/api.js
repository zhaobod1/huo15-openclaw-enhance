import { u as normalizeE164 } from "../../utils-ms6h9yny.js";
import { g as DEFAULT_ACCOUNT_ID } from "../../session-key-BR3Z-ljs.js";
import { a as chunkText, c as resolveTextChunkLimit } from "../../chunk-CKMbnOQL.js";
import { t as resolveOutboundSendDep } from "../../send-deps-CVbk0lDS.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor } from "../../channel-config-helpers-CWYUF2eN.js";
import { n as describeAccountSnapshot } from "../../account-helpers-A6tF0W1f.js";
import { t as buildOutboundBaseSessionKey } from "../../base-session-key-2NJCUHEq.js";
import { n as createChannelPluginBase, o as getChatChannelMeta } from "../../core-D7mi2qmR.js";
import "../../routing-DdBDhOmH.js";
import { t as resolveMarkdownTableMode } from "../../markdown-tables-hkAZKOT1.js";
import { n as createRestrictSendersChannelSecurity } from "../../channel-policy-DIVRdPsQ.js";
import { t as resolveChannelMediaMaxBytes } from "../../media-limits-bs8TnBXO.js";
import { t as PAIRING_APPROVED_MESSAGE } from "../../pairing-message-B1YYl-hh.js";
import "../../text-runtime-DQoOM_co.js";
import { i as createPairingPrefixStripper } from "../../channel-pairing-DrJTvhRN.js";
import { c as collectStatusIssuesFromLastError, d as createDefaultChannelRuntimeState, n as buildBaseChannelStatusSummary, u as createComputedAccountStatusAdapter } from "../../status-helpers-ChR3_7qO.js";
import { n as resolveApprovalApprovers, t as createResolvedApproverActionAuthAdapter } from "../../approval-auth-helpers-DNJdxO4L.js";
import "../../config-runtime-OuR9WVXH.js";
import "../../reply-chunking-D9XwfVhm.js";
import "../../outbound-runtime-BSC4z6CP.js";
import "../../media-runtime-BfmVsgHe.js";
import { n as buildDmGroupAccountAllowlistAdapter } from "../../allowlist-config-edit-CWwW-8J5.js";
import { n as createChatChannelPlugin } from "../../channel-core-BVR4R0_P.js";
import { n as attachChannelToResults, t as attachChannelToResult } from "../../channel-send-result-6453QwSe.js";
import "../../channel-status-45SWZx-g.js";
import { i as resolveSignalAccount, n as listSignalAccountIds, r as resolveDefaultSignalAccountId, t as listEnabledSignalAccounts } from "../../accounts-Djmr8-2w.js";
import { a as isSignalSenderAllowed, c as resolveSignalRecipient, d as looksLikeSignalTargetId, f as normalizeSignalMessagingTarget, i as isSignalGroupAllowed, l as resolveSignalSender, n as formatSignalSenderDisplay, o as normalizeSignalAllowRecipient, r as formatSignalSenderId, s as resolveSignalPeerId, t as formatSignalPairingIdLine, u as looksLikeUuid } from "../../identity-DBsX0ipI.js";
import { a as markdownToSignalTextChunks, i as markdownToSignalText, n as sendReadReceiptSignal, r as sendTypingSignal, t as sendMessageSignal } from "../../send-3Z2AUP3Q.js";
import { n as sendReactionSignal, t as removeReactionSignal } from "../../reaction-runtime-api-DIeFM-gy.js";
import { n as resolveSignalReactionLevel, t as signalMessageActions } from "../../message-actions-BhTVcqwb.js";
import { n as createSignalSetupWizardProxy, r as normalizeSignalAccountInput, s as signalSetupAdapter } from "../../setup-core-ngfuiQCB.js";
import { t as SignalChannelConfigSchema } from "../../config-schema-qifoVvec.js";
import { i as pickAsset, n as installSignalCli, r as looksLikeArchive, t as extractSignalCliArchive } from "../../install-signal-cli-PhpwGNBy.js";
import { t as monitorSignalProvider } from "../../monitor-ssbAt9_T.js";
import { t as probeSignal } from "../../probe-BfGtmhxU.js";
//#region extensions/signal/src/approval-auth.ts
function normalizeSignalApproverId(value) {
	const normalized = normalizeSignalMessagingTarget(String(value));
	if (!normalized || normalized.startsWith("group:") || normalized.startsWith("username:")) return;
	if (looksLikeUuid(normalized)) return `uuid:${normalized}`;
	const e164 = normalizeE164(normalized);
	return e164.length > 1 ? e164 : void 0;
}
const signalApprovalAuth = createResolvedApproverActionAuthAdapter({
	channelLabel: "Signal",
	resolveApprovers: ({ cfg, accountId }) => {
		const account = resolveSignalAccount({
			cfg,
			accountId
		}).config;
		return resolveApprovalApprovers({
			allowFrom: account.allowFrom,
			defaultTo: account.defaultTo,
			normalizeApprover: normalizeSignalApproverId
		});
	},
	normalizeSenderId: (value) => normalizeSignalApproverId(value)
});
//#endregion
//#region extensions/signal/src/outbound-session.ts
function resolveSignalOutboundTarget(target) {
	const stripped = target.replace(/^signal:/i, "").trim();
	const lowered = stripped.toLowerCase();
	if (lowered.startsWith("group:")) {
		const groupId = stripped.slice(6).trim();
		if (!groupId) return null;
		return {
			peer: {
				kind: "group",
				id: groupId
			},
			chatType: "group",
			from: `group:${groupId}`,
			to: `group:${groupId}`
		};
	}
	let recipient = stripped.trim();
	if (lowered.startsWith("username:")) recipient = stripped.slice(9).trim();
	else if (lowered.startsWith("u:")) recipient = stripped.slice(2).trim();
	if (!recipient) return null;
	const uuidCandidate = recipient.toLowerCase().startsWith("uuid:") ? recipient.slice(5) : recipient;
	const sender = resolveSignalSender({
		sourceUuid: looksLikeUuid(uuidCandidate) ? uuidCandidate : null,
		sourceNumber: looksLikeUuid(uuidCandidate) ? null : recipient
	});
	const peerId = sender ? resolveSignalPeerId(sender) : recipient;
	const displayRecipient = sender ? resolveSignalRecipient(sender) : recipient;
	return {
		peer: {
			kind: "direct",
			id: peerId
		},
		chatType: "direct",
		from: `signal:${displayRecipient}`,
		to: `signal:${displayRecipient}`
	};
}
//#endregion
//#region extensions/signal/src/shared.ts
const SIGNAL_CHANNEL = "signal";
async function loadSignalChannelRuntime() {
	return await import("../../channel.runtime-Cn49MweQ.js");
}
const signalSetupWizard = createSignalSetupWizardProxy(async () => (await loadSignalChannelRuntime()).signalSetupWizard);
const signalConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: SIGNAL_CHANNEL,
	listAccountIds: (cfg) => listSignalAccountIds(cfg),
	resolveAccount: adaptScopedAccountAccessor((params) => resolveSignalAccount(params)),
	defaultAccountId: (cfg) => resolveDefaultSignalAccountId(cfg),
	clearBaseFields: [
		"account",
		"httpUrl",
		"httpHost",
		"httpPort",
		"cliPath",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean).map((entry) => entry === "*" ? "*" : normalizeE164(entry.replace(/^signal:/i, ""))).filter(Boolean),
	resolveDefaultTo: (account) => account.config.defaultTo
});
const signalSecurityAdapter = createRestrictSendersChannelSecurity({
	channelKey: SIGNAL_CHANNEL,
	resolveDmPolicy: (account) => account.config.dmPolicy,
	resolveDmAllowFrom: (account) => account.config.allowFrom,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "Signal groups",
	openScope: "any member",
	groupPolicyPath: "channels.signal.groupPolicy",
	groupAllowFromPath: "channels.signal.groupAllowFrom",
	mentionGated: false,
	policyPathSuffix: "dmPolicy",
	normalizeDmEntry: (raw) => normalizeE164(raw.replace(/^signal:/i, "").trim())
});
function createSignalPluginBase(params) {
	return {
		...createChannelPluginBase({
			id: SIGNAL_CHANNEL,
			meta: { ...getChatChannelMeta(SIGNAL_CHANNEL) },
			setupWizard: params.setupWizard,
			capabilities: {
				chatTypes: ["direct", "group"],
				media: true,
				reactions: true
			},
			streaming: { blockStreamingCoalesceDefaults: {
				minChars: 1500,
				idleMs: 1e3
			} },
			reload: { configPrefixes: ["channels.signal"] },
			configSchema: SignalChannelConfigSchema,
			config: {
				...signalConfigAdapter,
				isConfigured: (account) => account.configured,
				describeAccount: (account) => describeAccountSnapshot({
					account,
					configured: account.configured,
					extra: { baseUrl: account.baseUrl }
				})
			},
			security: signalSecurityAdapter,
			setup: params.setup
		}),
		messaging: { defaultMarkdownTableMode: "bullets" }
	};
}
//#endregion
//#region extensions/signal/src/channel.ts
let signalMonitorModulePromise = null;
let signalProbeModulePromise = null;
let signalSendRuntimePromise = null;
async function loadSignalMonitorModule() {
	signalMonitorModulePromise ??= import("../../monitor-DtXQVQNQ.js");
	return await signalMonitorModulePromise;
}
async function loadSignalProbeModule() {
	signalProbeModulePromise ??= import("../../probe-2Vd4IqXt.js");
	return await signalProbeModulePromise;
}
async function loadSignalSendRuntime() {
	signalSendRuntimePromise ??= import("../../send.runtime-BI61phQz.js");
	return await signalSendRuntimePromise;
}
async function resolveSignalSendContext(params) {
	return {
		send: resolveOutboundSendDep(params.deps, "signal") ?? (await loadSignalSendRuntime()).sendMessageSignal,
		maxBytes: resolveChannelMediaMaxBytes({
			cfg: params.cfg,
			resolveChannelLimitMb: ({ cfg, accountId }) => cfg.channels?.signal?.accounts?.[accountId]?.mediaMaxMb ?? cfg.channels?.signal?.mediaMaxMb,
			accountId: params.accountId
		})
	};
}
async function sendSignalOutbound(params) {
	const { send, maxBytes } = await resolveSignalSendContext(params);
	return await send(params.to, params.text, {
		cfg: params.cfg,
		...params.mediaUrl ? { mediaUrl: params.mediaUrl } : {},
		...params.mediaLocalRoots?.length ? { mediaLocalRoots: params.mediaLocalRoots } : {},
		...params.mediaReadFile ? { mediaReadFile: params.mediaReadFile } : {},
		maxBytes,
		accountId: params.accountId ?? void 0
	});
}
function inferSignalTargetChatType(rawTo) {
	let to = rawTo.trim();
	if (!to) return;
	if (/^signal:/i.test(to)) to = to.replace(/^signal:/i, "").trim();
	if (!to) return;
	const lower = to.toLowerCase();
	if (lower.startsWith("group:")) return "group";
	if (lower.startsWith("username:") || lower.startsWith("u:")) return "direct";
	return "direct";
}
function parseSignalExplicitTarget(raw) {
	const normalized = normalizeSignalMessagingTarget(raw);
	if (!normalized) return null;
	return {
		to: normalized,
		chatType: inferSignalTargetChatType(normalized)
	};
}
function buildSignalBaseSessionKey(params) {
	return buildOutboundBaseSessionKey({
		...params,
		channel: "signal"
	});
}
function resolveSignalOutboundSessionRoute(params) {
	const resolved = resolveSignalOutboundTarget(params.target);
	if (!resolved) return null;
	const baseSessionKey = buildSignalBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: params.accountId,
		peer: resolved.peer
	});
	return {
		sessionKey: baseSessionKey,
		baseSessionKey,
		...resolved
	};
}
async function sendFormattedSignalText(ctx) {
	const { send, maxBytes } = await resolveSignalSendContext({
		cfg: ctx.cfg,
		accountId: ctx.accountId ?? void 0,
		deps: ctx.deps
	});
	const limit = resolveTextChunkLimit(ctx.cfg, "signal", ctx.accountId ?? void 0, { fallbackLimit: 4e3 });
	const tableMode = resolveMarkdownTableMode({
		cfg: ctx.cfg,
		channel: "signal",
		accountId: ctx.accountId ?? void 0
	});
	let chunks = limit === void 0 ? markdownToSignalTextChunks(ctx.text, Number.POSITIVE_INFINITY, { tableMode }) : markdownToSignalTextChunks(ctx.text, limit, { tableMode });
	if (chunks.length === 0 && ctx.text) chunks = [{
		text: ctx.text,
		styles: []
	}];
	const results = [];
	for (const chunk of chunks) {
		ctx.abortSignal?.throwIfAborted();
		const result = await send(ctx.to, chunk.text, {
			cfg: ctx.cfg,
			maxBytes,
			accountId: ctx.accountId ?? void 0,
			textMode: "plain",
			textStyles: chunk.styles
		});
		results.push(result);
	}
	return attachChannelToResults("signal", results);
}
async function sendFormattedSignalMedia(ctx) {
	ctx.abortSignal?.throwIfAborted();
	const { send, maxBytes } = await resolveSignalSendContext({
		cfg: ctx.cfg,
		accountId: ctx.accountId ?? void 0,
		deps: ctx.deps
	});
	const tableMode = resolveMarkdownTableMode({
		cfg: ctx.cfg,
		channel: "signal",
		accountId: ctx.accountId ?? void 0
	});
	const formatted = markdownToSignalTextChunks(ctx.text, Number.POSITIVE_INFINITY, { tableMode })[0] ?? {
		text: ctx.text,
		styles: []
	};
	return attachChannelToResult("signal", await send(ctx.to, formatted.text, {
		cfg: ctx.cfg,
		mediaUrl: ctx.mediaUrl,
		mediaLocalRoots: ctx.mediaLocalRoots,
		...ctx.mediaReadFile ? { mediaReadFile: ctx.mediaReadFile } : {},
		maxBytes,
		accountId: ctx.accountId ?? void 0,
		textMode: "plain",
		textStyles: formatted.styles
	}));
}
const signalPlugin = createChatChannelPlugin({
	base: {
		...createSignalPluginBase({
			setupWizard: signalSetupWizard,
			setup: signalSetupAdapter
		}),
		actions: signalMessageActions,
		auth: signalApprovalAuth,
		allowlist: buildDmGroupAccountAllowlistAdapter({
			channelId: "signal",
			resolveAccount: resolveSignalAccount,
			normalize: ({ cfg, accountId, values }) => signalConfigAdapter.formatAllowFrom({
				cfg,
				accountId,
				allowFrom: values
			}),
			resolveDmAllowFrom: (account) => account.config.allowFrom,
			resolveGroupAllowFrom: (account) => account.config.groupAllowFrom,
			resolveDmPolicy: (account) => account.config.dmPolicy,
			resolveGroupPolicy: (account) => account.config.groupPolicy
		}),
		agentPrompt: { reactionGuidance: ({ cfg, accountId }) => {
			const level = resolveSignalReactionLevel({
				cfg,
				accountId: accountId ?? void 0
			}).agentReactionGuidance;
			return level ? {
				level,
				channelLabel: "Signal"
			} : void 0;
		} },
		messaging: {
			normalizeTarget: normalizeSignalMessagingTarget,
			parseExplicitTarget: ({ raw }) => parseSignalExplicitTarget(raw),
			inferTargetChatType: ({ to }) => inferSignalTargetChatType(to),
			resolveOutboundSessionRoute: (params) => resolveSignalOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: looksLikeSignalTargetId,
				hint: "<E.164|uuid:ID|group:ID|signal:group:ID|signal:+E.164>"
			}
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("signal", accounts),
			buildChannelSummary: ({ snapshot }) => buildBaseChannelStatusSummary(snapshot, {
				baseUrl: snapshot.baseUrl ?? null,
				probe: snapshot.probe,
				lastProbeAt: snapshot.lastProbeAt ?? null
			}),
			probeAccount: async ({ account, timeoutMs }) => {
				const baseUrl = account.baseUrl;
				const { probeSignal } = await loadSignalProbeModule();
				return await probeSignal(baseUrl, timeoutMs);
			},
			formatCapabilitiesProbe: ({ probe }) => probe?.version ? [{ text: `Signal daemon: ${probe.version}` }] : [],
			resolveAccountSnapshot: ({ account }) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.configured,
				extra: { baseUrl: account.baseUrl }
			})
		}),
		gateway: { startAccount: async (ctx) => {
			const account = ctx.account;
			ctx.setStatus({
				accountId: account.accountId,
				baseUrl: account.baseUrl
			});
			ctx.log?.info(`[${account.accountId}] starting provider (${account.baseUrl})`);
			const { monitorSignalProvider } = await loadSignalMonitorModule();
			return await monitorSignalProvider({
				accountId: account.accountId,
				config: ctx.cfg,
				runtime: ctx.runtime,
				abortSignal: ctx.abortSignal,
				mediaMaxMb: account.config.mediaMaxMb
			});
		} }
	},
	pairing: { text: {
		idLabel: "signalNumber",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^signal:/i),
		notify: async ({ id, message }) => {
			await (await loadSignalSendRuntime()).sendMessageSignal(id, message);
		}
	} },
	security: signalSecurityAdapter,
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: chunkText,
			chunkerMode: "text",
			textChunkLimit: 4e3,
			sendFormattedText: async ({ cfg, to, text, accountId, deps, abortSignal }) => await sendFormattedSignalText({
				cfg,
				to,
				text,
				accountId,
				deps,
				abortSignal
			}),
			sendFormattedMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, mediaReadFile, accountId, deps, abortSignal }) => await sendFormattedSignalMedia({
				cfg,
				to,
				text,
				mediaUrl,
				mediaLocalRoots,
				mediaReadFile,
				accountId,
				deps,
				abortSignal
			})
		},
		attachedResults: {
			channel: "signal",
			sendText: async ({ cfg, to, text, accountId, deps }) => await sendSignalOutbound({
				cfg,
				to,
				text,
				accountId: accountId ?? void 0,
				deps
			}),
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, mediaReadFile, accountId, deps }) => await sendSignalOutbound({
				cfg,
				to,
				text,
				mediaUrl,
				mediaLocalRoots,
				mediaReadFile,
				accountId: accountId ?? void 0,
				deps
			})
		}
	}
});
//#endregion
//#region extensions/signal/src/channel.setup.ts
const signalSetupPlugin = { ...createSignalPluginBase({
	setupWizard: signalSetupWizard,
	setup: signalSetupAdapter
}) };
//#endregion
export { extractSignalCliArchive, formatSignalPairingIdLine, formatSignalSenderDisplay, formatSignalSenderId, installSignalCli, isSignalGroupAllowed, isSignalSenderAllowed, listEnabledSignalAccounts, listSignalAccountIds, looksLikeArchive, looksLikeSignalTargetId, looksLikeUuid, markdownToSignalText, markdownToSignalTextChunks, monitorSignalProvider, normalizeSignalAccountInput, normalizeSignalAllowRecipient, normalizeSignalMessagingTarget, pickAsset, probeSignal, removeReactionSignal, resolveDefaultSignalAccountId, resolveSignalAccount, resolveSignalOutboundTarget, resolveSignalPeerId, resolveSignalReactionLevel, resolveSignalRecipient, resolveSignalSender, sendMessageSignal, sendReactionSignal, sendReadReceiptSignal, sendTypingSignal, signalMessageActions, signalPlugin, signalSetupPlugin };
