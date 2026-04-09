import { y as sliceUtf16Safe } from "./utils-ms6h9yny.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { p as scopedHeartbeatWakeOptions } from "./session-key-BR3Z-ljs.js";
import { i as resolveAgentConfig, v as resolveSessionAgentId } from "./agent-scope-CXWTwwic.js";
import { a as logWarn } from "./logger-DC8YwEpM.js";
import { o as resolveWindowsCommandShim, s as spawnWithFallback } from "./exec-CHN1LzVK.js";
import "./host-env-security-D-6e61X4.js";
import { p as NODE_SYSTEM_RUN_COMMANDS } from "./loader-BkajlJCF.js";
import { n as readJsonFile, r as writeJsonAtomic, t as createAsyncLock } from "./json-files-Wr5BxNtT.js";
import { t as killProcessTree } from "./kill-tree-B6ozo-AE.js";
import { r as generateSecureInt } from "./secure-random-BRacmrZN.js";
import { n as resolveSandboxRuntimeStatus } from "./runtime-status-BNMb0UiT.js";
import { r as DEFAULT_EXEC_APPROVAL_TIMEOUT_MS, w as resolveExecApprovalAllowedDecisions } from "./exec-approvals-CBfBa44f.js";
import { n as assertSandboxPath } from "./sandbox-paths-B1-hAAsM.js";
import { n as requestHeartbeatNow } from "./heartbeat-wake-Bx-nQ2ga.js";
import { r as enqueueSystemEvent } from "./system-events-D41GWMIV.js";
import { s as loadWorkspaceSkillEntries } from "./skills-BnlzYY40.js";
import { t as listAgentWorkspaceDirs } from "./workspace-dirs-CeSNfT2P.js";
import { a as resolvePairingPaths, i as reconcilePendingPairingRequests, n as verifyPairingToken, o as resolveMissingRequestedScope, r as pruneExpiredPending, t as generatePairingToken } from "./pairing-token-xAP4qeJE.js";
import { t as rejectPendingPairingRequest } from "./pairing-pending-DFV_mlDp.js";
import fs, { existsSync, statSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import fs$1 from "node:fs/promises";
import crypto, { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
//#region src/agents/session-slug.ts
const SLUG_ADJECTIVES = [
	"amber",
	"briny",
	"brisk",
	"calm",
	"clear",
	"cool",
	"crisp",
	"dawn",
	"delta",
	"ember",
	"faint",
	"fast",
	"fresh",
	"gentle",
	"glow",
	"good",
	"grand",
	"keen",
	"kind",
	"lucky",
	"marine",
	"mellow",
	"mild",
	"neat",
	"nimble",
	"nova",
	"oceanic",
	"plaid",
	"quick",
	"quiet",
	"rapid",
	"salty",
	"sharp",
	"swift",
	"tender",
	"tidal",
	"tidy",
	"tide",
	"vivid",
	"warm",
	"wild",
	"young"
];
const SLUG_NOUNS = [
	"atlas",
	"basil",
	"bison",
	"bloom",
	"breeze",
	"canyon",
	"cedar",
	"claw",
	"cloud",
	"comet",
	"coral",
	"cove",
	"crest",
	"crustacean",
	"daisy",
	"dune",
	"ember",
	"falcon",
	"fjord",
	"forest",
	"glade",
	"gulf",
	"harbor",
	"haven",
	"kelp",
	"lagoon",
	"lobster",
	"meadow",
	"mist",
	"nudibranch",
	"nexus",
	"ocean",
	"orbit",
	"otter",
	"pine",
	"prairie",
	"reef",
	"ridge",
	"river",
	"rook",
	"sable",
	"sage",
	"seaslug",
	"shell",
	"shoal",
	"shore",
	"slug",
	"summit",
	"tidepool",
	"trail",
	"valley",
	"wharf",
	"willow",
	"zephyr"
];
function randomChoice(values, fallback) {
	return values[generateSecureInt(values.length)] ?? fallback;
}
const SLUG_FALLBACK_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function createFallbackSuffix(length) {
	let suffix = "";
	for (let i = 0; i < length; i += 1) suffix += SLUG_FALLBACK_ALPHABET[generateSecureInt(36)] ?? "x";
	return suffix;
}
function createSlugBase(words = 2) {
	const parts = [randomChoice(SLUG_ADJECTIVES, "steady"), randomChoice(SLUG_NOUNS, "harbor")];
	if (words > 2) parts.push(randomChoice(SLUG_NOUNS, "reef"));
	return parts.join("-");
}
function createAvailableSlug(words, isIdTaken) {
	for (let attempt = 0; attempt < 12; attempt += 1) {
		const base = createSlugBase(words);
		if (!isIdTaken(base)) return base;
		for (let i = 2; i <= 12; i += 1) {
			const candidate = `${base}-${i}`;
			if (!isIdTaken(candidate)) return candidate;
		}
	}
}
function createSessionSlug$1(isTaken) {
	const isIdTaken = isTaken ?? (() => false);
	const twoWord = createAvailableSlug(2, isIdTaken);
	if (twoWord) return twoWord;
	const threeWord = createAvailableSlug(3, isIdTaken);
	if (threeWord) return threeWord;
	const fallback = `${createSlugBase(3)}-${createFallbackSuffix(3)}`;
	return isIdTaken(fallback) ? `${fallback}-${Date.now().toString(36)}` : fallback;
}
//#endregion
//#region src/agents/bash-process-registry.ts
const DEFAULT_JOB_TTL_MS = 1800 * 1e3;
const MIN_JOB_TTL_MS = 60 * 1e3;
const MAX_JOB_TTL_MS = 10800 * 1e3;
const DEFAULT_PENDING_OUTPUT_CHARS = 3e4;
function clampTtl(value) {
	if (!value || Number.isNaN(value)) return DEFAULT_JOB_TTL_MS;
	return Math.min(Math.max(value, MIN_JOB_TTL_MS), MAX_JOB_TTL_MS);
}
let jobTtlMs = clampTtl(Number.parseInt(process.env.PI_BASH_JOB_TTL_MS ?? "", 10));
const runningSessions = /* @__PURE__ */ new Map();
const finishedSessions = /* @__PURE__ */ new Map();
let sweeper = null;
function isSessionIdTaken(id) {
	return runningSessions.has(id) || finishedSessions.has(id);
}
function createSessionSlug() {
	return createSessionSlug$1(isSessionIdTaken);
}
function addSession(session) {
	runningSessions.set(session.id, session);
	startSweeper();
}
function getSession(id) {
	return runningSessions.get(id);
}
function getFinishedSession(id) {
	return finishedSessions.get(id);
}
function deleteSession(id) {
	runningSessions.delete(id);
	finishedSessions.delete(id);
}
function appendOutput(session, stream, chunk) {
	session.pendingStdout ??= [];
	session.pendingStderr ??= [];
	session.pendingStdoutChars ??= sumPendingChars(session.pendingStdout);
	session.pendingStderrChars ??= sumPendingChars(session.pendingStderr);
	const buffer = stream === "stdout" ? session.pendingStdout : session.pendingStderr;
	const bufferChars = stream === "stdout" ? session.pendingStdoutChars : session.pendingStderrChars;
	const pendingCap = Math.min(session.pendingMaxOutputChars ?? DEFAULT_PENDING_OUTPUT_CHARS, session.maxOutputChars);
	buffer.push(chunk);
	let pendingChars = bufferChars + chunk.length;
	if (pendingChars > pendingCap) {
		session.truncated = true;
		pendingChars = capPendingBuffer(buffer, pendingChars, pendingCap);
	}
	if (stream === "stdout") session.pendingStdoutChars = pendingChars;
	else session.pendingStderrChars = pendingChars;
	session.totalOutputChars += chunk.length;
	const aggregated = trimWithCap(session.aggregated + chunk, session.maxOutputChars);
	session.truncated = session.truncated || aggregated.length < session.aggregated.length + chunk.length;
	session.aggregated = aggregated;
	session.tail = tail(session.aggregated, 2e3);
}
function drainSession(session) {
	const stdout = session.pendingStdout.join("");
	const stderr = session.pendingStderr.join("");
	session.pendingStdout = [];
	session.pendingStderr = [];
	session.pendingStdoutChars = 0;
	session.pendingStderrChars = 0;
	return {
		stdout,
		stderr
	};
}
function markExited(session, exitCode, exitSignal, status) {
	session.exited = true;
	session.exitCode = exitCode;
	session.exitSignal = exitSignal;
	session.tail = tail(session.aggregated, 2e3);
	moveToFinished(session, status);
}
function markBackgrounded(session) {
	session.backgrounded = true;
}
function moveToFinished(session, status) {
	runningSessions.delete(session.id);
	if (session.child) {
		session.child.stdin?.destroy?.();
		session.child.stdout?.destroy?.();
		session.child.stderr?.destroy?.();
		session.child.removeAllListeners();
		delete session.child;
	}
	if (session.stdin) {
		if (typeof session.stdin.destroy === "function") session.stdin.destroy();
		else if (typeof session.stdin.end === "function") session.stdin.end();
		try {
			session.stdin.destroyed = true;
		} catch {}
		delete session.stdin;
	}
	if (!session.backgrounded) return;
	finishedSessions.set(session.id, {
		id: session.id,
		command: session.command,
		scopeKey: session.scopeKey,
		startedAt: session.startedAt,
		endedAt: Date.now(),
		cwd: session.cwd,
		status,
		exitCode: session.exitCode,
		exitSignal: session.exitSignal,
		aggregated: session.aggregated,
		tail: session.tail,
		truncated: session.truncated,
		totalOutputChars: session.totalOutputChars
	});
}
function tail(text, max = 2e3) {
	if (text.length <= max) return text;
	return text.slice(text.length - max);
}
function sumPendingChars(buffer) {
	let total = 0;
	for (const chunk of buffer) total += chunk.length;
	return total;
}
function capPendingBuffer(buffer, pendingChars, cap) {
	if (pendingChars <= cap) return pendingChars;
	const last = buffer.at(-1);
	if (last && last.length >= cap) {
		buffer.length = 0;
		buffer.push(last.slice(last.length - cap));
		return cap;
	}
	while (buffer.length && pendingChars - buffer[0].length >= cap) {
		pendingChars -= buffer[0].length;
		buffer.shift();
	}
	if (buffer.length && pendingChars > cap) {
		const overflow = pendingChars - cap;
		buffer[0] = buffer[0].slice(overflow);
		pendingChars = cap;
	}
	return pendingChars;
}
function trimWithCap(text, max) {
	if (text.length <= max) return text;
	return text.slice(text.length - max);
}
function listRunningSessions() {
	return Array.from(runningSessions.values()).filter((s) => s.backgrounded);
}
function listFinishedSessions() {
	return Array.from(finishedSessions.values());
}
function setJobTtlMs(value) {
	if (value === void 0 || Number.isNaN(value)) return;
	jobTtlMs = clampTtl(value);
	stopSweeper();
	startSweeper();
}
function pruneFinishedSessions() {
	const cutoff = Date.now() - jobTtlMs;
	for (const [id, session] of finishedSessions.entries()) if (session.endedAt < cutoff) finishedSessions.delete(id);
}
function startSweeper() {
	if (sweeper) return;
	sweeper = setInterval(pruneFinishedSessions, Math.max(3e4, jobTtlMs / 6));
	sweeper.unref?.();
}
function stopSweeper() {
	if (!sweeper) return;
	clearInterval(sweeper);
	sweeper = null;
}
//#endregion
//#region src/infra/path-prepend.ts
/**
* Find the actual key used for PATH in the env object.
* On Windows, `process.env` stores it as `Path` (not `PATH`),
* and after copying to a plain object the original casing is preserved.
*/
function findPathKey(env) {
	if ("PATH" in env) return "PATH";
	for (const key of Object.keys(env)) if (key.toUpperCase() === "PATH") return key;
	return "PATH";
}
function normalizePathPrepend(entries) {
	if (!Array.isArray(entries)) return [];
	const seen = /* @__PURE__ */ new Set();
	const normalized = [];
	for (const entry of entries) {
		if (typeof entry !== "string") continue;
		const trimmed = entry.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		normalized.push(trimmed);
	}
	return normalized;
}
function mergePathPrepend(existing, prepend) {
	if (prepend.length === 0) return existing;
	const partsExisting = (existing ?? "").split(path.delimiter).map((part) => part.trim()).filter(Boolean);
	const merged = [];
	const seen = /* @__PURE__ */ new Set();
	for (const part of [...prepend, ...partsExisting]) {
		if (seen.has(part)) continue;
		seen.add(part);
		merged.push(part);
	}
	return merged.join(path.delimiter);
}
function applyPathPrepend(env, prepend, options) {
	if (!Array.isArray(prepend) || prepend.length === 0) return;
	const pathKey = findPathKey(env);
	if (options?.requireExisting && !env[pathKey]) return;
	const merged = mergePathPrepend(env[pathKey], prepend);
	if (merged) env[pathKey] = merged;
}
//#endregion
//#region src/agents/shell-utils.ts
function resolvePowerShellPath() {
	const programFiles = process.env.ProgramFiles || process.env.PROGRAMFILES || "C:\\Program Files";
	const pwsh7 = path.join(programFiles, "PowerShell", "7", "pwsh.exe");
	if (fs.existsSync(pwsh7)) return pwsh7;
	const programW6432 = process.env.ProgramW6432;
	if (programW6432 && programW6432 !== programFiles) {
		const pwsh7Alt = path.join(programW6432, "PowerShell", "7", "pwsh.exe");
		if (fs.existsSync(pwsh7Alt)) return pwsh7Alt;
	}
	const pwshInPath = resolveShellFromPath("pwsh");
	if (pwshInPath) return pwshInPath;
	const systemRoot = process.env.SystemRoot || process.env.WINDIR;
	if (systemRoot) {
		const candidate = path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
		if (fs.existsSync(candidate)) return candidate;
	}
	return "powershell.exe";
}
function getShellConfig() {
	if (process.platform === "win32") return {
		shell: resolvePowerShellPath(),
		args: [
			"-NoProfile",
			"-NonInteractive",
			"-Command"
		]
	};
	const envShell = process.env.SHELL?.trim();
	if ((envShell ? path.basename(envShell) : "") === "fish") {
		const bash = resolveShellFromPath("bash");
		if (bash) return {
			shell: bash,
			args: ["-c"]
		};
		const sh = resolveShellFromPath("sh");
		if (sh) return {
			shell: sh,
			args: ["-c"]
		};
	}
	return {
		shell: envShell && envShell.length > 0 ? envShell : "sh",
		args: ["-c"]
	};
}
function resolveShellFromPath(name) {
	const envPath = process.env.PATH ?? "";
	if (!envPath) return;
	const entries = envPath.split(path.delimiter).filter(Boolean);
	for (const entry of entries) {
		const candidate = path.join(entry, name);
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {}
	}
}
function normalizeShellName(value) {
	const trimmed = value.trim();
	if (!trimmed) return "";
	return path.basename(trimmed).replace(/\.(exe|cmd|bat)$/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
}
function detectRuntimeShell() {
	const overrideShell = process.env.OPENCLAW_SHELL?.trim();
	if (overrideShell) {
		const name = normalizeShellName(overrideShell);
		if (name) return name;
	}
	if (process.platform === "win32") {
		if (process.env.POWERSHELL_DISTRIBUTION_CHANNEL) return "pwsh";
		return "powershell";
	}
	const envShell = process.env.SHELL?.trim();
	if (envShell) {
		const name = normalizeShellName(envShell);
		if (name) return name;
	}
	if (process.env.POWERSHELL_DISTRIBUTION_CHANNEL) return "pwsh";
	if (process.env.BASH_VERSION) return "bash";
	if (process.env.ZSH_VERSION) return "zsh";
	if (process.env.FISH_VERSION) return "fish";
	if (process.env.KSH_VERSION) return "ksh";
	if (process.env.NU_VERSION || process.env.NUSHELL_VERSION) return "nu";
}
function sanitizeBinaryOutput(text) {
	const scrubbed = text.replace(/[\p{Format}\p{Surrogate}]/gu, "");
	if (!scrubbed) return scrubbed;
	const chunks = [];
	for (const char of scrubbed) {
		const code = char.codePointAt(0);
		if (code == null) continue;
		if (code === 9 || code === 10 || code === 13) {
			chunks.push(char);
			continue;
		}
		if (code < 32) continue;
		chunks.push(char);
	}
	return chunks.join("");
}
//#endregion
//#region src/process/supervisor/adapters/env.ts
function toStringEnv(env) {
	if (!env) return {};
	const out = {};
	for (const [key, value] of Object.entries(env)) {
		if (value === void 0) continue;
		out[key] = String(value);
	}
	return out;
}
//#endregion
//#region src/process/supervisor/adapters/child.ts
const FORCE_KILL_WAIT_FALLBACK_MS$1 = 4e3;
function resolveCommand(command) {
	return resolveWindowsCommandShim({
		command,
		cmdCommands: [
			"npm",
			"pnpm",
			"yarn",
			"npx"
		]
	});
}
function isServiceManagedRuntime() {
	return Boolean(process.env.OPENCLAW_SERVICE_MARKER?.trim());
}
async function createChildAdapter(params) {
	const resolvedArgv = [...params.argv];
	resolvedArgv[0] = resolveCommand(resolvedArgv[0] ?? "");
	const stdinMode = params.stdinMode ?? (params.input !== void 0 ? "pipe-closed" : "inherit");
	const useDetached = process.platform !== "win32" && !isServiceManagedRuntime();
	const options = {
		cwd: params.cwd,
		env: params.env ? toStringEnv(params.env) : void 0,
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		detached: useDetached,
		windowsHide: true,
		windowsVerbatimArguments: params.windowsVerbatimArguments
	};
	if (stdinMode === "inherit") options.stdio = [
		"inherit",
		"pipe",
		"pipe"
	];
	else options.stdio = [
		"pipe",
		"pipe",
		"pipe"
	];
	const child = (await spawnWithFallback({
		argv: resolvedArgv,
		options,
		fallbacks: useDetached ? [{
			label: "no-detach",
			options: { detached: false }
		}] : []
	})).child;
	if (child.stdin) {
		if (params.input !== void 0) {
			child.stdin.write(params.input);
			child.stdin.end();
		} else if (stdinMode === "pipe-closed") child.stdin.end();
	}
	const stdin = child.stdin ? {
		destroyed: false,
		write: (data, cb) => {
			try {
				child.stdin.write(data, cb);
			} catch (err) {
				cb?.(err);
			}
		},
		end: () => {
			try {
				child.stdin.end();
			} catch {}
		},
		destroy: () => {
			try {
				child.stdin.destroy();
			} catch {}
		}
	} : void 0;
	const onStdout = (listener) => {
		child.stdout.on("data", (chunk) => {
			listener(chunk.toString());
		});
	};
	const onStderr = (listener) => {
		child.stderr.on("data", (chunk) => {
			listener(chunk.toString());
		});
	};
	let waitResult = null;
	let waitError;
	let resolveWait = null;
	let rejectWait = null;
	let waitPromise = null;
	let forceKillWaitFallbackTimer = null;
	const clearForceKillWaitFallback = () => {
		if (!forceKillWaitFallbackTimer) return;
		clearTimeout(forceKillWaitFallbackTimer);
		forceKillWaitFallbackTimer = null;
	};
	const settleWait = (value) => {
		if (waitResult || waitError !== void 0) return;
		clearForceKillWaitFallback();
		waitResult = value;
		if (resolveWait) {
			const resolve = resolveWait;
			resolveWait = null;
			rejectWait = null;
			resolve(value);
		}
	};
	const rejectPendingWait = (error) => {
		if (waitResult || waitError !== void 0) return;
		clearForceKillWaitFallback();
		waitError = error;
		if (rejectWait) {
			const reject = rejectWait;
			resolveWait = null;
			rejectWait = null;
			reject(error);
		}
	};
	const scheduleForceKillWaitFallback = (signal) => {
		clearForceKillWaitFallback();
		forceKillWaitFallbackTimer = setTimeout(() => {
			settleWait({
				code: null,
				signal
			});
		}, FORCE_KILL_WAIT_FALLBACK_MS$1);
		forceKillWaitFallbackTimer.unref?.();
	};
	child.once("error", (error) => {
		rejectPendingWait(error);
	});
	child.once("close", (code, signal) => {
		settleWait({
			code,
			signal
		});
	});
	const wait = async () => {
		if (waitResult) return waitResult;
		if (waitError !== void 0) throw waitError;
		if (!waitPromise) waitPromise = new Promise((resolve, reject) => {
			resolveWait = resolve;
			rejectWait = reject;
			if (waitResult) {
				const settled = waitResult;
				resolveWait = null;
				rejectWait = null;
				resolve(settled);
				return;
			}
			if (waitError !== void 0) {
				const error = waitError;
				resolveWait = null;
				rejectWait = null;
				reject(error);
			}
		});
		return waitPromise;
	};
	const kill = (signal) => {
		const pid = child.pid ?? void 0;
		if (signal === void 0 || signal === "SIGKILL") {
			if (pid) killProcessTree(pid);
			try {
				child.kill("SIGKILL");
			} catch {}
			scheduleForceKillWaitFallback("SIGKILL");
			return;
		}
		try {
			child.kill(signal);
		} catch {}
	};
	const dispose = () => {
		clearForceKillWaitFallback();
		child.removeAllListeners();
	};
	return {
		pid: child.pid ?? void 0,
		stdin,
		onStdout,
		onStderr,
		wait,
		kill,
		dispose
	};
}
//#endregion
//#region src/process/supervisor/adapters/pty.ts
const FORCE_KILL_WAIT_FALLBACK_MS = 4e3;
async function createPtyAdapter(params) {
	const module = await import("@lydell/node-pty");
	const spawn = module.spawn ?? module.default?.spawn;
	if (!spawn) throw new Error("PTY support is unavailable (node-pty spawn not found).");
	const pty = spawn(params.shell, params.args, {
		cwd: params.cwd,
		env: params.env ? toStringEnv(params.env) : void 0,
		name: params.name ?? process.env.TERM ?? "xterm-256color",
		cols: params.cols ?? 120,
		rows: params.rows ?? 30
	});
	let dataListener = null;
	let exitListener = null;
	let waitResult = null;
	let resolveWait = null;
	let waitPromise = null;
	let forceKillWaitFallbackTimer = null;
	const clearForceKillWaitFallback = () => {
		if (!forceKillWaitFallbackTimer) return;
		clearTimeout(forceKillWaitFallbackTimer);
		forceKillWaitFallbackTimer = null;
	};
	const settleWait = (value) => {
		if (waitResult) return;
		clearForceKillWaitFallback();
		waitResult = value;
		if (resolveWait) {
			const resolve = resolveWait;
			resolveWait = null;
			resolve(value);
		}
	};
	const scheduleForceKillWaitFallback = (signal) => {
		clearForceKillWaitFallback();
		forceKillWaitFallbackTimer = setTimeout(() => {
			settleWait({
				code: null,
				signal
			});
		}, FORCE_KILL_WAIT_FALLBACK_MS);
		forceKillWaitFallbackTimer.unref();
	};
	exitListener = pty.onExit((event) => {
		const signal = event.signal && event.signal !== 0 ? event.signal : null;
		settleWait({
			code: event.exitCode ?? null,
			signal
		});
	}) ?? null;
	const stdin = {
		destroyed: false,
		write: (data, cb) => {
			try {
				pty.write(data);
				cb?.(null);
			} catch (err) {
				cb?.(err);
			}
		},
		end: () => {
			try {
				const eof = process.platform === "win32" ? "" : "";
				pty.write(eof);
			} catch {}
		}
	};
	const onStdout = (listener) => {
		dataListener = pty.onData((chunk) => {
			listener(chunk.toString());
		}) ?? null;
	};
	const onStderr = (_listener) => {};
	const wait = async () => {
		if (waitResult) return waitResult;
		if (!waitPromise) waitPromise = new Promise((resolve) => {
			resolveWait = resolve;
			if (waitResult) {
				const settled = waitResult;
				resolveWait = null;
				resolve(settled);
			}
		});
		return waitPromise;
	};
	const kill = (signal = "SIGKILL") => {
		try {
			if (signal === "SIGKILL" && typeof pty.pid === "number" && pty.pid > 0) killProcessTree(pty.pid);
			else if (process.platform === "win32") pty.kill();
			else pty.kill(signal);
		} catch {}
		if (signal === "SIGKILL") scheduleForceKillWaitFallback(signal);
	};
	const dispose = () => {
		try {
			dataListener?.dispose();
		} catch {}
		try {
			exitListener?.dispose();
		} catch {}
		clearForceKillWaitFallback();
		dataListener = null;
		exitListener = null;
		settleWait({
			code: null,
			signal: null
		});
	};
	return {
		pid: pty.pid || void 0,
		stdin,
		onStdout,
		onStderr,
		wait,
		kill,
		dispose
	};
}
//#endregion
//#region src/process/supervisor/registry.ts
function nowMs() {
	return Date.now();
}
const DEFAULT_MAX_EXITED_RECORDS = 2e3;
function resolveMaxExitedRecords(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return DEFAULT_MAX_EXITED_RECORDS;
	return Math.max(1, Math.floor(value));
}
function createRunRegistry(options) {
	const records = /* @__PURE__ */ new Map();
	const maxExitedRecords = resolveMaxExitedRecords(options?.maxExitedRecords);
	const pruneExitedRecords = () => {
		if (!records.size) return;
		let exited = 0;
		for (const record of records.values()) if (record.state === "exited") exited += 1;
		if (exited <= maxExitedRecords) return;
		let remove = exited - maxExitedRecords;
		for (const [runId, record] of records.entries()) {
			if (remove <= 0) break;
			if (record.state !== "exited") continue;
			records.delete(runId);
			remove -= 1;
		}
	};
	const add = (record) => {
		records.set(record.runId, { ...record });
	};
	const get = (runId) => {
		const record = records.get(runId);
		return record ? { ...record } : void 0;
	};
	const list = () => {
		return Array.from(records.values()).map((record) => ({ ...record }));
	};
	const listByScope = (scopeKey) => {
		if (!scopeKey.trim()) return [];
		return Array.from(records.values()).filter((record) => record.scopeKey === scopeKey).map((record) => ({ ...record }));
	};
	const updateState = (runId, state, patch) => {
		const current = records.get(runId);
		if (!current) return;
		const updatedAtMs = nowMs();
		const next = {
			...current,
			...patch,
			state,
			updatedAtMs,
			lastOutputAtMs: current.lastOutputAtMs
		};
		records.set(runId, next);
		return { ...next };
	};
	const touchOutput = (runId) => {
		const current = records.get(runId);
		if (!current) return;
		const ts = nowMs();
		records.set(runId, {
			...current,
			lastOutputAtMs: ts,
			updatedAtMs: ts
		});
	};
	const finalize = (runId, exit) => {
		const current = records.get(runId);
		if (!current) return null;
		const firstFinalize = current.state !== "exited";
		const ts = nowMs();
		const next = {
			...current,
			state: "exited",
			terminationReason: current.terminationReason ?? exit.reason,
			exitCode: current.exitCode !== void 0 ? current.exitCode : exit.exitCode,
			exitSignal: current.exitSignal !== void 0 ? current.exitSignal : exit.exitSignal,
			updatedAtMs: ts
		};
		records.set(runId, next);
		pruneExitedRecords();
		return {
			record: { ...next },
			firstFinalize
		};
	};
	const del = (runId) => {
		records.delete(runId);
	};
	return {
		add,
		get,
		list,
		listByScope,
		updateState,
		touchOutput,
		finalize,
		delete: del
	};
}
//#endregion
//#region src/process/supervisor/supervisor.ts
function clampTimeout(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
	return Math.max(1, Math.floor(value));
}
function isTimeoutReason(reason) {
	return reason === "overall-timeout" || reason === "no-output-timeout";
}
function createProcessSupervisor() {
	const registry = createRunRegistry();
	const active = /* @__PURE__ */ new Map();
	const cancel = (runId, reason = "manual-cancel") => {
		const current = active.get(runId);
		if (!current) return;
		registry.updateState(runId, "exiting", { terminationReason: reason });
		current.run.cancel(reason);
	};
	const cancelScope = (scopeKey, reason = "manual-cancel") => {
		if (!scopeKey.trim()) return;
		for (const [runId, run] of active.entries()) {
			if (run.scopeKey !== scopeKey) continue;
			cancel(runId, reason);
		}
	};
	const spawn = async (input) => {
		const runId = input.runId?.trim() || crypto.randomUUID();
		if (input.replaceExistingScope && input.scopeKey?.trim()) cancelScope(input.scopeKey, "manual-cancel");
		const startedAtMs = Date.now();
		const record = {
			runId,
			sessionId: input.sessionId,
			backendId: input.backendId,
			scopeKey: input.scopeKey?.trim() || void 0,
			state: "starting",
			startedAtMs,
			lastOutputAtMs: startedAtMs,
			createdAtMs: startedAtMs,
			updatedAtMs: startedAtMs
		};
		registry.add(record);
		let forcedReason = null;
		let settled = false;
		let stdout = "";
		let stderr = "";
		let timeoutTimer = null;
		let noOutputTimer = null;
		const captureOutput = input.captureOutput !== false;
		const overallTimeoutMs = clampTimeout(input.timeoutMs);
		const noOutputTimeoutMs = clampTimeout(input.noOutputTimeoutMs);
		const setForcedReason = (reason) => {
			if (forcedReason) return;
			forcedReason = reason;
			registry.updateState(runId, "exiting", { terminationReason: reason });
		};
		let cancelAdapter = null;
		const requestCancel = (reason) => {
			setForcedReason(reason);
			cancelAdapter?.(reason);
		};
		const touchOutput = () => {
			registry.touchOutput(runId);
			if (!noOutputTimeoutMs || settled) return;
			if (noOutputTimer) clearTimeout(noOutputTimer);
			noOutputTimer = setTimeout(() => {
				requestCancel("no-output-timeout");
			}, noOutputTimeoutMs);
		};
		try {
			if (input.mode === "child" && input.argv.length === 0) throw new Error("spawn argv cannot be empty");
			const adapter = input.mode === "pty" ? await (async () => {
				const { shell, args: shellArgs } = getShellConfig();
				const ptyCommand = input.ptyCommand.trim();
				if (!ptyCommand) throw new Error("PTY command cannot be empty");
				return await createPtyAdapter({
					shell,
					args: [...shellArgs, ptyCommand],
					cwd: input.cwd,
					env: input.env
				});
			})() : await createChildAdapter({
				argv: input.argv,
				cwd: input.cwd,
				env: input.env,
				windowsVerbatimArguments: input.windowsVerbatimArguments,
				input: input.input,
				stdinMode: input.stdinMode
			});
			registry.updateState(runId, "running", { pid: adapter.pid });
			const clearTimers = () => {
				if (timeoutTimer) {
					clearTimeout(timeoutTimer);
					timeoutTimer = null;
				}
				if (noOutputTimer) {
					clearTimeout(noOutputTimer);
					noOutputTimer = null;
				}
			};
			cancelAdapter = (_reason) => {
				if (settled) return;
				adapter.kill("SIGKILL");
			};
			if (overallTimeoutMs) timeoutTimer = setTimeout(() => {
				requestCancel("overall-timeout");
			}, overallTimeoutMs);
			if (noOutputTimeoutMs) noOutputTimer = setTimeout(() => {
				requestCancel("no-output-timeout");
			}, noOutputTimeoutMs);
			adapter.onStdout((chunk) => {
				if (captureOutput) stdout += chunk;
				input.onStdout?.(chunk);
				touchOutput();
			});
			adapter.onStderr((chunk) => {
				if (captureOutput) stderr += chunk;
				input.onStderr?.(chunk);
				touchOutput();
			});
			const waitPromise = (async () => {
				const result = await adapter.wait();
				if (settled) return {
					reason: forcedReason ?? "exit",
					exitCode: result.code,
					exitSignal: result.signal,
					durationMs: Date.now() - startedAtMs,
					stdout,
					stderr,
					timedOut: isTimeoutReason(forcedReason ?? "exit"),
					noOutputTimedOut: forcedReason === "no-output-timeout"
				};
				settled = true;
				clearTimers();
				adapter.dispose();
				active.delete(runId);
				const reason = forcedReason ?? (result.signal != null ? "signal" : "exit");
				const exit = {
					reason,
					exitCode: result.code,
					exitSignal: result.signal,
					durationMs: Date.now() - startedAtMs,
					stdout,
					stderr,
					timedOut: isTimeoutReason(forcedReason ?? reason),
					noOutputTimedOut: forcedReason === "no-output-timeout"
				};
				registry.finalize(runId, {
					reason: exit.reason,
					exitCode: exit.exitCode,
					exitSignal: exit.exitSignal
				});
				return exit;
			})().catch((err) => {
				if (!settled) {
					settled = true;
					clearTimers();
					active.delete(runId);
					adapter.dispose();
					registry.finalize(runId, {
						reason: "spawn-error",
						exitCode: null,
						exitSignal: null
					});
				}
				throw err;
			});
			const managedRun = {
				runId,
				pid: adapter.pid,
				startedAtMs,
				stdin: adapter.stdin,
				wait: async () => await waitPromise,
				cancel: (reason = "manual-cancel") => {
					requestCancel(reason);
				}
			};
			active.set(runId, {
				run: managedRun,
				scopeKey: input.scopeKey?.trim() || void 0
			});
			return managedRun;
		} catch (err) {
			registry.finalize(runId, {
				reason: "spawn-error",
				exitCode: null,
				exitSignal: null
			});
			const { warnProcessSupervisorSpawnFailure } = await import("./supervisor-log.runtime-DJpKjRTF.js");
			warnProcessSupervisorSpawnFailure(`spawn failed: runId=${runId} reason=${String(err)}`);
			throw err;
		}
	};
	return {
		spawn,
		cancel,
		cancelScope,
		reconcileOrphans: async () => {},
		getRecord: (runId) => registry.get(runId)
	};
}
//#endregion
//#region src/process/supervisor/index.ts
let singleton = null;
function getProcessSupervisor() {
	if (singleton) return singleton;
	singleton = createProcessSupervisor();
	return singleton;
}
//#endregion
//#region src/agents/bash-tools.shared.ts
const CHUNK_LIMIT = 8 * 1024;
function buildSandboxEnv(params) {
	const env = {
		PATH: params.defaultPath,
		HOME: params.containerWorkdir
	};
	for (const [key, value] of Object.entries(params.sandboxEnv ?? {})) env[key] = value;
	for (const [key, value] of Object.entries(params.paramsEnv ?? {})) env[key] = value;
	return env;
}
function coerceEnv(env) {
	const record = {};
	if (!env) return record;
	for (const [key, value] of Object.entries(env)) if (typeof value === "string") record[key] = value;
	return record;
}
function buildDockerExecArgs(params) {
	const args = ["exec", "-i"];
	if (params.tty) args.push("-t");
	if (params.workdir) args.push("-w", params.workdir);
	for (const [key, value] of Object.entries(params.env)) {
		if (key === "PATH") continue;
		args.push("-e", `${key}=${value}`);
	}
	const hasCustomPath = typeof params.env.PATH === "string" && params.env.PATH.length > 0;
	if (hasCustomPath) args.push("-e", `OPENCLAW_PREPEND_PATH=${params.env.PATH}`);
	const pathExport = hasCustomPath ? "export PATH=\"${OPENCLAW_PREPEND_PATH}:$PATH\"; unset OPENCLAW_PREPEND_PATH; " : "";
	args.push(params.containerName, "/bin/sh", "-lc", `${pathExport}${params.command}`);
	return args;
}
async function resolveSandboxWorkdir(params) {
	const fallback = params.sandbox.workspaceDir;
	const candidateWorkdir = mapContainerWorkdirToHost({
		workdir: params.workdir,
		sandbox: params.sandbox
	}) ?? params.workdir;
	try {
		const resolved = await assertSandboxPath({
			filePath: candidateWorkdir,
			cwd: process.cwd(),
			root: params.sandbox.workspaceDir
		});
		if (!(await fs$1.stat(resolved.resolved)).isDirectory()) throw new Error("workdir is not a directory");
		const relative = resolved.relative ? resolved.relative.split(path.sep).join(path.posix.sep) : "";
		const containerWorkdir = relative ? path.posix.join(params.sandbox.containerWorkdir, relative) : params.sandbox.containerWorkdir;
		return {
			hostWorkdir: resolved.resolved,
			containerWorkdir
		};
	} catch {
		params.warnings.push(`Warning: workdir "${params.workdir}" is unavailable; using "${fallback}".`);
		return {
			hostWorkdir: fallback,
			containerWorkdir: params.sandbox.containerWorkdir
		};
	}
}
function mapContainerWorkdirToHost(params) {
	const workdir = normalizeContainerPath(params.workdir);
	const containerRoot = normalizeContainerPath(params.sandbox.containerWorkdir);
	if (containerRoot === ".") return;
	if (workdir === containerRoot) return path.resolve(params.sandbox.workspaceDir);
	if (!workdir.startsWith(`${containerRoot}/`)) return;
	const rel = workdir.slice(containerRoot.length + 1).split("/").filter(Boolean);
	return path.resolve(params.sandbox.workspaceDir, ...rel);
}
function normalizeContainerPath(input) {
	const normalized = input.trim().replace(/\\/g, "/");
	if (!normalized) return ".";
	return path.posix.normalize(normalized);
}
function resolveWorkdir(workdir, warnings) {
	const fallback = safeCwd() ?? homedir();
	try {
		if (statSync(workdir).isDirectory()) return workdir;
	} catch {}
	warnings.push(`Warning: workdir "${workdir}" is unavailable; using "${fallback}".`);
	return fallback;
}
function safeCwd() {
	try {
		const cwd = process.cwd();
		return existsSync(cwd) ? cwd : null;
	} catch {
		return null;
	}
}
/**
* Clamp a number within min/max bounds, using defaultValue if undefined or NaN.
*/
function clampWithDefault(value, defaultValue, min, max) {
	if (value === void 0 || Number.isNaN(value)) return defaultValue;
	return Math.min(Math.max(value, min), max);
}
function readEnvInt(key) {
	const raw = process.env[key];
	if (!raw) return;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) ? parsed : void 0;
}
function chunkString(input, limit = CHUNK_LIMIT) {
	const chunks = [];
	for (let i = 0; i < input.length; i += limit) chunks.push(input.slice(i, i + limit));
	return chunks;
}
function truncateMiddle(str, max) {
	if (str.length <= max) return str;
	const half = Math.floor((max - 3) / 2);
	return `${sliceUtf16Safe(str, 0, half)}...${sliceUtf16Safe(str, -half)}`;
}
function sliceLogLines(text, offset, limit) {
	if (!text) return {
		slice: "",
		totalLines: 0,
		totalChars: 0
	};
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	const totalLines = lines.length;
	const totalChars = text.length;
	let start = typeof offset === "number" && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
	if (limit !== void 0 && offset === void 0) start = Math.max(totalLines - Math.max(0, Math.floor(limit)), 0);
	const end = typeof limit === "number" && Number.isFinite(limit) ? start + Math.max(0, Math.floor(limit)) : void 0;
	return {
		slice: lines.slice(start, end).join("\n"),
		totalLines,
		totalChars
	};
}
function deriveSessionName(command) {
	const tokens = tokenizeCommand(command);
	if (tokens.length === 0) return;
	const verb = tokens[0];
	let target = tokens.slice(1).find((t) => !t.startsWith("-"));
	if (!target) target = tokens[1];
	if (!target) return verb;
	const cleaned = truncateMiddle(stripQuotes(target), 48);
	return `${stripQuotes(verb)} ${cleaned}`;
}
function tokenizeCommand(command) {
	return (command.match(/(?:[^\s"']+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+/g) ?? []).map((token) => stripQuotes(token)).filter(Boolean);
}
function stripQuotes(value) {
	const trimmed = value.trim();
	if (trimmed.startsWith("\"") && trimmed.endsWith("\"") || trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
	return trimmed;
}
function pad(str, width) {
	if (str.length >= width) return str;
	return str + " ".repeat(width - str.length);
}
//#endregion
//#region src/agents/pty-dsr.ts
const DSR_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[\\??6n`, "g");
function stripDsrRequests(input) {
	let requests = 0;
	return {
		cleaned: input.replace(DSR_PATTERN, () => {
			requests += 1;
			return "";
		}),
		requests
	};
}
function buildCursorPositionResponse(row = 1, col = 1) {
	return `\x1b[${row};${col}R`;
}
//#endregion
//#region src/agents/bash-tools.exec-runtime.ts
const SMKX = "\x1B[?1h";
const RMKX = "\x1B[?1l";
/**
* Detect cursor key mode from PTY output chunk.
* Uses lastIndexOf to find the *last* toggle in the chunk.
* Returns "application" if smkx is the last toggle, "normal" if rmkx is last,
* or null if no toggle is found.
*/
function detectCursorKeyMode(raw) {
	const lastSmkx = raw.lastIndexOf(SMKX);
	const lastRmkx = raw.lastIndexOf(RMKX);
	if (lastSmkx === -1 && lastRmkx === -1) return null;
	return lastSmkx > lastRmkx ? "application" : "normal";
}
const DEFAULT_MAX_OUTPUT = clampWithDefault(readEnvInt("PI_BASH_MAX_OUTPUT_CHARS"), 2e5, 1e3, 2e5);
const DEFAULT_PENDING_MAX_OUTPUT = clampWithDefault(readEnvInt("OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS"), 3e4, 1e3, 2e5);
const DEFAULT_PATH = process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const DEFAULT_NOTIFY_SNIPPET_CHARS = 180;
const DEFAULT_APPROVAL_TIMEOUT_MS = DEFAULT_EXEC_APPROVAL_TIMEOUT_MS;
const DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS = DEFAULT_APPROVAL_TIMEOUT_MS + 1e4;
const DEFAULT_APPROVAL_RUNNING_NOTICE_MS = 1e4;
const APPROVAL_SLUG_LENGTH = 8;
const execSchema = Type.Object({
	command: Type.String({ description: "Shell command to execute" }),
	workdir: Type.Optional(Type.String({ description: "Working directory (defaults to cwd)" })),
	env: Type.Optional(Type.Record(Type.String(), Type.String())),
	yieldMs: Type.Optional(Type.Number({ description: "Milliseconds to wait before backgrounding (default 10000)" })),
	background: Type.Optional(Type.Boolean({ description: "Run in background immediately" })),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, kills process on expiry)" })),
	pty: Type.Optional(Type.Boolean({ description: "Run in a pseudo-terminal (PTY) when available (TTY-required CLIs, coding agents)" })),
	elevated: Type.Optional(Type.Boolean({ description: "Run on the host with elevated permissions (if allowed)" })),
	host: Type.Optional(Type.String({ description: "Exec host/target (auto|sandbox|gateway|node)." })),
	security: Type.Optional(Type.String({ description: "Exec security mode (deny|allowlist|full)." })),
	ask: Type.Optional(Type.String({ description: "Exec ask mode (off|on-miss|always)." })),
	node: Type.Optional(Type.String({ description: "Node id/name for host=node." }))
});
function renderExecHostLabel(host) {
	return host === "sandbox" ? "sandbox" : host === "gateway" ? "gateway" : "node";
}
function renderExecTargetLabel(target) {
	return target === "auto" ? "auto" : renderExecHostLabel(target);
}
function isRequestedExecTargetAllowed(params) {
	if (params.requestedTarget === params.configuredTarget) return true;
	if (params.configuredTarget === "auto") {
		if (params.sandboxAvailable && params.requestedTarget === "gateway") return false;
		return true;
	}
	return false;
}
function resolveExecTarget(params) {
	const configuredTarget = params.configuredTarget ?? "auto";
	const requestedTarget = params.requestedTarget ?? null;
	if (params.elevatedRequested) {
		const elevatedTarget = configuredTarget === "node" ? "node" : "gateway";
		return {
			configuredTarget,
			requestedTarget,
			selectedTarget: elevatedTarget,
			effectiveHost: elevatedTarget
		};
	}
	if (requestedTarget && !isRequestedExecTargetAllowed({
		configuredTarget,
		requestedTarget,
		sandboxAvailable: params.sandboxAvailable
	})) {
		const allowedConfig = Array.from(new Set(requestedTarget === "gateway" && !params.sandboxAvailable ? ["gateway", "auto"] : [renderExecTargetLabel(requestedTarget), "auto"])).join(" or ");
		throw new Error(`exec host not allowed (requested ${renderExecTargetLabel(requestedTarget)}; configured host is ${renderExecTargetLabel(configuredTarget)}; set tools.exec.host=${allowedConfig} to allow this override).`);
	}
	const selectedTarget = requestedTarget ?? configuredTarget;
	return {
		configuredTarget,
		requestedTarget,
		selectedTarget,
		effectiveHost: selectedTarget === "auto" ? params.sandboxAvailable ? "sandbox" : "gateway" : selectedTarget
	};
}
function normalizeNotifyOutput(value) {
	return value.replace(/\s+/g, " ").trim();
}
function compactNotifyOutput(value, maxChars = DEFAULT_NOTIFY_SNIPPET_CHARS) {
	const normalized = normalizeNotifyOutput(value);
	if (!normalized) return "";
	if (normalized.length <= maxChars) return normalized;
	const safe = Math.max(1, maxChars - 1);
	return `${normalized.slice(0, safe)}…`;
}
function applyShellPath(env, shellPath) {
	if (!shellPath) return;
	const entries = shellPath.split(path.delimiter).map((part) => part.trim()).filter(Boolean);
	if (entries.length === 0) return;
	const pathKey = findPathKey(env);
	const merged = mergePathPrepend(env[pathKey], entries);
	if (merged) env[pathKey] = merged;
}
function maybeNotifyOnExit(session, status) {
	if (!session.backgrounded || !session.notifyOnExit || session.exitNotified) return;
	const sessionKey = session.sessionKey?.trim();
	if (!sessionKey) return;
	session.exitNotified = true;
	const exitLabel = session.exitSignal ? `signal ${session.exitSignal}` : `code ${session.exitCode ?? 0}`;
	const output = compactNotifyOutput(tail(session.tail || session.aggregated || "", 400));
	if (status === "completed" && !output && session.notifyOnExitEmptySuccess !== true) return;
	enqueueSystemEvent(output ? `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel}) :: ${output}` : `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel})`, { sessionKey });
	requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }));
}
function createApprovalSlug(id) {
	return id.slice(0, APPROVAL_SLUG_LENGTH);
}
function buildApprovalPendingMessage(params) {
	let fence = "```";
	while (params.command.includes(fence)) fence += "`";
	const commandBlock = `${fence}sh\n${params.command}\n${fence}`;
	const lines = [];
	const allowedDecisions = params.allowedDecisions ?? resolveExecApprovalAllowedDecisions();
	const decisionText = allowedDecisions.join("|");
	const warningText = params.warningText?.trim();
	if (warningText) lines.push(warningText, "");
	lines.push(`Approval required (id ${params.approvalSlug}, full ${params.approvalId}).`);
	lines.push(`Host: ${params.host}`);
	if (params.nodeId) lines.push(`Node: ${params.nodeId}`);
	lines.push(`CWD: ${params.cwd ?? "(node default)"}`);
	lines.push("Command:");
	lines.push(commandBlock);
	lines.push("Mode: foreground (interactive approvals available).");
	lines.push(allowedDecisions.includes("allow-always") ? "Background mode requires pre-approved policy (allow-always or ask=off)." : "Background mode requires an effective policy that allows pre-approval (for example ask=off).");
	lines.push(`Reply with: /approve ${params.approvalSlug} ${decisionText}`);
	if (!allowedDecisions.includes("allow-always")) lines.push("The effective approval policy requires approval every time, so Allow Always is unavailable.");
	lines.push("If the short code is ambiguous, use the full id in /approve.");
	return lines.join("\n");
}
function resolveApprovalRunningNoticeMs(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_APPROVAL_RUNNING_NOTICE_MS;
	if (value <= 0) return 0;
	return Math.floor(value);
}
function joinExecFailureOutput(aggregated, reason) {
	return aggregated ? `${aggregated}\n\n${reason}` : reason;
}
function classifyExecFailureKind(params) {
	if (params.isShellFailure) return params.exitCode === 127 ? "shell-command-not-found" : "shell-not-executable";
	if (params.exitReason === "overall-timeout") return "overall-timeout";
	if (params.exitReason === "no-output-timeout") return "no-output-timeout";
	if (params.exitSignal != null) return "signal";
	return "aborted";
}
function formatExecFailureReason(params) {
	switch (params.failureKind) {
		case "shell-command-not-found": return "Command not found";
		case "shell-not-executable": return "Command not executable (permission denied)";
		case "overall-timeout": return typeof params.timeoutSec === "number" && params.timeoutSec > 0 ? `Command timed out after ${params.timeoutSec} seconds. If this command is expected to take longer, re-run with a higher timeout (e.g., exec timeout=300).` : "Command timed out. If this command is expected to take longer, re-run with a higher timeout (e.g., exec timeout=300).";
		case "no-output-timeout": return "Command timed out waiting for output";
		case "signal": return `Command aborted by signal ${params.exitSignal}`;
		case "aborted": return "Command aborted before exit code was captured";
	}
}
function buildExecExitOutcome(params) {
	const exitCode = params.exit.exitCode ?? 0;
	const isNormalExit = params.exit.reason === "exit";
	const isShellFailure = exitCode === 126 || exitCode === 127;
	if ((isNormalExit && !isShellFailure ? "completed" : "failed") === "completed") {
		const exitMsg = exitCode !== 0 ? `\n\n(Command exited with code ${exitCode})` : "";
		return {
			status: "completed",
			exitCode,
			exitSignal: params.exit.exitSignal,
			durationMs: params.durationMs,
			aggregated: params.aggregated + exitMsg,
			timedOut: false
		};
	}
	const failureKind = classifyExecFailureKind({
		exitReason: params.exit.reason,
		exitCode,
		isShellFailure,
		exitSignal: params.exit.exitSignal
	});
	const reason = formatExecFailureReason({
		failureKind,
		exitSignal: params.exit.exitSignal,
		timeoutSec: params.timeoutSec
	});
	return {
		status: "failed",
		exitCode: params.exit.exitCode,
		exitSignal: params.exit.exitSignal,
		durationMs: params.durationMs,
		aggregated: params.aggregated,
		timedOut: params.exit.timedOut,
		failureKind,
		reason: joinExecFailureOutput(params.aggregated, reason)
	};
}
function buildExecRuntimeErrorOutcome(params) {
	return {
		status: "failed",
		exitCode: null,
		exitSignal: null,
		durationMs: params.durationMs,
		aggregated: params.aggregated,
		timedOut: false,
		failureKind: "runtime-error",
		reason: joinExecFailureOutput(params.aggregated, String(params.error))
	};
}
async function runExecProcess(opts) {
	const startedAt = Date.now();
	const sessionId = createSessionSlug();
	const execCommand = opts.execCommand ?? opts.command;
	const supervisor = getProcessSupervisor();
	const shellRuntimeEnv = {
		...opts.env,
		OPENCLAW_SHELL: "exec"
	};
	const session = {
		id: sessionId,
		command: opts.command,
		scopeKey: opts.scopeKey,
		sessionKey: opts.sessionKey,
		notifyOnExit: opts.notifyOnExit,
		notifyOnExitEmptySuccess: opts.notifyOnExitEmptySuccess === true,
		exitNotified: false,
		child: void 0,
		stdin: void 0,
		pid: void 0,
		startedAt,
		cwd: opts.workdir,
		maxOutputChars: opts.maxOutput,
		pendingMaxOutputChars: opts.pendingMaxOutput,
		totalOutputChars: 0,
		pendingStdout: [],
		pendingStderr: [],
		pendingStdoutChars: 0,
		pendingStderrChars: 0,
		aggregated: "",
		tail: "",
		exited: false,
		exitCode: void 0,
		exitSignal: void 0,
		truncated: false,
		backgrounded: false,
		cursorKeyMode: opts.usePty ? "unknown" : "normal"
	};
	addSession(session);
	const emitUpdate = () => {
		if (!opts.onUpdate) return;
		const tailText = session.tail || session.aggregated;
		const warningText = opts.warnings.length ? `${opts.warnings.join("\n")}\n\n` : "";
		opts.onUpdate({
			content: [{
				type: "text",
				text: warningText + (tailText || "")
			}],
			details: {
				status: "running",
				sessionId,
				pid: session.pid ?? void 0,
				startedAt,
				cwd: session.cwd,
				tail: session.tail
			}
		});
	};
	const handleStdout = (data) => {
		const raw = data.toString();
		const mode = detectCursorKeyMode(raw);
		if (mode) session.cursorKeyMode = mode;
		const str = sanitizeBinaryOutput(raw);
		for (const chunk of chunkString(str)) {
			appendOutput(session, "stdout", chunk);
			emitUpdate();
		}
	};
	const handleStderr = (data) => {
		const str = sanitizeBinaryOutput(data.toString());
		for (const chunk of chunkString(str)) {
			appendOutput(session, "stderr", chunk);
			emitUpdate();
		}
	};
	const timeoutMs = typeof opts.timeoutSec === "number" && opts.timeoutSec > 0 ? Math.floor(opts.timeoutSec * 1e3) : void 0;
	let sandboxFinalizeToken;
	const spawnSpec = await (async () => {
		if (opts.sandbox) {
			const backendExecSpec = await opts.sandbox.buildExecSpec?.({
				command: execCommand,
				workdir: opts.containerWorkdir ?? opts.sandbox.containerWorkdir,
				env: shellRuntimeEnv,
				usePty: opts.usePty
			});
			sandboxFinalizeToken = backendExecSpec?.finalizeToken;
			return {
				mode: "child",
				argv: backendExecSpec?.argv ?? ["docker", ...buildDockerExecArgs({
					containerName: opts.sandbox.containerName,
					command: execCommand,
					workdir: opts.containerWorkdir ?? opts.sandbox.containerWorkdir,
					env: shellRuntimeEnv,
					tty: opts.usePty
				})],
				env: backendExecSpec?.env ?? process.env,
				stdinMode: backendExecSpec?.stdinMode ?? (opts.usePty ? "pipe-open" : "pipe-closed")
			};
		}
		const { shell, args: shellArgs } = getShellConfig();
		const childArgv = [
			shell,
			...shellArgs,
			execCommand
		];
		if (opts.usePty) return {
			mode: "pty",
			ptyCommand: execCommand,
			childFallbackArgv: childArgv,
			env: shellRuntimeEnv,
			stdinMode: "pipe-open"
		};
		return {
			mode: "child",
			argv: childArgv,
			env: shellRuntimeEnv,
			stdinMode: "pipe-closed"
		};
	})();
	let managedRun = null;
	let usingPty = spawnSpec.mode === "pty";
	const cursorResponse = buildCursorPositionResponse();
	const onSupervisorStdout = (chunk) => {
		if (usingPty) {
			const { cleaned, requests } = stripDsrRequests(chunk);
			if (requests > 0 && managedRun?.stdin) for (let i = 0; i < requests; i += 1) managedRun.stdin.write(cursorResponse);
			handleStdout(cleaned);
			return;
		}
		handleStdout(chunk);
	};
	try {
		const spawnBase = {
			runId: sessionId,
			sessionId: opts.sessionKey?.trim() || sessionId,
			backendId: opts.sandbox ? "exec-sandbox" : "exec-host",
			scopeKey: opts.scopeKey,
			cwd: opts.workdir,
			env: spawnSpec.env,
			timeoutMs,
			captureOutput: false,
			onStdout: onSupervisorStdout,
			onStderr: handleStderr
		};
		managedRun = spawnSpec.mode === "pty" ? await supervisor.spawn({
			...spawnBase,
			mode: "pty",
			ptyCommand: spawnSpec.ptyCommand
		}) : await supervisor.spawn({
			...spawnBase,
			mode: "child",
			argv: spawnSpec.argv,
			stdinMode: spawnSpec.stdinMode
		});
	} catch (err) {
		if (spawnSpec.mode === "pty") {
			const warning = `Warning: PTY spawn failed (${String(err)}); retrying without PTY for \`${opts.command}\`.`;
			logWarn(`exec: PTY spawn failed (${String(err)}); retrying without PTY for "${opts.command}".`);
			opts.warnings.push(warning);
			usingPty = false;
			try {
				managedRun = await supervisor.spawn({
					runId: sessionId,
					sessionId: opts.sessionKey?.trim() || sessionId,
					backendId: "exec-host",
					scopeKey: opts.scopeKey,
					mode: "child",
					argv: spawnSpec.childFallbackArgv,
					cwd: opts.workdir,
					env: spawnSpec.env,
					stdinMode: "pipe-open",
					timeoutMs,
					captureOutput: false,
					onStdout: handleStdout,
					onStderr: handleStderr
				});
			} catch (retryErr) {
				markExited(session, null, null, "failed");
				maybeNotifyOnExit(session, "failed");
				throw retryErr;
			}
		} else {
			markExited(session, null, null, "failed");
			maybeNotifyOnExit(session, "failed");
			throw err;
		}
	}
	session.stdin = managedRun.stdin;
	session.pid = managedRun.pid;
	const promise = managedRun.wait().then(async (exit) => {
		const durationMs = Date.now() - startedAt;
		const outcome = buildExecExitOutcome({
			exit,
			aggregated: session.aggregated.trim(),
			durationMs,
			timeoutSec: opts.timeoutSec
		});
		markExited(session, exit.exitCode, exit.exitSignal, outcome.status);
		maybeNotifyOnExit(session, outcome.status);
		if (!session.child && session.stdin) session.stdin.destroyed = true;
		if (opts.sandbox?.finalizeExec) await opts.sandbox.finalizeExec({
			status: outcome.status,
			exitCode: exit.exitCode ?? null,
			timedOut: exit.timedOut,
			token: sandboxFinalizeToken
		});
		return outcome;
	}).catch((err) => {
		markExited(session, null, null, "failed");
		maybeNotifyOnExit(session, "failed");
		return buildExecRuntimeErrorOutcome({
			error: err,
			aggregated: session.aggregated.trim(),
			durationMs: Date.now() - startedAt
		});
	});
	return {
		session,
		startedAt,
		pid: session.pid ?? void 0,
		promise,
		kill: () => {
			managedRun?.cancel("manual-cancel");
		}
	};
}
//#endregion
//#region src/infra/node-pairing-authz.ts
const OPERATOR_PAIRING_SCOPE = "operator.pairing";
const OPERATOR_WRITE_SCOPE = "operator.write";
const OPERATOR_ADMIN_SCOPE = "operator.admin";
function resolveNodePairApprovalScopes(commands) {
	const normalized = Array.isArray(commands) ? commands.filter((command) => typeof command === "string") : [];
	if (normalized.some((command) => NODE_SYSTEM_RUN_COMMANDS.some((allowed) => allowed === command))) return [OPERATOR_PAIRING_SCOPE, OPERATOR_ADMIN_SCOPE];
	if (normalized.length > 0) return [OPERATOR_PAIRING_SCOPE, OPERATOR_WRITE_SCOPE];
	return [OPERATOR_PAIRING_SCOPE];
}
//#endregion
//#region src/agents/skills/refresh-state.ts
const listeners = /* @__PURE__ */ new Set();
const workspaceVersions = /* @__PURE__ */ new Map();
let globalVersion = 0;
let listenerErrorHandler;
function bumpVersion(current) {
	const now = Date.now();
	return now <= current ? current + 1 : now;
}
function emit(event) {
	for (const listener of listeners) try {
		listener(event);
	} catch (err) {
		listenerErrorHandler?.(err);
	}
}
function setSkillsChangeListenerErrorHandler(handler) {
	listenerErrorHandler = handler;
}
function registerSkillsChangeListener(listener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
function bumpSkillsSnapshotVersion(params) {
	const reason = params?.reason ?? "manual";
	const changedPath = params?.changedPath;
	if (params?.workspaceDir) {
		const next = bumpVersion(workspaceVersions.get(params.workspaceDir) ?? 0);
		workspaceVersions.set(params.workspaceDir, next);
		emit({
			workspaceDir: params.workspaceDir,
			reason,
			changedPath
		});
		return next;
	}
	globalVersion = bumpVersion(globalVersion);
	emit({
		reason,
		changedPath
	});
	return globalVersion;
}
function getSkillsSnapshotVersion(workspaceDir) {
	if (!workspaceDir) return globalVersion;
	const local = workspaceVersions.get(workspaceDir) ?? 0;
	return Math.max(globalVersion, local);
}
function shouldRefreshSnapshotForVersion(cachedVersion, nextVersion) {
	const cached = typeof cachedVersion === "number" ? cachedVersion : 0;
	const next = typeof nextVersion === "number" ? nextVersion : 0;
	return next === 0 ? cached > 0 : cached < next;
}
//#endregion
//#region src/infra/node-pairing.ts
const PENDING_TTL_MS = 300 * 1e3;
const OPERATOR_ROLE = "operator";
const withLock = createAsyncLock();
function normalizeStringList(values) {
	if (!Array.isArray(values)) return;
	const normalized = values.map((value) => value.trim()).filter(Boolean);
	return normalized.length > 0 ? normalized : [];
}
function buildPendingNodePairingRequest(params) {
	return {
		requestId: params.requestId ?? randomUUID(),
		nodeId: params.req.nodeId,
		displayName: params.req.displayName,
		platform: params.req.platform,
		version: params.req.version,
		coreVersion: params.req.coreVersion,
		uiVersion: params.req.uiVersion,
		deviceFamily: params.req.deviceFamily,
		modelIdentifier: params.req.modelIdentifier,
		caps: normalizeStringList(params.req.caps),
		commands: normalizeStringList(params.req.commands),
		permissions: params.req.permissions,
		remoteIp: params.req.remoteIp,
		silent: params.req.silent,
		ts: Date.now()
	};
}
function refreshPendingNodePairingRequest(existing, incoming) {
	return {
		...existing,
		displayName: incoming.displayName ?? existing.displayName,
		platform: incoming.platform ?? existing.platform,
		version: incoming.version ?? existing.version,
		coreVersion: incoming.coreVersion ?? existing.coreVersion,
		uiVersion: incoming.uiVersion ?? existing.uiVersion,
		deviceFamily: incoming.deviceFamily ?? existing.deviceFamily,
		modelIdentifier: incoming.modelIdentifier ?? existing.modelIdentifier,
		caps: normalizeStringList(incoming.caps) ?? existing.caps,
		commands: normalizeStringList(incoming.commands) ?? existing.commands,
		permissions: incoming.permissions ?? existing.permissions,
		remoteIp: incoming.remoteIp ?? existing.remoteIp,
		silent: Boolean(existing.silent && incoming.silent),
		ts: Date.now()
	};
}
function resolveNodeApprovalRequiredScopes(pending) {
	return resolveNodePairApprovalScopes(Array.isArray(pending.commands) ? pending.commands : []);
}
function toPendingNodePairingEntry(pending) {
	return {
		...pending,
		requiredApproveScopes: resolveNodeApprovalRequiredScopes(pending)
	};
}
async function loadState(baseDir) {
	const { pendingPath, pairedPath } = resolvePairingPaths(baseDir, "nodes");
	const [pending, paired] = await Promise.all([readJsonFile(pendingPath), readJsonFile(pairedPath)]);
	const state = {
		pendingById: pending ?? {},
		pairedByNodeId: paired ?? {}
	};
	pruneExpiredPending(state.pendingById, Date.now(), PENDING_TTL_MS);
	return state;
}
async function persistState(state, baseDir) {
	const { pendingPath, pairedPath } = resolvePairingPaths(baseDir, "nodes");
	await Promise.all([writeJsonAtomic(pendingPath, state.pendingById), writeJsonAtomic(pairedPath, state.pairedByNodeId)]);
}
function normalizeNodeId(nodeId) {
	return nodeId.trim();
}
function newToken() {
	return generatePairingToken();
}
async function listNodePairing(baseDir) {
	const state = await loadState(baseDir);
	return {
		pending: Object.values(state.pendingById).toSorted((a, b) => b.ts - a.ts).map(toPendingNodePairingEntry),
		paired: Object.values(state.pairedByNodeId).toSorted((a, b) => b.approvedAtMs - a.approvedAtMs)
	};
}
async function getPairedNode(nodeId, baseDir) {
	return (await loadState(baseDir)).pairedByNodeId[normalizeNodeId(nodeId)] ?? null;
}
async function requestNodePairing(req, baseDir) {
	return await withLock(async () => {
		const state = await loadState(baseDir);
		const nodeId = normalizeNodeId(req.nodeId);
		if (!nodeId) throw new Error("nodeId required");
		const pendingForNode = Object.values(state.pendingById).filter((pending) => pending.nodeId === nodeId).toSorted((left, right) => right.ts - left.ts);
		return await reconcilePendingPairingRequests({
			pendingById: state.pendingById,
			existing: pendingForNode,
			incoming: {
				...req,
				nodeId
			},
			canRefreshSingle: () => true,
			refreshSingle: (existing, incoming) => refreshPendingNodePairingRequest(existing, incoming),
			buildReplacement: ({ existing, incoming }) => buildPendingNodePairingRequest({ req: {
				...incoming,
				silent: Boolean(incoming.silent && existing.every((pending) => pending.silent === true))
			} }),
			persist: async () => await persistState(state, baseDir)
		});
	});
}
async function approveNodePairing(requestId, options, baseDir) {
	return await withLock(async () => {
		const state = await loadState(baseDir);
		const pending = state.pendingById[requestId];
		if (!pending) return null;
		const missingScope = resolveMissingRequestedScope({
			role: OPERATOR_ROLE,
			requestedScopes: resolveNodeApprovalRequiredScopes(pending),
			allowedScopes: options.callerScopes ?? []
		});
		if (missingScope) return {
			status: "forbidden",
			missingScope
		};
		const now = Date.now();
		const existing = state.pairedByNodeId[pending.nodeId];
		const node = {
			nodeId: pending.nodeId,
			token: newToken(),
			displayName: pending.displayName,
			platform: pending.platform,
			version: pending.version,
			coreVersion: pending.coreVersion,
			uiVersion: pending.uiVersion,
			deviceFamily: pending.deviceFamily,
			modelIdentifier: pending.modelIdentifier,
			caps: pending.caps,
			commands: pending.commands,
			permissions: pending.permissions,
			remoteIp: pending.remoteIp,
			createdAtMs: existing?.createdAtMs ?? now,
			approvedAtMs: now
		};
		delete state.pendingById[requestId];
		state.pairedByNodeId[pending.nodeId] = node;
		await persistState(state, baseDir);
		return {
			requestId,
			node
		};
	});
}
async function rejectNodePairing(requestId, baseDir) {
	return await withLock(async () => {
		return await rejectPendingPairingRequest({
			requestId,
			idKey: "nodeId",
			loadState: () => loadState(baseDir),
			persistState: (state) => persistState(state, baseDir),
			getId: (pending) => pending.nodeId
		});
	});
}
async function verifyNodeToken(nodeId, token, baseDir) {
	const state = await loadState(baseDir);
	const normalized = normalizeNodeId(nodeId);
	const node = state.pairedByNodeId[normalized];
	if (!node) return { ok: false };
	return verifyPairingToken(token, node.token) ? {
		ok: true,
		node
	} : { ok: false };
}
async function updatePairedNodeMetadata(nodeId, patch, baseDir) {
	await withLock(async () => {
		const state = await loadState(baseDir);
		const normalized = normalizeNodeId(nodeId);
		const existing = state.pairedByNodeId[normalized];
		if (!existing) return;
		const next = {
			...existing,
			displayName: patch.displayName ?? existing.displayName,
			platform: patch.platform ?? existing.platform,
			version: patch.version ?? existing.version,
			coreVersion: patch.coreVersion ?? existing.coreVersion,
			uiVersion: patch.uiVersion ?? existing.uiVersion,
			deviceFamily: patch.deviceFamily ?? existing.deviceFamily,
			modelIdentifier: patch.modelIdentifier ?? existing.modelIdentifier,
			remoteIp: patch.remoteIp ?? existing.remoteIp,
			caps: patch.caps ?? existing.caps,
			commands: patch.commands ?? existing.commands,
			bins: patch.bins ?? existing.bins,
			permissions: patch.permissions ?? existing.permissions,
			lastConnectedAtMs: patch.lastConnectedAtMs ?? existing.lastConnectedAtMs
		};
		state.pairedByNodeId[normalized] = next;
		await persistState(state, baseDir);
	});
}
async function renamePairedNode(nodeId, displayName, baseDir) {
	return await withLock(async () => {
		const state = await loadState(baseDir);
		const normalized = normalizeNodeId(nodeId);
		const existing = state.pairedByNodeId[normalized];
		if (!existing) return null;
		const trimmed = displayName.trim();
		if (!trimmed) throw new Error("displayName required");
		const next = {
			...existing,
			displayName: trimmed
		};
		state.pairedByNodeId[normalized] = next;
		await persistState(state, baseDir);
		return next;
	});
}
//#endregion
//#region src/infra/skills-remote.ts
const log = createSubsystemLogger("gateway/skills-remote");
const remoteNodes = /* @__PURE__ */ new Map();
let remoteRegistry = null;
function describeNode(nodeId) {
	const record = remoteNodes.get(nodeId);
	const name = record?.displayName?.trim();
	const base = name && name !== nodeId ? `${name} (${nodeId})` : nodeId;
	const ip = record?.remoteIp?.trim();
	return ip ? `${base} @ ${ip}` : base;
}
function extractErrorMessage(err) {
	if (!err) return;
	if (typeof err === "string") return err;
	if (err instanceof Error) return err.message;
	if (typeof err === "object" && "message" in err && typeof err.message === "string") return err.message;
	if (typeof err === "number" || typeof err === "boolean" || typeof err === "bigint") return String(err);
	if (typeof err === "symbol") return err.toString();
	if (typeof err === "object") try {
		return JSON.stringify(err);
	} catch {
		return;
	}
}
function logRemoteBinProbeFailure(nodeId, err) {
	const message = extractErrorMessage(err);
	const label = describeNode(nodeId);
	if (message?.includes("node not connected") || message?.includes("node disconnected")) {
		log.info(`remote bin probe skipped: node unavailable (${label})`);
		return;
	}
	if (message?.includes("invoke timed out") || message?.includes("timeout")) {
		log.warn(`remote bin probe timed out (${label}); check node connectivity for ${label}`);
		return;
	}
	log.warn(`remote bin probe error (${label}): ${message ?? "unknown"}`);
}
function isMacPlatform(platform, deviceFamily) {
	const platformNorm = String(platform ?? "").trim().toLowerCase();
	const familyNorm = String(deviceFamily ?? "").trim().toLowerCase();
	if (platformNorm.includes("mac")) return true;
	if (platformNorm.includes("darwin")) return true;
	if (familyNorm === "mac") return true;
	return false;
}
function supportsSystemRun(commands) {
	return Array.isArray(commands) && commands.includes("system.run");
}
function supportsSystemWhich(commands) {
	return Array.isArray(commands) && commands.includes("system.which");
}
function upsertNode(record) {
	const existing = remoteNodes.get(record.nodeId);
	const bins = new Set(record.bins ?? existing?.bins ?? []);
	remoteNodes.set(record.nodeId, {
		nodeId: record.nodeId,
		displayName: record.displayName ?? existing?.displayName,
		platform: record.platform ?? existing?.platform,
		deviceFamily: record.deviceFamily ?? existing?.deviceFamily,
		commands: record.commands ?? existing?.commands,
		remoteIp: record.remoteIp ?? existing?.remoteIp,
		bins
	});
}
function setSkillsRemoteRegistry(registry) {
	remoteRegistry = registry;
}
async function primeRemoteSkillsCache() {
	try {
		const list = await listNodePairing();
		let sawMac = false;
		for (const node of list.paired) {
			upsertNode({
				nodeId: node.nodeId,
				displayName: node.displayName,
				platform: node.platform,
				deviceFamily: node.deviceFamily,
				commands: node.commands,
				remoteIp: node.remoteIp,
				bins: node.bins
			});
			if (isMacPlatform(node.platform, node.deviceFamily) && supportsSystemRun(node.commands)) sawMac = true;
		}
		if (sawMac) bumpSkillsSnapshotVersion({ reason: "remote-node" });
	} catch (err) {
		log.warn(`failed to prime remote skills cache: ${String(err)}`);
	}
}
function recordRemoteNodeInfo(node) {
	upsertNode(node);
}
function recordRemoteNodeBins(nodeId, bins) {
	upsertNode({
		nodeId,
		bins
	});
}
function removeRemoteNodeInfo(nodeId) {
	const existing = remoteNodes.get(nodeId);
	remoteNodes.delete(nodeId);
	if (existing && isMacPlatform(existing.platform, existing.deviceFamily) && supportsSystemRun(existing.commands)) bumpSkillsSnapshotVersion({ reason: "remote-node" });
}
function collectRequiredBins(entries, targetPlatform) {
	const bins = /* @__PURE__ */ new Set();
	for (const entry of entries) {
		const os = entry.metadata?.os ?? [];
		if (os.length > 0 && !os.includes(targetPlatform)) continue;
		const required = entry.metadata?.requires?.bins ?? [];
		const anyBins = entry.metadata?.requires?.anyBins ?? [];
		for (const bin of required) if (bin.trim()) bins.add(bin.trim());
		for (const bin of anyBins) if (bin.trim()) bins.add(bin.trim());
	}
	return [...bins];
}
function buildBinProbeScript(bins) {
	return `for b in ${bins.map((bin) => `'${bin.replace(/'/g, `'\\''`)}'`).join(" ")}; do if command -v "$b" >/dev/null 2>&1; then echo "$b"; fi; done`;
}
function parseBinProbePayload(payloadJSON, payload) {
	if (!payloadJSON && !payload) return [];
	try {
		const parsed = payloadJSON ? JSON.parse(payloadJSON) : payload;
		if (Array.isArray(parsed.bins)) return parsed.bins.map((bin) => String(bin).trim()).filter(Boolean);
		if (typeof parsed.stdout === "string") return parsed.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	} catch {
		return [];
	}
	return [];
}
function areBinSetsEqual(a, b) {
	if (!a) return false;
	if (a.size !== b.size) return false;
	for (const bin of b) if (!a.has(bin)) return false;
	return true;
}
async function refreshRemoteNodeBins(params) {
	if (!remoteRegistry) return;
	if (!isMacPlatform(params.platform, params.deviceFamily)) return;
	const canWhich = supportsSystemWhich(params.commands);
	const canRun = supportsSystemRun(params.commands);
	if (!canWhich && !canRun) return;
	const workspaceDirs = listAgentWorkspaceDirs(params.cfg);
	const requiredBins = /* @__PURE__ */ new Set();
	for (const workspaceDir of workspaceDirs) {
		const entries = loadWorkspaceSkillEntries(workspaceDir, { config: params.cfg });
		for (const bin of collectRequiredBins(entries, "darwin")) requiredBins.add(bin);
	}
	if (requiredBins.size === 0) return;
	try {
		const binsList = [...requiredBins];
		const res = await remoteRegistry.invoke(canWhich ? {
			nodeId: params.nodeId,
			command: "system.which",
			params: { bins: binsList },
			timeoutMs: params.timeoutMs ?? 15e3
		} : {
			nodeId: params.nodeId,
			command: "system.run",
			params: { command: [
				"/bin/sh",
				"-lc",
				buildBinProbeScript(binsList)
			] },
			timeoutMs: params.timeoutMs ?? 15e3
		});
		if (!res.ok) {
			logRemoteBinProbeFailure(params.nodeId, res.error?.message ?? "unknown");
			return;
		}
		const bins = parseBinProbePayload(res.payloadJSON, res.payload);
		const existingBins = remoteNodes.get(params.nodeId)?.bins;
		const hasChanged = !areBinSetsEqual(existingBins, new Set(bins));
		recordRemoteNodeBins(params.nodeId, bins);
		if (!hasChanged) return;
		await updatePairedNodeMetadata(params.nodeId, { bins });
		bumpSkillsSnapshotVersion({ reason: "remote-node" });
	} catch (err) {
		logRemoteBinProbeFailure(params.nodeId, err);
	}
}
function getRemoteSkillEligibility(options) {
	const macNodes = [...remoteNodes.values()].filter((node) => isMacPlatform(node.platform, node.deviceFamily) && supportsSystemRun(node.commands));
	if (macNodes.length === 0) return;
	const bins = /* @__PURE__ */ new Set();
	for (const node of macNodes) for (const bin of node.bins) bins.add(bin);
	const labels = macNodes.map((node) => node.displayName ?? node.nodeId).filter(Boolean);
	const note = options?.advertiseExecNode === false ? void 0 : labels.length > 0 ? `Remote macOS node available (${labels.join(", ")}). Run macOS-only skills via exec host=node on that node.` : "Remote macOS node available. Run macOS-only skills via exec host=node on that node.";
	return {
		platforms: ["darwin"],
		hasBin: (bin) => bins.has(bin),
		hasAnyBin: (required) => required.some((bin) => bins.has(bin)),
		...note ? { note } : {}
	};
}
async function refreshRemoteBinsForConnectedNodes(cfg) {
	if (!remoteRegistry) return;
	const connected = remoteRegistry.listConnected();
	for (const node of connected) await refreshRemoteNodeBins({
		nodeId: node.nodeId,
		platform: node.platform,
		deviceFamily: node.deviceFamily,
		commands: node.commands,
		cfg
	});
}
//#endregion
//#region src/agents/exec-defaults.ts
function resolveExecConfigState(params) {
	const cfg = params.cfg ?? {};
	const resolvedAgentId = params.agentId ?? resolveSessionAgentId({
		sessionKey: params.sessionKey,
		config: cfg
	});
	const globalExec = cfg.tools?.exec;
	const agentExec = resolvedAgentId ? resolveAgentConfig(cfg, resolvedAgentId)?.tools?.exec : void 0;
	return {
		cfg,
		host: params.sessionEntry?.execHost ?? agentExec?.host ?? globalExec?.host ?? "auto",
		agentExec,
		globalExec
	};
}
function canExecRequestNode(params) {
	const { host } = resolveExecConfigState(params);
	return isRequestedExecTargetAllowed({
		configuredTarget: host,
		requestedTarget: "node"
	});
}
function resolveExecDefaults(params) {
	const { cfg, host, agentExec, globalExec } = resolveExecConfigState(params);
	return {
		host,
		effectiveHost: resolveExecTarget({
			configuredTarget: host,
			elevatedRequested: false,
			sandboxAvailable: params.sandboxAvailable ?? (params.sessionKey ? resolveSandboxRuntimeStatus({
				cfg,
				sessionKey: params.sessionKey
			}).sandboxed : false)
		}).effectiveHost,
		security: params.sessionEntry?.execSecurity ?? agentExec?.security ?? globalExec?.security ?? "deny",
		ask: params.sessionEntry?.execAsk ?? agentExec?.ask ?? globalExec?.ask ?? "on-miss",
		node: params.sessionEntry?.execNode ?? agentExec?.node ?? globalExec?.node,
		canRequestNode: isRequestedExecTargetAllowed({
			configuredTarget: host,
			requestedTarget: "node"
		})
	};
}
//#endregion
export { deleteSession as $, buildApprovalPendingMessage as A, clampWithDefault as B, resolveNodePairApprovalScopes as C, DEFAULT_PATH as D, DEFAULT_MAX_OUTPUT as E, resolveApprovalRunningNoticeMs as F, resolveSandboxWorkdir as G, deriveSessionName as H, resolveExecTarget as I, truncateMiddle as J, resolveWorkdir as K, runExecProcess as L, execSchema as M, normalizeNotifyOutput as N, DEFAULT_PENDING_MAX_OUTPUT as O, renderExecTargetLabel as P, normalizePathPrepend as Q, buildDockerExecArgs as R, shouldRefreshSnapshotForVersion as S, DEFAULT_APPROVAL_TIMEOUT_MS as T, pad as U, coerceEnv as V, readEnvInt as W, detectRuntimeShell as X, getProcessSupervisor as Y, applyPathPrepend as Z, verifyNodeToken as _, recordRemoteNodeInfo as a, markBackgrounded as at, registerSkillsChangeListener as b, removeRemoteNodeInfo as c, tail as ct, getPairedNode as d, drainSession as et, listNodePairing as f, updatePairedNodeMetadata as g, requestNodePairing as h, primeRemoteSkillsCache as i, listRunningSessions as it, createApprovalSlug as j, applyShellPath as k, setSkillsRemoteRegistry as l, renamePairedNode as m, resolveExecDefaults as n, getSession as nt, refreshRemoteBinsForConnectedNodes as o, markExited as ot, rejectNodePairing as p, sliceLogLines as q, getRemoteSkillEligibility as r, listFinishedSessions as rt, refreshRemoteNodeBins as s, setJobTtlMs as st, canExecRequestNode as t, getFinishedSession as tt, approveNodePairing as u, bumpSkillsSnapshotVersion as v, DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS as w, setSkillsChangeListenerErrorHandler as x, getSkillsSnapshotVersion as y, buildSandboxEnv as z };
