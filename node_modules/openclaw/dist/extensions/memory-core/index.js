import { w as parseAgentSessionKey } from "../../session-key-BR3Z-ljs.js";
import { v as resolveSessionAgentId } from "../../agent-scope-CXWTwwic.js";
import { o as parseNonNegativeByteSize } from "../../zod-schema-C3jh3SvI.js";
import { c as jsonResult, d as readNumberParam, h as readStringParam } from "../../common-B7pbdYUb.js";
import { n as SILENT_REPLY_TOKEN } from "../../tokens-wOGzQgw2.js";
import "../../pi-settings-DF7KuKBq.js";
import { t as resolveMemorySearchConfig } from "../../memory-search-DIQ9kV2j.js";
import { n as resolveCronStyleNow } from "../../current-time-C1zXvUcB.js";
import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import "../../memory-core-host-runtime-core-CP2NzfCG.js";
import { F as resolveMemoryDreamingConfig, N as resolveMemoryCorePluginConfig$1, P as resolveMemoryDeepDreamingConfig } from "../../dreaming-BXqo2sMj.js";
import "../../memory-core-host-status-BJj-fXlX.js";
import { s as recordShortTermRecalls } from "../../short-term-promotion-G9ML8hkA.js";
import { t as registerMemoryCli } from "../../cli-BiKnzTZZ.js";
import { n as resolveShortTermPromotionDreamingConfig, t as registerShortTermPromotionDreaming } from "../../dreaming-CnlsXIYM.js";
import { a as registerBuiltInMemoryEmbeddingProviders } from "../../manager-CKYnEo0k.js";
import { t as memoryRuntime } from "../../runtime-provider-B1I8B2VL.js";
import { Type } from "@sinclair/typebox";
//#region extensions/memory-core/src/dreaming-command.ts
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function resolveMemoryCorePluginConfig(cfg) {
	return asRecord(asRecord(cfg.plugins?.entries?.["memory-core"])?.config) ?? {};
}
function updateDreamingEnabledInConfig(cfg, enabled) {
	const entries = { ...cfg.plugins?.entries ?? {} };
	const existingEntry = asRecord(entries["memory-core"]) ?? {};
	const existingConfig = asRecord(existingEntry.config) ?? {};
	const existingSleep = asRecord(existingConfig.dreaming) ?? {};
	entries["memory-core"] = {
		...existingEntry,
		config: {
			...existingConfig,
			dreaming: {
				...existingSleep,
				enabled
			}
		}
	};
	return {
		...cfg,
		plugins: {
			...cfg.plugins,
			entries
		}
	};
}
function formatEnabled(value) {
	return value ? "on" : "off";
}
function formatPhaseGuide() {
	return [
		"- implementation detail: each sweep runs light -> REM -> deep.",
		"- deep is the only stage that writes durable entries to MEMORY.md.",
		"- DREAMS.md is for human-readable dreaming summaries and diary entries."
	].join("\n");
}
function formatStatus(cfg) {
	const pluginConfig = resolveMemoryCorePluginConfig(cfg);
	const dreaming = resolveMemoryDreamingConfig({
		pluginConfig,
		cfg
	});
	const deep = resolveShortTermPromotionDreamingConfig({
		pluginConfig,
		cfg
	});
	const timezone = dreaming.timezone ? ` (${dreaming.timezone})` : "";
	return [
		"Dreaming status:",
		`- enabled: ${formatEnabled(dreaming.enabled)}${timezone}`,
		`- sweep cadence: ${dreaming.frequency}`,
		`- promotion policy: score>=${deep.minScore}, recalls>=${deep.minRecallCount}, uniqueQueries>=${deep.minUniqueQueries}`
	].join("\n");
}
function formatUsage(includeStatus) {
	return [
		"Usage: /dreaming status",
		"Usage: /dreaming on|off",
		"",
		includeStatus,
		"",
		"Phases:",
		formatPhaseGuide()
	].join("\n");
}
function registerDreamingCommand(api) {
	api.registerCommand({
		name: "dreaming",
		description: "Enable or disable memory dreaming.",
		acceptsArgs: true,
		handler: async (ctx) => {
			const [firstToken = ""] = (ctx.args?.trim() ?? "").split(/\s+/).filter(Boolean).map((token) => token.toLowerCase());
			const currentConfig = api.runtime.config.loadConfig();
			if (!firstToken || firstToken === "help" || firstToken === "options" || firstToken === "phases") return { text: formatUsage(formatStatus(currentConfig)) };
			if (firstToken === "status") return { text: formatStatus(currentConfig) };
			if (firstToken === "on" || firstToken === "off") {
				const enabled = firstToken === "on";
				const nextConfig = updateDreamingEnabledInConfig(currentConfig, enabled);
				await api.runtime.config.writeConfigFile(nextConfig);
				return { text: [
					`Dreaming ${enabled ? "enabled" : "disabled"}.`,
					"",
					formatStatus(nextConfig)
				].join("\n") };
			}
			return { text: formatUsage(formatStatus(currentConfig)) };
		}
	});
}
//#endregion
//#region extensions/memory-core/src/flush-plan.ts
const DEFAULT_MEMORY_FLUSH_SOFT_TOKENS = 4e3;
const DEFAULT_MEMORY_FLUSH_FORCE_TRANSCRIPT_BYTES = 2 * 1024 * 1024;
const MEMORY_FLUSH_TARGET_HINT = "Store durable memories only in memory/YYYY-MM-DD.md (create memory/ if needed).";
const MEMORY_FLUSH_APPEND_ONLY_HINT = "If memory/YYYY-MM-DD.md already exists, APPEND new content only and do not overwrite existing entries.";
const MEMORY_FLUSH_READ_ONLY_HINT = "Treat workspace bootstrap/reference files such as MEMORY.md, DREAMS.md, SOUL.md, TOOLS.md, and AGENTS.md as read-only during this flush; never overwrite, replace, or edit them.";
const MEMORY_FLUSH_REQUIRED_HINTS = [
	MEMORY_FLUSH_TARGET_HINT,
	MEMORY_FLUSH_APPEND_ONLY_HINT,
	MEMORY_FLUSH_READ_ONLY_HINT
];
const DEFAULT_MEMORY_FLUSH_PROMPT = [
	"Pre-compaction memory flush.",
	MEMORY_FLUSH_TARGET_HINT,
	MEMORY_FLUSH_READ_ONLY_HINT,
	MEMORY_FLUSH_APPEND_ONLY_HINT,
	"Do NOT create timestamped variant files (e.g., YYYY-MM-DD-HHMM.md); always use the canonical YYYY-MM-DD.md filename.",
	`If nothing to store, reply with ${SILENT_REPLY_TOKEN}.`
].join(" ");
const DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT = [
	"Pre-compaction memory flush turn.",
	"The session is near auto-compaction; capture durable memories to disk.",
	MEMORY_FLUSH_TARGET_HINT,
	MEMORY_FLUSH_READ_ONLY_HINT,
	MEMORY_FLUSH_APPEND_ONLY_HINT,
	`You may reply, but usually ${SILENT_REPLY_TOKEN} is correct.`
].join(" ");
function formatDateStampInTimezone(nowMs, timezone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(new Date(nowMs));
	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;
	if (year && month && day) return `${year}-${month}-${day}`;
	return new Date(nowMs).toISOString().slice(0, 10);
}
function normalizeNonNegativeInt(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	const int = Math.floor(value);
	return int >= 0 ? int : null;
}
function ensureNoReplyHint(text) {
	if (text.includes("NO_REPLY")) return text;
	return `${text}\n\nIf no user-visible reply is needed, start with ${SILENT_REPLY_TOKEN}.`;
}
function ensureMemoryFlushSafetyHints(text) {
	let next = text.trim();
	for (const hint of MEMORY_FLUSH_REQUIRED_HINTS) if (!next.includes(hint)) next = next ? `${next}\n\n${hint}` : hint;
	return next;
}
function appendCurrentTimeLine(text, timeLine) {
	const trimmed = text.trimEnd();
	if (!trimmed) return timeLine;
	if (trimmed.includes("Current time:")) return trimmed;
	return `${trimmed}\n${timeLine}`;
}
function buildMemoryFlushPlan(params = {}) {
	const resolved = params;
	const nowMs = Number.isFinite(resolved.nowMs) ? resolved.nowMs : Date.now();
	const cfg = resolved.cfg;
	const defaults = cfg?.agents?.defaults?.compaction?.memoryFlush;
	if (defaults?.enabled === false) return null;
	const softThresholdTokens = normalizeNonNegativeInt(defaults?.softThresholdTokens) ?? 4e3;
	const forceFlushTranscriptBytes = parseNonNegativeByteSize(defaults?.forceFlushTranscriptBytes) ?? 2097152;
	const reserveTokensFloor = normalizeNonNegativeInt(cfg?.agents?.defaults?.compaction?.reserveTokensFloor) ?? 2e4;
	const { timeLine, userTimezone } = resolveCronStyleNow(cfg ?? {}, nowMs);
	const dateStamp = formatDateStampInTimezone(nowMs, userTimezone);
	const relativePath = `memory/${dateStamp}.md`;
	const promptBase = ensureNoReplyHint(ensureMemoryFlushSafetyHints(defaults?.prompt?.trim() || DEFAULT_MEMORY_FLUSH_PROMPT));
	const systemPrompt = ensureNoReplyHint(ensureMemoryFlushSafetyHints(defaults?.systemPrompt?.trim() || DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT));
	return {
		softThresholdTokens,
		forceFlushTranscriptBytes,
		reserveTokensFloor,
		prompt: appendCurrentTimeLine(promptBase.replaceAll("YYYY-MM-DD", dateStamp), timeLine),
		systemPrompt: systemPrompt.replaceAll("YYYY-MM-DD", dateStamp),
		relativePath
	};
}
//#endregion
//#region extensions/memory-core/src/prompt-section.ts
const buildPromptSection = ({ availableTools, citationsMode }) => {
	const hasMemorySearch = availableTools.has("memory_search");
	const hasMemoryGet = availableTools.has("memory_get");
	if (!hasMemorySearch && !hasMemoryGet) return [];
	let toolGuidance;
	if (hasMemorySearch && hasMemoryGet) toolGuidance = "Before answering anything about prior work, decisions, dates, people, preferences, or todos: run memory_search on MEMORY.md + memory/*.md; then use memory_get to pull only the needed lines. If low confidence after search, say you checked.";
	else if (hasMemorySearch) toolGuidance = "Before answering anything about prior work, decisions, dates, people, preferences, or todos: run memory_search on MEMORY.md + memory/*.md and answer from the matching results. If low confidence after search, say you checked.";
	else toolGuidance = "Before answering anything about prior work, decisions, dates, people, preferences, or todos that already point to a specific memory file or note: run memory_get to pull only the needed lines. If low confidence after reading them, say you checked.";
	const lines = ["## Memory Recall", toolGuidance];
	if (citationsMode === "off") lines.push("Citations are disabled: do not mention file paths or line numbers in replies unless the user explicitly asks.");
	else lines.push("Citations: include Source: <path#line> when it helps the user verify memory snippets.");
	lines.push("");
	return lines;
};
//#endregion
//#region extensions/memory-core/src/tools.citations.ts
function resolveMemoryCitationsMode(cfg) {
	const mode = cfg.memory?.citations;
	if (mode === "on" || mode === "off" || mode === "auto") return mode;
	return "auto";
}
function decorateCitations(results, include) {
	if (!include) return results.map((entry) => ({
		...entry,
		citation: void 0
	}));
	return results.map((entry) => {
		const citation = formatCitation(entry);
		const snippet = `${entry.snippet.trim()}\n\nSource: ${citation}`;
		return {
			...entry,
			citation,
			snippet
		};
	});
}
function formatCitation(entry) {
	const lineRange = entry.startLine === entry.endLine ? `#L${entry.startLine}` : `#L${entry.startLine}-L${entry.endLine}`;
	return `${entry.path}${lineRange}`;
}
function clampResultsByInjectedChars(results, budget) {
	if (!budget || budget <= 0) return results;
	let remaining = budget;
	const clamped = [];
	for (const entry of results) {
		if (remaining <= 0) break;
		const snippet = entry.snippet ?? "";
		if (snippet.length <= remaining) {
			clamped.push(entry);
			remaining -= snippet.length;
		} else {
			const trimmed = snippet.slice(0, Math.max(0, remaining));
			clamped.push({
				...entry,
				snippet: trimmed
			});
			break;
		}
	}
	return clamped;
}
function shouldIncludeCitations(params) {
	if (params.mode === "on") return true;
	if (params.mode === "off") return false;
	return deriveChatTypeFromSessionKey(params.sessionKey) === "direct";
}
function deriveChatTypeFromSessionKey(sessionKey) {
	const parsed = parseAgentSessionKey(sessionKey);
	if (!parsed?.rest) return "direct";
	const tokens = new Set(parsed.rest.toLowerCase().split(":").filter(Boolean));
	if (tokens.has("channel")) return "channel";
	if (tokens.has("group")) return "group";
	return "direct";
}
//#endregion
//#region extensions/memory-core/src/tools.shared.ts
let memoryToolRuntimePromise = null;
async function loadMemoryToolRuntime() {
	memoryToolRuntimePromise ??= import("../../tools.runtime-Puf-ZshY.js");
	return await memoryToolRuntimePromise;
}
const MemorySearchSchema = Type.Object({
	query: Type.String(),
	maxResults: Type.Optional(Type.Number()),
	minScore: Type.Optional(Type.Number())
});
const MemoryGetSchema = Type.Object({
	path: Type.String(),
	from: Type.Optional(Type.Number()),
	lines: Type.Optional(Type.Number())
});
function resolveMemoryToolContext(options) {
	const cfg = options.config;
	if (!cfg) return null;
	const agentId = resolveSessionAgentId({
		sessionKey: options.agentSessionKey,
		config: cfg
	});
	if (!resolveMemorySearchConfig(cfg, agentId)) return null;
	return {
		cfg,
		agentId
	};
}
async function getMemoryManagerContext(params) {
	return await getMemoryManagerContextWithPurpose({
		...params,
		purpose: void 0
	});
}
async function getMemoryManagerContextWithPurpose(params) {
	const { getMemorySearchManager } = await loadMemoryToolRuntime();
	const { manager, error } = await getMemorySearchManager({
		cfg: params.cfg,
		agentId: params.agentId,
		purpose: params.purpose
	});
	return manager ? { manager } : { error };
}
function createMemoryTool(params) {
	const ctx = resolveMemoryToolContext(params.options);
	if (!ctx) return null;
	return {
		label: params.label,
		name: params.name,
		description: params.description,
		parameters: params.parameters,
		execute: params.execute(ctx)
	};
}
function buildMemorySearchUnavailableResult(error) {
	const reason = (error ?? "memory search unavailable").trim() || "memory search unavailable";
	const isQuotaError = /insufficient_quota|quota|429/.test(reason.toLowerCase());
	return {
		results: [],
		disabled: true,
		unavailable: true,
		error: reason,
		warning: isQuotaError ? "Memory search is unavailable because the embedding provider quota is exhausted." : "Memory search is unavailable due to an embedding/provider error.",
		action: isQuotaError ? "Top up or switch embedding provider, then retry memory_search." : "Check embedding provider configuration and retry memory_search."
	};
}
//#endregion
//#region extensions/memory-core/src/tools.ts
function buildRecallKey(result) {
	return `${result.source}:${result.path}:${result.startLine}:${result.endLine}`;
}
function resolveRecallTrackingResults(rawResults, surfacedResults) {
	if (surfacedResults.length === 0 || rawResults.length === 0) return surfacedResults;
	const rawByKey = /* @__PURE__ */ new Map();
	for (const raw of rawResults) {
		const key = buildRecallKey(raw);
		if (!rawByKey.has(key)) rawByKey.set(key, raw);
	}
	return surfacedResults.map((surfaced) => rawByKey.get(buildRecallKey(surfaced)) ?? surfaced);
}
function queueShortTermRecallTracking(params) {
	const trackingResults = resolveRecallTrackingResults(params.rawResults, params.surfacedResults);
	recordShortTermRecalls({
		workspaceDir: params.workspaceDir,
		query: params.query,
		results: trackingResults,
		timezone: params.timezone
	}).catch(() => {});
}
function createMemorySearchTool(options) {
	return createMemoryTool({
		options,
		label: "Memory Search",
		name: "memory_search",
		description: "Mandatory recall step: semantically search MEMORY.md + memory/*.md (and optional session transcripts) before answering questions about prior work, decisions, dates, people, preferences, or todos; returns top snippets with path + lines. If response has disabled=true, memory retrieval is unavailable and should be surfaced to the user.",
		parameters: MemorySearchSchema,
		execute: ({ cfg, agentId }) => async (_toolCallId, params) => {
			const query = readStringParam(params, "query", { required: true });
			const maxResults = readNumberParam(params, "maxResults");
			const minScore = readNumberParam(params, "minScore");
			const { resolveMemoryBackendConfig } = await loadMemoryToolRuntime();
			const memory = await getMemoryManagerContext({
				cfg,
				agentId
			});
			if ("error" in memory) return jsonResult(buildMemorySearchUnavailableResult(memory.error));
			try {
				const citationsMode = resolveMemoryCitationsMode(cfg);
				const includeCitations = shouldIncludeCitations({
					mode: citationsMode,
					sessionKey: options.agentSessionKey
				});
				const rawResults = await memory.manager.search(query, {
					maxResults,
					minScore,
					sessionKey: options.agentSessionKey
				});
				const status = memory.manager.status();
				const decorated = decorateCitations(rawResults, includeCitations);
				const resolved = resolveMemoryBackendConfig({
					cfg,
					agentId
				});
				const results = status.backend === "qmd" ? clampResultsByInjectedChars(decorated, resolved.qmd?.limits.maxInjectedChars) : decorated;
				const sleepTimezone = resolveMemoryDeepDreamingConfig({
					pluginConfig: resolveMemoryCorePluginConfig$1(cfg),
					cfg
				}).timezone;
				queueShortTermRecallTracking({
					workspaceDir: status.workspaceDir,
					query,
					rawResults,
					surfacedResults: results,
					timezone: sleepTimezone
				});
				const searchMode = status.custom?.searchMode;
				return jsonResult({
					results,
					provider: status.provider,
					model: status.model,
					fallback: status.fallback,
					citations: citationsMode,
					mode: searchMode
				});
			} catch (err) {
				return jsonResult(buildMemorySearchUnavailableResult(err instanceof Error ? err.message : String(err)));
			}
		}
	});
}
function createMemoryGetTool(options) {
	return createMemoryTool({
		options,
		label: "Memory Get",
		name: "memory_get",
		description: "Safe snippet read from MEMORY.md or memory/*.md with optional from/lines; use after memory_search to pull only the needed lines and keep context small.",
		parameters: MemoryGetSchema,
		execute: ({ cfg, agentId }) => async (_toolCallId, params) => {
			const relPath = readStringParam(params, "path", { required: true });
			const from = readNumberParam(params, "from", { integer: true });
			const lines = readNumberParam(params, "lines", { integer: true });
			const { readAgentMemoryFile, resolveMemoryBackendConfig } = await loadMemoryToolRuntime();
			if (resolveMemoryBackendConfig({
				cfg,
				agentId
			}).backend === "builtin") try {
				return jsonResult(await readAgentMemoryFile({
					cfg,
					agentId,
					relPath,
					from: from ?? void 0,
					lines: lines ?? void 0
				}));
			} catch (err) {
				return jsonResult({
					path: relPath,
					text: "",
					disabled: true,
					error: err instanceof Error ? err.message : String(err)
				});
			}
			const memory = await getMemoryManagerContextWithPurpose({
				cfg,
				agentId,
				purpose: "status"
			});
			if ("error" in memory) return jsonResult({
				path: relPath,
				text: "",
				disabled: true,
				error: memory.error
			});
			try {
				return jsonResult(await memory.manager.readFile({
					relPath,
					from: from ?? void 0,
					lines: lines ?? void 0
				}));
			} catch (err) {
				return jsonResult({
					path: relPath,
					text: "",
					disabled: true,
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}
	});
}
//#endregion
//#region extensions/memory-core/index.ts
var memory_core_default = definePluginEntry({
	id: "memory-core",
	name: "Memory (Core)",
	description: "File-backed memory search tools and CLI",
	kind: "memory",
	register(api) {
		registerBuiltInMemoryEmbeddingProviders(api);
		registerShortTermPromotionDreaming(api);
		registerDreamingCommand(api);
		api.registerMemoryPromptSection(buildPromptSection);
		api.registerMemoryFlushPlan(buildMemoryFlushPlan);
		api.registerMemoryRuntime(memoryRuntime);
		api.registerTool((ctx) => createMemorySearchTool({
			config: ctx.config,
			agentSessionKey: ctx.sessionKey
		}), { names: ["memory_search"] });
		api.registerTool((ctx) => createMemoryGetTool({
			config: ctx.config,
			agentSessionKey: ctx.sessionKey
		}), { names: ["memory_get"] });
		api.registerCli(({ program }) => {
			registerMemoryCli(program);
		}, { descriptors: [{
			name: "memory",
			description: "Search, inspect, and reindex memory files",
			hasSubcommands: true
		}] });
	}
});
//#endregion
export { DEFAULT_MEMORY_FLUSH_FORCE_TRANSCRIPT_BYTES, DEFAULT_MEMORY_FLUSH_PROMPT, DEFAULT_MEMORY_FLUSH_SOFT_TOKENS, buildMemoryFlushPlan, buildPromptSection, memory_core_default as default };
