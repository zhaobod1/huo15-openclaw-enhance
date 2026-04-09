import { l as isRecord } from "./utils-ms6h9yny.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { t as normalizeAtHashSlug } from "./string-normalization-CvImYLpT.js";
import { t as resolveOutboundSendDep } from "./send-deps-CVbk0lDS.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { n as sleepWithAbort } from "./backoff-jk_Dovem.js";
import { i as resolveToolsBySender } from "./group-policy-D1X7pmp3.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { r as createEnvPatchedAccountSetupAdapter } from "./setup-helpers-BiAtGxsL.js";
import "./routing-DdBDhOmH.js";
import { t as formatAllowFromLowercase } from "./allow-from-DjymPYUA.js";
import { y as createOpenProviderConfiguredRouteWarningCollector } from "./channel-policy-DIVRdPsQ.js";
import { t as createChannelDirectoryAdapter } from "./directory-runtime-BrmKrim8.js";
import { t as createRuntimeDirectoryLiveAdapter } from "./runtime-forwarders-Dhqc-dWG.js";
import { n as resolveTargetsWithOptionalToken } from "./target-resolvers-iFdDie3z.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-B1YYl-hh.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-DrJTvhRN.js";
import { _ as resolveEnabledConfiguredAccountId, d as createDefaultChannelRuntimeState, m as asString, o as buildTokenChannelStatusSummary, p as appendMatchMetadata, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./runtime-env-BLYCS7ta.js";
import "./setup-adapter-runtime-0NaGQA9P.js";
import { a as resolveConfiguredFromCredentialStatuses, r as projectCredentialSnapshotFields } from "./account-snapshot-fields-mnjlKuYD.js";
import "./outbound-runtime-BSC4z6CP.js";
import { c as createNestedAllowlistOverrideResolver, o as createAccountScopedAllowlistNameResolver, r as buildLegacyDmAccountAllowlistAdapter } from "./allowlist-config-edit-CWwW-8J5.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { a as resolveDefaultDiscordAccountId, n as listDiscordAccountIds, o as resolveDiscordAccount } from "./accounts-0gXQeT93.js";
import { n as getChatChannelMeta, t as resolveDiscordOutboundSessionRoute } from "./outbound-session-route-DV3k4vXO.js";
import { t as parseDiscordTarget } from "./target-parsing-CSh64UAG.js";
import { c as shouldSuppressLocalDiscordExecApprovalPrompt, r as getDiscordApprovalCapability, t as DiscordUiContainer } from "./ui-7MjYF8PY.js";
import { t as discordMessageActions$1 } from "./channel-actions-74NdcgHa.js";
import { E as setBindingRecord, O as shouldPersistBindingMutations, T as saveBindingsToDisk, o as ensureBindingsLoaded, t as BINDINGS_BY_THREAD_ID, v as resolveBindingIdsForSession } from "./thread-bindings.state-DC3Z1-ig.js";
import { n as normalizeDiscordMessagingTarget, r as normalizeDiscordOutboundTarget, t as looksLikeDiscordTargetId } from "./normalize-DKL38iFv.js";
import { t as getDiscordRuntime } from "./runtime-Dj8ZeIkC.js";
import { t as normalizeExplicitDiscordSessionKey } from "./session-key-normalization-D0-vEB-h.js";
import { t as inspectDiscordAccount } from "./account-inspect-Ba31ZWUu.js";
import { t as DiscordChannelConfigSchema } from "./config-schema-CEzWSp7C.js";
import { a as secretTargetRegistryEntries, i as collectRuntimeConfigAssignments, n as collectUnsupportedSecretRefConfigCandidates, r as unsupportedSecretRefSurfacePatterns, s as normalizeCompatibilityConfig, t as deriveLegacySessionChatType } from "./session-contract-cFgc7KBG.js";
import { t as DISCORD_LEGACY_CONFIG_RULES } from "./doctor-shared-CJkx97Bx.js";
import { createRequire } from "node:module";
//#region extensions/discord/src/group-policy.ts
function normalizeDiscordSlug(value) {
	return normalizeAtHashSlug(value);
}
function resolveDiscordGuildEntry(guilds, groupSpace) {
	if (!guilds || Object.keys(guilds).length === 0) return null;
	const space = groupSpace?.trim() ?? "";
	if (space && guilds[space]) return guilds[space];
	const normalized = normalizeDiscordSlug(space);
	if (normalized && guilds[normalized]) return guilds[normalized];
	if (normalized) {
		const match = Object.values(guilds).find((entry) => normalizeDiscordSlug(entry?.slug ?? void 0) === normalized);
		if (match) return match;
	}
	return guilds["*"] ?? null;
}
function resolveDiscordChannelEntry(channelEntries, params) {
	if (!channelEntries || Object.keys(channelEntries).length === 0) return;
	const groupChannel = params.groupChannel;
	const channelSlug = normalizeDiscordSlug(groupChannel);
	return (params.groupId ? channelEntries[params.groupId] : void 0) ?? (channelSlug ? channelEntries[channelSlug] ?? channelEntries[`#${channelSlug}`] : void 0) ?? (groupChannel ? channelEntries[normalizeDiscordSlug(groupChannel)] : void 0);
}
function resolveSenderToolsEntry(entry, params) {
	if (!entry) return;
	return resolveToolsBySender({
		toolsBySender: entry.toolsBySender,
		senderId: params.senderId,
		senderName: params.senderName,
		senderUsername: params.senderUsername,
		senderE164: params.senderE164
	}) ?? entry.tools;
}
function resolveDiscordPolicyContext(params) {
	const guildEntry = resolveDiscordGuildEntry((params.accountId ? params.cfg.channels?.discord?.accounts?.[params.accountId]?.guilds : void 0) ?? params.cfg.channels?.discord?.guilds, params.groupSpace);
	const channelEntries = guildEntry?.channels;
	return {
		guildEntry,
		channelEntry: channelEntries && Object.keys(channelEntries).length > 0 ? resolveDiscordChannelEntry(channelEntries, params) : void 0
	};
}
function resolveDiscordGroupRequireMention(params) {
	const context = resolveDiscordPolicyContext(params);
	if (typeof context.channelEntry?.requireMention === "boolean") return context.channelEntry.requireMention;
	if (typeof context.guildEntry?.requireMention === "boolean") return context.guildEntry.requireMention;
	return true;
}
function resolveDiscordGroupToolPolicy(params) {
	const context = resolveDiscordPolicyContext(params);
	const channelPolicy = resolveSenderToolsEntry(context.channelEntry, params);
	if (channelPolicy) return channelPolicy;
	return resolveSenderToolsEntry(context.guildEntry, params);
}
//#endregion
//#region extensions/discord/src/monitor/thread-bindings.session-updates.ts
function normalizeNonNegativeMs(raw) {
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.floor(raw));
}
function resolveBindingIdsForTargetSession(params) {
	ensureBindingsLoaded();
	const targetSessionKey = params.targetSessionKey.trim();
	if (!targetSessionKey) return [];
	return resolveBindingIdsForSession({
		targetSessionKey,
		accountId: params.accountId ? normalizeAccountId(params.accountId) : void 0,
		targetKind: params.targetKind
	});
}
function updateBindingsForTargetSession(ids, update) {
	if (ids.length === 0) return [];
	const now = Date.now();
	const updated = [];
	for (const bindingKey of ids) {
		const existing = BINDINGS_BY_THREAD_ID.get(bindingKey);
		if (!existing) continue;
		const nextRecord = update(existing, now);
		setBindingRecord(nextRecord);
		updated.push(nextRecord);
	}
	if (updated.length > 0 && shouldPersistBindingMutations()) saveBindingsToDisk({ force: true });
	return updated;
}
function setThreadBindingIdleTimeoutBySessionKey(params) {
	const ids = resolveBindingIdsForTargetSession(params);
	const idleTimeoutMs = normalizeNonNegativeMs(params.idleTimeoutMs);
	return updateBindingsForTargetSession(ids, (existing, now) => ({
		...existing,
		idleTimeoutMs,
		lastActivityAt: now
	}));
}
function setThreadBindingMaxAgeBySessionKey(params) {
	const ids = resolveBindingIdsForTargetSession(params);
	const maxAgeMs = normalizeNonNegativeMs(params.maxAgeMs);
	return updateBindingsForTargetSession(ids, (existing, now) => ({
		...existing,
		maxAgeMs,
		boundAt: now,
		lastActivityAt: now
	}));
}
const discordSetupAdapter = createEnvPatchedAccountSetupAdapter({
	channelKey: "discord",
	defaultAccountOnlyEnvError: "DISCORD_BOT_TOKEN can only be used for the default account.",
	missingCredentialError: "Discord requires token (or --use-env).",
	hasCredentials: (input) => Boolean(input.token),
	buildPatch: (input) => input.token ? { token: input.token } : {}
});
//#endregion
//#region extensions/discord/src/shared.ts
const DISCORD_CHANNEL = "discord";
let discordDoctorModulePromise;
async function loadDiscordDoctorModule() {
	discordDoctorModulePromise ??= import("./doctor-B1ZtKuhT.js");
	return await discordDoctorModulePromise;
}
const discordDoctor = {
	dmAllowFromMode: "topOrNested",
	groupModel: "route",
	groupAllowFromFallbackToAllowFrom: false,
	warnOnEmptyGroupSenderAllowlist: false,
	legacyConfigRules: DISCORD_LEGACY_CONFIG_RULES,
	normalizeCompatibilityConfig,
	collectPreviewWarnings: async (params) => (await loadDiscordDoctorModule()).discordDoctor.collectPreviewWarnings?.(params) ?? [],
	collectMutableAllowlistWarnings: async (params) => (await loadDiscordDoctorModule()).discordDoctor.collectMutableAllowlistWarnings?.(params) ?? [],
	repairConfig: async (params) => (await loadDiscordDoctorModule()).discordDoctor.repairConfig?.(params) ?? {
		config: params.cfg,
		changes: []
	}
};
const discordConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: DISCORD_CHANNEL,
	listAccountIds: listDiscordAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveDiscordAccount),
	inspectAccount: adaptScopedAccountAccessor(inspectDiscordAccount),
	defaultAccountId: resolveDefaultDiscordAccountId,
	clearBaseFields: ["token", "name"],
	resolveAllowFrom: (account) => account.config.dm?.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({ allowFrom }),
	resolveDefaultTo: (account) => account.config.defaultTo
});
function createDiscordPluginBase(params) {
	return {
		id: DISCORD_CHANNEL,
		...params.setupWizard ? { setupWizard: params.setupWizard } : {},
		meta: { ...getChatChannelMeta(DISCORD_CHANNEL) },
		capabilities: {
			chatTypes: [
				"direct",
				"channel",
				"thread"
			],
			polls: true,
			reactions: true,
			threads: true,
			media: true,
			nativeCommands: true
		},
		commands: {
			nativeCommandsAutoEnabled: true,
			nativeSkillsAutoEnabled: true,
			resolveNativeCommandName: ({ commandKey, defaultName }) => commandKey === "tts" ? "voice" : defaultName
		},
		doctor: discordDoctor,
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.discord"] },
		configSchema: DiscordChannelConfigSchema,
		config: {
			...discordConfigAdapter,
			hasConfiguredState: ({ env }) => typeof env?.DISCORD_BOT_TOKEN === "string" && env.DISCORD_BOT_TOKEN.trim().length > 0,
			isConfigured: (account) => Boolean(account.token?.trim()),
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: Boolean(account.token?.trim()),
				extra: { tokenSource: account.tokenSource }
			})
		},
		messaging: { deriveLegacySessionChatType },
		secrets: {
			secretTargetRegistryEntries,
			unsupportedSecretRefSurfacePatterns,
			collectUnsupportedSecretRefConfigCandidates,
			collectRuntimeConfigAssignments
		},
		setup: params.setup
	};
}
//#endregion
//#region extensions/discord/src/status-issues.ts
function readDiscordAccountStatus(value) {
	if (!isRecord(value)) return null;
	return {
		accountId: value.accountId,
		enabled: value.enabled,
		configured: value.configured,
		application: value.application,
		audit: value.audit
	};
}
function readDiscordApplicationSummary(value) {
	if (!isRecord(value)) return {};
	const intentsRaw = value.intents;
	if (!isRecord(intentsRaw)) return {};
	return { intents: { messageContent: intentsRaw.messageContent === "enabled" || intentsRaw.messageContent === "limited" || intentsRaw.messageContent === "disabled" ? intentsRaw.messageContent : void 0 } };
}
function readDiscordPermissionsAuditSummary(value) {
	if (!isRecord(value)) return {};
	const unresolvedChannels = typeof value.unresolvedChannels === "number" && Number.isFinite(value.unresolvedChannels) ? value.unresolvedChannels : void 0;
	const channelsRaw = value.channels;
	return {
		unresolvedChannels,
		channels: Array.isArray(channelsRaw) ? channelsRaw.map((entry) => {
			if (!isRecord(entry)) return null;
			const channelId = asString(entry.channelId);
			if (!channelId) return null;
			const ok = typeof entry.ok === "boolean" ? entry.ok : void 0;
			const missing = Array.isArray(entry.missing) ? entry.missing.map((v) => asString(v)).filter(Boolean) : void 0;
			const error = asString(entry.error) ?? null;
			const matchKey = asString(entry.matchKey) ?? void 0;
			const matchSource = asString(entry.matchSource) ?? void 0;
			return {
				channelId,
				ok,
				missing: missing?.length ? missing : void 0,
				error,
				matchKey,
				matchSource
			};
		}).filter(Boolean) : void 0
	};
}
function collectDiscordStatusIssues(accounts) {
	const issues = [];
	for (const entry of accounts) {
		const account = readDiscordAccountStatus(entry);
		if (!account) continue;
		const accountId = resolveEnabledConfiguredAccountId(account);
		if (!accountId) continue;
		if (readDiscordApplicationSummary(account.application).intents?.messageContent === "disabled") issues.push({
			channel: "discord",
			accountId,
			kind: "intent",
			message: "Message Content Intent is disabled. Bot may not see normal channel messages.",
			fix: "Enable Message Content Intent in Discord Dev Portal → Bot → Privileged Gateway Intents, or require mention-only operation."
		});
		const audit = readDiscordPermissionsAuditSummary(account.audit);
		if (audit.unresolvedChannels && audit.unresolvedChannels > 0) issues.push({
			channel: "discord",
			accountId,
			kind: "config",
			message: `Some configured guild channels are not numeric IDs (unresolvedChannels=${audit.unresolvedChannels}). Permission audit can only check numeric channel IDs.`,
			fix: "Use numeric channel IDs as keys in channels.discord.guilds.*.channels (then rerun channels status --probe)."
		});
		for (const channel of audit.channels ?? []) {
			if (channel.ok === true) continue;
			const missing = channel.missing?.length ? ` missing ${channel.missing.join(", ")}` : "";
			const error = channel.error ? `: ${channel.error}` : "";
			const baseMessage = `Channel ${channel.channelId} permission check failed.${missing}${error}`;
			issues.push({
				channel: "discord",
				accountId,
				kind: "permissions",
				message: appendMatchMetadata(baseMessage, {
					matchKey: channel.matchKey,
					matchSource: channel.matchSource
				}),
				fix: "Ensure the bot role can view + send in this channel (and that channel overrides don't deny it)."
			});
		}
	}
	return issues;
}
//#endregion
//#region extensions/discord/src/channel.ts
let discordProviderRuntimePromise;
let discordProbeRuntimePromise;
let discordAuditModulePromise;
let discordSendModulePromise;
let discordDirectoryLiveModulePromise;
let discordCarbonModuleCache = null;
const loadDiscordDirectoryConfigModule = createLazyRuntimeModule(() => import("./directory-config-bezk3iCy.js"));
const loadDiscordSecurityAuditModule = createLazyRuntimeModule(() => import("./security-audit.runtime-HU1dYuyT.js"));
const loadDiscordResolveChannelsModule = createLazyRuntimeModule(() => import("./resolve-channels-B8dyJric.js"));
const loadDiscordResolveUsersModule = createLazyRuntimeModule(() => import("./resolve-users-DFMjvIBN.js"));
const loadDiscordThreadBindingsManagerModule = createLazyRuntimeModule(() => import("./thread-bindings.manager-BxhhccEL.js"));
const require = createRequire(import.meta.url);
async function loadDiscordProviderRuntime() {
	discordProviderRuntimePromise ??= import("./provider.runtime-BlZSfz5M.js");
	return await discordProviderRuntimePromise;
}
async function loadDiscordProbeRuntime() {
	discordProbeRuntimePromise ??= import("./probe.runtime-CfX6b_0p.js");
	return await discordProbeRuntimePromise;
}
async function loadDiscordAuditModule() {
	discordAuditModulePromise ??= import("./audit-RPR6RCq2.js");
	return await discordAuditModulePromise;
}
async function loadDiscordSendModule() {
	discordSendModulePromise ??= import("./send-CFDrFTjz.js");
	return await discordSendModulePromise;
}
async function loadDiscordDirectoryLiveModule() {
	discordDirectoryLiveModulePromise ??= import("./directory-live-CpoqsgNn.js");
	return await discordDirectoryLiveModulePromise;
}
function loadDiscordCarbonModule() {
	discordCarbonModuleCache ??= require("@buape/carbon");
	return discordCarbonModuleCache;
}
({ ...getChatChannelMeta("discord") });
const REQUIRED_DISCORD_PERMISSIONS = ["ViewChannel", "SendMessages"];
const DISCORD_ACCOUNT_STARTUP_STAGGER_MS = 1e4;
const DISCORD_VIDEO_MEDIA_EXTENSIONS = new Set([
	".avi",
	".m4v",
	".mkv",
	".mov",
	".mp4",
	".webm"
]);
function normalizeMediaPathForExtension(mediaUrl) {
	const trimmed = mediaUrl.trim();
	if (!trimmed) return "";
	try {
		return new URL(trimmed).pathname.toLowerCase();
	} catch {
		const withoutHash = trimmed.split("#", 1)[0] ?? trimmed;
		return (withoutHash.split("?", 1)[0] ?? withoutHash).toLowerCase();
	}
}
function isLikelyDiscordVideoMedia(mediaUrl) {
	const normalized = normalizeMediaPathForExtension(mediaUrl);
	for (const ext of DISCORD_VIDEO_MEDIA_EXTENSIONS) if (normalized.endsWith(ext)) return true;
	return false;
}
function resolveDiscordAttachedOutboundTarget(params) {
	if (params.threadId == null) return params.to;
	const threadId = String(params.threadId).trim();
	return threadId ? `channel:${threadId}` : params.to;
}
function resolveRuntimeDiscordMessageActions() {
	try {
		return getDiscordRuntime().channel?.discord?.messageActions ?? null;
	} catch {
		return null;
	}
}
function resolveOptionalDiscordRuntime() {
	try {
		return getDiscordRuntime();
	} catch {
		return null;
	}
}
async function resolveDiscordSend(deps) {
	return resolveOutboundSendDep(deps, "discord") ?? resolveOptionalDiscordRuntime()?.channel?.discord?.sendMessageDiscord ?? (await loadDiscordSendModule()).sendMessageDiscord;
}
const discordMessageActions = {
	describeMessageTool: (ctx) => resolveRuntimeDiscordMessageActions()?.describeMessageTool?.(ctx) ?? discordMessageActions$1.describeMessageTool?.(ctx) ?? null,
	extractToolSend: (ctx) => resolveRuntimeDiscordMessageActions()?.extractToolSend?.(ctx) ?? discordMessageActions$1.extractToolSend?.(ctx) ?? null,
	handleAction: async (ctx) => {
		const runtimeHandleAction = resolveRuntimeDiscordMessageActions()?.handleAction;
		if (runtimeHandleAction) return await runtimeHandleAction(ctx);
		if (!discordMessageActions$1.handleAction) throw new Error("Discord message actions not available");
		return await discordMessageActions$1.handleAction(ctx);
	}
};
function resolveDiscordStartupDelayMs(cfg, accountId) {
	const startupIndex = listDiscordAccountIds(cfg).filter((candidateId) => {
		const candidate = resolveDiscordAccount({
			cfg,
			accountId: candidateId
		});
		return candidate.enabled && (resolveConfiguredFromCredentialStatuses(candidate) ?? Boolean(candidate.token.trim()));
	}).findIndex((candidateId) => candidateId === accountId);
	return startupIndex <= 0 ? 0 : startupIndex * DISCORD_ACCOUNT_STARTUP_STAGGER_MS;
}
const resolveDiscordDmPolicy = createScopedDmSecurityResolver({
	channelKey: "discord",
	resolvePolicy: (account) => account.config.dm?.policy,
	resolveAllowFrom: (account) => account.config.dm?.allowFrom,
	allowFromPathSuffix: "dm.",
	normalizeEntry: (raw) => raw.trim().replace(/^(discord|user):/i, "").replace(/^<@!?(\d+)>$/, "$1")
});
function formatDiscordIntents(intents) {
	if (!intents) return "unknown";
	return [
		`messageContent=${intents.messageContent ?? "unknown"}`,
		`guildMembers=${intents.guildMembers ?? "unknown"}`,
		`presence=${intents.presence ?? "unknown"}`
	].join(" ");
}
function buildDiscordCrossContextComponents(params) {
	const { Separator, TextDisplay } = loadDiscordCarbonModule();
	const trimmed = params.message.trim();
	const components = [];
	if (trimmed) {
		components.push(new TextDisplay(params.message));
		components.push(new Separator({
			divider: true,
			spacing: "small"
		}));
	}
	components.push(new TextDisplay(`*From ${params.originLabel}*`));
	return [new DiscordUiContainer({
		cfg: params.cfg,
		accountId: params.accountId,
		components
	})];
}
const resolveDiscordAllowlistGroupOverrides = createNestedAllowlistOverrideResolver({
	resolveRecord: (account) => account.config.guilds,
	outerLabel: (guildKey) => `guild ${guildKey}`,
	resolveOuterEntries: (guildCfg) => guildCfg?.users,
	resolveChildren: (guildCfg) => guildCfg?.channels,
	innerLabel: (guildKey, channelKey) => `guild ${guildKey} / channel ${channelKey}`,
	resolveInnerEntries: (channelCfg) => channelCfg?.users
});
const resolveDiscordAllowlistNames = createAccountScopedAllowlistNameResolver({
	resolveAccount: resolveDiscordAccount,
	resolveToken: (account) => account.token,
	resolveNames: async ({ token, entries }) => (await loadDiscordResolveUsersModule()).resolveDiscordUserAllowlist({
		token,
		entries
	})
});
const collectDiscordSecurityWarnings = createOpenProviderConfiguredRouteWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.discord !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	resolveRouteAllowlistConfigured: (account) => Object.keys(account.config.guilds ?? {}).length > 0,
	configureRouteAllowlist: {
		surface: "Discord guilds",
		openScope: "any channel not explicitly denied",
		groupPolicyPath: "channels.discord.groupPolicy",
		routeAllowlistPath: "channels.discord.guilds.<id>.channels"
	},
	missingRouteAllowlist: {
		surface: "Discord guilds",
		openBehavior: "with no guild/channel allowlist; any channel can trigger (mention-gated)",
		remediation: "Set channels.discord.groupPolicy=\"allowlist\" and configure channels.discord.guilds.<id>.channels"
	}
});
function normalizeDiscordAcpConversationId(conversationId) {
	const normalized = conversationId.trim();
	return normalized ? { conversationId: normalized } : null;
}
function matchDiscordAcpConversation(params) {
	if (params.bindingConversationId === params.conversationId) return {
		conversationId: params.conversationId,
		matchPriority: 2
	};
	if (params.parentConversationId && params.parentConversationId !== params.conversationId && params.bindingConversationId === params.parentConversationId) return {
		conversationId: params.parentConversationId,
		matchPriority: 1
	};
	return null;
}
function resolveDiscordConversationIdFromTargets(targets) {
	for (const raw of targets) {
		const trimmed = raw?.trim();
		if (!trimmed) continue;
		try {
			const target = parseDiscordTarget(trimmed, { defaultKind: "channel" });
			if (target?.normalized) return target.normalized;
		} catch {
			const mentionMatch = trimmed.match(/^<#(\d+)>$/);
			if (mentionMatch?.[1]) return `channel:${mentionMatch[1]}`;
			if (/^\d{6,}$/.test(trimmed)) return normalizeDiscordMessagingTarget(trimmed);
		}
	}
}
function parseDiscordParentChannelFromSessionKey(raw) {
	const sessionKey = typeof raw === "string" ? raw.trim().toLowerCase() : "";
	if (!sessionKey) return;
	const match = sessionKey.match(/(?:^|:)channel:([^:]+)$/);
	return match?.[1] ? `channel:${match[1]}` : void 0;
}
function resolveDiscordCommandConversation(params) {
	const targets = [
		params.originatingTo,
		params.commandTo,
		params.fallbackTo
	];
	if (params.threadId) {
		const parentConversationId = normalizeDiscordMessagingTarget(params.threadParentId?.trim() ?? "") || parseDiscordParentChannelFromSessionKey(params.parentSessionKey) || resolveDiscordConversationIdFromTargets(targets);
		return {
			conversationId: params.threadId,
			...parentConversationId && parentConversationId !== params.threadId ? { parentConversationId } : {}
		};
	}
	const conversationId = resolveDiscordConversationIdFromTargets(targets);
	return conversationId ? { conversationId } : null;
}
function resolveDiscordInboundConversation(params) {
	const rawSender = params.from?.trim() || "";
	if (!params.isGroup && rawSender) {
		const senderTarget = parseDiscordTarget(rawSender, { defaultKind: "user" });
		if (senderTarget?.kind === "user") return { conversationId: `user:${senderTarget.id}` };
	}
	const rawTarget = params.to?.trim() || params.conversationId?.trim() || "";
	if (!rawTarget) return null;
	const target = parseDiscordTarget(rawTarget, { defaultKind: "channel" });
	return target ? { conversationId: `${target.kind}:${target.id}` } : null;
}
function toConversationLifecycleBinding(binding) {
	return {
		boundAt: binding.boundAt,
		lastActivityAt: typeof binding.lastActivityAt === "number" ? binding.lastActivityAt : binding.boundAt,
		idleTimeoutMs: typeof binding.idleTimeoutMs === "number" ? binding.idleTimeoutMs : void 0,
		maxAgeMs: typeof binding.maxAgeMs === "number" ? binding.maxAgeMs : void 0
	};
}
function parseDiscordExplicitTarget(raw) {
	try {
		const target = parseDiscordTarget(raw, { defaultKind: "channel" });
		if (!target) return null;
		return {
			to: target.id,
			chatType: target.kind === "user" ? "direct" : "channel"
		};
	} catch {
		return null;
	}
}
const discordPlugin = createChatChannelPlugin({
	base: {
		...createDiscordPluginBase({ setup: discordSetupAdapter }),
		allowlist: {
			...buildLegacyDmAccountAllowlistAdapter({
				channelId: "discord",
				resolveAccount: resolveDiscordAccount,
				normalize: ({ cfg, accountId, values }) => discordConfigAdapter.formatAllowFrom({
					cfg,
					accountId,
					allowFrom: values
				}),
				resolveDmAllowFrom: (account) => account.config.allowFrom ?? account.config.dm?.allowFrom,
				resolveGroupPolicy: (account) => account.config.groupPolicy,
				resolveGroupOverrides: resolveDiscordAllowlistGroupOverrides
			}),
			resolveNames: resolveDiscordAllowlistNames
		},
		groups: {
			resolveRequireMention: resolveDiscordGroupRequireMention,
			resolveToolPolicy: resolveDiscordGroupToolPolicy
		},
		mentions: { stripPatterns: () => ["<@!?\\d+>"] },
		agentPrompt: { messageToolHints: () => ["- Discord components: set `components` when sending messages to include buttons, selects, or v2 containers.", "- Forms: add `components.modal` (title, fields). OpenClaw adds a trigger button and routes submissions as new messages."] },
		messaging: {
			normalizeTarget: normalizeDiscordMessagingTarget,
			resolveInboundConversation: ({ from, to, conversationId, isGroup }) => resolveDiscordInboundConversation({
				from,
				to,
				conversationId,
				isGroup
			}),
			normalizeExplicitSessionKey: ({ sessionKey, ctx }) => normalizeExplicitDiscordSessionKey(sessionKey, ctx),
			resolveSessionTarget: ({ id }) => normalizeDiscordMessagingTarget(`channel:${id}`),
			parseExplicitTarget: ({ raw }) => parseDiscordExplicitTarget(raw),
			inferTargetChatType: ({ to }) => parseDiscordExplicitTarget(to)?.chatType,
			buildCrossContextComponents: buildDiscordCrossContextComponents,
			resolveOutboundSessionRoute: (params) => resolveDiscordOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: looksLikeDiscordTargetId,
				hint: "<channelId|user:ID|channel:ID>"
			}
		},
		approvalCapability: getDiscordApprovalCapability(),
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => (await loadDiscordDirectoryConfigModule()).listDiscordDirectoryPeersFromConfig(params),
			listGroups: async (params) => (await loadDiscordDirectoryConfigModule()).listDiscordDirectoryGroupsFromConfig(params),
			...createRuntimeDirectoryLiveAdapter({
				getRuntime: loadDiscordDirectoryLiveModule,
				listPeersLive: (runtime) => runtime.listDiscordDirectoryPeersLive,
				listGroupsLive: (runtime) => runtime.listDiscordDirectoryGroupsLive
			})
		}),
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind }) => {
			const account = resolveDiscordAccount({
				cfg,
				accountId
			});
			if (kind === "group") return resolveTargetsWithOptionalToken({
				token: account.token,
				inputs,
				missingTokenNote: "missing Discord token",
				resolveWithToken: async ({ token, inputs }) => (await loadDiscordResolveChannelsModule()).resolveDiscordChannelAllowlist({
					token,
					entries: inputs
				}),
				mapResolved: (entry) => ({
					input: entry.input,
					resolved: entry.resolved,
					id: entry.channelId ?? entry.guildId,
					name: entry.channelName ?? entry.guildName ?? (entry.guildId && !entry.channelId ? entry.guildId : void 0),
					note: entry.note
				})
			});
			return resolveTargetsWithOptionalToken({
				token: account.token,
				inputs,
				missingTokenNote: "missing Discord token",
				resolveWithToken: async ({ token, inputs }) => (await loadDiscordResolveUsersModule()).resolveDiscordUserAllowlist({
					token,
					entries: inputs
				}),
				mapResolved: (entry) => ({
					input: entry.input,
					resolved: entry.resolved,
					id: entry.id,
					name: entry.name,
					note: entry.note
				})
			});
		} },
		actions: discordMessageActions,
		bindings: {
			compileConfiguredBinding: ({ conversationId }) => normalizeDiscordAcpConversationId(conversationId),
			matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) => matchDiscordAcpConversation({
				bindingConversationId: compiledBinding.conversationId,
				conversationId,
				parentConversationId
			}),
			resolveCommandConversation: ({ threadId, threadParentId, parentSessionKey, originatingTo, commandTo, fallbackTo }) => resolveDiscordCommandConversation({
				threadId,
				threadParentId,
				parentSessionKey,
				originatingTo,
				commandTo,
				fallbackTo
			})
		},
		conversationBindings: {
			supportsCurrentConversationBinding: true,
			defaultTopLevelPlacement: "child",
			createManager: async ({ cfg, accountId }) => (await loadDiscordThreadBindingsManagerModule()).createThreadBindingManager({
				cfg,
				accountId: accountId ?? void 0,
				persist: false,
				enableSweeper: false
			}),
			setIdleTimeoutBySessionKey: ({ targetSessionKey, accountId, idleTimeoutMs }) => setThreadBindingIdleTimeoutBySessionKey({
				targetSessionKey,
				accountId: accountId ?? void 0,
				idleTimeoutMs
			}).map(toConversationLifecycleBinding),
			setMaxAgeBySessionKey: ({ targetSessionKey, accountId, maxAgeMs }) => setThreadBindingMaxAgeBySessionKey({
				targetSessionKey,
				accountId: accountId ?? void 0,
				maxAgeMs
			}).map(toConversationLifecycleBinding)
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID, {
				connected: false,
				reconnectAttempts: 0,
				lastConnectedAt: null,
				lastDisconnect: null,
				lastEventAt: null
			}),
			collectStatusIssues: collectDiscordStatusIssues,
			buildChannelSummary: ({ snapshot }) => buildTokenChannelStatusSummary(snapshot, { includeMode: false }),
			probeAccount: async ({ account, timeoutMs }) => (await loadDiscordProbeRuntime()).probeDiscord(account.token, timeoutMs, { includeApplication: true }),
			formatCapabilitiesProbe: ({ probe }) => {
				const discordProbe = probe;
				const lines = [];
				if (discordProbe?.bot?.username) {
					const botId = discordProbe.bot.id ? ` (${discordProbe.bot.id})` : "";
					lines.push({ text: `Bot: @${discordProbe.bot.username}${botId}` });
				}
				if (discordProbe?.application?.intents) lines.push({ text: `Intents: ${formatDiscordIntents(discordProbe.application.intents)}` });
				return lines;
			},
			buildCapabilitiesDiagnostics: async ({ account, timeoutMs, target }) => {
				if (!target?.trim()) return;
				const parsedTarget = parseDiscordTarget(target.trim(), { defaultKind: "channel" });
				const details = { target: {
					raw: target,
					normalized: parsedTarget?.normalized,
					kind: parsedTarget?.kind,
					channelId: parsedTarget?.kind === "channel" ? parsedTarget.id : void 0
				} };
				if (!parsedTarget || parsedTarget.kind !== "channel") return {
					details,
					lines: [{
						text: "Permissions: Target looks like a DM user; pass channel:<id> to audit channel permissions.",
						tone: "error"
					}]
				};
				const token = account.token?.trim();
				if (!token) return {
					details,
					lines: [{
						text: "Permissions: Discord bot token missing for permission audit.",
						tone: "error"
					}]
				};
				try {
					const perms = await (await loadDiscordSendModule()).fetchChannelPermissionsDiscord(parsedTarget.id, {
						token,
						accountId: account.accountId ?? void 0
					});
					const missingRequired = REQUIRED_DISCORD_PERMISSIONS.filter((permission) => !perms.permissions.includes(permission));
					details.permissions = {
						channelId: perms.channelId,
						guildId: perms.guildId,
						isDm: perms.isDm,
						channelType: perms.channelType,
						permissions: perms.permissions,
						missingRequired,
						raw: perms.raw
					};
					return {
						details,
						lines: [{ text: `Permissions (${perms.channelId}): ${perms.permissions.length ? perms.permissions.join(", ") : "none"}` }, missingRequired.length > 0 ? {
							text: `Missing required: ${missingRequired.join(", ")}`,
							tone: "warn"
						} : {
							text: "Missing required: none",
							tone: "success"
						}]
					};
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					details.permissions = {
						channelId: parsedTarget.id,
						error: message
					};
					return {
						details,
						lines: [{
							text: `Permissions: ${message}`,
							tone: "error"
						}]
					};
				}
			},
			auditAccount: async ({ account, timeoutMs, cfg }) => {
				const { auditDiscordChannelPermissions, collectDiscordAuditChannelIds } = await loadDiscordAuditModule();
				const { channelIds, unresolvedChannels } = collectDiscordAuditChannelIds({
					cfg,
					accountId: account.accountId
				});
				if (!channelIds.length && unresolvedChannels === 0) return;
				const botToken = account.token?.trim();
				if (!botToken) return {
					ok: unresolvedChannels === 0,
					checkedChannels: 0,
					unresolvedChannels,
					channels: [],
					elapsedMs: 0
				};
				return {
					...await auditDiscordChannelPermissions({
						token: botToken,
						accountId: account.accountId,
						channelIds,
						timeoutMs
					}),
					unresolvedChannels
				};
			},
			resolveAccountSnapshot: ({ account, runtime, probe, audit }) => {
				const configured = resolveConfiguredFromCredentialStatuses(account) ?? Boolean(account.token?.trim());
				const app = runtime?.application ?? probe?.application;
				const bot = runtime?.bot ?? probe?.bot;
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured,
					extra: {
						...projectCredentialSnapshotFields(account),
						connected: runtime?.connected ?? false,
						reconnectAttempts: runtime?.reconnectAttempts,
						lastConnectedAt: runtime?.lastConnectedAt ?? null,
						lastDisconnect: runtime?.lastDisconnect ?? null,
						lastEventAt: runtime?.lastEventAt ?? null,
						application: app ?? void 0,
						bot: bot ?? void 0,
						audit
					}
				};
			}
		}),
		gateway: { startAccount: async (ctx) => {
			const account = ctx.account;
			const startupDelayMs = resolveDiscordStartupDelayMs(ctx.cfg, account.accountId);
			if (startupDelayMs > 0) {
				ctx.log?.info(`[${account.accountId}] delaying provider startup ${Math.round(startupDelayMs / 1e3)}s to reduce Discord startup rate limits`);
				try {
					await sleepWithAbort(startupDelayMs, ctx.abortSignal);
				} catch {
					return;
				}
			}
			const token = account.token.trim();
			let discordBotLabel = "";
			try {
				const probe = await (await loadDiscordProbeRuntime()).probeDiscord(token, 2500, { includeApplication: true });
				const username = probe.ok ? probe.bot?.username?.trim() : null;
				if (username) discordBotLabel = ` (@${username})`;
				ctx.setStatus({
					accountId: account.accountId,
					bot: probe.bot,
					application: probe.application
				});
				const messageContent = probe.application?.intents?.messageContent;
				if (messageContent === "disabled") ctx.log?.warn(`[${account.accountId}] Discord Message Content Intent is disabled; bot may not respond to channel messages. Enable it in Discord Dev Portal (Bot → Privileged Gateway Intents) or require mentions.`);
				else if (messageContent === "limited") ctx.log?.info(`[${account.accountId}] Discord Message Content Intent is limited; bots under 100 servers can use it without verification.`);
			} catch (err) {
				if (getDiscordRuntime().logging.shouldLogVerbose()) ctx.log?.debug?.(`[${account.accountId}] bot probe failed: ${String(err)}`);
			}
			ctx.log?.info(`[${account.accountId}] starting provider${discordBotLabel}`);
			return (await loadDiscordProviderRuntime()).monitorDiscordProvider({
				token,
				accountId: account.accountId,
				config: ctx.cfg,
				runtime: ctx.runtime,
				abortSignal: ctx.abortSignal,
				mediaMaxMb: account.config.mediaMaxMb,
				historyLimit: account.config.historyLimit,
				setStatus: (patch) => ctx.setStatus({
					accountId: account.accountId,
					...patch
				})
			});
		} }
	},
	pairing: { text: {
		idLabel: "discordUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^(discord|user):/i),
		notify: async ({ id, message }) => {
			await (await loadDiscordSendModule()).sendMessageDiscord(`user:${id}`, message);
		}
	} },
	security: {
		resolveDmPolicy: resolveDiscordDmPolicy,
		collectWarnings: collectDiscordSecurityWarnings,
		collectAuditFindings: async (params) => (await loadDiscordSecurityAuditModule()).collectDiscordSecurityAuditFindings(params)
	},
	threading: { scopedAccountReplyToMode: {
		resolveAccount: (cfg, accountId) => resolveDiscordAccount({
			cfg,
			accountId
		}),
		resolveReplyToMode: (account) => account.config.replyToMode,
		fallback: "off"
	} },
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: null,
			textChunkLimit: 2e3,
			pollMaxOptions: 10,
			shouldSuppressLocalPayloadPrompt: ({ cfg, accountId, payload }) => shouldSuppressLocalDiscordExecApprovalPrompt({
				cfg,
				accountId,
				payload
			}),
			resolveTarget: ({ to }) => normalizeDiscordOutboundTarget(to)
		},
		attachedResults: {
			channel: "discord",
			sendText: async ({ cfg, to, text, accountId, deps, replyToId, threadId, silent }) => {
				return await (await resolveDiscordSend(deps))(resolveDiscordAttachedOutboundTarget({
					to,
					threadId
				}), text, {
					verbose: false,
					cfg,
					replyTo: replyToId ?? void 0,
					accountId: accountId ?? void 0,
					silent: silent ?? void 0
				});
			},
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, mediaReadFile, accountId, deps, replyToId, threadId, silent }) => {
				const send = await resolveDiscordSend(deps);
				const target = resolveDiscordAttachedOutboundTarget({
					to,
					threadId
				});
				if (text.trim() && mediaUrl && isLikelyDiscordVideoMedia(mediaUrl)) {
					await send(target, text, {
						verbose: false,
						cfg,
						replyTo: replyToId ?? void 0,
						accountId: accountId ?? void 0,
						silent: silent ?? void 0
					});
					return await send(target, "", {
						verbose: false,
						cfg,
						mediaUrl,
						mediaLocalRoots,
						mediaReadFile,
						accountId: accountId ?? void 0,
						silent: silent ?? void 0
					});
				}
				return await send(target, text, {
					verbose: false,
					cfg,
					mediaUrl,
					mediaLocalRoots,
					mediaReadFile,
					replyTo: replyToId ?? void 0,
					accountId: accountId ?? void 0,
					silent: silent ?? void 0
				});
			},
			sendPoll: async ({ cfg, to, poll, accountId, threadId, silent }) => await (await loadDiscordSendModule()).sendPollDiscord(resolveDiscordAttachedOutboundTarget({
				to,
				threadId
			}), poll, {
				cfg,
				accountId: accountId ?? void 0,
				silent: silent ?? void 0
			})
		}
	}
});
//#endregion
export { resolveDiscordGroupRequireMention as a, discordSetupAdapter as i, collectDiscordStatusIssues as n, resolveDiscordGroupToolPolicy as o, createDiscordPluginBase as r, discordPlugin as t };
