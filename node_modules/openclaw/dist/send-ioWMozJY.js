import { n as redactSensitiveText } from "./redact-BDinS1q9.js";
import { i as formatUncaughtError, n as extractErrorCode, r as formatErrorMessage, s as readErrorName, t as collectErrorGraphCandidates } from "./errors-Bs2h5H8p.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { r as logVerbose } from "./globals-B43CpcZo.js";
import { a as loadConfig, h as writeConfigFile, u as readConfigFileSnapshotForWrite } from "./io-CS2J_l4V.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { o as isGifMedia, s as kindFromMime } from "./mime-MVyX1IzB.js";
import { a as getImageMetadata } from "./image-ops-DThsnXqU.js";
import { n as normalizePollInput } from "./polls-DHTlCLT8.js";
import { t as loadWebMedia } from "./web-media-Blt79Ld9.js";
import { r as makeProxyFetch } from "./proxy-fetch-DBK7pU_g.js";
import { t as buildOutboundMediaLoadOptions } from "./load-options-Bok4GX-g.js";
import { t as resolveMarkdownTableMode } from "./markdown-tables-hkAZKOT1.js";
import { n as recordChannelActivity } from "./channel-activity-DwMot8mI.js";
import { r as isTelegramVoiceCompatibleAudio } from "./audio-CHDpBcsT.js";
import "./text-runtime-DQoOM_co.js";
import "./runtime-env-BLYCS7ta.js";
import { n as resolveCronStorePath, r as saveCronStore, t as loadCronStore } from "./store-BaZoKJjq.js";
import "./config-runtime-OuR9WVXH.js";
import "./web-media-CwsGSbKF.js";
import { t as isDiagnosticFlagEnabled } from "./diagnostic-flags-DJSWgGE4.js";
import { n as createChannelApiRetryRunner } from "./retry-policy-D7BmFwU_.js";
import "./infra-runtime-DS3U08t7.js";
import "./ssrf-runtime-DGIvmaoK.js";
import "./media-runtime-BfmVsgHe.js";
import "./error-runtime-TBYz7YKO.js";
import "./retry-runtime-Dzv_ec88.js";
import { i as parseTelegramTarget, n as normalizeTelegramChatId, p as resolveTelegramAccount, r as normalizeTelegramLookupTarget } from "./targets-CzovValH.js";
import { n as resolveTelegramFetch } from "./fetch-Cqq-meYl.js";
import { P as normalizeTelegramReplyToMessageId, a as renderTelegramHtmlText, m as buildTypingThreadParams, o as splitTelegramHtmlChunks, p as buildTelegramThreadParams, t as withTelegramApiErrorLogging } from "./api-logging-CFUWewS8.js";
import fs from "node:fs";
import path from "node:path";
import * as grammy from "grammy";
import { Bot, HttpError } from "grammy";
//#region extensions/telegram/src/network-errors.ts
const TELEGRAM_NETWORK_ORIGIN = Symbol("openclaw.telegram.network-origin");
const RECOVERABLE_ERROR_CODES = new Set([
	"ECONNRESET",
	"ECONNREFUSED",
	"EPIPE",
	"ETIMEDOUT",
	"ESOCKETTIMEDOUT",
	"ENETUNREACH",
	"EHOSTUNREACH",
	"ENOTFOUND",
	"EAI_AGAIN",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"UND_ERR_SOCKET",
	"UND_ERR_ABORTED",
	"ECONNABORTED",
	"ERR_NETWORK"
]);
/**
* Error codes that are safe to retry for non-idempotent send operations (e.g. sendMessage).
*
* These represent failures that occur *before* the request reaches Telegram's servers,
* meaning the message was definitely not delivered and it is safe to retry.
*
* Contrast with RECOVERABLE_ERROR_CODES which includes codes like ECONNRESET and ETIMEDOUT
* that can fire *after* Telegram has already received and delivered a message — retrying
* those would cause duplicate messages.
*/
const PRE_CONNECT_ERROR_CODES = new Set([
	"ECONNREFUSED",
	"ENOTFOUND",
	"EAI_AGAIN",
	"ENETUNREACH",
	"EHOSTUNREACH"
]);
const RECOVERABLE_ERROR_NAMES = new Set([
	"AbortError",
	"TimeoutError",
	"ConnectTimeoutError",
	"HeadersTimeoutError",
	"BodyTimeoutError"
]);
const ALWAYS_RECOVERABLE_MESSAGES = new Set(["fetch failed", "typeerror: fetch failed"]);
const GRAMMY_NETWORK_REQUEST_FAILED_AFTER_RE = /^network request(?:\s+for\s+["']?[^"']+["']?)?\s+failed\s+after\b.*[!.]?$/i;
const RECOVERABLE_MESSAGE_SNIPPETS = [
	"undici",
	"network error",
	"network request",
	"client network socket disconnected",
	"socket hang up",
	"getaddrinfo",
	"timeout",
	"timed out"
];
function collectTelegramErrorCandidates(err) {
	return collectErrorGraphCandidates(err, (current) => {
		const nested = [current.cause, current.reason];
		if (Array.isArray(current.errors)) nested.push(...current.errors);
		if (readErrorName(current) === "HttpError") nested.push(current.error);
		return nested;
	});
}
function normalizeCode(code) {
	return code?.trim().toUpperCase() ?? "";
}
function getErrorCode(err) {
	const direct = extractErrorCode(err);
	if (direct) return direct;
	if (!err || typeof err !== "object") return;
	const errno = err.errno;
	if (typeof errno === "string") return errno;
	if (typeof errno === "number") return String(errno);
}
function normalizeTelegramNetworkMethod(method) {
	const trimmed = method?.trim();
	if (!trimmed) return null;
	return trimmed.toLowerCase();
}
function tagTelegramNetworkError(err, origin) {
	if (!err || typeof err !== "object") return;
	Object.defineProperty(err, TELEGRAM_NETWORK_ORIGIN, {
		value: {
			method: normalizeTelegramNetworkMethod(origin.method),
			url: typeof origin.url === "string" && origin.url.trim() ? origin.url : null
		},
		configurable: true
	});
}
function getTelegramNetworkErrorOrigin(err) {
	for (const candidate of collectTelegramErrorCandidates(err)) {
		if (!candidate || typeof candidate !== "object") continue;
		const origin = candidate[TELEGRAM_NETWORK_ORIGIN];
		if (!origin || typeof origin !== "object") continue;
		return {
			method: "method" in origin && typeof origin.method === "string" ? origin.method : null,
			url: "url" in origin && typeof origin.url === "string" ? origin.url : null
		};
	}
	return null;
}
function isTelegramPollingNetworkError(err) {
	return getTelegramNetworkErrorOrigin(err)?.method === "getupdates";
}
/**
* Returns true if the error is safe to retry for a non-idempotent Telegram send operation
* (e.g. sendMessage). Only matches errors that are guaranteed to have occurred *before*
* the request reached Telegram's servers, preventing duplicate message delivery.
*
* Use this instead of isRecoverableTelegramNetworkError for sendMessage/sendPhoto/etc.
* calls where a retry would create a duplicate visible message.
*/
function isSafeToRetrySendError(err) {
	if (!err) return false;
	for (const candidate of collectTelegramErrorCandidates(err)) {
		const code = normalizeCode(getErrorCode(candidate));
		if (code && PRE_CONNECT_ERROR_CODES.has(code)) return true;
	}
	return false;
}
function hasTelegramErrorCode(err, matches) {
	for (const candidate of collectTelegramErrorCandidates(err)) {
		if (!candidate || typeof candidate !== "object" || !("error_code" in candidate)) continue;
		const code = candidate.error_code;
		if (typeof code === "number" && matches(code)) return true;
	}
	return false;
}
function hasTelegramRetryAfter(err) {
	for (const candidate of collectTelegramErrorCandidates(err)) {
		if (!candidate || typeof candidate !== "object") continue;
		const retryAfter = "parameters" in candidate && candidate.parameters && typeof candidate.parameters === "object" ? candidate.parameters.retry_after : "response" in candidate && candidate.response && typeof candidate.response === "object" && "parameters" in candidate.response ? candidate.response.parameters?.retry_after : "error" in candidate && candidate.error && typeof candidate.error === "object" && "parameters" in candidate.error ? candidate.error.parameters?.retry_after : void 0;
		if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) return true;
	}
	return false;
}
/** Returns true for HTTP 5xx server errors (error may have been processed). */
function isTelegramServerError(err) {
	return hasTelegramErrorCode(err, (code) => code >= 500);
}
function isTelegramRateLimitError(err) {
	return hasTelegramErrorCode(err, (code) => code === 429) || hasTelegramRetryAfter(err) && /(?:^|\b)429\b|too many requests/i.test(formatErrorMessage(err));
}
/** Returns true for HTTP 4xx client errors (Telegram explicitly rejected, not applied). */
function isTelegramClientRejection(err) {
	return hasTelegramErrorCode(err, (code) => code >= 400 && code < 500);
}
function isRecoverableTelegramNetworkError(err, options = {}) {
	if (!err) return false;
	const allowMessageMatch = typeof options.allowMessageMatch === "boolean" ? options.allowMessageMatch : options.context !== "send";
	for (const candidate of collectTelegramErrorCandidates(err)) {
		const code = normalizeCode(getErrorCode(candidate));
		if (code && RECOVERABLE_ERROR_CODES.has(code)) return true;
		const name = readErrorName(candidate);
		if (name && RECOVERABLE_ERROR_NAMES.has(name)) return true;
		const message = formatErrorMessage(candidate).trim().toLowerCase();
		if (message && ALWAYS_RECOVERABLE_MESSAGES.has(message)) return true;
		if (message && GRAMMY_NETWORK_REQUEST_FAILED_AFTER_RE.test(message)) return true;
		if (allowMessageMatch && message) {
			if (RECOVERABLE_MESSAGE_SNIPPETS.some((snippet) => message.includes(snippet))) return true;
		}
	}
	return false;
}
function splitTelegramCaption(text) {
	const trimmed = text?.trim() ?? "";
	if (!trimmed) return {
		caption: void 0,
		followUpText: void 0
	};
	if (trimmed.length > 1024) return {
		caption: void 0,
		followUpText: trimmed
	};
	return {
		caption: trimmed,
		followUpText: void 0
	};
}
//#endregion
//#region extensions/telegram/src/inline-keyboard.ts
function buildInlineKeyboard(buttons) {
	if (!buttons?.length) return;
	const rows = buttons.map((row) => row.filter((button) => button?.text && button?.callback_data).map((button) => ({
		text: button.text,
		callback_data: button.callback_data,
		...button.style ? { style: button.style } : {}
	}))).filter((row) => row.length > 0);
	if (rows.length === 0) return;
	return { inline_keyboard: rows };
}
//#endregion
//#region extensions/telegram/src/sent-message-cache.ts
const TTL_MS = 1440 * 60 * 1e3;
const TELEGRAM_SENT_MESSAGES_STATE_KEY = Symbol.for("openclaw.telegramSentMessagesState");
function getSentMessageState() {
	const globalStore = globalThis;
	const existing = globalStore[TELEGRAM_SENT_MESSAGES_STATE_KEY];
	if (existing) return existing;
	const state = {};
	globalStore[TELEGRAM_SENT_MESSAGES_STATE_KEY] = state;
	return state;
}
function createSentMessageStore() {
	return /* @__PURE__ */ new Map();
}
function resolveSentMessageStorePath() {
	return `${resolveStorePath(loadConfig().session?.store)}.telegram-sent-messages.json`;
}
function cleanupExpired(scopeKey, entry, now) {
	for (const [id, timestamp] of entry) if (now - timestamp > TTL_MS) entry.delete(id);
	if (entry.size === 0) getSentMessages().delete(scopeKey);
}
function readPersistedSentMessages(filePath) {
	if (!fs.existsSync(filePath)) return createSentMessageStore();
	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		const now = Date.now();
		const store = createSentMessageStore();
		for (const [chatId, entry] of Object.entries(parsed)) {
			const messages = /* @__PURE__ */ new Map();
			for (const [messageId, timestamp] of Object.entries(entry)) if (typeof timestamp === "number" && Number.isFinite(timestamp) && now - timestamp <= TTL_MS) messages.set(messageId, timestamp);
			if (messages.size > 0) store.set(chatId, messages);
		}
		return store;
	} catch (error) {
		logVerbose(`telegram: failed to read sent-message cache: ${String(error)}`);
		return createSentMessageStore();
	}
}
function getSentMessages() {
	const state = getSentMessageState();
	const persistedPath = resolveSentMessageStorePath();
	if (!state.store || state.persistedPath !== persistedPath) {
		state.store = readPersistedSentMessages(persistedPath);
		state.persistedPath = persistedPath;
	}
	return state.store;
}
function persistSentMessages() {
	const state = getSentMessageState();
	const store = state.store;
	const filePath = state.persistedPath;
	if (!store || !filePath) return;
	const now = Date.now();
	const serialized = {};
	for (const [chatId, entry] of store) {
		cleanupExpired(chatId, entry, now);
		if (entry.size > 0) serialized[chatId] = Object.fromEntries(entry);
	}
	if (Object.keys(serialized).length === 0) {
		fs.rmSync(filePath, { force: true });
		return;
	}
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	const tempPath = `${filePath}.${process.pid}.tmp`;
	fs.writeFileSync(tempPath, JSON.stringify(serialized), "utf-8");
	fs.renameSync(tempPath, filePath);
}
function recordSentMessage(chatId, messageId) {
	const scopeKey = String(chatId);
	const idKey = String(messageId);
	const now = Date.now();
	const store = getSentMessages();
	let entry = store.get(scopeKey);
	if (!entry) {
		entry = /* @__PURE__ */ new Map();
		store.set(scopeKey, entry);
	}
	entry.set(idKey, now);
	if (entry.size > 100) cleanupExpired(scopeKey, entry, now);
	try {
		persistSentMessages();
	} catch (error) {
		logVerbose(`telegram: failed to persist sent-message cache: ${String(error)}`);
	}
}
function wasSentByBot(chatId, messageId) {
	const scopeKey = String(chatId);
	const idKey = String(messageId);
	const entry = getSentMessages().get(scopeKey);
	if (!entry) return false;
	cleanupExpired(scopeKey, entry, Date.now());
	return entry.has(idKey);
}
//#endregion
//#region extensions/telegram/src/target-writeback.ts
const writebackLogger = createSubsystemLogger("telegram/target-writeback");
const TELEGRAM_ADMIN_SCOPE = "operator.admin";
function asObjectRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function normalizeTelegramLookupTargetForMatch(raw) {
	const normalized = normalizeTelegramLookupTarget(raw);
	if (!normalized) return;
	return normalized.startsWith("@") ? normalized.toLowerCase() : normalized;
}
function normalizeTelegramTargetForMatch(raw) {
	const parsed = parseTelegramTarget(raw);
	const normalized = normalizeTelegramLookupTargetForMatch(parsed.chatId);
	if (!normalized) return;
	return `${normalized}|${parsed.messageThreadId == null ? "" : String(parsed.messageThreadId)}`;
}
function buildResolvedTelegramTarget(params) {
	const { raw, parsed, resolvedChatId } = params;
	if (parsed.messageThreadId == null) return resolvedChatId;
	return raw.includes(":topic:") ? `${resolvedChatId}:topic:${parsed.messageThreadId}` : `${resolvedChatId}:${parsed.messageThreadId}`;
}
function resolveLegacyRewrite(params) {
	const parsed = parseTelegramTarget(params.raw);
	if (normalizeTelegramChatId(parsed.chatId)) return null;
	const normalized = normalizeTelegramLookupTargetForMatch(parsed.chatId);
	if (!normalized) return null;
	return {
		matchKey: `${normalized}|${parsed.messageThreadId == null ? "" : String(parsed.messageThreadId)}`,
		resolvedTarget: buildResolvedTelegramTarget({
			raw: params.raw,
			parsed,
			resolvedChatId: params.resolvedChatId
		})
	};
}
function rewriteTargetIfMatch(params) {
	if (typeof params.rawValue !== "string" && typeof params.rawValue !== "number") return null;
	const value = String(params.rawValue).trim();
	if (!value) return null;
	if (normalizeTelegramTargetForMatch(value) !== params.matchKey) return null;
	return params.resolvedTarget;
}
function replaceTelegramDefaultToTargets(params) {
	let changed = false;
	const telegram = asObjectRecord(params.cfg.channels?.telegram);
	if (!telegram) return changed;
	const maybeReplace = (holder, key) => {
		const nextTarget = rewriteTargetIfMatch({
			rawValue: holder[key],
			matchKey: params.matchKey,
			resolvedTarget: params.resolvedTarget
		});
		if (!nextTarget) return;
		holder[key] = nextTarget;
		changed = true;
	};
	maybeReplace(telegram, "defaultTo");
	const accounts = asObjectRecord(telegram.accounts);
	if (!accounts) return changed;
	for (const accountId of Object.keys(accounts)) {
		const account = asObjectRecord(accounts[accountId]);
		if (!account) continue;
		maybeReplace(account, "defaultTo");
	}
	return changed;
}
async function maybePersistResolvedTelegramTarget(params) {
	const raw = params.rawTarget.trim();
	if (!raw) return;
	const rewrite = resolveLegacyRewrite({
		raw,
		resolvedChatId: params.resolvedChatId
	});
	if (!rewrite) return;
	const { matchKey, resolvedTarget } = rewrite;
	if (Array.isArray(params.gatewayClientScopes) && !params.gatewayClientScopes.includes(TELEGRAM_ADMIN_SCOPE)) {
		writebackLogger.warn(`skipping Telegram target writeback for ${raw} because gateway caller is missing ${TELEGRAM_ADMIN_SCOPE}`);
		return;
	}
	try {
		const { snapshot, writeOptions } = await readConfigFileSnapshotForWrite();
		const nextConfig = structuredClone(snapshot.config ?? {});
		if (replaceTelegramDefaultToTargets({
			cfg: nextConfig,
			matchKey,
			resolvedTarget
		})) {
			await writeConfigFile(nextConfig, writeOptions);
			if (params.verbose) writebackLogger.warn(`resolved Telegram defaultTo target ${raw} -> ${resolvedTarget}`);
		}
	} catch (err) {
		if (params.verbose) writebackLogger.warn(`failed to persist Telegram defaultTo target ${raw}: ${String(err)}`);
	}
	try {
		const storePath = resolveCronStorePath(params.cfg.cron?.store);
		const store = await loadCronStore(storePath);
		let cronChanged = false;
		for (const job of store.jobs) {
			if (job.delivery?.channel !== "telegram") continue;
			const nextTarget = rewriteTargetIfMatch({
				rawValue: job.delivery.to,
				matchKey,
				resolvedTarget
			});
			if (!nextTarget) continue;
			job.delivery.to = nextTarget;
			cronChanged = true;
		}
		if (cronChanged) {
			await saveCronStore(storePath, store);
			if (params.verbose) writebackLogger.warn(`resolved Telegram cron delivery target ${raw} -> ${resolvedTarget}`);
		}
	} catch (err) {
		if (params.verbose) writebackLogger.warn(`failed to persist Telegram cron target ${raw}: ${String(err)}`);
	}
}
//#endregion
//#region extensions/telegram/src/voice.ts
function resolveTelegramVoiceDecision(opts) {
	if (!opts.wantsVoice) return { useVoice: false };
	if (isTelegramVoiceCompatibleAudio(opts)) return { useVoice: true };
	return {
		useVoice: false,
		reason: `media is ${opts.contentType ?? "unknown"} (${opts.fileName ?? "unknown"})`
	};
}
function resolveTelegramVoiceSend(opts) {
	const decision = resolveTelegramVoiceDecision(opts);
	if (decision.reason && opts.logFallback) opts.logFallback(`Telegram voice requested but ${decision.reason}; sending as audio file instead.`);
	return { useVoice: decision.useVoice };
}
//#endregion
//#region extensions/telegram/src/send.ts
const InputFileCtor = grammy.InputFile;
const MAX_TELEGRAM_PHOTO_DIMENSION_SUM = 1e4;
const MAX_TELEGRAM_PHOTO_ASPECT_RATIO = 20;
function resolveTelegramMessageIdOrThrow(result, context) {
	if (typeof result?.message_id === "number" && Number.isFinite(result.message_id)) return Math.trunc(result.message_id);
	throw new Error(`Telegram ${context} returned no message_id`);
}
function splitTelegramPlainTextChunks(text, limit) {
	if (!text) return [];
	const normalizedLimit = Math.max(1, Math.floor(limit));
	const chunks = [];
	for (let start = 0; start < text.length; start += normalizedLimit) chunks.push(text.slice(start, start + normalizedLimit));
	return chunks;
}
function splitTelegramPlainTextFallback(text, chunkCount, limit) {
	if (!text) return [];
	const normalizedLimit = Math.max(1, Math.floor(limit));
	const fixedChunks = splitTelegramPlainTextChunks(text, normalizedLimit);
	if (chunkCount <= 1 || fixedChunks.length >= chunkCount) return fixedChunks;
	const chunks = [];
	let offset = 0;
	for (let index = 0; index < chunkCount; index += 1) {
		const remainingChars = text.length - offset;
		const remainingChunks = chunkCount - index;
		const nextChunkLength = remainingChunks === 1 ? remainingChars : Math.min(normalizedLimit, Math.ceil(remainingChars / remainingChunks));
		chunks.push(text.slice(offset, offset + nextChunkLength));
		offset += nextChunkLength;
	}
	return chunks;
}
const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
const THREAD_NOT_FOUND_RE = /400:\s*Bad Request:\s*message thread not found/i;
const MESSAGE_NOT_MODIFIED_RE = /400:\s*Bad Request:\s*message is not modified|MESSAGE_NOT_MODIFIED/i;
const CHAT_NOT_FOUND_RE = /400: Bad Request: chat not found/i;
const sendLogger = createSubsystemLogger("telegram/send");
const diagLogger = createSubsystemLogger("telegram/diagnostic");
const telegramClientOptionsCache = /* @__PURE__ */ new Map();
const MAX_TELEGRAM_CLIENT_OPTIONS_CACHE_SIZE = 64;
function asTelegramClientFetch(fetchImpl) {
	return fetchImpl;
}
function resetTelegramClientOptionsCacheForTests() {
	telegramClientOptionsCache.clear();
}
function createTelegramHttpLogger(cfg) {
	if (!isDiagnosticFlagEnabled("telegram.http", cfg)) return () => {};
	return (label, err) => {
		if (!(err instanceof HttpError)) return;
		const detail = redactSensitiveText(formatUncaughtError(err.error ?? err));
		diagLogger.warn(`telegram http error (${label}): ${detail}`);
	};
}
function shouldUseTelegramClientOptionsCache() {
	return !process.env.VITEST && true;
}
function buildTelegramClientOptionsCacheKey(params) {
	const proxyKey = params.account.config.proxy?.trim() ?? "";
	const autoSelectFamily = params.account.config.network?.autoSelectFamily;
	const autoSelectFamilyKey = typeof autoSelectFamily === "boolean" ? String(autoSelectFamily) : "default";
	const dnsResultOrderKey = params.account.config.network?.dnsResultOrder ?? "default";
	const apiRootKey = params.account.config.apiRoot?.trim() ?? "";
	const timeoutSecondsKey = typeof params.timeoutSeconds === "number" ? String(params.timeoutSeconds) : "default";
	return `${params.account.accountId}::${proxyKey}::${autoSelectFamilyKey}::${dnsResultOrderKey}::${apiRootKey}::${timeoutSecondsKey}`;
}
function setCachedTelegramClientOptions(cacheKey, clientOptions) {
	telegramClientOptionsCache.set(cacheKey, clientOptions);
	if (telegramClientOptionsCache.size > MAX_TELEGRAM_CLIENT_OPTIONS_CACHE_SIZE) {
		const oldestKey = telegramClientOptionsCache.keys().next().value;
		if (oldestKey !== void 0) telegramClientOptionsCache.delete(oldestKey);
	}
	return clientOptions;
}
function resolveTelegramClientOptions(account) {
	const timeoutSeconds = typeof account.config.timeoutSeconds === "number" && Number.isFinite(account.config.timeoutSeconds) ? Math.max(1, Math.floor(account.config.timeoutSeconds)) : void 0;
	const cacheKey = shouldUseTelegramClientOptionsCache() ? buildTelegramClientOptionsCacheKey({
		account,
		timeoutSeconds
	}) : null;
	if (cacheKey && telegramClientOptionsCache.has(cacheKey)) return telegramClientOptionsCache.get(cacheKey);
	const proxyUrl = account.config.proxy?.trim();
	const proxyFetch = proxyUrl ? makeProxyFetch(proxyUrl) : void 0;
	const apiRoot = account.config.apiRoot?.trim() || void 0;
	const fetchImpl = resolveTelegramFetch(proxyFetch, { network: account.config.network });
	const clientOptions = fetchImpl || timeoutSeconds || apiRoot ? {
		...fetchImpl ? { fetch: asTelegramClientFetch(fetchImpl) } : {},
		...timeoutSeconds ? { timeoutSeconds } : {},
		...apiRoot ? { apiRoot } : {}
	} : void 0;
	if (cacheKey) return setCachedTelegramClientOptions(cacheKey, clientOptions);
	return clientOptions;
}
function resolveToken(explicit, params) {
	if (explicit?.trim()) return explicit.trim();
	if (!params.token) throw new Error(`Telegram bot token missing for account "${params.accountId}" (set channels.telegram.accounts.${params.accountId}.botToken/tokenFile or TELEGRAM_BOT_TOKEN for default).`);
	return params.token.trim();
}
async function resolveChatId(to, params) {
	const numericChatId = normalizeTelegramChatId(to);
	if (numericChatId) return numericChatId;
	const lookupTarget = normalizeTelegramLookupTarget(to);
	const getChat = params.api.getChat;
	if (!lookupTarget || typeof getChat !== "function") throw new Error("Telegram recipient must be a numeric chat ID");
	try {
		const chat = await getChat.call(params.api, lookupTarget);
		const resolved = normalizeTelegramChatId(String(chat?.id ?? ""));
		if (!resolved) throw new Error(`resolved chat id is not numeric (${String(chat?.id ?? "")})`);
		if (params.verbose) sendLogger.warn(`telegram recipient ${lookupTarget} resolved to numeric chat id ${resolved}`);
		return resolved;
	} catch (err) {
		const detail = formatErrorMessage(err);
		throw new Error(`Telegram recipient ${lookupTarget} could not be resolved to a numeric chat ID (${detail})`, { cause: err });
	}
}
async function resolveAndPersistChatId(params) {
	const chatId = await resolveChatId(params.lookupTarget, {
		api: params.api,
		verbose: params.verbose
	});
	await maybePersistResolvedTelegramTarget({
		cfg: params.cfg,
		rawTarget: params.persistTarget,
		resolvedChatId: chatId,
		verbose: params.verbose,
		gatewayClientScopes: params.gatewayClientScopes
	});
	return chatId;
}
function normalizeMessageId(raw) {
	if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
	if (typeof raw === "string") {
		const value = raw.trim();
		if (!value) throw new Error("Message id is required for Telegram actions");
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	throw new Error("Message id is required for Telegram actions");
}
function isTelegramThreadNotFoundError(err) {
	return THREAD_NOT_FOUND_RE.test(formatErrorMessage(err));
}
function isTelegramMessageNotModifiedError(err) {
	return MESSAGE_NOT_MODIFIED_RE.test(formatErrorMessage(err));
}
function hasMessageThreadIdParam(params) {
	if (!params) return false;
	const value = params.message_thread_id;
	if (typeof value === "number") return Number.isFinite(value);
	return false;
}
function removeMessageThreadIdParam(params) {
	if (!params || !hasMessageThreadIdParam(params)) return params;
	const next = { ...params };
	delete next.message_thread_id;
	return Object.keys(next).length > 0 ? next : void 0;
}
function isTelegramHtmlParseError(err) {
	return PARSE_ERR_RE.test(formatErrorMessage(err));
}
function buildTelegramThreadReplyParams(params) {
	const messageThreadId = params.messageThreadId != null ? params.messageThreadId : params.targetMessageThreadId;
	const threadScope = params.chatType === "direct" ? "dm" : "forum";
	const threadIdParams = buildTelegramThreadParams(messageThreadId != null ? {
		id: messageThreadId,
		scope: threadScope
	} : void 0);
	const threadParams = threadIdParams ? { ...threadIdParams } : {};
	const replyToMessageId = normalizeTelegramReplyToMessageId(params.replyToMessageId);
	if (replyToMessageId != null) if (params.quoteText?.trim()) threadParams.reply_parameters = {
		message_id: replyToMessageId,
		quote: params.quoteText.trim(),
		allow_sending_without_reply: true
	};
	else {
		threadParams.reply_to_message_id = replyToMessageId;
		threadParams.allow_sending_without_reply = true;
	}
	return threadParams;
}
async function withTelegramHtmlParseFallback(params) {
	try {
		return await params.requestHtml(params.label);
	} catch (err) {
		if (!isTelegramHtmlParseError(err)) throw err;
		if (params.verbose) sendLogger.warn(`telegram ${params.label} failed with HTML parse error, retrying as plain text: ${formatErrorMessage(err)}`);
		return await params.requestPlain(`${params.label}-plain`);
	}
}
function resolveTelegramApiContext(opts) {
	const cfg = opts.cfg ?? loadConfig();
	const account = resolveTelegramAccount({
		cfg,
		accountId: opts.accountId
	});
	const token = resolveToken(opts.token, account);
	const client = resolveTelegramClientOptions(account);
	return {
		cfg,
		account,
		api: opts.api ?? new Bot(token, client ? { client } : void 0).api
	};
}
function createTelegramRequestWithDiag(params) {
	const request = createChannelApiRetryRunner({
		retry: params.retry,
		configRetry: params.account.config.retry,
		verbose: params.verbose,
		...params.shouldRetry ? { shouldRetry: params.shouldRetry } : {},
		...params.strictShouldRetry ? { strictShouldRetry: true } : {}
	});
	const logHttpError = createTelegramHttpLogger(params.cfg);
	return (fn, label, options) => {
		const runRequest = () => request(fn, label);
		return (params.useApiErrorLogging === false ? runRequest() : withTelegramApiErrorLogging({
			operation: label ?? "request",
			fn: runRequest,
			...options?.shouldLog ? { shouldLog: options.shouldLog } : {}
		})).catch((err) => {
			logHttpError(label ?? "request", err);
			throw err;
		});
	};
}
function wrapTelegramChatNotFoundError(err, params) {
	const errorMsg = formatErrorMessage(err);
	if (/403.*(bot.*not.*member|bot.*blocked|bot.*kicked)/i.test(errorMsg)) return new Error([
		`Telegram send failed: bot is not a member of the chat, was blocked, or was kicked (chat_id=${params.chatId}).`,
		`Telegram API said: ${errorMsg}.`,
		"Fix: Add the bot to the channel/group, or ensure it has not been removed/blocked/kicked by the user.",
		`Input was: ${JSON.stringify(params.input)}.`
	].join(" "));
	if (!CHAT_NOT_FOUND_RE.test(errorMsg)) return err;
	return new Error([
		`Telegram send failed: chat not found (chat_id=${params.chatId}).`,
		"Likely: bot not started in DM, bot removed from group/channel, group migrated (new -100… id), or wrong bot token.",
		`Input was: ${JSON.stringify(params.input)}.`
	].join(" "));
}
async function withTelegramThreadFallback(params, label, verbose, attempt) {
	try {
		return await attempt(params, label);
	} catch (err) {
		if (!hasMessageThreadIdParam(params) || !isTelegramThreadNotFoundError(err)) throw err;
		if (verbose) sendLogger.warn(`telegram ${label} failed with message_thread_id, retrying without thread: ${formatErrorMessage(err)}`);
		return await attempt(removeMessageThreadIdParam(params), `${label}-threadless`);
	}
}
function createRequestWithChatNotFound(params) {
	return async (fn, label) => params.requestWithDiag(fn, label).catch((err) => {
		throw wrapTelegramChatNotFoundError(err, {
			chatId: params.chatId,
			input: params.input
		});
	});
}
function createTelegramNonIdempotentRequestWithDiag(params) {
	return createTelegramRequestWithDiag({
		cfg: params.cfg,
		account: params.account,
		retry: params.retry,
		verbose: params.verbose,
		useApiErrorLogging: params.useApiErrorLogging,
		shouldRetry: (err) => isSafeToRetrySendError(err) || isTelegramRateLimitError(err),
		strictShouldRetry: true
	});
}
async function sendMessageTelegram(to, text, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const target = parseTelegramTarget(to);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: target.chatId,
		persistTarget: to,
		verbose: opts.verbose,
		gatewayClientScopes: opts.gatewayClientScopes
	});
	const mediaUrl = opts.mediaUrl?.trim();
	const mediaMaxBytes = opts.maxBytes ?? (typeof account.config.mediaMaxMb === "number" ? account.config.mediaMaxMb : 100) * 1024 * 1024;
	const replyMarkup = buildInlineKeyboard(opts.buttons);
	const threadParams = buildTelegramThreadReplyParams({
		targetMessageThreadId: target.messageThreadId,
		messageThreadId: opts.messageThreadId,
		chatType: target.chatType,
		replyToMessageId: opts.replyToMessageId,
		quoteText: opts.quoteText
	});
	const hasThreadParams = Object.keys(threadParams).length > 0;
	const requestWithChatNotFound = createRequestWithChatNotFound({
		requestWithDiag: createTelegramNonIdempotentRequestWithDiag({
			cfg,
			account,
			retry: opts.retry,
			verbose: opts.verbose
		}),
		chatId,
		input: to
	});
	const textMode = opts.textMode ?? "markdown";
	const tableMode = resolveMarkdownTableMode({
		cfg,
		channel: "telegram",
		accountId: account.accountId
	});
	const renderHtmlText = (value) => renderTelegramHtmlText(value, {
		textMode,
		tableMode
	});
	const linkPreviewOptions = account.config.linkPreview ?? true ? void 0 : { is_disabled: true };
	const sendTelegramTextChunk = async (chunk, params) => {
		return await withTelegramThreadFallback(params, "message", opts.verbose, async (effectiveParams, label) => {
			const baseParams = effectiveParams ? { ...effectiveParams } : {};
			if (linkPreviewOptions) baseParams.link_preview_options = linkPreviewOptions;
			const plainParams = {
				...baseParams,
				...opts.silent === true ? { disable_notification: true } : {}
			};
			const hasPlainParams = Object.keys(plainParams).length > 0;
			const requestPlain = (retryLabel) => requestWithChatNotFound(() => hasPlainParams ? api.sendMessage(chatId, chunk.plainText, plainParams) : api.sendMessage(chatId, chunk.plainText), retryLabel);
			if (!chunk.htmlText) return await requestPlain(label);
			const htmlText = chunk.htmlText;
			const htmlParams = {
				parse_mode: "HTML",
				...plainParams
			};
			return await withTelegramHtmlParseFallback({
				label,
				verbose: opts.verbose,
				requestHtml: (retryLabel) => requestWithChatNotFound(() => api.sendMessage(chatId, htmlText, htmlParams), retryLabel),
				requestPlain
			});
		});
	};
	const buildTextParams = (isLastChunk) => hasThreadParams || isLastChunk && replyMarkup ? {
		...threadParams,
		...isLastChunk && replyMarkup ? { reply_markup: replyMarkup } : {}
	} : void 0;
	const sendTelegramTextChunks = async (chunks, context) => {
		let lastMessageId = "";
		let lastChatId = chatId;
		for (let index = 0; index < chunks.length; index += 1) {
			const chunk = chunks[index];
			if (!chunk) continue;
			const res = await sendTelegramTextChunk(chunk, buildTextParams(index === chunks.length - 1));
			const messageId = resolveTelegramMessageIdOrThrow(res, context);
			recordSentMessage(chatId, messageId);
			lastMessageId = String(messageId);
			lastChatId = String(res?.chat?.id ?? chatId);
		}
		return {
			messageId: lastMessageId,
			chatId: lastChatId
		};
	};
	const buildChunkedTextPlan = (rawText, context) => {
		const fallbackText = opts.plainText ?? rawText;
		let htmlChunks;
		try {
			htmlChunks = splitTelegramHtmlChunks(rawText, 4e3);
		} catch (error) {
			logVerbose(`telegram ${context} failed HTML chunk planning, retrying as plain text: ${formatErrorMessage(error)}`);
			return splitTelegramPlainTextChunks(fallbackText, 4e3).map((plainText) => ({ plainText }));
		}
		const fixedPlainTextChunks = splitTelegramPlainTextChunks(fallbackText, 4e3);
		if (fixedPlainTextChunks.length > htmlChunks.length) {
			logVerbose(`telegram ${context} plain-text fallback needs more chunks than HTML; sending plain text`);
			return fixedPlainTextChunks.map((plainText) => ({ plainText }));
		}
		const plainTextChunks = splitTelegramPlainTextFallback(fallbackText, htmlChunks.length, 4e3);
		return htmlChunks.map((htmlText, index) => ({
			htmlText,
			plainText: plainTextChunks[index] ?? htmlText
		}));
	};
	const sendChunkedText = async (rawText, context) => await sendTelegramTextChunks(buildChunkedTextPlan(rawText, context), context);
	async function shouldSendTelegramImageAsPhoto(buffer) {
		try {
			const metadata = await getImageMetadata(buffer);
			const width = metadata?.width;
			const height = metadata?.height;
			if (typeof width !== "number" || typeof height !== "number") {
				sendLogger.warn("Photo dimensions are unavailable. Sending as document instead.");
				return false;
			}
			const shorterSide = Math.min(width, height);
			const longerSide = Math.max(width, height);
			if (!(width + height <= MAX_TELEGRAM_PHOTO_DIMENSION_SUM && shorterSide > 0 && longerSide <= shorterSide * MAX_TELEGRAM_PHOTO_ASPECT_RATIO)) {
				sendLogger.warn(`Photo dimensions (${width}x${height}) are not valid for Telegram photos. Sending as document instead.`);
				return false;
			}
			return true;
		} catch (err) {
			sendLogger.warn(`Failed to validate photo dimensions: ${formatErrorMessage(err)}. Sending as document instead.`);
			return false;
		}
	}
	if (mediaUrl) {
		const media = await loadWebMedia(mediaUrl, buildOutboundMediaLoadOptions({
			maxBytes: mediaMaxBytes,
			mediaLocalRoots: opts.mediaLocalRoots,
			mediaReadFile: opts.mediaReadFile,
			optimizeImages: opts.forceDocument ? false : void 0
		}));
		const kind = kindFromMime(media.contentType ?? void 0);
		const isGif = isGifMedia({
			contentType: media.contentType,
			fileName: media.fileName
		});
		let sendImageAsPhoto = true;
		if (kind === "image" && !isGif && !opts.forceDocument) sendImageAsPhoto = await shouldSendTelegramImageAsPhoto(media.buffer);
		const isVideoNote = kind === "video" && opts.asVideoNote === true;
		const fileName = media.fileName ?? (isGif ? "animation.gif" : inferFilename(kind ?? "document")) ?? "file";
		const file = new InputFileCtor(media.buffer, fileName);
		let caption;
		let followUpText;
		if (isVideoNote) {
			caption = void 0;
			followUpText = text.trim() ? text : void 0;
		} else {
			const split = splitTelegramCaption(text);
			caption = split.caption;
			followUpText = split.followUpText;
		}
		const htmlCaption = caption ? renderHtmlText(caption) : void 0;
		const needsSeparateText = Boolean(followUpText);
		const baseMediaParams = {
			...hasThreadParams ? threadParams : {},
			...!needsSeparateText && replyMarkup ? { reply_markup: replyMarkup } : {}
		};
		const mediaParams = {
			...htmlCaption ? {
				caption: htmlCaption,
				parse_mode: "HTML"
			} : {},
			...baseMediaParams,
			...opts.silent === true ? { disable_notification: true } : {}
		};
		const sendMedia = async (label, sender) => await withTelegramThreadFallback(mediaParams, label, opts.verbose, async (effectiveParams, retryLabel) => requestWithChatNotFound(() => sender(effectiveParams), retryLabel));
		const mediaSender = (() => {
			if (isGif && !opts.forceDocument) return {
				label: "animation",
				sender: (effectiveParams) => api.sendAnimation(chatId, file, effectiveParams)
			};
			if (kind === "image" && !opts.forceDocument && sendImageAsPhoto) return {
				label: "photo",
				sender: (effectiveParams) => api.sendPhoto(chatId, file, effectiveParams)
			};
			if (kind === "video") {
				if (isVideoNote) return {
					label: "video_note",
					sender: (effectiveParams) => api.sendVideoNote(chatId, file, effectiveParams)
				};
				return {
					label: "video",
					sender: (effectiveParams) => api.sendVideo(chatId, file, effectiveParams)
				};
			}
			if (kind === "audio") {
				const { useVoice } = resolveTelegramVoiceSend({
					wantsVoice: opts.asVoice === true,
					contentType: media.contentType,
					fileName,
					logFallback: logVerbose
				});
				if (useVoice) return {
					label: "voice",
					sender: (effectiveParams) => api.sendVoice(chatId, file, effectiveParams)
				};
				return {
					label: "audio",
					sender: (effectiveParams) => api.sendAudio(chatId, file, effectiveParams)
				};
			}
			return {
				label: "document",
				sender: (effectiveParams) => api.sendDocument(chatId, file, opts.forceDocument ? {
					...effectiveParams,
					disable_content_type_detection: true
				} : effectiveParams)
			};
		})();
		const result = await sendMedia(mediaSender.label, mediaSender.sender);
		const mediaMessageId = resolveTelegramMessageIdOrThrow(result, "media send");
		const resolvedChatId = String(result?.chat?.id ?? chatId);
		recordSentMessage(chatId, mediaMessageId);
		recordChannelActivity({
			channel: "telegram",
			accountId: account.accountId,
			direction: "outbound"
		});
		if (needsSeparateText && followUpText) {
			if (textMode === "html") return {
				messageId: (await sendChunkedText(followUpText, "text follow-up send")).messageId,
				chatId: resolvedChatId
			};
			return {
				messageId: (await sendTelegramTextChunks([{
					plainText: followUpText,
					htmlText: renderHtmlText(followUpText)
				}], "text follow-up send")).messageId,
				chatId: resolvedChatId
			};
		}
		return {
			messageId: String(mediaMessageId),
			chatId: resolvedChatId
		};
	}
	if (!text || !text.trim()) throw new Error("Message must be non-empty for Telegram sends");
	let textResult;
	if (textMode === "html") textResult = await sendChunkedText(text, "text send");
	else textResult = await sendTelegramTextChunks([{
		plainText: opts.plainText ?? text,
		htmlText: renderHtmlText(text)
	}], "text send");
	recordChannelActivity({
		channel: "telegram",
		accountId: account.accountId,
		direction: "outbound"
	});
	return textResult;
}
async function sendTypingTelegram(to, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const target = parseTelegramTarget(to);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: target.chatId,
		persistTarget: to,
		verbose: opts.verbose
	});
	const requestWithDiag = createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose,
		shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" })
	});
	const threadParams = buildTypingThreadParams(target.messageThreadId ?? opts.messageThreadId);
	await requestWithDiag(() => api.sendChatAction(chatId, "typing", threadParams), "typing");
	return { ok: true };
}
async function reactMessageTelegram(chatIdInput, messageIdInput, emoji, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = normalizeMessageId(messageIdInput);
	const requestWithDiag = createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose,
		shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" })
	});
	const remove = opts.remove === true;
	const trimmedEmoji = emoji.trim();
	const reactions = remove || !trimmedEmoji ? [] : [{
		type: "emoji",
		emoji: trimmedEmoji
	}];
	if (typeof api.setMessageReaction !== "function") throw new Error("Telegram reactions are unavailable in this bot API.");
	try {
		await requestWithDiag(() => api.setMessageReaction(chatId, messageId, reactions), "reaction");
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (/REACTION_INVALID/i.test(msg)) return {
			ok: false,
			warning: `Reaction unavailable: ${trimmedEmoji}`
		};
		throw err;
	}
	return { ok: true };
}
async function deleteMessageTelegram(chatIdInput, messageIdInput, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = normalizeMessageId(messageIdInput);
	await createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose,
		shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" })
	})(() => api.deleteMessage(chatId, messageId), "deleteMessage");
	logVerbose(`[telegram] Deleted message ${messageId} from chat ${chatId}`);
	return { ok: true };
}
async function pinMessageTelegram(chatIdInput, messageIdInput, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = normalizeMessageId(messageIdInput);
	await createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose
	})(() => api.pinChatMessage(chatId, messageId, { disable_notification: true }), "pinChatMessage");
	logVerbose(`[telegram] Pinned message ${messageId} in chat ${chatId}`);
	return {
		ok: true,
		messageId: String(messageId),
		chatId
	};
}
async function unpinMessageTelegram(chatIdInput, messageIdInput, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = messageIdInput === void 0 ? void 0 : normalizeMessageId(messageIdInput);
	await createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose
	})(() => api.unpinChatMessage(chatId, messageId), "unpinChatMessage");
	logVerbose(`[telegram] Unpinned ${messageId != null ? `message ${messageId}` : "active message"} in chat ${chatId}`);
	return {
		ok: true,
		chatId,
		...messageId != null ? { messageId: String(messageId) } : {}
	};
}
async function editForumTopicTelegram(chatIdInput, messageThreadIdInput, opts = {}) {
	const nameProvided = opts.name !== void 0;
	const trimmedName = opts.name?.trim();
	if (nameProvided && !trimmedName) throw new Error("Telegram forum topic name is required");
	if (trimmedName && trimmedName.length > 128) throw new Error("Telegram forum topic name must be 128 characters or fewer");
	const iconProvided = opts.iconCustomEmojiId !== void 0;
	const trimmedIconCustomEmojiId = opts.iconCustomEmojiId?.trim();
	if (iconProvided && !trimmedIconCustomEmojiId) throw new Error("Telegram forum topic icon custom emoji ID is required");
	if (!trimmedName && !trimmedIconCustomEmojiId) throw new Error("Telegram forum topic update requires a name or iconCustomEmojiId");
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: parseTelegramTarget(rawTarget).chatId,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageThreadId = normalizeMessageId(messageThreadIdInput);
	const requestWithDiag = createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose
	});
	const payload = {
		...trimmedName ? { name: trimmedName } : {},
		...trimmedIconCustomEmojiId ? { icon_custom_emoji_id: trimmedIconCustomEmojiId } : {}
	};
	await requestWithDiag(() => api.editForumTopic(chatId, messageThreadId, payload), "editForumTopic");
	logVerbose(`[telegram] Edited forum topic ${messageThreadId} in chat ${chatId}`);
	return {
		ok: true,
		chatId,
		messageThreadId,
		...trimmedName ? { name: trimmedName } : {},
		...trimmedIconCustomEmojiId ? { iconCustomEmojiId: trimmedIconCustomEmojiId } : {}
	};
}
async function renameForumTopicTelegram(chatIdInput, messageThreadIdInput, name, opts = {}) {
	const result = await editForumTopicTelegram(chatIdInput, messageThreadIdInput, {
		...opts,
		name
	});
	return {
		ok: true,
		chatId: result.chatId,
		messageThreadId: result.messageThreadId,
		name: result.name ?? name.trim()
	};
}
async function editMessageReplyMarkupTelegram(chatIdInput, messageIdInput, buttons, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext({
		...opts,
		cfg: opts.cfg
	});
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = normalizeMessageId(messageIdInput);
	const requestWithDiag = createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose
	});
	const replyMarkup = buildInlineKeyboard(buttons) ?? { inline_keyboard: [] };
	try {
		await requestWithDiag(() => api.editMessageReplyMarkup(chatId, messageId, { reply_markup: replyMarkup }), "editMessageReplyMarkup", { shouldLog: (err) => !isTelegramMessageNotModifiedError(err) });
	} catch (err) {
		if (!isTelegramMessageNotModifiedError(err)) throw err;
	}
	logVerbose(`[telegram] Edited reply markup for message ${messageId} in chat ${chatId}`);
	return {
		ok: true,
		messageId: String(messageId),
		chatId
	};
}
async function editMessageTelegram(chatIdInput, messageIdInput, text, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext({
		...opts,
		cfg: opts.cfg
	});
	const rawTarget = String(chatIdInput);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: rawTarget,
		persistTarget: rawTarget,
		verbose: opts.verbose
	});
	const messageId = normalizeMessageId(messageIdInput);
	const requestWithDiag = createTelegramRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose,
		shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { allowMessageMatch: true }) || isTelegramServerError(err)
	});
	const requestWithEditShouldLog = (fn, label, shouldLog) => requestWithDiag(fn, label, shouldLog ? { shouldLog } : void 0);
	const htmlText = renderTelegramHtmlText(text, {
		textMode: opts.textMode ?? "markdown",
		tableMode: resolveMarkdownTableMode({
			cfg,
			channel: "telegram",
			accountId: account.accountId
		})
	});
	const shouldTouchButtons = opts.buttons !== void 0;
	const builtKeyboard = shouldTouchButtons ? buildInlineKeyboard(opts.buttons) : void 0;
	const replyMarkup = shouldTouchButtons ? builtKeyboard ?? { inline_keyboard: [] } : void 0;
	const editParams = { parse_mode: "HTML" };
	if (opts.linkPreview === false) editParams.link_preview_options = { is_disabled: true };
	if (replyMarkup !== void 0) editParams.reply_markup = replyMarkup;
	const plainParams = {};
	if (opts.linkPreview === false) plainParams.link_preview_options = { is_disabled: true };
	if (replyMarkup !== void 0) plainParams.reply_markup = replyMarkup;
	try {
		await withTelegramHtmlParseFallback({
			label: "editMessage",
			verbose: opts.verbose,
			requestHtml: (retryLabel) => requestWithEditShouldLog(() => api.editMessageText(chatId, messageId, htmlText, editParams), retryLabel, (err) => !isTelegramMessageNotModifiedError(err)),
			requestPlain: (retryLabel) => requestWithEditShouldLog(() => Object.keys(plainParams).length > 0 ? api.editMessageText(chatId, messageId, text, plainParams) : api.editMessageText(chatId, messageId, text), retryLabel, (plainErr) => !isTelegramMessageNotModifiedError(plainErr))
		});
	} catch (err) {
		if (isTelegramMessageNotModifiedError(err)) {} else throw err;
	}
	logVerbose(`[telegram] Edited message ${messageId} in chat ${chatId}`);
	return {
		ok: true,
		messageId: String(messageId),
		chatId
	};
}
function inferFilename(kind) {
	switch (kind) {
		case "image": return "image.jpg";
		case "video": return "video.mp4";
		case "audio": return "audio.ogg";
		default: return "file.bin";
	}
}
/**
* Send a sticker to a Telegram chat by file_id.
* @param to - Chat ID or username (e.g., "123456789" or "@username")
* @param fileId - Telegram file_id of the sticker to send
* @param opts - Optional configuration
*/
async function sendStickerTelegram(to, fileId, opts = {}) {
	if (!fileId?.trim()) throw new Error("Telegram sticker file_id is required");
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const target = parseTelegramTarget(to);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: target.chatId,
		persistTarget: to,
		verbose: opts.verbose
	});
	const threadParams = buildTelegramThreadReplyParams({
		targetMessageThreadId: target.messageThreadId,
		messageThreadId: opts.messageThreadId,
		chatType: target.chatType,
		replyToMessageId: opts.replyToMessageId
	});
	const hasThreadParams = Object.keys(threadParams).length > 0;
	const requestWithChatNotFound = createRequestWithChatNotFound({
		requestWithDiag: createTelegramNonIdempotentRequestWithDiag({
			cfg,
			account,
			retry: opts.retry,
			verbose: opts.verbose,
			useApiErrorLogging: false
		}),
		chatId,
		input: to
	});
	const result = await withTelegramThreadFallback(hasThreadParams ? threadParams : void 0, "sticker", opts.verbose, async (effectiveParams, label) => requestWithChatNotFound(() => api.sendSticker(chatId, fileId.trim(), effectiveParams), label));
	const messageId = resolveTelegramMessageIdOrThrow(result, "sticker send");
	const resolvedChatId = String(result?.chat?.id ?? chatId);
	recordSentMessage(chatId, messageId);
	recordChannelActivity({
		channel: "telegram",
		accountId: account.accountId,
		direction: "outbound"
	});
	return {
		messageId: String(messageId),
		chatId: resolvedChatId
	};
}
/**
* Send a poll to a Telegram chat.
* @param to - Chat ID or username (e.g., "123456789" or "@username")
* @param poll - Poll input with question, options, maxSelections, and optional durationHours
* @param opts - Optional configuration
*/
async function sendPollTelegram(to, poll, opts = {}) {
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const target = parseTelegramTarget(to);
	const chatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: target.chatId,
		persistTarget: to,
		verbose: opts.verbose,
		gatewayClientScopes: opts.gatewayClientScopes
	});
	const normalizedPoll = normalizePollInput(poll, { maxOptions: 10 });
	const threadParams = buildTelegramThreadReplyParams({
		targetMessageThreadId: target.messageThreadId,
		messageThreadId: opts.messageThreadId,
		chatType: target.chatType,
		replyToMessageId: opts.replyToMessageId
	});
	const pollOptions = normalizedPoll.options;
	const requestWithChatNotFound = createRequestWithChatNotFound({
		requestWithDiag: createTelegramNonIdempotentRequestWithDiag({
			cfg,
			account,
			retry: opts.retry,
			verbose: opts.verbose
		}),
		chatId,
		input: to
	});
	const durationSeconds = normalizedPoll.durationSeconds;
	if (durationSeconds === void 0 && normalizedPoll.durationHours !== void 0) throw new Error("Telegram poll durationHours is not supported. Use durationSeconds (5-600) instead.");
	if (durationSeconds !== void 0 && (durationSeconds < 5 || durationSeconds > 600)) throw new Error("Telegram poll durationSeconds must be between 5 and 600");
	const result = await withTelegramThreadFallback({
		allows_multiple_answers: normalizedPoll.maxSelections > 1,
		is_anonymous: opts.isAnonymous ?? true,
		...durationSeconds !== void 0 ? { open_period: durationSeconds } : {},
		...Object.keys(threadParams).length > 0 ? threadParams : {},
		...opts.silent === true ? { disable_notification: true } : {}
	}, "poll", opts.verbose, async (effectiveParams, label) => requestWithChatNotFound(() => api.sendPoll(chatId, normalizedPoll.question, pollOptions, effectiveParams), label));
	const messageId = resolveTelegramMessageIdOrThrow(result, "poll send");
	const resolvedChatId = String(result?.chat?.id ?? chatId);
	const pollId = result?.poll?.id;
	recordSentMessage(chatId, messageId);
	recordChannelActivity({
		channel: "telegram",
		accountId: account.accountId,
		direction: "outbound"
	});
	return {
		messageId: String(messageId),
		chatId: resolvedChatId,
		pollId
	};
}
/**
* Create a forum topic in a Telegram supergroup.
* Requires the bot to have `can_manage_topics` permission.
*
* @param chatId - Supergroup chat ID
* @param name - Topic name (1-128 characters)
* @param opts - Optional configuration
*/
async function createForumTopicTelegram(chatId, name, opts = {}) {
	if (!name?.trim()) throw new Error("Forum topic name is required");
	const trimmedName = name.trim();
	if (trimmedName.length > 128) throw new Error("Forum topic name must be 128 characters or fewer");
	const { cfg, account, api } = resolveTelegramApiContext(opts);
	const normalizedChatId = await resolveAndPersistChatId({
		cfg,
		api,
		lookupTarget: parseTelegramTarget(chatId).chatId,
		persistTarget: chatId,
		verbose: opts.verbose
	});
	const requestWithDiag = createTelegramNonIdempotentRequestWithDiag({
		cfg,
		account,
		retry: opts.retry,
		verbose: opts.verbose
	});
	const extra = {};
	if (opts.iconColor != null) extra.icon_color = opts.iconColor;
	if (opts.iconCustomEmojiId?.trim()) extra.icon_custom_emoji_id = opts.iconCustomEmojiId.trim();
	const hasExtra = Object.keys(extra).length > 0;
	const result = await requestWithDiag(() => api.createForumTopic(normalizedChatId, trimmedName, hasExtra ? extra : void 0), "createForumTopic");
	const topicId = result.message_thread_id;
	recordChannelActivity({
		channel: "telegram",
		accountId: account.accountId,
		direction: "outbound"
	});
	return {
		topicId,
		name: result.name ?? trimmedName,
		chatId: normalizedChatId
	};
}
//#endregion
export { isTelegramPollingNetworkError as C, isTelegramClientRejection as S, wasSentByBot as _, editMessageTelegram as a, isRecoverableTelegramNetworkError as b, renameForumTopicTelegram as c, sendPollTelegram as d, sendStickerTelegram as f, recordSentMessage as g, resolveTelegramVoiceSend as h, editMessageReplyMarkupTelegram as i, resetTelegramClientOptionsCacheForTests as l, unpinMessageTelegram as m, deleteMessageTelegram as n, pinMessageTelegram as o, sendTypingTelegram as p, editForumTopicTelegram as r, reactMessageTelegram as s, createForumTopicTelegram as t, sendMessageTelegram as u, buildInlineKeyboard as v, tagTelegramNetworkError as w, isSafeToRetrySendError as x, splitTelegramCaption as y };
