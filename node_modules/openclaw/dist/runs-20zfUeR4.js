import { n as resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir-BobVQuve.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { n as resolveGlobalSingleton } from "./global-singleton-vftIYBun.js";
import { i as getRuntimeConfig } from "./io-CS2J_l4V.js";
import "./config-dzPpvDz6.js";
import { d as resolveGatewayLaunchAgentLabel, m as resolveGatewayWindowsTaskName, p as resolveGatewaySystemdServiceName } from "./paths-DRWfIhrn.js";
import { o as quoteCmdScriptArg, t as cleanStaleGatewayProcessesSync } from "./restart-stale-pids-6v9JnhXs.js";
import { a as resolveTaskScriptPath } from "./schtasks-CyZGdFta.js";
import { l as logSessionStateChange, s as logMessageQueued, t as diag } from "./diagnostic-DeM0n-NO.js";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import { randomUUID } from "node:crypto";
//#region src/infra/windows-task-restart.ts
const TASK_RESTART_RETRY_LIMIT = 12;
const TASK_RESTART_RETRY_DELAY_SEC = 1;
function resolveWindowsTaskName(env) {
	const override = env.OPENCLAW_WINDOWS_TASK_NAME?.trim();
	if (override) return override;
	return resolveGatewayWindowsTaskName(env.OPENCLAW_PROFILE);
}
function buildScheduledTaskRestartScript(taskName, taskScriptPath) {
	const quotedTaskName = quoteCmdScriptArg(taskName);
	const lines = [
		"@echo off",
		"setlocal",
		`schtasks /Query /TN ${quotedTaskName} >nul 2>&1`,
		"if errorlevel 1 goto fallback",
		"set /a attempts=0",
		":retry",
		`timeout /t ${TASK_RESTART_RETRY_DELAY_SEC} /nobreak >nul`,
		"set /a attempts+=1",
		`schtasks /Run /TN ${quotedTaskName} >nul 2>&1`,
		"if not errorlevel 1 goto cleanup",
		`if %attempts% GEQ ${TASK_RESTART_RETRY_LIMIT} goto fallback`,
		"goto retry",
		":fallback"
	];
	if (taskScriptPath) {
		const quotedScript = quoteCmdScriptArg(taskScriptPath);
		lines.push(`if exist ${quotedScript} (`, `  start "" /min cmd.exe /d /c ${quotedScript}`, ")");
	}
	lines.push(":cleanup", "del \"%~f0\" >nul 2>&1");
	return lines.join("\r\n");
}
function relaunchGatewayScheduledTask(env = process.env) {
	const taskName = resolveWindowsTaskName(env);
	const taskScriptPath = resolveTaskScriptPath(env);
	const scriptPath = path.join(resolvePreferredOpenClawTmpDir(), `openclaw-schtasks-restart-${randomUUID()}.cmd`);
	const quotedScriptPath = quoteCmdScriptArg(scriptPath);
	try {
		fs.writeFileSync(scriptPath, `${buildScheduledTaskRestartScript(taskName, taskScriptPath)}\r\n`, "utf8");
		spawn("cmd.exe", [
			"/d",
			"/s",
			"/c",
			quotedScriptPath
		], {
			detached: true,
			stdio: "ignore",
			windowsHide: true
		}).unref();
		return {
			ok: true,
			method: "schtasks",
			tried: [`schtasks /Run /TN "${taskName}"`, `cmd.exe /d /s /c ${quotedScriptPath}`]
		};
	} catch (err) {
		try {
			fs.unlinkSync(scriptPath);
		} catch {}
		return {
			ok: false,
			method: "schtasks",
			detail: err instanceof Error ? err.message : String(err),
			tried: [`schtasks /Run /TN "${taskName}"`]
		};
	}
}
//#endregion
//#region src/infra/restart.ts
const SPAWN_TIMEOUT_MS = 2e3;
const SIGUSR1_AUTH_GRACE_MS = 5e3;
const DEFAULT_DEFERRAL_POLL_MS = 500;
const DEFAULT_DEFERRAL_MAX_WAIT_MS = 3e5;
const RESTART_COOLDOWN_MS = 3e4;
const restartLog = createSubsystemLogger("restart");
let sigusr1AuthorizedCount = 0;
let sigusr1AuthorizedUntil = 0;
let sigusr1ExternalAllowed = false;
let preRestartCheck = null;
let restartCycleToken = 0;
let emittedRestartToken = 0;
let consumedRestartToken = 0;
let lastRestartEmittedAt = 0;
let pendingRestartTimer = null;
let pendingRestartDueAt = 0;
let pendingRestartReason;
function hasUnconsumedRestartSignal() {
	return emittedRestartToken > consumedRestartToken;
}
function clearPendingScheduledRestart() {
	if (pendingRestartTimer) clearTimeout(pendingRestartTimer);
	pendingRestartTimer = null;
	pendingRestartDueAt = 0;
	pendingRestartReason = void 0;
}
function summarizeChangedPaths(paths, maxPaths = 6) {
	if (!Array.isArray(paths) || paths.length === 0) return null;
	if (paths.length <= maxPaths) return paths.join(",");
	return `${paths.slice(0, maxPaths).join(",")},+${paths.length - maxPaths} more`;
}
function formatRestartAudit(audit) {
	const actor = typeof audit?.actor === "string" && audit.actor.trim() ? audit.actor.trim() : null;
	const deviceId = typeof audit?.deviceId === "string" && audit.deviceId.trim() ? audit.deviceId.trim() : null;
	const clientIp = typeof audit?.clientIp === "string" && audit.clientIp.trim() ? audit.clientIp.trim() : null;
	const changed = summarizeChangedPaths(audit?.changedPaths);
	const fields = [];
	if (actor) fields.push(`actor=${actor}`);
	if (deviceId) fields.push(`device=${deviceId}`);
	if (clientIp) fields.push(`ip=${clientIp}`);
	if (changed) fields.push(`changedPaths=${changed}`);
	return fields.length > 0 ? fields.join(" ") : "actor=<unknown>";
}
/**
* Register a callback that scheduleGatewaySigusr1Restart checks before emitting SIGUSR1.
* The callback should return the number of pending items (0 = safe to restart).
*/
function setPreRestartDeferralCheck(fn) {
	preRestartCheck = fn;
}
/**
* Emit an authorized SIGUSR1 gateway restart, guarded against duplicate emissions.
* Returns true if SIGUSR1 was emitted, false if a restart was already emitted.
* Both scheduleGatewaySigusr1Restart and the config watcher should use this
* to ensure only one restart fires.
*/
function emitGatewayRestart() {
	if (hasUnconsumedRestartSignal()) {
		clearPendingScheduledRestart();
		return false;
	}
	clearPendingScheduledRestart();
	emittedRestartToken = ++restartCycleToken;
	authorizeGatewaySigusr1Restart();
	try {
		if (process.listenerCount("SIGUSR1") > 0) process.emit("SIGUSR1");
		else process.kill(process.pid, "SIGUSR1");
	} catch {
		emittedRestartToken = consumedRestartToken;
		return false;
	}
	lastRestartEmittedAt = Date.now();
	return true;
}
function resetSigusr1AuthorizationIfExpired(now = Date.now()) {
	if (sigusr1AuthorizedCount <= 0) return;
	if (now <= sigusr1AuthorizedUntil) return;
	sigusr1AuthorizedCount = 0;
	sigusr1AuthorizedUntil = 0;
}
function setGatewaySigusr1RestartPolicy(opts) {
	sigusr1ExternalAllowed = opts?.allowExternal === true;
}
function isGatewaySigusr1RestartExternallyAllowed() {
	return sigusr1ExternalAllowed;
}
function authorizeGatewaySigusr1Restart(delayMs = 0) {
	const delay = Math.max(0, Math.floor(delayMs));
	const expiresAt = Date.now() + delay + SIGUSR1_AUTH_GRACE_MS;
	sigusr1AuthorizedCount += 1;
	if (expiresAt > sigusr1AuthorizedUntil) sigusr1AuthorizedUntil = expiresAt;
}
function consumeGatewaySigusr1RestartAuthorization() {
	resetSigusr1AuthorizationIfExpired();
	if (sigusr1AuthorizedCount <= 0) return false;
	sigusr1AuthorizedCount -= 1;
	if (sigusr1AuthorizedCount <= 0) sigusr1AuthorizedUntil = 0;
	return true;
}
/**
* Mark the currently emitted SIGUSR1 restart cycle as consumed by the run loop.
* This explicitly advances the cycle state instead of resetting emit guards inside
* consumeGatewaySigusr1RestartAuthorization().
*/
function markGatewaySigusr1RestartHandled() {
	if (hasUnconsumedRestartSignal()) consumedRestartToken = emittedRestartToken;
}
/**
* Poll pending work until it drains (or times out), then emit one restart signal.
* Shared by both the direct RPC restart path and the config watcher path.
*/
function deferGatewayRestartUntilIdle(opts) {
	const pollMsRaw = opts.pollMs ?? DEFAULT_DEFERRAL_POLL_MS;
	const pollMs = Math.max(10, Math.floor(pollMsRaw));
	const maxWaitMsRaw = opts.maxWaitMs ?? DEFAULT_DEFERRAL_MAX_WAIT_MS;
	const maxWaitMs = Math.max(pollMs, Math.floor(maxWaitMsRaw));
	let pending;
	try {
		pending = opts.getPendingCount();
	} catch (err) {
		opts.hooks?.onCheckError?.(err);
		emitGatewayRestart();
		return;
	}
	if (pending <= 0) {
		opts.hooks?.onReady?.();
		emitGatewayRestart();
		return;
	}
	opts.hooks?.onDeferring?.(pending);
	const startedAt = Date.now();
	const poll = setInterval(() => {
		let current;
		try {
			current = opts.getPendingCount();
		} catch (err) {
			clearInterval(poll);
			opts.hooks?.onCheckError?.(err);
			emitGatewayRestart();
			return;
		}
		if (current <= 0) {
			clearInterval(poll);
			opts.hooks?.onReady?.();
			emitGatewayRestart();
			return;
		}
		const elapsedMs = Date.now() - startedAt;
		if (elapsedMs >= maxWaitMs) {
			clearInterval(poll);
			opts.hooks?.onTimeout?.(current, elapsedMs);
			emitGatewayRestart();
		}
	}, pollMs);
}
function formatSpawnDetail(result) {
	const clean = (value) => {
		return (typeof value === "string" ? value : value ? value.toString() : "").replace(/\s+/g, " ").trim();
	};
	if (result.error) {
		if (result.error instanceof Error) return result.error.message;
		if (typeof result.error === "string") return result.error;
		try {
			return JSON.stringify(result.error);
		} catch {
			return "unknown error";
		}
	}
	const stderr = clean(result.stderr);
	if (stderr) return stderr;
	const stdout = clean(result.stdout);
	if (stdout) return stdout;
	if (typeof result.status === "number") return `exit ${result.status}`;
	return "unknown error";
}
function normalizeSystemdUnit(raw, profile) {
	const unit = raw?.trim();
	if (!unit) return `${resolveGatewaySystemdServiceName(profile)}.service`;
	return unit.endsWith(".service") ? unit : `${unit}.service`;
}
function triggerOpenClawRestart() {
	if (process.env.VITEST || false) return {
		ok: true,
		method: "supervisor",
		detail: "test mode"
	};
	cleanStaleGatewayProcessesSync();
	const tried = [];
	if (process.platform === "linux") {
		const unit = normalizeSystemdUnit(process.env.OPENCLAW_SYSTEMD_UNIT, process.env.OPENCLAW_PROFILE);
		const userArgs = [
			"--user",
			"restart",
			unit
		];
		tried.push(`systemctl ${userArgs.join(" ")}`);
		const userRestart = spawnSync("systemctl", userArgs, {
			encoding: "utf8",
			timeout: SPAWN_TIMEOUT_MS
		});
		if (!userRestart.error && userRestart.status === 0) return {
			ok: true,
			method: "systemd",
			tried
		};
		const systemArgs = ["restart", unit];
		tried.push(`systemctl ${systemArgs.join(" ")}`);
		const systemRestart = spawnSync("systemctl", systemArgs, {
			encoding: "utf8",
			timeout: SPAWN_TIMEOUT_MS
		});
		if (!systemRestart.error && systemRestart.status === 0) return {
			ok: true,
			method: "systemd",
			tried
		};
		return {
			ok: false,
			method: "systemd",
			detail: [`user: ${formatSpawnDetail(userRestart)}`, `system: ${formatSpawnDetail(systemRestart)}`].join("; "),
			tried
		};
	}
	if (process.platform === "win32") return relaunchGatewayScheduledTask(process.env);
	if (process.platform !== "darwin") return {
		ok: false,
		method: "supervisor",
		detail: "unsupported platform restart"
	};
	const label = process.env.OPENCLAW_LAUNCHD_LABEL || resolveGatewayLaunchAgentLabel(process.env.OPENCLAW_PROFILE);
	const uid = typeof process.getuid === "function" ? process.getuid() : void 0;
	const domain = uid !== void 0 ? `gui/${uid}` : "gui/501";
	const target = `${domain}/${label}`;
	const args = [
		"kickstart",
		"-k",
		target
	];
	tried.push(`launchctl ${args.join(" ")}`);
	const res = spawnSync("launchctl", args, {
		encoding: "utf8",
		timeout: SPAWN_TIMEOUT_MS
	});
	if (!res.error && res.status === 0) return {
		ok: true,
		method: "launchctl",
		tried
	};
	const home = process.env.HOME?.trim() || os.homedir();
	const bootstrapArgs = [
		"bootstrap",
		domain,
		path.join(home, "Library", "LaunchAgents", `${label}.plist`)
	];
	tried.push(`launchctl ${bootstrapArgs.join(" ")}`);
	const boot = spawnSync("launchctl", bootstrapArgs, {
		encoding: "utf8",
		timeout: SPAWN_TIMEOUT_MS
	});
	if (boot.error || boot.status !== 0 && boot.status !== null) return {
		ok: false,
		method: "launchctl",
		detail: formatSpawnDetail(boot),
		tried
	};
	const retryArgs = [
		"kickstart",
		"-k",
		target
	];
	tried.push(`launchctl ${retryArgs.join(" ")}`);
	const retry = spawnSync("launchctl", retryArgs, {
		encoding: "utf8",
		timeout: SPAWN_TIMEOUT_MS
	});
	if (!retry.error && retry.status === 0) return {
		ok: true,
		method: "launchctl",
		tried
	};
	return {
		ok: false,
		method: "launchctl",
		detail: formatSpawnDetail(retry),
		tried
	};
}
function scheduleGatewaySigusr1Restart(opts) {
	const delayMsRaw = typeof opts?.delayMs === "number" && Number.isFinite(opts.delayMs) ? Math.floor(opts.delayMs) : 2e3;
	const delayMs = Math.min(Math.max(delayMsRaw, 0), 6e4);
	const reason = typeof opts?.reason === "string" && opts.reason.trim() ? opts.reason.trim().slice(0, 200) : void 0;
	const mode = process.listenerCount("SIGUSR1") > 0 ? "emit" : "signal";
	const nowMs = Date.now();
	const cooldownMsApplied = Math.max(0, lastRestartEmittedAt + RESTART_COOLDOWN_MS - nowMs);
	const requestedDueAt = nowMs + delayMs + cooldownMsApplied;
	if (hasUnconsumedRestartSignal()) {
		restartLog.warn(`restart request coalesced (already in-flight) reason=${reason ?? "unspecified"} ${formatRestartAudit(opts?.audit)}`);
		return {
			ok: true,
			pid: process.pid,
			signal: "SIGUSR1",
			delayMs: 0,
			reason,
			mode,
			coalesced: true,
			cooldownMsApplied
		};
	}
	if (pendingRestartTimer) {
		const remainingMs = Math.max(0, pendingRestartDueAt - nowMs);
		if (requestedDueAt < pendingRestartDueAt) {
			restartLog.warn(`restart request rescheduled earlier reason=${reason ?? "unspecified"} pendingReason=${pendingRestartReason ?? "unspecified"} oldDelayMs=${remainingMs} newDelayMs=${Math.max(0, requestedDueAt - nowMs)} ${formatRestartAudit(opts?.audit)}`);
			clearPendingScheduledRestart();
		} else {
			restartLog.warn(`restart request coalesced (already scheduled) reason=${reason ?? "unspecified"} pendingReason=${pendingRestartReason ?? "unspecified"} delayMs=${remainingMs} ${formatRestartAudit(opts?.audit)}`);
			return {
				ok: true,
				pid: process.pid,
				signal: "SIGUSR1",
				delayMs: remainingMs,
				reason,
				mode,
				coalesced: true,
				cooldownMsApplied
			};
		}
	}
	pendingRestartDueAt = requestedDueAt;
	pendingRestartReason = reason;
	pendingRestartTimer = setTimeout(() => {
		pendingRestartTimer = null;
		pendingRestartDueAt = 0;
		pendingRestartReason = void 0;
		const pendingCheck = preRestartCheck;
		if (!pendingCheck) {
			emitGatewayRestart();
			return;
		}
		deferGatewayRestartUntilIdle({
			getPendingCount: pendingCheck,
			maxWaitMs: getRuntimeConfig().gateway?.reload?.deferralTimeoutMs
		});
	}, Math.max(0, requestedDueAt - nowMs));
	return {
		ok: true,
		pid: process.pid,
		signal: "SIGUSR1",
		delayMs: Math.max(0, requestedDueAt - nowMs),
		reason,
		mode,
		coalesced: false,
		cooldownMsApplied
	};
}
//#endregion
//#region src/auto-reply/reply/reply-run-registry.ts
const replyRunState = resolveGlobalSingleton(Symbol.for("openclaw.replyRunRegistry"), () => ({
	activeRunsByKey: /* @__PURE__ */ new Map(),
	activeSessionIdsByKey: /* @__PURE__ */ new Map(),
	activeKeysBySessionId: /* @__PURE__ */ new Map(),
	waitKeysBySessionId: /* @__PURE__ */ new Map(),
	waitersByKey: /* @__PURE__ */ new Map()
}));
var ReplyRunAlreadyActiveError = class extends Error {
	constructor(sessionKey) {
		super(`Reply run already active for ${sessionKey}`);
		this.name = "ReplyRunAlreadyActiveError";
	}
};
function normalizeSessionKey(sessionKey) {
	return sessionKey?.trim() || void 0;
}
function normalizeSessionId(sessionId) {
	return sessionId?.trim() || void 0;
}
function createUserAbortError() {
	const err = /* @__PURE__ */ new Error("Reply operation aborted by user");
	err.name = "AbortError";
	return err;
}
function registerWaitSessionId(sessionKey, sessionId) {
	replyRunState.waitKeysBySessionId.set(sessionId, sessionKey);
}
function clearWaitSessionIds(sessionKey) {
	for (const [sessionId, mappedKey] of replyRunState.waitKeysBySessionId) if (mappedKey === sessionKey) replyRunState.waitKeysBySessionId.delete(sessionId);
}
function notifyReplyRunEnded(sessionKey) {
	const waiters = replyRunState.waitersByKey.get(sessionKey);
	if (!waiters || waiters.size === 0) return;
	replyRunState.waitersByKey.delete(sessionKey);
	for (const waiter of waiters) {
		clearTimeout(waiter.timer);
		waiter.resolve(true);
	}
}
function resolveReplyRunForCurrentSessionId(sessionId) {
	const normalizedSessionId = normalizeSessionId(sessionId);
	if (!normalizedSessionId) return;
	const sessionKey = replyRunState.activeKeysBySessionId.get(normalizedSessionId);
	if (!sessionKey) return;
	return replyRunState.activeRunsByKey.get(sessionKey);
}
function resolveReplyRunWaitKey(sessionId) {
	const normalizedSessionId = normalizeSessionId(sessionId);
	if (!normalizedSessionId) return;
	return replyRunState.activeKeysBySessionId.get(normalizedSessionId) ?? replyRunState.waitKeysBySessionId.get(normalizedSessionId);
}
function isReplyRunCompacting(operation) {
	if (operation.phase === "preflight_compacting" || operation.phase === "memory_flushing") return true;
	if (operation.phase !== "running") return false;
	return getAttachedBackend(operation)?.isCompacting?.() ?? false;
}
const attachedBackendByOperation = /* @__PURE__ */ new WeakMap();
function getAttachedBackend(operation) {
	return attachedBackendByOperation.get(operation);
}
function clearReplyRunState(params) {
	replyRunState.activeRunsByKey.delete(params.sessionKey);
	if (replyRunState.activeSessionIdsByKey.get(params.sessionKey) === params.sessionId) replyRunState.activeSessionIdsByKey.delete(params.sessionKey);
	else replyRunState.activeSessionIdsByKey.delete(params.sessionKey);
	if (replyRunState.activeKeysBySessionId.get(params.sessionId) === params.sessionKey) replyRunState.activeKeysBySessionId.delete(params.sessionId);
	clearWaitSessionIds(params.sessionKey);
	notifyReplyRunEnded(params.sessionKey);
}
function createReplyOperation(params) {
	const sessionKey = normalizeSessionKey(params.sessionKey);
	const sessionId = normalizeSessionId(params.sessionId);
	if (!sessionKey) throw new Error("Reply operations require a canonical sessionKey");
	if (!sessionId) throw new Error("Reply operations require a sessionId");
	if (replyRunState.activeRunsByKey.has(sessionKey)) throw new ReplyRunAlreadyActiveError(sessionKey);
	const controller = new AbortController();
	let currentSessionId = sessionId;
	let phase = "queued";
	let result = null;
	let stateCleared = false;
	const clearState = () => {
		if (stateCleared) return;
		stateCleared = true;
		clearReplyRunState({
			sessionKey,
			sessionId: currentSessionId
		});
	};
	const abortInternally = (reason) => {
		if (!controller.signal.aborted) controller.abort(reason);
	};
	const abortWithReason = (reason, abortReason, opts) => {
		if (opts?.abortedCode && !result) result = {
			kind: "aborted",
			code: opts.abortedCode
		};
		phase = "aborted";
		abortInternally(abortReason);
		getAttachedBackend(operation)?.cancel(reason);
	};
	if (params.upstreamAbortSignal) if (params.upstreamAbortSignal.aborted) abortInternally(params.upstreamAbortSignal.reason);
	else params.upstreamAbortSignal.addEventListener("abort", () => {
		abortInternally(params.upstreamAbortSignal?.reason);
	}, { once: true });
	const operation = {
		get key() {
			return sessionKey;
		},
		get sessionId() {
			return currentSessionId;
		},
		get abortSignal() {
			return controller.signal;
		},
		get resetTriggered() {
			return params.resetTriggered;
		},
		get phase() {
			return phase;
		},
		get result() {
			return result;
		},
		setPhase(next) {
			if (result) return;
			phase = next;
		},
		updateSessionId(nextSessionId) {
			if (result) return;
			const normalizedNextSessionId = normalizeSessionId(nextSessionId);
			if (!normalizedNextSessionId || normalizedNextSessionId === currentSessionId) return;
			if (replyRunState.activeKeysBySessionId.has(normalizedNextSessionId) && replyRunState.activeKeysBySessionId.get(normalizedNextSessionId) !== sessionKey) throw new Error(`Cannot rebind reply operation ${sessionKey} to active session ${normalizedNextSessionId}`);
			replyRunState.activeKeysBySessionId.delete(currentSessionId);
			registerWaitSessionId(sessionKey, currentSessionId);
			currentSessionId = normalizedNextSessionId;
			replyRunState.activeSessionIdsByKey.set(sessionKey, currentSessionId);
			replyRunState.activeKeysBySessionId.set(currentSessionId, sessionKey);
			registerWaitSessionId(sessionKey, currentSessionId);
		},
		attachBackend(handle) {
			if (result) {
				handle.cancel(result.kind === "aborted" ? result.code === "aborted_for_restart" ? "restart" : "user_abort" : "superseded");
				return;
			}
			attachedBackendByOperation.set(operation, handle);
			if (controller.signal.aborted) handle.cancel("superseded");
		},
		detachBackend(handle) {
			if (getAttachedBackend(operation) === handle) attachedBackendByOperation.delete(operation);
		},
		complete() {
			if (!result) {
				result = { kind: "completed" };
				phase = "completed";
			}
			clearState();
		},
		fail(code, cause) {
			if (!result) {
				result = {
					kind: "failed",
					code,
					cause
				};
				phase = "failed";
			}
			clearState();
		},
		abortByUser() {
			const phaseBeforeAbort = phase;
			abortWithReason("user_abort", createUserAbortError(), { abortedCode: "aborted_by_user" });
			if (phaseBeforeAbort === "queued") clearState();
		},
		abortForRestart() {
			const phaseBeforeAbort = phase;
			abortWithReason("restart", /* @__PURE__ */ new Error("Reply operation aborted for restart"), { abortedCode: "aborted_for_restart" });
			if (phaseBeforeAbort === "queued") clearState();
		}
	};
	replyRunState.activeRunsByKey.set(sessionKey, operation);
	replyRunState.activeSessionIdsByKey.set(sessionKey, currentSessionId);
	replyRunState.activeKeysBySessionId.set(currentSessionId, sessionKey);
	registerWaitSessionId(sessionKey, currentSessionId);
	return operation;
}
const replyRunRegistry = {
	begin(params) {
		return createReplyOperation(params);
	},
	get(sessionKey) {
		const normalizedSessionKey = normalizeSessionKey(sessionKey);
		if (!normalizedSessionKey) return;
		return replyRunState.activeRunsByKey.get(normalizedSessionKey);
	},
	isActive(sessionKey) {
		const normalizedSessionKey = normalizeSessionKey(sessionKey);
		if (!normalizedSessionKey) return false;
		return replyRunState.activeRunsByKey.has(normalizedSessionKey);
	},
	isStreaming(sessionKey) {
		const operation = this.get(sessionKey);
		if (!operation || operation.phase !== "running") return false;
		return getAttachedBackend(operation)?.isStreaming() ?? false;
	},
	abort(sessionKey) {
		const operation = this.get(sessionKey);
		if (!operation) return false;
		operation.abortByUser();
		return true;
	},
	waitForIdle(sessionKey, timeoutMs = 15e3) {
		const normalizedSessionKey = normalizeSessionKey(sessionKey);
		if (!normalizedSessionKey || !replyRunState.activeRunsByKey.has(normalizedSessionKey)) return Promise.resolve(true);
		return new Promise((resolve) => {
			const waiters = replyRunState.waitersByKey.get(normalizedSessionKey) ?? /* @__PURE__ */ new Set();
			const waiter = {
				resolve,
				timer: setTimeout(() => {
					waiters.delete(waiter);
					if (waiters.size === 0) replyRunState.waitersByKey.delete(normalizedSessionKey);
					resolve(false);
				}, Math.max(100, timeoutMs))
			};
			waiters.add(waiter);
			replyRunState.waitersByKey.set(normalizedSessionKey, waiters);
			if (!replyRunState.activeRunsByKey.has(normalizedSessionKey)) {
				waiters.delete(waiter);
				if (waiters.size === 0) replyRunState.waitersByKey.delete(normalizedSessionKey);
				clearTimeout(waiter.timer);
				resolve(true);
			}
		});
	},
	resolveSessionId(sessionKey) {
		const normalizedSessionKey = normalizeSessionKey(sessionKey);
		if (!normalizedSessionKey) return;
		return replyRunState.activeSessionIdsByKey.get(normalizedSessionKey);
	}
};
function resolveActiveReplyRunSessionId(sessionKey) {
	return replyRunRegistry.resolveSessionId(sessionKey);
}
function isReplyRunActiveForSessionId(sessionId) {
	return resolveReplyRunForCurrentSessionId(sessionId) !== void 0;
}
function isReplyRunStreamingForSessionId(sessionId) {
	const operation = resolveReplyRunForCurrentSessionId(sessionId);
	if (!operation || operation.phase !== "running") return false;
	return getAttachedBackend(operation)?.isStreaming() ?? false;
}
function queueReplyRunMessage(sessionId, text) {
	const operation = resolveReplyRunForCurrentSessionId(sessionId);
	const backend = operation ? getAttachedBackend(operation) : void 0;
	if (!operation || operation.phase !== "running" || !backend?.queueMessage) return false;
	if (!backend.isStreaming()) return false;
	backend.queueMessage(text);
	return true;
}
function abortReplyRunBySessionId(sessionId) {
	const operation = resolveReplyRunForCurrentSessionId(sessionId);
	if (!operation) return false;
	operation.abortByUser();
	return true;
}
function waitForReplyRunEndBySessionId(sessionId, timeoutMs = 15e3) {
	const waitKey = resolveReplyRunWaitKey(sessionId);
	if (!waitKey) return Promise.resolve(true);
	return replyRunRegistry.waitForIdle(waitKey, timeoutMs);
}
function abortActiveReplyRuns(opts) {
	let aborted = false;
	for (const operation of replyRunState.activeRunsByKey.values()) {
		if (opts.mode === "compacting" && !isReplyRunCompacting(operation)) continue;
		operation.abortForRestart();
		aborted = true;
	}
	return aborted;
}
function getActiveReplyRunCount() {
	return replyRunState.activeRunsByKey.size;
}
function listActiveReplyRunSessionIds() {
	return [...replyRunState.activeSessionIdsByKey.values()];
}
//#endregion
//#region src/agents/pi-embedded-runner/runs.ts
const embeddedRunState = resolveGlobalSingleton(Symbol.for("openclaw.embeddedRunState"), () => ({
	activeRuns: /* @__PURE__ */ new Map(),
	snapshots: /* @__PURE__ */ new Map(),
	sessionIdsByKey: /* @__PURE__ */ new Map(),
	waiters: /* @__PURE__ */ new Map(),
	modelSwitchRequests: /* @__PURE__ */ new Map()
}));
const ACTIVE_EMBEDDED_RUNS = embeddedRunState.activeRuns;
const ACTIVE_EMBEDDED_RUN_SNAPSHOTS = embeddedRunState.snapshots;
const ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY = embeddedRunState.sessionIdsByKey;
const EMBEDDED_RUN_WAITERS = embeddedRunState.waiters;
const EMBEDDED_RUN_MODEL_SWITCH_REQUESTS = embeddedRunState.modelSwitchRequests;
function setActiveRunSessionKey(sessionKey, sessionId) {
	const normalizedSessionKey = sessionKey?.trim();
	if (!normalizedSessionKey) return;
	ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY.set(normalizedSessionKey, sessionId);
}
function clearActiveRunSessionKeys(sessionId, sessionKey) {
	const normalizedSessionKey = sessionKey?.trim();
	if (normalizedSessionKey) {
		if (ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY.get(normalizedSessionKey) === sessionId) ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY.delete(normalizedSessionKey);
		return;
	}
	for (const [key, activeSessionId] of ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY) if (activeSessionId === sessionId) ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY.delete(key);
}
function queueEmbeddedPiMessage(sessionId, text) {
	const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
	if (!handle) {
		if (queueReplyRunMessage(sessionId, text)) {
			logMessageQueued({
				sessionId,
				source: "pi-embedded-runner"
			});
			return true;
		}
		diag.debug(`queue message failed: sessionId=${sessionId} reason=no_active_run`);
		return false;
	}
	if (!handle.isStreaming()) {
		diag.debug(`queue message failed: sessionId=${sessionId} reason=not_streaming`);
		return false;
	}
	if (handle.isCompacting()) {
		diag.debug(`queue message failed: sessionId=${sessionId} reason=compacting`);
		return false;
	}
	logMessageQueued({
		sessionId,
		source: "pi-embedded-runner"
	});
	handle.queueMessage(text);
	return true;
}
function abortEmbeddedPiRun(sessionId, opts) {
	if (typeof sessionId === "string" && sessionId.length > 0) {
		const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
		if (!handle) {
			if (abortReplyRunBySessionId(sessionId)) return true;
			diag.debug(`abort failed: sessionId=${sessionId} reason=no_active_run`);
			return false;
		}
		diag.debug(`aborting run: sessionId=${sessionId}`);
		try {
			handle.abort();
		} catch (err) {
			diag.warn(`abort failed: sessionId=${sessionId} err=${String(err)}`);
			return false;
		}
		return true;
	}
	const mode = opts?.mode;
	if (mode === "compacting") {
		let aborted = false;
		for (const [id, handle] of ACTIVE_EMBEDDED_RUNS) {
			if (!handle.isCompacting()) continue;
			diag.debug(`aborting compacting run: sessionId=${id}`);
			try {
				handle.abort();
				aborted = true;
			} catch (err) {
				diag.warn(`abort failed: sessionId=${id} err=${String(err)}`);
			}
		}
		return abortActiveReplyRuns({ mode }) || aborted;
	}
	if (mode === "all") {
		let aborted = false;
		for (const [id, handle] of ACTIVE_EMBEDDED_RUNS) {
			diag.debug(`aborting run: sessionId=${id}`);
			try {
				handle.abort();
				aborted = true;
			} catch (err) {
				diag.warn(`abort failed: sessionId=${id} err=${String(err)}`);
			}
		}
		return abortActiveReplyRuns({ mode }) || aborted;
	}
	return false;
}
function isEmbeddedPiRunActive(sessionId) {
	const active = ACTIVE_EMBEDDED_RUNS.has(sessionId) || isReplyRunActiveForSessionId(sessionId);
	if (active) diag.debug(`run active check: sessionId=${sessionId} active=true`);
	return active;
}
function isEmbeddedPiRunStreaming(sessionId) {
	const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
	if (!handle) return isReplyRunStreamingForSessionId(sessionId);
	return handle.isStreaming();
}
function resolveActiveEmbeddedRunSessionId(sessionKey) {
	const normalizedSessionKey = sessionKey.trim();
	if (!normalizedSessionKey) return;
	return resolveActiveReplyRunSessionId(normalizedSessionKey) ?? ACTIVE_EMBEDDED_RUN_SESSION_IDS_BY_KEY.get(normalizedSessionKey);
}
function getActiveEmbeddedRunCount() {
	let activeCount = ACTIVE_EMBEDDED_RUNS.size;
	for (const sessionId of listActiveReplyRunSessionIds()) if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) activeCount += 1;
	return Math.max(activeCount, getActiveReplyRunCount());
}
function getActiveEmbeddedRunSnapshot(sessionId) {
	return ACTIVE_EMBEDDED_RUN_SNAPSHOTS.get(sessionId);
}
/**
* Wait for active embedded runs to drain.
*
* Used during restarts so in-flight compaction runs can release session write
* locks before the next lifecycle starts.
*/
async function waitForActiveEmbeddedRuns(timeoutMs = 15e3, opts) {
	const pollMsRaw = opts?.pollMs ?? 250;
	const pollMs = Math.max(10, Math.floor(pollMsRaw));
	const maxWaitMs = Math.max(pollMs, Math.floor(timeoutMs));
	const startedAt = Date.now();
	while (true) {
		if (getActiveEmbeddedRunCount() === 0) return { drained: true };
		if (Date.now() - startedAt >= maxWaitMs) {
			diag.warn(`wait for active embedded runs timed out: activeRuns=${getActiveEmbeddedRunCount()} timeoutMs=${maxWaitMs}`);
			return { drained: false };
		}
		await new Promise((resolve) => setTimeout(resolve, pollMs));
	}
}
function waitForEmbeddedPiRunEnd(sessionId, timeoutMs = 15e3) {
	if (!sessionId) return Promise.resolve(true);
	if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) return waitForReplyRunEndBySessionId(sessionId, timeoutMs);
	diag.debug(`waiting for run end: sessionId=${sessionId} timeoutMs=${timeoutMs}`);
	return new Promise((resolve) => {
		const waiters = EMBEDDED_RUN_WAITERS.get(sessionId) ?? /* @__PURE__ */ new Set();
		const waiter = {
			resolve,
			timer: setTimeout(() => {
				waiters.delete(waiter);
				if (waiters.size === 0) EMBEDDED_RUN_WAITERS.delete(sessionId);
				diag.warn(`wait timeout: sessionId=${sessionId} timeoutMs=${timeoutMs}`);
				resolve(false);
			}, Math.max(100, timeoutMs))
		};
		waiters.add(waiter);
		EMBEDDED_RUN_WAITERS.set(sessionId, waiters);
		if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) {
			waiters.delete(waiter);
			if (waiters.size === 0) EMBEDDED_RUN_WAITERS.delete(sessionId);
			clearTimeout(waiter.timer);
			resolve(true);
		}
	});
}
function notifyEmbeddedRunEnded(sessionId) {
	const waiters = EMBEDDED_RUN_WAITERS.get(sessionId);
	if (!waiters || waiters.size === 0) return;
	EMBEDDED_RUN_WAITERS.delete(sessionId);
	diag.debug(`notifying waiters: sessionId=${sessionId} waiterCount=${waiters.size}`);
	for (const waiter of waiters) {
		clearTimeout(waiter.timer);
		waiter.resolve(true);
	}
}
function setActiveEmbeddedRun(sessionId, handle, sessionKey) {
	const wasActive = ACTIVE_EMBEDDED_RUNS.has(sessionId);
	ACTIVE_EMBEDDED_RUNS.set(sessionId, handle);
	setActiveRunSessionKey(sessionKey, sessionId);
	logSessionStateChange({
		sessionId,
		sessionKey,
		state: "processing",
		reason: wasActive ? "run_replaced" : "run_started"
	});
	if (!sessionId.startsWith("probe-")) diag.debug(`run registered: sessionId=${sessionId} totalActive=${ACTIVE_EMBEDDED_RUNS.size}`);
}
function updateActiveEmbeddedRunSnapshot(sessionId, snapshot) {
	if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) return;
	ACTIVE_EMBEDDED_RUN_SNAPSHOTS.set(sessionId, snapshot);
}
function clearActiveEmbeddedRun(sessionId, handle, sessionKey) {
	if (ACTIVE_EMBEDDED_RUNS.get(sessionId) === handle) {
		ACTIVE_EMBEDDED_RUNS.delete(sessionId);
		ACTIVE_EMBEDDED_RUN_SNAPSHOTS.delete(sessionId);
		EMBEDDED_RUN_MODEL_SWITCH_REQUESTS.delete(sessionId);
		clearActiveRunSessionKeys(sessionId, sessionKey);
		logSessionStateChange({
			sessionId,
			sessionKey,
			state: "idle",
			reason: "run_completed"
		});
		if (!sessionId.startsWith("probe-")) diag.debug(`run cleared: sessionId=${sessionId} totalActive=${ACTIVE_EMBEDDED_RUNS.size}`);
		notifyEmbeddedRunEnded(sessionId);
	} else diag.debug(`run clear skipped: sessionId=${sessionId} reason=handle_mismatch`);
}
//#endregion
export { setPreRestartDeferralCheck as C, setGatewaySigusr1RestartPolicy as S, deferGatewayRestartUntilIdle as _, isEmbeddedPiRunActive as a, markGatewaySigusr1RestartHandled as b, resolveActiveEmbeddedRunSessionId as c, waitForActiveEmbeddedRuns as d, waitForEmbeddedPiRunEnd as f, consumeGatewaySigusr1RestartAuthorization as g, replyRunRegistry as h, getActiveEmbeddedRunSnapshot as i, setActiveEmbeddedRun as l, createReplyOperation as m, clearActiveEmbeddedRun as n, isEmbeddedPiRunStreaming as o, ReplyRunAlreadyActiveError as p, getActiveEmbeddedRunCount as r, queueEmbeddedPiMessage as s, abortEmbeddedPiRun as t, updateActiveEmbeddedRunSnapshot as u, emitGatewayRestart as v, triggerOpenClawRestart as w, scheduleGatewaySigusr1Restart as x, isGatewaySigusr1RestartExternallyAllowed as y };
