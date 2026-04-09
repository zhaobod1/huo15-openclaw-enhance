import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { _ as shortenHomePath } from "./utils-ms6h9yny.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { r as theme } from "./theme-BeexRN7S.js";
import { t as hasExplicitOptions } from "./command-options-DpzQ3dYT.js";
import { d as ensureAgentWorkspace, n as DEFAULT_AGENT_WORKSPACE_DIR } from "./workspace-DLW8_PFX.js";
import { h as writeConfigFile, r as createConfigIO } from "./io-CS2J_l4V.js";
import "./config-dzPpvDz6.js";
import "./sessions-D5EF_laP.js";
import { s as resolveSessionTranscriptsDir } from "./paths-UazeViO92.js";
import { n as safeParseWithSchema } from "./zod-parse-SRMZ4WYD.js";
import { n as runCommandWithRuntime } from "./cli-utils-BdKzKa-H.js";
import { n as logConfigUpdated, t as formatConfigPath } from "./logging-BqZycju2.js";
import { t as setupWizardCommand } from "./onboard-Dyh3OcXo.js";
import fs from "node:fs/promises";
import JSON5 from "json5";
import { z } from "zod";
//#region src/commands/setup.ts
const JsonRecordSchema = z.record(z.string(), z.unknown());
async function readConfigFileRaw(configPath) {
	try {
		const raw = await fs.readFile(configPath, "utf-8");
		return {
			exists: true,
			parsed: safeParseWithSchema(JsonRecordSchema, JSON5.parse(raw)) ?? {}
		};
	} catch {
		return {
			exists: false,
			parsed: {}
		};
	}
}
async function setupCommand(opts, runtime = defaultRuntime) {
	const desiredWorkspace = typeof opts?.workspace === "string" && opts.workspace.trim() ? opts.workspace.trim() : void 0;
	const configPath = createConfigIO().configPath;
	const existingRaw = await readConfigFileRaw(configPath);
	const cfg = existingRaw.parsed;
	const defaults = cfg.agents?.defaults ?? {};
	const workspace = desiredWorkspace ?? defaults.workspace ?? DEFAULT_AGENT_WORKSPACE_DIR;
	const next = {
		...cfg,
		agents: {
			...cfg.agents,
			defaults: {
				...defaults,
				workspace
			}
		},
		gateway: {
			...cfg.gateway,
			mode: cfg.gateway?.mode ?? "local"
		}
	};
	if (!existingRaw.exists || defaults.workspace !== workspace || cfg.gateway?.mode !== next.gateway?.mode) {
		await writeConfigFile(next);
		if (!existingRaw.exists) runtime.log(`Wrote ${formatConfigPath(configPath)}`);
		else {
			const updates = [];
			if (defaults.workspace !== workspace) updates.push("set agents.defaults.workspace");
			if (cfg.gateway?.mode !== next.gateway?.mode) updates.push("set gateway.mode");
			logConfigUpdated(runtime, {
				path: configPath,
				suffix: updates.length > 0 ? `(${updates.join(", ")})` : void 0
			});
		}
	} else runtime.log(`Config OK: ${formatConfigPath(configPath)}`);
	const ws = await ensureAgentWorkspace({
		dir: workspace,
		ensureBootstrapFiles: !next.agents?.defaults?.skipBootstrap
	});
	runtime.log(`Workspace OK: ${shortenHomePath(ws.dir)}`);
	const sessionsDir = resolveSessionTranscriptsDir();
	await fs.mkdir(sessionsDir, { recursive: true });
	runtime.log(`Sessions OK: ${shortenHomePath(sessionsDir)}`);
}
//#endregion
//#region src/cli/program/register.setup.ts
function registerSetupCommand(program) {
	program.command("setup").description("Initialize the active OpenClaw config and agent workspace").addHelpText("after", () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/setup", "docs.openclaw.ai/cli/setup")}\n`).option("--workspace <dir>", "Agent workspace directory (default: ~/.openclaw/workspace; stored as agents.defaults.workspace)").option("--wizard", "Run interactive onboarding", false).option("--non-interactive", "Run onboarding without prompts", false).option("--mode <mode>", "Onboard mode: local|remote").option("--remote-url <url>", "Remote Gateway WebSocket URL").option("--remote-token <token>", "Remote Gateway token (optional)").action(async (opts, command) => {
		await runCommandWithRuntime(defaultRuntime, async () => {
			const hasWizardFlags = hasExplicitOptions(command, [
				"wizard",
				"nonInteractive",
				"mode",
				"remoteUrl",
				"remoteToken"
			]);
			if (opts.wizard || hasWizardFlags) {
				await setupWizardCommand({
					workspace: opts.workspace,
					nonInteractive: Boolean(opts.nonInteractive),
					mode: opts.mode,
					remoteUrl: opts.remoteUrl,
					remoteToken: opts.remoteToken
				}, defaultRuntime);
				return;
			}
			await setupCommand({ workspace: opts.workspace }, defaultRuntime);
		});
	});
}
//#endregion
export { registerSetupCommand };
