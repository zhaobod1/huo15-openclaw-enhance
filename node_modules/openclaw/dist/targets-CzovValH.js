import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { t as isTruthyEnvValue } from "./env-DkqMjWaD.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID, v as normalizeOptionalAccountId } from "./session-key-BR3Z-ljs.js";
import { t as resolveAccountEntry } from "./account-lookup-CrwHQQ0r.js";
import { i as resolveDefaultAgentBoundAccountId, r as listBoundAccountIds } from "./bindings-CzEur-oN.js";
import { t as createAccountActionGate } from "./account-action-gate-Dy1KrMDw.js";
import { i as listCombinedAccountIds, o as resolveListedDefaultAccountId } from "./account-helpers-A6tF0W1f.js";
import { n as resolveAccountWithDefaultFallback } from "./account-core-DURlxJ7S.js";
import { n as formatSetExplicitDefaultInstruction } from "./default-account-warnings-Be5NDUNh.js";
import "./routing-DdBDhOmH.js";
import { t as resolveTelegramToken } from "./token-DXMy9X9J.js";
import "./runtime-env-BLYCS7ta.js";
import util from "node:util";
//#region extensions/telegram/src/accounts.ts
let log = null;
function getLog() {
	if (!log) log = createSubsystemLogger("telegram/accounts");
	return log;
}
function formatDebugArg(value) {
	if (typeof value === "string") return value;
	if (value instanceof Error) return value.stack ?? value.message;
	return util.inspect(value, {
		colors: false,
		depth: null,
		compact: true,
		breakLength: Infinity
	});
}
const debugAccounts = (...args) => {
	if (isTruthyEnvValue(process.env.OPENCLAW_DEBUG_TELEGRAM_ACCOUNTS)) {
		const parts = args.map((arg) => formatDebugArg(arg));
		getLog().warn(parts.join(" ").trim());
	}
};
function listConfiguredAccountIds(cfg) {
	const ids = /* @__PURE__ */ new Set();
	for (const key of Object.keys(cfg.channels?.telegram?.accounts ?? {})) if (key) ids.add(normalizeAccountId(key));
	return [...ids];
}
function listTelegramAccountIds(cfg) {
	const ids = listCombinedAccountIds({
		configuredAccountIds: listConfiguredAccountIds(cfg),
		additionalAccountIds: listBoundAccountIds(cfg, "telegram"),
		fallbackAccountIdWhenEmpty: DEFAULT_ACCOUNT_ID
	});
	debugAccounts("listTelegramAccountIds", ids);
	return ids;
}
let emittedMissingDefaultWarn = false;
/** @internal Reset the once-per-process warning flag. Exported for tests only. */
function resetMissingDefaultWarnFlag() {
	emittedMissingDefaultWarn = false;
}
function resolveDefaultTelegramAccountId(cfg) {
	const boundDefault = resolveDefaultAgentBoundAccountId(cfg, "telegram");
	if (boundDefault) return boundDefault;
	const ids = listTelegramAccountIds(cfg);
	const resolved = resolveListedDefaultAccountId({
		accountIds: ids,
		configuredDefaultAccountId: normalizeOptionalAccountId(cfg.channels?.telegram?.defaultAccount)
	});
	if (resolved !== ids[0] || ids.includes("default") || ids.length <= 1) return resolved;
	if (ids.length > 1 && !emittedMissingDefaultWarn) {
		emittedMissingDefaultWarn = true;
		getLog().warn(`channels.telegram: accounts.default is missing; falling back to "${ids[0]}". ${formatSetExplicitDefaultInstruction("telegram")} to avoid routing surprises in multi-account setups.`);
	}
	return resolved;
}
function resolveTelegramAccountConfig(cfg, accountId) {
	const normalized = normalizeAccountId(accountId);
	return resolveAccountEntry(cfg.channels?.telegram?.accounts, normalized);
}
function mergeTelegramAccountConfig(cfg, accountId) {
	const { accounts: _ignored, defaultAccount: _ignoredDefaultAccount, groups: channelGroups, ...base } = cfg.channels?.telegram ?? {};
	const account = resolveTelegramAccountConfig(cfg, accountId) ?? {};
	const isMultiAccount = Object.keys(cfg.channels?.telegram?.accounts ?? {}).length > 1;
	const groups = account.groups ?? (isMultiAccount ? void 0 : channelGroups);
	return {
		...base,
		...account,
		groups
	};
}
function createTelegramActionGate(params) {
	const accountId = normalizeAccountId(params.accountId ?? resolveDefaultTelegramAccountId(params.cfg));
	return createAccountActionGate({
		baseActions: params.cfg.channels?.telegram?.actions,
		accountActions: resolveTelegramAccountConfig(params.cfg, accountId)?.actions
	});
}
function resolveTelegramMediaRuntimeOptions(params) {
	const normalizedAccountId = normalizeOptionalAccountId(params.accountId);
	const accountCfg = normalizedAccountId ? mergeTelegramAccountConfig(params.cfg, normalizedAccountId) : params.cfg.channels?.telegram;
	return {
		token: params.token,
		transport: params.transport,
		apiRoot: accountCfg?.apiRoot,
		trustedLocalFileRoots: accountCfg?.trustedLocalFileRoots,
		dangerouslyAllowPrivateNetwork: accountCfg?.network?.dangerouslyAllowPrivateNetwork
	};
}
function resolveTelegramPollActionGateState(isActionEnabled) {
	const sendMessageEnabled = isActionEnabled("sendMessage");
	const pollEnabled = isActionEnabled("poll");
	return {
		sendMessageEnabled,
		pollEnabled,
		enabled: sendMessageEnabled && pollEnabled
	};
}
function resolveTelegramAccount(params) {
	const baseEnabled = params.cfg.channels?.telegram?.enabled !== false;
	const resolve = (accountId) => {
		const merged = mergeTelegramAccountConfig(params.cfg, accountId);
		const accountEnabled = merged.enabled !== false;
		const enabled = baseEnabled && accountEnabled;
		const tokenResolution = resolveTelegramToken(params.cfg, { accountId });
		debugAccounts("resolve", {
			accountId,
			enabled,
			tokenSource: tokenResolution.source
		});
		return {
			accountId,
			enabled,
			name: merged.name?.trim() || void 0,
			token: tokenResolution.token,
			tokenSource: tokenResolution.source,
			config: merged
		};
	};
	return resolveAccountWithDefaultFallback({
		accountId: params.accountId,
		normalizeAccountId,
		resolvePrimary: resolve,
		hasCredential: (account) => account.tokenSource !== "none",
		resolveDefaultAccountId: () => resolveDefaultTelegramAccountId(params.cfg)
	});
}
function listEnabledTelegramAccounts(cfg) {
	return listTelegramAccountIds(cfg).map((accountId) => resolveTelegramAccount({
		cfg,
		accountId
	})).filter((account) => account.enabled);
}
//#endregion
//#region extensions/telegram/src/targets.ts
const TELEGRAM_NUMERIC_CHAT_ID_REGEX = /^-?\d+$/;
const TELEGRAM_USERNAME_REGEX = /^[A-Za-z0-9_]{5,}$/i;
function stripTelegramInternalPrefixes(to) {
	let trimmed = to.trim();
	let strippedTelegramPrefix = false;
	while (true) {
		const next = (() => {
			if (/^(telegram|tg):/i.test(trimmed)) {
				strippedTelegramPrefix = true;
				return trimmed.replace(/^(telegram|tg):/i, "").trim();
			}
			if (strippedTelegramPrefix && /^group:/i.test(trimmed)) return trimmed.replace(/^group:/i, "").trim();
			return trimmed;
		})();
		if (next === trimmed) return trimmed;
		trimmed = next;
	}
}
function normalizeTelegramChatId(raw) {
	const stripped = stripTelegramInternalPrefixes(raw);
	if (!stripped) return;
	if (TELEGRAM_NUMERIC_CHAT_ID_REGEX.test(stripped)) return stripped;
}
function isNumericTelegramChatId(raw) {
	return TELEGRAM_NUMERIC_CHAT_ID_REGEX.test(raw.trim());
}
function normalizeTelegramLookupTarget(raw) {
	const stripped = stripTelegramInternalPrefixes(raw);
	if (!stripped) return;
	if (isNumericTelegramChatId(stripped)) return stripped;
	const tmeMatch = /^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]+)$/i.exec(stripped);
	if (tmeMatch?.[1]) return `@${tmeMatch[1]}`;
	if (stripped.startsWith("@")) {
		const handle = stripped.slice(1);
		if (!handle || !TELEGRAM_USERNAME_REGEX.test(handle)) return;
		return `@${handle}`;
	}
	if (TELEGRAM_USERNAME_REGEX.test(stripped)) return `@${stripped}`;
}
/**
* Parse a Telegram delivery target into chatId and optional topic/thread ID.
*
* Supported formats:
* - `chatId` (plain chat ID, t.me link, @username, or internal prefixes like `telegram:...`)
* - `chatId:topicId` (numeric topic/thread ID)
* - `chatId:topic:topicId` (explicit topic marker; preferred)
*/
function resolveTelegramChatType(chatId) {
	const trimmed = chatId.trim();
	if (!trimmed) return "unknown";
	if (isNumericTelegramChatId(trimmed)) return trimmed.startsWith("-") ? "group" : "direct";
	return "unknown";
}
function parseTelegramTarget(to) {
	const normalized = stripTelegramInternalPrefixes(to);
	const topicMatch = /^(.+?):topic:(\d+)$/.exec(normalized);
	if (topicMatch) return {
		chatId: topicMatch[1],
		messageThreadId: Number.parseInt(topicMatch[2], 10),
		chatType: resolveTelegramChatType(topicMatch[1])
	};
	const colonMatch = /^(.+):(\d+)$/.exec(normalized);
	if (colonMatch) return {
		chatId: colonMatch[1],
		messageThreadId: Number.parseInt(colonMatch[2], 10),
		chatType: resolveTelegramChatType(colonMatch[1])
	};
	return {
		chatId: normalized,
		chatType: resolveTelegramChatType(normalized)
	};
}
function resolveTelegramTargetChatType(target) {
	return parseTelegramTarget(target).chatType;
}
//#endregion
export { resolveTelegramTargetChatType as a, listEnabledTelegramAccounts as c, resetMissingDefaultWarnFlag as d, resolveDefaultTelegramAccountId as f, resolveTelegramPollActionGateState as g, resolveTelegramMediaRuntimeOptions as h, parseTelegramTarget as i, listTelegramAccountIds as l, resolveTelegramAccountConfig as m, normalizeTelegramChatId as n, stripTelegramInternalPrefixes as o, resolveTelegramAccount as p, normalizeTelegramLookupTarget as r, createTelegramActionGate as s, isNumericTelegramChatId as t, mergeTelegramAccountConfig as u };
