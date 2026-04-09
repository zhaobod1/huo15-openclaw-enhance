import { l as isRecord } from "./utils-ms6h9yny.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { d as resolveThreadSessionKeys, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { a as hasConfiguredSecretInput } from "./types.secrets-BZdSA8i7.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { f as resolvePayloadMediaUrls, v as sendPayloadMediaSequenceOrFallback } from "./reply-payload-Dp5nBPsr.js";
import { o as resolveInteractiveTextFallback } from "./payload-Dw_f_f7y.js";
import { t as resolveOutboundSendDep } from "./send-deps-CVbk0lDS.js";
import { t as clearAccountEntryFields } from "./config-helpers-C78vnTXw.js";
import { h as mapAllowFromEntries } from "./channel-config-helpers-CWYUF2eN.js";
import { n as resolveChannelGroupRequireMention, r as resolveChannelGroupToolsPolicy } from "./group-policy-D1X7pmp3.js";
import { n as collectTelegramUnmentionedGroupIds, t as auditTelegramGroupMembership } from "./audit-BSMiXuk0.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-2NJCUHEq.js";
import { n as applySetupAccountConfigPatch, r as createEnvPatchedAccountSetupAdapter } from "./setup-helpers-BiAtGxsL.js";
import { t as normalizeOutboundThreadId } from "./routing-DdBDhOmH.js";
import { t as resolveTelegramToken } from "./token-DXMy9X9J.js";
import { u as resolveChannelAllowFromPath } from "./pairing-store--adbbV4I.js";
import { g as createAllowlistProviderRouteAllowlistWarningCollector } from "./channel-policy-DIVRdPsQ.js";
import { t as createChannelDirectoryAdapter } from "./directory-runtime-BrmKrim8.js";
import { r as createInspectedDirectoryEntriesLister } from "./directory-config-helpers-47ChUpH6.js";
import { J as setSetupChannelEnabled, N as promptResolvedAllowFrom, Q as splitSetupEntries, T as patchChannelConfigForAccount, a as createAllowFromSection, f as createStandardChannelSetupStatus, t as addWildcardAllowFrom } from "./setup-wizard-helpers-ecC16ic3.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-B1YYl-hh.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-DrJTvhRN.js";
import { _ as resolveEnabledConfiguredAccountId, d as createDefaultChannelRuntimeState, m as asString, o as buildTokenChannelStatusSummary, p as appendMatchMetadata, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./setup-Dp8bIdbL.js";
import "./setup-runtime-QdMg-xhs.js";
import "./setup-tools-DC-2q-4o.js";
import { a as resolveConfiguredFromCredentialStatuses, r as projectCredentialSnapshotFields } from "./account-snapshot-fields-mnjlKuYD.js";
import { t as sanitizeForPlainText } from "./sanitize-text-9E3ODlSk.js";
import "./outbound-runtime-BSC4z6CP.js";
import { c as createNestedAllowlistOverrideResolver, n as buildDmGroupAccountAllowlistAdapter } from "./allowlist-config-edit-CWwW-8J5.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { i as createAttachedChannelResultAdapter, t as attachChannelToResult } from "./channel-send-result-6453QwSe.js";
import "./channel-status-45SWZx-g.js";
import { f as resolveDefaultTelegramAccountId, i as parseTelegramTarget, l as listTelegramAccountIds, p as resolveTelegramAccount, r as normalizeTelegramLookupTarget, u as mergeTelegramAccountConfig } from "./targets-CzovValH.js";
import { a as inspectTelegramAccount, i as telegramConfigAdapter, n as findTelegramTokenOwnerAccountId, r as formatDuplicateTelegramTokenReason, s as lookupTelegramChatId, t as createTelegramPluginBase } from "./shared-BcMjbMbX.js";
import { r as resolveTelegramInlineButtonsScope } from "./inline-buttons-CHdvIUEe.js";
import { f as shouldSuppressLocalTelegramExecApprovalPrompt } from "./exec-approvals-Vma-Sn09.js";
import { t as telegramApprovalCapability } from "./approval-native-D9jWrAoL.js";
import { F as parseTelegramReplyToMessageId, I as parseTelegramThreadId, i as markdownToTelegramHtmlChunks, u as buildTelegramGroupPeerId } from "./api-logging-CFUWewS8.js";
import { i as buildTelegramExecApprovalPendingPayload, r as monitorTelegramProvider, s as telegramMessageActions$1, t as probeTelegram } from "./probe-bz2lFjjJ.js";
import { d as sendPollTelegram, p as sendTypingTelegram, u as sendMessageTelegram } from "./send-ioWMozJY.js";
import { t as resolveTelegramInlineButtons } from "./button-types-OGaGEpDj.js";
import { t as resolveTelegramReactionLevel } from "./reaction-level--sP9_aDQ.js";
import { t as getTelegramRuntime } from "./runtime-BMv2XWyy.js";
import { t as collectTelegramSecurityAuditFindings } from "./security-audit-DNhN4HVV.js";
import { t as parseTelegramTopicConversation } from "./topic-conversation-CNt_Cuq0.js";
import { t as resolveTelegramSessionConversation } from "./session-conversation-c2aY7Vsn.js";
import { a as setTelegramThreadBindingMaxAgeBySessionKey, i as setTelegramThreadBindingIdleTimeoutBySessionKey, t as createTelegramThreadBindingManager } from "./thread-bindings-CF7vahMj.js";
import fs from "node:fs";
//#region extensions/telegram/src/action-threading.ts
function resolveTelegramAutoThreadId(params) {
	const context = params.toolContext;
	if (!context?.currentThreadTs || !context.currentChannelId) return;
	const parsedTo = parseTelegramTarget(params.to);
	if (parsedTo.messageThreadId != null) return;
	const parsedChannel = parseTelegramTarget(context.currentChannelId);
	if (parsedTo.chatId.toLowerCase() !== parsedChannel.chatId.toLowerCase()) return;
	return context.currentThreadTs;
}
//#endregion
//#region extensions/telegram/src/directory-config.ts
const listTelegramDirectoryPeersFromConfig = createInspectedDirectoryEntriesLister({
	kind: "user",
	inspectAccount: (cfg, accountId) => inspectTelegramAccount({
		cfg,
		accountId
	}),
	resolveSources: (account) => [mapAllowFromEntries(account.config.allowFrom), Object.keys(account.config.dms ?? {})],
	normalizeId: (entry) => {
		const trimmed = entry.replace(/^(telegram|tg):/i, "").trim();
		if (!trimmed) return null;
		if (/^-?\d+$/.test(trimmed)) return trimmed;
		return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
	}
});
const listTelegramDirectoryGroupsFromConfig = createInspectedDirectoryEntriesLister({
	kind: "group",
	inspectAccount: (cfg, accountId) => inspectTelegramAccount({
		cfg,
		accountId
	}),
	resolveSources: (account) => [Object.keys(account.config.groups ?? {})],
	normalizeId: (entry) => entry.trim() || null
});
//#endregion
//#region extensions/telegram/src/group-policy.ts
function parseTelegramGroupId(value) {
	const raw = value?.trim() ?? "";
	if (!raw) return {
		chatId: void 0,
		topicId: void 0
	};
	const parts = raw.split(":").filter(Boolean);
	if (parts.length >= 3 && parts[1] === "topic" && /^-?\d+$/.test(parts[0]) && /^\d+$/.test(parts[2])) return {
		chatId: parts[0],
		topicId: parts[2]
	};
	if (parts.length >= 2 && /^-?\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) return {
		chatId: parts[0],
		topicId: parts[1]
	};
	return {
		chatId: raw,
		topicId: void 0
	};
}
function resolveTelegramRequireMention(params) {
	const { cfg, chatId, topicId, accountId } = params;
	if (!chatId) return;
	const scopedGroups = (accountId ? cfg.channels?.telegram?.accounts?.[accountId]?.groups : void 0) ?? cfg.channels?.telegram?.groups;
	const groupConfig = scopedGroups?.[chatId];
	const groupDefault = scopedGroups?.["*"];
	const topicConfig = topicId && groupConfig?.topics ? groupConfig.topics[topicId] : void 0;
	const defaultTopicConfig = topicId && groupDefault?.topics ? groupDefault.topics[topicId] : void 0;
	if (typeof topicConfig?.requireMention === "boolean") return topicConfig.requireMention;
	if (typeof defaultTopicConfig?.requireMention === "boolean") return defaultTopicConfig.requireMention;
	if (typeof groupConfig?.requireMention === "boolean") return groupConfig.requireMention;
	if (typeof groupDefault?.requireMention === "boolean") return groupDefault.requireMention;
}
function resolveTelegramGroupRequireMention(params) {
	const { chatId, topicId } = parseTelegramGroupId(params.groupId);
	const requireMention = resolveTelegramRequireMention({
		cfg: params.cfg,
		chatId,
		topicId,
		accountId: params.accountId
	});
	if (typeof requireMention === "boolean") return requireMention;
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "telegram",
		groupId: chatId ?? params.groupId,
		accountId: params.accountId
	});
}
function resolveTelegramGroupToolPolicy(params) {
	const { chatId } = parseTelegramGroupId(params.groupId);
	return resolveChannelGroupToolsPolicy({
		cfg: params.cfg,
		channel: "telegram",
		groupId: chatId ?? params.groupId,
		accountId: params.accountId,
		senderId: params.senderId,
		senderName: params.senderName,
		senderUsername: params.senderUsername,
		senderE164: params.senderE164
	});
}
//#endregion
//#region extensions/telegram/src/normalize.ts
const TELEGRAM_PREFIX_RE = /^(telegram|tg):/i;
function normalizeTelegramTargetBody(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return;
	const prefixStripped = trimmed.replace(TELEGRAM_PREFIX_RE, "").trim();
	if (!prefixStripped) return;
	const parsed = parseTelegramTarget(trimmed);
	const normalizedChatId = normalizeTelegramLookupTarget(parsed.chatId);
	if (!normalizedChatId) return;
	const keepLegacyGroupPrefix = /^group:/i.test(prefixStripped);
	const hasTopicSuffix = /:topic:\d+$/i.test(prefixStripped);
	const chatSegment = keepLegacyGroupPrefix ? `group:${normalizedChatId}` : normalizedChatId;
	if (parsed.messageThreadId == null) return chatSegment;
	return `${chatSegment}${hasTopicSuffix ? `:topic:${parsed.messageThreadId}` : `:${parsed.messageThreadId}`}`;
}
function normalizeTelegramMessagingTarget(raw) {
	const normalizedBody = normalizeTelegramTargetBody(raw);
	if (!normalizedBody) return;
	return `telegram:${normalizedBody}`.toLowerCase();
}
function looksLikeTelegramTargetId(raw) {
	return normalizeTelegramTargetBody(raw) !== void 0;
}
//#endregion
//#region extensions/telegram/src/outbound-adapter.ts
const TELEGRAM_TEXT_CHUNK_LIMIT = 4e3;
function resolveTelegramSendContext(params) {
	return {
		send: resolveOutboundSendDep(params.deps, "telegram") ?? sendMessageTelegram,
		baseOpts: {
			verbose: false,
			textMode: "html",
			cfg: params.cfg,
			messageThreadId: parseTelegramThreadId(params.threadId),
			replyToMessageId: parseTelegramReplyToMessageId(params.replyToId),
			accountId: params.accountId ?? void 0,
			gatewayClientScopes: params.gatewayClientScopes
		}
	};
}
async function sendTelegramPayloadMessages(params) {
	const telegramData = params.payload.channelData?.telegram;
	const quoteText = typeof telegramData?.quoteText === "string" ? telegramData.quoteText : void 0;
	const text = resolveInteractiveTextFallback({
		text: params.payload.text,
		interactive: params.payload.interactive
	}) ?? "";
	const mediaUrls = resolvePayloadMediaUrls(params.payload);
	const buttons = resolveTelegramInlineButtons({
		buttons: telegramData?.buttons,
		interactive: params.payload.interactive
	});
	const payloadOpts = {
		...params.baseOpts,
		quoteText
	};
	return await sendPayloadMediaSequenceOrFallback({
		text,
		mediaUrls,
		fallbackResult: {
			messageId: "unknown",
			chatId: params.to
		},
		sendNoMedia: async () => await params.send(params.to, text, {
			...payloadOpts,
			buttons
		}),
		send: async ({ text, mediaUrl, isFirst }) => await params.send(params.to, text, {
			...payloadOpts,
			mediaUrl,
			...isFirst ? { buttons } : {}
		})
	});
}
const telegramOutbound = {
	deliveryMode: "direct",
	chunker: markdownToTelegramHtmlChunks,
	chunkerMode: "markdown",
	textChunkLimit: TELEGRAM_TEXT_CHUNK_LIMIT,
	sanitizeText: ({ text }) => sanitizeForPlainText(text),
	shouldSkipPlainTextSanitization: ({ payload }) => Boolean(payload.channelData),
	resolveEffectiveTextChunkLimit: ({ fallbackLimit }) => typeof fallbackLimit === "number" ? Math.min(fallbackLimit, 4096) : 4096,
	...createAttachedChannelResultAdapter({
		channel: "telegram",
		sendText: async ({ cfg, to, text, accountId, deps, replyToId, threadId, gatewayClientScopes }) => {
			const { send, baseOpts } = resolveTelegramSendContext({
				cfg,
				deps,
				accountId,
				replyToId,
				threadId,
				gatewayClientScopes
			});
			return await send(to, text, { ...baseOpts });
		},
		sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, mediaReadFile, accountId, deps, replyToId, threadId, forceDocument, gatewayClientScopes }) => {
			const { send, baseOpts } = resolveTelegramSendContext({
				cfg,
				deps,
				accountId,
				replyToId,
				threadId,
				gatewayClientScopes
			});
			return await send(to, text, {
				...baseOpts,
				mediaUrl,
				mediaLocalRoots,
				mediaReadFile,
				forceDocument: forceDocument ?? false
			});
		}
	}),
	sendPayload: async ({ cfg, to, payload, mediaLocalRoots, mediaReadFile, accountId, deps, replyToId, threadId, forceDocument, gatewayClientScopes }) => {
		const { send, baseOpts } = resolveTelegramSendContext({
			cfg,
			deps,
			accountId,
			replyToId,
			threadId,
			gatewayClientScopes
		});
		return attachChannelToResult("telegram", await sendTelegramPayloadMessages({
			send,
			to,
			payload,
			baseOpts: {
				...baseOpts,
				mediaLocalRoots,
				mediaReadFile,
				forceDocument: forceDocument ?? false
			}
		}));
	}
};
//#endregion
//#region extensions/telegram/src/setup-core.ts
const channel$1 = "telegram";
const TELEGRAM_TOKEN_HELP_LINES = [
	"1) Open Telegram and chat with @BotFather",
	"2) Run /newbot (or /mybots)",
	"3) Copy the token (looks like 123456:ABC...)",
	"Tip: you can also set TELEGRAM_BOT_TOKEN in your env.",
	`Docs: ${formatDocsLink("/telegram")}`,
	"Website: https://openclaw.ai"
];
const TELEGRAM_USER_ID_HELP_LINES = [
	`1) DM your bot, then read from.id in \`${formatCliCommand("openclaw logs --follow")}\` (safest)`,
	"2) Or call https://api.telegram.org/bot<bot_token>/getUpdates and read message.from.id",
	"3) Third-party: DM @userinfobot or @getidsbot",
	`Docs: ${formatDocsLink("/telegram")}`,
	"Website: https://openclaw.ai"
];
function normalizeTelegramAllowFromInput(raw) {
	return raw.trim().replace(/^(telegram|tg):/i, "").trim();
}
function parseTelegramAllowFromId(raw) {
	const stripped = normalizeTelegramAllowFromInput(raw);
	return /^\d+$/.test(stripped) ? stripped : null;
}
async function resolveTelegramAllowFromEntries(params) {
	return await Promise.all(params.entries.map(async (entry) => {
		const numericId = parseTelegramAllowFromId(entry);
		if (numericId) return {
			input: entry,
			resolved: true,
			id: numericId
		};
		const stripped = normalizeTelegramAllowFromInput(entry);
		if (!stripped || !params.credentialValue?.trim()) return {
			input: entry,
			resolved: false,
			id: null
		};
		const username = stripped.startsWith("@") ? stripped : `@${stripped}`;
		const id = await lookupTelegramChatId({
			token: params.credentialValue,
			chatId: username,
			apiRoot: params.apiRoot,
			proxyUrl: params.proxyUrl,
			network: params.network
		});
		return {
			input: entry,
			resolved: Boolean(id),
			id
		};
	}));
}
async function promptTelegramAllowFromForAccount(params) {
	const accountId = params.accountId ?? resolveDefaultTelegramAccountId(params.cfg);
	const resolved = resolveTelegramAccount({
		cfg: params.cfg,
		accountId
	});
	await params.prompter.note(TELEGRAM_USER_ID_HELP_LINES.join("\n"), "Telegram user id");
	if (!resolved.token?.trim()) await params.prompter.note("Telegram token missing; username lookup is unavailable.", "Telegram");
	const unique = await promptResolvedAllowFrom({
		prompter: params.prompter,
		existing: resolved.config.allowFrom ?? [],
		token: resolved.token,
		message: "Telegram allowFrom (numeric sender id; @username resolves to id)",
		placeholder: "@username",
		label: "Telegram allowlist",
		parseInputs: splitSetupEntries,
		parseId: parseTelegramAllowFromId,
		invalidWithoutTokenNote: "Telegram token missing; use numeric sender ids (usernames require a bot token).",
		resolveEntries: async ({ entries, token }) => resolveTelegramAllowFromEntries({
			credentialValue: token,
			entries,
			apiRoot: resolved.config.apiRoot,
			proxyUrl: resolved.config.proxy,
			network: resolved.config.network
		})
	});
	return patchChannelConfigForAccount({
		cfg: params.cfg,
		channel: channel$1,
		accountId,
		patch: {
			dmPolicy: "allowlist",
			allowFrom: unique
		}
	});
}
const telegramSetupAdapter = createEnvPatchedAccountSetupAdapter({
	channelKey: channel$1,
	defaultAccountOnlyEnvError: "TELEGRAM_BOT_TOKEN can only be used for the default account.",
	missingCredentialError: "Telegram requires token or --token-file (or --use-env).",
	hasCredentials: (input) => Boolean(input.token || input.tokenFile),
	buildPatch: (input) => input.tokenFile ? { tokenFile: input.tokenFile } : input.token ? { botToken: input.token } : {}
});
//#endregion
//#region extensions/telegram/src/setup-surface.ts
const channel = "telegram";
function ensureTelegramDefaultGroupMentionGate(cfg, accountId) {
	const resolved = resolveTelegramAccount({
		cfg,
		accountId
	});
	const wildcardGroup = resolved.config.groups?.["*"];
	if (wildcardGroup?.requireMention !== void 0) return cfg;
	return patchChannelConfigForAccount({
		cfg,
		channel,
		accountId,
		patch: { groups: {
			...resolved.config.groups,
			"*": {
				...wildcardGroup,
				requireMention: true
			}
		} }
	});
}
function shouldShowTelegramDmAccessWarning(cfg, accountId) {
	const merged = mergeTelegramAccountConfig(cfg, accountId);
	const policy = merged.dmPolicy ?? "pairing";
	const hasAllowFrom = Array.isArray(merged.allowFrom) && merged.allowFrom.some((e) => String(e).trim());
	return policy === "pairing" && !hasAllowFrom;
}
function buildTelegramDmAccessWarningLines(accountId) {
	const configBase = accountId === "default" ? "channels.telegram" : `channels.telegram.accounts.${accountId}`;
	return [
		"Your bot is using DM policy: pairing.",
		"Any Telegram user who discovers the bot can send pairing requests.",
		"For private use, configure an allowlist with your Telegram user id:",
		"  " + formatCliCommand(`openclaw config set ${configBase}.dmPolicy "allowlist"`),
		"  " + formatCliCommand(`openclaw config set ${configBase}.allowFrom '["YOUR_USER_ID"]'`),
		`Docs: ${formatDocsLink("/channels/pairing", "channels/pairing")}`
	];
}
const dmPolicy = {
	label: "Telegram",
	channel,
	policyKey: "channels.telegram.dmPolicy",
	allowFromKey: "channels.telegram.allowFrom",
	resolveConfigKeys: (cfg, accountId) => (accountId ?? resolveDefaultTelegramAccountId(cfg)) !== "default" ? {
		policyKey: `channels.telegram.accounts.${accountId ?? resolveDefaultTelegramAccountId(cfg)}.dmPolicy`,
		allowFromKey: `channels.telegram.accounts.${accountId ?? resolveDefaultTelegramAccountId(cfg)}.allowFrom`
	} : {
		policyKey: "channels.telegram.dmPolicy",
		allowFromKey: "channels.telegram.allowFrom"
	},
	getCurrent: (cfg, accountId) => mergeTelegramAccountConfig(cfg, accountId ?? resolveDefaultTelegramAccountId(cfg)).dmPolicy ?? "pairing",
	setPolicy: (cfg, policy, accountId) => {
		const resolvedAccountId = accountId ?? resolveDefaultTelegramAccountId(cfg);
		const merged = mergeTelegramAccountConfig(cfg, resolvedAccountId);
		const patch = {
			dmPolicy: policy,
			...policy === "open" ? { allowFrom: addWildcardAllowFrom(merged.allowFrom) } : {}
		};
		return accountId == null && resolvedAccountId !== "default" ? applySetupAccountConfigPatch({
			cfg,
			channelKey: channel,
			accountId: resolvedAccountId,
			patch
		}) : patchChannelConfigForAccount({
			cfg,
			channel,
			accountId: resolvedAccountId,
			patch
		});
	},
	promptAllowFrom: promptTelegramAllowFromForAccount
};
const telegramSetupWizard = {
	channel,
	status: createStandardChannelSetupStatus({
		channelLabel: "Telegram",
		configuredLabel: "configured",
		unconfiguredLabel: "needs token",
		configuredHint: "recommended · configured",
		unconfiguredHint: "recommended · newcomer-friendly",
		configuredScore: 1,
		unconfiguredScore: 10,
		resolveConfigured: ({ cfg, accountId }) => (accountId ? [accountId] : listTelegramAccountIds(cfg)).some((resolvedAccountId) => {
			return inspectTelegramAccount({
				cfg,
				accountId: resolvedAccountId
			}).configured;
		})
	}),
	prepare: async ({ cfg, accountId, credentialValues }) => ({
		cfg: ensureTelegramDefaultGroupMentionGate(cfg, accountId),
		credentialValues
	}),
	credentials: [{
		inputKey: "token",
		providerHint: channel,
		credentialLabel: "Telegram bot token",
		preferredEnvVar: "TELEGRAM_BOT_TOKEN",
		helpTitle: "Telegram bot token",
		helpLines: TELEGRAM_TOKEN_HELP_LINES,
		envPrompt: "TELEGRAM_BOT_TOKEN detected. Use env var?",
		keepPrompt: "Telegram token already configured. Keep it?",
		inputPrompt: "Enter Telegram bot token",
		allowEnv: ({ accountId }) => accountId === DEFAULT_ACCOUNT_ID,
		inspect: ({ cfg, accountId }) => {
			const resolved = resolveTelegramAccount({
				cfg,
				accountId
			});
			const hasConfiguredValue = hasConfiguredSecretInput(resolved.config.botToken) || Boolean(resolved.config.tokenFile?.trim());
			return {
				accountConfigured: Boolean(resolved.token) || hasConfiguredValue,
				hasConfiguredValue,
				resolvedValue: resolved.token?.trim() || void 0,
				envValue: accountId === "default" ? process.env.TELEGRAM_BOT_TOKEN?.trim() || void 0 : void 0
			};
		}
	}],
	allowFrom: createAllowFromSection({
		helpTitle: "Telegram user id",
		helpLines: TELEGRAM_USER_ID_HELP_LINES,
		credentialInputKey: "token",
		message: "Telegram allowFrom (numeric sender id; @username resolves to id)",
		placeholder: "@username",
		invalidWithoutCredentialNote: "Telegram token missing; use numeric sender ids (usernames require a bot token).",
		parseInputs: splitSetupEntries,
		parseId: parseTelegramAllowFromId,
		resolveEntries: async ({ cfg, accountId, credentialValues, entries }) => resolveTelegramAllowFromEntries({
			credentialValue: credentialValues.token,
			entries,
			apiRoot: resolveTelegramAccount({
				cfg,
				accountId
			}).config.apiRoot
		}),
		apply: async ({ cfg, accountId, allowFrom }) => patchChannelConfigForAccount({
			cfg,
			channel,
			accountId,
			patch: {
				dmPolicy: "allowlist",
				allowFrom
			}
		})
	}),
	finalize: async ({ cfg, accountId, prompter }) => {
		if (!shouldShowTelegramDmAccessWarning(cfg, accountId)) return;
		await prompter.note(buildTelegramDmAccessWarningLines(accountId).join("\n"), "Telegram DM access warning");
	},
	dmPolicy,
	disable: (cfg) => setSetupChannelEnabled(cfg, channel, false)
};
//#endregion
//#region extensions/telegram/src/state-migrations.ts
function fileExists(pathValue) {
	try {
		return fs.existsSync(pathValue) && fs.statSync(pathValue).isFile();
	} catch {
		return false;
	}
}
function detectTelegramLegacyStateMigrations(params) {
	const legacyPath = resolveChannelAllowFromPath("telegram", params.env);
	if (!fileExists(legacyPath)) return [];
	const accountId = resolveDefaultTelegramAccountId(params.cfg);
	const targetPath = resolveChannelAllowFromPath("telegram", params.env, accountId);
	if (fileExists(targetPath)) return [];
	return [{
		kind: "copy",
		label: "Telegram pairing allowFrom",
		sourcePath: legacyPath,
		targetPath
	}];
}
//#endregion
//#region extensions/telegram/src/status-issues.ts
function readTelegramAccountStatus(value) {
	if (!isRecord(value)) return null;
	return {
		accountId: value.accountId,
		enabled: value.enabled,
		configured: value.configured,
		allowUnmentionedGroups: value.allowUnmentionedGroups,
		audit: value.audit
	};
}
function readTelegramGroupMembershipAuditSummary(value) {
	if (!isRecord(value)) return {};
	const unresolvedGroups = typeof value.unresolvedGroups === "number" && Number.isFinite(value.unresolvedGroups) ? value.unresolvedGroups : void 0;
	const hasWildcardUnmentionedGroups = typeof value.hasWildcardUnmentionedGroups === "boolean" ? value.hasWildcardUnmentionedGroups : void 0;
	const groupsRaw = value.groups;
	return {
		unresolvedGroups,
		hasWildcardUnmentionedGroups,
		groups: Array.isArray(groupsRaw) ? groupsRaw.map((entry) => {
			if (!isRecord(entry)) return null;
			const chatId = asString(entry.chatId);
			if (!chatId) return null;
			return {
				chatId,
				ok: typeof entry.ok === "boolean" ? entry.ok : void 0,
				status: asString(entry.status) ?? null,
				error: asString(entry.error) ?? null,
				matchKey: asString(entry.matchKey) ?? void 0,
				matchSource: asString(entry.matchSource) ?? void 0
			};
		}).filter(Boolean) : void 0
	};
}
function collectTelegramStatusIssues(accounts) {
	const issues = [];
	for (const entry of accounts) {
		const account = readTelegramAccountStatus(entry);
		if (!account) continue;
		const accountId = resolveEnabledConfiguredAccountId(account);
		if (!accountId) continue;
		if (account.allowUnmentionedGroups === true) issues.push({
			channel: "telegram",
			accountId,
			kind: "config",
			message: "Config allows unmentioned group messages (requireMention=false). Telegram Bot API privacy mode will block most group messages unless disabled.",
			fix: "In BotFather run /setprivacy → Disable for this bot (then restart the gateway)."
		});
		const audit = readTelegramGroupMembershipAuditSummary(account.audit);
		if (audit.hasWildcardUnmentionedGroups === true) issues.push({
			channel: "telegram",
			accountId,
			kind: "config",
			message: "Telegram groups config uses \"*\" with requireMention=false; membership probing is not possible without explicit group IDs.",
			fix: "Add explicit numeric group ids under channels.telegram.groups (or per-account groups) to enable probing."
		});
		if (audit.unresolvedGroups && audit.unresolvedGroups > 0) issues.push({
			channel: "telegram",
			accountId,
			kind: "config",
			message: `Some configured Telegram groups are not numeric IDs (unresolvedGroups=${audit.unresolvedGroups}). Membership probe can only check numeric group IDs.`,
			fix: "Use numeric chat IDs (e.g. -100...) as keys in channels.telegram.groups for requireMention=false groups."
		});
		for (const group of audit.groups ?? []) {
			if (group.ok === true) continue;
			const status = group.status ? ` status=${group.status}` : "";
			const err = group.error ? `: ${group.error}` : "";
			const baseMessage = `Group ${group.chatId} not reachable by bot.${status}${err}`;
			issues.push({
				channel: "telegram",
				accountId,
				kind: "runtime",
				message: appendMatchMetadata(baseMessage, {
					matchKey: group.matchKey,
					matchSource: group.matchSource
				}),
				fix: "Invite the bot to the group, then DM the bot once (/start) and restart the gateway."
			});
		}
	}
	return issues;
}
//#endregion
//#region extensions/telegram/src/threading-tool-context.ts
function resolveTelegramToolContextThreadId(context) {
	if (context.MessageThreadId != null) return String(context.MessageThreadId);
	const currentChannelId = context.To?.trim();
	if (!currentChannelId) return;
	const parsedTarget = parseTelegramTarget(currentChannelId);
	return parsedTarget.messageThreadId != null ? String(parsedTarget.messageThreadId) : void 0;
}
function buildTelegramThreadingToolContext(params) {
	params.cfg;
	params.accountId;
	return {
		currentChannelId: params.context.To?.trim() || void 0,
		currentThreadTs: resolveTelegramToolContextThreadId(params.context),
		hasRepliedRef: params.hasRepliedRef
	};
}
//#endregion
//#region extensions/telegram/src/channel.ts
function resolveTelegramProbe() {
	return getOptionalTelegramRuntime()?.channel?.telegram?.probeTelegram ?? probeTelegram;
}
function resolveTelegramAuditCollector() {
	return getOptionalTelegramRuntime()?.channel?.telegram?.collectTelegramUnmentionedGroupIds ?? collectTelegramUnmentionedGroupIds;
}
function resolveTelegramAuditMembership() {
	return getOptionalTelegramRuntime()?.channel?.telegram?.auditTelegramGroupMembership ?? auditTelegramGroupMembership;
}
function resolveTelegramMonitor() {
	return getOptionalTelegramRuntime()?.channel?.telegram?.monitorTelegramProvider ?? monitorTelegramProvider;
}
function getOptionalTelegramRuntime() {
	try {
		return getTelegramRuntime();
	} catch {
		return null;
	}
}
function resolveTelegramSend(deps) {
	return resolveOutboundSendDep(deps, "telegram") ?? getOptionalTelegramRuntime()?.channel?.telegram?.sendMessageTelegram ?? sendMessageTelegram;
}
function resolveTelegramTokenHelper() {
	return getOptionalTelegramRuntime()?.channel?.telegram?.resolveTelegramToken ?? resolveTelegramToken;
}
function buildTelegramSendOptions(params) {
	return {
		verbose: false,
		cfg: params.cfg,
		...params.mediaUrl ? { mediaUrl: params.mediaUrl } : {},
		...params.mediaLocalRoots?.length ? { mediaLocalRoots: params.mediaLocalRoots } : {},
		messageThreadId: parseTelegramThreadId(params.threadId),
		replyToMessageId: parseTelegramReplyToMessageId(params.replyToId),
		accountId: params.accountId ?? void 0,
		silent: params.silent ?? void 0,
		forceDocument: params.forceDocument ?? void 0,
		...Array.isArray(params.gatewayClientScopes) ? { gatewayClientScopes: [...params.gatewayClientScopes] } : {}
	};
}
async function sendTelegramOutbound(params) {
	return await resolveTelegramSend(params.deps)(params.to, params.text, buildTelegramSendOptions({
		cfg: params.cfg,
		mediaUrl: params.mediaUrl,
		mediaLocalRoots: params.mediaLocalRoots,
		accountId: params.accountId,
		replyToId: params.replyToId,
		threadId: params.threadId,
		silent: params.silent,
		gatewayClientScopes: params.gatewayClientScopes
	}));
}
const telegramMessageActions = {
	describeMessageTool: (ctx) => getOptionalTelegramRuntime()?.channel?.telegram?.messageActions?.describeMessageTool?.(ctx) ?? telegramMessageActions$1.describeMessageTool?.(ctx) ?? null,
	extractToolSend: (ctx) => getOptionalTelegramRuntime()?.channel?.telegram?.messageActions?.extractToolSend?.(ctx) ?? telegramMessageActions$1.extractToolSend?.(ctx) ?? null,
	handleAction: async (ctx) => {
		const runtimeHandleAction = getOptionalTelegramRuntime()?.channel?.telegram?.messageActions?.handleAction;
		if (runtimeHandleAction) return await runtimeHandleAction(ctx);
		if (!telegramMessageActions$1.handleAction) throw new Error("Telegram message actions not available");
		return await telegramMessageActions$1.handleAction(ctx);
	}
};
function normalizeTelegramAcpConversationId(conversationId) {
	const parsed = parseTelegramTopicConversation({ conversationId });
	if (!parsed || !parsed.chatId.startsWith("-")) return null;
	return {
		conversationId: parsed.canonicalConversationId,
		parentConversationId: parsed.chatId
	};
}
function matchTelegramAcpConversation(params) {
	const binding = normalizeTelegramAcpConversationId(params.bindingConversationId);
	if (!binding) return null;
	const incoming = parseTelegramTopicConversation({
		conversationId: params.conversationId,
		parentConversationId: params.parentConversationId
	});
	if (!incoming || !incoming.chatId.startsWith("-")) return null;
	if (binding.conversationId !== incoming.canonicalConversationId) return null;
	return {
		conversationId: incoming.canonicalConversationId,
		parentConversationId: incoming.chatId,
		matchPriority: 2
	};
}
function shouldTreatTelegramRoutedTextAsVisible(params) {
	params.text;
	return params.kind !== "final";
}
function targetsMatchTelegramReplySuppression(params) {
	const origin = parseTelegramTarget(params.originTarget);
	const target = parseTelegramTarget(params.targetKey);
	const originThreadId = origin.messageThreadId != null && String(origin.messageThreadId).trim() ? String(origin.messageThreadId).trim() : void 0;
	const targetThreadId = params.targetThreadId?.trim() || (target.messageThreadId != null && String(target.messageThreadId).trim() ? String(target.messageThreadId).trim() : void 0);
	if (origin.chatId.trim().toLowerCase() !== target.chatId.trim().toLowerCase()) return false;
	if (originThreadId && targetThreadId) return originThreadId === targetThreadId;
	return originThreadId == null && targetThreadId == null;
}
function resolveTelegramCommandConversation(params) {
	const chatId = [
		params.originatingTo,
		params.commandTo,
		params.fallbackTo
	].map((candidate) => {
		const trimmed = candidate?.trim();
		return trimmed ? parseTelegramTarget(trimmed).chatId.trim() : "";
	}).find((candidate) => candidate.length > 0);
	if (!chatId) return null;
	if (params.threadId) return {
		conversationId: `${chatId}:topic:${params.threadId}`,
		parentConversationId: chatId
	};
	if (chatId.startsWith("-")) return null;
	return {
		conversationId: chatId,
		parentConversationId: chatId
	};
}
function resolveTelegramInboundConversation(params) {
	const rawTarget = params.to?.trim() || params.conversationId?.trim() || "";
	if (!rawTarget) return null;
	const parsedTarget = parseTelegramTarget(rawTarget);
	const chatId = parsedTarget.chatId.trim();
	if (!chatId) return null;
	const threadId = parsedTarget.messageThreadId != null ? String(parsedTarget.messageThreadId) : params.threadId != null ? String(params.threadId).trim() || void 0 : void 0;
	if (threadId) {
		const parsedTopic = parseTelegramTopicConversation({
			conversationId: threadId,
			parentConversationId: chatId
		});
		if (!parsedTopic) return null;
		return {
			conversationId: parsedTopic.canonicalConversationId,
			parentConversationId: parsedTopic.chatId
		};
	}
	return {
		conversationId: chatId,
		parentConversationId: chatId
	};
}
function resolveTelegramDeliveryTarget(params) {
	const parsedTopic = parseTelegramTopicConversation({
		conversationId: params.conversationId,
		parentConversationId: params.parentConversationId
	});
	if (parsedTopic) return {
		to: parsedTopic.chatId,
		threadId: parsedTopic.topicId
	};
	const parsedTarget = parseTelegramTarget(params.parentConversationId?.trim() || params.conversationId);
	if (!parsedTarget.chatId.trim()) return null;
	return {
		to: parsedTarget.chatId,
		...parsedTarget.messageThreadId != null ? { threadId: String(parsedTarget.messageThreadId) } : {}
	};
}
function parseTelegramExplicitTarget(raw) {
	const target = parseTelegramTarget(raw);
	return {
		to: target.chatId,
		threadId: target.messageThreadId,
		chatType: target.chatType === "unknown" ? void 0 : target.chatType
	};
}
function shouldStripTelegramThreadFromAnnounceOrigin(params) {
	const requesterChannel = params.requester.channel?.trim().toLowerCase();
	if (requesterChannel && requesterChannel !== "telegram") return true;
	const requesterTo = params.requester.to?.trim();
	if (!requesterTo) return false;
	if (!requesterChannel && !requesterTo.startsWith("telegram:")) return true;
	const requesterTarget = parseTelegramExplicitTarget(requesterTo);
	if (requesterTarget.chatType !== "group") return true;
	const entryTo = params.entry.to?.trim();
	if (!entryTo) return false;
	return parseTelegramExplicitTarget(entryTo).to !== requesterTarget.to;
}
function buildTelegramBaseSessionKey(params) {
	return buildOutboundBaseSessionKey({
		...params,
		channel: "telegram"
	});
}
function resolveTelegramOutboundSessionRoute(params) {
	const parsed = parseTelegramTarget(params.target);
	const chatId = parsed.chatId.trim();
	if (!chatId) return null;
	const fallbackThreadId = normalizeOutboundThreadId(params.threadId);
	const resolvedThreadId = parsed.messageThreadId ?? parseTelegramThreadId(fallbackThreadId);
	const isGroup = parsed.chatType === "group" || parsed.chatType === "unknown" && params.resolvedTarget?.kind && params.resolvedTarget.kind !== "user";
	const peerId = isGroup && resolvedThreadId ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : chatId;
	const peer = {
		kind: isGroup ? "group" : "direct",
		id: peerId
	};
	const baseSessionKey = buildTelegramBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: params.accountId,
		peer
	});
	return {
		sessionKey: (resolvedThreadId && !isGroup ? resolveThreadSessionKeys({
			baseSessionKey,
			threadId: String(resolvedThreadId)
		}) : null)?.sessionKey ?? baseSessionKey,
		baseSessionKey,
		peer,
		chatType: isGroup ? "group" : "direct",
		from: isGroup ? `telegram:group:${peerId}` : resolvedThreadId ? `telegram:${chatId}:topic:${resolvedThreadId}` : `telegram:${chatId}`,
		to: `telegram:${chatId}`,
		threadId: resolvedThreadId
	};
}
async function resolveTelegramTargets(params) {
	if (params.kind !== "user") return params.inputs.map((input) => ({
		input,
		resolved: false,
		note: "Telegram runtime target resolution only supports usernames for direct-message lookups."
	}));
	const account = resolveTelegramAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const token = account.token.trim();
	if (!token) return params.inputs.map((input) => ({
		input,
		resolved: false,
		note: "Telegram bot token is required to resolve @username targets."
	}));
	return await Promise.all(params.inputs.map(async (input) => {
		const trimmed = input.trim();
		if (!trimmed) return {
			input,
			resolved: false,
			note: "Telegram target is required."
		};
		const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
		try {
			const id = await lookupTelegramChatId({
				token,
				chatId: normalized,
				network: account.config.network
			});
			if (!id) return {
				input,
				resolved: false,
				note: "Telegram username could not be resolved by the configured bot."
			};
			return {
				input,
				resolved: true,
				id,
				name: normalized
			};
		} catch (error) {
			return {
				input,
				resolved: false,
				note: error instanceof Error ? error.message : String(error)
			};
		}
	}));
}
const resolveTelegramAllowlistGroupOverrides = createNestedAllowlistOverrideResolver({
	resolveRecord: (account) => account.config.groups,
	outerLabel: (groupId) => groupId,
	resolveOuterEntries: (groupCfg) => groupCfg?.allowFrom,
	resolveChildren: (groupCfg) => groupCfg?.topics,
	innerLabel: (groupId, topicId) => `${groupId} topic ${topicId}`,
	resolveInnerEntries: (topicCfg) => topicCfg?.allowFrom
});
const collectTelegramSecurityWarnings = createAllowlistProviderRouteAllowlistWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.telegram !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	resolveRouteAllowlistConfigured: (account) => Boolean(account.config.groups) && Object.keys(account.config.groups ?? {}).length > 0,
	restrictSenders: {
		surface: "Telegram groups",
		openScope: "any member in allowed groups",
		groupPolicyPath: "channels.telegram.groupPolicy",
		groupAllowFromPath: "channels.telegram.groupAllowFrom"
	},
	noRouteAllowlist: {
		surface: "Telegram groups",
		routeAllowlistPath: "channels.telegram.groups",
		routeScope: "group",
		groupPolicyPath: "channels.telegram.groupPolicy",
		groupAllowFromPath: "channels.telegram.groupAllowFrom"
	}
});
const telegramPlugin = createChatChannelPlugin({
	base: {
		...createTelegramPluginBase({
			setupWizard: telegramSetupWizard,
			setup: telegramSetupAdapter
		}),
		allowlist: buildDmGroupAccountAllowlistAdapter({
			channelId: "telegram",
			resolveAccount: resolveTelegramAccount,
			normalize: ({ cfg, accountId, values }) => telegramConfigAdapter.formatAllowFrom({
				cfg,
				accountId,
				allowFrom: values
			}),
			resolveDmAllowFrom: (account) => account.config.allowFrom,
			resolveGroupAllowFrom: (account) => account.config.groupAllowFrom,
			resolveDmPolicy: (account) => account.config.dmPolicy,
			resolveGroupPolicy: (account) => account.config.groupPolicy,
			resolveGroupOverrides: resolveTelegramAllowlistGroupOverrides
		}),
		bindings: {
			selfParentConversationByDefault: true,
			compileConfiguredBinding: ({ conversationId }) => normalizeTelegramAcpConversationId(conversationId),
			matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) => matchTelegramAcpConversation({
				bindingConversationId: compiledBinding.conversationId,
				conversationId,
				parentConversationId
			}),
			resolveCommandConversation: ({ threadId, originatingTo, commandTo, fallbackTo }) => resolveTelegramCommandConversation({
				threadId,
				originatingTo,
				commandTo,
				fallbackTo
			})
		},
		conversationBindings: {
			supportsCurrentConversationBinding: true,
			defaultTopLevelPlacement: "current",
			resolveConversationRef: ({ accountId: _accountId, conversationId, parentConversationId, threadId }) => resolveTelegramInboundConversation({
				to: parentConversationId ?? conversationId,
				conversationId,
				threadId: threadId ?? void 0
			}),
			buildBoundReplyChannelData: ({ operation, conversation }) => {
				if (operation !== "acp-spawn") return null;
				return conversation.conversationId.includes(":topic:") ? { telegram: { pin: true } } : null;
			},
			shouldStripThreadFromAnnounceOrigin: shouldStripTelegramThreadFromAnnounceOrigin,
			createManager: ({ accountId }) => createTelegramThreadBindingManager({
				accountId: accountId ?? void 0,
				persist: false,
				enableSweeper: false
			}),
			setIdleTimeoutBySessionKey: ({ targetSessionKey, accountId, idleTimeoutMs }) => setTelegramThreadBindingIdleTimeoutBySessionKey({
				targetSessionKey,
				accountId: accountId ?? void 0,
				idleTimeoutMs
			}),
			setMaxAgeBySessionKey: ({ targetSessionKey, accountId, maxAgeMs }) => setTelegramThreadBindingMaxAgeBySessionKey({
				targetSessionKey,
				accountId: accountId ?? void 0,
				maxAgeMs
			})
		},
		groups: {
			resolveRequireMention: resolveTelegramGroupRequireMention,
			resolveToolPolicy: resolveTelegramGroupToolPolicy
		},
		agentPrompt: {
			messageToolCapabilities: ({ cfg, accountId }) => {
				return resolveTelegramInlineButtonsScope({
					cfg,
					accountId: accountId ?? void 0
				}) === "off" ? [] : ["inlineButtons"];
			},
			reactionGuidance: ({ cfg, accountId }) => {
				const level = resolveTelegramReactionLevel({
					cfg,
					accountId: accountId ?? void 0
				}).agentReactionGuidance;
				return level ? {
					level,
					channelLabel: "Telegram"
				} : void 0;
			}
		},
		messaging: {
			normalizeTarget: normalizeTelegramMessagingTarget,
			resolveInboundConversation: ({ to, conversationId, threadId }) => resolveTelegramInboundConversation({
				to,
				conversationId,
				threadId
			}),
			resolveDeliveryTarget: ({ conversationId, parentConversationId }) => resolveTelegramDeliveryTarget({
				conversationId,
				parentConversationId
			}),
			resolveSessionConversation: ({ kind, rawId }) => resolveTelegramSessionConversation({
				kind,
				rawId
			}),
			parseExplicitTarget: ({ raw }) => parseTelegramExplicitTarget(raw),
			inferTargetChatType: ({ to }) => parseTelegramExplicitTarget(to).chatType,
			formatTargetDisplay: ({ target, display, kind }) => {
				const formatted = display?.trim();
				if (formatted) return formatted;
				const trimmedTarget = target.trim();
				if (!trimmedTarget) return trimmedTarget;
				const withoutProvider = trimmedTarget.replace(/^(telegram|tg):/i, "");
				if (kind === "user" || /^user:/i.test(withoutProvider)) return `@${withoutProvider.replace(/^user:/i, "")}`;
				if (/^channel:/i.test(withoutProvider)) return `#${withoutProvider.replace(/^channel:/i, "")}`;
				return withoutProvider;
			},
			resolveOutboundSessionRoute: (params) => resolveTelegramOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: looksLikeTelegramTargetId,
				hint: "<chatId>"
			}
		},
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind }) => await resolveTelegramTargets({
			cfg,
			accountId,
			inputs,
			kind
		}) },
		lifecycle: {
			detectLegacyStateMigrations: ({ cfg, env }) => detectTelegramLegacyStateMigrations({
				cfg,
				env
			}),
			onAccountConfigChanged: async ({ prevCfg, nextCfg, accountId }) => {
				if (resolveTelegramAccount({
					cfg: prevCfg,
					accountId
				}).token.trim() !== resolveTelegramAccount({
					cfg: nextCfg,
					accountId
				}).token.trim()) {
					const { deleteTelegramUpdateOffset } = await import("./extensions/telegram/update-offset-runtime-api.js");
					await deleteTelegramUpdateOffset({ accountId });
				}
			},
			onAccountRemoved: async ({ accountId }) => {
				const { deleteTelegramUpdateOffset } = await import("./extensions/telegram/update-offset-runtime-api.js");
				await deleteTelegramUpdateOffset({ accountId });
			}
		},
		approvalCapability: {
			...telegramApprovalCapability,
			render: { exec: { buildPendingPayload: ({ request, nowMs }) => buildTelegramExecApprovalPendingPayload({
				request,
				nowMs
			}) } }
		},
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => listTelegramDirectoryPeersFromConfig(params),
			listGroups: async (params) => listTelegramDirectoryGroupsFromConfig(params)
		}),
		actions: telegramMessageActions,
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			skipStaleSocketHealthCheck: true,
			collectStatusIssues: collectTelegramStatusIssues,
			buildChannelSummary: ({ snapshot }) => buildTokenChannelStatusSummary(snapshot),
			probeAccount: async ({ account, timeoutMs }) => resolveTelegramProbe()(account.token, timeoutMs, {
				accountId: account.accountId,
				proxyUrl: account.config.proxy,
				network: account.config.network,
				apiRoot: account.config.apiRoot
			}),
			formatCapabilitiesProbe: ({ probe }) => {
				const lines = [];
				if (probe?.bot?.username) {
					const botId = probe.bot.id ? ` (${probe.bot.id})` : "";
					lines.push({ text: `Bot: @${probe.bot.username}${botId}` });
				}
				const flags = [];
				if (typeof probe?.bot?.canJoinGroups === "boolean") flags.push(`joinGroups=${probe.bot.canJoinGroups}`);
				if (typeof probe?.bot?.canReadAllGroupMessages === "boolean") flags.push(`readAllGroupMessages=${probe.bot.canReadAllGroupMessages}`);
				if (typeof probe?.bot?.supportsInlineQueries === "boolean") flags.push(`inlineQueries=${probe.bot.supportsInlineQueries}`);
				if (flags.length > 0) lines.push({ text: `Flags: ${flags.join(" ")}` });
				if (probe?.webhook?.url !== void 0) lines.push({ text: `Webhook: ${probe.webhook.url || "none"}` });
				return lines;
			},
			auditAccount: async ({ account, timeoutMs, probe, cfg }) => {
				const groups = cfg.channels?.telegram?.accounts?.[account.accountId]?.groups ?? cfg.channels?.telegram?.groups;
				const { groupIds, unresolvedGroups, hasWildcardUnmentionedGroups } = resolveTelegramAuditCollector()(groups);
				if (!groupIds.length && unresolvedGroups === 0 && !hasWildcardUnmentionedGroups) return;
				const botId = probe?.ok && probe.bot?.id != null ? probe.bot.id : null;
				if (!botId) return {
					ok: unresolvedGroups === 0 && !hasWildcardUnmentionedGroups,
					checkedGroups: 0,
					unresolvedGroups,
					hasWildcardUnmentionedGroups,
					groups: [],
					elapsedMs: 0
				};
				return {
					...await resolveTelegramAuditMembership()({
						token: account.token,
						botId,
						groupIds,
						proxyUrl: account.config.proxy,
						network: account.config.network,
						apiRoot: account.config.apiRoot,
						timeoutMs
					}),
					unresolvedGroups,
					hasWildcardUnmentionedGroups
				};
			},
			resolveAccountSnapshot: ({ account, cfg, runtime, audit }) => {
				const configuredFromStatus = resolveConfiguredFromCredentialStatuses(account);
				const ownerAccountId = findTelegramTokenOwnerAccountId({
					cfg,
					accountId: account.accountId
				});
				const duplicateTokenReason = ownerAccountId ? formatDuplicateTelegramTokenReason({
					accountId: account.accountId,
					ownerAccountId
				}) : null;
				const configured = (configuredFromStatus ?? Boolean(account.token?.trim())) && !ownerAccountId;
				const groups = cfg.channels?.telegram?.accounts?.[account.accountId]?.groups ?? cfg.channels?.telegram?.groups;
				const allowUnmentionedGroups = groups?.["*"]?.requireMention === false || Object.entries(groups ?? {}).some(([key, value]) => key !== "*" && value?.requireMention === false);
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured,
					extra: {
						...projectCredentialSnapshotFields(account),
						lastError: runtime?.lastError ?? duplicateTokenReason,
						mode: runtime?.mode ?? (account.config.webhookUrl ? "webhook" : "polling"),
						audit,
						allowUnmentionedGroups
					}
				};
			}
		}),
		gateway: {
			startAccount: async (ctx) => {
				const account = ctx.account;
				const ownerAccountId = findTelegramTokenOwnerAccountId({
					cfg: ctx.cfg,
					accountId: account.accountId
				});
				if (ownerAccountId) {
					const reason = formatDuplicateTelegramTokenReason({
						accountId: account.accountId,
						ownerAccountId
					});
					ctx.log?.error?.(`[${account.accountId}] ${reason}`);
					throw new Error(reason);
				}
				const token = (account.token ?? "").trim();
				let telegramBotLabel = "";
				try {
					const probe = await resolveTelegramProbe()(token, 2500, {
						accountId: account.accountId,
						proxyUrl: account.config.proxy,
						network: account.config.network,
						apiRoot: account.config.apiRoot
					});
					const username = probe.ok ? probe.bot?.username?.trim() : null;
					if (username) telegramBotLabel = ` (@${username})`;
				} catch (err) {
					if (getTelegramRuntime().logging.shouldLogVerbose()) ctx.log?.debug?.(`[${account.accountId}] bot probe failed: ${String(err)}`);
				}
				ctx.log?.info(`[${account.accountId}] starting provider${telegramBotLabel}`);
				return resolveTelegramMonitor()({
					token,
					accountId: account.accountId,
					config: ctx.cfg,
					runtime: ctx.runtime,
					abortSignal: ctx.abortSignal,
					useWebhook: Boolean(account.config.webhookUrl),
					webhookUrl: account.config.webhookUrl,
					webhookSecret: account.config.webhookSecret,
					webhookPath: account.config.webhookPath,
					webhookHost: account.config.webhookHost,
					webhookPort: account.config.webhookPort,
					webhookCertPath: account.config.webhookCertPath
				});
			},
			logoutAccount: async ({ accountId, cfg }) => {
				const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
				const nextCfg = { ...cfg };
				const nextTelegram = cfg.channels?.telegram ? { ...cfg.channels.telegram } : void 0;
				let cleared = false;
				let changed = false;
				if (nextTelegram) {
					if (accountId === "default" && nextTelegram.botToken) {
						delete nextTelegram.botToken;
						cleared = true;
						changed = true;
					}
					const accountCleanup = clearAccountEntryFields({
						accounts: nextTelegram.accounts,
						accountId,
						fields: ["botToken"]
					});
					if (accountCleanup.changed) {
						changed = true;
						if (accountCleanup.cleared) cleared = true;
						if (accountCleanup.nextAccounts) nextTelegram.accounts = accountCleanup.nextAccounts;
						else delete nextTelegram.accounts;
					}
				}
				if (changed) if (nextTelegram && Object.keys(nextTelegram).length > 0) nextCfg.channels = {
					...nextCfg.channels,
					telegram: nextTelegram
				};
				else {
					const nextChannels = { ...nextCfg.channels };
					delete nextChannels.telegram;
					if (Object.keys(nextChannels).length > 0) nextCfg.channels = nextChannels;
					else delete nextCfg.channels;
				}
				const loggedOut = resolveTelegramAccount({
					cfg: changed ? nextCfg : cfg,
					accountId
				}).tokenSource === "none";
				if (changed) await getTelegramRuntime().config.writeConfigFile(nextCfg);
				return {
					cleared,
					envToken: Boolean(envToken),
					loggedOut
				};
			}
		}
	},
	pairing: { text: {
		idLabel: "telegramUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^(telegram|tg):/i),
		notify: async ({ cfg, id, message, accountId }) => {
			const { token } = resolveTelegramTokenHelper()(cfg, { accountId });
			if (!token) throw new Error("telegram token not configured");
			await resolveTelegramSend()(id, message, {
				token,
				accountId
			});
		}
	} },
	security: {
		dm: {
			channelKey: "telegram",
			resolvePolicy: (account) => account.config.dmPolicy,
			resolveAllowFrom: (account) => account.config.allowFrom,
			policyPathSuffix: "dmPolicy",
			normalizeEntry: (raw) => raw.replace(/^(telegram|tg):/i, "")
		},
		collectWarnings: collectTelegramSecurityWarnings,
		collectAuditFindings: collectTelegramSecurityAuditFindings
	},
	threading: {
		topLevelReplyToMode: "telegram",
		buildToolContext: (params) => buildTelegramThreadingToolContext(params),
		resolveAutoThreadId: ({ to, toolContext }) => resolveTelegramAutoThreadId({
			to,
			toolContext
		})
	},
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: (text, limit) => getTelegramRuntime().channel.text.chunkMarkdownText(text, limit),
			chunkerMode: "markdown",
			textChunkLimit: 4e3,
			pollMaxOptions: 10,
			shouldSuppressLocalPayloadPrompt: ({ cfg, accountId, payload }) => shouldSuppressLocalTelegramExecApprovalPrompt({
				cfg,
				accountId,
				payload
			}),
			beforeDeliverPayload: async ({ cfg, target, hint }) => {
				if (hint?.kind !== "approval-pending" || hint.approvalKind !== "exec") return;
				const threadId = typeof target.threadId === "number" ? target.threadId : typeof target.threadId === "string" ? Number.parseInt(target.threadId, 10) : void 0;
				await sendTypingTelegram(target.to, {
					cfg,
					accountId: target.accountId ?? void 0,
					...Number.isFinite(threadId) ? { messageThreadId: threadId } : {}
				}).catch(() => {});
			},
			shouldSkipPlainTextSanitization: ({ payload }) => Boolean(payload.channelData),
			shouldTreatRoutedTextAsVisible: shouldTreatTelegramRoutedTextAsVisible,
			targetsMatchForReplySuppression: targetsMatchTelegramReplySuppression,
			resolveEffectiveTextChunkLimit: ({ fallbackLimit }) => typeof fallbackLimit === "number" ? Math.min(fallbackLimit, 4096) : 4096,
			supportsPollDurationSeconds: true,
			supportsAnonymousPolls: true,
			sendPayload: async ({ cfg, to, payload, mediaLocalRoots, accountId, deps, replyToId, threadId, silent, forceDocument, gatewayClientScopes }) => {
				return attachChannelToResult("telegram", await sendTelegramPayloadMessages({
					send: resolveTelegramSend(deps),
					to,
					payload,
					baseOpts: buildTelegramSendOptions({
						cfg,
						mediaLocalRoots,
						accountId,
						replyToId,
						threadId,
						silent,
						forceDocument,
						gatewayClientScopes
					})
				}));
			}
		},
		attachedResults: {
			channel: "telegram",
			sendText: async ({ cfg, to, text, accountId, deps, replyToId, threadId, silent, gatewayClientScopes }) => await sendTelegramOutbound({
				cfg,
				to,
				text,
				accountId,
				deps,
				replyToId,
				threadId,
				silent,
				gatewayClientScopes
			}),
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, replyToId, threadId, silent, gatewayClientScopes }) => await sendTelegramOutbound({
				cfg,
				to,
				text,
				mediaUrl,
				mediaLocalRoots,
				accountId,
				deps,
				replyToId,
				threadId,
				silent,
				gatewayClientScopes
			}),
			sendPoll: async ({ cfg, to, poll, accountId, threadId, silent, isAnonymous, gatewayClientScopes }) => await sendPollTelegram(to, poll, {
				cfg,
				accountId: accountId ?? void 0,
				messageThreadId: parseTelegramThreadId(threadId),
				silent: silent ?? void 0,
				isAnonymous: isAnonymous ?? void 0,
				gatewayClientScopes
			})
		}
	}
});
//#endregion
export { TELEGRAM_TEXT_CHUNK_LIMIT as a, looksLikeTelegramTargetId as c, resolveTelegramGroupToolPolicy as d, listTelegramDirectoryGroupsFromConfig as f, telegramSetupAdapter as i, normalizeTelegramMessagingTarget as l, resolveTelegramAutoThreadId as m, collectTelegramStatusIssues as n, sendTelegramPayloadMessages as o, listTelegramDirectoryPeersFromConfig as p, telegramSetupWizard as r, telegramOutbound as s, telegramPlugin as t, resolveTelegramGroupRequireMention as u };
