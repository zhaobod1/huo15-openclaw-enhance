import { i as openBoundaryFileSync } from "./boundary-file-read-CdxVvait.js";
import { t as resolveAgentModelFallbackValues } from "./model-input-BvHDuFyu.js";
import { _ as resolveStateDir } from "./paths-yyDPxM31.js";
import { c as normalizeAgentId, l as normalizeMainKey, w as parseAgentSessionKey, x as isCronRunSessionKey } from "./session-key-BR3Z-ljs.js";
import { m as resolveDefaultAgentId, o as resolveAgentEffectiveModelPrimary, p as resolveAgentWorkspaceDir, u as resolveAgentModelFallbacksOverride } from "./agent-scope-CXWTwwic.js";
import { d as parseModelRef, h as resolveDefaultModelForAgent, m as resolveConfiguredModelRef, o as inferUniqueProviderFromConfiguredModels, v as resolvePersistedModelRef } from "./model-selection-BVM4eHHo.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-I0_TmVEm.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { d as resolveAvatarMime, i as isAvatarHttpUrl, l as isWorkspaceRelativeAvatarPath, o as isPathWithinRoot, r as isAvatarDataUrl, t as AVATAR_MAX_BYTES } from "./avatar-policy-BCnKqB6F.js";
import "./config-dzPpvDz6.js";
import { g as buildGroupDisplayName } from "./store-Cx4GsUxp.js";
import { i as resolveMainSessionKey, n as resolveAgentMainSessionKey, t as canonicalizeMainSessionAlias } from "./main-session-D-BGz7Y3.js";
import "./sessions-D5EF_laP.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { a as resolveFreshSessionTotalTokens } from "./types-CT9QkK_u.js";
import { o as normalizeSessionDeliveryFields } from "./delivery-context-uGixCTFh.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { n as resolveAllAgentSessionStoreTargetsSync } from "./targets-DRZWnRxv.js";
import { r as hasInterSessionUserProvenance } from "./input-provenance-B5UbDNg3.js";
import { r as stripInlineDirectiveTagsForDisplay } from "./directive-tags-D22CKjc1.js";
import { n as extractAssistantVisibleText } from "./chat-message-content-qTIElPJw.js";
import { a as getSubagentSessionStartedAt, c as resolveSubagentSessionStatus, i as getSubagentSessionRuntimeMs, r as getSessionDisplaySubagentRunByChildSessionKey, s as listSubagentRunsForController } from "./subagent-registry-read-1vaRgz-h.js";
import { n as resolveContextTokensForModel, t as lookupContextTokens } from "./context-BozTgpbo.js";
import { a as normalizeUsage, n as deriveSessionTotalTokens, r as hasNonzeroUsage } from "./usage-CzcPoJlb.js";
import { a as resolveModelCostConfig, n as estimateUsageCost } from "./usage-format-B6wsX5Cv.js";
import { a as hasToolCall, i as extractToolCallNames, n as stripMessageIdHints, t as stripEnvelope } from "./chat-envelope-BQv47-tJ.js";
import { n as stripInboundMetadata, t as extractInboundSenderLabel } from "./strip-inbound-meta-Db4BIjfg.js";
import { a as resolveSessionTranscriptCandidates } from "./session-transcript-files.fs-DtxJbeOd.js";
import fs from "node:fs";
import path from "node:path";
//#region src/infra/json-utf8-bytes.ts
function jsonUtf8Bytes(value) {
	try {
		return Buffer.byteLength(JSON.stringify(value), "utf8");
	} catch {
		return Buffer.byteLength(String(value), "utf8");
	}
}
//#endregion
//#region src/gateway/chat-sanitize.ts
function extractMessageSenderLabel(entry) {
	if (typeof entry.senderLabel === "string" && entry.senderLabel.trim()) return entry.senderLabel.trim();
	if (typeof entry.content === "string") return extractInboundSenderLabel(entry.content);
	if (Array.isArray(entry.content)) for (const item of entry.content) {
		if (!item || typeof item !== "object") continue;
		const text = item.text;
		if (typeof text !== "string") continue;
		const senderLabel = extractInboundSenderLabel(text);
		if (senderLabel) return senderLabel;
	}
	if (typeof entry.text === "string") return extractInboundSenderLabel(entry.text);
	return null;
}
function stripEnvelopeFromContentWithRole(content, stripUserEnvelope) {
	let changed = false;
	return {
		content: content.map((item) => {
			if (!item || typeof item !== "object") return item;
			const entry = item;
			if (entry.type !== "text" || typeof entry.text !== "string") return item;
			const inboundStripped = stripInboundMetadata(entry.text);
			const stripped = stripUserEnvelope ? stripMessageIdHints(stripEnvelope(inboundStripped)) : inboundStripped;
			if (stripped === entry.text) return item;
			changed = true;
			return {
				...entry,
				text: stripped
			};
		}),
		changed
	};
}
function stripEnvelopeFromMessage(message) {
	if (!message || typeof message !== "object") return message;
	const entry = message;
	const stripUserEnvelope = (typeof entry.role === "string" ? entry.role.toLowerCase() : "") === "user";
	let changed = false;
	const next = { ...entry };
	const senderLabel = stripUserEnvelope ? extractMessageSenderLabel(entry) : null;
	if (senderLabel && entry.senderLabel !== senderLabel) {
		next.senderLabel = senderLabel;
		changed = true;
	}
	if (typeof entry.content === "string") {
		const inboundStripped = stripInboundMetadata(entry.content);
		const stripped = stripUserEnvelope ? stripMessageIdHints(stripEnvelope(inboundStripped)) : inboundStripped;
		if (stripped !== entry.content) {
			next.content = stripped;
			changed = true;
		}
	} else if (Array.isArray(entry.content)) {
		const updated = stripEnvelopeFromContentWithRole(entry.content, stripUserEnvelope);
		if (updated.changed) {
			next.content = updated.content;
			changed = true;
		}
	} else if (typeof entry.text === "string") {
		const inboundStripped = stripInboundMetadata(entry.text);
		const stripped = stripUserEnvelope ? stripMessageIdHints(stripEnvelope(inboundStripped)) : inboundStripped;
		if (stripped !== entry.text) {
			next.text = stripped;
			changed = true;
		}
	}
	return changed ? next : message;
}
function stripEnvelopeFromMessages(messages) {
	if (messages.length === 0) return messages;
	let changed = false;
	const next = messages.map((message) => {
		const stripped = stripEnvelopeFromMessage(message);
		if (stripped !== message) changed = true;
		return stripped;
	});
	return changed ? next : messages;
}
//#endregion
//#region src/gateway/session-utils.fs.ts
const sessionTitleFieldsCache = /* @__PURE__ */ new Map();
const MAX_SESSION_TITLE_FIELDS_CACHE_ENTRIES = 5e3;
function readSessionTitleFieldsCacheKey(filePath, opts) {
	return `${filePath}\t${opts?.includeInterSession === true ? "1" : "0"}`;
}
function getCachedSessionTitleFields(cacheKey, stat) {
	const cached = sessionTitleFieldsCache.get(cacheKey);
	if (!cached) return null;
	if (cached.mtimeMs !== stat.mtimeMs || cached.size !== stat.size) {
		sessionTitleFieldsCache.delete(cacheKey);
		return null;
	}
	sessionTitleFieldsCache.delete(cacheKey);
	sessionTitleFieldsCache.set(cacheKey, cached);
	return {
		firstUserMessage: cached.firstUserMessage,
		lastMessagePreview: cached.lastMessagePreview
	};
}
function setCachedSessionTitleFields(cacheKey, stat, value) {
	sessionTitleFieldsCache.set(cacheKey, {
		...value,
		mtimeMs: stat.mtimeMs,
		size: stat.size
	});
	while (sessionTitleFieldsCache.size > MAX_SESSION_TITLE_FIELDS_CACHE_ENTRIES) {
		const oldestKey = sessionTitleFieldsCache.keys().next().value;
		if (typeof oldestKey !== "string" || !oldestKey) break;
		sessionTitleFieldsCache.delete(oldestKey);
	}
}
function attachOpenClawTranscriptMeta(message, meta) {
	if (!message || typeof message !== "object" || Array.isArray(message)) return message;
	const record = message;
	const existing = record.__openclaw && typeof record.__openclaw === "object" && !Array.isArray(record.__openclaw) ? record.__openclaw : {};
	return {
		...record,
		__openclaw: {
			...existing,
			...meta
		}
	};
}
function readSessionMessages(sessionId, storePath, sessionFile) {
	const filePath = resolveSessionTranscriptCandidates(sessionId, storePath, sessionFile).find((p) => fs.existsSync(p));
	if (!filePath) return [];
	const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
	const messages = [];
	let messageSeq = 0;
	for (const line of lines) {
		if (!line.trim()) continue;
		try {
			const parsed = JSON.parse(line);
			if (parsed?.message) {
				messageSeq += 1;
				messages.push(attachOpenClawTranscriptMeta(parsed.message, {
					...typeof parsed.id === "string" ? { id: parsed.id } : {},
					seq: messageSeq
				}));
				continue;
			}
			if (parsed?.type === "compaction") {
				const ts = typeof parsed.timestamp === "string" ? Date.parse(parsed.timestamp) : NaN;
				const timestamp = Number.isFinite(ts) ? ts : Date.now();
				messageSeq += 1;
				messages.push({
					role: "system",
					content: [{
						type: "text",
						text: "Compaction"
					}],
					timestamp,
					__openclaw: {
						kind: "compaction",
						id: typeof parsed.id === "string" ? parsed.id : void 0,
						seq: messageSeq
					}
				});
			}
		} catch {}
	}
	return messages;
}
function capArrayByJsonBytes(items, maxBytes) {
	if (items.length === 0) return {
		items,
		bytes: 2
	};
	const parts = items.map((item) => jsonUtf8Bytes(item));
	let bytes = 2 + parts.reduce((a, b) => a + b, 0) + (items.length - 1);
	let start = 0;
	while (bytes > maxBytes && start < items.length - 1) {
		bytes -= parts[start] + 1;
		start += 1;
	}
	return {
		items: start > 0 ? items.slice(start) : items,
		bytes
	};
}
const MAX_LINES_TO_SCAN = 10;
function readSessionTitleFieldsFromTranscript(sessionId, storePath, sessionFile, agentId, opts) {
	const filePath = resolveSessionTranscriptCandidates(sessionId, storePath, sessionFile, agentId).find((p) => fs.existsSync(p));
	if (!filePath) return {
		firstUserMessage: null,
		lastMessagePreview: null
	};
	let stat;
	try {
		stat = fs.statSync(filePath);
	} catch {
		return {
			firstUserMessage: null,
			lastMessagePreview: null
		};
	}
	const cacheKey = readSessionTitleFieldsCacheKey(filePath, opts);
	const cached = getCachedSessionTitleFields(cacheKey, stat);
	if (cached) return cached;
	if (stat.size === 0) {
		const empty = {
			firstUserMessage: null,
			lastMessagePreview: null
		};
		setCachedSessionTitleFields(cacheKey, stat, empty);
		return empty;
	}
	let fd = null;
	try {
		fd = fs.openSync(filePath, "r");
		const size = stat.size;
		let firstUserMessage = null;
		try {
			const chunk = readTranscriptHeadChunk(fd);
			if (chunk) firstUserMessage = extractFirstUserMessageFromTranscriptChunk(chunk, opts);
		} catch {}
		let lastMessagePreview = null;
		try {
			lastMessagePreview = readLastMessagePreviewFromOpenTranscript({
				fd,
				size
			});
		} catch {}
		const result = {
			firstUserMessage,
			lastMessagePreview
		};
		setCachedSessionTitleFields(cacheKey, stat, result);
		return result;
	} catch {
		return {
			firstUserMessage: null,
			lastMessagePreview: null
		};
	} finally {
		if (fd !== null) try {
			fs.closeSync(fd);
		} catch {}
	}
}
function extractTextFromContent(content) {
	if (typeof content === "string") return stripInlineDirectiveTagsForDisplay(content).text.trim() || null;
	if (!Array.isArray(content)) return null;
	for (const part of content) {
		if (!part || typeof part.text !== "string") continue;
		if (part.type === "text" || part.type === "output_text" || part.type === "input_text") {
			const normalized = stripInlineDirectiveTagsForDisplay(part.text).text.trim();
			if (normalized) return normalized;
		}
	}
	return null;
}
function readTranscriptHeadChunk(fd, maxBytes = 8192) {
	const buf = Buffer.alloc(maxBytes);
	const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
	if (bytesRead <= 0) return null;
	return buf.toString("utf-8", 0, bytesRead);
}
function extractFirstUserMessageFromTranscriptChunk(chunk, opts) {
	const lines = chunk.split(/\r?\n/).slice(0, MAX_LINES_TO_SCAN);
	for (const line of lines) {
		if (!line.trim()) continue;
		try {
			const msg = JSON.parse(line)?.message;
			if (msg?.role !== "user") continue;
			if (opts?.includeInterSession !== true && hasInterSessionUserProvenance(msg)) continue;
			const text = extractTextFromContent(msg.content);
			if (text) return text;
		} catch {}
	}
	return null;
}
function findExistingTranscriptPath(sessionId, storePath, sessionFile, agentId) {
	return resolveSessionTranscriptCandidates(sessionId, storePath, sessionFile, agentId).find((p) => fs.existsSync(p)) ?? null;
}
function withOpenTranscriptFd(filePath, read) {
	let fd = null;
	try {
		fd = fs.openSync(filePath, "r");
		return read(fd);
	} catch {} finally {
		if (fd !== null) fs.closeSync(fd);
	}
	return null;
}
const LAST_MSG_MAX_BYTES = 16384;
const LAST_MSG_MAX_LINES = 20;
function readLastMessagePreviewFromOpenTranscript(params) {
	const readStart = Math.max(0, params.size - LAST_MSG_MAX_BYTES);
	const readLen = Math.min(params.size, LAST_MSG_MAX_BYTES);
	const buf = Buffer.alloc(readLen);
	fs.readSync(params.fd, buf, 0, readLen, readStart);
	const tailLines = buf.toString("utf-8").split(/\r?\n/).filter((l) => l.trim()).slice(-LAST_MSG_MAX_LINES);
	for (let i = tailLines.length - 1; i >= 0; i--) {
		const line = tailLines[i];
		try {
			const msg = JSON.parse(line)?.message;
			if (msg?.role !== "user" && msg?.role !== "assistant") continue;
			const text = extractTextFromContent(msg.content);
			if (text) return text;
		} catch {}
	}
	return null;
}
function extractTranscriptUsageCost(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
	const cost = raw.cost;
	if (!cost || typeof cost !== "object" || Array.isArray(cost)) return;
	const total = cost.total;
	return typeof total === "number" && Number.isFinite(total) && total >= 0 ? total : void 0;
}
function resolvePositiveUsageNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function extractLatestUsageFromTranscriptChunk(chunk) {
	const lines = chunk.split(/\r?\n/).filter((line) => line.trim().length > 0);
	const snapshot = {};
	let sawSnapshot = false;
	let inputTokens = 0;
	let outputTokens = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	let sawInputTokens = false;
	let sawOutputTokens = false;
	let sawCacheRead = false;
	let sawCacheWrite = false;
	let costUsdTotal = 0;
	let sawCost = false;
	for (const line of lines) try {
		const parsed = JSON.parse(line);
		const message = parsed.message && typeof parsed.message === "object" && !Array.isArray(parsed.message) ? parsed.message : void 0;
		if (!message) continue;
		const role = typeof message.role === "string" ? message.role : void 0;
		if (role && role !== "assistant") continue;
		const usageRaw = message.usage && typeof message.usage === "object" && !Array.isArray(message.usage) ? message.usage : parsed.usage && typeof parsed.usage === "object" && !Array.isArray(parsed.usage) ? parsed.usage : void 0;
		const usage = normalizeUsage(usageRaw);
		const totalTokens = resolvePositiveUsageNumber(deriveSessionTotalTokens({ usage }));
		const costUsd = extractTranscriptUsageCost(usageRaw);
		const modelProvider = typeof message.provider === "string" ? message.provider.trim() : typeof parsed.provider === "string" ? parsed.provider.trim() : void 0;
		const model = typeof message.model === "string" ? message.model.trim() : typeof parsed.model === "string" ? parsed.model.trim() : void 0;
		const isDeliveryMirror = modelProvider === "openclaw" && model === "delivery-mirror";
		const hasMeaningfulUsage = hasNonzeroUsage(usage) || typeof totalTokens === "number" || typeof costUsd === "number" && Number.isFinite(costUsd);
		if (!hasMeaningfulUsage && !Boolean(modelProvider || model)) continue;
		if (isDeliveryMirror && !hasMeaningfulUsage) continue;
		sawSnapshot = true;
		if (!isDeliveryMirror) {
			if (modelProvider) snapshot.modelProvider = modelProvider;
			if (model) snapshot.model = model;
		}
		if (typeof usage?.input === "number" && Number.isFinite(usage.input)) {
			inputTokens += usage.input;
			sawInputTokens = true;
		}
		if (typeof usage?.output === "number" && Number.isFinite(usage.output)) {
			outputTokens += usage.output;
			sawOutputTokens = true;
		}
		if (typeof usage?.cacheRead === "number" && Number.isFinite(usage.cacheRead)) {
			cacheRead += usage.cacheRead;
			sawCacheRead = true;
		}
		if (typeof usage?.cacheWrite === "number" && Number.isFinite(usage.cacheWrite)) {
			cacheWrite += usage.cacheWrite;
			sawCacheWrite = true;
		}
		if (typeof totalTokens === "number") {
			snapshot.totalTokens = totalTokens;
			snapshot.totalTokensFresh = true;
		}
		if (typeof costUsd === "number" && Number.isFinite(costUsd)) {
			costUsdTotal += costUsd;
			sawCost = true;
		}
	} catch {}
	if (!sawSnapshot) return null;
	if (sawInputTokens) snapshot.inputTokens = inputTokens;
	if (sawOutputTokens) snapshot.outputTokens = outputTokens;
	if (sawCacheRead) snapshot.cacheRead = cacheRead;
	if (sawCacheWrite) snapshot.cacheWrite = cacheWrite;
	if (sawCost) snapshot.costUsd = costUsdTotal;
	return snapshot;
}
function readLatestSessionUsageFromTranscript(sessionId, storePath, sessionFile, agentId) {
	const filePath = findExistingTranscriptPath(sessionId, storePath, sessionFile, agentId);
	if (!filePath) return null;
	return withOpenTranscriptFd(filePath, (fd) => {
		if (fs.fstatSync(fd).size === 0) return null;
		return extractLatestUsageFromTranscriptChunk(fs.readFileSync(fd, "utf-8"));
	});
}
const PREVIEW_READ_SIZES = [
	64 * 1024,
	256 * 1024,
	1024 * 1024
];
const PREVIEW_MAX_LINES = 200;
function normalizeRole(role, isTool) {
	if (isTool) return "tool";
	switch ((role ?? "").toLowerCase()) {
		case "user": return "user";
		case "assistant": return "assistant";
		case "system": return "system";
		case "tool": return "tool";
		default: return "other";
	}
}
function truncatePreviewText(text, maxChars) {
	if (maxChars <= 0 || text.length <= maxChars) return text;
	if (maxChars <= 3) return text.slice(0, maxChars);
	return `${text.slice(0, maxChars - 3)}...`;
}
function extractPreviewText(message) {
	if ((typeof message.role === "string" ? message.role.trim().toLowerCase() : "") === "assistant") {
		const assistantText = extractAssistantVisibleText(message);
		if (assistantText) {
			const normalized = stripInlineDirectiveTagsForDisplay(assistantText).text.trim();
			return normalized ? normalized : null;
		}
		return null;
	}
	if (typeof message.content === "string") {
		const normalized = stripInlineDirectiveTagsForDisplay(message.content).text.trim();
		return normalized ? normalized : null;
	}
	if (Array.isArray(message.content)) {
		const parts = message.content.map((entry) => typeof entry?.text === "string" ? stripInlineDirectiveTagsForDisplay(entry.text).text : "").filter((text) => text.trim().length > 0);
		if (parts.length > 0) return parts.join("\n").trim();
	}
	if (typeof message.text === "string") {
		const normalized = stripInlineDirectiveTagsForDisplay(message.text).text.trim();
		return normalized ? normalized : null;
	}
	return null;
}
function isToolCall(message) {
	return hasToolCall(message);
}
function extractToolNames(message) {
	return extractToolCallNames(message);
}
function extractMediaSummary(message) {
	if (!Array.isArray(message.content)) return null;
	for (const entry of message.content) {
		const raw = typeof entry?.type === "string" ? entry.type.trim().toLowerCase() : "";
		if (!raw || raw === "text" || raw === "toolcall" || raw === "tool_call") continue;
		return `[${raw}]`;
	}
	return null;
}
function buildPreviewItems(messages, maxItems, maxChars) {
	const items = [];
	for (const message of messages) {
		const toolCall = isToolCall(message);
		const role = normalizeRole(message.role, toolCall);
		let text = extractPreviewText(message);
		if (!text) {
			const toolNames = extractToolNames(message);
			if (toolNames.length > 0) {
				const shown = toolNames.slice(0, 2);
				const overflow = toolNames.length - shown.length;
				text = `call ${shown.join(", ")}`;
				if (overflow > 0) text += ` +${overflow}`;
			}
		}
		if (!text) text = extractMediaSummary(message);
		if (!text) continue;
		let trimmed = text.trim();
		if (!trimmed) continue;
		if (role === "user") trimmed = stripEnvelope(trimmed);
		trimmed = truncatePreviewText(trimmed, maxChars);
		items.push({
			role,
			text: trimmed
		});
	}
	if (items.length <= maxItems) return items;
	return items.slice(-maxItems);
}
function readRecentMessagesFromTranscript(filePath, maxMessages, readBytes) {
	let fd = null;
	try {
		fd = fs.openSync(filePath, "r");
		const size = fs.fstatSync(fd).size;
		if (size === 0) return [];
		const readStart = Math.max(0, size - readBytes);
		const readLen = Math.min(size, readBytes);
		const buf = Buffer.alloc(readLen);
		fs.readSync(fd, buf, 0, readLen, readStart);
		const tailLines = buf.toString("utf-8").split(/\r?\n/).filter((l) => l.trim()).slice(-PREVIEW_MAX_LINES);
		const collected = [];
		for (let i = tailLines.length - 1; i >= 0; i--) {
			const line = tailLines[i];
			try {
				const msg = JSON.parse(line)?.message;
				if (msg && typeof msg === "object") {
					collected.push(msg);
					if (collected.length >= maxMessages) break;
				}
			} catch {}
		}
		return collected.toReversed();
	} catch {
		return [];
	} finally {
		if (fd !== null) fs.closeSync(fd);
	}
}
function readSessionPreviewItemsFromTranscript(sessionId, storePath, sessionFile, agentId, maxItems, maxChars) {
	const filePath = resolveSessionTranscriptCandidates(sessionId, storePath, sessionFile, agentId).find((p) => fs.existsSync(p));
	if (!filePath) return [];
	const boundedItems = Math.max(1, Math.min(maxItems, 50));
	const boundedChars = Math.max(20, Math.min(maxChars, 2e3));
	for (const readSize of PREVIEW_READ_SIZES) {
		const messages = readRecentMessagesFromTranscript(filePath, boundedItems, readSize);
		if (messages.length > 0 || readSize === PREVIEW_READ_SIZES[PREVIEW_READ_SIZES.length - 1]) return buildPreviewItems(messages, boundedItems, boundedChars);
	}
	return [];
}
//#endregion
//#region src/gateway/session-utils.ts
const DERIVED_TITLE_MAX_LEN = 60;
function tryResolveExistingPath(value) {
	try {
		return fs.realpathSync(value);
	} catch {
		return null;
	}
}
function resolveIdentityAvatarUrl(cfg, agentId, avatar) {
	if (!avatar) return;
	const trimmed = avatar.trim();
	if (!trimmed) return;
	if (isAvatarDataUrl(trimmed) || isAvatarHttpUrl(trimmed)) return trimmed;
	if (!isWorkspaceRelativeAvatarPath(trimmed)) return;
	const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
	const workspaceRoot = tryResolveExistingPath(workspaceDir) ?? path.resolve(workspaceDir);
	const resolvedCandidate = path.resolve(workspaceRoot, trimmed);
	if (!isPathWithinRoot(workspaceRoot, resolvedCandidate)) return;
	try {
		const opened = openBoundaryFileSync({
			absolutePath: resolvedCandidate,
			rootPath: workspaceRoot,
			rootRealPath: workspaceRoot,
			boundaryLabel: "workspace root",
			maxBytes: AVATAR_MAX_BYTES,
			skipLexicalRootCheck: true
		});
		if (!opened.ok) return;
		try {
			const buffer = fs.readFileSync(opened.fd);
			return `data:${resolveAvatarMime(resolvedCandidate)};base64,${buffer.toString("base64")}`;
		} finally {
			fs.closeSync(opened.fd);
		}
	} catch {
		return;
	}
}
function formatSessionIdPrefix(sessionId, updatedAt) {
	const prefix = sessionId.slice(0, 8);
	if (updatedAt && updatedAt > 0) return `${prefix} (${new Date(updatedAt).toISOString().slice(0, 10)})`;
	return prefix;
}
function truncateTitle(text, maxLen) {
	if (text.length <= maxLen) return text;
	const cut = text.slice(0, maxLen - 1);
	const lastSpace = cut.lastIndexOf(" ");
	if (lastSpace > maxLen * .6) return cut.slice(0, lastSpace) + "…";
	return cut + "…";
}
function deriveSessionTitle(entry, firstUserMessage) {
	if (!entry) return;
	if (entry.displayName?.trim()) return entry.displayName.trim();
	if (entry.subject?.trim()) return entry.subject.trim();
	if (firstUserMessage?.trim()) return truncateTitle(firstUserMessage.replace(/\s+/g, " ").trim(), DERIVED_TITLE_MAX_LEN);
	if (entry.sessionId) return formatSessionIdPrefix(entry.sessionId, entry.updatedAt);
}
function resolveSessionRuntimeMs(run, now) {
	return getSubagentSessionRuntimeMs(run, now);
}
function resolvePositiveNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function resolveNonNegativeNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function resolveEstimatedSessionCostUsd(params) {
	const explicitCostUsd = resolveNonNegativeNumber(params.explicitCostUsd ?? params.entry?.estimatedCostUsd);
	if (explicitCostUsd !== void 0) return explicitCostUsd;
	const input = resolvePositiveNumber(params.entry?.inputTokens);
	const output = resolvePositiveNumber(params.entry?.outputTokens);
	const cacheRead = resolvePositiveNumber(params.entry?.cacheRead);
	const cacheWrite = resolvePositiveNumber(params.entry?.cacheWrite);
	if (input === void 0 && output === void 0 && cacheRead === void 0 && cacheWrite === void 0) return;
	const cost = resolveModelCostConfig({
		provider: params.provider,
		model: params.model,
		config: params.cfg
	});
	if (!cost) return;
	return resolveNonNegativeNumber(estimateUsageCost({
		usage: {
			...input !== void 0 ? { input } : {},
			...output !== void 0 ? { output } : {},
			...cacheRead !== void 0 ? { cacheRead } : {},
			...cacheWrite !== void 0 ? { cacheWrite } : {}
		},
		cost
	}));
}
function resolveChildSessionKeys(controllerSessionKey, store) {
	const childSessionKeys = /* @__PURE__ */ new Set();
	for (const entry of listSubagentRunsForController(controllerSessionKey)) {
		const childSessionKey = entry.childSessionKey?.trim();
		if (!childSessionKey) continue;
		const latest = getSessionDisplaySubagentRunByChildSessionKey(childSessionKey);
		if ((latest?.controllerSessionKey?.trim() || latest?.requesterSessionKey?.trim()) !== controllerSessionKey) continue;
		childSessionKeys.add(childSessionKey);
	}
	for (const [key, entry] of Object.entries(store)) {
		if (!entry || key === controllerSessionKey) continue;
		const spawnedBy = entry.spawnedBy?.trim();
		const parentSessionKey = entry.parentSessionKey?.trim();
		if (spawnedBy !== controllerSessionKey && parentSessionKey !== controllerSessionKey) continue;
		const latest = getSessionDisplaySubagentRunByChildSessionKey(key);
		if (latest) {
			if ((latest.controllerSessionKey?.trim() || latest.requesterSessionKey?.trim()) !== controllerSessionKey) continue;
		}
		childSessionKeys.add(key);
	}
	const childSessions = Array.from(childSessionKeys);
	return childSessions.length > 0 ? childSessions : void 0;
}
function resolveTranscriptUsageFallback(params) {
	const entry = params.entry;
	if (!entry?.sessionId) return null;
	const parsed = parseAgentSessionKey(params.key);
	const agentId = parsed?.agentId ? normalizeAgentId(parsed.agentId) : resolveDefaultAgentId(params.cfg);
	const snapshot = readLatestSessionUsageFromTranscript(entry.sessionId, params.storePath, entry.sessionFile, agentId);
	if (!snapshot) return null;
	const modelProvider = snapshot.modelProvider ?? params.fallbackProvider;
	const model = snapshot.model ?? params.fallbackModel;
	const contextTokens = resolveContextTokensForModel({
		cfg: params.cfg,
		provider: modelProvider,
		model,
		allowAsyncLoad: false
	});
	const estimatedCostUsd = resolveEstimatedSessionCostUsd({
		cfg: params.cfg,
		provider: modelProvider,
		model,
		explicitCostUsd: snapshot.costUsd,
		entry: {
			inputTokens: snapshot.inputTokens,
			outputTokens: snapshot.outputTokens,
			cacheRead: snapshot.cacheRead,
			cacheWrite: snapshot.cacheWrite
		}
	});
	return {
		modelProvider,
		model,
		totalTokens: resolvePositiveNumber(snapshot.totalTokens),
		totalTokensFresh: snapshot.totalTokensFresh === true,
		contextTokens: resolvePositiveNumber(contextTokens),
		estimatedCostUsd
	};
}
function loadSessionEntry(sessionKey) {
	const cfg = loadConfig();
	const canonicalKey = resolveSessionStoreKey({
		cfg,
		sessionKey
	});
	const agentId = resolveSessionStoreAgentId(cfg, canonicalKey);
	const { storePath, store } = resolveGatewaySessionStoreLookup({
		cfg,
		key: sessionKey.trim(),
		canonicalKey,
		agentId
	});
	const freshestMatch = resolveFreshestSessionStoreMatchFromStoreKeys(store, resolveGatewaySessionStoreTarget({
		cfg,
		key: sessionKey.trim(),
		store
	}).storeKeys);
	const legacyKey = freshestMatch?.key !== canonicalKey ? freshestMatch?.key : void 0;
	return {
		cfg,
		storePath,
		store,
		entry: freshestMatch?.entry,
		canonicalKey,
		legacyKey
	};
}
function resolveFreshestSessionStoreMatchFromStoreKeys(store, storeKeys) {
	const matches = storeKeys.map((key) => {
		const entry = store[key];
		return entry ? {
			key,
			entry
		} : void 0;
	}).filter((match) => match !== void 0);
	if (matches.length === 0) return;
	if (matches.length === 1) return matches[0];
	return [...matches].toSorted((a, b) => (b.entry.updatedAt ?? 0) - (a.entry.updatedAt ?? 0))[0];
}
function resolveFreshestSessionEntryFromStoreKeys(store, storeKeys) {
	return resolveFreshestSessionStoreMatchFromStoreKeys(store, storeKeys)?.entry;
}
function findFreshestStoreMatch(store, ...candidates) {
	const matches = /* @__PURE__ */ new Map();
	for (const candidate of candidates) {
		const trimmed = candidate.trim();
		if (!trimmed) continue;
		const exact = store[trimmed];
		if (exact) matches.set(trimmed, {
			entry: exact,
			key: trimmed
		});
		for (const key of findStoreKeysIgnoreCase(store, trimmed)) {
			const entry = store[key];
			if (entry) matches.set(key, {
				entry,
				key
			});
		}
	}
	if (matches.size === 0) return;
	return [...matches.values()].toSorted((a, b) => (b.entry.updatedAt ?? 0) - (a.entry.updatedAt ?? 0))[0];
}
/**
* Find all on-disk store keys that match the given key case-insensitively.
* Returns every key from the store whose lowercased form equals the target's lowercased form.
*/
function findStoreKeysIgnoreCase(store, targetKey) {
	const lowered = targetKey.toLowerCase();
	const matches = [];
	for (const key of Object.keys(store)) if (key.toLowerCase() === lowered) matches.push(key);
	return matches;
}
/**
* Remove legacy key variants for one canonical session key.
* Candidates can include aliases (for example, "agent:ops:main" when canonical is "agent:ops:work").
*/
function pruneLegacyStoreKeys(params) {
	const keysToDelete = /* @__PURE__ */ new Set();
	for (const candidate of params.candidates) {
		const trimmed = String(candidate ?? "").trim();
		if (!trimmed) continue;
		if (trimmed !== params.canonicalKey) keysToDelete.add(trimmed);
		for (const match of findStoreKeysIgnoreCase(params.store, trimmed)) if (match !== params.canonicalKey) keysToDelete.add(match);
	}
	for (const key of keysToDelete) delete params.store[key];
}
function migrateAndPruneGatewaySessionStoreKey(params) {
	const target = resolveGatewaySessionStoreTarget({
		cfg: params.cfg,
		key: params.key,
		store: params.store
	});
	const primaryKey = target.canonicalKey;
	const freshestMatch = resolveFreshestSessionStoreMatchFromStoreKeys(params.store, target.storeKeys);
	if (freshestMatch) {
		const currentPrimary = params.store[primaryKey];
		if (!currentPrimary || (freshestMatch.entry.updatedAt ?? 0) > (currentPrimary.updatedAt ?? 0)) params.store[primaryKey] = freshestMatch.entry;
	}
	pruneLegacyStoreKeys({
		store: params.store,
		canonicalKey: primaryKey,
		candidates: target.storeKeys
	});
	return {
		target,
		primaryKey,
		entry: params.store[primaryKey]
	};
}
function classifySessionKey(key, entry) {
	if (key === "global") return "global";
	if (key === "unknown") return "unknown";
	if (entry?.chatType === "group" || entry?.chatType === "channel") return "group";
	if (key.includes(":group:") || key.includes(":channel:")) return "group";
	return "direct";
}
function parseGroupKey(key) {
	const parts = (parseAgentSessionKey(key)?.rest ?? key).split(":").filter(Boolean);
	if (parts.length >= 3) {
		const [channel, kind, ...rest] = parts;
		if (kind === "group" || kind === "channel") return {
			channel,
			kind,
			id: rest.join(":")
		};
	}
	return null;
}
function isStorePathTemplate(store) {
	return typeof store === "string" && store.includes("{agentId}");
}
function listExistingAgentIdsFromDisk() {
	const root = resolveStateDir();
	const agentsDir = path.join(root, "agents");
	try {
		return fs.readdirSync(agentsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => normalizeAgentId(entry.name)).filter(Boolean);
	} catch {
		return [];
	}
}
function listConfiguredAgentIds(cfg) {
	const ids = /* @__PURE__ */ new Set();
	const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg));
	ids.add(defaultId);
	for (const entry of cfg.agents?.list ?? []) if (entry?.id) ids.add(normalizeAgentId(entry.id));
	for (const id of listExistingAgentIdsFromDisk()) ids.add(id);
	const sorted = Array.from(ids).filter(Boolean);
	sorted.sort((a, b) => a.localeCompare(b));
	return sorted.includes(defaultId) ? [defaultId, ...sorted.filter((id) => id !== defaultId)] : sorted;
}
function normalizeFallbackList(values) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}
	return out;
}
function resolveGatewayAgentModel(cfg, agentId) {
	const primary = resolveAgentEffectiveModelPrimary(cfg, agentId)?.trim();
	const fallbackOverride = resolveAgentModelFallbacksOverride(cfg, agentId);
	const defaultFallbacks = resolveAgentModelFallbackValues(cfg.agents?.defaults?.model);
	const fallbacks = normalizeFallbackList(fallbackOverride ?? defaultFallbacks);
	if (!primary && fallbacks.length === 0) return;
	return {
		...primary ? { primary } : {},
		...fallbacks.length > 0 ? { fallbacks } : {}
	};
}
function listAgentsForGateway(cfg) {
	const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg));
	const mainKey = normalizeMainKey(cfg.session?.mainKey);
	const scope = cfg.session?.scope ?? "per-sender";
	const configuredById = /* @__PURE__ */ new Map();
	for (const entry of cfg.agents?.list ?? []) {
		if (!entry?.id) continue;
		const identity = entry.identity ? {
			name: entry.identity.name?.trim() || void 0,
			theme: entry.identity.theme?.trim() || void 0,
			emoji: entry.identity.emoji?.trim() || void 0,
			avatar: entry.identity.avatar?.trim() || void 0,
			avatarUrl: resolveIdentityAvatarUrl(cfg, normalizeAgentId(entry.id), entry.identity.avatar?.trim())
		} : void 0;
		configuredById.set(normalizeAgentId(entry.id), {
			name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : void 0,
			identity
		});
	}
	const explicitIds = new Set((cfg.agents?.list ?? []).map((entry) => entry?.id ? normalizeAgentId(entry.id) : "").filter(Boolean));
	const allowedIds = explicitIds.size > 0 ? new Set([...explicitIds, defaultId]) : null;
	let agentIds = listConfiguredAgentIds(cfg).filter((id) => allowedIds ? allowedIds.has(id) : true);
	if (mainKey && !agentIds.includes(mainKey) && (!allowedIds || allowedIds.has(mainKey))) agentIds = [...agentIds, mainKey];
	return {
		defaultId,
		mainKey,
		scope,
		agents: agentIds.map((id) => {
			const meta = configuredById.get(id);
			const model = resolveGatewayAgentModel(cfg, id);
			return {
				id,
				name: meta?.name,
				identity: meta?.identity,
				workspace: resolveAgentWorkspaceDir(cfg, id),
				...model ? { model } : {}
			};
		})
	};
}
function canonicalizeSessionKeyForAgent(agentId, key) {
	const lowered = key.toLowerCase();
	if (lowered === "global" || lowered === "unknown") return lowered;
	if (lowered.startsWith("agent:")) return lowered;
	return `agent:${normalizeAgentId(agentId)}:${lowered}`;
}
function resolveDefaultStoreAgentId(cfg) {
	return normalizeAgentId(resolveDefaultAgentId(cfg));
}
function resolveSessionStoreKey(params) {
	const raw = (params.sessionKey ?? "").trim();
	if (!raw) return raw;
	const rawLower = raw.toLowerCase();
	if (rawLower === "global" || rawLower === "unknown") return rawLower;
	const parsed = parseAgentSessionKey(raw);
	if (parsed) {
		const agentId = normalizeAgentId(parsed.agentId);
		const lowered = raw.toLowerCase();
		const canonical = canonicalizeMainSessionAlias({
			cfg: params.cfg,
			agentId,
			sessionKey: lowered
		});
		if (canonical !== lowered) return canonical;
		return lowered;
	}
	const lowered = raw.toLowerCase();
	const rawMainKey = normalizeMainKey(params.cfg.session?.mainKey);
	if (lowered === "main" || lowered === rawMainKey) return resolveMainSessionKey(params.cfg);
	return canonicalizeSessionKeyForAgent(resolveDefaultStoreAgentId(params.cfg), lowered);
}
function resolveSessionStoreAgentId(cfg, canonicalKey) {
	if (canonicalKey === "global" || canonicalKey === "unknown") return resolveDefaultStoreAgentId(cfg);
	const parsed = parseAgentSessionKey(canonicalKey);
	if (parsed?.agentId) return normalizeAgentId(parsed.agentId);
	return resolveDefaultStoreAgentId(cfg);
}
function canonicalizeSpawnedByForAgent(cfg, agentId, spawnedBy) {
	const raw = spawnedBy?.trim();
	if (!raw) return;
	const lower = raw.toLowerCase();
	if (lower === "global" || lower === "unknown") return lower;
	let result;
	if (raw.toLowerCase().startsWith("agent:")) result = raw.toLowerCase();
	else result = `agent:${normalizeAgentId(agentId)}:${lower}`;
	const parsed = parseAgentSessionKey(result);
	return canonicalizeMainSessionAlias({
		cfg,
		agentId: parsed?.agentId ? normalizeAgentId(parsed.agentId) : agentId,
		sessionKey: result
	});
}
function buildGatewaySessionStoreScanTargets(params) {
	const targets = /* @__PURE__ */ new Set();
	if (params.canonicalKey) targets.add(params.canonicalKey);
	if (params.key && params.key !== params.canonicalKey) targets.add(params.key);
	if (params.canonicalKey === "global" || params.canonicalKey === "unknown") return [...targets];
	const agentMainKey = resolveAgentMainSessionKey({
		cfg: params.cfg,
		agentId: params.agentId
	});
	if (params.canonicalKey === agentMainKey) targets.add(`agent:${params.agentId}:main`);
	return [...targets];
}
function resolveGatewaySessionStoreCandidates(cfg, agentId) {
	const storeConfig = cfg.session?.store;
	const defaultTarget = {
		agentId,
		storePath: resolveStorePath(storeConfig, { agentId })
	};
	if (!isStorePathTemplate(storeConfig)) return [defaultTarget];
	const targets = /* @__PURE__ */ new Map();
	targets.set(defaultTarget.storePath, defaultTarget);
	for (const target of resolveAllAgentSessionStoreTargetsSync(cfg)) if (target.agentId === agentId) targets.set(target.storePath, target);
	return [...targets.values()];
}
function resolveGatewaySessionStoreLookup(params) {
	const scanTargets = buildGatewaySessionStoreScanTargets(params);
	const candidates = resolveGatewaySessionStoreCandidates(params.cfg, params.agentId);
	const fallback = candidates[0] ?? {
		agentId: params.agentId,
		storePath: resolveStorePath(params.cfg.session?.store, { agentId: params.agentId })
	};
	let selectedStorePath = fallback.storePath;
	let selectedStore = params.initialStore ?? loadSessionStore(fallback.storePath);
	let selectedMatch = findFreshestStoreMatch(selectedStore, ...scanTargets);
	let selectedUpdatedAt = selectedMatch?.entry.updatedAt ?? Number.NEGATIVE_INFINITY;
	for (let index = 1; index < candidates.length; index += 1) {
		const candidate = candidates[index];
		if (!candidate) continue;
		const store = loadSessionStore(candidate.storePath);
		const match = findFreshestStoreMatch(store, ...scanTargets);
		if (!match) continue;
		const updatedAt = match.entry.updatedAt ?? 0;
		if (!selectedMatch || updatedAt >= selectedUpdatedAt) {
			selectedStorePath = candidate.storePath;
			selectedStore = store;
			selectedMatch = match;
			selectedUpdatedAt = updatedAt;
		}
	}
	return {
		storePath: selectedStorePath,
		store: selectedStore,
		match: selectedMatch
	};
}
function resolveGatewaySessionStoreTarget(params) {
	const key = params.key.trim();
	const canonicalKey = resolveSessionStoreKey({
		cfg: params.cfg,
		sessionKey: key
	});
	const agentId = resolveSessionStoreAgentId(params.cfg, canonicalKey);
	const { storePath, store } = resolveGatewaySessionStoreLookup({
		cfg: params.cfg,
		key,
		canonicalKey,
		agentId,
		initialStore: params.store
	});
	if (canonicalKey === "global" || canonicalKey === "unknown") return {
		agentId,
		storePath,
		canonicalKey,
		storeKeys: key && key !== canonicalKey ? [canonicalKey, key] : [key]
	};
	const storeKeys = /* @__PURE__ */ new Set();
	storeKeys.add(canonicalKey);
	if (key && key !== canonicalKey) storeKeys.add(key);
	if (params.scanLegacyKeys !== false) {
		const scanTargets = buildGatewaySessionStoreScanTargets({
			cfg: params.cfg,
			key,
			canonicalKey,
			agentId
		});
		for (const seed of scanTargets) for (const legacyKey of findStoreKeysIgnoreCase(store, seed)) storeKeys.add(legacyKey);
	}
	return {
		agentId,
		storePath,
		canonicalKey,
		storeKeys: Array.from(storeKeys)
	};
}
function mergeSessionEntryIntoCombined(params) {
	const { cfg, combined, entry, agentId, canonicalKey } = params;
	const existing = combined[canonicalKey];
	if (existing && (existing.updatedAt ?? 0) > (entry.updatedAt ?? 0)) combined[canonicalKey] = {
		...entry,
		...existing,
		spawnedBy: canonicalizeSpawnedByForAgent(cfg, agentId, existing.spawnedBy ?? entry.spawnedBy)
	};
	else combined[canonicalKey] = {
		...existing,
		...entry,
		spawnedBy: canonicalizeSpawnedByForAgent(cfg, agentId, entry.spawnedBy ?? existing?.spawnedBy)
	};
}
function loadCombinedSessionStoreForGateway(cfg) {
	const storeConfig = cfg.session?.store;
	if (storeConfig && !isStorePathTemplate(storeConfig)) {
		const storePath = resolveStorePath(storeConfig);
		const defaultAgentId = normalizeAgentId(resolveDefaultAgentId(cfg));
		const store = loadSessionStore(storePath);
		const combined = {};
		for (const [key, entry] of Object.entries(store)) mergeSessionEntryIntoCombined({
			cfg,
			combined,
			entry,
			agentId: defaultAgentId,
			canonicalKey: canonicalizeSessionKeyForAgent(defaultAgentId, key)
		});
		return {
			storePath,
			store: combined
		};
	}
	const targets = resolveAllAgentSessionStoreTargetsSync(cfg);
	const combined = {};
	for (const target of targets) {
		const agentId = target.agentId;
		const storePath = target.storePath;
		const store = loadSessionStore(storePath);
		for (const [key, entry] of Object.entries(store)) mergeSessionEntryIntoCombined({
			cfg,
			combined,
			entry,
			agentId,
			canonicalKey: canonicalizeSessionKeyForAgent(agentId, key)
		});
	}
	return {
		storePath: typeof storeConfig === "string" && storeConfig.trim() ? storeConfig.trim() : "(multiple)",
		store: combined
	};
}
function getSessionDefaults(cfg) {
	const resolved = resolveConfiguredModelRef({
		cfg,
		defaultProvider: DEFAULT_PROVIDER,
		defaultModel: DEFAULT_MODEL
	});
	const contextTokens = cfg.agents?.defaults?.contextTokens ?? lookupContextTokens(resolved.model, { allowAsyncLoad: false }) ?? 2e5;
	return {
		modelProvider: resolved.provider ?? null,
		model: resolved.model ?? null,
		contextTokens: contextTokens ?? null
	};
}
function resolveSessionModelRef(cfg, entry, agentId) {
	const resolved = agentId ? resolveDefaultModelForAgent({
		cfg,
		agentId
	}) : resolveConfiguredModelRef({
		cfg,
		defaultProvider: DEFAULT_PROVIDER,
		defaultModel: DEFAULT_MODEL
	});
	const persisted = resolvePersistedModelRef({
		defaultProvider: resolved.provider || "openai",
		runtimeProvider: entry?.modelProvider,
		runtimeModel: entry?.model,
		overrideProvider: entry?.providerOverride,
		overrideModel: entry?.modelOverride
	});
	if (persisted) return persisted;
	return resolved;
}
async function resolveGatewayModelSupportsImages(params) {
	if (!params.model) return true;
	try {
		const modelEntry = (await params.loadGatewayModelCatalog()).find((entry) => entry.id === params.model && (!params.provider || entry.provider === params.provider));
		if (modelEntry) {
			if (modelEntry.input?.includes("image")) return true;
			const normalizedProvider = params.provider?.trim().toLowerCase();
			const normalizedCandidates = [params.model.trim().toLowerCase(), typeof modelEntry.name === "string" ? modelEntry.name.trim().toLowerCase() : ""].filter(Boolean);
			if (normalizedProvider === "microsoft-foundry" && normalizedCandidates.some((candidate) => candidate.startsWith("gpt-") || candidate.startsWith("o1") || candidate.startsWith("o3") || candidate.startsWith("o4") || candidate === "computer-use-preview")) return true;
			return false;
		}
		return false;
	} catch {
		return false;
	}
}
function resolveSessionModelIdentityRef(cfg, entry, agentId, fallbackModelRef) {
	const runtimeModel = entry?.model?.trim();
	const runtimeProvider = entry?.modelProvider?.trim();
	if (runtimeModel) {
		if (runtimeProvider) return {
			provider: runtimeProvider,
			model: runtimeModel
		};
		const inferredProvider = inferUniqueProviderFromConfiguredModels({
			cfg,
			model: runtimeModel
		});
		if (inferredProvider) return {
			provider: inferredProvider,
			model: runtimeModel
		};
		if (runtimeModel.includes("/")) {
			const parsedRuntime = parseModelRef(runtimeModel, DEFAULT_PROVIDER);
			if (parsedRuntime) return {
				provider: parsedRuntime.provider,
				model: parsedRuntime.model
			};
			return { model: runtimeModel };
		}
		return { model: runtimeModel };
	}
	const fallbackRef = fallbackModelRef?.trim();
	if (fallbackRef) {
		const parsedFallback = parseModelRef(fallbackRef, DEFAULT_PROVIDER);
		if (parsedFallback) return {
			provider: parsedFallback.provider,
			model: parsedFallback.model
		};
		const inferredProvider = inferUniqueProviderFromConfiguredModels({
			cfg,
			model: fallbackRef
		});
		if (inferredProvider) return {
			provider: inferredProvider,
			model: fallbackRef
		};
		return { model: fallbackRef };
	}
	const resolved = resolveSessionModelRef(cfg, entry, agentId);
	return {
		provider: resolved.provider,
		model: resolved.model
	};
}
function buildGatewaySessionRow(params) {
	const { cfg, storePath, store, key, entry } = params;
	const now = params.now ?? Date.now();
	const updatedAt = entry?.updatedAt ?? null;
	const parsed = parseGroupKey(key);
	const channel = entry?.channel ?? parsed?.channel;
	const subject = entry?.subject;
	const groupChannel = entry?.groupChannel;
	const space = entry?.space;
	const id = parsed?.id;
	const origin = entry?.origin;
	const originLabel = origin?.label;
	const displayName = entry?.displayName ?? (channel ? buildGroupDisplayName({
		provider: channel,
		subject,
		groupChannel,
		space,
		id,
		key
	}) : void 0) ?? entry?.label ?? originLabel;
	const deliveryFields = normalizeSessionDeliveryFields(entry);
	const sessionAgentId = normalizeAgentId(parseAgentSessionKey(key)?.agentId ?? resolveDefaultAgentId(cfg));
	const subagentRun = getSessionDisplaySubagentRunByChildSessionKey(key);
	const subagentOwner = subagentRun?.controllerSessionKey?.trim() || subagentRun?.requesterSessionKey?.trim();
	const subagentStatus = subagentRun ? resolveSubagentSessionStatus(subagentRun) : void 0;
	const subagentStartedAt = subagentRun ? getSubagentSessionStartedAt(subagentRun) : void 0;
	const subagentEndedAt = subagentRun ? subagentRun.endedAt : void 0;
	const subagentRuntimeMs = subagentRun ? resolveSessionRuntimeMs(subagentRun, now) : void 0;
	const resolvedModel = resolveSessionModelIdentityRef(cfg, entry, sessionAgentId, subagentRun?.model);
	const runtimeModelPresent = Boolean(entry?.model?.trim()) || Boolean(entry?.modelProvider?.trim());
	const needsTranscriptTotalTokens = resolvePositiveNumber(resolveFreshSessionTotalTokens(entry)) === void 0;
	const needsTranscriptContextTokens = resolvePositiveNumber(entry?.contextTokens) === void 0;
	const needsTranscriptEstimatedCostUsd = resolveEstimatedSessionCostUsd({
		cfg,
		provider: resolvedModel.provider,
		model: resolvedModel.model ?? "gpt-5.4",
		entry
	}) === void 0;
	const transcriptUsage = needsTranscriptTotalTokens || needsTranscriptContextTokens || needsTranscriptEstimatedCostUsd ? resolveTranscriptUsageFallback({
		cfg,
		key,
		entry,
		storePath,
		fallbackProvider: resolvedModel.provider,
		fallbackModel: resolvedModel.model ?? "gpt-5.4"
	}) : null;
	const preferLiveSubagentModelIdentity = Boolean(subagentRun?.model?.trim()) && subagentStatus === "running";
	const shouldUseTranscriptModelIdentity = runtimeModelPresent && !preferLiveSubagentModelIdentity && (needsTranscriptTotalTokens || needsTranscriptContextTokens);
	const resolvedModelIdentity = {
		provider: resolvedModel.provider,
		model: resolvedModel.model ?? "gpt-5.4"
	};
	const { provider: modelProvider, model } = shouldUseTranscriptModelIdentity ? {
		provider: transcriptUsage?.modelProvider ?? resolvedModelIdentity.provider,
		model: transcriptUsage?.model ?? resolvedModelIdentity.model
	} : resolvedModelIdentity;
	const totalTokens = resolvePositiveNumber(resolveFreshSessionTotalTokens(entry)) ?? resolvePositiveNumber(transcriptUsage?.totalTokens);
	const totalTokensFresh = typeof totalTokens === "number" && Number.isFinite(totalTokens) && totalTokens > 0 ? true : transcriptUsage?.totalTokensFresh === true;
	const childSessions = resolveChildSessionKeys(key, store);
	const estimatedCostUsd = resolveEstimatedSessionCostUsd({
		cfg,
		provider: modelProvider,
		model,
		entry
	}) ?? resolveNonNegativeNumber(transcriptUsage?.estimatedCostUsd);
	const contextTokens = resolvePositiveNumber(entry?.contextTokens) ?? resolvePositiveNumber(transcriptUsage?.contextTokens) ?? resolvePositiveNumber(resolveContextTokensForModel({
		cfg,
		provider: modelProvider,
		model,
		allowAsyncLoad: false
	}));
	let derivedTitle;
	let lastMessagePreview;
	if (entry?.sessionId && (params.includeDerivedTitles || params.includeLastMessage)) {
		const fields = readSessionTitleFieldsFromTranscript(entry.sessionId, storePath, entry.sessionFile, sessionAgentId);
		if (params.includeDerivedTitles) derivedTitle = deriveSessionTitle(entry, fields.firstUserMessage);
		if (params.includeLastMessage && fields.lastMessagePreview) lastMessagePreview = fields.lastMessagePreview;
	}
	return {
		key,
		spawnedBy: subagentOwner || entry?.spawnedBy,
		spawnedWorkspaceDir: entry?.spawnedWorkspaceDir,
		forkedFromParent: entry?.forkedFromParent,
		spawnDepth: entry?.spawnDepth,
		subagentRole: entry?.subagentRole,
		subagentControlScope: entry?.subagentControlScope,
		kind: classifySessionKey(key, entry),
		label: entry?.label,
		displayName,
		derivedTitle,
		lastMessagePreview,
		channel,
		subject,
		groupChannel,
		space,
		chatType: entry?.chatType,
		origin,
		updatedAt,
		sessionId: entry?.sessionId,
		systemSent: entry?.systemSent,
		abortedLastRun: entry?.abortedLastRun,
		thinkingLevel: entry?.thinkingLevel,
		fastMode: entry?.fastMode,
		verboseLevel: entry?.verboseLevel,
		reasoningLevel: entry?.reasoningLevel,
		elevatedLevel: entry?.elevatedLevel,
		sendPolicy: entry?.sendPolicy,
		inputTokens: entry?.inputTokens,
		outputTokens: entry?.outputTokens,
		totalTokens,
		totalTokensFresh,
		estimatedCostUsd,
		status: subagentRun ? subagentStatus : entry?.status,
		startedAt: subagentRun ? subagentStartedAt : entry?.startedAt,
		endedAt: subagentRun ? subagentEndedAt : entry?.endedAt,
		runtimeMs: subagentRun ? subagentRuntimeMs : entry?.runtimeMs,
		parentSessionKey: subagentOwner || entry?.parentSessionKey,
		childSessions,
		responseUsage: entry?.responseUsage,
		modelProvider,
		model,
		contextTokens,
		deliveryContext: deliveryFields.deliveryContext,
		lastChannel: deliveryFields.lastChannel ?? entry?.lastChannel,
		lastTo: deliveryFields.lastTo ?? entry?.lastTo,
		lastAccountId: deliveryFields.lastAccountId ?? entry?.lastAccountId,
		lastThreadId: deliveryFields.lastThreadId ?? entry?.lastThreadId
	};
}
function loadGatewaySessionRow(sessionKey, options) {
	const { cfg, storePath, store, entry, canonicalKey } = loadSessionEntry(sessionKey);
	if (!entry) return null;
	return buildGatewaySessionRow({
		cfg,
		storePath,
		store,
		key: canonicalKey,
		entry,
		now: options?.now,
		includeDerivedTitles: options?.includeDerivedTitles,
		includeLastMessage: options?.includeLastMessage
	});
}
function listSessionsFromStore(params) {
	const { cfg, storePath, store, opts } = params;
	const now = Date.now();
	const includeGlobal = opts.includeGlobal === true;
	const includeUnknown = opts.includeUnknown === true;
	const includeDerivedTitles = opts.includeDerivedTitles === true;
	const includeLastMessage = opts.includeLastMessage === true;
	const spawnedBy = typeof opts.spawnedBy === "string" ? opts.spawnedBy : "";
	const label = typeof opts.label === "string" ? opts.label.trim() : "";
	const agentId = typeof opts.agentId === "string" ? normalizeAgentId(opts.agentId) : "";
	const search = typeof opts.search === "string" ? opts.search.trim().toLowerCase() : "";
	const activeMinutes = typeof opts.activeMinutes === "number" && Number.isFinite(opts.activeMinutes) ? Math.max(1, Math.floor(opts.activeMinutes)) : void 0;
	let sessions = Object.entries(store).filter(([key]) => {
		if (isCronRunSessionKey(key)) return false;
		if (!includeGlobal && key === "global") return false;
		if (!includeUnknown && key === "unknown") return false;
		if (agentId) {
			if (key === "global" || key === "unknown") return false;
			const parsed = parseAgentSessionKey(key);
			if (!parsed) return false;
			return normalizeAgentId(parsed.agentId) === agentId;
		}
		return true;
	}).filter(([key, entry]) => {
		if (!spawnedBy) return true;
		if (key === "unknown" || key === "global") return false;
		const latest = getSessionDisplaySubagentRunByChildSessionKey(key);
		if (latest) return (latest.controllerSessionKey?.trim() || latest.requesterSessionKey?.trim()) === spawnedBy;
		return entry?.spawnedBy === spawnedBy || entry?.parentSessionKey === spawnedBy;
	}).filter(([, entry]) => {
		if (!label) return true;
		return entry?.label === label;
	}).map(([key, entry]) => buildGatewaySessionRow({
		cfg,
		storePath,
		store,
		key,
		entry,
		now,
		includeDerivedTitles,
		includeLastMessage
	})).toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
	if (search) sessions = sessions.filter((s) => {
		return [
			s.displayName,
			s.label,
			s.subject,
			s.sessionId,
			s.key
		].some((f) => typeof f === "string" && f.toLowerCase().includes(search));
	});
	if (activeMinutes !== void 0) {
		const cutoff = now - activeMinutes * 6e4;
		sessions = sessions.filter((s) => (s.updatedAt ?? 0) >= cutoff);
	}
	if (typeof opts.limit === "number" && Number.isFinite(opts.limit)) {
		const limit = Math.max(1, Math.floor(opts.limit));
		sessions = sessions.slice(0, limit);
	}
	return {
		ts: now,
		path: storePath,
		count: sessions.length,
		defaults: getSessionDefaults(cfg),
		sessions
	};
}
//#endregion
export { readSessionMessages as _, loadCombinedSessionStoreForGateway as a, stripEnvelopeFromMessages as b, migrateAndPruneGatewaySessionStoreKey as c, resolveGatewayModelSupportsImages as d, resolveGatewaySessionStoreTarget as f, capArrayByJsonBytes as g, attachOpenClawTranscriptMeta as h, listSessionsFromStore as i, pruneLegacyStoreKeys as l, resolveSessionModelRef as m, classifySessionKey as n, loadGatewaySessionRow as o, resolveSessionModelIdentityRef as p, listAgentsForGateway as r, loadSessionEntry as s, canonicalizeSpawnedByForAgent as t, resolveFreshestSessionEntryFromStoreKeys as u, readSessionPreviewItemsFromTranscript as v, jsonUtf8Bytes as x, stripEnvelopeFromMessage as y };
