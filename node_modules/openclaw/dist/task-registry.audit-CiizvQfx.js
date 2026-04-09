import { n as resolveGlobalSingleton } from "./global-singleton-vftIYBun.js";
import { w as parseAgentSessionKey } from "./session-key-BR3Z-ljs.js";
import { n as iterateBootstrapChannelPlugins } from "./bootstrap-registry-DSG7nIY1.js";
import "./sessions-D5EF_laP.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { c as getAgentRunContext } from "./agent-events-B4irFqCI.js";
import { b as resolveTaskForLookupToken, h as markTaskLostById, i as ensureTaskRegistryReady, l as listTaskRecords, o as getTaskById, r as deleteTaskRecordById, v as maybeDeliverTaskTerminalUpdate, x as setTaskCleanupAfterById } from "./runtime-internal-CIE3v0YN.js";
import { n as summarizeTaskRecords } from "./task-registry.summary-CXT_aQg6.js";
import { n as readAcpSessionEntry } from "./session-meta-BpAuMZIp.js";
import { t as createEmptyTaskAuditSummary } from "./task-registry.audit.shared-DMUhExK_.js";
//#region src/cron/active-jobs.ts
const CRON_ACTIVE_JOB_STATE_KEY = Symbol.for("openclaw.cron.activeJobs");
function getCronActiveJobState() {
	return resolveGlobalSingleton(CRON_ACTIVE_JOB_STATE_KEY, () => ({ activeJobIds: /* @__PURE__ */ new Set() }));
}
function markCronJobActive(jobId) {
	if (!jobId) return;
	getCronActiveJobState().activeJobIds.add(jobId);
}
function clearCronJobActive(jobId) {
	if (!jobId) return;
	getCronActiveJobState().activeJobIds.delete(jobId);
}
function isCronJobActive(jobId) {
	if (!jobId) return false;
	return getCronActiveJobState().activeJobIds.has(jobId);
}
//#endregion
//#region src/sessions/session-chat-type.ts
function deriveBuiltInLegacySessionChatType(scopedSessionKey) {
	if (/^group:[^:]+$/.test(scopedSessionKey)) return "group";
	if (/^[0-9]+(?:-[0-9]+)*@g\.us$/.test(scopedSessionKey)) return "group";
	if (/^whatsapp:(?!.*:group:).+@g\.us$/.test(scopedSessionKey)) return "group";
	if (/^discord:(?:[^:]+:)?guild-[^:]+:channel-[^:]+$/.test(scopedSessionKey)) return "channel";
}
/**
* Best-effort chat-type extraction from session keys across canonical and legacy formats.
*/
function deriveSessionChatType(sessionKey) {
	const raw = (sessionKey ?? "").trim().toLowerCase();
	if (!raw) return "unknown";
	const scoped = parseAgentSessionKey(raw)?.rest ?? raw;
	const tokens = new Set(scoped.split(":").filter(Boolean));
	if (tokens.has("group")) return "group";
	if (tokens.has("channel")) return "channel";
	if (tokens.has("direct") || tokens.has("dm")) return "direct";
	const builtInLegacy = deriveBuiltInLegacySessionChatType(scoped);
	if (builtInLegacy) return builtInLegacy;
	for (const plugin of iterateBootstrapChannelPlugins()) {
		const derived = plugin.messaging?.deriveLegacySessionChatType?.(scoped);
		if (derived) return derived;
	}
	return "unknown";
}
//#endregion
//#region src/tasks/task-registry.maintenance.ts
const TASK_RECONCILE_GRACE_MS = 5 * 6e4;
const TASK_RETENTION_MS = 10080 * 6e4;
const TASK_SWEEP_INTERVAL_MS = 6e4;
/**
* Number of tasks to process before yielding to the event loop.
* Keeps the main thread responsive during large sweeps.
*/
const SWEEP_YIELD_BATCH_SIZE = 25;
let sweeper = null;
let deferredSweep = null;
let sweepInProgress = false;
function findSessionEntryByKey(store, sessionKey) {
	const direct = store[sessionKey];
	if (direct) return direct;
	const normalized = sessionKey.toLowerCase();
	for (const [key, entry] of Object.entries(store)) if (key.toLowerCase() === normalized) return entry;
}
function isActiveTask(task) {
	return task.status === "queued" || task.status === "running";
}
function isTerminalTask(task) {
	return !isActiveTask(task);
}
function hasLostGraceExpired(task, now) {
	return now - (task.lastEventAt ?? task.startedAt ?? task.createdAt) >= TASK_RECONCILE_GRACE_MS;
}
function hasActiveCliRun(task) {
	const candidateRunIds = [task.sourceId, task.runId];
	for (const candidate of candidateRunIds) {
		const runId = candidate?.trim();
		if (runId && getAgentRunContext(runId)) return true;
	}
	return false;
}
function hasBackingSession(task) {
	if (task.runtime === "cron") {
		const jobId = task.sourceId?.trim();
		return jobId ? isCronJobActive(jobId) : false;
	}
	if (task.runtime === "cli" && hasActiveCliRun(task)) return true;
	const childSessionKey = task.childSessionKey?.trim();
	if (!childSessionKey) return true;
	if (task.runtime === "acp") {
		const acpEntry = readAcpSessionEntry({ sessionKey: childSessionKey });
		if (!acpEntry || acpEntry.storeReadFailed) return true;
		return Boolean(acpEntry.entry);
	}
	if (task.runtime === "subagent" || task.runtime === "cli") {
		if (task.runtime === "cli") {
			const chatType = deriveSessionChatType(childSessionKey);
			if (chatType === "channel" || chatType === "group" || chatType === "direct") return false;
		}
		const agentId = parseAgentSessionKey(childSessionKey)?.agentId;
		const store = loadSessionStore(resolveStorePath(void 0, { agentId }));
		return Boolean(findSessionEntryByKey(store, childSessionKey));
	}
	return true;
}
function shouldMarkLost(task, now) {
	if (!isActiveTask(task)) return false;
	if (!hasLostGraceExpired(task, now)) return false;
	return !hasBackingSession(task);
}
function shouldPruneTerminalTask(task, now) {
	if (!isTerminalTask(task)) return false;
	if (typeof task.cleanupAfter === "number") return now >= task.cleanupAfter;
	return now - (task.endedAt ?? task.lastEventAt ?? task.createdAt) >= TASK_RETENTION_MS;
}
function shouldStampCleanupAfter(task) {
	return isTerminalTask(task) && typeof task.cleanupAfter !== "number";
}
function resolveCleanupAfter(task) {
	return (task.endedAt ?? task.lastEventAt ?? task.createdAt) + TASK_RETENTION_MS;
}
function markTaskLost(task, now) {
	const cleanupAfter = task.cleanupAfter ?? projectTaskLost(task, now).cleanupAfter;
	const updated = markTaskLostById({
		taskId: task.taskId,
		endedAt: task.endedAt ?? now,
		lastEventAt: now,
		error: task.error ?? "backing session missing",
		cleanupAfter
	}) ?? task;
	maybeDeliverTaskTerminalUpdate(updated.taskId);
	return updated;
}
function projectTaskLost(task, now) {
	const projected = {
		...task,
		status: "lost",
		endedAt: task.endedAt ?? now,
		lastEventAt: now,
		error: task.error ?? "backing session missing"
	};
	return {
		...projected,
		...typeof projected.cleanupAfter === "number" ? {} : { cleanupAfter: resolveCleanupAfter(projected) }
	};
}
function reconcileTaskRecordForOperatorInspection(task) {
	const now = Date.now();
	if (!shouldMarkLost(task, now)) return task;
	return projectTaskLost(task, now);
}
function reconcileInspectableTasks() {
	ensureTaskRegistryReady();
	return listTaskRecords().map((task) => reconcileTaskRecordForOperatorInspection(task));
}
function getInspectableTaskRegistrySummary() {
	return summarizeTaskRecords(reconcileInspectableTasks());
}
function getInspectableTaskAuditSummary() {
	return summarizeTaskAuditFindings(listTaskAuditFindings({ tasks: reconcileInspectableTasks() }));
}
function reconcileTaskLookupToken(token) {
	ensureTaskRegistryReady();
	const task = resolveTaskForLookupToken(token);
	return task ? reconcileTaskRecordForOperatorInspection(task) : void 0;
}
function previewTaskRegistryMaintenance() {
	ensureTaskRegistryReady();
	const now = Date.now();
	let reconciled = 0;
	let cleanupStamped = 0;
	let pruned = 0;
	for (const task of listTaskRecords()) {
		if (shouldMarkLost(task, now)) {
			reconciled += 1;
			continue;
		}
		if (shouldPruneTerminalTask(task, now)) {
			pruned += 1;
			continue;
		}
		if (shouldStampCleanupAfter(task)) cleanupStamped += 1;
	}
	return {
		reconciled,
		cleanupStamped,
		pruned
	};
}
/**
* Yield control back to the event loop so that pending I/O callbacks,
* timers, and incoming requests can be processed between batches of
* synchronous task-registry maintenance work.
*/
function yieldToEventLoop() {
	return new Promise((resolve) => setImmediate(resolve));
}
function startScheduledSweep() {
	if (sweepInProgress) return;
	sweepInProgress = true;
	sweepTaskRegistry().finally(() => {
		sweepInProgress = false;
	});
}
async function runTaskRegistryMaintenance() {
	ensureTaskRegistryReady();
	const now = Date.now();
	let reconciled = 0;
	let cleanupStamped = 0;
	let pruned = 0;
	const tasks = listTaskRecords();
	let processed = 0;
	for (const task of tasks) {
		const current = getTaskById(task.taskId);
		if (!current) continue;
		if (shouldMarkLost(current, now)) {
			if (markTaskLost(current, now).status === "lost") reconciled += 1;
			processed += 1;
			if (processed % SWEEP_YIELD_BATCH_SIZE === 0) await yieldToEventLoop();
			continue;
		}
		if (shouldPruneTerminalTask(current, now) && deleteTaskRecordById(current.taskId)) {
			pruned += 1;
			processed += 1;
			if (processed % SWEEP_YIELD_BATCH_SIZE === 0) await yieldToEventLoop();
			continue;
		}
		if (shouldStampCleanupAfter(current) && setTaskCleanupAfterById({
			taskId: current.taskId,
			cleanupAfter: resolveCleanupAfter(current)
		})) cleanupStamped += 1;
		processed += 1;
		if (processed % SWEEP_YIELD_BATCH_SIZE === 0) await yieldToEventLoop();
	}
	return {
		reconciled,
		cleanupStamped,
		pruned
	};
}
async function sweepTaskRegistry() {
	return runTaskRegistryMaintenance();
}
function startTaskRegistryMaintenance() {
	ensureTaskRegistryReady();
	deferredSweep = setTimeout(() => {
		deferredSweep = null;
		startScheduledSweep();
	}, 5e3);
	deferredSweep.unref?.();
	if (sweeper) return;
	sweeper = setInterval(startScheduledSweep, TASK_SWEEP_INTERVAL_MS);
	sweeper.unref?.();
}
function stopTaskRegistryMaintenance() {
	if (deferredSweep) {
		clearTimeout(deferredSweep);
		deferredSweep = null;
	}
	if (sweeper) {
		clearInterval(sweeper);
		sweeper = null;
	}
	sweepInProgress = false;
}
const stopTaskRegistryMaintenanceForTests = stopTaskRegistryMaintenance;
function getReconciledTaskById(taskId) {
	const task = getTaskById(taskId);
	return task ? reconcileTaskRecordForOperatorInspection(task) : void 0;
}
//#endregion
//#region src/tasks/task-registry.audit.ts
const DEFAULT_STALE_QUEUED_MS = 10 * 6e4;
const DEFAULT_STALE_RUNNING_MS = 30 * 6e4;
function createFinding(params) {
	return {
		severity: params.severity,
		code: params.code,
		task: params.task,
		detail: params.detail,
		...typeof params.ageMs === "number" ? { ageMs: params.ageMs } : {}
	};
}
function taskReferenceAt(task) {
	return task.lastEventAt ?? task.startedAt ?? task.createdAt;
}
function findTimestampInconsistency(task) {
	if (task.startedAt && task.startedAt < task.createdAt) return createFinding({
		severity: "warn",
		code: "inconsistent_timestamps",
		task,
		detail: "startedAt is earlier than createdAt"
	});
	if (task.endedAt && task.startedAt && task.endedAt < task.startedAt) return createFinding({
		severity: "warn",
		code: "inconsistent_timestamps",
		task,
		detail: "endedAt is earlier than startedAt"
	});
	if ((task.status === "queued" || task.status === "running") && task.endedAt) return createFinding({
		severity: "warn",
		code: "inconsistent_timestamps",
		task,
		detail: `${task.status} task should not already have endedAt`
	});
	return null;
}
function compareFindings(left, right) {
	const severityRank = (severity) => severity === "error" ? 0 : 1;
	const severityDiff = severityRank(left.severity) - severityRank(right.severity);
	if (severityDiff !== 0) return severityDiff;
	const leftAge = left.ageMs ?? -1;
	const rightAge = right.ageMs ?? -1;
	if (leftAge !== rightAge) return rightAge - leftAge;
	return left.task.createdAt - right.task.createdAt;
}
function listTaskAuditFindings(options = {}) {
	const tasks = options.tasks ?? reconcileInspectableTasks();
	const now = options.now ?? Date.now();
	const staleQueuedMs = options.staleQueuedMs ?? DEFAULT_STALE_QUEUED_MS;
	const staleRunningMs = options.staleRunningMs ?? DEFAULT_STALE_RUNNING_MS;
	const findings = [];
	for (const task of tasks) {
		const referenceAt = taskReferenceAt(task);
		const ageMs = Math.max(0, now - referenceAt);
		if (task.status === "queued" && ageMs >= staleQueuedMs) findings.push(createFinding({
			severity: "warn",
			code: "stale_queued",
			task,
			ageMs,
			detail: "queued task has not advanced recently"
		}));
		if (task.status === "running" && ageMs >= staleRunningMs) findings.push(createFinding({
			severity: "error",
			code: "stale_running",
			task,
			ageMs,
			detail: "running task appears stuck"
		}));
		if (task.status === "lost") findings.push(createFinding({
			severity: "error",
			code: "lost",
			task,
			ageMs,
			detail: task.error?.trim() || "task lost its backing session"
		}));
		if (task.deliveryStatus === "failed" && task.notifyPolicy !== "silent") findings.push(createFinding({
			severity: "warn",
			code: "delivery_failed",
			task,
			ageMs,
			detail: "terminal update delivery failed"
		}));
		if (task.status !== "lost" && task.status !== "queued" && task.status !== "running" && typeof task.cleanupAfter !== "number") findings.push(createFinding({
			severity: "warn",
			code: "missing_cleanup",
			task,
			ageMs,
			detail: "terminal task is missing cleanupAfter"
		}));
		const inconsistency = findTimestampInconsistency(task);
		if (inconsistency) findings.push(inconsistency);
	}
	return findings.toSorted(compareFindings);
}
function summarizeTaskAuditFindings(findings) {
	const summary = createEmptyTaskAuditSummary();
	for (const finding of findings) {
		summary.total += 1;
		summary.byCode[finding.code] += 1;
		if (finding.severity === "error") summary.errors += 1;
		else summary.warnings += 1;
	}
	return summary;
}
//#endregion
export { getReconciledTaskById as a, reconcileTaskLookupToken as c, startTaskRegistryMaintenance as d, stopTaskRegistryMaintenance as f, markCronJobActive as g, clearCronJobActive as h, getInspectableTaskRegistrySummary as i, reconcileTaskRecordForOperatorInspection as l, sweepTaskRegistry as m, summarizeTaskAuditFindings as n, previewTaskRegistryMaintenance as o, stopTaskRegistryMaintenanceForTests as p, getInspectableTaskAuditSummary as r, reconcileInspectableTasks as s, listTaskAuditFindings as t, runTaskRegistryMaintenance as u };
