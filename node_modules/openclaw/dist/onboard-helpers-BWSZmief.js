import { _ as shortenHomePath, g as shortenHomeInString, t as CONFIG_DIR, v as sleep } from "./utils-ms6h9yny.js";
import { n as resolveAgentModelPrimaryValue } from "./model-input-BvHDuFyu.js";
import { t as CONFIG_PATH } from "./paths-yyDPxM31.js";
import { r as runCommandWithTimeout } from "./exec-CHN1LzVK.js";
import { d as ensureAgentWorkspace, n as DEFAULT_AGENT_WORKSPACE_DIR } from "./workspace-DLW8_PFX.js";
import { n as VERSION } from "./version-Bh_RSQ5Y.js";
import "./config-dzPpvDz6.js";
import "./sessions-D5EF_laP.js";
import { c as resolveSessionTranscriptsDirForAgent } from "./paths-UazeViO92.js";
import { r as normalizeControlUiBasePath } from "./control-ui-shared-Cv-7UN36.js";
import "./control-ui-links-ntLENAJ3.js";
import { i as probeGateway } from "./probe-Cv3pJ1Va.js";
import "./detect-binary-B5tovLqI.js";
import "./browser-open-DO_KBTik.js";
import { r as stylePromptTitle } from "./prompt-style-DdujAMh7.js";
import path from "node:path";
import fs from "node:fs/promises";
import { inspect } from "node:util";
import crypto from "node:crypto";
import { cancel, isCancel } from "@clack/prompts";
//#region src/commands/onboard-helpers.ts
function guardCancel(value, runtime) {
	if (isCancel(value)) {
		cancel(stylePromptTitle("Setup cancelled.") ?? "Setup cancelled.");
		runtime.exit(0);
		throw new Error("unreachable");
	}
	return value;
}
function summarizeExistingConfig(config) {
	const rows = [];
	const defaults = config.agents?.defaults;
	if (defaults?.workspace) rows.push(shortenHomeInString(`workspace: ${defaults.workspace}`));
	if (defaults?.model) {
		const model = resolveAgentModelPrimaryValue(defaults.model);
		if (model) rows.push(shortenHomeInString(`model: ${model}`));
	}
	if (config.gateway?.mode) rows.push(shortenHomeInString(`gateway.mode: ${config.gateway.mode}`));
	if (typeof config.gateway?.port === "number") rows.push(shortenHomeInString(`gateway.port: ${config.gateway.port}`));
	if (config.gateway?.bind) rows.push(shortenHomeInString(`gateway.bind: ${config.gateway.bind}`));
	if (config.gateway?.remote?.url) rows.push(shortenHomeInString(`gateway.remote.url: ${config.gateway.remote.url}`));
	if (config.skills?.install?.nodeManager) rows.push(shortenHomeInString(`skills.nodeManager: ${config.skills.install.nodeManager}`));
	return rows.length ? rows.join("\n") : "No key settings detected.";
}
function randomToken() {
	return crypto.randomBytes(24).toString("hex");
}
function normalizeGatewayTokenInput(value) {
	if (typeof value !== "string") return "";
	const trimmed = value.trim();
	if (trimmed === "undefined" || trimmed === "null") return "";
	return trimmed;
}
function validateGatewayPasswordInput(value) {
	if (typeof value !== "string") return "Required";
	const trimmed = value.trim();
	if (!trimmed) return "Required";
	if (trimmed === "undefined" || trimmed === "null") return "Cannot be the literal string \"undefined\" or \"null\"";
}
function printWizardHeader(runtime) {
	const header = [
		"▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
		"██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██",
		"██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██",
		"██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██",
		"▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀",
		"                  🦞 OPENCLAW 🦞                    ",
		" "
	].join("\n");
	runtime.log(header);
}
function applyWizardMetadata(cfg, params) {
	const commit = process.env.GIT_COMMIT?.trim() || process.env.GIT_SHA?.trim() || void 0;
	return {
		...cfg,
		wizard: {
			...cfg.wizard,
			lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
			lastRunVersion: VERSION,
			lastRunCommit: commit,
			lastRunCommand: params.command,
			lastRunMode: params.mode
		}
	};
}
function formatControlUiSshHint(params) {
	const basePath = normalizeControlUiBasePath(params.basePath);
	const uiPath = basePath ? `${basePath}/` : "/";
	const localUrl = `http://localhost:${params.port}${uiPath}`;
	const authedUrl = params.token ? `${localUrl}#token=${encodeURIComponent(params.token)}` : void 0;
	const sshTarget = resolveSshTargetHint();
	return [
		"No GUI detected. Open from your computer:",
		`ssh -N -L ${params.port}:127.0.0.1:${params.port} ${sshTarget}`,
		"Then open:",
		localUrl,
		authedUrl,
		"Docs:",
		"https://docs.openclaw.ai/gateway/remote",
		"https://docs.openclaw.ai/web/control-ui"
	].filter(Boolean).join("\n");
}
function resolveSshTargetHint() {
	return `${process.env.USER || process.env.LOGNAME || "user"}@${(process.env.SSH_CONNECTION?.trim().split(/\s+/))?.[2] ?? "<host>"}`;
}
async function ensureWorkspaceAndSessions(workspaceDir, runtime, options) {
	const ws = await ensureAgentWorkspace({
		dir: workspaceDir,
		ensureBootstrapFiles: !options?.skipBootstrap
	});
	runtime.log(`Workspace OK: ${shortenHomePath(ws.dir)}`);
	const sessionsDir = resolveSessionTranscriptsDirForAgent(options?.agentId);
	await fs.mkdir(sessionsDir, { recursive: true });
	runtime.log(`Sessions OK: ${shortenHomePath(sessionsDir)}`);
}
function resolveNodeManagerOptions() {
	return [
		{
			value: "npm",
			label: "npm"
		},
		{
			value: "pnpm",
			label: "pnpm"
		},
		{
			value: "bun",
			label: "bun"
		}
	];
}
async function moveToTrash(pathname, runtime) {
	if (!pathname) return;
	try {
		await fs.access(pathname);
	} catch {
		return;
	}
	try {
		await runCommandWithTimeout(["trash", pathname], { timeoutMs: 5e3 });
		runtime.log(`Moved to Trash: ${shortenHomePath(pathname)}`);
	} catch {
		runtime.log(`Failed to move to Trash (manual delete): ${shortenHomePath(pathname)}`);
	}
}
async function handleReset(scope, workspaceDir, runtime) {
	await moveToTrash(CONFIG_PATH, runtime);
	if (scope === "config") return;
	await moveToTrash(path.join(CONFIG_DIR, "credentials"), runtime);
	await moveToTrash(resolveSessionTranscriptsDirForAgent(), runtime);
	if (scope === "full") await moveToTrash(workspaceDir, runtime);
}
async function probeGatewayReachable(params) {
	const url = params.url.trim();
	const timeoutMs = params.timeoutMs ?? 1500;
	try {
		const probe = await probeGateway({
			url,
			timeoutMs,
			auth: {
				token: params.token,
				password: params.password
			},
			detailLevel: "none"
		});
		return probe.ok ? { ok: true } : {
			ok: false,
			detail: probe.error ?? void 0
		};
	} catch (err) {
		return {
			ok: false,
			detail: summarizeError(err)
		};
	}
}
async function waitForGatewayReachable(params) {
	const deadlineMs = params.deadlineMs ?? 15e3;
	const pollMs = params.pollMs ?? 400;
	const probeTimeoutMs = params.probeTimeoutMs ?? 1500;
	const startedAt = Date.now();
	let lastDetail;
	while (Date.now() - startedAt < deadlineMs) {
		const probe = await probeGatewayReachable({
			url: params.url,
			token: params.token,
			password: params.password,
			timeoutMs: probeTimeoutMs
		});
		if (probe.ok) return probe;
		lastDetail = probe.detail;
		await sleep(pollMs);
	}
	return {
		ok: false,
		detail: lastDetail
	};
}
function summarizeError(err) {
	let raw = "unknown error";
	if (err instanceof Error) raw = err.message || raw;
	else if (typeof err === "string") raw = err || raw;
	else if (err !== void 0) raw = inspect(err, { depth: 2 });
	const line = raw.split("\n").map((s) => s.trim()).find(Boolean) ?? raw;
	return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}
const DEFAULT_WORKSPACE = DEFAULT_AGENT_WORKSPACE_DIR;
//#endregion
export { guardCancel as a, normalizeGatewayTokenInput as c, randomToken as d, resolveNodeManagerOptions as f, waitForGatewayReachable as h, formatControlUiSshHint as i, printWizardHeader as l, validateGatewayPasswordInput as m, applyWizardMetadata as n, handleReset as o, summarizeExistingConfig as p, ensureWorkspaceAndSessions as r, moveToTrash as s, DEFAULT_WORKSPACE as t, probeGatewayReachable as u };
