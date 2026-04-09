import { m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import { t as resolveMemorySearchConfig } from "./memory-search-DIQ9kV2j.js";
import path from "node:path";
//#region src/memory-host-sdk/dreaming.ts
const DEFAULT_MEMORY_DREAMING_ENABLED = false;
const DEFAULT_MEMORY_DREAMING_TIMEZONE = void 0;
const DEFAULT_MEMORY_DREAMING_VERBOSE_LOGGING = false;
const DEFAULT_MEMORY_DREAMING_STORAGE_MODE = "inline";
const DEFAULT_MEMORY_DREAMING_SEPARATE_REPORTS = false;
const DEFAULT_MEMORY_DREAMING_FREQUENCY = "0 3 * * *";
const DEFAULT_MEMORY_LIGHT_DREAMING_CRON_EXPR = "0 */6 * * *";
const DEFAULT_MEMORY_LIGHT_DREAMING_LOOKBACK_DAYS = 2;
const DEFAULT_MEMORY_LIGHT_DREAMING_LIMIT = 100;
const DEFAULT_MEMORY_LIGHT_DREAMING_DEDUPE_SIMILARITY = .9;
const DEFAULT_MEMORY_DEEP_DREAMING_CRON_EXPR = "0 3 * * *";
const DEFAULT_MEMORY_DEEP_DREAMING_LIMIT = 10;
const DEFAULT_MEMORY_DEEP_DREAMING_MIN_SCORE = .8;
const DEFAULT_MEMORY_DEEP_DREAMING_MIN_RECALL_COUNT = 3;
const DEFAULT_MEMORY_DEEP_DREAMING_MIN_UNIQUE_QUERIES = 3;
const DEFAULT_MEMORY_DEEP_DREAMING_RECENCY_HALF_LIFE_DAYS = 14;
const DEFAULT_MEMORY_DEEP_DREAMING_MAX_AGE_DAYS = 30;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_ENABLED = true;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_TRIGGER_BELOW_HEALTH = .35;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_LOOKBACK_DAYS = 30;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_MAX_CANDIDATES = 20;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_MIN_CONFIDENCE = .9;
const DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_AUTO_WRITE_MIN_CONFIDENCE = .97;
const DEFAULT_MEMORY_REM_DREAMING_CRON_EXPR = "0 5 * * 0";
const DEFAULT_MEMORY_REM_DREAMING_LOOKBACK_DAYS = 7;
const DEFAULT_MEMORY_REM_DREAMING_LIMIT = 10;
const DEFAULT_MEMORY_REM_DREAMING_MIN_PATTERN_STRENGTH = .75;
const DEFAULT_MEMORY_DREAMING_SPEED = "balanced";
const DEFAULT_MEMORY_DREAMING_THINKING = "medium";
const DEFAULT_MEMORY_DREAMING_BUDGET = "medium";
const DEFAULT_MEMORY_LIGHT_DREAMING_SOURCES = [
	"daily",
	"sessions",
	"recall"
];
const DEFAULT_MEMORY_DEEP_DREAMING_SOURCES = [
	"daily",
	"memory",
	"sessions",
	"logs",
	"recall"
];
const DEFAULT_MEMORY_REM_DREAMING_SOURCES = [
	"memory",
	"daily",
	"deep"
];
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function normalizeTrimmedString(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeNonNegativeInt(value, fallback) {
	if (typeof value === "string" && value.trim().length === 0) return fallback;
	const num = typeof value === "string" ? Number(value.trim()) : Number(value);
	if (!Number.isFinite(num)) return fallback;
	const floored = Math.floor(num);
	if (floored < 0) return fallback;
	return floored;
}
function normalizeOptionalPositiveInt(value) {
	if (value === void 0 || value === null) return;
	if (typeof value === "string" && value.trim().length === 0) return;
	const num = typeof value === "string" ? Number(value.trim()) : Number(value);
	if (!Number.isFinite(num)) return;
	const floored = Math.floor(num);
	if (floored <= 0) return;
	return floored;
}
function normalizeBoolean(value, fallback) {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}
	return fallback;
}
function normalizeScore(value, fallback) {
	if (typeof value === "string" && value.trim().length === 0) return fallback;
	const num = typeof value === "string" ? Number(value.trim()) : Number(value);
	if (!Number.isFinite(num) || num < 0 || num > 1) return fallback;
	return num;
}
function normalizeSimilarity(value, fallback) {
	return normalizeScore(value, fallback);
}
function normalizeStringArray(value, allowed, fallback) {
	if (!Array.isArray(value)) return [...fallback];
	const allowedSet = new Set(allowed);
	const normalized = [];
	for (const entry of value) {
		const normalizedEntry = normalizeTrimmedString(entry)?.toLowerCase();
		if (!normalizedEntry || !allowedSet.has(normalizedEntry)) continue;
		if (!normalized.includes(normalizedEntry)) normalized.push(normalizedEntry);
	}
	return normalized.length > 0 ? normalized : [...fallback];
}
function normalizeStorageMode(value) {
	const normalized = normalizeTrimmedString(value)?.toLowerCase();
	if (normalized === "inline" || normalized === "separate" || normalized === "both") return normalized;
	return DEFAULT_MEMORY_DREAMING_STORAGE_MODE;
}
function normalizeSpeed(value) {
	const normalized = normalizeTrimmedString(value)?.toLowerCase();
	if (normalized === "fast" || normalized === "balanced" || normalized === "slow") return normalized;
}
function normalizeThinking(value) {
	const normalized = normalizeTrimmedString(value)?.toLowerCase();
	if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
}
function normalizeBudget(value) {
	const normalized = normalizeTrimmedString(value)?.toLowerCase();
	if (normalized === "cheap" || normalized === "medium" || normalized === "expensive") return normalized;
}
function resolveExecutionConfig(value, fallback) {
	const record = asRecord(value);
	const maxOutputTokens = normalizeOptionalPositiveInt(record?.maxOutputTokens);
	const timeoutMs = normalizeOptionalPositiveInt(record?.timeoutMs);
	const temperatureRaw = record?.temperature;
	const temperature = typeof temperatureRaw === "number" && Number.isFinite(temperatureRaw) && temperatureRaw >= 0 ? Math.min(2, temperatureRaw) : void 0;
	return {
		speed: normalizeSpeed(record?.speed) ?? fallback.speed,
		thinking: normalizeThinking(record?.thinking) ?? fallback.thinking,
		budget: normalizeBudget(record?.budget) ?? fallback.budget,
		...normalizeTrimmedString(record?.model) ? { model: normalizeTrimmedString(record?.model) } : {},
		...typeof maxOutputTokens === "number" ? { maxOutputTokens } : {},
		...typeof temperature === "number" ? { temperature } : {},
		...typeof timeoutMs === "number" ? { timeoutMs } : {}
	};
}
function normalizePathForComparison(input) {
	const normalized = path.resolve(input);
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
function formatLocalIsoDay(epochMs) {
	const date = new Date(epochMs);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function resolveMemoryCorePluginConfig(cfg) {
	return asRecord(asRecord(asRecord(asRecord(asRecord(cfg)?.plugins)?.entries)?.["memory-core"])?.config) ?? void 0;
}
function resolveMemoryDreamingConfig(params) {
	const dreaming = asRecord(params.pluginConfig?.dreaming);
	const frequency = normalizeTrimmedString(dreaming?.frequency) ?? "0 3 * * *";
	const timezone = normalizeTrimmedString(dreaming?.timezone) ?? normalizeTrimmedString(params.cfg?.agents?.defaults?.userTimezone) ?? void 0;
	const storage = asRecord(dreaming?.storage);
	const execution = asRecord(dreaming?.execution);
	const phases = asRecord(dreaming?.phases);
	const defaultExecution = resolveExecutionConfig(execution?.defaults, {
		speed: DEFAULT_MEMORY_DREAMING_SPEED,
		thinking: DEFAULT_MEMORY_DREAMING_THINKING,
		budget: DEFAULT_MEMORY_DREAMING_BUDGET
	});
	const light = asRecord(phases?.light);
	const deep = asRecord(phases?.deep);
	const rem = asRecord(phases?.rem);
	const deepRecovery = asRecord(deep?.recovery);
	const maxAgeDays = normalizeOptionalPositiveInt(deep?.maxAgeDays);
	return {
		enabled: normalizeBoolean(dreaming?.enabled, false),
		frequency,
		...timezone ? { timezone } : {},
		verboseLogging: normalizeBoolean(dreaming?.verboseLogging, false),
		storage: {
			mode: normalizeStorageMode(storage?.mode),
			separateReports: normalizeBoolean(storage?.separateReports, false)
		},
		execution: { defaults: defaultExecution },
		phases: {
			light: {
				enabled: normalizeBoolean(light?.enabled, true),
				cron: frequency,
				lookbackDays: normalizeNonNegativeInt(light?.lookbackDays, 2),
				limit: normalizeNonNegativeInt(light?.limit, 100),
				dedupeSimilarity: normalizeSimilarity(light?.dedupeSimilarity, DEFAULT_MEMORY_LIGHT_DREAMING_DEDUPE_SIMILARITY),
				sources: normalizeStringArray(light?.sources, [
					"daily",
					"sessions",
					"recall"
				], DEFAULT_MEMORY_LIGHT_DREAMING_SOURCES),
				execution: resolveExecutionConfig(light?.execution, {
					...defaultExecution,
					speed: "fast",
					thinking: "low",
					budget: "cheap"
				})
			},
			deep: {
				enabled: normalizeBoolean(deep?.enabled, true),
				cron: frequency,
				limit: normalizeNonNegativeInt(deep?.limit, 10),
				minScore: normalizeScore(deep?.minScore, DEFAULT_MEMORY_DEEP_DREAMING_MIN_SCORE),
				minRecallCount: normalizeNonNegativeInt(deep?.minRecallCount, 3),
				minUniqueQueries: normalizeNonNegativeInt(deep?.minUniqueQueries, 3),
				recencyHalfLifeDays: normalizeNonNegativeInt(deep?.recencyHalfLifeDays, 14),
				...typeof maxAgeDays === "number" ? { maxAgeDays } : { maxAgeDays: 30 },
				sources: normalizeStringArray(deep?.sources, [
					"daily",
					"memory",
					"sessions",
					"logs",
					"recall"
				], DEFAULT_MEMORY_DEEP_DREAMING_SOURCES),
				recovery: {
					enabled: normalizeBoolean(deepRecovery?.enabled, true),
					triggerBelowHealth: normalizeScore(deepRecovery?.triggerBelowHealth, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_TRIGGER_BELOW_HEALTH),
					lookbackDays: normalizeNonNegativeInt(deepRecovery?.lookbackDays, 30),
					maxRecoveredCandidates: normalizeNonNegativeInt(deepRecovery?.maxRecoveredCandidates, 20),
					minRecoveryConfidence: normalizeScore(deepRecovery?.minRecoveryConfidence, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_MIN_CONFIDENCE),
					autoWriteMinConfidence: normalizeScore(deepRecovery?.autoWriteMinConfidence, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_AUTO_WRITE_MIN_CONFIDENCE)
				},
				execution: resolveExecutionConfig(deep?.execution, {
					...defaultExecution,
					speed: "balanced",
					thinking: "high",
					budget: "medium"
				})
			},
			rem: {
				enabled: normalizeBoolean(rem?.enabled, true),
				cron: frequency,
				lookbackDays: normalizeNonNegativeInt(rem?.lookbackDays, 7),
				limit: normalizeNonNegativeInt(rem?.limit, 10),
				minPatternStrength: normalizeScore(rem?.minPatternStrength, DEFAULT_MEMORY_REM_DREAMING_MIN_PATTERN_STRENGTH),
				sources: normalizeStringArray(rem?.sources, [
					"memory",
					"daily",
					"deep"
				], DEFAULT_MEMORY_REM_DREAMING_SOURCES),
				execution: resolveExecutionConfig(rem?.execution, {
					...defaultExecution,
					speed: "slow",
					thinking: "high",
					budget: "expensive"
				})
			}
		}
	};
}
function resolveMemoryDeepDreamingConfig(params) {
	const resolved = resolveMemoryDreamingConfig(params);
	return {
		...resolved.phases.deep,
		enabled: resolved.enabled && resolved.phases.deep.enabled,
		...resolved.timezone ? { timezone: resolved.timezone } : {},
		verboseLogging: resolved.verboseLogging,
		storage: resolved.storage
	};
}
function resolveMemoryLightDreamingConfig(params) {
	const resolved = resolveMemoryDreamingConfig(params);
	return {
		...resolved.phases.light,
		enabled: resolved.enabled && resolved.phases.light.enabled,
		...resolved.timezone ? { timezone: resolved.timezone } : {},
		verboseLogging: resolved.verboseLogging,
		storage: resolved.storage
	};
}
function resolveMemoryRemDreamingConfig(params) {
	const resolved = resolveMemoryDreamingConfig(params);
	return {
		...resolved.phases.rem,
		enabled: resolved.enabled && resolved.phases.rem.enabled,
		...resolved.timezone ? { timezone: resolved.timezone } : {},
		verboseLogging: resolved.verboseLogging,
		storage: resolved.storage
	};
}
function formatMemoryDreamingDay(epochMs, timezone) {
	if (!timezone) return formatLocalIsoDay(epochMs);
	try {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		}).formatToParts(new Date(epochMs));
		const values = new Map(parts.map((part) => [part.type, part.value]));
		const year = values.get("year");
		const month = values.get("month");
		const day = values.get("day");
		if (year && month && day) return `${year}-${month}-${day}`;
	} catch {}
	return formatLocalIsoDay(epochMs);
}
function isSameMemoryDreamingDay(firstEpochMs, secondEpochMs, timezone) {
	return formatMemoryDreamingDay(firstEpochMs, timezone) === formatMemoryDreamingDay(secondEpochMs, timezone);
}
function resolveMemoryDreamingWorkspaces(cfg) {
	const configured = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
	const agentIds = [];
	const seenAgents = /* @__PURE__ */ new Set();
	for (const entry of configured) {
		if (!entry || typeof entry !== "object" || typeof entry.id !== "string") continue;
		const id = entry.id.trim().toLowerCase();
		if (!id || seenAgents.has(id)) continue;
		seenAgents.add(id);
		agentIds.push(id);
	}
	if (agentIds.length === 0) agentIds.push(resolveDefaultAgentId(cfg));
	const byWorkspace = /* @__PURE__ */ new Map();
	for (const agentId of agentIds) {
		if (!resolveMemorySearchConfig(cfg, agentId)) continue;
		const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId)?.trim();
		if (!workspaceDir) continue;
		const key = normalizePathForComparison(workspaceDir);
		const existing = byWorkspace.get(key);
		if (existing) {
			existing.agentIds.push(agentId);
			continue;
		}
		byWorkspace.set(key, {
			workspaceDir,
			agentIds: [agentId]
		});
	}
	return [...byWorkspace.values()];
}
//#endregion
export { DEFAULT_MEMORY_REM_DREAMING_MIN_PATTERN_STRENGTH as A, DEFAULT_MEMORY_LIGHT_DREAMING_CRON_EXPR as C, DEFAULT_MEMORY_REM_DREAMING_CRON_EXPR as D, DEFAULT_MEMORY_LIGHT_DREAMING_LOOKBACK_DAYS as E, resolveMemoryDreamingConfig as F, resolveMemoryDreamingWorkspaces as I, resolveMemoryLightDreamingConfig as L, isSameMemoryDreamingDay as M, resolveMemoryCorePluginConfig as N, DEFAULT_MEMORY_REM_DREAMING_LIMIT as O, resolveMemoryDeepDreamingConfig as P, resolveMemoryRemDreamingConfig as R, DEFAULT_MEMORY_DREAMING_VERBOSE_LOGGING as S, DEFAULT_MEMORY_LIGHT_DREAMING_LIMIT as T, DEFAULT_MEMORY_DREAMING_SEPARATE_REPORTS as _, DEFAULT_MEMORY_DEEP_DREAMING_MIN_SCORE as a, DEFAULT_MEMORY_DREAMING_THINKING as b, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_AUTO_WRITE_MIN_CONFIDENCE as c, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_MAX_CANDIDATES as d, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_MIN_CONFIDENCE as f, DEFAULT_MEMORY_DREAMING_FREQUENCY as g, DEFAULT_MEMORY_DREAMING_ENABLED as h, DEFAULT_MEMORY_DEEP_DREAMING_MIN_RECALL_COUNT as i, formatMemoryDreamingDay as j, DEFAULT_MEMORY_REM_DREAMING_LOOKBACK_DAYS as k, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_ENABLED as l, DEFAULT_MEMORY_DREAMING_BUDGET as m, DEFAULT_MEMORY_DEEP_DREAMING_LIMIT as n, DEFAULT_MEMORY_DEEP_DREAMING_MIN_UNIQUE_QUERIES as o, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_TRIGGER_BELOW_HEALTH as p, DEFAULT_MEMORY_DEEP_DREAMING_MAX_AGE_DAYS as r, DEFAULT_MEMORY_DEEP_DREAMING_RECENCY_HALF_LIFE_DAYS as s, DEFAULT_MEMORY_DEEP_DREAMING_CRON_EXPR as t, DEFAULT_MEMORY_DEEP_DREAMING_RECOVERY_LOOKBACK_DAYS as u, DEFAULT_MEMORY_DREAMING_SPEED as v, DEFAULT_MEMORY_LIGHT_DREAMING_DEDUPE_SIMILARITY as w, DEFAULT_MEMORY_DREAMING_TIMEZONE as x, DEFAULT_MEMORY_DREAMING_STORAGE_MODE as y };
