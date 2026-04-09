import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { _ as shortenHomePath, g as shortenHomeInString } from "./utils-ms6h9yny.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { n as isRich, r as theme } from "./theme-BeexRN7S.js";
import { _ as resolveStateDir, h as resolveOAuthDir, o as resolveConfigPath } from "./paths-yyDPxM31.js";
import { c as normalizeAgentId } from "./session-key-BR3Z-ljs.js";
import { m as resolveDefaultAgentId } from "./agent-scope-CXWTwwic.js";
import { i as runExec } from "./exec-CHN1LzVK.js";
import { a as loadConfig, r as createConfigIO } from "./io-CS2J_l4V.js";
import { r as listBundledChannelPlugins } from "./bootstrap-registry-DSG7nIY1.js";
import "./config-dzPpvDz6.js";
import { a as createIcaclsResetCommand, o as formatIcaclsResetCommand } from "./audit-fs-Bp5fxpNd.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { t as resolveCommandSecretRefsViaGateway } from "./command-secret-gateway-BAJQe5Ov.js";
import { o as getSecurityAuditCommandSecretTargetIds } from "./command-secret-targets-Cx2mAV-T.js";
import { t as formatHelpExamples } from "./help-format-LjQpSCiy.js";
import { t as runSecurityAudit } from "./audit-Cw4zL7mc.js";
import { t as collectIncludePathsRecursive } from "./includes-scan-B1S4jR_l.js";
import path from "node:path";
import fs from "node:fs/promises";
//#region src/security/fix.ts
async function safeChmod(params) {
	try {
		const st = await fs.lstat(params.path);
		if (st.isSymbolicLink()) return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			skipped: "symlink"
		};
		if (params.require === "dir" && !st.isDirectory()) return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			skipped: "not-a-directory"
		};
		if (params.require === "file" && !st.isFile()) return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			skipped: "not-a-file"
		};
		if ((st.mode & 511) === params.mode) return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			skipped: "already"
		};
		await fs.chmod(params.path, params.mode);
		return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: true
		};
	} catch (err) {
		if (err.code === "ENOENT") return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			skipped: "missing"
		};
		return {
			kind: "chmod",
			path: params.path,
			mode: params.mode,
			ok: false,
			error: String(err)
		};
	}
}
async function safeAclReset(params) {
	const display = formatIcaclsResetCommand(params.path, {
		isDir: params.require === "dir",
		env: params.env
	});
	try {
		const st = await fs.lstat(params.path);
		if (st.isSymbolicLink()) return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			skipped: "symlink"
		};
		if (params.require === "dir" && !st.isDirectory()) return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			skipped: "not-a-directory"
		};
		if (params.require === "file" && !st.isFile()) return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			skipped: "not-a-file"
		};
		const cmd = createIcaclsResetCommand(params.path, {
			isDir: st.isDirectory(),
			env: params.env
		});
		if (!cmd) return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			skipped: "missing-user"
		};
		await (params.exec ?? runExec)(cmd.command, cmd.args);
		return {
			kind: "icacls",
			path: params.path,
			command: cmd.display,
			ok: true
		};
	} catch (err) {
		if (err.code === "ENOENT") return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			skipped: "missing"
		};
		return {
			kind: "icacls",
			path: params.path,
			command: display,
			ok: false,
			error: String(err)
		};
	}
}
function setGroupPolicyAllowlist(params) {
	if (!params.cfg.channels) return;
	const section = params.cfg.channels[params.channel];
	if (!section || typeof section !== "object") return;
	if (section.groupPolicy === "open") {
		section.groupPolicy = "allowlist";
		params.changes.push(`channels.${params.channel}.groupPolicy=open -> allowlist`);
	}
	const accounts = section.accounts;
	if (!accounts || typeof accounts !== "object") return;
	for (const [accountId, accountValue] of Object.entries(accounts)) {
		if (!accountId) continue;
		if (!accountValue || typeof accountValue !== "object") continue;
		const account = accountValue;
		if (account.groupPolicy === "open") {
			account.groupPolicy = "allowlist";
			params.changes.push(`channels.${params.channel}.accounts.${accountId}.groupPolicy=open -> allowlist`);
		}
	}
}
function applyConfigFixes(params) {
	const next = structuredClone(params.cfg ?? {});
	const changes = [];
	if (next.logging?.redactSensitive === "off") {
		next.logging = {
			...next.logging,
			redactSensitive: "tools"
		};
		changes.push("logging.redactSensitive=off -> \"tools\"");
	}
	for (const channel of Object.keys(next.channels ?? {})) setGroupPolicyAllowlist({
		cfg: next,
		channel,
		changes
	});
	return {
		cfg: next,
		changes
	};
}
async function collectChannelSecurityConfigFixMutation(params) {
	let nextCfg = params.cfg;
	const changes = [];
	const collectPlugins = () => {
		try {
			const pluginIds = Object.keys(params.cfg.channels ?? {}).filter(Boolean);
			if (pluginIds.length === 0) return [];
			const wanted = new Set(pluginIds);
			return listBundledChannelPlugins().filter((plugin) => wanted.has(plugin.id));
		} catch {
			return [];
		}
	};
	for (const plugin of collectPlugins()) {
		const mutation = await plugin.security?.applyConfigFixes?.({
			cfg: nextCfg,
			env: params.env
		});
		if (!mutation || mutation.changes.length === 0) continue;
		nextCfg = mutation.config;
		changes.push(...mutation.changes);
	}
	return {
		cfg: nextCfg,
		changes
	};
}
async function chmodCredentialsAndAgentState(params) {
	const credsDir = resolveOAuthDir(params.env, params.stateDir);
	params.actions.push(await safeChmod({
		path: credsDir,
		mode: 448,
		require: "dir"
	}));
	const credsEntries = await fs.readdir(credsDir, { withFileTypes: true }).catch(() => []);
	for (const entry of credsEntries) {
		if (!entry.isFile()) continue;
		if (!entry.name.endsWith(".json")) continue;
		const p = path.join(credsDir, entry.name);
		params.actions.push(await safeChmod({
			path: p,
			mode: 384,
			require: "file"
		}));
	}
	const ids = /* @__PURE__ */ new Set();
	ids.add(resolveDefaultAgentId(params.cfg));
	const list = Array.isArray(params.cfg.agents?.list) ? params.cfg.agents?.list : [];
	for (const agent of list ?? []) {
		if (!agent || typeof agent !== "object") continue;
		const id = typeof agent.id === "string" ? agent.id.trim() : "";
		if (id) ids.add(id);
	}
	for (const agentId of ids) {
		const normalizedAgentId = normalizeAgentId(agentId);
		const agentRoot = path.join(params.stateDir, "agents", normalizedAgentId);
		const agentDir = path.join(agentRoot, "agent");
		const sessionsDir = path.join(agentRoot, "sessions");
		params.actions.push(await safeChmod({
			path: agentRoot,
			mode: 448,
			require: "dir"
		}));
		params.actions.push(await params.applyPerms({
			path: agentDir,
			mode: 448,
			require: "dir"
		}));
		const authPath = path.join(agentDir, "auth-profiles.json");
		params.actions.push(await params.applyPerms({
			path: authPath,
			mode: 384,
			require: "file"
		}));
		params.actions.push(await params.applyPerms({
			path: sessionsDir,
			mode: 448,
			require: "dir"
		}));
		const storePath = path.join(sessionsDir, "sessions.json");
		params.actions.push(await params.applyPerms({
			path: storePath,
			mode: 384,
			require: "file"
		}));
		const sessionEntries = await fs.readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
		for (const entry of sessionEntries) {
			if (!entry.isFile()) continue;
			if (!entry.name.endsWith(".jsonl")) continue;
			const p = path.join(sessionsDir, entry.name);
			params.actions.push(await params.applyPerms({
				path: p,
				mode: 384,
				require: "file"
			}));
		}
	}
}
async function fixSecurityFootguns(opts) {
	const env = opts?.env ?? process.env;
	const platform = opts?.platform ?? process.platform;
	const exec = opts?.exec ?? runExec;
	const isWindows = platform === "win32";
	const stateDir = opts?.stateDir ?? resolveStateDir(env);
	const configPath = opts?.configPath ?? resolveConfigPath(env, stateDir);
	const actions = [];
	const errors = [];
	const io = createConfigIO({
		env,
		configPath
	});
	const snap = await io.readConfigFileSnapshot();
	if (!snap.valid) errors.push(...snap.issues.map((i) => `${i.path}: ${i.message}`));
	let configWritten = false;
	let changes = [];
	if (snap.valid) {
		const fixed = applyConfigFixes({
			cfg: snap.config,
			env
		});
		const channelFixes = await collectChannelSecurityConfigFixMutation({
			cfg: fixed.cfg,
			env
		});
		changes = [...fixed.changes, ...channelFixes.changes];
		if (changes.length > 0) try {
			await io.writeConfigFile(channelFixes.cfg);
			configWritten = true;
		} catch (err) {
			errors.push(`writeConfigFile failed: ${String(err)}`);
		}
	}
	const applyPerms = (params) => isWindows ? safeAclReset({
		path: params.path,
		require: params.require,
		env,
		exec
	}) : safeChmod({
		path: params.path,
		mode: params.mode,
		require: params.require
	});
	actions.push(await applyPerms({
		path: stateDir,
		mode: 448,
		require: "dir"
	}));
	actions.push(await applyPerms({
		path: configPath,
		mode: 384,
		require: "file"
	}));
	if (snap.exists) {
		const includePaths = await collectIncludePathsRecursive({
			configPath: snap.path,
			parsed: snap.parsed
		}).catch(() => []);
		for (const p of includePaths) actions.push(await applyPerms({
			path: p,
			mode: 384,
			require: "file"
		}));
	}
	await chmodCredentialsAndAgentState({
		env,
		stateDir,
		cfg: snap.config ?? {},
		actions,
		applyPerms
	}).catch((err) => {
		errors.push(`chmodCredentialsAndAgentState failed: ${String(err)}`);
	});
	return {
		ok: errors.length === 0,
		stateDir,
		configPath,
		configWritten,
		changes,
		actions,
		errors
	};
}
//#endregion
//#region src/cli/security-cli.ts
function formatSummary(summary) {
	const rich = isRich();
	const c = summary.critical;
	const w = summary.warn;
	const i = summary.info;
	const parts = [];
	parts.push(rich ? theme.error(`${c} critical`) : `${c} critical`);
	parts.push(rich ? theme.warn(`${w} warn`) : `${w} warn`);
	parts.push(rich ? theme.muted(`${i} info`) : `${i} info`);
	return parts.join(" · ");
}
function registerSecurityCli(program) {
	program.command("security").description("Audit local config and state for common security foot-guns").addHelpText("after", () => `\n${theme.heading("Examples:")}\n${formatHelpExamples([
		["openclaw security audit", "Run a local security audit."],
		["openclaw security audit --deep", "Include best-effort live Gateway probe checks."],
		["openclaw security audit --deep --token <token>", "Use explicit token for deep probe."],
		["openclaw security audit --deep --password <password>", "Use explicit password for deep probe."],
		["openclaw security audit --fix", "Apply safe remediations and file-permission fixes."],
		["openclaw security audit --json", "Output machine-readable JSON."]
	])}\n\n${theme.muted("Docs:")} ${formatDocsLink("/cli/security", "docs.openclaw.ai/cli/security")}\n`).command("audit").description("Audit config + local state for common security foot-guns").option("--deep", "Attempt live Gateway probe (best-effort)", false).option("--token <token>", "Use explicit gateway token for deep probe auth").option("--password <password>", "Use explicit gateway password for deep probe auth").option("--fix", "Apply safe fixes (tighten defaults + chmod state/config)", false).option("--json", "Print JSON", false).action(async (opts) => {
		const fixResult = opts.fix ? await fixSecurityFootguns().catch((_err) => null) : null;
		const sourceConfig = loadConfig();
		const { resolvedConfig: cfg, diagnostics: secretDiagnostics } = await resolveCommandSecretRefsViaGateway({
			config: sourceConfig,
			commandName: "security audit",
			targetIds: getSecurityAuditCommandSecretTargetIds(),
			mode: "read_only_status"
		});
		const report = await runSecurityAudit({
			config: cfg,
			sourceConfig,
			deep: Boolean(opts.deep),
			includeFilesystem: true,
			includeChannelSecurity: true,
			deepProbeAuth: opts.token?.trim() || opts.password?.trim() ? {
				...opts.token?.trim() ? { token: opts.token } : {},
				...opts.password?.trim() ? { password: opts.password } : {}
			} : void 0
		});
		if (opts.json) {
			defaultRuntime.writeJson(fixResult ? {
				fix: fixResult,
				report,
				secretDiagnostics
			} : {
				...report,
				secretDiagnostics
			});
			return;
		}
		const rich = isRich();
		const heading = (text) => rich ? theme.heading(text) : text;
		const muted = (text) => rich ? theme.muted(text) : text;
		const lines = [];
		lines.push(heading("OpenClaw security audit"));
		lines.push(muted(`Summary: ${formatSummary(report.summary)}`));
		lines.push(muted(`Run deeper: ${formatCliCommand("openclaw security audit --deep")}`));
		for (const diagnostic of secretDiagnostics) lines.push(muted(`[secrets] ${diagnostic}`));
		if (opts.fix) {
			lines.push(muted(`Fix: ${formatCliCommand("openclaw security audit --fix")}`));
			if (!fixResult) lines.push(muted("Fixes: failed to apply (unexpected error)"));
			else if (fixResult.errors.length === 0 && fixResult.changes.length === 0 && fixResult.actions.every((a) => !a.ok)) lines.push(muted("Fixes: no changes applied"));
			else {
				lines.push("");
				lines.push(heading("FIX"));
				for (const change of fixResult.changes) lines.push(muted(`  ${shortenHomeInString(change)}`));
				for (const action of fixResult.actions) {
					if (action.kind === "chmod") {
						const mode = action.mode.toString(8).padStart(3, "0");
						if (action.ok) lines.push(muted(`  chmod ${mode} ${shortenHomePath(action.path)}`));
						else if (action.skipped) lines.push(muted(`  skip chmod ${mode} ${shortenHomePath(action.path)} (${action.skipped})`));
						else if (action.error) lines.push(muted(`  chmod ${mode} ${shortenHomePath(action.path)} failed: ${action.error}`));
						continue;
					}
					const command = shortenHomeInString(action.command);
					if (action.ok) lines.push(muted(`  ${command}`));
					else if (action.skipped) lines.push(muted(`  skip ${command} (${action.skipped})`));
					else if (action.error) lines.push(muted(`  ${command} failed: ${action.error}`));
				}
				if (fixResult.errors.length > 0) for (const err of fixResult.errors) lines.push(muted(`  error: ${shortenHomeInString(err)}`));
			}
		}
		const bySeverity = (sev) => report.findings.filter((f) => f.severity === sev);
		const render = (sev) => {
			const list = bySeverity(sev);
			if (list.length === 0) return;
			const label = sev === "critical" ? rich ? theme.error("CRITICAL") : "CRITICAL" : sev === "warn" ? rich ? theme.warn("WARN") : "WARN" : rich ? theme.muted("INFO") : "INFO";
			lines.push("");
			lines.push(heading(label));
			for (const f of list) {
				lines.push(`${theme.muted(f.checkId)} ${f.title}`);
				lines.push(`  ${f.detail}`);
				if (f.remediation?.trim()) lines.push(`  ${muted(`Fix: ${f.remediation.trim()}`)}`);
			}
		};
		render("critical");
		render("warn");
		render("info");
		defaultRuntime.log(lines.join("\n"));
	});
}
//#endregion
export { registerSecurityCli };
