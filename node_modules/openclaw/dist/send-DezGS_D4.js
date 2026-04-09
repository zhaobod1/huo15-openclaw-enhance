import { s as __toESM } from "./chunk-iyeSoAlh.js";
import { n as resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir-BobVQuve.js";
import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { t as danger } from "./globals-B43CpcZo.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { n as extensionForMime, p as maxBytesForKind } from "./mime-MVyX1IzB.js";
import { m as resolveTextChunksWithFallback } from "./reply-payload-Dp5nBPsr.js";
import { n as normalizePollInput, t as normalizePollDurationHours } from "./polls-DHTlCLT8.js";
import { i as chunkMarkdownTextWithMode, s as resolveChunkMode } from "./chunk-CKMbnOQL.js";
import { n as loadWebMediaRaw, t as loadWebMedia } from "./web-media-Blt79Ld9.js";
import { c as parseFfprobeCodecAndSampleRate, d as runFfprobe, f as MEDIA_FFMPEG_MAX_AUDIO_DURATION_SECS, u as runFfmpeg } from "./runner-Bo7fJw79.js";
import "./temp-path-BO7uM_47.js";
import { r as makeProxyFetch } from "./proxy-fetch-DBK7pU_g.js";
import { t as buildOutboundMediaLoadOptions } from "./load-options-Bok4GX-g.js";
import "./routing-DdBDhOmH.js";
import { t as resolveMarkdownTableMode } from "./markdown-tables-hkAZKOT1.js";
import { n as recordChannelActivity } from "./channel-activity-DwMot8mI.js";
import { t as convertMarkdownTables } from "./tables-BblJIt3c.js";
import { a as parseMentionPrefixOrAtUserTarget, t as buildMessagingTarget } from "./targets-CCIBDx1u.js";
import "./text-runtime-DQoOM_co.js";
import "./runtime-env-BLYCS7ta.js";
import "./config-runtime-OuR9WVXH.js";
import "./reply-chunking-D9XwfVhm.js";
import "./web-media-CwsGSbKF.js";
import { r as createRateLimitRetryRunner } from "./retry-policy-D7BmFwU_.js";
import "./infra-runtime-DS3U08t7.js";
import { a as unlinkIfExists } from "./media-runtime-BfmVsgHe.js";
import "./retry-runtime-Dzv_ec88.js";
import { t as normalizeDiscordToken } from "./token-DEmLO_Vu.js";
import { i as mergeDiscordAccountConfig, o as resolveDiscordAccount } from "./accounts-0gXQeT93.js";
import { a as PermissionFlagsBits$1, l as require_v10, o as Routes, r as ChannelType$2 } from "./v10-BEazpT0A.js";
import { t as rememberDiscordDirectoryUser } from "./directory-cache-DlgSULeu.js";
import { n as rewriteDiscordKnownMentions } from "./mentions-XppDrs0l.js";
import { n as listDiscordDirectoryPeersLive } from "./directory-live-CnjqEk1c.js";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { isIP } from "node:net";
import { DiscordError, Embed, RateLimitError, RequestClient, serializePayload } from "@buape/carbon";
//#region node_modules/discord-api-types/payloads/v10/index.mjs
var import_v10 = /* @__PURE__ */ __toESM(require_v10(), 1);
import_v10.default.APIApplicationCommandPermissionsConstant;
import_v10.default.ActivityFlags;
import_v10.default.ActivityLocationKind;
import_v10.default.ActivityPlatform;
import_v10.default.ActivityType;
import_v10.default.AllowedMentionsTypes;
import_v10.default.ApplicationCommandOptionType;
import_v10.default.ApplicationCommandPermissionType;
import_v10.default.ApplicationCommandType;
import_v10.default.ApplicationFlags;
import_v10.default.ApplicationIntegrationType;
import_v10.default.ApplicationRoleConnectionMetadataType;
import_v10.default.ApplicationWebhookEventStatus;
import_v10.default.ApplicationWebhookEventType;
import_v10.default.ApplicationWebhookType;
import_v10.default.AttachmentFlags;
import_v10.default.AuditLogEvent;
import_v10.default.AuditLogOptionsType;
import_v10.default.AutoModerationActionType;
import_v10.default.AutoModerationRuleEventType;
import_v10.default.AutoModerationRuleKeywordPresetType;
import_v10.default.AutoModerationRuleTriggerType;
import_v10.default.BaseThemeType;
import_v10.default.ButtonStyle;
import_v10.default.ChannelFlags;
import_v10.default.ChannelType;
import_v10.default.ComponentType;
import_v10.default.ConnectionService;
import_v10.default.ConnectionVisibility;
import_v10.default.EmbedType;
import_v10.default.EntitlementType;
import_v10.default.EntryPointCommandHandlerType;
import_v10.default.ForumLayoutType;
import_v10.default.GuildDefaultMessageNotifications;
import_v10.default.GuildExplicitContentFilter;
import_v10.default.GuildFeature;
import_v10.default.GuildHubType;
import_v10.default.GuildMFALevel;
import_v10.default.GuildMemberFlags;
import_v10.default.GuildNSFWLevel;
import_v10.default.GuildOnboardingMode;
import_v10.default.GuildOnboardingPromptType;
import_v10.default.GuildPremiumTier;
import_v10.default.GuildScheduledEventEntityType;
import_v10.default.GuildScheduledEventPrivacyLevel;
import_v10.default.GuildScheduledEventRecurrenceRuleFrequency;
import_v10.default.GuildScheduledEventRecurrenceRuleMonth;
import_v10.default.GuildScheduledEventRecurrenceRuleWeekday;
import_v10.default.GuildScheduledEventStatus;
import_v10.default.GuildSystemChannelFlags;
import_v10.default.GuildVerificationLevel;
import_v10.default.GuildWidgetStyle;
import_v10.default.IntegrationExpireBehavior;
import_v10.default.InteractionContextType;
import_v10.default.InteractionResponseType;
import_v10.default.InteractionType;
import_v10.default.InviteFlags;
import_v10.default.InviteTargetType;
import_v10.default.InviteType;
import_v10.default.MembershipScreeningFieldType;
import_v10.default.MessageActivityType;
import_v10.default.MessageFlags;
import_v10.default.MessageReferenceType;
import_v10.default.MessageSearchAuthorType;
import_v10.default.MessageSearchEmbedType;
import_v10.default.MessageSearchHasType;
import_v10.default.MessageSearchSortMode;
import_v10.default.MessageType;
import_v10.default.NameplatePalette;
import_v10.default.OAuth2Scopes;
import_v10.default.OverwriteType;
import_v10.default.PermissionFlagsBits;
const PollLayoutType = import_v10.default.PollLayoutType;
import_v10.default.PresenceUpdateStatus;
import_v10.default.RoleFlags;
import_v10.default.SKUFlags;
import_v10.default.SKUType;
import_v10.default.SelectMenuDefaultValueType;
import_v10.default.SeparatorSpacingSize;
import_v10.default.SortOrderType;
import_v10.default.StageInstancePrivacyLevel;
import_v10.default.StatusDisplayType;
import_v10.default.StickerFormatType;
import_v10.default.StickerType;
import_v10.default.SubscriptionStatus;
import_v10.default.TeamMemberMembershipState;
import_v10.default.TeamMemberRole;
import_v10.default.TextInputStyle;
import_v10.default.ThreadAutoArchiveDuration;
import_v10.default.ThreadMemberFlags;
import_v10.default.UnfurledMediaItemLoadingState;
import_v10.default.UserFlags;
import_v10.default.UserPremiumType;
import_v10.default.VideoQualityMode;
import_v10.default.WebhookType;
//#endregion
//#region extensions/discord/src/chunk.ts
const DEFAULT_MAX_CHARS = 2e3;
const DEFAULT_MAX_LINES = 17;
const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/;
function countLines(text) {
	if (!text) return 0;
	return text.split("\n").length;
}
function parseFenceLine(line) {
	const match = line.match(FENCE_RE);
	if (!match) return null;
	const indent = match[1] ?? "";
	const marker = match[2] ?? "";
	return {
		indent,
		markerChar: marker[0] ?? "`",
		markerLen: marker.length,
		openLine: line
	};
}
function closeFenceLine(openFence) {
	return `${openFence.indent}${openFence.markerChar.repeat(openFence.markerLen)}`;
}
function closeFenceIfNeeded(text, openFence) {
	if (!openFence) return text;
	const closeLine = closeFenceLine(openFence);
	if (!text) return closeLine;
	if (!text.endsWith("\n")) return `${text}\n${closeLine}`;
	return `${text}${closeLine}`;
}
function splitLongLine(line, maxChars, opts) {
	const limit = Math.max(1, Math.floor(maxChars));
	if (line.length <= limit) return [line];
	const out = [];
	let remaining = line;
	while (remaining.length > limit) {
		if (opts.preserveWhitespace) {
			out.push(remaining.slice(0, limit));
			remaining = remaining.slice(limit);
			continue;
		}
		const window = remaining.slice(0, limit);
		let breakIdx = -1;
		for (let i = window.length - 1; i >= 0; i--) if (/\s/.test(window[i])) {
			breakIdx = i;
			break;
		}
		if (breakIdx <= 0) breakIdx = limit;
		out.push(remaining.slice(0, breakIdx));
		remaining = remaining.slice(breakIdx);
	}
	if (remaining.length) out.push(remaining);
	return out;
}
/**
* Chunks outbound Discord text by both character count and (soft) line count,
* while keeping fenced code blocks balanced across chunks.
*/
function chunkDiscordText(text, opts = {}) {
	const maxChars = Math.max(1, Math.floor(opts.maxChars ?? DEFAULT_MAX_CHARS));
	const maxLines = Math.max(1, Math.floor(opts.maxLines ?? DEFAULT_MAX_LINES));
	const body = text ?? "";
	if (!body) return [];
	if (body.length <= maxChars && countLines(body) <= maxLines) return [body];
	const lines = body.split("\n");
	const chunks = [];
	let current = "";
	let currentLines = 0;
	let openFence = null;
	const flush = () => {
		if (!current) return;
		const payload = closeFenceIfNeeded(current, openFence);
		if (payload.trim().length) chunks.push(payload);
		current = "";
		currentLines = 0;
		if (openFence) {
			current = openFence.openLine;
			currentLines = 1;
		}
	};
	for (const originalLine of lines) {
		const fenceInfo = parseFenceLine(originalLine);
		const wasInsideFence = openFence !== null;
		let nextOpenFence = openFence;
		if (fenceInfo) {
			if (!openFence) nextOpenFence = fenceInfo;
			else if (openFence.markerChar === fenceInfo.markerChar && fenceInfo.markerLen >= openFence.markerLen) nextOpenFence = null;
		}
		const reserveChars = nextOpenFence ? closeFenceLine(nextOpenFence).length + 1 : 0;
		const reserveLines = nextOpenFence ? 1 : 0;
		const effectiveMaxChars = maxChars - reserveChars;
		const effectiveMaxLines = maxLines - reserveLines;
		const charLimit = effectiveMaxChars > 0 ? effectiveMaxChars : maxChars;
		const lineLimit = effectiveMaxLines > 0 ? effectiveMaxLines : maxLines;
		const prefixLen = current.length > 0 ? current.length + 1 : 0;
		const segments = splitLongLine(originalLine, Math.max(1, charLimit - prefixLen), { preserveWhitespace: wasInsideFence });
		for (let segIndex = 0; segIndex < segments.length; segIndex++) {
			const segment = segments[segIndex];
			const isLineContinuation = segIndex > 0;
			const addition = `${isLineContinuation ? "" : current.length > 0 ? "\n" : ""}${segment}`;
			const nextLen = current.length + addition.length;
			const nextLines = currentLines + (isLineContinuation ? 0 : 1);
			if ((nextLen > charLimit || nextLines > lineLimit) && current.length > 0) flush();
			if (current.length > 0) {
				current += addition;
				if (!isLineContinuation) currentLines += 1;
			} else {
				current = segment;
				currentLines = 1;
			}
		}
		openFence = nextOpenFence;
	}
	if (current.length) {
		const payload = closeFenceIfNeeded(current, openFence);
		if (payload.trim().length) chunks.push(payload);
	}
	return rebalanceReasoningItalics(text, chunks);
}
function chunkDiscordTextWithMode(text, opts) {
	if ((opts.chunkMode ?? "length") !== "newline") return chunkDiscordText(text, opts);
	const lineChunks = chunkMarkdownTextWithMode(text, Math.max(1, Math.floor(opts.maxChars ?? DEFAULT_MAX_CHARS)), "newline");
	const chunks = [];
	for (const line of lineChunks) {
		const nested = chunkDiscordText(line, opts);
		if (!nested.length && line) {
			chunks.push(line);
			continue;
		}
		chunks.push(...nested);
	}
	return chunks;
}
function rebalanceReasoningItalics(source, chunks) {
	if (chunks.length <= 1) return chunks;
	if (!(source.startsWith("Reasoning:\n_") && source.trimEnd().endsWith("_"))) return chunks;
	const adjusted = [...chunks];
	for (let i = 0; i < adjusted.length; i++) {
		const isLast = i === adjusted.length - 1;
		const current = adjusted[i];
		if (!current.trimEnd().endsWith("_")) adjusted[i] = `${current}_`;
		if (isLast) break;
		const next = adjusted[i + 1];
		const leadingWhitespaceLen = next.length - next.trimStart().length;
		const leadingWhitespace = next.slice(0, leadingWhitespaceLen);
		const nextBody = next.slice(leadingWhitespaceLen);
		if (!nextBody.startsWith("_")) adjusted[i + 1] = `${leadingWhitespace}_${nextBody}`;
	}
	return adjusted;
}
//#endregion
//#region extensions/discord/src/proxy-fetch.ts
function resolveDiscordProxyUrl(account, cfg) {
	const accountProxy = account.config.proxy?.trim();
	if (accountProxy) return accountProxy;
	const channelProxy = cfg?.channels?.discord?.proxy;
	if (typeof channelProxy !== "string") return;
	return channelProxy.trim() || void 0;
}
function resolveDiscordProxyFetchByUrl(proxyUrl, runtime) {
	return withValidatedDiscordProxy(proxyUrl, runtime, (proxy) => makeProxyFetch(proxy));
}
function resolveDiscordProxyFetchForAccount(account, cfg, runtime) {
	return resolveDiscordProxyFetchByUrl(resolveDiscordProxyUrl(account, cfg), runtime);
}
function withValidatedDiscordProxy(proxyUrl, runtime, createValue) {
	const proxy = proxyUrl?.trim();
	if (!proxy) return;
	try {
		validateDiscordProxyUrl(proxy);
		return createValue(proxy);
	} catch (err) {
		runtime?.error?.(danger(`discord: invalid rest proxy: ${String(err)}`));
		return;
	}
}
function validateDiscordProxyUrl(proxyUrl) {
	let parsed;
	try {
		parsed = new URL(proxyUrl);
	} catch {
		throw new Error("Proxy URL must be a valid http or https URL");
	}
	if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Proxy URL must use http or https");
	if (!isLoopbackProxyHostname(parsed.hostname)) throw new Error("Proxy URL must target a loopback host");
	return proxyUrl;
}
function isLoopbackProxyHostname(hostname) {
	const normalized = hostname.trim().toLowerCase();
	if (!normalized) return false;
	const bracketless = normalized.startsWith("[") && normalized.endsWith("]") ? normalized.slice(1, -1) : normalized;
	if (bracketless === "localhost") return true;
	const ipFamily = isIP(bracketless);
	if (ipFamily === 4) return bracketless.startsWith("127.");
	if (ipFamily === 6) return bracketless === "::1" || bracketless === "0:0:0:0:0:0:0:1";
	return false;
}
//#endregion
//#region extensions/discord/src/proxy-request-client.ts
const defaultOptions = {
	tokenHeader: "Bot",
	baseUrl: "https://discord.com/api",
	apiVersion: 10,
	userAgent: "DiscordBot (https://github.com/buape/carbon, v0.0.0)",
	timeout: 15e3,
	queueRequests: true,
	maxQueueSize: 1e3
};
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function getMultipartFiles(payload) {
	if (!isRecord(payload)) return [];
	const directFiles = payload.files;
	if (Array.isArray(directFiles)) return directFiles;
	const nestedData = payload.data;
	if (!isRecord(nestedData)) return [];
	const nestedFiles = nestedData.files;
	return Array.isArray(nestedFiles) ? nestedFiles : [];
}
function isMultipartPayload(payload) {
	return getMultipartFiles(payload).length > 0;
}
function toRateLimitBody(parsedBody, rawBody, headers) {
	if (isRecord(parsedBody)) {
		const message = typeof parsedBody.message === "string" ? parsedBody.message : void 0;
		const retryAfter = typeof parsedBody.retry_after === "number" ? parsedBody.retry_after : void 0;
		const global = typeof parsedBody.global === "boolean" ? parsedBody.global : void 0;
		if (message !== void 0 && retryAfter !== void 0 && global !== void 0) return {
			message,
			retry_after: retryAfter,
			global
		};
	}
	const retryAfterHeader = headers.get("Retry-After");
	return {
		message: typeof parsedBody === "string" ? parsedBody : rawBody || "You are being rate limited.",
		retry_after: retryAfterHeader && !Number.isNaN(Number(retryAfterHeader)) ? Number(retryAfterHeader) : 1,
		global: headers.get("X-RateLimit-Scope") === "global"
	};
}
function createRateLimitErrorCompat(response, body, request) {
	return new RateLimitError(response, body, request);
}
function toDiscordErrorBody(parsedBody, rawBody) {
	if (isRecord(parsedBody) && typeof parsedBody.message === "string") return parsedBody;
	return { message: typeof parsedBody === "string" ? parsedBody : rawBody || "Discord request failed" };
}
function toBlobPart(value) {
	if (value instanceof ArrayBuffer || typeof value === "string") return value;
	if (ArrayBuffer.isView(value)) {
		const copied = new Uint8Array(value.byteLength);
		copied.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
		return copied;
	}
	if (value instanceof Blob) return value;
	return String(value);
}
var ProxyRequestClientCompat = class {
	constructor(token, options) {
		this.queue = [];
		this.abortController = null;
		this.processingQueue = false;
		this.routeBuckets = /* @__PURE__ */ new Map();
		this.bucketStates = /* @__PURE__ */ new Map();
		this.globalRateLimitUntil = 0;
		this.token = token;
		this.options = {
			...defaultOptions,
			...options
		};
		this.customFetch = options?.fetch;
	}
	async get(path, query) {
		return await this.request("GET", path, { query });
	}
	async post(path, data, query) {
		return await this.request("POST", path, {
			data,
			query
		});
	}
	async patch(path, data, query) {
		return await this.request("PATCH", path, {
			data,
			query
		});
	}
	async put(path, data, query) {
		return await this.request("PUT", path, {
			data,
			query
		});
	}
	async delete(path, data, query) {
		return await this.request("DELETE", path, {
			data,
			query
		});
	}
	clearQueue() {
		this.queue.length = 0;
	}
	get queueSize() {
		return this.queue.length;
	}
	abortAllRequests() {
		this.abortController?.abort();
		this.abortController = null;
	}
	async request(method, path, params) {
		const routeKey = this.getRouteKey(method, path);
		if (this.options.queueRequests) {
			if (typeof this.options.maxQueueSize === "number" && this.options.maxQueueSize > 0 && this.queue.length >= this.options.maxQueueSize) {
				const stats = this.queue.reduce((acc, item) => {
					const count = (acc.counts.get(item.routeKey) ?? 0) + 1;
					acc.counts.set(item.routeKey, count);
					if (count > acc.topCount) {
						acc.topCount = count;
						acc.topRoute = item.routeKey;
					}
					return acc;
				}, {
					counts: new Map([[routeKey, 1]]),
					topRoute: routeKey,
					topCount: 1
				});
				throw new Error(`Request queue is full (${this.queue.length} / ${this.options.maxQueueSize}), you should implement a queuing system in your requests or raise the queue size in Carbon. Top offender: ${stats.topRoute}`);
			}
			return await new Promise((resolve, reject) => {
				this.queue.push({
					method,
					path,
					data: params.data,
					query: params.query,
					resolve,
					reject,
					routeKey
				});
				this.processQueue();
			});
		}
		return await new Promise((resolve, reject) => {
			this.executeRequest({
				method,
				path,
				data: params.data,
				query: params.query,
				resolve,
				reject,
				routeKey
			}).then(resolve).catch(reject);
		});
	}
	async executeRequest(request) {
		const { method, path, data, query, routeKey } = request;
		await this.waitForBucket(routeKey);
		const queryString = query ? `?${Object.entries(query).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}` : "";
		const url = `${this.options.baseUrl}${path}${queryString}`;
		const originalRequest = new Request(url, { method });
		const headers = this.token === "webhook" ? new Headers() : new Headers({ Authorization: `${this.options.tokenHeader} ${this.token}` });
		if (data?.headers) for (const [key, value] of Object.entries(data.headers)) headers.set(key, value);
		this.abortController = new AbortController();
		const timeoutMs = typeof this.options.timeout === "number" && this.options.timeout > 0 ? this.options.timeout : void 0;
		let body;
		if (data?.body && isMultipartPayload(data.body)) {
			const payload = data.body;
			const normalizedBody = typeof payload === "string" ? {
				content: payload,
				attachments: []
			} : {
				...payload,
				attachments: []
			};
			const formData = new FormData();
			const files = getMultipartFiles(payload);
			for (const [index, file] of files.entries()) {
				const normalizedFileData = file.data instanceof Blob ? file.data : new Blob([toBlobPart(file.data)]);
				formData.append(`files[${index}]`, normalizedFileData, file.name);
				normalizedBody.attachments.push({
					id: index,
					filename: file.name,
					description: file.description
				});
			}
			const cleanedBody = {
				...normalizedBody,
				files: void 0
			};
			formData.append("payload_json", JSON.stringify(cleanedBody));
			body = formData;
		} else if (data?.body != null) {
			headers.set("Content-Type", "application/json");
			body = data.rawBody ? data.body : JSON.stringify(data.body);
		}
		let timeoutId;
		if (timeoutMs !== void 0) timeoutId = setTimeout(() => {
			this.abortController?.abort();
		}, timeoutMs);
		let response;
		try {
			response = await (this.customFetch ?? globalThis.fetch)(url, {
				method,
				headers,
				body,
				signal: this.abortController.signal
			});
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
		let rawBody = "";
		let parsedBody;
		try {
			rawBody = await response.text();
		} catch {
			rawBody = "";
		}
		if (rawBody.length > 0) try {
			parsedBody = JSON.parse(rawBody);
		} catch {
			parsedBody = void 0;
		}
		if (response.status === 429) {
			const rateLimitBody = toRateLimitBody(parsedBody, rawBody, response.headers);
			const rateLimitError = createRateLimitErrorCompat(response, rateLimitBody, originalRequest);
			this.scheduleRateLimit(routeKey, rateLimitError.retryAfter, rateLimitError.scope === "global");
			throw rateLimitError;
		}
		this.updateBucketFromHeaders(routeKey, response.headers);
		if (!response.ok) throw new DiscordError(response, toDiscordErrorBody(parsedBody, rawBody));
		return parsedBody ?? rawBody;
	}
	async processQueue() {
		if (this.processingQueue) return;
		this.processingQueue = true;
		try {
			while (this.queue.length > 0) {
				const request = this.queue.shift();
				if (!request) continue;
				try {
					const result = await this.executeRequest(request);
					request.resolve(result);
				} catch (error) {
					if (error instanceof RateLimitError && this.options.queueRequests) {
						this.queue.unshift(request);
						continue;
					}
					request.reject(error);
				}
			}
		} finally {
			this.processingQueue = false;
		}
	}
	async waitForBucket(routeKey) {
		while (true) {
			const now = Date.now();
			if (this.globalRateLimitUntil > now) {
				await new Promise((resolve) => setTimeout(resolve, this.globalRateLimitUntil - now));
				continue;
			}
			const bucketKey = this.routeBuckets.get(routeKey);
			const bucketUntil = bucketKey ? this.bucketStates.get(bucketKey) ?? 0 : 0;
			if (bucketUntil > now) {
				await new Promise((resolve) => setTimeout(resolve, bucketUntil - now));
				continue;
			}
			return;
		}
	}
	scheduleRateLimit(routeKey, retryAfterSeconds, global) {
		const resetAt = Date.now() + Math.ceil(retryAfterSeconds * 1e3);
		if (global) {
			this.globalRateLimitUntil = Math.max(this.globalRateLimitUntil, resetAt);
			return;
		}
		const bucketKey = this.routeBuckets.get(routeKey) ?? routeKey;
		this.routeBuckets.set(routeKey, bucketKey);
		this.bucketStates.set(bucketKey, Math.max(this.bucketStates.get(bucketKey) ?? 0, resetAt));
	}
	updateBucketFromHeaders(routeKey, headers) {
		const bucket = headers.get("X-RateLimit-Bucket");
		const retryAfter = headers.get("X-RateLimit-Reset-After");
		const remaining = headers.get("X-RateLimit-Remaining");
		const resetAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
		const remainingRequests = remaining ? Number(remaining) : NaN;
		if (!bucket) return;
		this.routeBuckets.set(routeKey, bucket);
		if (!Number.isFinite(resetAfterSeconds) || !Number.isFinite(remainingRequests)) {
			if (!this.bucketStates.has(bucket)) this.bucketStates.set(bucket, 0);
			return;
		}
		if (remainingRequests <= 0) {
			this.bucketStates.set(bucket, Date.now() + Math.ceil(resetAfterSeconds * 1e3));
			return;
		}
		this.bucketStates.set(bucket, 0);
	}
	getMajorParameter(path) {
		const guildMatch = path.match(/^\/guilds\/(\d+)/);
		if (guildMatch?.[1]) return guildMatch[1];
		const channelMatch = path.match(/^\/channels\/(\d+)/);
		if (channelMatch?.[1]) return channelMatch[1];
		const webhookMatch = path.match(/^\/webhooks\/(\d+)(?:\/([^/]+))?/);
		if (webhookMatch) {
			const [, id, token] = webhookMatch;
			return token ? `${id}/${token}` : id ?? null;
		}
		return null;
	}
	getRouteKey(method, path) {
		return `${method.toUpperCase()}:${this.getBucketKey(path)}`;
	}
	getBucketKey(path) {
		const majorParameter = this.getMajorParameter(path);
		const normalizedPath = path.replace(/\?.*$/, "").replace(/\/\d{17,20}(?=\/|$)/g, "/:id").replace(/\/reactions\/[^/]+/g, "/reactions/:reaction");
		return majorParameter ? `${normalizedPath}:${majorParameter}` : normalizedPath;
	}
};
function createDiscordRequestClient(token, options) {
	if (!options?.fetch) return new RequestClient(token, options);
	return new ProxyRequestClientCompat(token, options);
}
//#endregion
//#region extensions/discord/src/retry.ts
const DISCORD_RETRY_DEFAULTS = {
	attempts: 3,
	minDelayMs: 500,
	maxDelayMs: 3e4,
	jitter: .1
};
function createDiscordRetryRunner(params) {
	return createRateLimitRetryRunner({
		...params,
		defaults: DISCORD_RETRY_DEFAULTS,
		logLabel: "discord",
		shouldRetry: (err) => err instanceof RateLimitError,
		retryAfterMs: (err) => err instanceof RateLimitError ? err.retryAfter * 1e3 : void 0
	});
}
//#endregion
//#region extensions/discord/src/client.ts
function createDiscordRuntimeAccountContext(params) {
	return {
		cfg: params.cfg,
		accountId: normalizeAccountId(params.accountId)
	};
}
function resolveDiscordClientAccountContext(opts, cfg, runtime) {
	const resolvedCfg = opts.cfg ?? cfg ?? loadConfig();
	const account = resolveAccountWithoutToken({
		cfg: resolvedCfg,
		accountId: opts.accountId
	});
	return {
		cfg: resolvedCfg,
		account,
		proxyFetch: resolveDiscordProxyFetchForAccount(account, resolvedCfg, runtime)
	};
}
function resolveToken(params) {
	const fallback = normalizeDiscordToken(params.fallbackToken, "channels.discord.token");
	if (!fallback) throw new Error(`Discord bot token missing for account "${params.accountId}" (set discord.accounts.${params.accountId}.token or DISCORD_BOT_TOKEN for default).`);
	return fallback;
}
function resolveRest(token, account, cfg, rest, proxyFetch) {
	if (rest) return rest;
	const resolvedProxyFetch = proxyFetch ?? resolveDiscordProxyFetchForAccount(account, cfg);
	return createDiscordRequestClient(token, resolvedProxyFetch ? { fetch: resolvedProxyFetch } : void 0);
}
function resolveAccountWithoutToken(params) {
	const accountId = normalizeAccountId(params.accountId);
	const merged = mergeDiscordAccountConfig(params.cfg, accountId);
	const baseEnabled = params.cfg.channels?.discord?.enabled !== false;
	const accountEnabled = merged.enabled !== false;
	return {
		accountId,
		enabled: baseEnabled && accountEnabled,
		name: merged.name?.trim() || void 0,
		token: "",
		tokenSource: "none",
		config: merged
	};
}
function createDiscordRestClient(opts, cfg) {
	const explicitToken = normalizeDiscordToken(opts.token, "channels.discord.token");
	const proxyContext = resolveDiscordClientAccountContext(opts, cfg);
	const resolvedCfg = proxyContext.cfg;
	const account = explicitToken ? proxyContext.account : resolveDiscordAccount({
		cfg: resolvedCfg,
		accountId: opts.accountId
	});
	const token = explicitToken ?? resolveToken({
		accountId: account.accountId,
		fallbackToken: account.token
	});
	return {
		token,
		rest: resolveRest(token, account, resolvedCfg, opts.rest, proxyContext.proxyFetch),
		account
	};
}
function createDiscordClient(opts, cfg) {
	const { token, rest, account } = createDiscordRestClient(opts, opts.cfg ?? cfg);
	return {
		token,
		rest,
		request: createDiscordRetryRunner({
			retry: opts.retry,
			configRetry: account.config.retry,
			verbose: opts.verbose
		})
	};
}
function resolveDiscordRest(opts) {
	return createDiscordRestClient(opts, opts.cfg).rest;
}
//#endregion
//#region extensions/discord/src/send.permissions.ts
const PERMISSION_ENTRIES = Object.entries(PermissionFlagsBits$1).filter(([, value]) => typeof value === "bigint");
const ALL_PERMISSIONS = PERMISSION_ENTRIES.reduce((acc, [, value]) => acc | value, 0n);
const ADMINISTRATOR_BIT = PermissionFlagsBits$1.Administrator;
function addPermissionBits(base, add) {
	if (!add) return base;
	return base | BigInt(add);
}
function removePermissionBits(base, deny) {
	if (!deny) return base;
	return base & ~BigInt(deny);
}
function bitfieldToPermissions(bitfield) {
	return PERMISSION_ENTRIES.filter(([, value]) => (bitfield & value) === value).map(([name]) => name).toSorted();
}
function hasAdministrator(bitfield) {
	return (bitfield & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT;
}
function hasPermissionBit(bitfield, permission) {
	return (bitfield & permission) === permission;
}
function isThreadChannelType(channelType) {
	return channelType === ChannelType$2.GuildNewsThread || channelType === ChannelType$2.GuildPublicThread || channelType === ChannelType$2.GuildPrivateThread;
}
async function fetchBotUserId(rest) {
	const me = await rest.get(Routes.user("@me"));
	if (!me?.id) throw new Error("Failed to resolve bot user id");
	return me.id;
}
/**
* Fetch guild-level permissions for a user. This does not include channel-specific overwrites.
*/
async function fetchMemberGuildPermissionsDiscord(guildId, userId, opts = {}) {
	const rest = resolveDiscordRest(opts);
	try {
		const [guild, member] = await Promise.all([rest.get(Routes.guild(guildId)), rest.get(Routes.guildMember(guildId, userId))]);
		const rolesById = new Map((guild.roles ?? []).map((role) => [role.id, role]));
		const everyoneRole = rolesById.get(guildId);
		let permissions = 0n;
		if (everyoneRole?.permissions) permissions = addPermissionBits(permissions, everyoneRole.permissions);
		for (const roleId of member.roles ?? []) {
			const role = rolesById.get(roleId);
			if (role?.permissions) permissions = addPermissionBits(permissions, role.permissions);
		}
		return permissions;
	} catch {
		return null;
	}
}
/**
* Returns true when the user has ADMINISTRATOR or required permission bits
* matching the provided predicate.
*/
async function hasGuildPermissionsDiscord(guildId, userId, requiredPermissions, check, opts = {}) {
	const permissions = await fetchMemberGuildPermissionsDiscord(guildId, userId, opts);
	if (permissions === null) return false;
	if (hasAdministrator(permissions)) return true;
	return check(permissions, requiredPermissions);
}
/**
* Returns true when the user has ADMINISTRATOR or any required permission bit.
*/
async function hasAnyGuildPermissionDiscord(guildId, userId, requiredPermissions, opts = {}) {
	return await hasGuildPermissionsDiscord(guildId, userId, requiredPermissions, (permissions, required) => required.some((permission) => hasPermissionBit(permissions, permission)), opts);
}
/**
* Returns true when the user has ADMINISTRATOR or all required permission bits.
*/
async function hasAllGuildPermissionsDiscord(guildId, userId, requiredPermissions, opts = {}) {
	return await hasGuildPermissionsDiscord(guildId, userId, requiredPermissions, (permissions, required) => required.every((permission) => hasPermissionBit(permissions, permission)), opts);
}
async function fetchChannelPermissionsDiscord(channelId, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const channel = await rest.get(Routes.channel(channelId));
	const channelType = "type" in channel ? channel.type : void 0;
	const guildId = "guild_id" in channel ? channel.guild_id : void 0;
	if (!guildId) return {
		channelId,
		permissions: [],
		raw: "0",
		isDm: true,
		channelType
	};
	const botId = await fetchBotUserId(rest);
	const [guild, member] = await Promise.all([rest.get(Routes.guild(guildId)), rest.get(Routes.guildMember(guildId, botId))]);
	const rolesById = new Map((guild.roles ?? []).map((role) => [role.id, role]));
	const everyoneRole = rolesById.get(guildId);
	let base = 0n;
	if (everyoneRole?.permissions) base = addPermissionBits(base, everyoneRole.permissions);
	for (const roleId of member.roles ?? []) {
		const role = rolesById.get(roleId);
		if (role?.permissions) base = addPermissionBits(base, role.permissions);
	}
	if (hasAdministrator(base)) return {
		channelId,
		guildId,
		permissions: bitfieldToPermissions(ALL_PERMISSIONS),
		raw: ALL_PERMISSIONS.toString(),
		isDm: false,
		channelType
	};
	let permissions = base;
	const overwrites = "permission_overwrites" in channel ? channel.permission_overwrites ?? [] : [];
	for (const overwrite of overwrites) if (overwrite.id === guildId) {
		permissions = removePermissionBits(permissions, overwrite.deny ?? "0");
		permissions = addPermissionBits(permissions, overwrite.allow ?? "0");
	}
	for (const overwrite of overwrites) if (member.roles?.includes(overwrite.id)) {
		permissions = removePermissionBits(permissions, overwrite.deny ?? "0");
		permissions = addPermissionBits(permissions, overwrite.allow ?? "0");
	}
	for (const overwrite of overwrites) if (overwrite.id === botId) {
		permissions = removePermissionBits(permissions, overwrite.deny ?? "0");
		permissions = addPermissionBits(permissions, overwrite.allow ?? "0");
	}
	return {
		channelId,
		guildId,
		permissions: bitfieldToPermissions(permissions),
		raw: permissions.toString(),
		isDm: false,
		channelType
	};
}
//#endregion
//#region extensions/discord/src/send.types.ts
var DiscordSendError = class extends Error {
	constructor(message, opts) {
		super(message);
		this.name = "DiscordSendError";
		if (opts) Object.assign(this, opts);
	}
	toString() {
		return this.message;
	}
};
const DISCORD_MAX_EMOJI_BYTES = 256 * 1024;
const DISCORD_MAX_STICKER_BYTES = 512 * 1024;
//#endregion
//#region extensions/discord/src/send.shared.ts
const DISCORD_TEXT_LIMIT = 2e3;
const DISCORD_MAX_STICKERS = 3;
const DISCORD_POLL_MAX_ANSWERS = 10;
const DISCORD_POLL_MAX_DURATION_HOURS = 768;
const DISCORD_MISSING_PERMISSIONS = 50013;
const DISCORD_CANNOT_DM = 50007;
function normalizeReactionEmoji(raw) {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error("emoji required");
	const customMatch = trimmed.match(/^<a?:([^:>]+):(\d+)>$/);
	const identifier = customMatch ? `${customMatch[1]}:${customMatch[2]}` : trimmed.replace(/[\uFE0E\uFE0F]/g, "");
	return encodeURIComponent(identifier);
}
function normalizeStickerIds(raw) {
	const ids = raw.map((entry) => entry.trim()).filter(Boolean);
	if (ids.length === 0) throw new Error("At least one sticker id is required");
	if (ids.length > DISCORD_MAX_STICKERS) throw new Error("Discord supports up to 3 stickers per message");
	return ids;
}
function normalizeEmojiName(raw, label) {
	const name = raw.trim();
	if (!name) throw new Error(`${label} is required`);
	return name;
}
function normalizeDiscordPollInput(input) {
	const poll = normalizePollInput(input, { maxOptions: DISCORD_POLL_MAX_ANSWERS });
	const duration = normalizePollDurationHours(poll.durationHours, {
		defaultHours: 24,
		maxHours: DISCORD_POLL_MAX_DURATION_HOURS
	});
	return {
		question: { text: poll.question },
		answers: poll.options.map((answer) => ({ poll_media: { text: answer } })),
		duration,
		allow_multiselect: poll.maxSelections > 1,
		layout_type: PollLayoutType.Default
	};
}
function getDiscordErrorCode(err) {
	if (!err || typeof err !== "object") return;
	const candidate = "code" in err && err.code !== void 0 ? err.code : "rawError" in err && err.rawError && typeof err.rawError === "object" ? err.rawError.code : void 0;
	if (typeof candidate === "number") return candidate;
	if (typeof candidate === "string" && /^\d+$/.test(candidate)) return Number(candidate);
}
async function buildDiscordSendError(err, ctx) {
	if (err instanceof DiscordSendError) return err;
	const code = getDiscordErrorCode(err);
	if (code === DISCORD_CANNOT_DM) return new DiscordSendError("discord dm failed: user blocks dms or privacy settings disallow it", { kind: "dm-blocked" });
	if (code !== DISCORD_MISSING_PERMISSIONS) return err;
	let missing = [];
	try {
		const permissions = await fetchChannelPermissionsDiscord(ctx.channelId, {
			rest: ctx.rest,
			token: ctx.token
		});
		const current = new Set(permissions.permissions);
		const required = ["ViewChannel", "SendMessages"];
		if (isThreadChannelType(permissions.channelType)) required.push("SendMessagesInThreads");
		if (ctx.hasMedia) required.push("AttachFiles");
		missing = required.filter((permission) => !current.has(permission));
	} catch {}
	return new DiscordSendError(`${missing.length ? `missing permissions in channel ${ctx.channelId}: ${missing.join(", ")}` : `missing permissions in channel ${ctx.channelId}`}. bot might be muted or blocked by role/channel overrides`, {
		kind: "missing-permissions",
		channelId: ctx.channelId,
		missingPermissions: missing
	});
}
async function resolveChannelId(rest, recipient, request) {
	if (recipient.kind === "channel") return { channelId: recipient.id };
	const dmChannel = await request(() => rest.post(Routes.userChannels(), { body: { recipient_id: recipient.id } }), "dm-channel");
	if (!dmChannel?.id) throw new Error("Failed to create Discord DM channel");
	return {
		channelId: dmChannel.id,
		dm: true
	};
}
async function resolveDiscordChannelType(rest, channelId) {
	try {
		return (await rest.get(Routes.channel(channelId)))?.type;
	} catch {
		return;
	}
}
const SUPPRESS_NOTIFICATIONS_FLAG$1 = 4096;
function buildDiscordTextChunks(text, opts = {}) {
	if (!text) return [];
	return resolveTextChunksWithFallback(text, chunkDiscordTextWithMode(text, {
		maxChars: opts.maxChars ?? DISCORD_TEXT_LIMIT,
		maxLines: opts.maxLinesPerMessage,
		chunkMode: opts.chunkMode
	}));
}
function hasV2Components(components) {
	return Boolean(components?.some((component) => "isV2" in component && component.isV2));
}
function resolveDiscordSendComponents(params) {
	if (!params.components || !params.isFirst) return;
	return typeof params.components === "function" ? params.components(params.text) : params.components;
}
function normalizeDiscordEmbeds(embeds) {
	if (!embeds?.length) return;
	return embeds.map((embed) => embed instanceof Embed ? embed : new Embed(embed));
}
function resolveDiscordSendEmbeds(params) {
	if (!params.embeds || !params.isFirst) return;
	return normalizeDiscordEmbeds(params.embeds);
}
function buildDiscordMessagePayload(params) {
	const payload = {};
	const hasV2 = hasV2Components(params.components);
	const trimmed = params.text.trim();
	if (!hasV2 && trimmed) payload.content = params.text;
	if (params.components?.length) payload.components = params.components;
	if (!hasV2 && params.embeds?.length) payload.embeds = params.embeds;
	if (params.flags !== void 0) payload.flags = params.flags;
	if (params.files?.length) payload.files = params.files;
	return payload;
}
function stripUndefinedFields(value) {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== void 0));
}
function toDiscordFileBlob(data) {
	if (data instanceof Blob) return data;
	const arrayBuffer = new ArrayBuffer(data.byteLength);
	new Uint8Array(arrayBuffer).set(data);
	return new Blob([arrayBuffer]);
}
async function sendDiscordText(rest, channelId, text, replyTo, request, maxLinesPerMessage, components, embeds, chunkMode, silent) {
	if (!text.trim()) throw new Error("Message must be non-empty for Discord sends");
	const messageReference = replyTo ? {
		message_id: replyTo,
		fail_if_not_exists: false
	} : void 0;
	const flags = silent ? SUPPRESS_NOTIFICATIONS_FLAG$1 : void 0;
	const chunks = buildDiscordTextChunks(text, {
		maxLinesPerMessage,
		chunkMode
	});
	const sendChunk = async (chunk, isFirst) => {
		const body = stripUndefinedFields({
			...serializePayload(buildDiscordMessagePayload({
				text: chunk,
				components: resolveDiscordSendComponents({
					components,
					text: chunk,
					isFirst
				}),
				embeds: resolveDiscordSendEmbeds({
					embeds,
					isFirst
				}),
				flags
			})),
			...messageReference ? { message_reference: messageReference } : {}
		});
		return await request(() => rest.post(Routes.channelMessages(channelId), { body }), "text");
	};
	if (chunks.length === 1) return await sendChunk(chunks[0], true);
	let last = null;
	for (const [index, chunk] of chunks.entries()) last = await sendChunk(chunk, index === 0);
	if (!last) throw new Error("Discord send failed (empty chunk result)");
	return last;
}
async function sendDiscordMedia(rest, channelId, text, mediaUrl, filename, mediaLocalRoots, mediaReadFile, maxBytes, replyTo, request, maxLinesPerMessage, components, embeds, chunkMode, silent) {
	const media = await loadWebMedia(mediaUrl, buildOutboundMediaLoadOptions({
		maxBytes,
		mediaLocalRoots,
		mediaReadFile
	}));
	const resolvedFileName = filename?.trim() || media.fileName || (media.contentType ? `upload${extensionForMime(media.contentType) ?? ""}` : "") || "upload";
	const chunks = text ? buildDiscordTextChunks(text, {
		maxLinesPerMessage,
		chunkMode
	}) : [];
	const caption = chunks[0] ?? "";
	const messageReference = replyTo ? {
		message_id: replyTo,
		fail_if_not_exists: false
	} : void 0;
	const flags = silent ? SUPPRESS_NOTIFICATIONS_FLAG$1 : void 0;
	const fileData = toDiscordFileBlob(media.buffer);
	const payload = buildDiscordMessagePayload({
		text: caption,
		components: resolveDiscordSendComponents({
			components,
			text: caption,
			isFirst: true
		}),
		embeds: resolveDiscordSendEmbeds({
			embeds,
			isFirst: true
		}),
		flags,
		files: [{
			data: fileData,
			name: resolvedFileName
		}]
	});
	const res = await request(() => rest.post(Routes.channelMessages(channelId), { body: stripUndefinedFields({
		...serializePayload(payload),
		...messageReference ? { message_reference: messageReference } : {}
	}) }), "media");
	for (const chunk of chunks.slice(1)) {
		if (!chunk.trim()) continue;
		await sendDiscordText(rest, channelId, chunk, replyTo, request, maxLinesPerMessage, void 0, void 0, chunkMode, silent);
	}
	return res;
}
function buildReactionIdentifier(emoji) {
	if (emoji.id && emoji.name) return `${emoji.name}:${emoji.id}`;
	return emoji.name ?? "";
}
function formatReactionEmoji(emoji) {
	return buildReactionIdentifier(emoji);
}
//#endregion
//#region extensions/discord/src/send.channels.ts
async function createChannelDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const body = { name: payload.name };
	if (payload.type !== void 0) body.type = payload.type;
	if (payload.parentId) body.parent_id = payload.parentId;
	if (payload.topic) body.topic = payload.topic;
	if (payload.position !== void 0) body.position = payload.position;
	if (payload.nsfw !== void 0) body.nsfw = payload.nsfw;
	return await rest.post(Routes.guildChannels(payload.guildId), { body });
}
async function editChannelDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const body = {};
	if (payload.name !== void 0) body.name = payload.name;
	if (payload.topic !== void 0) body.topic = payload.topic;
	if (payload.position !== void 0) body.position = payload.position;
	if (payload.parentId !== void 0) body.parent_id = payload.parentId;
	if (payload.nsfw !== void 0) body.nsfw = payload.nsfw;
	if (payload.rateLimitPerUser !== void 0) body.rate_limit_per_user = payload.rateLimitPerUser;
	if (payload.archived !== void 0) body.archived = payload.archived;
	if (payload.locked !== void 0) body.locked = payload.locked;
	if (payload.autoArchiveDuration !== void 0) body.auto_archive_duration = payload.autoArchiveDuration;
	if (payload.availableTags !== void 0) body.available_tags = payload.availableTags.map((t) => ({
		...t.id !== void 0 && { id: t.id },
		name: t.name,
		...t.moderated !== void 0 && { moderated: t.moderated },
		...t.emoji_id !== void 0 && { emoji_id: t.emoji_id },
		...t.emoji_name !== void 0 && { emoji_name: t.emoji_name }
	}));
	return await rest.patch(Routes.channel(payload.channelId), { body });
}
async function deleteChannelDiscord(channelId, opts = {}) {
	await resolveDiscordRest(opts).delete(Routes.channel(channelId));
	return {
		ok: true,
		channelId
	};
}
async function moveChannelDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const body = [{
		id: payload.channelId,
		...payload.parentId !== void 0 && { parent_id: payload.parentId },
		...payload.position !== void 0 && { position: payload.position }
	}];
	await rest.patch(Routes.guildChannels(payload.guildId), { body });
	return { ok: true };
}
async function setChannelPermissionDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const body = { type: payload.targetType };
	if (payload.allow !== void 0) body.allow = payload.allow;
	if (payload.deny !== void 0) body.deny = payload.deny;
	await rest.put(`/channels/${payload.channelId}/permissions/${payload.targetId}`, { body });
	return { ok: true };
}
async function removeChannelPermissionDiscord(channelId, targetId, opts = {}) {
	await resolveDiscordRest(opts).delete(`/channels/${channelId}/permissions/${targetId}`);
	return { ok: true };
}
//#endregion
//#region extensions/discord/src/send.emojis-stickers.ts
async function listGuildEmojisDiscord(guildId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildEmojis(guildId));
}
async function uploadEmojiDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const media = await loadWebMediaRaw(payload.mediaUrl, DISCORD_MAX_EMOJI_BYTES);
	const contentType = media.contentType?.toLowerCase();
	if (!contentType || ![
		"image/png",
		"image/jpeg",
		"image/jpg",
		"image/gif"
	].includes(contentType)) throw new Error("Discord emoji uploads require a PNG, JPG, or GIF image");
	const image = `data:${contentType};base64,${media.buffer.toString("base64")}`;
	const roleIds = (payload.roleIds ?? []).map((id) => id.trim()).filter(Boolean);
	return await rest.post(Routes.guildEmojis(payload.guildId), { body: {
		name: normalizeEmojiName(payload.name, "Emoji name"),
		image,
		roles: roleIds.length ? roleIds : void 0
	} });
}
async function uploadStickerDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const media = await loadWebMediaRaw(payload.mediaUrl, DISCORD_MAX_STICKER_BYTES);
	const contentType = media.contentType?.toLowerCase();
	if (!contentType || ![
		"image/png",
		"image/apng",
		"application/json"
	].includes(contentType)) throw new Error("Discord sticker uploads require a PNG, APNG, or Lottie JSON file");
	return await rest.post(Routes.guildStickers(payload.guildId), { body: {
		name: normalizeEmojiName(payload.name, "Sticker name"),
		description: normalizeEmojiName(payload.description, "Sticker description"),
		tags: normalizeEmojiName(payload.tags, "Sticker tags"),
		files: [{
			data: media.buffer,
			name: media.fileName ?? "sticker",
			contentType
		}]
	} });
}
//#endregion
//#region extensions/discord/src/send.guild.ts
async function fetchMemberInfoDiscord(guildId, userId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildMember(guildId, userId));
}
async function fetchRoleInfoDiscord(guildId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildRoles(guildId));
}
async function addRoleDiscord(payload, opts = {}) {
	await resolveDiscordRest(opts).put(Routes.guildMemberRole(payload.guildId, payload.userId, payload.roleId));
	return { ok: true };
}
async function removeRoleDiscord(payload, opts = {}) {
	await resolveDiscordRest(opts).delete(Routes.guildMemberRole(payload.guildId, payload.userId, payload.roleId));
	return { ok: true };
}
async function fetchChannelInfoDiscord(channelId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.channel(channelId));
}
async function listGuildChannelsDiscord(guildId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildChannels(guildId));
}
async function fetchVoiceStatusDiscord(guildId, userId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildVoiceState(guildId, userId));
}
async function listScheduledEventsDiscord(guildId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.guildScheduledEvents(guildId));
}
async function createScheduledEventDiscord(guildId, payload, opts = {}) {
	return await resolveDiscordRest(opts).post(Routes.guildScheduledEvents(guildId), { body: payload });
}
async function timeoutMemberDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	let until = payload.until;
	if (!until && payload.durationMinutes) {
		const ms = payload.durationMinutes * 60 * 1e3;
		until = new Date(Date.now() + ms).toISOString();
	}
	return await rest.patch(Routes.guildMember(payload.guildId, payload.userId), {
		body: { communication_disabled_until: until ?? null },
		headers: payload.reason ? { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } : void 0
	});
}
async function kickMemberDiscord(payload, opts = {}) {
	await resolveDiscordRest(opts).delete(Routes.guildMember(payload.guildId, payload.userId), { headers: payload.reason ? { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } : void 0 });
	return { ok: true };
}
async function banMemberDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const deleteMessageDays = typeof payload.deleteMessageDays === "number" && Number.isFinite(payload.deleteMessageDays) ? Math.min(Math.max(Math.floor(payload.deleteMessageDays), 0), 7) : void 0;
	await rest.put(Routes.guildBan(payload.guildId, payload.userId), {
		body: deleteMessageDays !== void 0 ? { delete_message_days: deleteMessageDays } : void 0,
		headers: payload.reason ? { "X-Audit-Log-Reason": encodeURIComponent(payload.reason) } : void 0
	});
	return { ok: true };
}
//#endregion
//#region extensions/discord/src/send.messages.ts
async function readMessagesDiscord(channelId, query = {}, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const limit = typeof query.limit === "number" && Number.isFinite(query.limit) ? Math.min(Math.max(Math.floor(query.limit), 1), 100) : void 0;
	const params = {};
	if (limit) params.limit = limit;
	if (query.before) params.before = query.before;
	if (query.after) params.after = query.after;
	if (query.around) params.around = query.around;
	return await rest.get(Routes.channelMessages(channelId), params);
}
async function fetchMessageDiscord(channelId, messageId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.channelMessage(channelId, messageId));
}
async function editMessageDiscord(channelId, messageId, payload, opts = {}) {
	return await resolveDiscordRest(opts).patch(Routes.channelMessage(channelId, messageId), { body: { content: payload.content } });
}
async function deleteMessageDiscord(channelId, messageId, opts = {}) {
	await resolveDiscordRest(opts).delete(Routes.channelMessage(channelId, messageId));
	return { ok: true };
}
async function pinMessageDiscord(channelId, messageId, opts = {}) {
	await resolveDiscordRest(opts).put(Routes.channelPin(channelId, messageId));
	return { ok: true };
}
async function unpinMessageDiscord(channelId, messageId, opts = {}) {
	await resolveDiscordRest(opts).delete(Routes.channelPin(channelId, messageId));
	return { ok: true };
}
async function listPinsDiscord(channelId, opts = {}) {
	return await resolveDiscordRest(opts).get(Routes.channelPins(channelId));
}
async function createThreadDiscord(channelId, payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const body = { name: payload.name };
	if (payload.autoArchiveMinutes) body.auto_archive_duration = payload.autoArchiveMinutes;
	if (!payload.messageId && payload.type !== void 0) body.type = payload.type;
	let channelType;
	if (!payload.messageId) try {
		channelType = (await rest.get(Routes.channel(channelId)))?.type;
	} catch {
		channelType = void 0;
	}
	const isForumLike = channelType === ChannelType$2.GuildForum || channelType === ChannelType$2.GuildMedia;
	if (isForumLike) {
		body.message = { content: payload.content?.trim() ? payload.content : payload.name };
		if (payload.appliedTags?.length) body.applied_tags = payload.appliedTags;
	}
	if (!payload.messageId && !isForumLike && body.type === void 0) body.type = ChannelType$2.PublicThread;
	const route = payload.messageId ? Routes.threads(channelId, payload.messageId) : Routes.threads(channelId);
	const thread = await rest.post(route, { body });
	if (!isForumLike && payload.content?.trim()) await rest.post(Routes.channelMessages(thread.id), { body: { content: payload.content } });
	return thread;
}
async function listThreadsDiscord(payload, opts = {}) {
	const rest = resolveDiscordRest(opts);
	if (payload.includeArchived) {
		if (!payload.channelId) throw new Error("channelId required to list archived threads");
		const params = {};
		if (payload.before) params.before = payload.before;
		if (payload.limit) params.limit = payload.limit;
		return await rest.get(Routes.channelThreads(payload.channelId, "public"), params);
	}
	return await rest.get(Routes.guildActiveThreads(payload.guildId));
}
async function searchMessagesDiscord(query, opts = {}) {
	const rest = resolveDiscordRest(opts);
	const params = new URLSearchParams();
	params.set("content", query.content);
	if (query.channelIds?.length) for (const channelId of query.channelIds) params.append("channel_id", channelId);
	if (query.authorIds?.length) for (const authorId of query.authorIds) params.append("author_id", authorId);
	if (query.limit) {
		const limit = Math.min(Math.max(Math.floor(query.limit), 1), 25);
		params.set("limit", String(limit));
	}
	return await rest.get(`/guilds/${query.guildId}/messages/search?${params.toString()}`);
}
//#endregion
//#region extensions/discord/src/send-target-parsing.ts
function parseDiscordSendTarget(raw, options = {}) {
	const trimmed = raw.trim();
	if (!trimmed) return;
	const userTarget = parseMentionPrefixOrAtUserTarget({
		raw: trimmed,
		mentionPattern: /^<@!?(\d+)>$/,
		prefixes: [
			{
				prefix: "user:",
				kind: "user"
			},
			{
				prefix: "channel:",
				kind: "channel"
			},
			{
				prefix: "discord:",
				kind: "user"
			}
		],
		atUserPattern: /^\d+$/,
		atUserErrorMessage: "Discord DMs require a user id (use user:<id> or a <@id> mention)"
	});
	if (userTarget) return userTarget;
	if (/^\d+$/.test(trimmed)) {
		if (options.defaultKind) return buildMessagingTarget(options.defaultKind, trimmed, trimmed);
		throw new Error(options.ambiguousMessage ?? `Ambiguous Discord recipient "${trimmed}". Use "user:${trimmed}" for DMs or "channel:${trimmed}" for channel messages.`);
	}
	return buildMessagingTarget("channel", trimmed, trimmed);
}
//#endregion
//#region extensions/discord/src/target-resolver.ts
/**
* Resolve a Discord username to user ID using the directory lookup.
* This enables sending DMs by username instead of requiring explicit user IDs.
*/
async function resolveDiscordTarget(raw, options, parseOptions = {}) {
	const trimmed = raw.trim();
	if (!trimmed) return;
	const likelyUsername = isLikelyUsername(trimmed);
	const shouldLookup = isExplicitUserLookup(trimmed, parseOptions) || likelyUsername;
	const directParse = safeParseDiscordTarget(trimmed, parseOptions);
	if (directParse && directParse.kind !== "channel" && !likelyUsername) return directParse;
	if (!shouldLookup) return directParse ?? parseDiscordSendTarget(trimmed, parseOptions);
	try {
		const match = (await listDiscordDirectoryPeersLive({
			...options,
			query: trimmed,
			limit: 1
		}))[0];
		if (match && match.kind === "user") {
			const userId = match.id.replace(/^user:/, "");
			const resolvedAccountId = resolveDiscordAccount({
				cfg: options.cfg,
				accountId: options.accountId
			}).accountId;
			rememberDiscordDirectoryUser({
				accountId: resolvedAccountId,
				userId,
				handles: [
					trimmed,
					match.name,
					match.handle
				]
			});
			return buildMessagingTarget("user", userId, trimmed);
		}
	} catch {}
	return parseDiscordSendTarget(trimmed, parseOptions);
}
async function parseAndResolveDiscordTarget(raw, options, parseOptions = {}) {
	const resolved = await resolveDiscordTarget(raw, options, parseOptions) ?? parseDiscordSendTarget(raw, parseOptions);
	if (!resolved) throw new Error("Recipient is required for Discord sends");
	return resolved;
}
function safeParseDiscordTarget(input, options) {
	try {
		return parseDiscordSendTarget(input, options);
	} catch {
		return;
	}
}
function isExplicitUserLookup(input, options) {
	if (/^<@!?(\d+)>$/.test(input)) return true;
	if (/^(user:|discord:)/.test(input)) return true;
	if (input.startsWith("@")) return true;
	if (/^\d+$/.test(input)) return options.defaultKind === "user";
	return false;
}
function isLikelyUsername(input) {
	if (/^(user:|channel:|discord:|@|<@!?)|[\d]+$/.test(input)) return false;
	return true;
}
//#endregion
//#region extensions/discord/src/recipient-resolution.ts
async function parseAndResolveRecipient(raw, accountId, cfg) {
	const resolvedCfg = cfg ?? loadConfig();
	const accountInfo = resolveDiscordAccount({
		cfg: resolvedCfg,
		accountId
	});
	const trimmed = raw.trim();
	const parseOptions = { ambiguousMessage: `Ambiguous Discord recipient "${trimmed}". Use "user:${trimmed}" for DMs or "channel:${trimmed}" for channel messages.` };
	const resolved = await parseAndResolveDiscordTarget(raw, {
		cfg: resolvedCfg,
		accountId: accountInfo.accountId
	}, parseOptions);
	return {
		kind: resolved.kind,
		id: resolved.id
	};
}
//#endregion
//#region extensions/discord/src/voice-message.ts
/**
* Discord Voice Message Support
*
* Implements sending voice messages via Discord's API.
* Voice messages require:
* - OGG/Opus format audio
* - Waveform data (base64 encoded, up to 256 samples, 0-255 values)
* - Duration in seconds
* - Message flag 8192 (IS_VOICE_MESSAGE)
* - No other content (text, embeds, etc.)
*/
const DISCORD_VOICE_MESSAGE_FLAG = 8192;
const SUPPRESS_NOTIFICATIONS_FLAG = 4096;
const WAVEFORM_SAMPLES = 256;
const DISCORD_OPUS_SAMPLE_RATE_HZ = 48e3;
function createRateLimitError(response, body, request) {
	return new RateLimitError(response, body, request ?? new Request("https://discord.com/api/v10/channels/voice/messages", { method: "POST" }));
}
/**
* Get audio duration using ffprobe
*/
async function getAudioDuration(filePath) {
	try {
		const stdout = await runFfprobe([
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"csv=p=0",
			filePath
		]);
		const duration = parseFloat(stdout.trim());
		if (isNaN(duration)) throw new Error("Could not parse duration");
		return Math.round(duration * 100) / 100;
	} catch (err) {
		const errMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to get audio duration: ${errMessage}`, { cause: err });
	}
}
/**
* Generate waveform data from audio file using ffmpeg
* Returns base64 encoded byte array of amplitude samples (0-255)
*/
async function generateWaveform(filePath) {
	try {
		return await generateWaveformFromPcm(filePath);
	} catch {
		return generatePlaceholderWaveform();
	}
}
/**
* Generate waveform by extracting raw PCM data and sampling amplitudes
*/
async function generateWaveformFromPcm(filePath) {
	const tempDir = resolvePreferredOpenClawTmpDir();
	const tempPcm = path.join(tempDir, `waveform-${crypto.randomUUID()}.raw`);
	try {
		await runFfmpeg([
			"-y",
			"-i",
			filePath,
			"-vn",
			"-sn",
			"-dn",
			"-t",
			String(MEDIA_FFMPEG_MAX_AUDIO_DURATION_SECS),
			"-f",
			"s16le",
			"-acodec",
			"pcm_s16le",
			"-ac",
			"1",
			"-ar",
			"8000",
			tempPcm
		]);
		const pcmData = await fs.readFile(tempPcm);
		const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
		const step = Math.max(1, Math.floor(samples.length / WAVEFORM_SAMPLES));
		const waveform = [];
		for (let i = 0; i < WAVEFORM_SAMPLES && i * step < samples.length; i++) {
			let sum = 0;
			let count = 0;
			for (let j = 0; j < step && i * step + j < samples.length; j++) {
				sum += Math.abs(samples[i * step + j]);
				count++;
			}
			const avg = count > 0 ? sum / count : 0;
			const normalized = Math.min(255, Math.round(avg / 32767 * 255));
			waveform.push(normalized);
		}
		while (waveform.length < WAVEFORM_SAMPLES) waveform.push(0);
		return Buffer.from(waveform).toString("base64");
	} finally {
		await unlinkIfExists(tempPcm);
	}
}
/**
* Generate a placeholder waveform (for when audio processing fails)
*/
function generatePlaceholderWaveform() {
	const waveform = [];
	for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
		const value = Math.round(128 + 64 * Math.sin(i / WAVEFORM_SAMPLES * Math.PI * 8));
		waveform.push(Math.min(255, Math.max(0, value)));
	}
	return Buffer.from(waveform).toString("base64");
}
/**
* Convert audio file to OGG/Opus format if needed
* Returns path to the OGG file (may be same as input if already OGG/Opus)
*/
async function ensureOggOpus(filePath) {
	const trimmed = filePath.trim();
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) throw new Error(`Voice message conversion requires a local file path; received a URL/protocol source: ${trimmed}`);
	if (path.extname(filePath).toLowerCase() === ".ogg") try {
		const { codec, sampleRateHz } = parseFfprobeCodecAndSampleRate(await runFfprobe([
			"-v",
			"error",
			"-select_streams",
			"a:0",
			"-show_entries",
			"stream=codec_name,sample_rate",
			"-of",
			"csv=p=0",
			filePath
		]));
		if (codec === "opus" && sampleRateHz === DISCORD_OPUS_SAMPLE_RATE_HZ) return {
			path: filePath,
			cleanup: false
		};
	} catch {}
	const tempDir = resolvePreferredOpenClawTmpDir();
	const outputPath = path.join(tempDir, `voice-${crypto.randomUUID()}.ogg`);
	await runFfmpeg([
		"-y",
		"-i",
		filePath,
		"-vn",
		"-sn",
		"-dn",
		"-t",
		String(MEDIA_FFMPEG_MAX_AUDIO_DURATION_SECS),
		"-ar",
		String(DISCORD_OPUS_SAMPLE_RATE_HZ),
		"-c:a",
		"libopus",
		"-b:a",
		"64k",
		outputPath
	]);
	return {
		path: outputPath,
		cleanup: true
	};
}
/**
* Get voice message metadata (duration and waveform)
*/
async function getVoiceMessageMetadata(filePath) {
	const [durationSecs, waveform] = await Promise.all([getAudioDuration(filePath), generateWaveform(filePath)]);
	return {
		durationSecs,
		waveform
	};
}
/**
* Send a voice message to Discord
*
* This follows Discord's voice message protocol:
* 1. Request upload URL from Discord
* 2. Upload the OGG file to the provided URL
* 3. Send the message with flag 8192 and attachment metadata
*/
async function sendDiscordVoiceMessage(rest, channelId, audioBuffer, metadata, replyTo, request, silent, token) {
	const filename = "voice-message.ogg";
	const fileSize = audioBuffer.byteLength;
	const botToken = token;
	if (!botToken) throw new Error("Discord bot token is required for voice message upload");
	const uploadUrlResponse = await request(async () => {
		const url = `${rest.options?.baseUrl ?? "https://discord.com/api"}/channels/${channelId}/attachments`;
		const uploadUrlRequest = new Request(url, {
			method: "POST",
			headers: {
				Authorization: `Bot ${botToken}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ files: [{
				filename,
				file_size: fileSize,
				id: "0"
			}] })
		});
		const res = await fetch(uploadUrlRequest);
		if (!res.ok) {
			if (res.status === 429) {
				const retryData = await res.json().catch(() => ({}));
				throw createRateLimitError(res, {
					message: retryData.message ?? "You are being rate limited.",
					retry_after: retryData.retry_after ?? 1,
					global: retryData.global ?? false
				});
			}
			const errorBody = await res.json().catch(() => null);
			const err = /* @__PURE__ */ new Error(`Upload URL request failed: ${res.status} ${errorBody?.message ?? ""}`);
			if (errorBody?.code !== void 0) err.code = errorBody.code;
			throw err;
		}
		return await res.json();
	}, "voice-upload-url");
	if (!uploadUrlResponse.attachments?.[0]) throw new Error("Failed to get upload URL for voice message");
	const { upload_url, upload_filename } = uploadUrlResponse.attachments[0];
	const uploadResponse = await fetch(upload_url, {
		method: "PUT",
		headers: { "Content-Type": "audio/ogg" },
		body: new Uint8Array(audioBuffer)
	});
	if (!uploadResponse.ok) throw new Error(`Failed to upload voice message: ${uploadResponse.status}`);
	const messagePayload = {
		flags: silent ? DISCORD_VOICE_MESSAGE_FLAG | SUPPRESS_NOTIFICATIONS_FLAG : DISCORD_VOICE_MESSAGE_FLAG,
		attachments: [{
			id: "0",
			filename,
			uploaded_filename: upload_filename,
			duration_secs: metadata.durationSecs,
			waveform: metadata.waveform
		}]
	};
	if (replyTo) messagePayload.message_reference = {
		message_id: replyTo,
		fail_if_not_exists: false
	};
	return await request(() => rest.post(`/channels/${channelId}/messages`, { body: messagePayload }), "voice-message");
}
//#endregion
//#region extensions/discord/src/send.outbound.ts
const DEFAULT_DISCORD_MEDIA_MAX_MB = 100;
async function sendDiscordThreadTextChunks(params) {
	for (const chunk of params.chunks) await sendDiscordText(params.rest, params.threadId, chunk, void 0, params.request, params.maxLinesPerMessage, void 0, void 0, params.chunkMode, params.silent);
}
/** Discord thread names are capped at 100 characters. */
const DISCORD_THREAD_NAME_LIMIT = 100;
/** Derive a thread title from the first non-empty line of the message text. */
function deriveForumThreadName(text) {
	return (text.split("\n").find((l) => l.trim())?.trim() ?? "").slice(0, DISCORD_THREAD_NAME_LIMIT) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 16);
}
/** Forum/Media channels cannot receive regular messages; detect them here. */
function isForumLikeType(channelType) {
	return channelType === ChannelType$2.GuildForum || channelType === ChannelType$2.GuildMedia;
}
function toDiscordSendResult(result, fallbackChannelId) {
	return {
		messageId: result.id ? String(result.id) : "unknown",
		channelId: String(result.channel_id ?? fallbackChannelId)
	};
}
async function resolveDiscordSendTarget(to, opts) {
	const cfg = opts.cfg ?? loadConfig();
	const { rest, request } = createDiscordClient(opts, cfg);
	const { channelId } = await resolveChannelId(rest, await parseAndResolveRecipient(to, opts.accountId, cfg), request);
	return {
		rest,
		request,
		channelId
	};
}
async function sendMessageDiscord(to, text, opts = {}) {
	const cfg = opts.cfg ?? loadConfig();
	const accountInfo = resolveDiscordAccount({
		cfg,
		accountId: opts.accountId
	});
	const tableMode = resolveMarkdownTableMode({
		cfg,
		channel: "discord",
		accountId: accountInfo.accountId
	});
	const chunkMode = resolveChunkMode(cfg, "discord", accountInfo.accountId);
	const mediaMaxBytes = typeof accountInfo.config.mediaMaxMb === "number" ? accountInfo.config.mediaMaxMb * 1024 * 1024 : DEFAULT_DISCORD_MEDIA_MAX_MB * 1024 * 1024;
	const textWithTables = convertMarkdownTables(text ?? "", tableMode);
	const textWithMentions = rewriteDiscordKnownMentions(textWithTables, { accountId: accountInfo.accountId });
	const { token, rest, request } = createDiscordClient(opts, cfg);
	const { channelId } = await resolveChannelId(rest, await parseAndResolveRecipient(to, opts.accountId, cfg), request);
	if (isForumLikeType(await resolveDiscordChannelType(rest, channelId))) {
		const threadName = deriveForumThreadName(textWithTables);
		const chunks = buildDiscordTextChunks(textWithMentions, {
			maxLinesPerMessage: accountInfo.config.maxLinesPerMessage,
			chunkMode
		});
		const starterContent = chunks[0]?.trim() ? chunks[0] : threadName;
		const starterPayload = buildDiscordMessagePayload({
			text: starterContent,
			components: resolveDiscordSendComponents({
				components: opts.components,
				text: starterContent,
				isFirst: true
			}),
			embeds: resolveDiscordSendEmbeds({
				embeds: opts.embeds,
				isFirst: true
			}),
			flags: opts.silent ? 4096 : void 0
		});
		let threadRes;
		try {
			threadRes = await request(() => rest.post(Routes.threads(channelId), { body: {
				name: threadName,
				message: stripUndefinedFields(serializePayload(starterPayload))
			} }), "forum-thread");
		} catch (err) {
			throw await buildDiscordSendError(err, {
				channelId,
				rest,
				token,
				hasMedia: Boolean(opts.mediaUrl)
			});
		}
		const threadId = threadRes.id;
		const messageId = threadRes.message?.id ?? threadId;
		const resultChannelId = threadRes.message?.channel_id ?? threadId;
		const remainingChunks = chunks.slice(1);
		try {
			if (opts.mediaUrl) {
				const [mediaCaption, ...afterMediaChunks] = remainingChunks;
				await sendDiscordMedia(rest, threadId, mediaCaption ?? "", opts.mediaUrl, opts.filename, opts.mediaLocalRoots, opts.mediaReadFile, mediaMaxBytes, void 0, request, accountInfo.config.maxLinesPerMessage, void 0, void 0, chunkMode, opts.silent);
				await sendDiscordThreadTextChunks({
					rest,
					threadId,
					chunks: afterMediaChunks,
					request,
					maxLinesPerMessage: accountInfo.config.maxLinesPerMessage,
					chunkMode,
					silent: opts.silent
				});
			} else await sendDiscordThreadTextChunks({
				rest,
				threadId,
				chunks: remainingChunks,
				request,
				maxLinesPerMessage: accountInfo.config.maxLinesPerMessage,
				chunkMode,
				silent: opts.silent
			});
		} catch (err) {
			throw await buildDiscordSendError(err, {
				channelId: threadId,
				rest,
				token,
				hasMedia: Boolean(opts.mediaUrl)
			});
		}
		recordChannelActivity({
			channel: "discord",
			accountId: accountInfo.accountId,
			direction: "outbound"
		});
		return toDiscordSendResult({
			id: messageId,
			channel_id: resultChannelId
		}, channelId);
	}
	let result;
	try {
		if (opts.mediaUrl) result = await sendDiscordMedia(rest, channelId, textWithMentions, opts.mediaUrl, opts.filename, opts.mediaLocalRoots, opts.mediaReadFile, mediaMaxBytes, opts.replyTo, request, accountInfo.config.maxLinesPerMessage, opts.components, opts.embeds, chunkMode, opts.silent);
		else result = await sendDiscordText(rest, channelId, textWithMentions, opts.replyTo, request, accountInfo.config.maxLinesPerMessage, opts.components, opts.embeds, chunkMode, opts.silent);
	} catch (err) {
		throw await buildDiscordSendError(err, {
			channelId,
			rest,
			token,
			hasMedia: Boolean(opts.mediaUrl)
		});
	}
	recordChannelActivity({
		channel: "discord",
		accountId: accountInfo.accountId,
		direction: "outbound"
	});
	return toDiscordSendResult(result, channelId);
}
function resolveWebhookExecutionUrl(params) {
	const baseUrl = new URL(`https://discord.com/api/v10/webhooks/${encodeURIComponent(params.webhookId)}/${encodeURIComponent(params.webhookToken)}`);
	baseUrl.searchParams.set("wait", params.wait === false ? "false" : "true");
	if (params.threadId !== void 0 && params.threadId !== null && params.threadId !== "") baseUrl.searchParams.set("thread_id", String(params.threadId));
	return baseUrl.toString();
}
async function sendWebhookMessageDiscord(text, opts) {
	const webhookId = opts.webhookId.trim();
	const webhookToken = opts.webhookToken.trim();
	if (!webhookId || !webhookToken) throw new Error("Discord webhook id/token are required");
	const replyTo = typeof opts.replyTo === "string" ? opts.replyTo.trim() : "";
	const messageReference = replyTo ? {
		message_id: replyTo,
		fail_if_not_exists: false
	} : void 0;
	const { account, proxyFetch } = resolveDiscordClientAccountContext({
		cfg: opts.cfg,
		accountId: opts.accountId
	});
	const rewrittenText = rewriteDiscordKnownMentions(text, { accountId: account.accountId });
	const response = await (proxyFetch ?? fetch)(resolveWebhookExecutionUrl({
		webhookId,
		webhookToken,
		threadId: opts.threadId,
		wait: opts.wait
	}), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			content: rewrittenText,
			username: opts.username?.trim() || void 0,
			avatar_url: opts.avatarUrl?.trim() || void 0,
			...messageReference ? { message_reference: messageReference } : {}
		})
	});
	if (!response.ok) {
		const raw = await response.text().catch(() => "");
		throw new Error(`Discord webhook send failed (${response.status}${raw ? `: ${raw.slice(0, 200)}` : ""})`);
	}
	const payload = await response.json().catch(() => ({}));
	try {
		recordChannelActivity({
			channel: "discord",
			accountId: account.accountId,
			direction: "outbound"
		});
	} catch {}
	return {
		messageId: payload.id ? String(payload.id) : "unknown",
		channelId: payload.channel_id ? String(payload.channel_id) : opts.threadId ? String(opts.threadId) : ""
	};
}
async function sendStickerDiscord(to, stickerIds, opts = {}) {
	const accountInfo = resolveDiscordAccount({
		cfg: opts.cfg ?? loadConfig(),
		accountId: opts.accountId
	});
	const { rest, request, channelId } = await resolveDiscordSendTarget(to, opts);
	const content = opts.content?.trim();
	const rewrittenContent = content ? rewriteDiscordKnownMentions(content, { accountId: accountInfo.accountId }) : void 0;
	const stickers = normalizeStickerIds(stickerIds);
	return toDiscordSendResult(await request(() => rest.post(Routes.channelMessages(channelId), { body: {
		content: rewrittenContent || void 0,
		sticker_ids: stickers
	} }), "sticker"), channelId);
}
async function sendPollDiscord(to, poll, opts = {}) {
	const accountInfo = resolveDiscordAccount({
		cfg: opts.cfg ?? loadConfig(),
		accountId: opts.accountId
	});
	const { rest, request, channelId } = await resolveDiscordSendTarget(to, opts);
	const content = opts.content?.trim();
	const rewrittenContent = content ? rewriteDiscordKnownMentions(content, { accountId: accountInfo.accountId }) : void 0;
	if (poll.durationSeconds !== void 0) throw new Error("Discord polls do not support durationSeconds; use durationHours");
	const payload = normalizeDiscordPollInput(poll);
	const flags = opts.silent ? SUPPRESS_NOTIFICATIONS_FLAG$1 : void 0;
	return toDiscordSendResult(await request(() => rest.post(Routes.channelMessages(channelId), { body: {
		content: rewrittenContent || void 0,
		poll: payload,
		...flags ? { flags } : {}
	} }), "poll"), channelId);
}
async function materializeVoiceMessageInput(mediaUrl) {
	const media = await loadWebMediaRaw(mediaUrl, maxBytesForKind("audio"));
	const extFromName = media.fileName ? path.extname(media.fileName) : "";
	const extFromMime = media.contentType ? extensionForMime(media.contentType) : "";
	const ext = extFromName || extFromMime || ".bin";
	const tempDir = resolvePreferredOpenClawTmpDir();
	const filePath = path.join(tempDir, `voice-src-${crypto.randomUUID()}${ext}`);
	await fs.writeFile(filePath, media.buffer, { mode: 384 });
	return { filePath };
}
/**
* Send a voice message to Discord.
*
* Voice messages are a special Discord feature that displays audio with a waveform
* visualization. They require OGG/Opus format and cannot include text content.
*
* @param to - Recipient (user ID for DM or channel ID)
* @param audioPath - Path to local audio file (will be converted to OGG/Opus if needed)
* @param opts - Send options
*/
async function sendVoiceMessageDiscord(to, audioPath, opts = {}) {
	const { filePath: localInputPath } = await materializeVoiceMessageInput(audioPath);
	let oggPath = null;
	let oggCleanup = false;
	let token;
	let rest;
	let channelId;
	try {
		const cfg = opts.cfg ?? loadConfig();
		const accountInfo = resolveDiscordAccount({
			cfg,
			accountId: opts.accountId
		});
		const client = createDiscordClient(opts, cfg);
		token = client.token;
		rest = client.rest;
		const request = client.request;
		const recipient = await parseAndResolveRecipient(to, opts.accountId, cfg);
		channelId = (await resolveChannelId(rest, recipient, request)).channelId;
		const ogg = await ensureOggOpus(localInputPath);
		oggPath = ogg.path;
		oggCleanup = ogg.cleanup;
		const metadata = await getVoiceMessageMetadata(oggPath);
		const audioBuffer = await fs.readFile(oggPath);
		const result = await sendDiscordVoiceMessage(rest, channelId, audioBuffer, metadata, opts.replyTo, request, opts.silent, token);
		recordChannelActivity({
			channel: "discord",
			accountId: accountInfo.accountId,
			direction: "outbound"
		});
		return toDiscordSendResult(result, channelId);
	} catch (err) {
		if (channelId && rest && token) throw await buildDiscordSendError(err, {
			channelId,
			rest,
			token,
			hasMedia: true
		});
		throw err;
	} finally {
		await unlinkIfExists(oggCleanup ? oggPath : null);
		await unlinkIfExists(localInputPath);
	}
}
//#endregion
//#region extensions/discord/src/send.typing.ts
async function sendTypingDiscord(channelId, opts = {}) {
	await resolveDiscordRest(opts).post(Routes.channelTyping(channelId));
	return {
		ok: true,
		channelId
	};
}
//#endregion
//#region extensions/discord/src/send.reactions.ts
function createDiscordReactionRuntimeClient(opts) {
	return createDiscordClient(opts, opts.cfg);
}
function resolveDiscordReactionClient(opts) {
	return createDiscordClient(opts, opts.cfg ?? loadConfig());
}
function isDiscordReactionRuntimeContext(opts) {
	return Boolean(opts.rest && opts.cfg && opts.accountId);
}
async function reactMessageDiscord(channelId, messageId, emoji, opts = {}) {
	const { rest, request } = isDiscordReactionRuntimeContext(opts) ? createDiscordReactionRuntimeClient(opts) : resolveDiscordReactionClient(opts);
	const encoded = normalizeReactionEmoji(emoji);
	await request(() => rest.put(Routes.channelMessageOwnReaction(channelId, messageId, encoded)), "react");
	return { ok: true };
}
async function removeReactionDiscord(channelId, messageId, emoji, opts = {}) {
	const { rest } = isDiscordReactionRuntimeContext(opts) ? createDiscordReactionRuntimeClient(opts) : resolveDiscordReactionClient(opts);
	const encoded = normalizeReactionEmoji(emoji);
	await rest.delete(Routes.channelMessageOwnReaction(channelId, messageId, encoded));
	return { ok: true };
}
async function removeOwnReactionsDiscord(channelId, messageId, opts = {}) {
	const { rest } = isDiscordReactionRuntimeContext(opts) ? createDiscordReactionRuntimeClient(opts) : resolveDiscordReactionClient(opts);
	const message = await rest.get(Routes.channelMessage(channelId, messageId));
	const identifiers = /* @__PURE__ */ new Set();
	for (const reaction of message.reactions ?? []) {
		const identifier = buildReactionIdentifier(reaction.emoji);
		if (identifier) identifiers.add(identifier);
	}
	if (identifiers.size === 0) return {
		ok: true,
		removed: []
	};
	const removed = [];
	await Promise.allSettled(Array.from(identifiers, (identifier) => {
		removed.push(identifier);
		return rest.delete(Routes.channelMessageOwnReaction(channelId, messageId, normalizeReactionEmoji(identifier)));
	}));
	return {
		ok: true,
		removed
	};
}
async function fetchReactionsDiscord(channelId, messageId, opts = {}) {
	const { rest } = isDiscordReactionRuntimeContext(opts) ? createDiscordReactionRuntimeClient(opts) : resolveDiscordReactionClient(opts);
	const reactions = (await rest.get(Routes.channelMessage(channelId, messageId))).reactions ?? [];
	if (reactions.length === 0) return [];
	const limit = typeof opts.limit === "number" && Number.isFinite(opts.limit) ? Math.min(Math.max(Math.floor(opts.limit), 1), 100) : 100;
	const summaries = [];
	for (const reaction of reactions) {
		const identifier = buildReactionIdentifier(reaction.emoji);
		if (!identifier) continue;
		const encoded = encodeURIComponent(identifier);
		const users = await rest.get(Routes.channelMessageReaction(channelId, messageId, encoded), { limit });
		summaries.push({
			emoji: {
				id: reaction.emoji.id ?? null,
				name: reaction.emoji.name ?? null,
				raw: formatReactionEmoji(reaction.emoji)
			},
			count: reaction.count,
			users: users.map((user) => ({
				id: user.id,
				username: user.username,
				tag: user.username && user.discriminator ? `${user.username}#${user.discriminator}` : user.username
			}))
		});
	}
	return summaries;
}
//#endregion
export { fetchMemberGuildPermissionsDiscord as $, kickMemberDiscord as A, editChannelDiscord as B, addRoleDiscord as C, fetchMemberInfoDiscord as D, fetchChannelInfoDiscord as E, listGuildEmojisDiscord as F, buildDiscordSendError as G, removeChannelPermissionDiscord as H, uploadEmojiDiscord as I, sendDiscordText as J, resolveChannelId as K, uploadStickerDiscord as L, listScheduledEventsDiscord as M, removeRoleDiscord as N, fetchRoleInfoDiscord as O, timeoutMemberDiscord as P, fetchChannelPermissionsDiscord as Q, createChannelDiscord as R, unpinMessageDiscord as S, createScheduledEventDiscord as T, setChannelPermissionDiscord as U, moveChannelDiscord as V, SUPPRESS_NOTIFICATIONS_FLAG$1 as W, toDiscordFileBlob as X, stripUndefinedFields as Y, DiscordSendError as Z, listPinsDiscord as _, sendTypingDiscord as a, createDiscordRetryRunner as at, readMessagesDiscord as b, sendStickerDiscord as c, validateDiscordProxyUrl as ct, parseAndResolveRecipient as d, hasAllGuildPermissionsDiscord as et, resolveDiscordTarget as f, fetchMessageDiscord as g, editMessageDiscord as h, removeReactionDiscord as i, createDiscordRuntimeAccountContext as it, listGuildChannelsDiscord as j, fetchVoiceStatusDiscord as k, sendVoiceMessageDiscord as l, withValidatedDiscordProxy as lt, deleteMessageDiscord as m, reactMessageDiscord as n, createDiscordClient as nt, sendMessageDiscord as o, createDiscordRequestClient as ot, createThreadDiscord as p, resolveDiscordChannelType as q, removeOwnReactionsDiscord as r, createDiscordRestClient as rt, sendPollDiscord as s, resolveDiscordProxyFetchForAccount as st, fetchReactionsDiscord as t, hasAnyGuildPermissionDiscord as tt, sendWebhookMessageDiscord as u, chunkDiscordTextWithMode as ut, listThreadsDiscord as v, banMemberDiscord as w, searchMessagesDiscord as x, pinMessageDiscord as y, deleteChannelDiscord as z };
