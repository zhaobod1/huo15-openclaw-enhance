import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { a as hasConfiguredSecretInput, i as coerceSecretRef, l as normalizeSecretInputString } from "./types.secrets-BZdSA8i7.js";
import { l as resolveDefaultSecretProviderAlias } from "./ref-contract-ho6SSF_R.js";
import { r as buildChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { s as TelegramConfigSchema } from "./zod-schema.providers-core-COgcDZGS.js";
import { n as resolveNormalizedAccountEntry } from "./account-lookup-CrwHQQ0r.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor } from "./channel-config-helpers-CWYUF2eN.js";
import { r as makeProxyFetch } from "./proxy-fetch-DBK7pU_g.js";
import { n as resolveAccountWithDefaultFallback } from "./account-core-DURlxJ7S.js";
import { i as tryReadSecretFileSync } from "./secret-file-BIv887zc.js";
import { n as createChannelPluginBase, o as getChatChannelMeta } from "./core-D7mi2qmR.js";
import "./routing-DdBDhOmH.js";
import "./secret-input-D5U3kuko.js";
import { t as formatAllowFromLowercase } from "./allow-from-DjymPYUA.js";
import "./config-runtime-OuR9WVXH.js";
import "./provider-auth-BI9t-Krp.js";
import { n as normalizeTelegramAllowFromEntry, t as isNumericTelegramUserId } from "./allow-from-INxJKMd8.js";
import { f as resolveDefaultTelegramAccountId, l as listTelegramAccountIds, m as resolveTelegramAccountConfig, p as resolveTelegramAccount, u as mergeTelegramAccountConfig } from "./targets-CzovValH.js";
import { n as resolveTelegramFetch, t as resolveTelegramApiBase } from "./fetch-Cqq-meYl.js";
import { t as resolveTelegramPreviewStreamMode } from "./preview-streaming-CdKNfjeG.js";
import { a as buildTelegramModelsProviderChannelData, i as buildTelegramModelsListChannelData, n as buildTelegramCommandsListChannelData, r as buildTelegramModelBrowseChannelData } from "./command-ui-BcPWw2rl.js";
import "./config-api-CEPn6kVb.js";
import { n as collectRuntimeConfigAssignments, r as secretTargetRegistryEntries, t as singleAccountKeysToMove } from "./setup-contract-DfZJm7Lt.js";
//#region extensions/telegram/src/api-fetch.ts
function resolveTelegramChatLookupFetch(params) {
	const proxyUrl = params?.proxyUrl?.trim();
	return resolveTelegramFetch(proxyUrl ? makeProxyFetch(proxyUrl) : void 0, { network: params?.network });
}
async function lookupTelegramChatId(params) {
	return fetchTelegramChatId({
		token: params.token,
		chatId: params.chatId,
		signal: params.signal,
		apiRoot: params.apiRoot,
		fetchImpl: resolveTelegramChatLookupFetch({
			proxyUrl: params.proxyUrl,
			network: params.network
		})
	});
}
async function fetchTelegramChatId(params) {
	const url = `${resolveTelegramApiBase(params.apiRoot)}/bot${params.token}/getChat?chat_id=${encodeURIComponent(params.chatId)}`;
	const fetchImpl = params.fetchImpl ?? fetch;
	try {
		const res = await fetchImpl(url, params.signal ? { signal: params.signal } : void 0);
		if (!res.ok) return null;
		const data = await res.json().catch(() => null);
		const id = data?.ok ? data?.result?.id : void 0;
		if (typeof id === "number" || typeof id === "string") return String(id);
		return null;
	} catch {
		return null;
	}
}
//#endregion
//#region extensions/telegram/src/account-inspect.ts
function inspectTokenFile(pathValue) {
	const tokenFile = typeof pathValue === "string" ? pathValue.trim() : "";
	if (!tokenFile) return null;
	const token = tryReadSecretFileSync(tokenFile, "Telegram bot token", { rejectSymlink: true });
	return {
		token: token ?? "",
		tokenSource: "tokenFile",
		tokenStatus: token ? "available" : "configured_unavailable"
	};
}
function canResolveEnvSecretRefInReadOnlyPath(params) {
	const providerConfig = params.cfg.secrets?.providers?.[params.provider];
	if (!providerConfig) return params.provider === resolveDefaultSecretProviderAlias(params.cfg, "env");
	if (providerConfig.source !== "env") return false;
	const allowlist = providerConfig.allowlist;
	return !allowlist || allowlist.includes(params.id);
}
function inspectTokenValue(params) {
	const ref = coerceSecretRef(params.value, params.cfg.secrets?.defaults);
	if (ref?.source === "env") {
		if (!canResolveEnvSecretRefInReadOnlyPath({
			cfg: params.cfg,
			provider: ref.provider,
			id: ref.id
		})) return {
			token: "",
			tokenSource: "env",
			tokenStatus: "configured_unavailable"
		};
		const envValue = process.env[ref.id];
		if (envValue && envValue.trim()) return {
			token: envValue.trim(),
			tokenSource: "env",
			tokenStatus: "available"
		};
		return {
			token: "",
			tokenSource: "env",
			tokenStatus: "configured_unavailable"
		};
	}
	const token = normalizeSecretInputString(params.value);
	if (token) return {
		token,
		tokenSource: "config",
		tokenStatus: "available"
	};
	if (hasConfiguredSecretInput(params.value, params.cfg.secrets?.defaults)) return {
		token: "",
		tokenSource: "config",
		tokenStatus: "configured_unavailable"
	};
	return null;
}
function inspectTelegramAccountPrimary(params) {
	const accountId = normalizeAccountId(params.accountId);
	const merged = mergeTelegramAccountConfig(params.cfg, accountId);
	const enabled = params.cfg.channels?.telegram?.enabled !== false && merged.enabled !== false;
	const accountConfig = resolveTelegramAccountConfig(params.cfg, accountId);
	const accountTokenFile = inspectTokenFile(accountConfig?.tokenFile);
	if (accountTokenFile) return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: accountTokenFile.token,
		tokenSource: accountTokenFile.tokenSource,
		tokenStatus: accountTokenFile.tokenStatus,
		configured: accountTokenFile.tokenStatus !== "missing",
		config: merged
	};
	const accountToken = inspectTokenValue({
		cfg: params.cfg,
		value: accountConfig?.botToken
	});
	if (accountToken) return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: accountToken.token,
		tokenSource: accountToken.tokenSource,
		tokenStatus: accountToken.tokenStatus,
		configured: accountToken.tokenStatus !== "missing",
		config: merged
	};
	const channelTokenFile = inspectTokenFile(params.cfg.channels?.telegram?.tokenFile);
	if (channelTokenFile) return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: channelTokenFile.token,
		tokenSource: channelTokenFile.tokenSource,
		tokenStatus: channelTokenFile.tokenStatus,
		configured: channelTokenFile.tokenStatus !== "missing",
		config: merged
	};
	const channelToken = inspectTokenValue({
		cfg: params.cfg,
		value: params.cfg.channels?.telegram?.botToken
	});
	if (channelToken) return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: channelToken.token,
		tokenSource: channelToken.tokenSource,
		tokenStatus: channelToken.tokenStatus,
		configured: channelToken.tokenStatus !== "missing",
		config: merged
	};
	const envToken = accountId === "default" ? (params.envToken ?? process.env.TELEGRAM_BOT_TOKEN)?.trim() : "";
	if (envToken) return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: envToken,
		tokenSource: "env",
		tokenStatus: "available",
		configured: true,
		config: merged
	};
	return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		token: "",
		tokenSource: "none",
		tokenStatus: "missing",
		configured: false,
		config: merged
	};
}
function inspectTelegramAccount(params) {
	return resolveAccountWithDefaultFallback({
		accountId: params.accountId,
		normalizeAccountId,
		resolvePrimary: (accountId) => inspectTelegramAccountPrimary({
			cfg: params.cfg,
			accountId,
			envToken: params.envToken
		}),
		hasCredential: (account) => account.tokenSource !== "none",
		resolveDefaultAccountId: () => resolveDefaultTelegramAccountId(params.cfg)
	});
}
//#endregion
//#region extensions/telegram/src/config-schema.ts
const TelegramChannelConfigSchema = buildChannelConfigSchema(TelegramConfigSchema, { uiHints: {
	"": {
		label: "Telegram",
		help: "Telegram channel provider configuration including auth tokens, retry behavior, and message rendering controls. Use this section to tune bot behavior for Telegram-specific API semantics."
	},
	customCommands: {
		label: "Telegram Custom Commands",
		help: "Additional Telegram bot menu commands (merged with native; conflicts ignored)."
	},
	botToken: {
		label: "Telegram Bot Token",
		help: "Telegram bot token used to authenticate Bot API requests for this account/provider config. Use secret/env substitution and rotate tokens if exposure is suspected."
	},
	dmPolicy: {
		label: "Telegram DM Policy",
		help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.telegram.allowFrom=[\"*\"]."
	},
	configWrites: {
		label: "Telegram Config Writes",
		help: "Allow Telegram to write config in response to channel events/commands (default: true)."
	},
	"commands.native": {
		label: "Telegram Native Commands",
		help: "Override native commands for Telegram (bool or \"auto\")."
	},
	"commands.nativeSkills": {
		label: "Telegram Native Skill Commands",
		help: "Override native skill commands for Telegram (bool or \"auto\")."
	},
	streaming: {
		label: "Telegram Streaming Mode",
		help: "Unified Telegram stream preview mode: \"off\" | \"partial\" | \"block\" | \"progress\" (default: \"partial\"). \"progress\" maps to \"partial\" on Telegram. Legacy boolean/streamMode keys are auto-mapped."
	},
	"retry.attempts": {
		label: "Telegram Retry Attempts",
		help: "Max retry attempts for outbound Telegram API calls (default: 3)."
	},
	"retry.minDelayMs": {
		label: "Telegram Retry Min Delay (ms)",
		help: "Minimum retry delay in ms for Telegram outbound calls."
	},
	"retry.maxDelayMs": {
		label: "Telegram Retry Max Delay (ms)",
		help: "Maximum retry delay cap in ms for Telegram outbound calls."
	},
	"retry.jitter": {
		label: "Telegram Retry Jitter",
		help: "Jitter factor (0-1) applied to Telegram retry delays."
	},
	"network.autoSelectFamily": {
		label: "Telegram autoSelectFamily",
		help: "Override Node autoSelectFamily for Telegram (true=enable, false=disable)."
	},
	"network.dangerouslyAllowPrivateNetwork": {
		label: "Telegram Dangerously Allow Private Network",
		help: "Dangerous opt-in for trusted fake-IP or transparent-proxy environments where Telegram media downloads resolve api.telegram.org to private/internal/special-use addresses."
	},
	timeoutSeconds: {
		label: "Telegram API Timeout (seconds)",
		help: "Max seconds before Telegram API requests are aborted (default: 500 per grammY)."
	},
	silentErrorReplies: {
		label: "Telegram Silent Error Replies",
		help: "When true, Telegram bot replies marked as errors are sent silently (no notification sound). Default: false."
	},
	apiRoot: {
		label: "Telegram API Root URL",
		help: "Custom Telegram Bot API root URL. Use for self-hosted Bot API servers (https://github.com/tdlib/telegram-bot-api) or reverse proxies in regions where api.telegram.org is blocked."
	},
	trustedLocalFileRoots: {
		label: "Telegram Trusted Local File Roots",
		help: "Trusted local filesystem roots for self-hosted Telegram Bot API absolute file_path values. Only absolute paths inside these roots are read directly; all other absolute paths are rejected."
	},
	autoTopicLabel: {
		label: "Telegram Auto Topic Label",
		help: "Auto-rename DM forum topics on first message using LLM. Default: true. Set to false to disable, or use object form { enabled: true, prompt: '...' } for custom prompt."
	},
	"autoTopicLabel.enabled": {
		label: "Telegram Auto Topic Label Enabled",
		help: "Whether auto topic labeling is enabled. Default: true."
	},
	"autoTopicLabel.prompt": {
		label: "Telegram Auto Topic Label Prompt",
		help: "Custom prompt for LLM-based topic naming. The user message is appended after the prompt."
	},
	"capabilities.inlineButtons": {
		label: "Telegram Inline Buttons",
		help: "Enable Telegram inline button components for supported command and interaction surfaces. Disable if your deployment needs plain-text-only compatibility behavior."
	},
	execApprovals: {
		label: "Telegram Exec Approvals",
		help: "Telegram-native exec approval routing and approver authorization. When unset, OpenClaw auto-enables DM-first native approvals if approvers can be resolved for the selected bot account."
	},
	"execApprovals.enabled": {
		label: "Telegram Exec Approvals Enabled",
		help: "Controls Telegram native exec approvals for this account: unset or \"auto\" enables DM-first native approvals when approvers can be resolved, true forces native approvals on, and false disables them."
	},
	"execApprovals.approvers": {
		label: "Telegram Exec Approval Approvers",
		help: "Telegram user IDs allowed to approve exec requests for this bot account. Use numeric Telegram user IDs. If you leave this unset, OpenClaw falls back to numeric owner IDs inferred from channels.telegram.allowFrom and direct-message defaultTo when possible."
	},
	"execApprovals.agentFilter": {
		label: "Telegram Exec Approval Agent Filter",
		help: "Optional allowlist of agent IDs eligible for Telegram exec approvals, for example `[\"main\", \"ops-agent\"]`. Use this to keep approval prompts scoped to the agents you actually operate from Telegram."
	},
	"execApprovals.sessionFilter": {
		label: "Telegram Exec Approval Session Filter",
		help: "Optional session-key filters matched as substring or regex-style patterns before Telegram approval routing is used. Use narrow patterns so Telegram approvals only appear for intended sessions."
	},
	"execApprovals.target": {
		label: "Telegram Exec Approval Target",
		help: "Controls where Telegram approval prompts are sent: \"dm\" sends to approver DMs (default), \"channel\" sends to the originating Telegram chat/topic, and \"both\" sends to both. Channel delivery exposes the command text to the chat, so only use it in trusted groups/topics."
	},
	"threadBindings.enabled": {
		label: "Telegram Thread Binding Enabled",
		help: "Enable Telegram conversation binding features (/focus, /unfocus, /agents, and /session idle|max-age). Overrides session.threadBindings.enabled when set."
	},
	"threadBindings.idleHours": {
		label: "Telegram Thread Binding Idle Timeout (hours)",
		help: "Inactivity window in hours for Telegram bound sessions. Set 0 to disable idle auto-unfocus (default: 24). Overrides session.threadBindings.idleHours when set."
	},
	"threadBindings.maxAgeHours": {
		label: "Telegram Thread Binding Max Age (hours)",
		help: "Optional hard max age in hours for Telegram bound sessions. Set 0 to disable hard cap (default: 0). Overrides session.threadBindings.maxAgeHours when set."
	},
	"threadBindings.spawnSubagentSessions": {
		label: "Telegram Thread-Bound Subagent Spawn",
		help: "Allow subagent spawns with thread=true to auto-bind Telegram current conversations when supported."
	},
	"threadBindings.spawnAcpSessions": {
		label: "Telegram Thread-Bound ACP Spawn",
		help: "Allow ACP spawns with thread=true to auto-bind Telegram current conversations when supported."
	}
} });
//#endregion
//#region extensions/telegram/src/doctor.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function sanitizeForLog(value) {
	return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
function describeUnknownError(error) {
	return error instanceof Error ? error.message : String(error);
}
function normalizeTelegramStreamingAliases(params) {
	let updated = params.entry;
	const hadLegacyStreamMode = updated.streamMode !== void 0;
	const beforeStreaming = updated.streaming;
	const resolved = resolveTelegramPreviewStreamMode(updated);
	if (!(hadLegacyStreamMode || typeof beforeStreaming === "boolean" || typeof beforeStreaming === "string" && beforeStreaming !== resolved)) return {
		entry: updated,
		changed: false
	};
	let changed = false;
	if (beforeStreaming !== resolved) {
		updated = {
			...updated,
			streaming: resolved
		};
		changed = true;
	}
	if (hadLegacyStreamMode) {
		const { streamMode: _ignored, ...rest } = updated;
		updated = rest;
		changed = true;
		params.changes.push(`Moved ${params.pathPrefix}.streamMode → ${params.pathPrefix}.streaming (${resolved}).`);
	}
	if (typeof beforeStreaming === "boolean") params.changes.push(`Normalized ${params.pathPrefix}.streaming boolean → enum (${resolved}).`);
	else if (typeof beforeStreaming === "string" && beforeStreaming !== resolved) params.changes.push(`Normalized ${params.pathPrefix}.streaming (${beforeStreaming}) → (${resolved}).`);
	return {
		entry: updated,
		changed
	};
}
function normalizeTelegramCompatibilityConfig(cfg) {
	const rawEntry = asObjectRecord(cfg.channels?.telegram);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	const base = normalizeTelegramStreamingAliases({
		entry: rawEntry,
		pathPrefix: "channels.telegram",
		changes
	});
	updated = base.entry;
	changed = base.changed;
	const rawAccounts = asObjectRecord(updated.accounts);
	if (rawAccounts) {
		let accountsChanged = false;
		const accounts = { ...rawAccounts };
		for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
			const account = asObjectRecord(rawAccount);
			if (!account) continue;
			const accountStreaming = normalizeTelegramStreamingAliases({
				entry: account,
				pathPrefix: `channels.telegram.accounts.${accountId}`,
				changes
			});
			if (accountStreaming.changed) {
				accounts[accountId] = accountStreaming.entry;
				accountsChanged = true;
			}
		}
		if (accountsChanged) {
			updated = {
				...updated,
				accounts
			};
			changed = true;
		}
	}
	if (!changed) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				telegram: updated
			}
		},
		changes
	};
}
function hasAllowFromEntries(values) {
	return Array.isArray(values) && values.some((entry) => String(entry).trim());
}
function collectTelegramAccountScopes(cfg) {
	const scopes = [];
	const telegram = asObjectRecord(cfg.channels?.telegram);
	if (!telegram) return scopes;
	scopes.push({
		prefix: "channels.telegram",
		account: telegram
	});
	const accounts = asObjectRecord(telegram.accounts);
	if (!accounts) return scopes;
	for (const key of Object.keys(accounts)) {
		const account = asObjectRecord(accounts[key]);
		if (account) scopes.push({
			prefix: `channels.telegram.accounts.${key}`,
			account
		});
	}
	return scopes;
}
function collectTelegramAllowFromLists(prefix, account) {
	const refs = [{
		pathLabel: `${prefix}.allowFrom`,
		holder: account,
		key: "allowFrom"
	}, {
		pathLabel: `${prefix}.groupAllowFrom`,
		holder: account,
		key: "groupAllowFrom"
	}];
	const groups = asObjectRecord(account.groups);
	if (!groups) return refs;
	for (const groupId of Object.keys(groups)) {
		const group = asObjectRecord(groups[groupId]);
		if (!group) continue;
		refs.push({
			pathLabel: `${prefix}.groups.${groupId}.allowFrom`,
			holder: group,
			key: "allowFrom"
		});
		const topics = asObjectRecord(group.topics);
		if (!topics) continue;
		for (const topicId of Object.keys(topics)) {
			const topic = asObjectRecord(topics[topicId]);
			if (!topic) continue;
			refs.push({
				pathLabel: `${prefix}.groups.${groupId}.topics.${topicId}.allowFrom`,
				holder: topic,
				key: "allowFrom"
			});
		}
	}
	return refs;
}
function scanTelegramAllowFromUsernameEntries(cfg) {
	const hits = [];
	const scanList = (pathLabel, list) => {
		if (!Array.isArray(list)) return;
		for (const entry of list) {
			const normalized = normalizeTelegramAllowFromEntry(entry);
			if (!normalized || normalized === "*" || isNumericTelegramUserId(normalized)) continue;
			hits.push({
				path: pathLabel,
				entry: String(entry).trim()
			});
		}
	};
	for (const scope of collectTelegramAccountScopes(cfg)) for (const ref of collectTelegramAllowFromLists(scope.prefix, scope.account)) scanList(ref.pathLabel, ref.holder[ref.key]);
	return hits;
}
function collectTelegramAllowFromUsernameWarnings(params) {
	if (params.hits.length === 0) return [];
	const sampleEntry = sanitizeForLog(params.hits[0]?.entry ?? "@");
	return [`- Telegram allowFrom contains ${params.hits.length} non-numeric entries (e.g. ${sampleEntry}); Telegram authorization requires numeric sender IDs.`, `- Run "${params.doctorFixCommand}" to auto-resolve @username entries to numeric IDs (requires a Telegram bot token).`];
}
async function maybeRepairTelegramAllowFromUsernames(cfg) {
	if (scanTelegramAllowFromUsernameEntries(cfg).length === 0) return {
		config: cfg,
		changes: []
	};
	const { getChannelsCommandSecretTargetIds, resolveCommandSecretRefsViaGateway } = await import("./plugin-sdk/runtime-secret-resolution.js");
	const { resolvedConfig } = await resolveCommandSecretRefsViaGateway({
		config: cfg,
		commandName: "doctor --fix",
		targetIds: getChannelsCommandSecretTargetIds(),
		mode: "read_only_status"
	});
	const tokenResolutionWarnings = [];
	const resolverAccountIds = [];
	for (const accountId of listTelegramAccountIds(resolvedConfig)) {
		let inspected;
		try {
			inspected = inspectTelegramAccount({
				cfg: resolvedConfig,
				accountId
			});
		} catch (error) {
			tokenResolutionWarnings.push(`- Telegram account ${accountId}: failed to inspect bot token (${describeUnknownError(error)}).`);
			continue;
		}
		if (inspected.tokenStatus === "configured_unavailable") tokenResolutionWarnings.push(`- Telegram account ${accountId}: failed to inspect bot token (configured but unavailable in this command path).`);
		if (inspected.tokenSource === "none" ? "" : inspected.token.trim()) resolverAccountIds.push(accountId);
	}
	if (resolverAccountIds.length === 0) return {
		config: cfg,
		changes: [...tokenResolutionWarnings, "- Telegram allowFrom contains @username entries, but no Telegram bot token is available in this command path; cannot auto-resolve."]
	};
	const resolveUserId = async (raw) => {
		const trimmed = raw.trim();
		if (!trimmed) return null;
		const normalized = normalizeTelegramAllowFromEntry(trimmed);
		if (!normalized || normalized === "*") return null;
		if (isNumericTelegramUserId(normalized) || /\s/.test(normalized)) return isNumericTelegramUserId(normalized) ? normalized : null;
		const username = normalized.startsWith("@") ? normalized : `@${normalized}`;
		for (const accountId of resolverAccountIds) try {
			const account = resolveTelegramAccount({
				cfg: resolvedConfig,
				accountId
			});
			const token = account.token.trim();
			if (!token) continue;
			const id = await lookupTelegramChatId({
				token,
				chatId: username,
				network: account.config.network,
				signal: void 0
			});
			if (id) return id;
		} catch {}
		return null;
	};
	const next = structuredClone(cfg);
	const changes = [];
	const repairList = async (pathLabel, holder, key) => {
		const raw = holder[key];
		if (!Array.isArray(raw)) return;
		const out = [];
		const replaced = [];
		for (const entry of raw) {
			const normalized = normalizeTelegramAllowFromEntry(entry);
			if (!normalized) continue;
			if (normalized === "*" || isNumericTelegramUserId(normalized)) {
				out.push(normalized);
				continue;
			}
			const resolved = await resolveUserId(String(entry));
			if (resolved) {
				out.push(resolved);
				replaced.push({
					from: String(entry).trim(),
					to: resolved
				});
			} else out.push(String(entry).trim());
		}
		const deduped = [];
		const seen = /* @__PURE__ */ new Set();
		for (const entry of out) {
			const keyValue = String(entry).trim();
			if (!keyValue || seen.has(keyValue)) continue;
			seen.add(keyValue);
			deduped.push(entry);
		}
		holder[key] = deduped;
		for (const replacement of replaced.slice(0, 5)) changes.push(`- ${sanitizeForLog(pathLabel)}: resolved ${sanitizeForLog(replacement.from)} -> ${sanitizeForLog(replacement.to)}`);
		if (replaced.length > 5) changes.push(`- ${sanitizeForLog(pathLabel)}: resolved ${replaced.length - 5} more @username entries`);
	};
	for (const scope of collectTelegramAccountScopes(next)) for (const ref of collectTelegramAllowFromLists(scope.prefix, scope.account)) await repairList(ref.pathLabel, ref.holder, ref.key);
	if (changes.length === 0) return {
		config: cfg,
		changes: []
	};
	return {
		config: next,
		changes
	};
}
function hasConfiguredGroups(account, parent) {
	const groups = asObjectRecord(account.groups) ?? asObjectRecord(parent?.groups);
	return Boolean(groups) && Object.keys(groups ?? {}).length > 0;
}
function collectTelegramGroupPolicyWarnings(params) {
	if (!hasConfiguredGroups(params.account, params.parent)) {
		const effectiveDmPolicy = params.dmPolicy ?? "pairing";
		const dmSetupLine = effectiveDmPolicy === "pairing" ? "DMs use pairing mode, so new senders must start a chat and be approved before regular messages are accepted." : effectiveDmPolicy === "allowlist" ? `DMs use allowlist mode, so only sender IDs in ${params.prefix}.allowFrom are accepted.` : effectiveDmPolicy === "open" ? "DMs are open." : "DMs are disabled.";
		return [`- ${params.prefix}: Telegram is in first-time setup mode. ${dmSetupLine} Group messages stay blocked until you add allowed chats under ${params.prefix}.groups (and optional sender IDs under ${params.prefix}.groupAllowFrom), or set ${params.prefix}.groupPolicy to "open" if you want broad group access.`];
	}
	const rawGroupAllowFrom = params.account.groupAllowFrom ?? params.parent?.groupAllowFrom;
	if (hasAllowFromEntries((hasAllowFromEntries(rawGroupAllowFrom) ? rawGroupAllowFrom : void 0) ?? params.effectiveAllowFrom)) return [];
	return [`- ${params.prefix}.groupPolicy is "allowlist" but groupAllowFrom (and allowFrom) is empty — all group messages will be silently dropped. Add sender IDs to ${params.prefix}.groupAllowFrom or ${params.prefix}.allowFrom, or set ${params.prefix}.groupPolicy to "open".`];
}
function collectTelegramEmptyAllowlistExtraWarnings(params) {
	const account = params.account;
	const parent = params.parent;
	return params.channelName === "telegram" && (account.groupPolicy ?? parent?.groupPolicy ?? void 0) === "allowlist" ? collectTelegramGroupPolicyWarnings({
		account,
		dmPolicy: params.dmPolicy,
		effectiveAllowFrom: params.effectiveAllowFrom,
		parent,
		prefix: params.prefix
	}) : [];
}
function hasLegacyTelegramStreamingAliases(value) {
	const entry = asObjectRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean" || typeof entry.streaming === "string" && entry.streaming !== resolveTelegramPreviewStreamMode(entry);
}
function hasLegacyTelegramAccountStreamingAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacyTelegramStreamingAliases(account));
}
const telegramDoctor = {
	legacyConfigRules: [{
		path: ["channels", "telegram"],
		message: "channels.telegram.streamMode and boolean channels.telegram.streaming are legacy; use channels.telegram.streaming=\"off|partial|block\".",
		match: hasLegacyTelegramStreamingAliases
	}, {
		path: [
			"channels",
			"telegram",
			"accounts"
		],
		message: "channels.telegram.accounts.<id>.streamMode and boolean channels.telegram.accounts.<id>.streaming are legacy; use channels.telegram.accounts.<id>.streaming=\"off|partial|block\".",
		match: hasLegacyTelegramAccountStreamingAliases
	}],
	normalizeCompatibilityConfig: ({ cfg }) => normalizeTelegramCompatibilityConfig(cfg),
	collectPreviewWarnings: ({ cfg, doctorFixCommand }) => collectTelegramAllowFromUsernameWarnings({
		hits: scanTelegramAllowFromUsernameEntries(cfg),
		doctorFixCommand
	}),
	repairConfig: async ({ cfg }) => await maybeRepairTelegramAllowFromUsernames(cfg),
	collectEmptyAllowlistExtraWarnings: collectTelegramEmptyAllowlistExtraWarnings,
	shouldSkipDefaultEmptyGroupAllowlistWarning: (params) => params.channelName === "telegram"
};
//#endregion
//#region extensions/telegram/src/shared.ts
const TELEGRAM_CHANNEL = "telegram";
function findTelegramTokenOwnerAccountId(params) {
	const normalizedAccountId = normalizeAccountId(params.accountId);
	const tokenOwners = /* @__PURE__ */ new Map();
	for (const id of listTelegramAccountIds(params.cfg)) {
		const account = inspectTelegramAccount({
			cfg: params.cfg,
			accountId: id
		});
		const token = (account.token ?? "").trim();
		if (!token) continue;
		const ownerAccountId = tokenOwners.get(token);
		if (!ownerAccountId) {
			tokenOwners.set(token, account.accountId);
			continue;
		}
		if (account.accountId === normalizedAccountId) return ownerAccountId;
	}
	return null;
}
function formatDuplicateTelegramTokenReason(params) {
	return `Duplicate Telegram bot token: account "${params.accountId}" shares a token with account "${params.ownerAccountId}". Keep one owner account per bot token.`;
}
/**
* Returns true when the runtime token resolver (`resolveTelegramToken`) would
* block channel-level fallthrough for the given accountId.  This mirrors the
* guard in `token.ts` so that status-check functions (`isConfigured`,
* `unconfiguredReason`, `describeAccount`) stay consistent with the gateway
* runtime behaviour.
*
* The guard fires when:
*   1. The accountId is not the default account, AND
*   2. The config has an explicit `accounts` section with entries, AND
*   3. The accountId is not found in that `accounts` section.
*
* See: https://github.com/openclaw/openclaw/issues/53876
*/
function isBlockedByMultiBotGuard(cfg, accountId) {
	if (normalizeAccountId(accountId) === "default") return false;
	const accounts = cfg.channels?.telegram?.accounts;
	if (!(!!accounts && typeof accounts === "object" && !Array.isArray(accounts) && Object.keys(accounts).length > 0)) return false;
	return !resolveNormalizedAccountEntry(accounts, accountId, normalizeAccountId);
}
const telegramConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: TELEGRAM_CHANNEL,
	listAccountIds: listTelegramAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveTelegramAccount),
	inspectAccount: adaptScopedAccountAccessor(inspectTelegramAccount),
	defaultAccountId: resolveDefaultTelegramAccountId,
	clearBaseFields: [
		"botToken",
		"tokenFile",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({
		allowFrom,
		stripPrefixRe: /^(telegram|tg):/i
	}),
	resolveDefaultTo: (account) => account.config.defaultTo
});
function createTelegramPluginBase(params) {
	return {
		...createChannelPluginBase({
			id: TELEGRAM_CHANNEL,
			meta: {
				...getChatChannelMeta(TELEGRAM_CHANNEL),
				quickstartAllowFrom: true
			},
			setupWizard: params.setupWizard,
			capabilities: {
				chatTypes: [
					"direct",
					"group",
					"channel",
					"thread"
				],
				reactions: true,
				threads: true,
				media: true,
				polls: true,
				nativeCommands: true,
				blockStreaming: true
			},
			commands: {
				nativeCommandsAutoEnabled: true,
				nativeSkillsAutoEnabled: true,
				buildCommandsListChannelData: buildTelegramCommandsListChannelData,
				buildModelsProviderChannelData: buildTelegramModelsProviderChannelData,
				buildModelsListChannelData: buildTelegramModelsListChannelData,
				buildModelBrowseChannelData: buildTelegramModelBrowseChannelData
			},
			doctor: telegramDoctor,
			reload: { configPrefixes: ["channels.telegram"] },
			configSchema: TelegramChannelConfigSchema,
			config: {
				...telegramConfigAdapter,
				hasConfiguredState: ({ env }) => typeof env?.TELEGRAM_BOT_TOKEN === "string" && env.TELEGRAM_BOT_TOKEN.trim().length > 0,
				isConfigured: (account, cfg) => {
					if (isBlockedByMultiBotGuard(cfg, account.accountId)) return false;
					if (!inspectTelegramAccount({
						cfg,
						accountId: account.accountId
					}).token?.trim()) return false;
					return !findTelegramTokenOwnerAccountId({
						cfg,
						accountId: account.accountId
					});
				},
				unconfiguredReason: (account, cfg) => {
					if (isBlockedByMultiBotGuard(cfg, account.accountId)) return `not configured: unknown accountId "${account.accountId}" in multi-bot setup`;
					const inspected = inspectTelegramAccount({
						cfg,
						accountId: account.accountId
					});
					if (!inspected.token?.trim()) {
						if (inspected.tokenStatus === "configured_unavailable") return `not configured: token ${inspected.tokenSource} is configured but unavailable`;
						return "not configured";
					}
					const ownerAccountId = findTelegramTokenOwnerAccountId({
						cfg,
						accountId: account.accountId
					});
					if (!ownerAccountId) return "not configured";
					return formatDuplicateTelegramTokenReason({
						accountId: account.accountId,
						ownerAccountId
					});
				},
				describeAccount: (account, cfg) => {
					if (isBlockedByMultiBotGuard(cfg, account.accountId)) return {
						accountId: account.accountId,
						name: account.name,
						enabled: account.enabled,
						configured: false,
						tokenSource: "none"
					};
					const inspected = inspectTelegramAccount({
						cfg,
						accountId: account.accountId
					});
					return {
						accountId: account.accountId,
						name: account.name,
						enabled: account.enabled,
						configured: !!inspected.token?.trim() && !findTelegramTokenOwnerAccountId({
							cfg,
							accountId: account.accountId
						}),
						tokenSource: inspected.tokenSource
					};
				}
			},
			setup: {
				...params.setup,
				singleAccountKeysToMove
			}
		}),
		secrets: {
			secretTargetRegistryEntries,
			collectRuntimeConfigAssignments
		}
	};
}
//#endregion
export { inspectTelegramAccount as a, resolveTelegramChatLookupFetch as c, telegramConfigAdapter as i, findTelegramTokenOwnerAccountId as n, fetchTelegramChatId as o, formatDuplicateTelegramTokenReason as r, lookupTelegramChatId as s, createTelegramPluginBase as t };
