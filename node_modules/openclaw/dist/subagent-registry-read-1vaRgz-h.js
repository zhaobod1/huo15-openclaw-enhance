import { _ as resolveStateDir } from "./paths-yyDPxM31.js";
import { n as saveJsonFile, t as loadJsonFile } from "./json-file-1PGlTqjr.js";
import { a as normalizeDeliveryContext } from "./delivery-context-uGixCTFh.js";
import path from "node:path";
import os from "node:os";
//#region src/agents/subagent-registry-memory.ts
const subagentRuns = /* @__PURE__ */ new Map();
//#endregion
//#region src/agents/subagent-registry-queries.ts
function resolveControllerSessionKey(entry) {
	return entry.controllerSessionKey?.trim() || entry.requesterSessionKey;
}
function findRunIdsByChildSessionKeyFromRuns(runs, childSessionKey) {
	const key = childSessionKey.trim();
	if (!key) return [];
	const runIds = [];
	for (const [runId, entry] of runs.entries()) if (entry.childSessionKey === key) runIds.push(runId);
	return runIds;
}
function listRunsForRequesterFromRuns(runs, requesterSessionKey, options) {
	const key = requesterSessionKey.trim();
	if (!key) return [];
	const requesterRunId = options?.requesterRunId?.trim();
	const requesterRun = requesterRunId ? runs.get(requesterRunId) : void 0;
	const requesterRunMatchesScope = requesterRun && requesterRun.childSessionKey === key ? requesterRun : void 0;
	const lowerBound = requesterRunMatchesScope?.startedAt ?? requesterRunMatchesScope?.createdAt;
	const upperBound = requesterRunMatchesScope?.endedAt;
	return [...runs.values()].filter((entry) => {
		if (entry.requesterSessionKey !== key) return false;
		if (typeof lowerBound === "number" && entry.createdAt < lowerBound) return false;
		if (typeof upperBound === "number" && entry.createdAt > upperBound) return false;
		return true;
	});
}
function listRunsForControllerFromRuns(runs, controllerSessionKey) {
	const key = controllerSessionKey.trim();
	if (!key) return [];
	return [...runs.values()].filter((entry) => resolveControllerSessionKey(entry) === key);
}
function findLatestRunForChildSession(runs, childSessionKey) {
	const key = childSessionKey.trim();
	if (!key) return;
	let latest;
	for (const entry of runs.values()) {
		if (entry.childSessionKey !== key) continue;
		if (!latest || entry.createdAt > latest.createdAt) latest = entry;
	}
	return latest;
}
function resolveRequesterForChildSessionFromRuns(runs, childSessionKey) {
	const latest = findLatestRunForChildSession(runs, childSessionKey);
	if (!latest) return null;
	return {
		requesterSessionKey: latest.requesterSessionKey,
		requesterOrigin: latest.requesterOrigin
	};
}
function shouldIgnorePostCompletionAnnounceForSessionFromRuns(runs, childSessionKey) {
	const latest = findLatestRunForChildSession(runs, childSessionKey);
	return Boolean(latest && latest.spawnMode !== "session" && typeof latest.endedAt === "number" && typeof latest.cleanupCompletedAt === "number" && latest.cleanupCompletedAt >= latest.endedAt);
}
function countActiveRunsForSessionFromRuns(runs, controllerSessionKey) {
	const key = controllerSessionKey.trim();
	if (!key) return 0;
	const pendingDescendantCache = /* @__PURE__ */ new Map();
	const pendingDescendantCount = (sessionKey) => {
		if (pendingDescendantCache.has(sessionKey)) return pendingDescendantCache.get(sessionKey) ?? 0;
		const pending = countPendingDescendantRunsInternal(runs, sessionKey);
		pendingDescendantCache.set(sessionKey, pending);
		return pending;
	};
	const latestByChildSessionKey = /* @__PURE__ */ new Map();
	for (const entry of runs.values()) {
		if (resolveControllerSessionKey(entry) !== key) continue;
		const existing = latestByChildSessionKey.get(entry.childSessionKey);
		if (!existing || entry.createdAt > existing.createdAt) latestByChildSessionKey.set(entry.childSessionKey, entry);
	}
	let count = 0;
	for (const entry of latestByChildSessionKey.values()) {
		if (typeof entry.endedAt !== "number") {
			count += 1;
			continue;
		}
		if (pendingDescendantCount(entry.childSessionKey) > 0) count += 1;
	}
	return count;
}
function forEachDescendantRun(runs, rootSessionKey, visitor) {
	const root = rootSessionKey.trim();
	if (!root) return false;
	const pending = [root];
	const visited = new Set([root]);
	for (let index = 0; index < pending.length; index += 1) {
		const requester = pending[index];
		if (!requester) continue;
		const latestByChildSessionKey = /* @__PURE__ */ new Map();
		for (const [runId, entry] of runs.entries()) {
			if (entry.requesterSessionKey !== requester) continue;
			const childKey = entry.childSessionKey.trim();
			const existing = latestByChildSessionKey.get(childKey);
			if (!existing || entry.createdAt > existing[1].createdAt) latestByChildSessionKey.set(childKey, [runId, entry]);
		}
		for (const [runId, entry] of latestByChildSessionKey.values()) {
			const latestForChildSession = findLatestRunForChildSession(runs, entry.childSessionKey);
			if (!latestForChildSession || latestForChildSession.runId !== runId || latestForChildSession.requesterSessionKey !== requester) continue;
			visitor(runId, entry);
			const childKey = entry.childSessionKey.trim();
			if (!childKey || visited.has(childKey)) continue;
			visited.add(childKey);
			pending.push(childKey);
		}
	}
	return true;
}
function countActiveDescendantRunsFromRuns(runs, rootSessionKey) {
	let count = 0;
	if (!forEachDescendantRun(runs, rootSessionKey, (_runId, entry) => {
		if (typeof entry.endedAt !== "number") count += 1;
	})) return 0;
	return count;
}
function countPendingDescendantRunsInternal(runs, rootSessionKey, excludeRunId) {
	const excludedRunId = excludeRunId?.trim();
	let count = 0;
	if (!forEachDescendantRun(runs, rootSessionKey, (runId, entry) => {
		const runEnded = typeof entry.endedAt === "number";
		const cleanupCompleted = typeof entry.cleanupCompletedAt === "number";
		if ((!runEnded || !cleanupCompleted) && runId !== excludedRunId) count += 1;
	})) return 0;
	return count;
}
function countPendingDescendantRunsFromRuns(runs, rootSessionKey) {
	return countPendingDescendantRunsInternal(runs, rootSessionKey);
}
function countPendingDescendantRunsExcludingRunFromRuns(runs, rootSessionKey, excludeRunId) {
	return countPendingDescendantRunsInternal(runs, rootSessionKey, excludeRunId);
}
function listDescendantRunsForRequesterFromRuns(runs, rootSessionKey) {
	const descendants = [];
	if (!forEachDescendantRun(runs, rootSessionKey, (_runId, entry) => {
		descendants.push(entry);
	})) return [];
	return descendants;
}
//#endregion
//#region src/agents/subagent-registry.store.ts
const REGISTRY_VERSION = 2;
function resolveSubagentStateDir(env = process.env) {
	if (env.OPENCLAW_STATE_DIR?.trim()) return resolveStateDir(env);
	if (env.VITEST || env.NODE_ENV === "test") return path.join(os.tmpdir(), "openclaw-test-state", String(process.pid));
	return resolveStateDir(env);
}
function resolveSubagentRegistryPath() {
	return path.join(resolveSubagentStateDir(process.env), "subagents", "runs.json");
}
function loadSubagentRegistryFromDisk() {
	const raw = loadJsonFile(resolveSubagentRegistryPath());
	if (!raw || typeof raw !== "object") return /* @__PURE__ */ new Map();
	const record = raw;
	if (record.version !== 1 && record.version !== 2) return /* @__PURE__ */ new Map();
	const runsRaw = record.runs;
	if (!runsRaw || typeof runsRaw !== "object") return /* @__PURE__ */ new Map();
	const out = /* @__PURE__ */ new Map();
	const isLegacy = record.version === 1;
	let migrated = false;
	for (const [runId, entry] of Object.entries(runsRaw)) {
		if (!entry || typeof entry !== "object") continue;
		const typed = entry;
		if (!typed.runId || typeof typed.runId !== "string") continue;
		const legacyCompletedAt = isLegacy && typeof typed.announceCompletedAt === "number" ? typed.announceCompletedAt : void 0;
		const cleanupCompletedAt = typeof typed.cleanupCompletedAt === "number" ? typed.cleanupCompletedAt : legacyCompletedAt;
		const cleanupHandled = typeof typed.cleanupHandled === "boolean" ? typed.cleanupHandled : isLegacy ? Boolean(typed.announceHandled ?? cleanupCompletedAt) : void 0;
		const requesterOrigin = normalizeDeliveryContext(typed.requesterOrigin ?? {
			channel: typeof typed.requesterChannel === "string" ? typed.requesterChannel : void 0,
			accountId: typeof typed.requesterAccountId === "string" ? typed.requesterAccountId : void 0
		});
		const { announceCompletedAt: _announceCompletedAt, announceHandled: _announceHandled, requesterChannel: _channel, requesterAccountId: _accountId, ...rest } = typed;
		out.set(runId, {
			...rest,
			requesterOrigin,
			cleanupCompletedAt,
			cleanupHandled,
			spawnMode: typed.spawnMode === "session" ? "session" : "run"
		});
		if (isLegacy) migrated = true;
	}
	if (migrated) try {
		saveSubagentRegistryToDisk(out);
	} catch {}
	return out;
}
function saveSubagentRegistryToDisk(runs) {
	const pathname = resolveSubagentRegistryPath();
	const serialized = {};
	for (const [runId, entry] of runs.entries()) serialized[runId] = entry;
	saveJsonFile(pathname, {
		version: REGISTRY_VERSION,
		runs: serialized
	});
}
//#endregion
//#region src/agents/subagent-registry-state.ts
function persistSubagentRunsToDisk(runs) {
	try {
		saveSubagentRegistryToDisk(runs);
	} catch {}
}
function restoreSubagentRunsFromDisk(params) {
	const restored = loadSubagentRegistryFromDisk();
	if (restored.size === 0) return 0;
	let added = 0;
	for (const [runId, entry] of restored.entries()) {
		if (!runId || !entry) continue;
		if (params.mergeOnly && params.runs.has(runId)) continue;
		params.runs.set(runId, entry);
		added += 1;
	}
	return added;
}
function getSubagentRunsSnapshotForRead(inMemoryRuns) {
	const merged = /* @__PURE__ */ new Map();
	if (process.env.OPENCLAW_TEST_READ_SUBAGENT_RUNS_FROM_DISK === "1" || !(process.env.VITEST || false)) try {
		for (const [runId, entry] of loadSubagentRegistryFromDisk().entries()) merged.set(runId, entry);
	} catch {}
	for (const [runId, entry] of inMemoryRuns.entries()) merged.set(runId, entry);
	return merged;
}
//#endregion
//#region src/agents/subagent-lifecycle-events.ts
const SUBAGENT_TARGET_KIND_SUBAGENT = "subagent";
const SUBAGENT_ENDED_REASON_COMPLETE = "subagent-complete";
const SUBAGENT_ENDED_REASON_ERROR = "subagent-error";
const SUBAGENT_ENDED_REASON_KILLED = "subagent-killed";
const SUBAGENT_ENDED_OUTCOME_ERROR = "error";
const SUBAGENT_ENDED_OUTCOME_TIMEOUT = "timeout";
const SUBAGENT_ENDED_OUTCOME_KILLED = "killed";
//#endregion
//#region src/agents/subagent-registry-read.ts
function resolveSubagentSessionStartedAt(entry) {
	if (typeof entry.sessionStartedAt === "number" && Number.isFinite(entry.sessionStartedAt)) return entry.sessionStartedAt;
	if (typeof entry.startedAt === "number" && Number.isFinite(entry.startedAt)) return entry.startedAt;
	return typeof entry.createdAt === "number" && Number.isFinite(entry.createdAt) ? entry.createdAt : void 0;
}
function getSubagentSessionStartedAt(entry) {
	return entry ? resolveSubagentSessionStartedAt(entry) : void 0;
}
function getSubagentSessionRuntimeMs(entry, now = Date.now()) {
	if (!entry) return;
	const accumulatedRuntimeMs = typeof entry.accumulatedRuntimeMs === "number" && Number.isFinite(entry.accumulatedRuntimeMs) ? Math.max(0, entry.accumulatedRuntimeMs) : 0;
	if (typeof entry.startedAt !== "number" || !Number.isFinite(entry.startedAt)) return entry.accumulatedRuntimeMs != null ? accumulatedRuntimeMs : void 0;
	const currentRunEndedAt = typeof entry.endedAt === "number" && Number.isFinite(entry.endedAt) ? entry.endedAt : now;
	return Math.max(0, accumulatedRuntimeMs + Math.max(0, currentRunEndedAt - entry.startedAt));
}
function resolveSubagentSessionStatus(entry) {
	if (!entry) return;
	if (!entry.endedAt) return "running";
	if (entry.endedReason === "subagent-killed") return "killed";
	const status = entry.outcome?.status;
	if (status === "error") return "failed";
	if (status === "timeout") return "timeout";
	return "done";
}
function listSubagentRunsForController(controllerSessionKey) {
	return listRunsForControllerFromRuns(getSubagentRunsSnapshotForRead(subagentRuns), controllerSessionKey);
}
function countActiveDescendantRuns(rootSessionKey) {
	return countActiveDescendantRunsFromRuns(getSubagentRunsSnapshotForRead(subagentRuns), rootSessionKey);
}
function listDescendantRunsForRequester(rootSessionKey) {
	return listDescendantRunsForRequesterFromRuns(getSubagentRunsSnapshotForRead(subagentRuns), rootSessionKey);
}
function getSubagentRunByChildSessionKey(childSessionKey) {
	const key = childSessionKey.trim();
	if (!key) return null;
	let latestActive = null;
	let latestEnded = null;
	for (const entry of getSubagentRunsSnapshotForRead(subagentRuns).values()) {
		if (entry.childSessionKey !== key) continue;
		if (typeof entry.endedAt !== "number") {
			if (!latestActive || entry.createdAt > latestActive.createdAt) latestActive = entry;
			continue;
		}
		if (!latestEnded || entry.createdAt > latestEnded.createdAt) latestEnded = entry;
	}
	return latestActive ?? latestEnded;
}
function getSessionDisplaySubagentRunByChildSessionKey(childSessionKey) {
	const key = childSessionKey.trim();
	if (!key) return null;
	let latestInMemoryActive = null;
	let latestInMemoryEnded = null;
	for (const entry of subagentRuns.values()) {
		if (entry.childSessionKey !== key) continue;
		if (typeof entry.endedAt === "number") {
			if (!latestInMemoryEnded || entry.createdAt > latestInMemoryEnded.createdAt) latestInMemoryEnded = entry;
			continue;
		}
		if (!latestInMemoryActive || entry.createdAt > latestInMemoryActive.createdAt) latestInMemoryActive = entry;
	}
	if (latestInMemoryEnded || latestInMemoryActive) {
		if (latestInMemoryEnded && (!latestInMemoryActive || latestInMemoryEnded.createdAt > latestInMemoryActive.createdAt)) return latestInMemoryEnded;
		return latestInMemoryActive ?? latestInMemoryEnded;
	}
	return getSubagentRunByChildSessionKey(key);
}
function getLatestSubagentRunByChildSessionKey(childSessionKey) {
	const key = childSessionKey.trim();
	if (!key) return null;
	let latest = null;
	for (const entry of getSubagentRunsSnapshotForRead(subagentRuns).values()) {
		if (entry.childSessionKey !== key) continue;
		if (!latest || entry.createdAt > latest.createdAt) latest = entry;
	}
	return latest;
}
//#endregion
export { findRunIdsByChildSessionKeyFromRuns as C, resolveRequesterForChildSessionFromRuns as D, listRunsForRequesterFromRuns as E, shouldIgnorePostCompletionAnnounceForSessionFromRuns as O, countPendingDescendantRunsFromRuns as S, listRunsForControllerFromRuns as T, persistSubagentRunsToDisk as _, getSubagentSessionStartedAt as a, countActiveRunsForSessionFromRuns as b, resolveSubagentSessionStatus as c, SUBAGENT_ENDED_OUTCOME_TIMEOUT as d, SUBAGENT_ENDED_REASON_COMPLETE as f, getSubagentRunsSnapshotForRead as g, SUBAGENT_TARGET_KIND_SUBAGENT as h, getSubagentSessionRuntimeMs as i, subagentRuns as k, SUBAGENT_ENDED_OUTCOME_ERROR as l, SUBAGENT_ENDED_REASON_KILLED as m, getLatestSubagentRunByChildSessionKey as n, listDescendantRunsForRequester as o, SUBAGENT_ENDED_REASON_ERROR as p, getSessionDisplaySubagentRunByChildSessionKey as r, listSubagentRunsForController as s, countActiveDescendantRuns as t, SUBAGENT_ENDED_OUTCOME_KILLED as u, restoreSubagentRunsFromDisk as v, listDescendantRunsForRequesterFromRuns as w, countPendingDescendantRunsExcludingRunFromRuns as x, countActiveDescendantRunsFromRuns as y };
