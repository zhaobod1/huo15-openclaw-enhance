import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import fs$1 from "node:fs/promises";
import { randomUUID } from "node:crypto";
import readline from "node:readline/promises";
import { Readable, Writable } from "node:stream";
import { ClientSideConnection, PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
//#region extensions/acpx/src/agents/registry.ts
const ACP_ADAPTER_PACKAGE_RANGES = {
	pi: "^0.0.22",
	codex: "^0.11.1",
	claude: "^0.25.0"
};
const AGENT_REGISTRY = {
	pi: `npx pi-acp@${ACP_ADAPTER_PACKAGE_RANGES.pi}`,
	openclaw: "openclaw acp",
	codex: `npx @zed-industries/codex-acp@${ACP_ADAPTER_PACKAGE_RANGES.codex}`,
	claude: `npx -y @agentclientprotocol/claude-agent-acp@${ACP_ADAPTER_PACKAGE_RANGES.claude}`,
	gemini: "gemini --acp",
	cursor: "cursor-agent acp",
	copilot: "copilot --acp --stdio",
	droid: "droid exec --output-format acp",
	iflow: "iflow --experimental-acp",
	kilocode: "npx -y @kilocode/cli acp",
	kimi: "kimi acp",
	kiro: "kiro-cli-chat acp",
	opencode: "npx -y opencode-ai acp",
	qoder: "qodercli --acp",
	qwen: "qwen --acp",
	trae: "traecli acp serve"
};
const AGENT_ALIASES = {
	"factory-droid": "droid",
	factorydroid: "droid"
};
const DEFAULT_AGENT_NAME = "codex";
function normalizeAgentName(value) {
	return value.trim().toLowerCase();
}
function mergeAgentRegistry(overrides) {
	if (!overrides) return { ...AGENT_REGISTRY };
	const merged = { ...AGENT_REGISTRY };
	for (const [name, command] of Object.entries(overrides)) {
		const normalized = normalizeAgentName(name);
		if (!normalized || !command.trim()) continue;
		merged[normalized] = command.trim();
	}
	return merged;
}
function resolveAgentCommand(agentName, overrides) {
	const normalized = normalizeAgentName(agentName);
	const registry = mergeAgentRegistry(overrides);
	return registry[normalized] ?? registry[AGENT_ALIASES[normalized] ?? normalized] ?? agentName;
}
//#endregion
//#region extensions/acpx/src/acp-error-shapes.ts
const RESOURCE_NOT_FOUND_ACP_CODES = new Set([-32001, -32002]);
function asRecord$1(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return value;
}
function toAcpErrorPayload(value) {
	const record = asRecord$1(value);
	if (!record) return;
	if (typeof record.code !== "number" || !Number.isFinite(record.code)) return;
	if (typeof record.message !== "string" || record.message.length === 0) return;
	return {
		code: record.code,
		message: record.message,
		data: record.data
	};
}
function extractAcpErrorInternal(value, depth) {
	if (depth > 5) return;
	const direct = toAcpErrorPayload(value);
	if (direct) return direct;
	const record = asRecord$1(value);
	if (!record) return;
	if ("error" in record) {
		const nested = extractAcpErrorInternal(record.error, depth + 1);
		if (nested) return nested;
	}
	if ("acp" in record) {
		const nested = extractAcpErrorInternal(record.acp, depth + 1);
		if (nested) return nested;
	}
	if ("cause" in record) {
		const nested = extractAcpErrorInternal(record.cause, depth + 1);
		if (nested) return nested;
	}
}
function formatUnknownErrorMessage(error) {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object") {
		const maybeMessage = error.message;
		if (typeof maybeMessage === "string" && maybeMessage.length > 0) return maybeMessage;
		try {
			return JSON.stringify(error);
		} catch {}
	}
	return String(error);
}
const SESSION_NOT_FOUND_PATTERN = /session\s+["'\w-]+\s+not found/i;
function isSessionNotFoundText(value) {
	if (typeof value !== "string") return false;
	const normalized = value.toLowerCase();
	return normalized.includes("resource_not_found") || normalized.includes("resource not found") || normalized.includes("session not found") || normalized.includes("unknown session") || normalized.includes("invalid session identifier") || SESSION_NOT_FOUND_PATTERN.test(value);
}
function hasSessionNotFoundHint(value, depth = 0) {
	if (depth > 4) return false;
	if (isSessionNotFoundText(value)) return true;
	if (Array.isArray(value)) return value.some((entry) => hasSessionNotFoundHint(entry, depth + 1));
	const record = asRecord$1(value);
	if (!record) return false;
	return Object.values(record).some((entry) => hasSessionNotFoundHint(entry, depth + 1));
}
function extractAcpError(error) {
	return extractAcpErrorInternal(error, 0);
}
function isAcpResourceNotFoundError(error) {
	const acp = extractAcpError(error);
	if (acp && RESOURCE_NOT_FOUND_ACP_CODES.has(acp.code)) return true;
	if (acp) {
		if (isSessionNotFoundText(acp.message)) return true;
		if (hasSessionNotFoundHint(acp.data)) return true;
	}
	return isSessionNotFoundText(formatUnknownErrorMessage(error));
}
//#endregion
//#region extensions/acpx/src/acp-jsonrpc.ts
function isJsonRpcNotification(message) {
	return Object.hasOwn(message, "method") && typeof message.method === "string" && !Object.hasOwn(message, "id");
}
function isSessionUpdateNotification(message) {
	return isJsonRpcNotification(message) && message.method === "session/update";
}
//#endregion
//#region extensions/acpx/src/errors.ts
var AcpxOperationalError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = new.target.name;
		this.outputCode = options?.outputCode;
		this.detailCode = options?.detailCode;
		this.origin = options?.origin;
		this.retryable = options?.retryable;
		this.acp = options?.acp;
		this.outputAlreadyEmitted = options?.outputAlreadyEmitted;
	}
};
var AgentSpawnError = class extends AcpxOperationalError {
	constructor(agentCommand, cause) {
		super(`Failed to spawn agent command: ${agentCommand}`, { cause: cause instanceof Error ? cause : void 0 });
		this.agentCommand = agentCommand;
	}
};
var AgentDisconnectedError = class extends AcpxOperationalError {
	constructor(reason, exitCode, signal, options) {
		super(`ACP agent disconnected during request (${reason}, exit=${exitCode ?? "null"}, signal=${signal ?? "null"})`, {
			outputCode: "RUNTIME",
			detailCode: "AGENT_DISCONNECTED",
			origin: "acp",
			...options
		});
		this.reason = reason;
		this.exitCode = exitCode;
		this.signal = signal;
	}
};
var SessionResumeRequiredError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "RUNTIME",
			detailCode: "SESSION_RESUME_REQUIRED",
			origin: "acp",
			retryable: true,
			...options
		});
	}
};
var GeminiAcpStartupTimeoutError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "TIMEOUT",
			detailCode: "GEMINI_ACP_STARTUP_TIMEOUT",
			origin: "acp",
			...options
		});
	}
};
var SessionModeReplayError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "RUNTIME",
			detailCode: "SESSION_MODE_REPLAY_FAILED",
			origin: "acp",
			...options
		});
	}
};
var SessionModelReplayError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "RUNTIME",
			detailCode: "SESSION_MODEL_REPLAY_FAILED",
			origin: "acp",
			...options
		});
	}
};
var ClaudeAcpSessionCreateTimeoutError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "TIMEOUT",
			detailCode: "CLAUDE_ACP_SESSION_CREATE_TIMEOUT",
			origin: "acp",
			...options
		});
	}
};
var CopilotAcpUnsupportedError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "RUNTIME",
			detailCode: "COPILOT_ACP_UNSUPPORTED",
			origin: "acp",
			...options
		});
	}
};
var AuthPolicyError = class extends AcpxOperationalError {
	constructor(message, options) {
		super(message, {
			outputCode: "RUNTIME",
			detailCode: "AUTH_REQUIRED",
			origin: "acp",
			...options
		});
	}
};
var PermissionDeniedError = class extends AcpxOperationalError {};
var PermissionPromptUnavailableError = class extends AcpxOperationalError {
	constructor() {
		super("Permission prompt unavailable in non-interactive mode");
	}
};
//#endregion
//#region extensions/acpx/src/prompt-content.ts
function textPrompt(text) {
	return [{
		type: "text",
		text
	}];
}
//#endregion
//#region extensions/acpx/src/agent-session-id.ts
const AGENT_SESSION_ID_META_KEYS = ["agentSessionId", "sessionId"];
function normalizeAgentSessionId(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function asMetaRecord(meta) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return;
	return meta;
}
function extractAgentSessionId(meta) {
	const record = asMetaRecord(meta);
	if (!record) return;
	for (const key of AGENT_SESSION_ID_META_KEYS) {
		const normalized = normalizeAgentSessionId(record[key]);
		if (normalized) return normalized;
	}
}
//#endregion
//#region extensions/acpx/src/runtime-session-id.ts
function normalizeRuntimeSessionId(value) {
	return normalizeAgentSessionId(value);
}
function extractRuntimeSessionId(meta) {
	return extractAgentSessionId(meta);
}
//#endregion
//#region extensions/acpx/src/session-runtime-helpers.ts
var TimeoutError = class extends Error {
	constructor(timeoutMs) {
		super(`Timed out after ${timeoutMs}ms`);
		this.name = "TimeoutError";
	}
};
var InterruptedError = class extends Error {
	constructor() {
		super("Interrupted");
		this.name = "InterruptedError";
	}
};
async function withTimeout(promise, timeoutMs) {
	if (timeoutMs == null || timeoutMs <= 0) return await promise;
	let timer;
	const timeoutPromise = new Promise((_resolve, reject) => {
		timer = setTimeout(() => {
			reject(new TimeoutError(timeoutMs));
		}, timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
//#endregion
//#region extensions/acpx/src/transport/permission-prompt.ts
async function promptForPermission(options) {
	if (!process.stdin.isTTY || !process.stderr.isTTY) return false;
	if (options.header) process.stderr.write(`\n${options.header}\n`);
	if (options.details && options.details.trim().length > 0) process.stderr.write(`${options.details}\n`);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stderr
	});
	try {
		const normalized = (await rl.question(options.prompt)).trim().toLowerCase();
		return normalized === "y" || normalized === "yes";
	} finally {
		rl.close();
	}
}
//#endregion
//#region extensions/acpx/src/transport/filesystem.ts
const WRITE_PREVIEW_MAX_LINES = 16;
const WRITE_PREVIEW_MAX_CHARS = 1200;
function nowIso$1() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function isWithinRoot(rootDir, targetPath) {
	const relative = path.relative(rootDir, targetPath);
	return relative.length === 0 || !relative.startsWith("..") && !path.isAbsolute(relative);
}
function toWritePreview(content) {
	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const visibleLines = lines.slice(0, WRITE_PREVIEW_MAX_LINES);
	let preview = visibleLines.join("\n");
	if (lines.length > visibleLines.length) preview += `\n... (${lines.length - visibleLines.length} more lines)`;
	if (preview.length > WRITE_PREVIEW_MAX_CHARS) preview = `${preview.slice(0, WRITE_PREVIEW_MAX_CHARS - 3)}...`;
	return preview;
}
async function defaultConfirmWrite(filePath, preview) {
	return await promptForPermission({
		header: `[permission] Allow write to ${filePath}?`,
		details: preview,
		prompt: "Allow write? (y/N) "
	});
}
function canPromptForPermission$2() {
	return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}
var FileSystemHandlers = class {
	constructor(options) {
		this.rootDir = path.resolve(options.cwd);
		this.permissionMode = options.permissionMode;
		this.nonInteractivePermissions = options.nonInteractivePermissions ?? "deny";
		this.onOperation = options.onOperation;
		this.usesDefaultConfirmWrite = options.confirmWrite == null;
		this.confirmWrite = options.confirmWrite ?? defaultConfirmWrite;
	}
	updatePermissionPolicy(permissionMode, nonInteractivePermissions) {
		this.permissionMode = permissionMode;
		this.nonInteractivePermissions = nonInteractivePermissions ?? "deny";
	}
	async readTextFile(params) {
		const filePath = this.resolvePathWithinRoot(params.path);
		const summary = `read_text_file: ${filePath}`;
		this.emitOperation({
			method: "fs/read_text_file",
			status: "running",
			summary,
			details: this.readWindowDetails(params.line, params.limit),
			timestamp: nowIso$1()
		});
		try {
			if (this.permissionMode === "deny-all") throw new PermissionDeniedError("Permission denied for fs/read_text_file (--deny-all)");
			const content = await fs$1.readFile(filePath, "utf8");
			const sliced = this.sliceContent(content, params.line, params.limit);
			this.emitOperation({
				method: "fs/read_text_file",
				status: "completed",
				summary,
				details: this.readWindowDetails(params.line, params.limit),
				timestamp: nowIso$1()
			});
			return { content: sliced };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emitOperation({
				method: "fs/read_text_file",
				status: "failed",
				summary,
				details: message,
				timestamp: nowIso$1()
			});
			throw error;
		}
	}
	async writeTextFile(params) {
		const filePath = this.resolvePathWithinRoot(params.path);
		const preview = toWritePreview(params.content);
		const summary = `write_text_file: ${filePath}`;
		this.emitOperation({
			method: "fs/write_text_file",
			status: "running",
			summary,
			details: preview,
			timestamp: nowIso$1()
		});
		try {
			if (!await this.isWriteApproved(filePath, preview)) throw new PermissionDeniedError("Permission denied for fs/write_text_file");
			await fs$1.mkdir(path.dirname(filePath), { recursive: true });
			await fs$1.writeFile(filePath, params.content, "utf8");
			this.emitOperation({
				method: "fs/write_text_file",
				status: "completed",
				summary,
				details: preview,
				timestamp: nowIso$1()
			});
			return {};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emitOperation({
				method: "fs/write_text_file",
				status: "failed",
				summary,
				details: message,
				timestamp: nowIso$1()
			});
			throw error;
		}
	}
	async isWriteApproved(filePath, preview) {
		if (this.permissionMode === "approve-all") return true;
		if (this.permissionMode === "deny-all") return false;
		if (this.usesDefaultConfirmWrite && this.nonInteractivePermissions === "fail" && !canPromptForPermission$2()) throw new PermissionPromptUnavailableError();
		return await this.confirmWrite(filePath, preview);
	}
	resolvePathWithinRoot(rawPath) {
		if (!path.isAbsolute(rawPath)) throw new Error(`Path must be absolute: ${rawPath}`);
		const resolved = path.resolve(rawPath);
		if (!isWithinRoot(this.rootDir, resolved)) throw new Error(`Path is outside allowed cwd subtree: ${resolved}`);
		return resolved;
	}
	sliceContent(content, line, limit) {
		if (line == null && limit == null) return content;
		const lines = content.split("\n");
		const startIndex = Math.max(0, (line == null ? 1 : Math.max(1, Math.trunc(line))) - 1);
		const maxLines = limit == null ? void 0 : Math.max(0, Math.trunc(limit));
		if (maxLines === 0) return "";
		const endIndex = maxLines == null ? lines.length : Math.min(lines.length, startIndex + maxLines);
		return lines.slice(startIndex, endIndex).join("\n");
	}
	readWindowDetails(line, limit) {
		if (line == null && limit == null) return;
		return `line=${line == null ? 1 : Math.max(1, Math.trunc(line))}, limit=${limit == null ? "all" : Math.max(0, Math.trunc(limit))}`;
	}
	emitOperation(operation) {
		this.onOperation?.(operation);
	}
};
//#endregion
//#region extensions/acpx/src/transport/permissions.ts
function selected(optionId) {
	return { outcome: {
		outcome: "selected",
		optionId
	} };
}
function cancelled() {
	return { outcome: { outcome: "cancelled" } };
}
function pickOption(options, kinds) {
	for (const kind of kinds) {
		const match = options.find((option) => option.kind === kind);
		if (match) return match;
	}
}
function inferToolKind(params) {
	if (params.toolCall.kind) return params.toolCall.kind;
	const title = params.toolCall.title?.trim().toLowerCase();
	if (!title) return;
	const head = title.split(":", 1)[0]?.trim();
	if (!head) return;
	if (head.includes("read") || head.includes("cat")) return "read";
	if (head.includes("search") || head.includes("find") || head.includes("grep")) return "search";
	if (head.includes("write") || head.includes("edit") || head.includes("patch")) return "edit";
	if (head.includes("delete") || head.includes("remove")) return "delete";
	if (head.includes("move") || head.includes("rename")) return "move";
	if (head.includes("run") || head.includes("execute") || head.includes("bash")) return "execute";
	if (head.includes("fetch") || head.includes("http") || head.includes("url")) return "fetch";
	if (head.includes("think")) return "think";
	return "other";
}
function isAutoApprovedReadKind(kind) {
	return kind === "read" || kind === "search";
}
async function promptForToolPermission(params) {
	return await promptForPermission({ prompt: `\n[permission] Allow ${params.toolCall.title ?? "tool"} [${inferToolKind(params) ?? "other"}]? (y/N) ` });
}
function canPromptForPermission$1() {
	return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}
async function resolvePermissionRequest(params, mode, nonInteractivePolicy = "deny") {
	const options = params.options ?? [];
	if (options.length === 0) return cancelled();
	const allowOption = pickOption(options, ["allow_once", "allow_always"]);
	const rejectOption = pickOption(options, ["reject_once", "reject_always"]);
	if (mode === "approve-all") {
		if (allowOption) return selected(allowOption.optionId);
		return selected(options[0].optionId);
	}
	if (mode === "deny-all") {
		if (rejectOption) return selected(rejectOption.optionId);
		return cancelled();
	}
	if (isAutoApprovedReadKind(inferToolKind(params)) && allowOption) return selected(allowOption.optionId);
	if (!canPromptForPermission$1()) {
		if (nonInteractivePolicy === "fail") throw new PermissionPromptUnavailableError();
		if (rejectOption) return selected(rejectOption.optionId);
		return cancelled();
	}
	const approved = await promptForToolPermission(params);
	if (approved && allowOption) return selected(allowOption.optionId);
	if (!approved && rejectOption) return selected(rejectOption.optionId);
	return cancelled();
}
function classifyPermissionDecision(params, response) {
	if (response.outcome.outcome !== "selected") return "cancelled";
	const selectedOptionId = response.outcome.optionId;
	const selectedOption = params.options.find((option) => option.optionId === selectedOptionId);
	if (!selectedOption) return "cancelled";
	if (selectedOption.kind === "allow_once" || selectedOption.kind === "allow_always") return "approved";
	return "denied";
}
//#endregion
//#region extensions/acpx/src/transport/spawn.ts
function readWindowsEnvValue(env, key) {
	const matchedKey = Object.keys(env).find((entry) => entry.toUpperCase() === key);
	return matchedKey ? env[matchedKey] : void 0;
}
function resolveWindowsCommand(command, env = process.env) {
	const extensions = (readWindowsEnvValue(env, "PATHEXT") ?? ".COM;.EXE;.BAT;.CMD").split(";").map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0);
	const candidates = path.extname(command).length > 0 ? [command] : extensions.map((extension) => `${command}${extension}`);
	if (command.includes("/") || command.includes("\\") || path.isAbsolute(command)) return candidates.find((candidate) => fs.existsSync(candidate));
	const pathValue = readWindowsEnvValue(env, "PATH");
	if (!pathValue) return;
	for (const directory of pathValue.split(";")) {
		const trimmedDirectory = directory.trim();
		if (trimmedDirectory.length === 0) continue;
		for (const candidate of candidates) {
			const resolved = path.join(trimmedDirectory, candidate);
			if (fs.existsSync(resolved)) return resolved;
		}
	}
}
function shouldUseWindowsBatchShell(command, platform = process.platform, env = process.env) {
	if (platform !== "win32") return false;
	const resolvedCommand = resolveWindowsCommand(command, env) ?? command;
	const ext = path.extname(resolvedCommand).toLowerCase();
	return ext === ".cmd" || ext === ".bat";
}
function buildSpawnCommandOptions(command, options, platform = process.platform, env = process.env) {
	if (!shouldUseWindowsBatchShell(command, platform, env)) return options;
	return {
		...options,
		shell: true
	};
}
//#endregion
//#region extensions/acpx/src/transport/terminal.ts
const DEFAULT_TERMINAL_OUTPUT_LIMIT_BYTES = 64 * 1024;
const DEFAULT_KILL_GRACE_MS = 1500;
function nowIso() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function toCommandLine(command, args) {
	const renderedArgs = (args ?? []).map((arg) => JSON.stringify(arg)).join(" ");
	return renderedArgs.length > 0 ? `${command} ${renderedArgs}` : command;
}
function toEnvObject(env) {
	if (!env || env.length === 0) return;
	const merged = { ...process.env };
	for (const entry of env) merged[entry.name] = entry.value;
	return merged;
}
function buildTerminalSpawnOptions(command, cwd, env, platform = process.platform) {
	const resolvedEnv = toEnvObject(env);
	return buildSpawnCommandOptions(command, {
		cwd,
		env: resolvedEnv,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		],
		windowsHide: true
	}, platform, resolvedEnv ?? process.env);
}
function trimToUtf8Boundary(buffer, limit) {
	if (limit <= 0) return Buffer.alloc(0);
	if (buffer.length <= limit) return buffer;
	let start = buffer.length - limit;
	while (start < buffer.length && (buffer[start] & 192) === 128) start += 1;
	if (start >= buffer.length) start = buffer.length - limit;
	return buffer.subarray(start);
}
function waitForSpawn$1(process) {
	return new Promise((resolve, reject) => {
		const onSpawn = () => {
			process.off("error", onError);
			resolve();
		};
		const onError = (error) => {
			process.off("spawn", onSpawn);
			reject(error);
		};
		process.once("spawn", onSpawn);
		process.once("error", onError);
	});
}
async function defaultConfirmExecute(commandLine) {
	return await promptForPermission({ prompt: `\n[permission] Allow terminal command "${commandLine}"? (y/N) ` });
}
function canPromptForPermission() {
	return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}
