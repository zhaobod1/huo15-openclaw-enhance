import { g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { a as DmPolicySchema, c as GroupPolicySchema, m as MarkdownConfigSchema } from "./zod-schema.core-BITC5-JP.js";
import { n as buildCatchallMultiAccountChannelSchema, r as buildChannelConfigSchema, t as AllowFromListSchema } from "./config-schema-BEuKmAWr.js";
import { c as jsonResult, h as readStringParam } from "./common-B7pbdYUb.js";
import { l as isNumericTargetId, y as sendPayloadWithChunkedTextAndMedia } from "./reply-payload-Dp5nBPsr.js";
import { c as createScopedChannelConfigAdapter, h as mapAllowFromEntries, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { i as createLazyRuntimeNamedExport, r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { r as describeWebhookAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { n as createStaticReplyToModeResolver } from "./threading-helpers-DainoJbi.js";
import { c as stripTargetKindPrefix, s as stripChannelTargetPrefix, t as buildChannelOutboundSessionRoute } from "./core-D7mi2qmR.js";
import { r as buildSecretInputSchema } from "./secret-input-D5U3kuko.js";
import { t as formatAllowFromLowercase } from "./allow-from-DjymPYUA.js";
import "./channel-config-schema-BT1Xyv2r.js";
import { a as buildOpenGroupPolicyWarning, b as createOpenProviderGroupPolicyWarningCollector, i as buildOpenGroupPolicyRestrictSendersWarning } from "./channel-policy-DIVRdPsQ.js";
import { t as createChannelDirectoryAdapter } from "./directory-runtime-BrmKrim8.js";
import { p as listResolvedDirectoryUserEntriesFromAllowFrom } from "./directory-config-helpers-47ChUpH6.js";
import { d as createDefaultChannelRuntimeState, o as buildTokenChannelStatusSummary, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import { t as extractToolSend } from "./tool-send-C8jvVBdQ.js";
import { n as resolveApprovalApprovers, t as createResolvedApproverActionAuthAdapter } from "./approval-auth-helpers-DNJdxO4L.js";
import "./conversation-runtime-D-TUyzoB.js";
import { i as coerceStatusIssueAccountId, o as readStatusIssueFields } from "./extension-shared-CKz43ndd.js";
import "./channel-actions-DLDrCW4b.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { a as createEmptyChannelResult, o as createRawChannelSendResultAdapter } from "./channel-send-result-6453QwSe.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import "./channel-status-45SWZx-g.js";
import { i as resolveZaloAccount, n as listZaloAccountIds, r as resolveDefaultZaloAccountId, t as listEnabledZaloAccounts } from "./accounts-Bez10r8d.js";
import { n as secretTargetRegistryEntries, t as collectRuntimeConfigAssignments } from "./secret-contract-QJcxUJyw.js";
import { r as zaloSetupAdapter, t as createZaloSetupWizardProxy } from "./setup-core-YXE84urA.js";
//#region extensions/zalo/src/actions.ts
const loadZaloActionsRuntime = createLazyRuntimeNamedExport(() => import("./actions.runtime-ehK7tIJE.js"), "zaloActionsRuntime");
const providerId = "zalo";
function listEnabledAccounts(cfg, accountId) {
	return (accountId ? [resolveZaloAccount({
		cfg,
		accountId
	})] : listEnabledZaloAccounts(cfg)).filter((account) => account.enabled && account.tokenSource !== "none");
}
const zaloMessageActions = {
	describeMessageTool: ({ cfg, accountId }) => {
		if (listEnabledAccounts(cfg, accountId).length === 0) return null;
		const actions = new Set(["send"]);
		return {
			actions: Array.from(actions),
			capabilities: []
		};
	},
	extractToolSend: ({ args }) => extractToolSend(args, "sendMessage"),
	handleAction: async ({ action, params, cfg, accountId }) => {
		if (action === "send") {
			const to = readStringParam(params, "to", { required: true });
			const content = readStringParam(params, "message", {
				required: true,
				allowEmpty: true
			});
			const mediaUrl = readStringParam(params, "media", { trim: false });
			const { sendMessageZalo } = await loadZaloActionsRuntime();
			const result = await sendMessageZalo(to ?? "", content ?? "", {
				accountId: accountId ?? void 0,
				mediaUrl: mediaUrl ?? void 0,
				cfg
			});
			if (!result.ok) return jsonResult({
				ok: false,
				error: result.error ?? "Failed to send Zalo message"
			});
			return jsonResult({
				ok: true,
				to,
				messageId: result.messageId
			});
		}
		throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
	}
};
//#endregion
//#region extensions/zalo/src/approval-auth.ts
function normalizeZaloApproverId(value) {
	const normalized = String(value).trim().replace(/^(zalo|zl):/i, "").trim();
	return /^\d+$/.test(normalized) ? normalized : void 0;
}
const zaloApprovalAuth = createResolvedApproverActionAuthAdapter({
	channelLabel: "Zalo",
	resolveApprovers: ({ cfg, accountId }) => {
		const account = resolveZaloAccount({
			cfg,
			accountId
		}).config;
		return resolveApprovalApprovers({
			allowFrom: account.allowFrom,
			normalizeApprover: normalizeZaloApproverId
		});
	},
	normalizeSenderId: (value) => normalizeZaloApproverId(value)
});
const ZaloConfigSchema = buildCatchallMultiAccountChannelSchema(zod_exports.z.object({
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	markdown: MarkdownConfigSchema,
	botToken: buildSecretInputSchema().optional(),
	tokenFile: zod_exports.z.string().optional(),
	webhookUrl: zod_exports.z.string().optional(),
	webhookSecret: buildSecretInputSchema().optional(),
	webhookPath: zod_exports.z.string().optional(),
	dmPolicy: DmPolicySchema.optional(),
	allowFrom: AllowFromListSchema,
	groupPolicy: GroupPolicySchema.optional(),
	groupAllowFrom: AllowFromListSchema,
	mediaMaxMb: zod_exports.z.number().optional(),
	proxy: zod_exports.z.string().optional(),
	responsePrefix: zod_exports.z.string().optional()
}));
//#endregion
//#region extensions/zalo/src/session-route.ts
function resolveZaloOutboundSessionRoute(params) {
	const trimmed = stripChannelTargetPrefix(params.target, "zalo", "zl");
	if (!trimmed) return null;
	const isGroup = trimmed.toLowerCase().startsWith("group:");
	const peerId = stripTargetKindPrefix(trimmed);
	if (!peerId) return null;
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "zalo",
		accountId: params.accountId,
		peer: {
			kind: isGroup ? "group" : "direct",
			id: peerId
		},
		chatType: isGroup ? "group" : "direct",
		from: isGroup ? `zalo:group:${peerId}` : `zalo:${peerId}`,
		to: `zalo:${peerId}`
	});
}
//#endregion
//#region extensions/zalo/src/status-issues.ts
const ZALO_STATUS_FIELDS = [
	"accountId",
	"enabled",
	"configured",
	"dmPolicy"
];
function collectZaloStatusIssues(accounts) {
	const issues = [];
	for (const entry of accounts) {
		const account = readStatusIssueFields(entry, ZALO_STATUS_FIELDS);
		if (!account) continue;
		const accountId = coerceStatusIssueAccountId(account.accountId) ?? "default";
		const enabled = account.enabled !== false;
		const configured = account.configured === true;
		if (!enabled || !configured) continue;
		if (account.dmPolicy === "open") issues.push({
			channel: "zalo",
			accountId,
			kind: "config",
			message: "Zalo dmPolicy is \"open\", allowing any user to message the bot without pairing.",
			fix: "Set channels.zalo.dmPolicy to \"pairing\" or \"allowlist\" to restrict access."
		});
	}
	return issues;
}
//#endregion
//#region extensions/zalo/src/channel.ts
const meta = {
	id: "zalo",
	label: "Zalo",
	selectionLabel: "Zalo (Bot API)",
	docsPath: "/channels/zalo",
	docsLabel: "zalo",
	blurb: "Vietnam-focused messaging platform with Bot API.",
	aliases: ["zl"],
	order: 80,
	quickstartAllowFrom: true
};
function normalizeZaloMessagingTarget(raw) {
	const trimmed = raw?.trim();
	if (!trimmed) return;
	return trimmed.replace(/^(zalo|zl):/i, "").trim();
}
function chunkTextForOutbound(text, limit) {
	const chunks = [];
	let remaining = text;
	while (remaining.length > limit) {
		const window = remaining.slice(0, limit);
		const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
		const breakAt = splitAt > 0 ? splitAt : limit;
		chunks.push(remaining.slice(0, breakAt).trimEnd());
		remaining = remaining.slice(breakAt).trimStart();
	}
	if (remaining.length > 0 || text.length === 0) chunks.push(remaining);
	return chunks;
}
const loadZaloChannelRuntime = createLazyRuntimeModule(() => import("./channel.runtime-DiXDwU7e.js"));
const zaloSetupWizard = createZaloSetupWizardProxy(async () => (await import("./setup-surface-CUYo4xKg.js")).zaloSetupWizard);
const zaloTextChunkLimit = 2e3;
const zaloRawSendResultAdapter = createRawChannelSendResultAdapter({
	channel: "zalo",
	sendText: async ({ to, text, accountId, cfg }) => await (await loadZaloChannelRuntime()).sendZaloText({
		to,
		text,
		accountId: accountId ?? void 0,
		cfg
	}),
	sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => await (await loadZaloChannelRuntime()).sendZaloText({
		to,
		text,
		accountId: accountId ?? void 0,
		mediaUrl,
		cfg
	})
});
const zaloConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: "zalo",
	listAccountIds: listZaloAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveZaloAccount),
	defaultAccountId: resolveDefaultZaloAccountId,
	clearBaseFields: [
		"botToken",
		"tokenFile",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({
		allowFrom,
		stripPrefixRe: /^(zalo|zl):/i
	})
});
const resolveZaloDmPolicy = createScopedDmSecurityResolver({
	channelKey: "zalo",
	resolvePolicy: (account) => account.config.dmPolicy,
	resolveAllowFrom: (account) => account.config.allowFrom,
	policyPathSuffix: "dmPolicy",
	normalizeEntry: (raw) => raw.trim().replace(/^(zalo|zl):/i, "")
});
const collectZaloSecurityWarnings = createOpenProviderGroupPolicyWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.zalo !== void 0,
	resolveGroupPolicy: ({ account }) => account.config.groupPolicy,
	collect: ({ account, groupPolicy }) => {
		if (groupPolicy !== "open") return [];
		const explicitGroupAllowFrom = mapAllowFromEntries(account.config.groupAllowFrom);
		const dmAllowFrom = mapAllowFromEntries(account.config.allowFrom);
		if ((explicitGroupAllowFrom.length > 0 ? explicitGroupAllowFrom : dmAllowFrom).length > 0) return [buildOpenGroupPolicyRestrictSendersWarning({
			surface: "Zalo groups",
			openScope: "any member",
			groupPolicyPath: "channels.zalo.groupPolicy",
			groupAllowFromPath: "channels.zalo.groupAllowFrom"
		})];
		return [buildOpenGroupPolicyWarning({
			surface: "Zalo groups",
			openBehavior: "with no groupAllowFrom/allowFrom allowlist; any member can trigger (mention-gated)",
			remediation: "Set channels.zalo.groupPolicy=\"allowlist\" + channels.zalo.groupAllowFrom"
		})];
	}
});
const zaloPlugin = createChatChannelPlugin({
	base: {
		id: "zalo",
		meta,
		setup: zaloSetupAdapter,
		setupWizard: zaloSetupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true,
			reactions: false,
			threads: false,
			polls: false,
			nativeCommands: false,
			blockStreaming: true
		},
		reload: { configPrefixes: ["channels.zalo"] },
		configSchema: buildChannelConfigSchema(ZaloConfigSchema),
		config: {
			...zaloConfigAdapter,
			isConfigured: (account) => Boolean(account.token?.trim()),
			describeAccount: (account) => describeWebhookAccountSnapshot({
				account,
				configured: Boolean(account.token?.trim()),
				mode: account.config.webhookUrl ? "webhook" : "polling",
				extra: { tokenSource: account.tokenSource }
			})
		},
		auth: zaloApprovalAuth,
		secrets: {
			secretTargetRegistryEntries,
			collectRuntimeConfigAssignments
		},
		groups: { resolveRequireMention: () => true },
		actions: zaloMessageActions,
		messaging: {
			normalizeTarget: normalizeZaloMessagingTarget,
			resolveOutboundSessionRoute: (params) => resolveZaloOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: isNumericTargetId,
				hint: "<chatId>"
			}
		},
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => listResolvedDirectoryUserEntriesFromAllowFrom({
				...params,
				resolveAccount: adaptScopedAccountAccessor(resolveZaloAccount),
				resolveAllowFrom: (account) => account.config.allowFrom,
				normalizeId: (entry) => entry.trim().replace(/^(zalo|zl):/i, "")
			}),
			listGroups: async () => []
		}),
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: collectZaloStatusIssues,
			buildChannelSummary: ({ snapshot }) => buildTokenChannelStatusSummary(snapshot),
			probeAccount: async ({ account, timeoutMs }) => await (await loadZaloChannelRuntime()).probeZaloAccount({
				account,
				timeoutMs
			}),
			resolveAccountSnapshot: ({ account }) => {
				const configured = Boolean(account.token?.trim());
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured,
					extra: {
						tokenSource: account.tokenSource,
						mode: account.config.webhookUrl ? "webhook" : "polling",
						dmPolicy: account.config.dmPolicy ?? "pairing"
					}
				};
			}
		}),
		gateway: { startAccount: async (ctx) => await (await loadZaloChannelRuntime()).startZaloGatewayAccount(ctx) }
	},
	security: {
		resolveDmPolicy: resolveZaloDmPolicy,
		collectWarnings: collectZaloSecurityWarnings
	},
	pairing: { text: {
		idLabel: "zaloUserId",
		message: "Your pairing request has been approved.",
		normalizeAllowEntry: (entry) => entry.trim().replace(/^(zalo|zl):/i, ""),
		notify: async (params) => await (await loadZaloChannelRuntime()).notifyZaloPairingApproval(params)
	} },
	threading: { resolveReplyToMode: createStaticReplyToModeResolver("off") },
	outbound: {
		deliveryMode: "direct",
		chunker: chunkTextForOutbound,
		chunkerMode: "text",
		textChunkLimit: zaloTextChunkLimit,
		sendPayload: async (ctx) => await sendPayloadWithChunkedTextAndMedia({
			ctx,
			textChunkLimit: zaloTextChunkLimit,
			chunker: chunkTextForOutbound,
			sendText: (nextCtx) => zaloRawSendResultAdapter.sendText(nextCtx),
			sendMedia: (nextCtx) => zaloRawSendResultAdapter.sendMedia(nextCtx),
			emptyResult: createEmptyChannelResult("zalo")
		}),
		...zaloRawSendResultAdapter
	}
});
//#endregion
export { zaloPlugin as t };
