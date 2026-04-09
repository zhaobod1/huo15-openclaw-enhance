import { l as isRecord$1, u as normalizeE164 } from "./utils-ms6h9yny.js";
import { g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { i as createActionGate } from "./common-B7pbdYUb.js";
import { a as chunkText } from "./chunk-CKMbnOQL.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { n as createChannelPluginBase, o as getChatChannelMeta, t as buildChannelOutboundSessionRoute } from "./core-D7mi2qmR.js";
import { a as readChannelAllowFromStore } from "./pairing-store--adbbV4I.js";
import { g as createAllowlistProviderRouteAllowlistWarningCollector } from "./channel-policy-DIVRdPsQ.js";
import "./channel-pairing-DrJTvhRN.js";
import { d as createDefaultChannelRuntimeState, h as collectIssuesForEnabledAccounts, l as createAsyncComputedAccountStatusAdapter, m as asString } from "./status-helpers-ChR3_7qO.js";
import { a as createDelegatedSetupWizardProxy } from "./setup-wizard-proxy-CnO9z2dq.js";
import "./setup-runtime-QdMg-xhs.js";
import { n as resolveApprovalApprovers, t as createResolvedApproverActionAuthAdapter } from "./approval-auth-helpers-DNJdxO4L.js";
import "./reply-chunking-D9XwfVhm.js";
import "./cli-runtime-BFcZCBi1.js";
import "./account-resolution-CIVX3Yfx.js";
import { n as buildDmGroupAccountAllowlistAdapter } from "./allowlist-config-edit-CWwW-8J5.js";
import "./channel-actions-DLDrCW4b.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { i as listWhatsAppAccountIds, n as hasAnyWhatsAppAuth, o as resolveDefaultWhatsAppAccountId, s as resolveWhatsAppAccount } from "./accounts-DU73wvhy.js";
import { a as normalizeWhatsAppMessagingTarget, o as normalizeWhatsAppTarget, r as looksLikeWhatsAppTargetId, t as isWhatsAppGroupJid } from "./normalize-target-Rq2SUNBo.js";
import { c as resolveWhatsAppMentionStripRegexes, d as formatWhatsAppConfigAllowFromEntries, f as resolveWhatsAppReactionLevel, i as createWhatsAppOutboundBase, l as resolveWhatsAppGroupRequireMention, n as sendPollWhatsApp, o as resolveWhatsAppHeartbeatRecipients, p as resolveWhatsAppOutboundTarget, s as resolveWhatsAppGroupIntroHint, t as sendMessageWhatsApp, u as resolveWhatsAppGroupToolPolicy } from "./send-lXVwx8YQ.js";
import { t as createWhatsAppLoginTool } from "./agent-tools-login-_c0iN9bo.js";
import "./normalize-NKCRvjJ3.js";
import { t as getWhatsAppRuntime } from "./runtime-DvjCUocI.js";
import { i as whatsappCommandPolicy, n as isLegacyGroupSessionKey, r as resolveLegacyGroupSessionKey, t as canonicalizeLegacySessionKey } from "./session-contract-CcjFxIC0.js";
import { t as whatsappSetupAdapter } from "./setup-core-B17CR7rn.js";
import { t as WhatsAppChannelConfigSchema } from "./config-schema-DYC0u_uR.js";
import { d as webAuthExists } from "./auth-store-DP2PtQzV.js";
import fs from "node:fs";
import path from "node:path";
//#region extensions/whatsapp/src/approval-auth.ts
function normalizeWhatsAppApproverId(value) {
	const normalized = normalizeWhatsAppTarget(String(value));
	if (!normalized || normalized.endsWith("@g.us")) return;
	return normalized;
}
const whatsappApprovalAuth = createResolvedApproverActionAuthAdapter({
	channelLabel: "WhatsApp",
	resolveApprovers: ({ cfg, accountId }) => {
		const account = resolveWhatsAppAccount({
			cfg,
			accountId
		});
		return resolveApprovalApprovers({
			allowFrom: account.allowFrom,
			defaultTo: account.defaultTo,
			normalizeApprover: normalizeWhatsAppApproverId
		});
	},
	normalizeSenderId: (value) => normalizeWhatsAppApproverId(value)
});
//#endregion
//#region extensions/whatsapp/src/channel-actions.ts
function areWhatsAppAgentReactionsEnabled(params) {
	if (!params.cfg.channels?.whatsapp) return false;
	if (!createActionGate(params.cfg.channels.whatsapp.actions)("reactions")) return false;
	return resolveWhatsAppReactionLevel({
		cfg: params.cfg,
		accountId: params.accountId
	}).agentReactionsEnabled;
}
function hasAnyWhatsAppAccountWithAgentReactionsEnabled(cfg) {
	if (!cfg.channels?.whatsapp) return false;
	return listWhatsAppAccountIds(cfg).some((accountId) => {
		if (!resolveWhatsAppAccount({
			cfg,
			accountId
		}).enabled) return false;
		return areWhatsAppAgentReactionsEnabled({
			cfg,
			accountId
		});
	});
}
function resolveWhatsAppAgentReactionGuidance(params) {
	if (!params.cfg.channels?.whatsapp) return;
	if (!createActionGate(params.cfg.channels.whatsapp.actions)("reactions")) return;
	const resolved = resolveWhatsAppReactionLevel({
		cfg: params.cfg,
		accountId: params.accountId
	});
	if (!resolved.agentReactionsEnabled) return;
	return resolved.agentReactionGuidance;
}
function describeWhatsAppMessageActions(params) {
	if (!params.cfg.channels?.whatsapp) return null;
	const gate = createActionGate(params.cfg.channels.whatsapp.actions);
	const actions = /* @__PURE__ */ new Set();
	if (params.accountId != null ? areWhatsAppAgentReactionsEnabled({
		cfg: params.cfg,
		accountId: params.accountId ?? void 0
	}) : hasAnyWhatsAppAccountWithAgentReactionsEnabled(params.cfg)) actions.add("react");
	if (gate("polls")) actions.add("poll");
	return { actions: Array.from(actions) };
}
//#endregion
//#region extensions/whatsapp/src/channel-outbound.ts
function normalizeWhatsAppPayloadText(text) {
	return (text ?? "").replace(/^(?:[ \t]*\r?\n)+/, "");
}
const whatsappChannelOutbound = {
	...createWhatsAppOutboundBase({
		chunker: chunkText,
		sendMessageWhatsApp,
		sendPollWhatsApp,
		shouldLogVerbose: () => getWhatsAppRuntime().logging.shouldLogVerbose(),
		resolveTarget: ({ to, allowFrom, mode }) => resolveWhatsAppOutboundTarget({
			to,
			allowFrom,
			mode
		})
	}),
	normalizePayload: ({ payload }) => ({
		...payload,
		text: normalizeWhatsAppPayloadText(payload.text)
	})
};
//#endregion
//#region extensions/whatsapp/src/session-route.ts
function resolveWhatsAppOutboundSessionRoute(params) {
	const normalized = normalizeWhatsAppTarget(params.target);
	if (!normalized) return null;
	const isGroup = isWhatsAppGroupJid(normalized);
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "whatsapp",
		accountId: params.accountId,
		peer: {
			kind: isGroup ? "group" : "direct",
			id: normalized
		},
		chatType: isGroup ? "group" : "direct",
		from: normalized,
		to: normalized
	});
}
//#endregion
//#region extensions/whatsapp/src/doctor.ts
function normalizeCompatibilityConfig({ cfg }) {
	const legacyAckReaction = cfg.messages?.ackReaction?.trim();
	if (!legacyAckReaction || cfg.channels?.whatsapp === void 0) return {
		config: cfg,
		changes: []
	};
	if (cfg.channels.whatsapp?.ackReaction !== void 0) return {
		config: cfg,
		changes: []
	};
	const legacyScope = cfg.messages?.ackReactionScope ?? "group-mentions";
	let direct = true;
	let group = "mentions";
	if (legacyScope === "all") {
		direct = true;
		group = "always";
	} else if (legacyScope === "direct") {
		direct = true;
		group = "never";
	} else if (legacyScope === "group-all") {
		direct = false;
		group = "always";
	} else if (legacyScope === "group-mentions") {
		direct = false;
		group = "mentions";
	}
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				whatsapp: {
					...cfg.channels?.whatsapp,
					ackReaction: {
						emoji: legacyAckReaction,
						direct,
						group
					}
				}
			}
		},
		changes: [`Copied messages.ackReaction → channels.whatsapp.ackReaction (scope: ${legacyScope}).`]
	};
}
const whatsappDoctor = { normalizeCompatibilityConfig };
//#endregion
//#region extensions/whatsapp/src/security-fix.ts
function applyGroupAllowFromFromStore(params) {
	const next = structuredClone(params.cfg ?? {});
	const section = next.channels?.whatsapp;
	if (!section || typeof section !== "object" || params.storeAllowFrom.length === 0) return params.cfg;
	let changed = false;
	const maybeApply = (prefix, holder) => {
		if (holder.groupPolicy !== "allowlist") return;
		const allowFrom = Array.isArray(holder.allowFrom) ? holder.allowFrom : [];
		const groupAllowFrom = Array.isArray(holder.groupAllowFrom) ? holder.groupAllowFrom : [];
		if (allowFrom.length > 0 || groupAllowFrom.length > 0) return;
		holder.groupAllowFrom = params.storeAllowFrom;
		params.changes.push(`${prefix}groupAllowFrom=pairing-store`);
		changed = true;
	};
	maybeApply("channels.whatsapp.", section);
	const accounts = section.accounts;
	if (accounts && typeof accounts === "object") for (const [accountId, accountValue] of Object.entries(accounts)) {
		if (!accountValue || typeof accountValue !== "object") continue;
		maybeApply(`channels.whatsapp.accounts.${accountId}.`, accountValue);
	}
	return changed ? next : params.cfg;
}
async function applyWhatsAppSecurityConfigFixes(params) {
	const fromStore = await readChannelAllowFromStore("whatsapp", params.env, DEFAULT_ACCOUNT_ID).catch(() => []);
	const normalized = Array.from(new Set(fromStore.map((entry) => String(entry).trim()))).filter(Boolean);
	if (normalized.length === 0) return {
		config: params.cfg,
		changes: []
	};
	const changes = [];
	return {
		config: applyGroupAllowFromFromStore({
			cfg: params.cfg,
			storeAllowFrom: normalized,
			changes
		}),
		changes
	};
}
//#endregion
//#region extensions/whatsapp/src/shared.ts
const WHATSAPP_CHANNEL = "whatsapp";
const WHATSAPP_UNSUPPORTED_SECRET_REF_SURFACE_PATTERNS = ["channels.whatsapp.creds.json", "channels.whatsapp.accounts.*.creds.json"];
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function collectUnsupportedSecretRefConfigCandidates(raw) {
	if (!isRecord(raw) || !isRecord(raw.channels) || !isRecord(raw.channels.whatsapp)) return [];
	const candidates = [];
	const whatsapp = raw.channels.whatsapp;
	const creds = isRecord(whatsapp.creds) ? whatsapp.creds : null;
	if (creds) candidates.push({
		path: "channels.whatsapp.creds.json",
		value: creds.json
	});
	const accounts = isRecord(whatsapp.accounts) ? whatsapp.accounts : null;
	if (!accounts) return candidates;
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!isRecord(account) || !isRecord(account.creds)) continue;
		candidates.push({
			path: `channels.whatsapp.accounts.${accountId}.creds.json`,
			value: account.creds.json
		});
	}
	return candidates;
}
async function loadWhatsAppChannelRuntime() {
	return await import("./channel.runtime-DRoh715p.js");
}
const whatsappSetupWizardProxy = createWhatsAppSetupWizardProxy(async () => (await loadWhatsAppChannelRuntime()).whatsappSetupWizard);
const whatsappConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: WHATSAPP_CHANNEL,
	listAccountIds: listWhatsAppAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveWhatsAppAccount),
	defaultAccountId: resolveDefaultWhatsAppAccountId,
	clearBaseFields: [],
	allowTopLevel: false,
	resolveAllowFrom: (account) => account.allowFrom,
	formatAllowFrom: (allowFrom) => formatWhatsAppConfigAllowFromEntries(allowFrom),
	resolveDefaultTo: (account) => account.defaultTo
});
const whatsappResolveDmPolicy = createScopedDmSecurityResolver({
	channelKey: WHATSAPP_CHANNEL,
	resolvePolicy: (account) => account.dmPolicy,
	resolveAllowFrom: (account) => account.allowFrom,
	policyPathSuffix: "dmPolicy",
	normalizeEntry: (raw) => normalizeE164(raw)
});
function createWhatsAppSetupWizardProxy(loadWizard) {
	return createDelegatedSetupWizardProxy({
		channel: WHATSAPP_CHANNEL,
		loadWizard,
		status: {
			configuredLabel: "linked",
			unconfiguredLabel: "not linked",
			configuredHint: "linked",
			unconfiguredHint: "not linked",
			configuredScore: 5,
			unconfiguredScore: 4
		},
		resolveShouldPromptAccountIds: (params) => Boolean(params.shouldPromptAccountIds),
		credentials: [],
		delegateFinalize: true,
		disable: (cfg) => ({
			...cfg,
			channels: {
				...cfg.channels,
				whatsapp: {
					...cfg.channels?.whatsapp,
					enabled: false
				}
			}
		}),
		onAccountRecorded: (accountId, options) => {
			options?.onAccountId?.(WHATSAPP_CHANNEL, accountId);
		}
	});
}
function createWhatsAppPluginBase(params) {
	const collectWhatsAppSecurityWarnings = createAllowlistProviderRouteAllowlistWarningCollector({
		providerConfigPresent: (cfg) => cfg.channels?.whatsapp !== void 0,
		resolveGroupPolicy: (account) => account.groupPolicy,
		resolveRouteAllowlistConfigured: (account) => Boolean(account.groups) && Object.keys(account.groups ?? {}).length > 0,
		restrictSenders: {
			surface: "WhatsApp groups",
			openScope: "any member in allowed groups",
			groupPolicyPath: "channels.whatsapp.groupPolicy",
			groupAllowFromPath: "channels.whatsapp.groupAllowFrom"
		},
		noRouteAllowlist: {
			surface: "WhatsApp groups",
			routeAllowlistPath: "channels.whatsapp.groups",
			routeScope: "group",
			groupPolicyPath: "channels.whatsapp.groupPolicy",
			groupAllowFromPath: "channels.whatsapp.groupAllowFrom"
		}
	});
	const base = createChannelPluginBase({
		id: WHATSAPP_CHANNEL,
		meta: {
			...getChatChannelMeta(WHATSAPP_CHANNEL),
			showConfigured: false,
			quickstartAllowFrom: true,
			forceAccountBinding: true,
			preferSessionLookupForAnnounceTarget: true
		},
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			polls: true,
			reactions: true,
			media: true
		},
		reload: {
			configPrefixes: ["web"],
			noopPrefixes: ["channels.whatsapp"]
		},
		gatewayMethods: ["web.login.start", "web.login.wait"],
		configSchema: WhatsAppChannelConfigSchema,
		config: {
			...whatsappConfigAdapter,
			isEnabled: (account, cfg) => account.enabled && cfg.web?.enabled !== false,
			disabledReason: () => "disabled",
			isConfigured: params.isConfigured,
			hasPersistedAuthState: ({ cfg }) => hasAnyWhatsAppAuth(cfg),
			unconfiguredReason: () => "not linked",
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: Boolean(account.authDir),
				extra: {
					linked: Boolean(account.authDir),
					dmPolicy: account.dmPolicy,
					allowFrom: account.allowFrom
				}
			})
		},
		security: {
			applyConfigFixes: applyWhatsAppSecurityConfigFixes,
			resolveDmPolicy: whatsappResolveDmPolicy,
			collectWarnings: collectWhatsAppSecurityWarnings
		},
		doctor: whatsappDoctor,
		setup: params.setup,
		groups: params.groups
	});
	return {
		...base,
		setupWizard: base.setupWizard,
		capabilities: base.capabilities,
		reload: base.reload,
		gatewayMethods: base.gatewayMethods,
		configSchema: base.configSchema,
		config: base.config,
		messaging: {
			defaultMarkdownTableMode: "bullets",
			resolveLegacyGroupSessionKey,
			isLegacyGroupSessionKey,
			canonicalizeLegacySessionKey: (params) => canonicalizeLegacySessionKey({
				key: params.key,
				agentId: params.agentId
			})
		},
		secrets: {
			unsupportedSecretRefSurfacePatterns: WHATSAPP_UNSUPPORTED_SECRET_REF_SURFACE_PATTERNS,
			collectUnsupportedSecretRefConfigCandidates
		},
		security: base.security,
		groups: base.groups
	};
}
//#endregion
//#region extensions/whatsapp/src/state-migrations.ts
function fileExists(pathValue) {
	try {
		return fs.existsSync(pathValue) && fs.statSync(pathValue).isFile();
	} catch {
		return false;
	}
}
function isLegacyWhatsAppAuthFile(name) {
	if (name === "creds.json" || name === "creds.json.bak") return true;
	if (!name.endsWith(".json")) return false;
	return /^(app-state-sync|session|sender-key|pre-key)-/.test(name);
}
function detectWhatsAppLegacyStateMigrations(params) {
	const targetDir = path.join(params.oauthDir, "whatsapp", DEFAULT_ACCOUNT_ID);
	return (() => {
		try {
			return fs.readdirSync(params.oauthDir, { withFileTypes: true });
		} catch {
			return [];
		}
	})().flatMap((entry) => {
		if (!entry.isFile() || entry.name === "oauth.json" || !isLegacyWhatsAppAuthFile(entry.name)) return [];
		const sourcePath = path.join(params.oauthDir, entry.name);
		const targetPath = path.join(targetDir, entry.name);
		if (fileExists(targetPath)) return [];
		return [{
			kind: "move",
			label: `WhatsApp auth ${entry.name}`,
			sourcePath,
			targetPath
		}];
	});
}
//#endregion
//#region extensions/whatsapp/src/status-issues.ts
function readWhatsAppAccountStatus(value) {
	if (!isRecord$1(value)) return null;
	return {
		accountId: value.accountId,
		enabled: value.enabled,
		linked: value.linked,
		connected: value.connected,
		running: value.running,
		reconnectAttempts: value.reconnectAttempts,
		lastInboundAt: value.lastInboundAt,
		lastError: value.lastError,
		healthState: value.healthState
	};
}
function collectWhatsAppStatusIssues(accounts) {
	return collectIssuesForEnabledAccounts({
		accounts,
		readAccount: readWhatsAppAccountStatus,
		collectIssues: ({ account, accountId, issues }) => {
			const linked = account.linked === true;
			const running = account.running === true;
			const connected = account.connected === true;
			const reconnectAttempts = typeof account.reconnectAttempts === "number" ? account.reconnectAttempts : null;
			const lastInboundAt = typeof account.lastInboundAt === "number" ? account.lastInboundAt : null;
			const lastError = asString(account.lastError);
			const healthState = asString(account.healthState);
			if (!linked) {
				issues.push({
					channel: "whatsapp",
					accountId,
					kind: "auth",
					message: "Not linked (no WhatsApp Web session).",
					fix: `Run: ${formatCliCommand("openclaw channels login")} (scan QR on the gateway host).`
				});
				return;
			}
			if (healthState === "stale") {
				const staleSuffix = lastInboundAt != null ? ` (last inbound ${Math.max(0, Math.floor((Date.now() - lastInboundAt) / 6e4))}m ago)` : "";
				issues.push({
					channel: "whatsapp",
					accountId,
					kind: "runtime",
					message: `Linked but stale${staleSuffix}${lastError ? `: ${lastError}` : "."}`,
					fix: `Run: ${formatCliCommand("openclaw doctor")} (or restart the gateway). If it persists, relink via channels login and check logs.`
				});
				return;
			}
			if (healthState === "reconnecting" || healthState === "conflict" || healthState === "stopped") {
				const stateLabel = healthState === "conflict" ? "session conflict" : healthState === "reconnecting" ? "reconnecting" : "stopped";
				issues.push({
					channel: "whatsapp",
					accountId,
					kind: "runtime",
					message: `Linked but ${stateLabel}${reconnectAttempts != null ? ` (reconnectAttempts=${reconnectAttempts})` : ""}${lastError ? `: ${lastError}` : "."}`,
					fix: `Run: ${formatCliCommand("openclaw doctor")} (or restart the gateway). If it persists, relink via channels login and check logs.`
				});
				return;
			}
			if (healthState === "logged-out") {
				issues.push({
					channel: "whatsapp",
					accountId,
					kind: "auth",
					message: `Linked session logged out${lastError ? `: ${lastError}` : "."}`,
					fix: `Run: ${formatCliCommand("openclaw channels login")} (scan QR on the gateway host).`
				});
				return;
			}
			if (running && !connected) issues.push({
				channel: "whatsapp",
				accountId,
				kind: "runtime",
				message: `Linked but disconnected${reconnectAttempts != null ? ` (reconnectAttempts=${reconnectAttempts})` : ""}${lastError ? `: ${lastError}` : "."}`,
				fix: `Run: ${formatCliCommand("openclaw doctor")} (or restart the gateway). If it persists, relink via channels login and check logs.`
			});
		}
	});
}
//#endregion
//#region extensions/whatsapp/src/channel.ts
const loadWhatsAppDirectoryConfig = createLazyRuntimeModule(() => import("./directory-config-CDGp9-h-.js"));
const loadWhatsAppChannelReactAction = createLazyRuntimeModule(() => import("./channel-react-action-Cs56wV2Y.js"));
function parseWhatsAppExplicitTarget(raw) {
	const normalized = normalizeWhatsAppTarget(raw);
	if (!normalized) return null;
	return {
		to: normalized,
		chatType: isWhatsAppGroupJid(normalized) ? "group" : "direct"
	};
}
const whatsappPlugin = createChatChannelPlugin({
	pairing: { idLabel: "whatsappSenderId" },
	outbound: whatsappChannelOutbound,
	base: {
		...createWhatsAppPluginBase({
			groups: {
				resolveRequireMention: resolveWhatsAppGroupRequireMention,
				resolveToolPolicy: resolveWhatsAppGroupToolPolicy,
				resolveGroupIntroHint: resolveWhatsAppGroupIntroHint
			},
			setupWizard: whatsappSetupWizardProxy,
			setup: whatsappSetupAdapter,
			isConfigured: async (account) => await (await loadWhatsAppChannelRuntime()).webAuthExists(account.authDir)
		}),
		agentTools: () => [createWhatsAppLoginTool()],
		allowlist: buildDmGroupAccountAllowlistAdapter({
			channelId: "whatsapp",
			resolveAccount: resolveWhatsAppAccount,
			normalize: ({ values }) => formatWhatsAppConfigAllowFromEntries(values),
			resolveDmAllowFrom: (account) => account.allowFrom,
			resolveGroupAllowFrom: (account) => account.groupAllowFrom,
			resolveDmPolicy: (account) => account.dmPolicy,
			resolveGroupPolicy: (account) => account.groupPolicy
		}),
		mentions: { stripRegexes: ({ ctx }) => resolveWhatsAppMentionStripRegexes(ctx) },
		commands: whatsappCommandPolicy,
		agentPrompt: { reactionGuidance: ({ cfg, accountId }) => {
			const level = resolveWhatsAppAgentReactionGuidance({
				cfg,
				accountId: accountId ?? void 0
			});
			return level ? {
				level,
				channelLabel: "WhatsApp"
			} : void 0;
		} },
		messaging: {
			normalizeTarget: normalizeWhatsAppMessagingTarget,
			resolveOutboundSessionRoute: (params) => resolveWhatsAppOutboundSessionRoute(params),
			parseExplicitTarget: ({ raw }) => parseWhatsAppExplicitTarget(raw),
			inferTargetChatType: ({ to }) => parseWhatsAppExplicitTarget(to)?.chatType,
			targetResolver: {
				looksLikeId: looksLikeWhatsAppTargetId,
				hint: "<E.164|group JID>"
			}
		},
		directory: {
			self: async ({ cfg, accountId }) => {
				const account = resolveWhatsAppAccount({
					cfg,
					accountId
				});
				const { e164, jid } = (await loadWhatsAppChannelRuntime()).readWebSelfId(account.authDir);
				const id = e164 ?? jid;
				if (!id) return null;
				return {
					kind: "user",
					id,
					name: account.name,
					raw: {
						e164,
						jid
					}
				};
			},
			listPeers: async (params) => (await loadWhatsAppDirectoryConfig()).listWhatsAppDirectoryPeersFromConfig(params),
			listGroups: async (params) => (await loadWhatsAppDirectoryConfig()).listWhatsAppDirectoryGroupsFromConfig(params)
		},
		actions: {
			describeMessageTool: ({ cfg, accountId }) => describeWhatsAppMessageActions({
				cfg,
				accountId
			}),
			supportsAction: ({ action }) => action === "react",
			handleAction: async ({ action, params, cfg, accountId, toolContext }) => await (await loadWhatsAppChannelReactAction()).handleWhatsAppReactAction({
				action,
				params,
				cfg,
				accountId,
				toolContext
			})
		},
		auth: {
			...whatsappApprovalAuth,
			login: async ({ cfg, accountId, runtime, verbose }) => {
				const resolvedAccountId = accountId?.trim() || whatsappPlugin.config.defaultAccountId?.(cfg) || "default";
				await (await loadWhatsAppChannelRuntime()).loginWeb(Boolean(verbose), void 0, runtime, resolvedAccountId);
			}
		},
		lifecycle: { detectLegacyStateMigrations: ({ oauthDir }) => detectWhatsAppLegacyStateMigrations({ oauthDir }) },
		heartbeat: {
			checkReady: async ({ cfg, accountId, deps }) => {
				if (cfg.web?.enabled === false) return {
					ok: false,
					reason: "whatsapp-disabled"
				};
				const account = resolveWhatsAppAccount({
					cfg,
					accountId
				});
				if (!await (deps?.webAuthExists ?? (await loadWhatsAppChannelRuntime()).webAuthExists)(account.authDir)) return {
					ok: false,
					reason: "whatsapp-not-linked"
				};
				if (!(deps?.hasActiveWebListener ? deps.hasActiveWebListener(account.accountId) : Boolean((await loadWhatsAppChannelRuntime()).getActiveWebListener(account.accountId)))) return {
					ok: false,
					reason: "whatsapp-not-running"
				};
				return {
					ok: true,
					reason: "ok"
				};
			},
			resolveRecipients: ({ cfg, opts }) => resolveWhatsAppHeartbeatRecipients(cfg, opts)
		},
		status: createAsyncComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID, {
				connected: false,
				reconnectAttempts: 0,
				lastConnectedAt: null,
				lastDisconnect: null,
				lastInboundAt: null,
				lastMessageAt: null,
				lastEventAt: null,
				healthState: "stopped"
			}),
			collectStatusIssues: collectWhatsAppStatusIssues,
			buildChannelSummary: async ({ account, snapshot }) => {
				const authDir = account.authDir;
				const linked = typeof snapshot.linked === "boolean" ? snapshot.linked : authDir ? await (await loadWhatsAppChannelRuntime()).webAuthExists(authDir) : false;
				return {
					configured: linked,
					linked,
					authAgeMs: linked && authDir ? (await loadWhatsAppChannelRuntime()).getWebAuthAgeMs(authDir) : null,
					self: linked && authDir ? (await loadWhatsAppChannelRuntime()).readWebSelfId(authDir) : {
						e164: null,
						jid: null
					},
					running: snapshot.running ?? false,
					connected: snapshot.connected ?? false,
					lastConnectedAt: snapshot.lastConnectedAt ?? null,
					lastDisconnect: snapshot.lastDisconnect ?? null,
					reconnectAttempts: snapshot.reconnectAttempts,
					lastInboundAt: snapshot.lastInboundAt ?? snapshot.lastMessageAt ?? null,
					lastMessageAt: snapshot.lastMessageAt ?? null,
					lastEventAt: snapshot.lastEventAt ?? null,
					lastError: snapshot.lastError ?? null,
					healthState: snapshot.healthState ?? void 0
				};
			},
			resolveAccountSnapshot: async ({ account, runtime }) => {
				const linked = await (await loadWhatsAppChannelRuntime()).webAuthExists(account.authDir);
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured: true,
					extra: {
						linked,
						connected: runtime?.connected ?? false,
						reconnectAttempts: runtime?.reconnectAttempts,
						lastConnectedAt: runtime?.lastConnectedAt ?? null,
						lastDisconnect: runtime?.lastDisconnect ?? null,
						lastInboundAt: runtime?.lastInboundAt ?? runtime?.lastMessageAt ?? null,
						lastMessageAt: runtime?.lastMessageAt ?? null,
						lastEventAt: runtime?.lastEventAt ?? null,
						healthState: runtime?.healthState ?? void 0,
						dmPolicy: account.dmPolicy,
						allowFrom: account.allowFrom
					}
				};
			},
			resolveAccountState: ({ configured }) => configured ? "linked" : "not linked",
			logSelfId: ({ account, runtime, includeChannelPrefix }) => {
				loadWhatsAppChannelRuntime().then((runtimeExports) => runtimeExports.logWebSelfId(account.authDir, runtime, includeChannelPrefix));
			}
		}),
		gateway: {
			startAccount: async (ctx) => {
				const account = ctx.account;
				const { e164, jid } = (await loadWhatsAppChannelRuntime()).readWebSelfId(account.authDir);
				const identity = e164 ? e164 : jid ? `jid ${jid}` : "unknown";
				ctx.log?.info(`[${account.accountId}] starting provider (${identity})`);
				return (await loadWhatsAppChannelRuntime()).monitorWebChannel(getWhatsAppRuntime().logging.shouldLogVerbose(), void 0, true, void 0, ctx.runtime, ctx.abortSignal, {
					statusSink: (next) => ctx.setStatus({
						accountId: ctx.accountId,
						...next
					}),
					accountId: account.accountId
				});
			},
			loginWithQrStart: async ({ accountId, force, timeoutMs, verbose }) => await (await loadWhatsAppChannelRuntime()).startWebLoginWithQr({
				accountId,
				force,
				timeoutMs,
				verbose
			}),
			loginWithQrWait: async ({ accountId, timeoutMs }) => await (await loadWhatsAppChannelRuntime()).waitForWebLogin({
				accountId,
				timeoutMs
			}),
			logoutAccount: async ({ account, runtime }) => {
				const cleared = await (await loadWhatsAppChannelRuntime()).logoutWeb({
					authDir: account.authDir,
					isLegacyAuthDir: account.isLegacyAuthDir,
					runtime
				});
				return {
					cleared,
					loggedOut: cleared
				};
			}
		}
	}
});
//#endregion
//#region extensions/whatsapp/src/channel.setup.ts
const whatsappSetupPlugin = { ...createWhatsAppPluginBase({
	groups: {
		resolveRequireMention: resolveWhatsAppGroupRequireMention,
		resolveToolPolicy: resolveWhatsAppGroupToolPolicy,
		resolveGroupIntroHint: resolveWhatsAppGroupIntroHint
	},
	setupWizard: whatsappSetupWizardProxy,
	setup: whatsappSetupAdapter,
	isConfigured: async (account) => await webAuthExists(account.authDir)
}) };
//#endregion
export { whatsappPlugin as n, whatsappSetupPlugin as t };
