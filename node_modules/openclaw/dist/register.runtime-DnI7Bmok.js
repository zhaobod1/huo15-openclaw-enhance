import { d as AcpRuntimeError } from "./session-identity-DQtM7u0c.js";
import { a as registerAcpRuntimeBackend, s as unregisterAcpRuntimeBackend } from "./manager-B8s0Ep5O.js";
import { t as buildPluginConfigSchema } from "./config-schema-BTVf9GZX.js";
import "./core-D7mi2qmR.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import "./runtime-api-BqNNUs7l.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import fs$1 from "node:fs/promises";
//#region extensions/acpx/src/config-schema.ts
const ACPX_PERMISSION_MODES = [
	"approve-all",
	"approve-reads",
	"deny-all"
];
const ACPX_NON_INTERACTIVE_POLICIES = ["deny", "fail"];
const nonEmptyTrimmedString = (message) => zod_exports.z.string({ error: message }).trim().min(1, { error: message });
const McpServerConfigSchema = zod_exports.z.object({
	command: nonEmptyTrimmedString("command must be a non-empty string").describe("Command to run the MCP server"),
	args: zod_exports.z.array(zod_exports.z.string({ error: "args must be an array of strings" }), { error: "args must be an array of strings" }).optional().describe("Arguments to pass to the command"),
	env: zod_exports.z.record(zod_exports.z.string(), zod_exports.z.string({ error: "env values must be strings" }), { error: "env must be an object of strings" }).optional().describe("Environment variables for the MCP server")
});
const AcpxPluginConfigSchema = zod_exports.z.strictObject({
	cwd: nonEmptyTrimmedString("cwd must be a non-empty string").optional(),
	stateDir: nonEmptyTrimmedString("stateDir must be a non-empty string").optional(),
	permissionMode: zod_exports.z.enum(ACPX_PERMISSION_MODES, { error: `permissionMode must be one of: ${ACPX_PERMISSION_MODES.join(", ")}` }).optional(),
	nonInteractivePermissions: zod_exports.z.enum(ACPX_NON_INTERACTIVE_POLICIES, { error: `nonInteractivePermissions must be one of: ${ACPX_NON_INTERACTIVE_POLICIES.join(", ")}` }).optional(),
	pluginToolsMcpBridge: zod_exports.z.boolean({ error: "pluginToolsMcpBridge must be a boolean" }).optional(),
	strictWindowsCmdWrapper: zod_exports.z.boolean({ error: "strictWindowsCmdWrapper must be a boolean" }).optional(),
	timeoutSeconds: zod_exports.z.number({ error: "timeoutSeconds must be a number >= 0.001" }).min(.001, { error: "timeoutSeconds must be a number >= 0.001" }).optional(),
	queueOwnerTtlSeconds: zod_exports.z.number({ error: "queueOwnerTtlSeconds must be a number >= 0" }).min(0, { error: "queueOwnerTtlSeconds must be a number >= 0" }).optional(),
	mcpServers: zod_exports.z.record(zod_exports.z.string(), McpServerConfigSchema).optional(),
	agents: zod_exports.z.record(zod_exports.z.string(), zod_exports.z.strictObject({ command: nonEmptyTrimmedString("agents.<id>.command must be a non-empty string") })).optional()
});
function createAcpxPluginConfigSchema() {
	return buildPluginConfigSchema(AcpxPluginConfigSchema);
}
//#endregion
//#region extensions/acpx/src/config.ts
const ACPX_PLUGIN_TOOLS_MCP_SERVER_NAME = "openclaw-plugin-tools";
function isAcpxPluginRoot(dir) {
	return fs.existsSync(path.join(dir, "openclaw.plugin.json")) && fs.existsSync(path.join(dir, "package.json"));
}
function resolveNearestAcpxPluginRoot(moduleUrl) {
	let cursor = path.dirname(fileURLToPath(moduleUrl));
	for (let i = 0; i < 3; i += 1) {
		if (isAcpxPluginRoot(cursor)) return cursor;
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
	return path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..");
}
function resolveWorkspaceAcpxPluginRoot(currentRoot) {
	if (path.basename(currentRoot) !== "acpx" || path.basename(path.dirname(currentRoot)) !== "extensions" || path.basename(path.dirname(path.dirname(currentRoot))) !== "dist") return null;
	const workspaceRoot = path.resolve(currentRoot, "..", "..", "..", "extensions", "acpx");
	return isAcpxPluginRoot(workspaceRoot) ? workspaceRoot : null;
}
function resolveRepoAcpxPluginRoot(currentRoot) {
	const workspaceRoot = path.join(currentRoot, "extensions", "acpx");
	return isAcpxPluginRoot(workspaceRoot) ? workspaceRoot : null;
}
function resolveAcpxPluginRootFromOpenClawLayout(moduleUrl) {
	let cursor = path.dirname(fileURLToPath(moduleUrl));
	for (let i = 0; i < 5; i += 1) {
		const candidates = [
			path.join(cursor, "extensions", "acpx"),
			path.join(cursor, "dist", "extensions", "acpx"),
			path.join(cursor, "dist-runtime", "extensions", "acpx")
		];
		for (const candidate of candidates) if (isAcpxPluginRoot(candidate)) return candidate;
		const parent = path.dirname(cursor);
		if (parent === cursor) break;
		cursor = parent;
	}
	return null;
}
function resolveAcpxPluginRoot(moduleUrl = import.meta.url) {
	const resolvedRoot = resolveNearestAcpxPluginRoot(moduleUrl);
	return resolveWorkspaceAcpxPluginRoot(resolvedRoot) ?? resolveRepoAcpxPluginRoot(resolvedRoot) ?? resolveAcpxPluginRootFromOpenClawLayout(moduleUrl) ?? resolvedRoot;
}
resolveAcpxPluginRoot();
const DEFAULT_PERMISSION_MODE = "approve-reads";
const DEFAULT_NON_INTERACTIVE_POLICY = "fail";
const DEFAULT_QUEUE_OWNER_TTL_SECONDS = .1;
const DEFAULT_STRICT_WINDOWS_CMD_WRAPPER = true;
function formatAcpxConfigIssue(issue) {
	if (!issue) return "invalid config";
	if (issue.code === "unrecognized_keys" && issue.keys.length > 0) return `unknown config key: ${issue.keys[0]}`;
	if (issue.code === "invalid_type" && issue.path.length === 0) return "expected config object";
	return issue.message;
}
function parseAcpxPluginConfig(value) {
	if (value === void 0) return {
		ok: true,
		value: void 0
	};
	const parsed = AcpxPluginConfigSchema.safeParse(value);
	if (!parsed.success) return {
		ok: false,
		message: formatAcpxConfigIssue(parsed.error.issues[0])
	};
	return {
		ok: true,
		value: parsed.data
	};
}
function resolveOpenClawRoot(currentRoot) {
	if (path.basename(currentRoot) === "acpx" && path.basename(path.dirname(currentRoot)) === "extensions") {
		const parent = path.dirname(path.dirname(currentRoot));
		if (path.basename(parent) === "dist") return path.dirname(parent);
		return parent;
	}
	return path.resolve(currentRoot, "..");
}
function resolvePluginToolsMcpServerConfig(moduleUrl = import.meta.url) {
	const openClawRoot = resolveOpenClawRoot(resolveAcpxPluginRoot(moduleUrl));
	const distEntry = path.join(openClawRoot, "dist", "mcp", "plugin-tools-serve.js");
	if (fs.existsSync(distEntry)) return {
		command: process.execPath,
		args: [distEntry]
	};
	const sourceEntry = path.join(openClawRoot, "src", "mcp", "plugin-tools-serve.ts");
	return {
		command: process.execPath,
		args: [
			"--import",
			"tsx",
			sourceEntry
		]
	};
}
function resolveConfiguredMcpServers(params) {
	const resolved = { ...params.mcpServers ?? {} };
	if (!params.pluginToolsMcpBridge) return resolved;
	if (resolved["openclaw-plugin-tools"]) throw new Error(`mcpServers.${ACPX_PLUGIN_TOOLS_MCP_SERVER_NAME} is reserved when pluginToolsMcpBridge=true`);
	resolved[ACPX_PLUGIN_TOOLS_MCP_SERVER_NAME] = resolvePluginToolsMcpServerConfig(params.moduleUrl);
	return resolved;
}
function resolveAcpxPluginConfig(params) {
	const parsed = parseAcpxPluginConfig(params.rawConfig);
	if (!parsed.ok) throw new Error(parsed.message);
	const normalized = parsed.value ?? {};
	const workspaceDir = params.workspaceDir?.trim() || process.cwd();
	const fallbackCwd = workspaceDir;
	const cwd = path.resolve(normalized.cwd?.trim() || fallbackCwd);
	const stateDir = path.resolve(normalized.stateDir?.trim() || path.join(workspaceDir, "state"));
	const pluginToolsMcpBridge = normalized.pluginToolsMcpBridge === true;
	const mcpServers = resolveConfiguredMcpServers({
		mcpServers: normalized.mcpServers,
		pluginToolsMcpBridge,
		moduleUrl: params.moduleUrl
	});
	const agents = Object.fromEntries(Object.entries(normalized.agents ?? {}).map(([name, entry]) => [name.trim().toLowerCase(), entry.command.trim()]));
	return {
		cwd,
		stateDir,
		permissionMode: normalized.permissionMode ?? DEFAULT_PERMISSION_MODE,
		nonInteractivePermissions: normalized.nonInteractivePermissions ?? DEFAULT_NON_INTERACTIVE_POLICY,
		pluginToolsMcpBridge,
		strictWindowsCmdWrapper: normalized.strictWindowsCmdWrapper ?? DEFAULT_STRICT_WINDOWS_CMD_WRAPPER,
		timeoutSeconds: normalized.timeoutSeconds,
		queueOwnerTtlSeconds: normalized.queueOwnerTtlSeconds ?? DEFAULT_QUEUE_OWNER_TTL_SECONDS,
		mcpServers,
		agents
	};
}
//#endregion
//#region extensions/acpx/src/runtime.ts
const ACPX_BACKEND_ID = "acpx";
const ACPX_RUNTIME_HANDLE_PREFIX = "acpx:v2:";
const ACPX_CAPABILITIES = { controls: [
	"session/set_mode",
	"session/set_config_option",
	"session/status"
] };
function asOptionalString(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function writeHandleState(handle, state) {
	handle.runtimeSessionName = encodeAcpxRuntimeHandleState(state);
	handle.cwd = state.cwd;
	handle.acpxRecordId = state.acpxRecordId;
	handle.backendSessionId = state.backendSessionId;
	handle.agentSessionId = state.agentSessionId;
}
function encodeAcpxRuntimeHandleState(state) {
	return `${ACPX_RUNTIME_HANDLE_PREFIX}${Buffer.from(JSON.stringify(state), "utf8").toString("base64url")}`;
}
function decodeAcpxRuntimeHandleState(runtimeSessionName) {
	const trimmed = runtimeSessionName.trim();
	if (!trimmed.startsWith(ACPX_RUNTIME_HANDLE_PREFIX)) return null;
	try {
		const raw = Buffer.from(trimmed.slice(8), "base64url").toString("utf8");
		const parsed = JSON.parse(raw);
		const name = asOptionalString(parsed.name);
		const agent = asOptionalString(parsed.agent);
		const cwd = asOptionalString(parsed.cwd);
		const mode = asOptionalString(parsed.mode);
		if (!name || !agent || !cwd || mode !== "persistent" && mode !== "oneshot") return null;
		return {
			name,
			agent,
			cwd,
			mode,
			acpxRecordId: asOptionalString(parsed.acpxRecordId),
			backendSessionId: asOptionalString(parsed.backendSessionId),
			agentSessionId: asOptionalString(parsed.agentSessionId)
		};
	} catch {
		return null;
	}
}
var AcpxRuntime = class {
	constructor(config, opts) {
		this.config = config;
		this.opts = opts;
		this.healthy = false;
		this.manager = null;
		this.managerPromise = null;
	}
	isHealthy() {
		return this.healthy;
	}
	async probeAvailability() {
		this.healthy = (await this.runProbe()).ok;
	}
	async doctor() {
		const report = await this.runProbe();
		this.healthy = report.ok;
		return {
			ok: report.ok,
			message: report.message,
			details: report.details
		};
	}
	async ensureSession(input) {
		const sessionName = input.sessionKey.trim();
		if (!sessionName) throw new AcpRuntimeError("ACP_SESSION_INIT_FAILED", "ACP session key is required.");
		const agent = input.agent.trim();
		if (!agent) throw new AcpRuntimeError("ACP_SESSION_INIT_FAILED", "ACP agent id is required.");
		const record = await (await this.getManager()).ensureSession({
			sessionKey: sessionName,
			agent,
			cwd: input.cwd ?? this.config.cwd,
			resumeSessionId: input.resumeSessionId
		});
		const handle = {
			sessionKey: input.sessionKey,
			backend: ACPX_BACKEND_ID,
			runtimeSessionName: "",
			cwd: record.cwd,
			acpxRecordId: record.acpxRecordId,
			backendSessionId: record.acpSessionId,
			agentSessionId: record.agentSessionId
		};
		writeHandleState(handle, {
			name: sessionName,
			agent,
			cwd: record.cwd,
			mode: input.mode,
			acpxRecordId: record.acpxRecordId,
			backendSessionId: record.acpSessionId,
			agentSessionId: record.agentSessionId
		});
		return handle;
	}
	async *runTurn(input) {
		const state = this.resolveHandleState(input.handle);
		yield* (await this.getManager()).runTurn({
			handle: {
				...input.handle,
				acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
			},
			text: input.text,
			attachments: input.attachments,
			requestId: input.requestId,
			signal: input.signal
		});
	}
	getCapabilities() {
		return ACPX_CAPABILITIES;
	}
	async getStatus(input) {
		const state = this.resolveHandleState(input.handle);
		return await (await this.getManager()).getStatus({
			...input.handle,
			acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
		});
	}
	async setMode(input) {
		const state = this.resolveHandleState(input.handle);
		await (await this.getManager()).setMode({
			...input.handle,
			acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
		}, input.mode);
	}
	async setConfigOption(input) {
		const state = this.resolveHandleState(input.handle);
		await (await this.getManager()).setConfigOption({
			...input.handle,
			acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
		}, input.key, input.value);
	}
	async cancel(input) {
		const state = this.resolveHandleState(input.handle);
		await (await this.getManager()).cancel({
			...input.handle,
			acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
		});
	}
	async close(input) {
		const state = this.resolveHandleState(input.handle);
		await (await this.getManager()).close({
			...input.handle,
			acpxRecordId: state.acpxRecordId ?? input.handle.acpxRecordId ?? input.handle.sessionKey
		});
	}
	async getManager() {
		if (this.manager) return this.manager;
		if (!this.managerPromise) this.managerPromise = (async () => {
			const manager = this.opts?.managerFactory?.(this.config) ?? new (await (import("./manager-v1rErYTT.js"))).SessionRuntimeManager(this.config);
			this.manager = manager;
			return manager;
		})();
		return await this.managerPromise;
	}
	async runProbe() {
		return await (await import("./probe-DN8iLghG.js")).probeEmbeddedRuntime(this.config);
	}
	resolveHandleState(handle) {
		const decoded = decodeAcpxRuntimeHandleState(handle.runtimeSessionName);
		if (decoded) return {
			...decoded,
			acpxRecordId: decoded.acpxRecordId ?? handle.acpxRecordId,
			backendSessionId: decoded.backendSessionId ?? handle.backendSessionId,
			agentSessionId: decoded.agentSessionId ?? handle.agentSessionId
		};
		const runtimeSessionName = handle.runtimeSessionName.trim();
		if (!runtimeSessionName) throw new AcpRuntimeError("ACP_SESSION_INIT_FAILED", "Invalid embedded ACP runtime handle: runtimeSessionName is missing.");
		return {
			name: runtimeSessionName,
			agent: "codex",
			cwd: handle.cwd ?? this.config.cwd,
			mode: "persistent",
			acpxRecordId: handle.acpxRecordId,
			backendSessionId: handle.backendSessionId,
			agentSessionId: handle.agentSessionId
		};
	}
};
//#endregion
//#region extensions/acpx/src/service.ts
function createDefaultRuntime(params) {
	return new AcpxRuntime(params.pluginConfig, { logger: params.logger });
}
function formatDoctorFailureMessage(report) {
	const detailText = report.details?.filter(Boolean).join("; ").trim();
	return detailText ? `${report.message} (${detailText})` : report.message;
}
function createAcpxRuntimeService(params = {}) {
	let runtime = null;
	let lifecycleRevision = 0;
	return {
		id: "acpx-runtime",
		async start(ctx) {
			const pluginConfig = resolveAcpxPluginConfig({
				rawConfig: params.pluginConfig,
				workspaceDir: ctx.workspaceDir
			});
			await fs$1.mkdir(pluginConfig.stateDir, { recursive: true });
			runtime = (params.runtimeFactory ?? createDefaultRuntime)({
				pluginConfig,
				queueOwnerTtlSeconds: pluginConfig.queueOwnerTtlSeconds,
				logger: ctx.logger
			});
			registerAcpRuntimeBackend({
				id: ACPX_BACKEND_ID,
				runtime,
				healthy: () => runtime?.isHealthy() ?? false
			});
			ctx.logger.info(`embedded acpx runtime backend registered (cwd: ${pluginConfig.cwd})`);
			lifecycleRevision += 1;
			const currentRevision = lifecycleRevision;
			(async () => {
				try {
					await runtime?.probeAvailability();
					if (currentRevision !== lifecycleRevision) return;
					if (runtime?.isHealthy()) {
						ctx.logger.info("embedded acpx runtime backend ready");
						return;
					}
					const doctorReport = await runtime?.doctor?.();
					if (currentRevision !== lifecycleRevision) return;
					ctx.logger.warn(`embedded acpx runtime backend probe failed: ${doctorReport ? formatDoctorFailureMessage(doctorReport) : "backend remained unhealthy after probe"}`);
				} catch (err) {
					if (currentRevision !== lifecycleRevision) return;
					ctx.logger.warn(`embedded acpx runtime setup failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			})();
		},
		async stop(_ctx) {
			lifecycleRevision += 1;
			unregisterAcpRuntimeBackend(ACPX_BACKEND_ID);
			runtime = null;
		}
	};
}
//#endregion
export { createAcpxPluginConfigSchema as n, createAcpxRuntimeService as t };