function waitMs(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, Math.max(0, ms));
	});
}
var TerminalManager = class {
	constructor(options) {
		this.terminals = /* @__PURE__ */ new Map();
		this.cwd = options.cwd;
		this.permissionMode = options.permissionMode;
		this.nonInteractivePermissions = options.nonInteractivePermissions ?? "deny";
		this.onOperation = options.onOperation;
		this.usesDefaultConfirmExecute = options.confirmExecute == null;
		this.confirmExecute = options.confirmExecute ?? defaultConfirmExecute;
		this.killGraceMs = Math.max(0, Math.round(options.killGraceMs ?? DEFAULT_KILL_GRACE_MS));
	}
	updatePermissionPolicy(permissionMode, nonInteractivePermissions) {
		this.permissionMode = permissionMode;
		this.nonInteractivePermissions = nonInteractivePermissions ?? "deny";
	}
	async createTerminal(params) {
		const commandLine = toCommandLine(params.command, params.args);
		const summary = `terminal/create: ${commandLine}`;
		this.emitOperation({
			method: "terminal/create",
			status: "running",
			summary,
			timestamp: nowIso()
		});
		try {
			if (!await this.isExecuteApproved(commandLine)) throw new PermissionDeniedError("Permission denied for terminal/create");
			const outputByteLimit = Math.max(0, Math.round(params.outputByteLimit ?? DEFAULT_TERMINAL_OUTPUT_LIMIT_BYTES));
			const proc = spawn(params.command, params.args ?? [], buildTerminalSpawnOptions(params.command, params.cwd ?? this.cwd, params.env));
			await waitForSpawn$1(proc);
			let resolveExit = () => {};
			const exitPromise = new Promise((resolve) => {
				resolveExit = resolve;
			});
			const terminal = {
				process: proc,
				output: Buffer.alloc(0),
				truncated: false,
				outputByteLimit,
				exitCode: void 0,
				signal: void 0,
				exitPromise,
				resolveExit
			};
			const appendOutput = (chunk) => {
				const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
				if (bytes.length === 0) return;
				terminal.output = Buffer.concat([terminal.output, bytes]);
				if (terminal.output.length > terminal.outputByteLimit) {
					terminal.output = trimToUtf8Boundary(terminal.output, terminal.outputByteLimit);
					terminal.truncated = true;
				}
			};
			proc.stdout.on("data", appendOutput);
			proc.stderr.on("data", appendOutput);
			proc.once("exit", (exitCode, signal) => {
				terminal.exitCode = exitCode;
				terminal.signal = signal;
				terminal.resolveExit({
					exitCode: exitCode ?? null,
					signal: signal ?? null
				});
			});
			const terminalId = randomUUID();
			this.terminals.set(terminalId, terminal);
			this.emitOperation({
				method: "terminal/create",
				status: "completed",
				summary,
				details: `terminalId=${terminalId}`,
				timestamp: nowIso()
			});
			return { terminalId };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emitOperation({
				method: "terminal/create",
				status: "failed",
				summary,
				details: message,
				timestamp: nowIso()
			});
			throw error;
		}
	}
	async terminalOutput(params) {
		const terminal = this.getTerminal(params.terminalId);
		if (!terminal) throw new Error(`Unknown terminal: ${params.terminalId}`);
		const hasExitStatus = terminal.exitCode !== void 0 || terminal.signal !== void 0;
		this.emitOperation({
			method: "terminal/output",
			status: "completed",
			summary: `terminal/output: ${params.terminalId}`,
			timestamp: nowIso()
		});
		return {
			output: terminal.output.toString("utf8"),
			truncated: terminal.truncated,
			exitStatus: hasExitStatus ? {
				exitCode: terminal.exitCode ?? null,
				signal: terminal.signal ?? null
			} : void 0
		};
	}
	async waitForTerminalExit(params) {
		const terminal = this.getTerminal(params.terminalId);
		if (!terminal) throw new Error(`Unknown terminal: ${params.terminalId}`);
		const response = await terminal.exitPromise;
		this.emitOperation({
			method: "terminal/wait_for_exit",
			status: "completed",
			summary: `terminal/wait_for_exit: ${params.terminalId}`,
			details: `exitCode=${response.exitCode ?? "null"}, signal=${response.signal ?? "null"}`,
			timestamp: nowIso()
		});
		return response;
	}
	async killTerminal(params) {
		const terminal = this.getTerminal(params.terminalId);
		if (!terminal) throw new Error(`Unknown terminal: ${params.terminalId}`);
		const summary = `terminal/kill: ${params.terminalId}`;
		this.emitOperation({
			method: "terminal/kill",
			status: "running",
			summary,
			timestamp: nowIso()
		});
		try {
			await this.killProcess(terminal);
			this.emitOperation({
				method: "terminal/kill",
				status: "completed",
				summary,
				timestamp: nowIso()
			});
			return {};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emitOperation({
				method: "terminal/kill",
				status: "failed",
				summary,
				details: message,
				timestamp: nowIso()
			});
			throw error;
		}
	}
	async releaseTerminal(params) {
		const summary = `terminal/release: ${params.terminalId}`;
		this.emitOperation({
			method: "terminal/release",
			status: "running",
			summary,
			timestamp: nowIso()
		});
		const terminal = this.getTerminal(params.terminalId);
		if (!terminal) {
			this.emitOperation({
				method: "terminal/release",
				status: "completed",
				summary,
				details: "already released",
				timestamp: nowIso()
			});
			return {};
		}
		try {
			await this.killProcess(terminal);
			await terminal.exitPromise.catch(() => {});
			terminal.output = Buffer.alloc(0);
			this.terminals.delete(params.terminalId);
			this.emitOperation({
				method: "terminal/release",
				status: "completed",
				summary,
				timestamp: nowIso()
			});
			return {};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emitOperation({
				method: "terminal/release",
				status: "failed",
				summary,
				details: message,
				timestamp: nowIso()
			});
			throw error;
		}
	}
	async shutdown() {
		for (const terminalId of Array.from(this.terminals.keys())) await this.releaseTerminal({
			terminalId,
			sessionId: "shutdown"
		});
	}
	getTerminal(terminalId) {
		return this.terminals.get(terminalId);
	}
	emitOperation(operation) {
		this.onOperation?.(operation);
	}
	async isExecuteApproved(commandLine) {
		if (this.permissionMode === "approve-all") return true;
		if (this.permissionMode === "deny-all") return false;
		if (this.usesDefaultConfirmExecute && this.nonInteractivePermissions === "fail" && !canPromptForPermission()) throw new PermissionPromptUnavailableError();
		return await this.confirmExecute(commandLine);
	}
	isRunning(terminal) {
		return terminal.exitCode === void 0 && terminal.signal === void 0;
	}
	async killProcess(terminal) {
		if (!this.isRunning(terminal)) return;
		try {
			terminal.process.kill("SIGTERM");
		} catch {
			return;
		}
		if (await Promise.race([terminal.exitPromise.then(() => true), waitMs(this.killGraceMs).then(() => false)]) || !this.isRunning(terminal)) return;
		try {
			terminal.process.kill("SIGKILL");
		} catch {
			return;
		}
		await Promise.race([terminal.exitPromise.then(() => void 0), waitMs(this.killGraceMs)]);
	}
};
//#endregion
//#region extensions/acpx/src/transport/acp-client.ts
const REPLAY_IDLE_MS = 80;
const REPLAY_DRAIN_TIMEOUT_MS = 5e3;
const DRAIN_POLL_INTERVAL_MS = 20;
const DEFAULT_AGENT_CLOSE_AFTER_STDIN_END_MS = 100;
const QODER_AGENT_CLOSE_AFTER_STDIN_END_MS = 750;
const AGENT_CLOSE_TERM_GRACE_MS = 1500;
const AGENT_CLOSE_KILL_GRACE_MS = 1e3;
const GEMINI_ACP_STARTUP_TIMEOUT_MS = 15e3;
const CLAUDE_ACP_SESSION_CREATE_TIMEOUT_MS = 6e4;
const GEMINI_VERSION_TIMEOUT_MS = 2e3;
const GEMINI_ACP_FLAG_VERSION = [
	0,
	33,
	0
];
const COPILOT_HELP_TIMEOUT_MS = 2e3;
const SESSION_CONTROL_UNSUPPORTED_ACP_CODES = new Set([-32601, -32602]);
const QODER_BENIGN_STDOUT_LINES = new Set(["Received interrupt signal. Cleaning up resources...", "Cleanup completed. Exiting..."]);
function shouldSuppressSdkConsoleError(args) {
	if (args.length === 0) return false;
	return typeof args[0] === "string" && args[0] === "Error handling request";
}
function installSdkConsoleErrorSuppression() {
	const originalConsoleError = console.error;
	console.error = (...args) => {
		if (shouldSuppressSdkConsoleError(args)) return;
		originalConsoleError(...args);
	};
	return () => {
		console.error = originalConsoleError;
	};
}
function isoNow() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function waitForSpawn(child) {
	return new Promise((resolve, reject) => {
		const onSpawn = () => {
			child.off("error", onError);
			resolve();
		};
		const onError = (error) => {
			child.off("spawn", onSpawn);
			reject(error);
		};
		child.once("spawn", onSpawn);
		child.once("error", onError);
	});
}
function isChildProcessRunning(child) {
	return child.exitCode == null && child.signalCode == null;
}
function requireAgentStdio(child) {
	if (!child.stdin || !child.stdout || !child.stderr) throw new Error("ACP agent must be spawned with piped stdin/stdout/stderr");
	return child;
}
function waitForChildExit(child, timeoutMs) {
	if (!isChildProcessRunning(child)) return Promise.resolve(true);
	return new Promise((resolve) => {
		let settled = false;
		const timer = setTimeout(() => {
			finish(false);
		}, Math.max(0, timeoutMs));
		const finish = (value) => {
			if (settled) return;
			settled = true;
			child.off("close", onExitLike);
			child.off("exit", onExitLike);
			clearTimeout(timer);
			resolve(value);
		};
		const onExitLike = () => {
			finish(true);
		};
		child.once("close", onExitLike);
		child.once("exit", onExitLike);
	});
}
function splitCommandLine(value) {
	const parts = [];
	let current = "";
	let quote = null;
	let escaping = false;
	for (const ch of value) {
		if (escaping) {
			current += ch;
			escaping = false;
			continue;
		}
		if (ch === "\\" && quote !== "'") {
			escaping = true;
			continue;
		}
		if (quote) {
			if (ch === quote) quote = null;
			else current += ch;
			continue;
		}
		if (ch === "'" || ch === "\"") {
			quote = ch;
			continue;
		}
		if (/\s/.test(ch)) {
			if (current.length > 0) {
				parts.push(current);
				current = "";
			}
			continue;
		}
		current += ch;
	}
	if (escaping) current += "\\";
	if (quote) throw new Error("Invalid --agent command: unterminated quote");
	if (current.length > 0) parts.push(current);
	if (parts.length === 0) throw new Error("Invalid --agent command: empty command");
	return {
		command: parts[0],
		args: parts.slice(1)
	};
}
function asAbsoluteCwd(cwd) {
	return path.resolve(cwd);
}
function basenameToken(value) {
	return path.basename(value).toLowerCase().replace(/\.(cmd|exe|bat)$/u, "");
}
function resolveAgentCloseAfterStdinEndMs(agentCommand) {
	const { command } = splitCommandLine(agentCommand);
	return basenameToken(command) === "qodercli" ? QODER_AGENT_CLOSE_AFTER_STDIN_END_MS : DEFAULT_AGENT_CLOSE_AFTER_STDIN_END_MS;
}
function shouldIgnoreNonJsonAgentOutputLine(agentCommand, trimmedLine) {
	const { command } = splitCommandLine(agentCommand);
	return basenameToken(command) === "qodercli" && QODER_BENIGN_STDOUT_LINES.has(trimmedLine);
}
function createNdJsonMessageStream(agentCommand, output, input) {
	const textEncoder = new TextEncoder();
	const textDecoder = new TextDecoder();
	return {
		readable: new ReadableStream({ async start(controller) {
			let content = "";
			const reader = input.getReader();
			try {
				while (true) {
					const { value, done } = await reader.read();
					if (done) break;
					if (!value) continue;
					content += textDecoder.decode(value, { stream: true });
					const lines = content.split("\n");
					content = lines.pop() || "";
					for (const line of lines) {
						const trimmedLine = line.trim();
						if (!trimmedLine || shouldIgnoreNonJsonAgentOutputLine(agentCommand, trimmedLine)) continue;
						try {
							const message = JSON.parse(trimmedLine);
							controller.enqueue(message);
						} catch (err) {
							console.error("Failed to parse JSON message:", trimmedLine, err);
						}
					}
				}
			} finally {
				reader.releaseLock();
				controller.close();
			}
		} }),
		writable: new WritableStream({ async write(message) {
			const content = JSON.stringify(message) + "\n";
			const writer = output.getWriter();
			try {
				await writer.write(textEncoder.encode(content));
			} finally {
				writer.releaseLock();
			}
		} })
	};
}
function isGeminiAcpCommand(command, args) {
	return basenameToken(command) === "gemini" && (args.includes("--acp") || args.includes("--experimental-acp"));
}
function isClaudeAcpCommand(command, args) {
	if (basenameToken(command) === "claude-agent-acp") return true;
	return args.some((arg) => arg.includes("claude-agent-acp"));
}
function isCopilotAcpCommand(command, args) {
	return basenameToken(command) === "copilot" && args.includes("--acp");
}
function isQoderAcpCommand(command, args) {
	return basenameToken(command) === "qodercli" && args.includes("--acp");
}
function hasCommandFlag(args, flagName) {
	return args.some((arg) => arg === flagName || arg.startsWith(`${flagName}=`));
}
function normalizeQoderAllowedToolName(tool) {
	switch (tool.trim().toLowerCase()) {
		case "bash":
		case "glob":
		case "grep":
		case "ls":
		case "read":
		case "write": return tool.trim().toUpperCase();
		default: return tool.trim();
	}
}
function buildQoderAcpCommandArgs(initialArgs, options) {
	const args = [...initialArgs];
	const sessionOptions = options.sessionOptions;
	if (typeof sessionOptions?.maxTurns === "number" && !hasCommandFlag(args, "--max-turns")) args.push(`--max-turns=${sessionOptions.maxTurns}`);
	if (Array.isArray(sessionOptions?.allowedTools) && !hasCommandFlag(args, "--allowed-tools") && !hasCommandFlag(args, "--disallowed-tools")) {
		const encodedTools = sessionOptions.allowedTools.map(normalizeQoderAllowedToolName).join(",");
		args.push(`--allowed-tools=${encodedTools}`);
	}
	return args;
}
function resolveGeminiAcpStartupTimeoutMs() {
	const raw = process.env.ACPX_GEMINI_ACP_STARTUP_TIMEOUT_MS;
	if (typeof raw === "string" && raw.trim().length > 0) {
		const parsed = Number(raw);
		if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
	}
	return GEMINI_ACP_STARTUP_TIMEOUT_MS;
}
function resolveClaudeAcpSessionCreateTimeoutMs() {
	const raw = process.env.ACPX_CLAUDE_ACP_SESSION_CREATE_TIMEOUT_MS;
	if (typeof raw === "string" && raw.trim().length > 0) {
		const parsed = Number(raw);
		if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
	}
	return CLAUDE_ACP_SESSION_CREATE_TIMEOUT_MS;
}
function parseGeminiVersion(value) {
	if (typeof value !== "string") return;
	const normalized = value.trim();
	const match = normalized.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) return;
	return {
		raw: normalized,
		parts: [
			Number(match[1]),
			Number(match[2]),
			Number(match[3])
		]
	};
}
function compareVersionParts(left, right) {
	for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
		const leftPart = left[index] ?? 0;
		const rightPart = right[index] ?? 0;
		if (leftPart !== rightPart) return leftPart - rightPart;
	}
	return 0;
}
async function detectGeminiVersion(command) {
	return await new Promise((resolve) => {
		const child = spawn(command, ["--version"], buildSpawnCommandOptions(command, {
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			windowsHide: true
		}));
		let stdout = "";
		let stderr = "";
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			child.removeAllListeners();
			child.stdout?.removeAllListeners();
			child.stderr?.removeAllListeners();
			resolve(value);
		};
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			finish(void 0);
		}, GEMINI_VERSION_TIMEOUT_MS);
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr?.on("data", (chunk) => {
			stderr += chunk;
		});
		child.once("error", () => {
			finish(void 0);
		});
		child.once("close", () => {
			finish(parseGeminiVersion(`${stdout}\n${stderr}`.split(/\r?\n/).map((line) => line.trim()).find((line) => /\d+\.\d+\.\d+/.test(line))));
		});
	});
}
async function resolveGeminiCommandArgs(command, args) {
	if (basenameToken(command) !== "gemini" || !args.includes("--acp")) return [...args];
	const version = await detectGeminiVersion(command);
	if (version && compareVersionParts(version.parts, GEMINI_ACP_FLAG_VERSION) < 0) return args.map((arg) => arg === "--acp" ? "--experimental-acp" : arg);
	return [...args];
}
async function readCommandOutput(command, args, timeoutMs) {
	return await new Promise((resolve) => {
		const child = spawn(command, [...args], buildSpawnCommandOptions(command, {
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			windowsHide: true
		}));
		let stdout = "";
		let stderr = "";
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			child.removeAllListeners();
			child.stdout?.removeAllListeners();
			child.stderr?.removeAllListeners();
			resolve(value);
		};
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			finish(void 0);
		}, timeoutMs);
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr?.on("data", (chunk) => {
			stderr += chunk;
		});
		child.once("error", () => {
			finish(void 0);
		});
		child.once("close", () => {
			finish(`${stdout}\n${stderr}`);
		});
	});
}
async function buildGeminiAcpStartupTimeoutMessage(command) {
	const parts = ["Gemini CLI ACP startup timed out before initialize completed.", "This usually means the local Gemini CLI is waiting on interactive OAuth or has incompatible ACP subprocess behavior."];
	const version = await detectGeminiVersion(command);
	if (version) parts.push(`Detected Gemini CLI version: ${version.raw}.`);
	if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) parts.push("No GEMINI_API_KEY or GOOGLE_API_KEY was set for non-interactive auth.");
	parts.push("Try upgrading Gemini CLI and using API-key-based auth for non-interactive ACP runs.");
	return parts.join(" ");
}
function buildClaudeAcpSessionCreateTimeoutMessage() {
	return [
		"Claude ACP session creation timed out before session/new completed.",
		"This matches the known persistent-session stall seen with some Claude Code and @agentclientprotocol/claude-agent-acp combinations.",
		"In harnessed or non-interactive runs, prefer --approve-all with nonInteractivePermissions=deny, upgrade Claude Code and the Claude ACP adapter, or use acpx claude exec as a one-shot fallback."
	].join(" ");
}
async function buildCopilotAcpUnsupportedMessage(command) {
	const parts = ["GitHub Copilot CLI ACP stdio mode is not available in the installed copilot binary.", "acpx copilot expects a Copilot CLI release that supports --acp --stdio."];
	const helpOutput = await readCommandOutput(command, ["--help"], COPILOT_HELP_TIMEOUT_MS);
	if (typeof helpOutput === "string" && !helpOutput.includes("--acp")) parts.push("Detected copilot --help output without --acp support.");
	parts.push("Upgrade GitHub Copilot CLI to a release with ACP stdio support, or use --agent with another ACP-compatible adapter in the meantime.");
	return parts.join(" ");
}
async function ensureCopilotAcpSupport(command) {
	const helpOutput = await readCommandOutput(command, ["--help"], COPILOT_HELP_TIMEOUT_MS);
	if (typeof helpOutput === "string" && !helpOutput.includes("--acp")) throw new CopilotAcpUnsupportedError(await buildCopilotAcpUnsupportedMessage(command), { retryable: false });
}
function toEnvToken(value) {
	return value.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}
