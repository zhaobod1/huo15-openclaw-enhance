import { t as resolveNodeRequireFromMeta } from "./node-require-BgDD9bTi.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { a as parseApiErrorPayload, i as parseApiErrorInfo, n as formatRawAssistantErrorForUi, r as isCloudflareOrHtmlErrorPage, t as extractLeadingHttpStatus } from "./assistant-error-format-DgGPnCfe.js";
import { t as formatSandboxToolPolicyBlockedMessage } from "./runtime-status-BNMb0UiT.js";
//#region src/agents/exec-approval-result.ts
const EXEC_DENIED_RE = /^exec denied \(([^)]*)\):(?:\s*([\s\S]*))?$/i;
const EXEC_FINISHED_RE = /^exec finished \(([^)]*)\)(?:\n([\s\S]*))?$/i;
const EXEC_COMPLETED_RE = /^exec completed:\s*([\s\S]*)$/i;
function parseExecApprovalResultText(resultText) {
	const raw = resultText.trim();
	if (!raw) return {
		kind: "other",
		raw
	};
	const deniedMatch = EXEC_DENIED_RE.exec(raw);
	if (deniedMatch) return {
		kind: "denied",
		raw,
		metadata: deniedMatch[1]?.trim() ?? "",
		body: deniedMatch[2]?.trim() ?? ""
	};
	const finishedMatch = EXEC_FINISHED_RE.exec(raw);
	if (finishedMatch) return {
		kind: "finished",
		raw,
		metadata: finishedMatch[1]?.trim() ?? "",
		body: finishedMatch[2]?.trim() ?? ""
	};
	const completedMatch = EXEC_COMPLETED_RE.exec(raw);
	if (completedMatch) return {
		kind: "completed",
		raw,
		body: completedMatch[1]?.trim() ?? ""
	};
	return {
		kind: "other",
		raw
	};
}
function isExecDeniedResultText(resultText) {
	return parseExecApprovalResultText(resultText).kind === "denied";
}
function formatExecDeniedUserMessage(resultText) {
	const parsed = parseExecApprovalResultText(resultText);
	if (parsed.kind !== "denied") return null;
	const metadata = parsed.metadata.toLowerCase();
	if (metadata.includes("approval-timeout")) return "Command did not run: approval timed out.";
	if (metadata.includes("user-denied")) return "Command did not run: approval was denied.";
	if (metadata.includes("allowlist-miss")) return "Command did not run: approval is required.";
	if (metadata.includes("approval-request-failed")) return "Command did not run: approval request failed.";
	if (metadata.includes("spawn-failed") || metadata.includes("invoke-failed")) return "Command did not run.";
	return "Command did not run.";
}
//#endregion
//#region src/agents/internal-runtime-context.ts
const INTERNAL_RUNTIME_CONTEXT_BEGIN = "<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>";
const INTERNAL_RUNTIME_CONTEXT_END = "<<<END_OPENCLAW_INTERNAL_CONTEXT>>>";
const ESCAPED_INTERNAL_RUNTIME_CONTEXT_BEGIN = "[[OPENCLAW_INTERNAL_CONTEXT_BEGIN]]";
const ESCAPED_INTERNAL_RUNTIME_CONTEXT_END = "[[OPENCLAW_INTERNAL_CONTEXT_END]]";
const LEGACY_INTERNAL_CONTEXT_HEADER = [
	"OpenClaw runtime context (internal):",
	"This context is runtime-generated, not user-authored. Keep internal details private.",
	""
].join("\n") + "\n";
const LEGACY_INTERNAL_EVENT_MARKER = "[Internal task completion event]";
const LEGACY_INTERNAL_EVENT_SEPARATOR = "\n\n---\n\n";
const LEGACY_UNTRUSTED_RESULT_BEGIN = "<<<BEGIN_UNTRUSTED_CHILD_RESULT>>>";
const LEGACY_UNTRUSTED_RESULT_END = "<<<END_UNTRUSTED_CHILD_RESULT>>>";
function escapeInternalRuntimeContextDelimiters(value) {
	return value.replaceAll(INTERNAL_RUNTIME_CONTEXT_BEGIN, ESCAPED_INTERNAL_RUNTIME_CONTEXT_BEGIN).replaceAll(INTERNAL_RUNTIME_CONTEXT_END, ESCAPED_INTERNAL_RUNTIME_CONTEXT_END);
}
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findDelimitedTokenIndex(text, token, from) {
	const tokenRe = new RegExp(`(?:^|\\r?\\n)${escapeRegExp(token)}(?=\\r?\\n|$)`, "g");
	tokenRe.lastIndex = Math.max(0, from);
	const match = tokenRe.exec(text);
	if (!match) return -1;
	const prefixLength = match[0].length - token.length;
	return match.index + prefixLength;
}
function stripDelimitedBlock(text, begin, end) {
	let next = text;
	for (;;) {
		const start = findDelimitedTokenIndex(next, begin, 0);
		if (start === -1) return next;
		let cursor = start + begin.length;
		let depth = 1;
		let finish = -1;
		while (depth > 0) {
			const nextBegin = findDelimitedTokenIndex(next, begin, cursor);
			const nextEnd = findDelimitedTokenIndex(next, end, cursor);
			if (nextEnd === -1) break;
			if (nextBegin !== -1 && nextBegin < nextEnd) {
				depth += 1;
				cursor = nextBegin + begin.length;
				continue;
			}
			depth -= 1;
			finish = nextEnd;
			cursor = nextEnd + end.length;
		}
		const before = next.slice(0, start).trimEnd();
		if (finish === -1 || depth !== 0) return before;
		const after = next.slice(finish + end.length).trimStart();
		next = before && after ? `${before}\n\n${after}` : `${before}${after}`;
	}
}
function findLegacyInternalEventEnd(text, start) {
	if (!text.startsWith(LEGACY_INTERNAL_EVENT_MARKER, start)) return null;
	const resultBegin = text.indexOf(LEGACY_UNTRUSTED_RESULT_BEGIN, start + 32);
	if (resultBegin === -1) return null;
	const resultEnd = text.indexOf(LEGACY_UNTRUSTED_RESULT_END, resultBegin + 34);
	if (resultEnd === -1) return null;
	const actionIndex = text.indexOf("\n\nAction:\n", resultEnd + 32);
	if (actionIndex === -1) return null;
	const afterAction = actionIndex + 10;
	const nextEvent = text.indexOf(`${LEGACY_INTERNAL_EVENT_SEPARATOR}${LEGACY_INTERNAL_EVENT_MARKER}`, afterAction);
	if (nextEvent !== -1) return nextEvent;
	const nextParagraph = text.indexOf("\n\n", afterAction);
	return nextParagraph === -1 ? text.length : nextParagraph;
}
function stripLegacyInternalRuntimeContext(text) {
	let next = text;
	let searchFrom = 0;
	for (;;) {
		const headerStart = next.indexOf(LEGACY_INTERNAL_CONTEXT_HEADER, searchFrom);
		if (headerStart === -1) return next;
		const eventStart = headerStart + LEGACY_INTERNAL_CONTEXT_HEADER.length;
		if (!next.startsWith(LEGACY_INTERNAL_EVENT_MARKER, eventStart)) {
			searchFrom = eventStart;
			continue;
		}
		let blockEnd = findLegacyInternalEventEnd(next, eventStart);
		if (blockEnd == null) {
			const nextParagraph = next.indexOf("\n\n", eventStart + 32);
			blockEnd = nextParagraph === -1 ? next.length : nextParagraph;
		} else while (next.startsWith(`${LEGACY_INTERNAL_EVENT_SEPARATOR}${LEGACY_INTERNAL_EVENT_MARKER}`, blockEnd)) {
			const nextEventStart = blockEnd + 7;
			const nextEventEnd = findLegacyInternalEventEnd(next, nextEventStart);
			if (nextEventEnd == null) break;
			blockEnd = nextEventEnd;
		}
		const before = next.slice(0, headerStart).trimEnd();
		const after = next.slice(blockEnd).trimStart();
		next = before && after ? `${before}\n\n${after}` : `${before}${after}`;
		searchFrom = Math.max(0, before.length - 1);
	}
}
function stripInternalRuntimeContext(text) {
	if (!text) return text;
	return stripLegacyInternalRuntimeContext(stripDelimitedBlock(text, INTERNAL_RUNTIME_CONTEXT_BEGIN, INTERNAL_RUNTIME_CONTEXT_END));
}
function hasInternalRuntimeContext(text) {
	if (!text) return false;
	return findDelimitedTokenIndex(text, "<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>", 0) !== -1 || text.includes(LEGACY_INTERNAL_CONTEXT_HEADER);
}
//#endregion
//#region src/agents/stable-stringify.ts
function stableStringify(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
	if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
	const record = value;
	return `{${Object.keys(record).toSorted().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
//#endregion
//#region src/agents/pi-embedded-helpers/failover-matches.ts
const PERIODIC_USAGE_LIMIT_RE = /\b(?:daily|weekly|monthly)(?:\/(?:daily|weekly|monthly))* (?:usage )?limit(?:s)?(?: (?:exhausted|reached|exceeded))?\b/i;
const HIGH_CONFIDENCE_AUTH_PERMANENT_PATTERNS = [
	/api[_ ]?key[_ ]?(?:revoked|deactivated|deleted)/i,
	"key has been disabled",
	"key has been revoked",
	"account has been deactivated",
	"not allowed for this organization"
];
const AMBIGUOUS_AUTH_ERROR_PATTERNS = [
	/invalid[_ ]?api[_ ]?key/,
	/could not (?:authenticate|validate).*(?:api[_ ]?key|credentials)/i,
	"permission_error"
];
const COMMON_AUTH_ERROR_PATTERNS = [
	"incorrect api key",
	"invalid token",
	"authentication",
	"re-authenticate",
	"oauth token refresh failed",
	"unauthorized",
	"forbidden",
	"access denied",
	"insufficient permissions",
	"insufficient permission",
	/missing scopes?:/i,
	"expired",
	"token has expired",
	/\b401\b/,
	/\b403\b/,
	"no credentials found",
	"no api key found",
	/\bfailed to (?:extract|parse|validate|decode)\b.*\btoken\b/
];
const ERROR_PATTERNS = {
	rateLimit: [
		/rate[_ ]limit|too many requests|429/,
		/too many (?:concurrent )?requests/i,
		/throttling(?:exception)?/i,
		"model_cooldown",
		"exceeded your current quota",
		"resource has been exhausted",
		"quota exceeded",
		"resource_exhausted",
		"throttlingexception",
		"throttling_exception",
		"throttled",
		"throttling",
		"usage limit",
		/\btpm\b/i,
		"tokens per minute",
		"tokens per day"
	],
	overloaded: [
		/overloaded_error|"type"\s*:\s*"overloaded_error"/i,
		"overloaded",
		/service[_ ]unavailable.*(?:overload|capacity|high[_ ]demand)|(?:overload|capacity|high[_ ]demand).*service[_ ]unavailable/i,
		"high demand"
	],
	serverError: [
		"an error occurred while processing",
		"internal server error",
		"internal_error",
		"server_error",
		"service temporarily unavailable",
		"service_unavailable",
		"bad gateway",
		"gateway timeout",
		"upstream error",
		"upstream connect error",
		"connection reset"
	],
	timeout: [
		"timeout",
		"timed out",
		"service unavailable",
		"deadline exceeded",
		"context deadline exceeded",
		"connection error",
		"network error",
		"network request failed",
		"fetch failed",
		"socket hang up",
		/\beconn(?:refused|reset|aborted)\b/i,
		/\benetunreach\b/i,
		/\behostunreach\b/i,
		/\behostdown\b/i,
		/\benetreset\b/i,
		/\betimedout\b/i,
		/\besockettimedout\b/i,
		/\bepipe\b/i,
		/\benotfound\b/i,
		/\beai_again\b/i,
		/without sending (?:any )?chunks?/i,
		/\bstop reason:\s*(?:abort|error|malformed_response|network_error)\b/i,
		/\breason:\s*(?:abort|error|malformed_response|network_error)\b/i,
		/\bunhandled stop reason:\s*(?:abort|error|malformed_response|network_error)\b/i,
		/\boperation was aborted\b/i,
		/\bstream (?:was )?(?:closed|aborted)\b/i
	],
	billing: [
		/["']?(?:status|code)["']?\s*[:=]\s*402\b|\bhttp\s*402\b|\berror(?:\s+code)?\s*[:=]?\s*402\b|\b(?:got|returned|received)\s+(?:a\s+)?402\b|^\s*402\s+payment/i,
		"payment required",
		"insufficient credits",
		/insufficient[_ ]quota/i,
		"credit balance",
		"plans & billing",
		"insufficient balance",
		"insufficient usd or diem balance",
		/requires?\s+more\s+credits/i
	],
	authPermanent: HIGH_CONFIDENCE_AUTH_PERMANENT_PATTERNS,
	auth: [...AMBIGUOUS_AUTH_ERROR_PATTERNS, ...COMMON_AUTH_ERROR_PATTERNS],
	format: [
		"string should match pattern",
		"tool_use.id",
		"tool_use_id",
		"messages.1.content.1.tool_use.id",
		"invalid request format",
		/tool call id was.*must be/i
	]
};
const BILLING_ERROR_HEAD_RE = /^(?:error[:\s-]+)?billing(?:\s+error)?(?:[:\s-]+|$)|^(?:error[:\s-]+)?(?:credit balance|insufficient credits?|payment required|http\s*402\b)/i;
const BILLING_ERROR_HARD_402_RE = /["']?(?:status|code)["']?\s*[:=]\s*402\b|\bhttp\s*402\b|\berror(?:\s+code)?\s*[:=]?\s*402\b|^\s*402\s+payment/i;
const BILLING_ERROR_MAX_LENGTH = 512;
function matchesErrorPatterns(raw, patterns) {
	if (!raw) return false;
	const value = raw.toLowerCase();
	return patterns.some((pattern) => pattern instanceof RegExp ? pattern.test(value) : value.includes(pattern));
}
function matchesErrorPatternGroups(raw, groups) {
	return groups.some((patterns) => matchesErrorPatterns(raw, patterns));
}
function matchesFormatErrorPattern(raw) {
	return matchesErrorPatterns(raw, ERROR_PATTERNS.format);
}
function isRateLimitErrorMessage(raw) {
	return matchesErrorPatterns(raw, ERROR_PATTERNS.rateLimit);
}
function isTimeoutErrorMessage(raw) {
	return matchesErrorPatterns(raw, ERROR_PATTERNS.timeout);
}
function isPeriodicUsageLimitErrorMessage(raw) {
	return PERIODIC_USAGE_LIMIT_RE.test(raw);
}
function isBillingErrorMessage(raw) {
	const value = raw.toLowerCase();
	if (!value) return false;
	if (raw.length > BILLING_ERROR_MAX_LENGTH) return BILLING_ERROR_HARD_402_RE.test(value);
	if (matchesErrorPatterns(value, ERROR_PATTERNS.billing)) return true;
	if (!BILLING_ERROR_HEAD_RE.test(raw)) return false;
	return value.includes("upgrade") || value.includes("credits") || value.includes("payment") || value.includes("plan");
}
function isAuthPermanentErrorMessage(raw) {
	return matchesErrorPatternGroups(raw, [HIGH_CONFIDENCE_AUTH_PERMANENT_PATTERNS]);
}
function isAuthErrorMessage(raw) {
	return matchesErrorPatternGroups(raw, [AMBIGUOUS_AUTH_ERROR_PATTERNS, COMMON_AUTH_ERROR_PATTERNS]);
}
function isOverloadedErrorMessage(raw) {
	return matchesErrorPatterns(raw, ERROR_PATTERNS.overloaded);
}
function isServerErrorMessage(raw) {
	return matchesErrorPatterns(raw, ERROR_PATTERNS.serverError);
}
//#endregion
//#region src/agents/pi-embedded-helpers/provider-error-patterns.ts
/**
* Provider-owned error-pattern dispatch plus legacy fallback patterns.
*
* Most provider-specific failover classification now lives on provider-plugin
* hooks. This module keeps only fallback patterns for providers that do not
* yet ship a dedicated provider plugin hook surface.
*/
/**
* Provider-specific context overflow patterns not covered by the generic
* `isContextOverflowError()` in errors.ts. Called from `isContextOverflowError()`
* to catch provider-specific wording that the generic regex misses.
*/
const PROVIDER_CONTEXT_OVERFLOW_PATTERNS = [
	/\binput token count exceeds the maximum number of input tokens\b/i,
	/\binput is too long for this model\b/i,
	/\binput exceeds the maximum number of tokens\b/i,
	/\bollama error:\s*context length exceeded(?:,\s*too many tokens)?\b/i,
	/\btotal tokens?.*exceeds? (?:the )?(?:model(?:'s)? )?(?:max|maximum|limit)/i,
	/\binput (?:is )?too long for (?:the )?model\b/i
];
/**
* Provider-specific patterns that map to specific failover reasons.
* These handle cases where the generic classifiers in failover-matches.ts
* produce wrong results for specific providers.
*/
const PROVIDER_SPECIFIC_PATTERNS = [
	{
		test: /\bthrottlingexception\b/i,
		reason: "rate_limit"
	},
	{
		test: /\bconcurrency limit(?: has been)? reached\b/i,
		reason: "rate_limit"
	},
	{
		test: /\bworkers_ai\b.*\bquota limit exceeded\b/i,
		reason: "rate_limit"
	},
	{
		test: /\bmodelnotreadyexception\b/i,
		reason: "overloaded"
	},
	{
		test: /model(?:_is)?_deactivated|model has been deactivated/i,
		reason: "model_not_found"
	}
];
const requireProviderRuntime = resolveNodeRequireFromMeta(import.meta.url);
let cachedProviderRuntimeHooks;
const PROVIDER_CONTEXT_OVERFLOW_SIGNAL_RE = /\b(?:context|window|prompt|token|tokens|input|request|model)\b/i;
const PROVIDER_CONTEXT_OVERFLOW_ACTION_RE = /\b(?:too\s+(?:large|long|many)|exceed(?:s|ed|ing)?|overflow|limit|maximum|max)\b/i;
function resolveProviderRuntimeHooks() {
	if (cachedProviderRuntimeHooks !== void 0) return cachedProviderRuntimeHooks;
	if (!requireProviderRuntime) {
		cachedProviderRuntimeHooks = null;
		return cachedProviderRuntimeHooks;
	}
	try {
		const loaded = requireProviderRuntime("../../plugins/provider-runtime.js");
		cachedProviderRuntimeHooks = {
			classifyProviderFailoverReasonWithPlugin: ({ context }) => loaded.classifyProviderFailoverReasonWithPlugin({ context }) ?? null,
			matchesProviderContextOverflowWithPlugin: loaded.matchesProviderContextOverflowWithPlugin
		};
	} catch {
		cachedProviderRuntimeHooks = null;
	}
	return cachedProviderRuntimeHooks ?? null;
}
function looksLikeProviderContextOverflowCandidate(errorMessage) {
	return PROVIDER_CONTEXT_OVERFLOW_SIGNAL_RE.test(errorMessage) && PROVIDER_CONTEXT_OVERFLOW_ACTION_RE.test(errorMessage);
}
/**
* Check if an error message matches any provider-specific context overflow pattern.
* Called from `isContextOverflowError()` to catch provider-specific wording.
*/
function matchesProviderContextOverflow(errorMessage) {
	if (!looksLikeProviderContextOverflowCandidate(errorMessage)) return false;
	return resolveProviderRuntimeHooks()?.matchesProviderContextOverflowWithPlugin({ context: { errorMessage } }) === true || PROVIDER_CONTEXT_OVERFLOW_PATTERNS.some((pattern) => pattern.test(errorMessage));
}
/**
* Try to classify an error using provider-specific patterns.
* Returns null if no provider-specific pattern matches (fall through to generic classification).
*/
function classifyProviderSpecificError(errorMessage) {
	const pluginReason = resolveProviderRuntimeHooks()?.classifyProviderFailoverReasonWithPlugin({ context: { errorMessage } }) ?? null;
	if (pluginReason) return pluginReason;
	for (const pattern of PROVIDER_SPECIFIC_PATTERNS) if (pattern.test.test(errorMessage)) return pattern.reason;
	return null;
}
//#endregion
//#region src/agents/pi-embedded-helpers/errors.ts
const log = createSubsystemLogger("errors");
function formatBillingErrorMessage(provider, model) {
	const providerName = provider?.trim();
	const modelName = model?.trim();
	const providerLabel = providerName && modelName ? `${providerName} (${modelName})` : providerName || void 0;
	if (providerLabel) return `⚠️ ${providerLabel} returned a billing error — your API key has run out of credits or has an insufficient balance. Check your ${providerName} billing dashboard and top up or switch to a different API key.`;
	return "⚠️ API provider returned a billing error — your API key has run out of credits or has an insufficient balance. Check your provider's billing dashboard and top up or switch to a different API key.";
}
const BILLING_ERROR_USER_MESSAGE = formatBillingErrorMessage();
const RATE_LIMIT_ERROR_USER_MESSAGE = "⚠️ API rate limit reached. Please try again later.";
const OVERLOADED_ERROR_USER_MESSAGE = "The AI service is temporarily overloaded. Please try again in a moment.";
/**
* Check whether the raw rate-limit error contains provider-specific details
* worth surfacing (e.g. reset times, plan names, quota info).  Bare status
* codes like "429" or generic phrases like "rate limit exceeded" are not
* considered specific enough.
*/
const RATE_LIMIT_SPECIFIC_HINT_RE = /\bmin(ute)?s?\b|\bhours?\b|\bseconds?\b|\btry again in\b|\breset\b|\bplan\b|\bquota\b/i;
function extractProviderRateLimitMessage(raw) {
	const withoutPrefix = raw.replace(ERROR_PREFIX_RE, "").trim();
	const candidate = (parseApiErrorInfo(raw) ?? parseApiErrorInfo(withoutPrefix))?.message ?? (extractLeadingHttpStatus(withoutPrefix)?.rest || withoutPrefix);
	if (!candidate || !RATE_LIMIT_SPECIFIC_HINT_RE.test(candidate)) return;
	if (isCloudflareOrHtmlErrorPage(withoutPrefix)) return;
	const trimmed = candidate.trim();
	if (trimmed.length > 300 || trimmed.startsWith("{") || /^(?:<!doctype\s+html\b|<html\b)/i.test(trimmed)) return;
	return `⚠️ ${trimmed}`;
}
function formatRateLimitOrOverloadedErrorCopy(raw) {
	if (isRateLimitErrorMessage(raw)) return extractProviderRateLimitMessage(raw) ?? RATE_LIMIT_ERROR_USER_MESSAGE;
	if (isOverloadedErrorMessage(raw)) return OVERLOADED_ERROR_USER_MESSAGE;
}
function formatTransportErrorCopy(raw) {
	if (!raw) return;
	const lower = raw.toLowerCase();
	if (/\beconnrefused\b/i.test(raw) || lower.includes("connection refused") || lower.includes("actively refused")) return "LLM request failed: connection refused by the provider endpoint.";
	if (/\beconnreset\b|\beconnaborted\b|\benetreset\b|\bepipe\b/i.test(raw) || lower.includes("socket hang up") || lower.includes("connection reset") || lower.includes("connection aborted")) return "LLM request failed: network connection was interrupted.";
	if (/\benotfound\b|\beai_again\b/i.test(raw) || lower.includes("getaddrinfo") || lower.includes("no such host") || lower.includes("dns")) return "LLM request failed: DNS lookup for the provider endpoint failed.";
	if (/\benetunreach\b|\behostunreach\b|\behostdown\b/i.test(raw) || lower.includes("network is unreachable") || lower.includes("host is unreachable")) return "LLM request failed: the provider endpoint is unreachable from this host.";
	if (lower.includes("fetch failed") || lower.includes("connection error") || lower.includes("network request failed")) return "LLM request failed: network connection error.";
}
function formatDiskSpaceErrorCopy(raw) {
	if (!raw) return;
	const lower = raw.toLowerCase();
	if (/\benospc\b/i.test(raw) || lower.includes("no space left on device") || lower.includes("disk full")) return "OpenClaw could not write local session data because the disk is full. Free some disk space and try again.";
}
function isReasoningConstraintErrorMessage(raw) {
	if (!raw) return false;
	const lower = raw.toLowerCase();
	return lower.includes("reasoning is mandatory") || lower.includes("reasoning is required") || lower.includes("requires reasoning") || lower.includes("reasoning") && lower.includes("cannot be disabled");
}
function isInvalidStreamingEventOrderError(raw) {
	if (!raw) return false;
	const lower = raw.toLowerCase();
	return lower.includes("unexpected event order") && lower.includes("message_start") && lower.includes("message_stop");
}
function hasRateLimitTpmHint(raw) {
	const lower = raw.toLowerCase();
	return /\btpm\b/i.test(lower) || lower.includes("tokens per minute");
}
function isContextOverflowError(errorMessage) {
	if (!errorMessage) return false;
	const lower = errorMessage.toLowerCase();
	if (hasRateLimitTpmHint(errorMessage)) return false;
	if (isReasoningConstraintErrorMessage(errorMessage)) return false;
	const hasRequestSizeExceeds = lower.includes("request size exceeds");
	const hasContextWindow = lower.includes("context window") || lower.includes("context length") || lower.includes("maximum context length");
	return lower.includes("request_too_large") || lower.includes("invalid_argument") && lower.includes("maximum number of tokens") || lower.includes("request exceeds the maximum size") || lower.includes("context length exceeded") || lower.includes("maximum context length") || lower.includes("prompt is too long") || lower.includes("prompt too long") || lower.includes("exceeds model context window") || lower.includes("model token limit") || lower.includes("input exceeds") && lower.includes("maximum number of tokens") || hasRequestSizeExceeds && hasContextWindow || lower.includes("context overflow:") || lower.includes("exceed context limit") || lower.includes("exceeds the model's maximum context") || lower.includes("max_tokens") && lower.includes("exceed") && lower.includes("context") || lower.includes("input length") && lower.includes("exceed") && lower.includes("context") || lower.includes("413") && lower.includes("too large") || lower.includes("context_window_exceeded") || errorMessage.includes("上下文过长") || errorMessage.includes("上下文超出") || errorMessage.includes("上下文长度超") || errorMessage.includes("超出最大上下文") || errorMessage.includes("请压缩上下文") || matchesProviderContextOverflow(errorMessage);
}
const CONTEXT_WINDOW_TOO_SMALL_RE = /context window.*(too small|minimum is)/i;
const CONTEXT_OVERFLOW_HINT_RE = /context.*overflow|context window.*(too (?:large|long)|exceed|over|limit|max(?:imum)?|requested|sent|tokens)|prompt.*(too (?:large|long)|exceed|over|limit|max(?:imum)?)|(?:request|input).*(?:context|window|length|token).*(too (?:large|long)|exceed|over|limit|max(?:imum)?)/i;
const RATE_LIMIT_HINT_RE = /rate limit|too many requests|requests per (?:minute|hour|day)|quota|throttl|429\b|tokens per day/i;
function isLikelyContextOverflowError(errorMessage) {
	if (!errorMessage) return false;
	if (hasRateLimitTpmHint(errorMessage)) return false;
	if (isReasoningConstraintErrorMessage(errorMessage)) return false;
	if (isBillingErrorMessage(errorMessage)) return false;
	if (CONTEXT_WINDOW_TOO_SMALL_RE.test(errorMessage)) return false;
	if (isRateLimitErrorMessage(errorMessage)) return false;
	if (isContextOverflowError(errorMessage)) return true;
	if (RATE_LIMIT_HINT_RE.test(errorMessage)) return false;
	return CONTEXT_OVERFLOW_HINT_RE.test(errorMessage);
}
function isCompactionFailureError(errorMessage) {
	if (!errorMessage) return false;
	const lower = errorMessage.toLowerCase();
	if (!(lower.includes("summarization failed") || lower.includes("auto-compaction") || lower.includes("compaction failed") || lower.includes("compaction"))) return false;
	if (isLikelyContextOverflowError(errorMessage)) return true;
	return lower.includes("context overflow");
}
const OBSERVED_OVERFLOW_TOKEN_PATTERNS = [
	/prompt is too long:\s*([\d,]+)\s+tokens\s*>\s*[\d,]+\s+maximum/i,
	/requested\s+([\d,]+)\s+tokens/i,
	/resulted in\s+([\d,]+)\s+tokens/i
];
function extractObservedOverflowTokenCount(errorMessage) {
	if (!errorMessage) return;
	for (const pattern of OBSERVED_OVERFLOW_TOKEN_PATTERNS) {
		const rawCount = errorMessage.match(pattern)?.[1]?.replaceAll(",", "");
		if (!rawCount) continue;
		const parsed = Number(rawCount);
		if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
	}
}
const FINAL_TAG_RE = /<\s*\/?\s*final\s*>/gi;
const ERROR_PREFIX_RE = /^(?:error|(?:[a-z][\w-]*\s+)?api\s*error|openai\s*error|anthropic\s*error|gateway\s*error|codex\s*error|request failed|failed|exception)(?:\s+\d{3})?[:\s-]+/i;
const CONTEXT_OVERFLOW_ERROR_HEAD_RE = /^(?:context overflow:|request_too_large\b|request size exceeds\b|request exceeds the maximum size\b|context length exceeded\b|maximum context length\b|prompt is too long\b|exceeds model context window\b)/i;
const TRANSIENT_HTTP_ERROR_CODES = new Set([
	499,
	500,
	502,
	503,
	504,
	521,
	522,
	523,
	524,
	529
]);
const HTTP_ERROR_HINTS = [
	"error",
	"bad request",
	"not found",
	"unauthorized",
	"forbidden",
	"internal server",
	"service unavailable",
	"gateway",
	"rate limit",
	"overloaded",
	"timeout",
	"timed out",
	"invalid",
	"too many requests",
	"permission"
];
const BILLING_402_HINTS = [
	"insufficient credits",
	"insufficient quota",
	"credit balance",
	"insufficient balance",
	"plans & billing",
	"add more credits",
	"top up"
];
const BILLING_402_PLAN_HINTS = [
	"upgrade your plan",
	"upgrade plan",
	"current plan",
	"subscription"
];
const PERIODIC_402_HINTS = [
	"daily",
	"weekly",
	"monthly"
];
const RETRYABLE_402_RETRY_HINTS = [
	"try again",
	"retry",
	"temporary",
	"cooldown"
];
const RETRYABLE_402_LIMIT_HINTS = [
	"usage limit",
	"rate limit",
	"organization usage"
];
const RETRYABLE_402_SCOPED_HINTS = ["organization", "workspace"];
const RETRYABLE_402_SCOPED_RESULT_HINTS = [
	"billing period",
	"exceeded",
	"reached",
	"exhausted"
];
const RAW_402_MARKER_RE = /["']?(?:status|code)["']?\s*[:=]\s*402\b|\bhttp\s*402\b|\berror(?:\s+code)?\s*[:=]?\s*402\b|\b(?:got|returned|received)\s+(?:a\s+)?402\b|^\s*402\s+payment required\b|^\s*402\s+.*used up your points\b/i;
const LEADING_402_WRAPPER_RE = /^(?:error[:\s-]+)?(?:(?:http\s*)?402(?:\s+payment required)?|payment required)(?:[:\s-]+|$)/i;
const TIMEOUT_ERROR_CODES = new Set([
	"ETIMEDOUT",
	"ESOCKETTIMEDOUT",
	"ECONNRESET",
	"ECONNABORTED",
	"ECONNREFUSED",
	"ENETUNREACH",
	"EHOSTUNREACH",
	"EHOSTDOWN",
	"ENETRESET",
	"EPIPE",
	"EAI_AGAIN"
]);
function includesAnyHint(text, hints) {
	return hints.some((hint) => text.includes(hint));
}
function hasExplicit402BillingSignal(text) {
	return includesAnyHint(text, BILLING_402_HINTS) || includesAnyHint(text, BILLING_402_PLAN_HINTS) && text.includes("limit") || text.includes("billing hard limit") || text.includes("hard limit reached") || text.includes("maximum allowed") && text.includes("limit");
}
function hasQuotaRefreshWindowSignal(text) {
	return text.includes("subscription quota limit") && (text.includes("automatic quota refresh") || text.includes("rolling time window"));
}
function hasRetryable402TransientSignal(text) {
	const hasPeriodicHint = includesAnyHint(text, PERIODIC_402_HINTS);
	const hasSpendLimit = text.includes("spend limit") || text.includes("spending limit");
	const hasScopedHint = includesAnyHint(text, RETRYABLE_402_SCOPED_HINTS);
	return includesAnyHint(text, RETRYABLE_402_RETRY_HINTS) && includesAnyHint(text, RETRYABLE_402_LIMIT_HINTS) || hasPeriodicHint && (text.includes("usage limit") || hasSpendLimit) || hasPeriodicHint && text.includes("limit") && text.includes("reset") || hasScopedHint && text.includes("limit") && (hasSpendLimit || includesAnyHint(text, RETRYABLE_402_SCOPED_RESULT_HINTS));
}
function normalize402Message(raw) {
	return raw.trim().toLowerCase().replace(LEADING_402_WRAPPER_RE, "").trim();
}
function classify402Message(message) {
	const normalized = normalize402Message(message);
	if (!normalized) return "billing";
	if (hasQuotaRefreshWindowSignal(normalized)) return "rate_limit";
	if (hasExplicit402BillingSignal(normalized)) return "billing";
	if (isRateLimitErrorMessage(normalized)) return "rate_limit";
	if (hasRetryable402TransientSignal(normalized)) return "rate_limit";
	return "billing";
}
function classifyFailoverReasonFrom402Text(raw) {
	if (!RAW_402_MARKER_RE.test(raw)) return null;
	return classify402Message(raw);
}
function toReasonClassification(reason) {
	return {
		kind: "reason",
		reason
	};
}
function failoverReasonFromClassification(classification) {
	return classification?.kind === "reason" ? classification.reason : null;
}
function isTransientHttpError(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return false;
	const status = extractLeadingHttpStatus(trimmed);
	if (!status) return false;
	return TRANSIENT_HTTP_ERROR_CODES.has(status.code);
}
function classifyFailoverClassificationFromHttpStatus(status, message, messageClassification) {
	const messageReason = failoverReasonFromClassification(messageClassification);
	if (typeof status !== "number" || !Number.isFinite(status)) return null;
	if (status === 402) return toReasonClassification(message ? classify402Message(message) : "billing");
	if (status === 429) return toReasonClassification("rate_limit");
	if (status === 401 || status === 403) {
		if (message && isAuthPermanentErrorMessage(message)) return toReasonClassification("auth_permanent");
		if (messageReason === "billing") return toReasonClassification("billing");
		return toReasonClassification("auth");
	}
	if (status === 408) return toReasonClassification("timeout");
	if (status === 410) {
		if (messageReason === "session_expired" || messageReason === "billing" || messageReason === "auth_permanent" || messageReason === "auth") return messageClassification;
		return toReasonClassification("timeout");
	}
	if (status === 503) {
		if (messageReason === "overloaded") return messageClassification;
		return toReasonClassification("timeout");
	}
	if (status === 499) {
		if (messageReason === "overloaded") return messageClassification;
		return toReasonClassification("timeout");
	}
	if (status === 500 || status === 502 || status === 504) return toReasonClassification("timeout");
	if (status === 529) return toReasonClassification("overloaded");
	if (status === 400 || status === 422) {
		if (messageClassification) return messageClassification;
		return toReasonClassification("format");
	}
	return null;
}
function classifyFailoverReasonFromCode(raw) {
	const normalized = raw?.trim().toUpperCase();
	if (!normalized) return null;
	switch (normalized) {
		case "RESOURCE_EXHAUSTED":
		case "RATE_LIMIT":
		case "RATE_LIMITED":
		case "RATE_LIMIT_EXCEEDED":
		case "TOO_MANY_REQUESTS":
		case "THROTTLED":
		case "THROTTLING":
		case "THROTTLINGEXCEPTION":
		case "THROTTLING_EXCEPTION": return "rate_limit";
		case "OVERLOADED":
		case "OVERLOADED_ERROR": return "overloaded";
		default: return TIMEOUT_ERROR_CODES.has(normalized) ? "timeout" : null;
	}
}
function isProvider(provider, match) {
	const normalized = provider?.trim().toLowerCase();
	return Boolean(normalized && normalized.includes(match));
}
function isAnthropicGenericUnknownError(raw, provider) {
	return isProvider(provider, "anthropic") && raw.toLowerCase().includes("an unknown error occurred");
}
function isOpenRouterProviderReturnedError(raw, provider) {
	return isProvider(provider, "openrouter") && raw.toLowerCase().includes("provider returned error");
}
function isOpenRouterKeyLimitExceededError(raw, provider) {
	return isProvider(provider, "openrouter") && /\bkey\s+limit\s*(?:exceeded|reached|hit)\b/i.test(raw);
}
function classifyFailoverClassificationFromMessage(raw, provider) {
	if (isImageDimensionErrorMessage(raw)) return null;
	if (isImageSizeError(raw)) return null;
	if (isCliSessionExpiredErrorMessage(raw)) return toReasonClassification("session_expired");
	if (isModelNotFoundErrorMessage(raw)) return toReasonClassification("model_not_found");
	if (isContextOverflowError(raw)) return { kind: "context_overflow" };
	const reasonFrom402Text = classifyFailoverReasonFrom402Text(raw);
	if (reasonFrom402Text) return toReasonClassification(reasonFrom402Text);
	if (isOpenRouterKeyLimitExceededError(raw, provider)) return toReasonClassification("billing");
	if (isPeriodicUsageLimitErrorMessage(raw)) return toReasonClassification(isBillingErrorMessage(raw) ? "billing" : "rate_limit");
	if (isRateLimitErrorMessage(raw)) return toReasonClassification("rate_limit");
	if (isOverloadedErrorMessage(raw)) return toReasonClassification("overloaded");
	if (isTransientHttpError(raw)) {
		if (extractLeadingHttpStatus(raw.trim())?.code === 529) return toReasonClassification("overloaded");
		return toReasonClassification("timeout");
	}
	if (isBillingErrorMessage(raw)) return toReasonClassification("billing");
	if (isAuthPermanentErrorMessage(raw)) return toReasonClassification("auth_permanent");
	if (isAuthErrorMessage(raw)) return toReasonClassification("auth");
	if (isAnthropicGenericUnknownError(raw, provider)) return toReasonClassification("timeout");
	if (isOpenRouterProviderReturnedError(raw, provider)) return toReasonClassification("timeout");
	if (isServerErrorMessage(raw)) return toReasonClassification("timeout");
	if (isJsonApiInternalServerError(raw)) return toReasonClassification("timeout");
	if (isCloudCodeAssistFormatError(raw)) return toReasonClassification("format");
	if (isTimeoutErrorMessage(raw)) return toReasonClassification("timeout");
	const providerSpecific = classifyProviderSpecificError(raw);
	if (providerSpecific) return toReasonClassification(providerSpecific);
	return null;
}
function classifyFailoverSignal(signal) {
	const inferredStatus = typeof signal.status === "number" && Number.isFinite(signal.status) ? signal.status : extractLeadingHttpStatus(signal.message?.trim() ?? "")?.code;
	const messageClassification = signal.message ? classifyFailoverClassificationFromMessage(signal.message, signal.provider) : null;
	const statusClassification = classifyFailoverClassificationFromHttpStatus(inferredStatus, signal.message, messageClassification);
	if (statusClassification) return statusClassification;
	const codeReason = classifyFailoverReasonFromCode(signal.code);
	if (codeReason) return toReasonClassification(codeReason);
	return messageClassification;
}
function coerceText(value) {
	if (typeof value === "string") return value;
	if (value == null) return "";
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint" || typeof value === "symbol") return String(value);
	if (typeof value === "object") try {
		return JSON.stringify(value) ?? "";
	} catch {
		return "";
	}
	return "";
}
function stripFinalTagsFromText(text) {
	const normalized = coerceText(text);
	if (!normalized) return normalized;
	return normalized.replace(FINAL_TAG_RE, "");
}
function collapseConsecutiveDuplicateBlocks(text) {
	const trimmed = text.trim();
	if (!trimmed) return text;
	const blocks = trimmed.split(/\n{2,}/);
	if (blocks.length < 2) return text;
	const normalizeBlock = (value) => value.trim().replace(/\s+/g, " ");
	const result = [];
	let lastNormalized = null;
	for (const block of blocks) {
		const normalized = normalizeBlock(block);
		if (lastNormalized && normalized === lastNormalized) continue;
		result.push(block.trim());
		lastNormalized = normalized;
	}
	if (result.length === blocks.length) return text;
	return result.join("\n\n");
}
function isLikelyHttpErrorText(raw) {
	if (isCloudflareOrHtmlErrorPage(raw)) return true;
	const status = extractLeadingHttpStatus(raw);
	if (!status) return false;
	if (status.code < 400) return false;
	const message = status.rest.toLowerCase();
	return HTTP_ERROR_HINTS.some((hint) => message.includes(hint));
}
function shouldRewriteContextOverflowText(raw) {
	if (!isContextOverflowError(raw)) return false;
	return isRawApiErrorPayload(raw) || isLikelyHttpErrorText(raw) || ERROR_PREFIX_RE.test(raw) || CONTEXT_OVERFLOW_ERROR_HEAD_RE.test(raw);
}
function getApiErrorPayloadFingerprint(raw) {
	if (!raw) return null;
	const payload = parseApiErrorPayload(raw);
	if (!payload) return null;
	return stableStringify(payload);
}
function isRawApiErrorPayload(raw) {
	return getApiErrorPayloadFingerprint(raw) !== null;
}
function isLikelyProviderErrorType(type) {
	const normalized = type?.trim().toLowerCase();
	if (!normalized) return false;
	return normalized.endsWith("_error");
}
const NON_ERROR_PROVIDER_PAYLOAD_MAX_LENGTH = 16384;
const NON_ERROR_PROVIDER_PAYLOAD_PREFIX_RE = /^codex\s*error(?:\s+\d{3})?[:\s-]+/i;
function shouldRewriteRawPayloadWithoutErrorContext(raw) {
	if (raw.length > NON_ERROR_PROVIDER_PAYLOAD_MAX_LENGTH) return false;
	if (!NON_ERROR_PROVIDER_PAYLOAD_PREFIX_RE.test(raw)) return false;
	const info = parseApiErrorInfo(raw);
	if (!info) return false;
	if (isLikelyProviderErrorType(info.type)) return true;
	if (info.httpCode) {
		const parsedCode = Number(info.httpCode);
		if (Number.isFinite(parsedCode) && parsedCode >= 400) return true;
	}
	return false;
}
function formatAssistantErrorText(msg, opts) {
	const raw = (msg.errorMessage ?? "").trim();
	if (msg.stopReason !== "error" && !raw) return;
	if (!raw) return "LLM request failed with an unknown error.";
	const unknownTool = raw.match(/unknown tool[:\s]+["']?([a-z0-9_-]+)["']?/i) ?? raw.match(/tool\s+["']?([a-z0-9_-]+)["']?\s+(?:not found|is not available)/i);
	if (unknownTool?.[1]) {
		const rewritten = formatSandboxToolPolicyBlockedMessage({
			cfg: opts?.cfg,
			sessionKey: opts?.sessionKey,
			toolName: unknownTool[1]
		});
		if (rewritten) return rewritten;
	}
	const diskSpaceCopy = formatDiskSpaceErrorCopy(raw);
	if (diskSpaceCopy) return diskSpaceCopy;
	if (isContextOverflowError(raw)) return "Context overflow: prompt too large for the model. Try /reset (or /new) to start a fresh session, or use a larger-context model.";
	if (isReasoningConstraintErrorMessage(raw)) return "Reasoning is required for this model endpoint. Use /think minimal (or any non-off level) and try again.";
	if (isInvalidStreamingEventOrderError(raw)) return "LLM request failed: provider returned an invalid streaming response. Please try again.";
	if (/incorrect role information|roles must alternate|400.*role|"message".*role.*information/i.test(raw)) return "Message ordering conflict - please try again. If this persists, use /new to start a fresh session.";
	if (isMissingToolCallInputError(raw)) return "Session history looks corrupted (tool call input missing). Use /new to start a fresh session. If this keeps happening, reset the session or delete the corrupted session transcript.";
	const invalidRequest = raw.match(/"type":"invalid_request_error".*?"message":"([^"]+)"/);
	if (invalidRequest?.[1]) return `LLM request rejected: ${invalidRequest[1]}`;
	const transientCopy = formatRateLimitOrOverloadedErrorCopy(raw);
	if (transientCopy) return transientCopy;
	const transportCopy = formatTransportErrorCopy(raw);
	if (transportCopy) return transportCopy;
	if (isTimeoutErrorMessage(raw)) return "LLM request timed out.";
	if (isBillingErrorMessage(raw)) return formatBillingErrorMessage(opts?.provider, opts?.model ?? msg.model);
	if (isLikelyHttpErrorText(raw) || isRawApiErrorPayload(raw)) return formatRawAssistantErrorForUi(raw);
	if (raw.length > 600) log.warn(`Long error truncated: ${raw.slice(0, 200)}`);
	return raw.length > 600 ? `${raw.slice(0, 600)}…` : raw;
}
function sanitizeUserFacingText(text, opts) {
	const raw = coerceText(text);
	if (!raw) return raw;
	const errorContext = opts?.errorContext ?? false;
	const stripped = stripInternalRuntimeContext(stripFinalTagsFromText(raw));
	const trimmed = stripped.trim();
	if (!trimmed) return "";
	if (!errorContext && shouldRewriteRawPayloadWithoutErrorContext(trimmed)) return formatRawAssistantErrorForUi(trimmed);
	if (errorContext) {
		const execDeniedMessage = formatExecDeniedUserMessage(trimmed);
		if (execDeniedMessage) return execDeniedMessage;
		const diskSpaceCopy = formatDiskSpaceErrorCopy(trimmed);
		if (diskSpaceCopy) return diskSpaceCopy;
		if (/incorrect role information|roles must alternate/i.test(trimmed)) return "Message ordering conflict - please try again. If this persists, use /new to start a fresh session.";
		if (shouldRewriteContextOverflowText(trimmed)) return "Context overflow: prompt too large for the model. Try /reset (or /new) to start a fresh session, or use a larger-context model.";
		if (isBillingErrorMessage(trimmed)) return BILLING_ERROR_USER_MESSAGE;
		if (isInvalidStreamingEventOrderError(trimmed)) return "LLM request failed: provider returned an invalid streaming response. Please try again.";
		if (isRawApiErrorPayload(trimmed) || isLikelyHttpErrorText(trimmed)) return formatRawAssistantErrorForUi(trimmed);
		if (ERROR_PREFIX_RE.test(trimmed)) {
			const prefixedCopy = formatRateLimitOrOverloadedErrorCopy(trimmed);
			if (prefixedCopy) return prefixedCopy;
			const transportCopy = formatTransportErrorCopy(trimmed);
			if (transportCopy) return transportCopy;
			if (isTimeoutErrorMessage(trimmed)) return "LLM request timed out.";
			return formatRawAssistantErrorForUi(trimmed);
		}
	}
	return collapseConsecutiveDuplicateBlocks(stripped.replace(/^(?:[ \t]*\r?\n)+/, ""));
}
function isRateLimitAssistantError(msg) {
	if (!msg || msg.stopReason !== "error") return false;
	return isRateLimitErrorMessage(msg.errorMessage ?? "");
}
const TOOL_CALL_INPUT_MISSING_RE = /tool_(?:use|call)\.(?:input|arguments).*?(?:field required|required)/i;
const TOOL_CALL_INPUT_PATH_RE = /messages\.\d+\.content\.\d+\.tool_(?:use|call)\.(?:input|arguments)/i;
const IMAGE_DIMENSION_ERROR_RE = /image dimensions exceed max allowed size for many-image requests:\s*(\d+)\s*pixels/i;
const IMAGE_DIMENSION_PATH_RE = /messages\.(\d+)\.content\.(\d+)\.image/i;
const IMAGE_SIZE_ERROR_RE = /image exceeds\s*(\d+(?:\.\d+)?)\s*mb/i;
function isMissingToolCallInputError(raw) {
	if (!raw) return false;
	return TOOL_CALL_INPUT_MISSING_RE.test(raw) || TOOL_CALL_INPUT_PATH_RE.test(raw);
}
function isBillingAssistantError(msg) {
	if (!msg || msg.stopReason !== "error") return false;
	return isBillingErrorMessage(msg.errorMessage ?? "");
}
const API_ERROR_TRANSIENT_SIGNALS_RE = /internal server error|overload|temporarily unavailable|service unavailable|unknown error|server error|bad gateway|gateway timeout|upstream error|backend error|try again later|temporarily.+unable|unexpected error/i;
function isJsonApiInternalServerError(raw) {
	if (!raw) return false;
	if (!raw.toLowerCase().includes("\"type\":\"api_error\"")) return false;
	if (isBillingErrorMessage(raw) || isAuthErrorMessage(raw) || isAuthPermanentErrorMessage(raw)) return false;
	return API_ERROR_TRANSIENT_SIGNALS_RE.test(raw);
}
function parseImageDimensionError(raw) {
	if (!raw) return null;
	if (!raw.toLowerCase().includes("image dimensions exceed max allowed size")) return null;
	const limitMatch = raw.match(IMAGE_DIMENSION_ERROR_RE);
	const pathMatch = raw.match(IMAGE_DIMENSION_PATH_RE);
	return {
		maxDimensionPx: limitMatch?.[1] ? Number.parseInt(limitMatch[1], 10) : void 0,
		messageIndex: pathMatch?.[1] ? Number.parseInt(pathMatch[1], 10) : void 0,
		contentIndex: pathMatch?.[2] ? Number.parseInt(pathMatch[2], 10) : void 0,
		raw
	};
}
function isImageDimensionErrorMessage(raw) {
	return Boolean(parseImageDimensionError(raw));
}
function parseImageSizeError(raw) {
	if (!raw) return null;
	const lower = raw.toLowerCase();
	if (!lower.includes("image exceeds") || !lower.includes("mb")) return null;
	const match = raw.match(IMAGE_SIZE_ERROR_RE);
	return {
		maxMb: match?.[1] ? Number.parseFloat(match[1]) : void 0,
		raw
	};
}
function isImageSizeError(errorMessage) {
	if (!errorMessage) return false;
	return Boolean(parseImageSizeError(errorMessage));
}
function isCloudCodeAssistFormatError(raw) {
	return !isImageDimensionErrorMessage(raw) && matchesFormatErrorPattern(raw);
}
function isAuthAssistantError(msg) {
	if (!msg || msg.stopReason !== "error") return false;
	return isAuthErrorMessage(msg.errorMessage ?? "");
}
function isModelNotFoundErrorMessage(raw) {
	if (!raw) return false;
	const lower = raw.toLowerCase();
	if (lower.includes("unknown model") || lower.includes("model not found") || lower.includes("model_not_found") || lower.includes("not_found_error") || lower.includes("does not exist") && lower.includes("model") || lower.includes("invalid model") && !lower.includes("invalid model reference")) return true;
	if (/models\/[^\s]+ is not found/i.test(raw)) return true;
	if (/\b404\b/.test(raw) && /not[-_ ]?found/i.test(raw)) return true;
	return false;
}
function isCliSessionExpiredErrorMessage(raw) {
	if (!raw) return false;
	const lower = raw.toLowerCase();
	return lower.includes("session not found") || lower.includes("session does not exist") || lower.includes("session expired") || lower.includes("session invalid") || lower.includes("conversation not found") || lower.includes("conversation does not exist") || lower.includes("conversation expired") || lower.includes("conversation invalid") || lower.includes("no such session") || lower.includes("invalid session") || lower.includes("session id not found") || lower.includes("conversation id not found");
}
function classifyFailoverReason(raw, opts) {
	return failoverReasonFromClassification(classifyFailoverSignal({
		status: extractLeadingHttpStatus(raw.trim())?.code,
		message: raw,
		provider: opts?.provider
	}));
}
function isFailoverErrorMessage(raw, opts) {
	return classifyFailoverReason(raw, opts) !== null;
}
function isFailoverAssistantError(msg) {
	if (!msg || msg.stopReason !== "error") return false;
	return isFailoverErrorMessage(msg.errorMessage ?? "", { provider: msg.provider });
}
//#endregion
export { escapeInternalRuntimeContextDelimiters as A, isBillingErrorMessage as C, stableStringify as D, isTimeoutErrorMessage as E, formatExecDeniedUserMessage as M, isExecDeniedResultText as N, INTERNAL_RUNTIME_CONTEXT_BEGIN as O, parseExecApprovalResultText as P, sanitizeUserFacingText as S, isRateLimitErrorMessage as T, isRawApiErrorPayload as _, formatAssistantErrorText as a, parseImageDimensionError as b, isAuthAssistantError as c, isCompactionFailureError as d, isContextOverflowError as f, isRateLimitAssistantError as g, isLikelyContextOverflowError as h, extractObservedOverflowTokenCount as i, hasInternalRuntimeContext as j, INTERNAL_RUNTIME_CONTEXT_END as k, isBillingAssistantError as l, isFailoverErrorMessage as m, classifyFailoverReason as n, formatBillingErrorMessage as o, isFailoverAssistantError as p, classifyFailoverSignal as r, getApiErrorPayloadFingerprint as s, BILLING_ERROR_USER_MESSAGE as t, isCloudCodeAssistFormatError as u, isReasoningConstraintErrorMessage as v, isOverloadedErrorMessage as w, parseImageSizeError as x, isTransientHttpError as y };