function buildAuthEnvKeys(methodId) {
	const token = toEnvToken(methodId);
	const keys = new Set([methodId]);
	if (token) {
		keys.add(token);
		keys.add(`ACPX_AUTH_${token}`);
	}
	return [...keys];
}
const authEnvKeysCache = /* @__PURE__ */ new Map();
function authEnvKeys(methodId) {
	const cached = authEnvKeysCache.get(methodId);
	if (cached) return cached;
	const keys = buildAuthEnvKeys(methodId);
	authEnvKeysCache.set(methodId, keys);
	return keys;
}
function readEnvCredential(methodId) {
	for (const key of authEnvKeys(methodId)) {
		const value = process.env[key];
		if (typeof value === "string" && value.trim().length > 0) return value;
	}
}
function buildClaudeCodeOptionsMeta(options) {
	if (!options) return;
	const claudeCodeOptions = {};
	if (typeof options.model === "string" && options.model.trim().length > 0) claudeCodeOptions.model = options.model;
	if (Array.isArray(options.allowedTools)) claudeCodeOptions.allowedTools = [...options.allowedTools];
	if (typeof options.maxTurns === "number") claudeCodeOptions.maxTurns = options.maxTurns;
	if (Object.keys(claudeCodeOptions).length === 0) return;
	return { claudeCode: { options: claudeCodeOptions } };
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return value;
}
function isLikelySessionControlUnsupportedError(acp) {
	if (SESSION_CONTROL_UNSUPPORTED_ACP_CODES.has(acp.code)) return true;
	if (acp.code !== -32603) return false;
	const details = asRecord(acp.data)?.details;
	return typeof details === "string" && details.toLowerCase().includes("invalid params");
}
function formatSessionControlAcpSummary(acp) {
	const details = asRecord(acp.data)?.details;
	if (typeof details === "string" && details.trim().length > 0) return `${details.trim()} (ACP ${acp.code}, adapter reported "${acp.message}")`;
	return `${acp.message} (ACP ${acp.code})`;
}
function maybeWrapSessionControlError(method, error, context) {
	const acp = extractAcpError(error);
	if (!acp || !isLikelySessionControlUnsupportedError(acp)) return error;
	const acpSummary = formatSessionControlAcpSummary(acp);
	const message = `Agent rejected ${method}${context ? ` ${context}` : ""}: ${acpSummary}. The adapter may not implement ${method}, or the requested value is not supported.`;
	const wrapped = new Error(message, { cause: error instanceof Error ? error : void 0 });
	wrapped.acp = acp;
	return wrapped;
}
function buildAgentEnvironment(authCredentials) {
	const env = { ...process.env };
	if (!authCredentials) return env;
	for (const [methodId, credential] of Object.entries(authCredentials)) {
		if (typeof credential !== "string" || credential.trim().length === 0) continue;
		if (!methodId.includes("=") && !methodId.includes("\0") && env[methodId] == null) env[methodId] = credential;
		const normalized = toEnvToken(methodId);
		if (normalized) {
			const prefixed = `ACPX_AUTH_${normalized}`;
			if (env[prefixed] == null) env[prefixed] = credential;
			if (env[normalized] == null) env[normalized] = credential;
		}
	}
	return env;
}
function buildAgentSpawnOptions(cwd, authCredentials) {
	return {
		cwd,
		env: buildAgentEnvironment(authCredentials),
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		windowsHide: true
	};
}
var AcpClient = class {
	constructor(options) {
		this.permissionStats = {
			requested: 0,
			approved: 0,
			denied: 0,
			cancelled: 0
		};
		this.sessionUpdateChain = Promise.resolve();
		this.observedSessionUpdates = 0;
		this.processedSessionUpdates = 0;
		this.suppressSessionUpdates = false;
		this.suppressReplaySessionUpdateMessages = false;
		this.cancellingSessionIds = /* @__PURE__ */ new Set();
		this.closing = false;
		this.promptPermissionFailures = /* @__PURE__ */ new Map();
		this.pendingConnectionRequests = /* @__PURE__ */ new Set();
		this.options = {
			...options,
			cwd: asAbsoluteCwd(options.cwd),
			authPolicy: options.authPolicy ?? "skip"
		};
		this.eventHandlers = {
			onAcpMessage: this.options.onAcpMessage,
			onAcpOutputMessage: this.options.onAcpOutputMessage,
			onSessionUpdate: this.options.onSessionUpdate,
			onClientOperation: this.options.onClientOperation
		};
		this.filesystem = new FileSystemHandlers({
			cwd: this.options.cwd,
			permissionMode: this.options.permissionMode,
			nonInteractivePermissions: this.options.nonInteractivePermissions,
			onOperation: (operation) => {
				this.eventHandlers.onClientOperation?.(operation);
			}
		});
		this.terminalManager = new TerminalManager({
			cwd: this.options.cwd,
			permissionMode: this.options.permissionMode,
			nonInteractivePermissions: this.options.nonInteractivePermissions,
			onOperation: (operation) => {
				this.eventHandlers.onClientOperation?.(operation);
			}
		});
	}
	get initializeResult() {
		return this.initResult;
	}
	getAgentPid() {
		return this.agent?.pid ?? this.lastKnownPid;
	}
	getPermissionStats() {
		return { ...this.permissionStats };
	}
	getAgentLifecycleSnapshot() {
		const pid = this.agent?.pid ?? this.lastKnownPid;
		const running = Boolean(this.agent) && this.agent?.exitCode == null && this.agent?.signalCode == null && !this.agent?.killed;
		return {
			pid,
			startedAt: this.agentStartedAt,
			running,
			lastExit: this.lastAgentExit ? { ...this.lastAgentExit } : void 0
		};
	}
	supportsLoadSession() {
		return Boolean(this.initResult?.agentCapabilities?.loadSession);
	}
	setEventHandlers(handlers) {
		this.eventHandlers = { ...handlers };
	}
	clearEventHandlers() {
		this.eventHandlers = {};
	}
	updateRuntimeOptions(options) {
		if (options.permissionMode) this.options.permissionMode = options.permissionMode;
		if (options.nonInteractivePermissions !== void 0) this.options.nonInteractivePermissions = options.nonInteractivePermissions;
		if (options.permissionMode || options.nonInteractivePermissions !== void 0) {
			this.filesystem.updatePermissionPolicy(this.options.permissionMode, this.options.nonInteractivePermissions);
			this.terminalManager.updatePermissionPolicy(this.options.permissionMode, this.options.nonInteractivePermissions);
		}
		if (options.suppressSdkConsoleErrors !== void 0) this.options.suppressSdkConsoleErrors = options.suppressSdkConsoleErrors;
		if (options.verbose !== void 0) this.options.verbose = options.verbose;
	}
	hasReusableSession(sessionId) {
		return this.connection != null && this.agent != null && isChildProcessRunning(this.agent) && this.loadedSessionId === sessionId;
	}
	hasActivePrompt(sessionId) {
		if (!this.activePrompt) return false;
		if (sessionId == null) return true;
		return this.activePrompt.sessionId === sessionId;
	}
	async start() {
		if (this.connection && this.agent && isChildProcessRunning(this.agent)) return;
		if (this.connection || this.agent) await this.close();
		const { command, args: initialArgs } = splitCommandLine(this.options.agentCommand);
		let args = await resolveGeminiCommandArgs(command, initialArgs);
		if (isQoderAcpCommand(command, args)) args = buildQoderAcpCommandArgs(args, this.options);
		this.log(`spawning agent: ${command} ${args.join(" ")}`);
		const geminiAcp = isGeminiAcpCommand(command, args);
		if (isCopilotAcpCommand(command, args)) await ensureCopilotAcpSupport(command);
		const spawnedChild = spawn(command, args, buildSpawnCommandOptions(command, buildAgentSpawnOptions(this.options.cwd, this.options.authCredentials)));
		try {
			await waitForSpawn(spawnedChild);
		} catch (error) {
			throw new AgentSpawnError(this.options.agentCommand, error);
		}
		const child = requireAgentStdio(spawnedChild);
		this.closing = false;
		this.agentStartedAt = isoNow();
		this.lastAgentExit = void 0;
		this.lastKnownPid = child.pid ?? void 0;
		this.attachAgentLifecycleObservers(child);
		child.stderr.on("data", (chunk) => {
			if (!this.options.verbose) return;
			process.stderr.write(chunk);
		});
		const input = Writable.toWeb(child.stdin);
		const output = Readable.toWeb(child.stdout);
		const connection = new ClientSideConnection(() => ({
			sessionUpdate: async (params) => {
				await this.handleSessionUpdate(params);
			},
			requestPermission: async (params) => {
				return this.handlePermissionRequest(params);
			},
			readTextFile: async (params) => {
				return this.handleReadTextFile(params);
			},
			writeTextFile: async (params) => {
				return this.handleWriteTextFile(params);
			},
			createTerminal: async (params) => {
				return this.handleCreateTerminal(params);
			},
			terminalOutput: async (params) => {
				return this.handleTerminalOutput(params);
			},
			waitForTerminalExit: async (params) => {
				return this.handleWaitForTerminalExit(params);
			},
			killTerminal: async (params) => {
				return this.handleKillTerminal(params);
			},
			releaseTerminal: async (params) => {
				return this.handleReleaseTerminal(params);
			}
		}), this.createTappedStream(createNdJsonMessageStream(this.options.agentCommand, input, output)));
		connection.signal.addEventListener("abort", () => {
			this.recordAgentExit("connection_close", child.exitCode ?? null, child.signalCode ?? null);
		}, { once: true });
		try {
			const initializePromise = connection.initialize({
				protocolVersion: PROTOCOL_VERSION,
				clientCapabilities: {
					fs: {
						readTextFile: true,
						writeTextFile: true
					},
					terminal: true
				},
				clientInfo: {
					name: "acpx",
					version: "0.1.0"
				}
			});
			const initResult = geminiAcp ? await withTimeout(initializePromise, resolveGeminiAcpStartupTimeoutMs()) : await initializePromise;
			await this.authenticateIfRequired(connection, initResult.authMethods ?? []);
			this.connection = connection;
			this.agent = child;
			this.initResult = initResult;
			this.log(`initialized protocol version ${initResult.protocolVersion}`);
		} catch (error) {
			child.kill();
			if (geminiAcp && error instanceof TimeoutError) throw new GeminiAcpStartupTimeoutError(await buildGeminiAcpStartupTimeoutMessage(command), {
				cause: error,
				retryable: true
			});
			throw error;
		}
	}
	createTappedStream(base) {
		const onAcpMessage = () => this.eventHandlers.onAcpMessage;
		const onAcpOutputMessage = () => this.eventHandlers.onAcpOutputMessage;
		const shouldSuppressInboundReplaySessionUpdate = (message) => {
			return this.suppressReplaySessionUpdateMessages && isSessionUpdateNotification(message);
		};
		return {
			readable: new ReadableStream({ async start(controller) {
				const reader = base.readable.getReader();
				try {
					while (true) {
						const { value, done } = await reader.read();
						if (done) break;
						if (!value) continue;
						if (!shouldSuppressInboundReplaySessionUpdate(value)) {
							onAcpOutputMessage()?.("inbound", value);
							onAcpMessage()?.("inbound", value);
						}
						controller.enqueue(value);
					}
				} finally {
					reader.releaseLock();
					controller.close();
				}
			} }),
			writable: new WritableStream({ async write(message) {
				onAcpOutputMessage()?.("outbound", message);
				onAcpMessage()?.("outbound", message);
				const writer = base.writable.getWriter();
				try {
					await writer.write(message);
				} finally {
					writer.releaseLock();
				}
			} })
		};
	}
	async createSession(cwd = this.options.cwd) {
		const connection = this.getConnection();
		const { command, args } = splitCommandLine(this.options.agentCommand);
		const claudeAcp = isClaudeAcpCommand(command, args);
		let result;
		try {
			const createPromise = this.runConnectionRequest(() => connection.newSession({
				cwd: asAbsoluteCwd(cwd),
				mcpServers: this.options.mcpServers ?? [],
				_meta: buildClaudeCodeOptionsMeta(this.options.sessionOptions)
			}));
			result = claudeAcp ? await withTimeout(createPromise, resolveClaudeAcpSessionCreateTimeoutMs()) : await createPromise;
		} catch (error) {
			if (claudeAcp && error instanceof TimeoutError) throw new ClaudeAcpSessionCreateTimeoutError(buildClaudeAcpSessionCreateTimeoutMessage(), {
				cause: error,
				retryable: true
			});
			throw error;
		}
		this.loadedSessionId = result.sessionId;
		return {
			sessionId: result.sessionId,
			agentSessionId: extractRuntimeSessionId(result._meta),
			models: result.models ?? void 0
		};
	}
	async loadSession(sessionId, cwd = this.options.cwd) {
		this.getConnection();
		return await this.loadSessionWithOptions(sessionId, cwd, {});
	}
	async loadSessionWithOptions(sessionId, cwd = this.options.cwd, options = {}) {
		const connection = this.getConnection();
		const previousSuppression = this.suppressSessionUpdates;
		const previousReplaySuppression = this.suppressReplaySessionUpdateMessages;
		this.suppressSessionUpdates = previousSuppression || Boolean(options.suppressReplayUpdates);
		this.suppressReplaySessionUpdateMessages = previousReplaySuppression || Boolean(options.suppressReplayUpdates);
		let response;
		try {
			response = await this.runConnectionRequest(() => connection.loadSession({
				sessionId,
				cwd: asAbsoluteCwd(cwd),
				mcpServers: this.options.mcpServers ?? []
			}));
			await this.waitForSessionUpdateDrain(options.replayIdleMs ?? REPLAY_IDLE_MS, options.replayDrainTimeoutMs ?? REPLAY_DRAIN_TIMEOUT_MS);
		} finally {
			this.suppressSessionUpdates = previousSuppression;
			this.suppressReplaySessionUpdateMessages = previousReplaySuppression;
		}
		this.loadedSessionId = sessionId;
		return {
			agentSessionId: extractRuntimeSessionId(response?._meta),
			models: response?.models ?? void 0
		};
	}
	async prompt(sessionId, prompt) {
		const connection = this.getConnection();
		const restoreConsoleError = this.options.suppressSdkConsoleErrors ? installSdkConsoleErrorSuppression() : void 0;
		let promptPromise;
		try {
			promptPromise = this.runConnectionRequest(() => connection.prompt({
				sessionId,
				prompt: typeof prompt === "string" ? textPrompt(prompt) : prompt
			}));
		} catch (error) {
			restoreConsoleError?.();
			throw error;
		}
		this.activePrompt = {
			sessionId,
			promise: promptPromise
		};
		try {
			const response = await promptPromise;
			const permissionFailure = this.consumePromptPermissionFailure(sessionId);
			if (permissionFailure) throw permissionFailure;
			return response;
		} catch (error) {
			const permissionFailure = this.consumePromptPermissionFailure(sessionId);
			if (permissionFailure) throw permissionFailure;
			throw error;
		} finally {
			restoreConsoleError?.();
			if (this.activePrompt?.promise === promptPromise) this.activePrompt = void 0;
			this.cancellingSessionIds.delete(sessionId);
			this.promptPermissionFailures.delete(sessionId);
		}
	}
	async setSessionMode(sessionId, modeId) {
		const connection = this.getConnection();
		try {
			await this.runConnectionRequest(() => connection.setSessionMode({
				sessionId,
				modeId
			}));
		} catch (error) {
			throw maybeWrapSessionControlError("session/set_mode", error, `for mode "${modeId}"`);
		}
	}
	async setSessionConfigOption(sessionId, configId, value) {
		const connection = this.getConnection();
		try {
			return await this.runConnectionRequest(() => connection.setSessionConfigOption({
				sessionId,
				configId,
				value
			}));
		} catch (error) {
			throw maybeWrapSessionControlError("session/set_config_option", error, `for "${configId}"="${value}"`);
		}
	}
	async setSessionModel(sessionId, modelId) {
		const connection = this.getConnection();
		try {
			await this.runConnectionRequest(() => connection.unstable_setSessionModel({
				sessionId,
				modelId
			}));
		} catch (error) {
			const wrapped = maybeWrapSessionControlError("session/set_model", error, `for model "${modelId}"`);
			if (wrapped !== error) throw wrapped;
			const acp = extractAcpError(error);
			const summary = acp ? formatSessionControlAcpSummary(acp) : error instanceof Error ? error.message : String(error);
			if (error instanceof Error) throw new Error(`Failed session/set_model for model "${modelId}": ${summary}`, { cause: error });
			throw new Error(`Failed session/set_model for model "${modelId}": ${summary}`, { cause: error });
		}
	}
	async cancel(sessionId) {
		const connection = this.getConnection();
		this.cancellingSessionIds.add(sessionId);
		await this.runConnectionRequest(() => connection.cancel({ sessionId }));
	}
	async requestCancelActivePrompt() {
		const active = this.activePrompt;
		if (!active) return false;
		await this.cancel(active.sessionId);
		return true;
	}
	async cancelActivePrompt(waitMs = 2500) {
		const active = this.activePrompt;
		if (!active) return;
		try {
			await this.cancel(active.sessionId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log(`failed to send session/cancel: ${message}`);
		}
		if (waitMs <= 0) return;
		let timer;
		const timeoutPromise = new Promise((resolve) => {
			timer = setTimeout(resolve, waitMs);
		});
		try {
			return await Promise.race([active.promise.then((response) => response, () => void 0), timeoutPromise]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
	async close() {
		this.closing = true;
		await this.terminalManager.shutdown();
		const agent = this.agent;
		if (agent) await this.terminateAgentProcess(agent);
		if (this.pendingConnectionRequests.size > 0) this.rejectPendingConnectionRequests(this.lastAgentExit ? new AgentDisconnectedError(this.lastAgentExit.reason, this.lastAgentExit.exitCode, this.lastAgentExit.signal, { outputAlreadyEmitted: Boolean(this.activePrompt) }) : new AgentDisconnectedError("connection_close", null, null, { outputAlreadyEmitted: Boolean(this.activePrompt) }));
		this.sessionUpdateChain = Promise.resolve();
		this.observedSessionUpdates = 0;
		this.processedSessionUpdates = 0;
		this.suppressSessionUpdates = false;
		this.suppressReplaySessionUpdateMessages = false;
		this.activePrompt = void 0;
		this.cancellingSessionIds.clear();
		this.promptPermissionFailures.clear();
		this.loadedSessionId = void 0;
		this.initResult = void 0;
		this.connection = void 0;
		this.agent = void 0;
	}
	async terminateAgentProcess(child) {
		const stdinCloseGraceMs = resolveAgentCloseAfterStdinEndMs(this.options.agentCommand);
		if (!child.stdin.destroyed) try {
			child.stdin.end();
		} catch {}
		let exited = await waitForChildExit(child, stdinCloseGraceMs);
		if (!exited && isChildProcessRunning(child)) {
			try {
				child.kill("SIGTERM");
			} catch {}
			exited = await waitForChildExit(child, AGENT_CLOSE_TERM_GRACE_MS);
		}
		if (!exited && isChildProcessRunning(child)) {
			this.log(`agent did not exit after ${AGENT_CLOSE_TERM_GRACE_MS}ms; forcing SIGKILL`);
			try {
				child.kill("SIGKILL");
			} catch {}
			exited = await waitForChildExit(child, AGENT_CLOSE_KILL_GRACE_MS);
		}
		this.detachAgentHandles(child, !exited);
	}
	detachAgentHandles(agent, unref) {
		const stdin = agent.stdin;
		const stdout = agent.stdout;
		const stderr = agent.stderr;
		stdin?.destroy();
		stdout?.destroy();
		stderr?.destroy();
		if (unref) try {
			agent.unref();
		} catch {}
	}
	getConnection() {
		if (!this.connection) throw new Error("ACP client not started");
		return this.connection;
	}
	log(message) {
		if (!this.options.verbose) return;
		process.stderr.write(`[acpx] ${message}\n`);
	}
	selectAuthMethod(methods) {
		const configCredentials = this.options.authCredentials ?? {};
		for (const method of methods) {
			const envCredential = readEnvCredential(method.id);
			if (envCredential) return {
				methodId: method.id,
				credential: envCredential,
				source: "env"
			};
			const configCredential = configCredentials[method.id] ?? configCredentials[toEnvToken(method.id)];
			if (typeof configCredential === "string" && configCredential.trim().length > 0) return {
				methodId: method.id,
				credential: configCredential,
				source: "config"
			};
		}
	}
	async authenticateIfRequired(connection, methods) {
		if (methods.length === 0) return;
		const selected = this.selectAuthMethod(methods);
		if (!selected) {
			if (this.options.authPolicy === "fail") throw new AuthPolicyError(`agent advertised auth methods [${methods.map((m) => m.id).join(", ")}] but no matching credentials found`);
			this.log(`agent advertised auth methods [${methods.map((m) => m.id).join(", ")}] but no matching credentials found — skipping (agent may handle auth internally)`);
			return;
		}
		await connection.authenticate({ methodId: selected.methodId });
		this.log(`authenticated with method ${selected.methodId} (${selected.source})`);
	}
	async handlePermissionRequest(params) {
		if (this.cancellingSessionIds.has(params.sessionId)) return { outcome: { outcome: "cancelled" } };
		let response;
		try {
			response = await resolvePermissionRequest(params, this.options.permissionMode, this.options.nonInteractivePermissions ?? "deny");
		} catch (error) {
			if (error instanceof PermissionPromptUnavailableError) {
				this.notePromptPermissionFailure(params.sessionId, error);
				this.recordPermissionDecision("cancelled");
				return { outcome: { outcome: "cancelled" } };
			}
			throw error;
		}
		const decision = classifyPermissionDecision(params, response);
		this.recordPermissionDecision(decision);
		return response;
	}
	attachAgentLifecycleObservers(child) {
		child.once("exit", (exitCode, signal) => {
			this.recordAgentExit("process_exit", exitCode, signal);
		});
		child.once("close", (exitCode, signal) => {
			this.recordAgentExit("process_close", exitCode, signal);
		});
		child.stdout.once("close", () => {
			this.recordAgentExit("pipe_close", child.exitCode ?? null, child.signalCode ?? null);
		});
	}
	recordAgentExit(reason, exitCode, signal) {
		if (this.lastAgentExit) return;
		this.lastAgentExit = {
			exitCode,
			signal,
			exitedAt: isoNow(),
			reason,
			unexpectedDuringPrompt: !this.closing && Boolean(this.activePrompt)
		};
		this.rejectPendingConnectionRequests(new AgentDisconnectedError(reason, exitCode, signal, { outputAlreadyEmitted: Boolean(this.activePrompt) }));
	}
	notePromptPermissionFailure(sessionId, error) {
		if (!this.promptPermissionFailures.has(sessionId)) this.promptPermissionFailures.set(sessionId, error);
	}
	consumePromptPermissionFailure(sessionId) {
		const error = this.promptPermissionFailures.get(sessionId);
		if (error) this.promptPermissionFailures.delete(sessionId);
		return error;
	}
	async runConnectionRequest(run) {
		return await new Promise((resolve, reject) => {
			const pending = {
				settled: false,
				reject
			};
			const finish = (cb) => {
				if (pending.settled) return;
				pending.settled = true;
				this.pendingConnectionRequests.delete(pending);
				cb();
			};
			this.pendingConnectionRequests.add(pending);
			Promise.resolve().then(run).then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)));
		});
	}
	rejectPendingConnectionRequests(error) {
		for (const pending of this.pendingConnectionRequests) {
			if (pending.settled) {
				this.pendingConnectionRequests.delete(pending);
				continue;
			}
			pending.settled = true;
			this.pendingConnectionRequests.delete(pending);
			pending.reject(error);
		}
	}
	async handleReadTextFile(params) {
		try {
			return await this.filesystem.readTextFile(params);
		} catch (error) {
			this.recordPermissionError(params.sessionId, error);
			throw error;
		}
	}
	async handleWriteTextFile(params) {
		try {
			return await this.filesystem.writeTextFile(params);
		} catch (error) {
			this.recordPermissionError(params.sessionId, error);
			throw error;
		}
	}
	async handleCreateTerminal(params) {
		try {
			return await this.terminalManager.createTerminal(params);
		} catch (error) {
			this.recordPermissionError(params.sessionId, error);
			throw error;
		}
	}
	async handleTerminalOutput(params) {
		return await this.terminalManager.terminalOutput(params);
	}
	async handleWaitForTerminalExit(params) {
		return await this.terminalManager.waitForTerminalExit(params);
	}
	async handleKillTerminal(params) {
		return await this.terminalManager.killTerminal(params);
	}
	async handleReleaseTerminal(params) {
		return await this.terminalManager.releaseTerminal(params);
	}
	recordPermissionDecision(decision) {
		this.permissionStats.requested += 1;
		if (decision === "approved") {
			this.permissionStats.approved += 1;
			return;
		}
		if (decision === "denied") {
			this.permissionStats.denied += 1;
			return;
		}
		this.permissionStats.cancelled += 1;
	}
	recordPermissionError(sessionId, error) {
		if (error instanceof PermissionPromptUnavailableError) {
			this.notePromptPermissionFailure(sessionId, error);
			this.recordPermissionDecision("cancelled");
			return;
		}
		if (error instanceof PermissionDeniedError) this.recordPermissionDecision("denied");
	}
	async handleSessionUpdate(notification) {
		const sequence = ++this.observedSessionUpdates;
		this.sessionUpdateChain = this.sessionUpdateChain.then(async () => {
			try {
				if (!this.suppressSessionUpdates) this.eventHandlers.onSessionUpdate?.(notification);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.log(`session update handler failed: ${message}`);
			} finally {
				this.processedSessionUpdates = sequence;
			}
		});
		await this.sessionUpdateChain;
	}
	async waitForSessionUpdateDrain(idleMs, timeoutMs) {
		const normalizedIdleMs = Math.max(0, idleMs);
		const normalizedTimeoutMs = Math.max(normalizedIdleMs, timeoutMs);
		const deadline = Date.now() + normalizedTimeoutMs;
		let lastObserved = this.observedSessionUpdates;
		let idleSince = Date.now();
		while (Date.now() <= deadline) {
			const observed = this.observedSessionUpdates;
			if (observed !== lastObserved) {
				lastObserved = observed;
				idleSince = Date.now();
			}
			if (this.processedSessionUpdates === this.observedSessionUpdates && Date.now() - idleSince >= normalizedIdleMs) {
				await this.sessionUpdateChain;
				if (this.processedSessionUpdates === this.observedSessionUpdates) return;
			}
			await new Promise((resolve) => {
				setTimeout(resolve, DRAIN_POLL_INTERVAL_MS);
			});
		}
		throw new Error(`Timed out waiting for session replay drain after ${normalizedTimeoutMs}ms`);
	}
};
//#endregion
export { resolveAgentCommand as _, normalizeRuntimeSessionId as a, PermissionDeniedError as c, SessionModelReplayError as d, SessionResumeRequiredError as f, DEFAULT_AGENT_NAME as g, isAcpResourceNotFoundError as h, withTimeout as i, PermissionPromptUnavailableError as l, formatUnknownErrorMessage as m, InterruptedError as n, textPrompt as o, extractAcpError as p, TimeoutError as r, AuthPolicyError as s, AcpClient as t, SessionModeReplayError as u };
