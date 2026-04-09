import { t as resolveNodeStartupTlsEnvironment } from "./node-startup-env-Gz8ZQniA.js";
import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { r as theme } from "./theme-BeexRN7S.js";
import { n as inheritOptionFromParent } from "./command-options-DpzQ3dYT.js";
import { u as resolveGatewayPort } from "./paths-yyDPxM31.js";
import { c as readBestEffortConfig } from "./io-CS2J_l4V.js";
import "./config-dzPpvDz6.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { n as buildGatewayInstallPlan, t as resolveGatewayInstallToken } from "./gateway-install-token-PhLaF6wF.js";
import { r as isGatewayDaemonRuntime, t as DEFAULT_GATEWAY_DAEMON_RUNTIME } from "./daemon-runtime-BhzkNvfv.js";
import { i as probeGateway } from "./probe-Cv3pJ1Va.js";
import { i as launchAgentPlistExists, s as repairLaunchAgentBootstrap } from "./launchd-B_8Jeu7m.js";
import { d as formatGatewayPidList, f as signalVerifiedGatewayPidSync, u as findVerifiedGatewayListenerPidsOnPortSync } from "./schtasks-CyZGdFta.js";
import { n as isNonFatalSystemdInstallProbeError } from "./systemd-ByeaoXxy.js";
import { r as resolveGatewayService } from "./service-DO4b04e2.js";
import { h as installDaemonServiceAndEmit, l as renderGatewayServiceStartHints, n as createDaemonInstallActionContext, p as buildDaemonServiceSnapshot, r as failIfNixDaemonInstallMode, s as parsePortFromArgs } from "./shared-DbEFE2sP.js";
import { t as parsePort } from "./parse-port-DpUYrM0p.js";
import { r as isRestartEnabled } from "./commands-CjGDOH-W.js";
import { i as runServiceUninstall, n as runServiceStart, r as runServiceStop, t as runServiceRestart } from "./lifecycle-core-d0r6RbUM.js";
import { a as renderGatewayPortHealthDiagnostics, c as waitForGatewayHealthyListener, l as waitForGatewayHealthyRestart, o as renderRestartDiagnostics, s as terminateStaleGatewayPids, t as DEFAULT_RESTART_HEALTH_ATTEMPTS } from "./restart-health-BqFPQyk_.js";
import { t as runDaemonStatus } from "./status-vYsUeUUI.js";
//#region src/cli/daemon-cli/install.ts
function mergeInstallInvocationEnv(params) {
	if (!params.existingServiceEnv || Object.keys(params.existingServiceEnv).length === 0) return params.env;
	return {
		...params.existingServiceEnv,
		...params.env
	};
}
async function runDaemonInstall(opts) {
	const { json, stdout, warnings, emit, fail } = createDaemonInstallActionContext(opts.json);
	if (failIfNixDaemonInstallMode(fail)) return;
	const cfg = await readBestEffortConfig();
	const portOverride = parsePort(opts.port);
	if (opts.port !== void 0 && portOverride === null) {
		fail("Invalid port");
		return;
	}
	const port = portOverride ?? resolveGatewayPort(cfg);
	if (!Number.isFinite(port) || port <= 0) {
		fail("Invalid port");
		return;
	}
	const runtimeRaw = opts.runtime ? String(opts.runtime) : DEFAULT_GATEWAY_DAEMON_RUNTIME;
	if (!isGatewayDaemonRuntime(runtimeRaw)) {
		fail("Invalid --runtime (use \"node\" or \"bun\")");
		return;
	}
	const service = resolveGatewayService();
	let loaded = false;
	let existingServiceEnv;
	try {
		loaded = await service.isLoaded({ env: process.env });
	} catch (err) {
		if (isNonFatalSystemdInstallProbeError(err)) loaded = false;
		else {
			fail(`Gateway service check failed: ${String(err)}`);
			return;
		}
	}
	if (loaded) existingServiceEnv = (await service.readCommand(process.env).catch(() => null))?.environment;
	const installEnv = mergeInstallInvocationEnv({
		env: process.env,
		existingServiceEnv
	});
	if (loaded) {
		if (!opts.force) if (await gatewayServiceNeedsAutoNodeExtraCaCertsRefresh({
			service,
			env: process.env
		})) {
			const message = "Gateway service is missing the nvm TLS CA bundle; refreshing the install.";
			if (json) warnings.push(message);
			else defaultRuntime.log(message);
		} else {
			emit({
				ok: true,
				result: "already-installed",
				message: `Gateway service already ${service.loadedText}.`,
				service: buildDaemonServiceSnapshot(service, loaded)
			});
			if (!json) {
				defaultRuntime.log(`Gateway service already ${service.loadedText}.`);
				defaultRuntime.log(`Reinstall with: ${formatCliCommand("openclaw gateway install --force")}`);
			}
			return;
		}
	}
	const tokenResolution = await resolveGatewayInstallToken({
		config: cfg,
		env: installEnv,
		explicitToken: opts.token,
		autoGenerateWhenMissing: true,
		persistGeneratedToken: true
	});
	if (tokenResolution.unavailableReason) {
		fail(`Gateway install blocked: ${tokenResolution.unavailableReason}`);
		return;
	}
	for (const warning of tokenResolution.warnings) if (json) warnings.push(warning);
	else defaultRuntime.log(warning);
	const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
		env: installEnv,
		port,
		runtime: runtimeRaw,
		warn: (message) => {
			if (json) warnings.push(message);
			else defaultRuntime.log(message);
		},
		config: cfg
	});
	await installDaemonServiceAndEmit({
		serviceNoun: "Gateway",
		service,
		warnings,
		emit,
		fail,
		install: async () => {
			await service.install({
				env: installEnv,
				stdout,
				programArguments,
				workingDirectory,
				environment
			});
		}
	});
}
async function gatewayServiceNeedsAutoNodeExtraCaCertsRefresh(params) {
	try {
		const currentCommand = await params.service.readCommand(params.env);
		if (!currentCommand) return false;
		const currentExecPath = currentCommand.programArguments[0]?.trim();
		if (!currentExecPath) return false;
		const currentEnvironment = currentCommand.environment ?? {};
		const currentNodeExtraCaCerts = currentEnvironment.NODE_EXTRA_CA_CERTS?.trim();
		const expectedNodeExtraCaCerts = resolveNodeStartupTlsEnvironment({
			env: {
				...params.env,
				...currentEnvironment,
				NODE_EXTRA_CA_CERTS: void 0
			},
			execPath: currentExecPath,
			includeDarwinDefaults: false
		}).NODE_EXTRA_CA_CERTS;
		if (!expectedNodeExtraCaCerts) return false;
		return currentNodeExtraCaCerts !== expectedNodeExtraCaCerts;
	} catch {
		return false;
	}
}
//#endregion
//#region src/cli/daemon-cli/launchd-recovery.ts
const LAUNCH_AGENT_RECOVERY_MESSAGE = "Gateway LaunchAgent was installed but not loaded; re-bootstrapped launchd service.";
async function recoverInstalledLaunchAgent(params) {
	if (process.platform !== "darwin") return null;
	const env = params.env ?? process.env;
	if (!await launchAgentPlistExists(env).catch(() => false)) return null;
	if (!(await repairLaunchAgentBootstrap({ env }).catch(() => ({
		ok: false,
		status: "bootstrap-failed"
	}))).ok) return null;
	return {
		result: params.result,
		loaded: true,
		message: LAUNCH_AGENT_RECOVERY_MESSAGE
	};
}
//#endregion
//#region src/cli/daemon-cli/lifecycle.ts
const POST_RESTART_HEALTH_ATTEMPTS = DEFAULT_RESTART_HEALTH_ATTEMPTS;
const POST_RESTART_HEALTH_DELAY_MS = 500;
function formatRestartFailure(params) {
	if (params.health.waitOutcome === "stopped-free") {
		const elapsedSeconds = Math.max(1, Math.round((params.health.elapsedMs ?? 0) / 1e3));
		return {
			statusLine: `Gateway restart failed after ${elapsedSeconds}s: service stayed stopped and port ${params.port} stayed free.`,
			failMessage: `Gateway restart failed after ${elapsedSeconds}s: service stayed stopped and health checks never came up.`
		};
	}
	return {
		statusLine: `Timed out after ${params.timeoutSeconds}s waiting for gateway port ${params.port} to become healthy.`,
		failMessage: `Gateway restart timed out after ${params.timeoutSeconds}s waiting for health checks.`
	};
}
async function resolveGatewayLifecyclePort(service = resolveGatewayService()) {
	const command = await service.readCommand(process.env).catch(() => null);
	const serviceEnv = command?.environment ?? void 0;
	const mergedEnv = {
		...process.env,
		...serviceEnv ?? void 0
	};
	return parsePortFromArgs(command?.programArguments) ?? resolveGatewayPort(await readBestEffortConfig(), mergedEnv);
}
function resolveGatewayPortFallback() {
	return readBestEffortConfig().then((cfg) => resolveGatewayPort(cfg, process.env)).catch(() => resolveGatewayPort(void 0, process.env));
}
async function assertUnmanagedGatewayRestartEnabled(port) {
	const probe = await probeGateway({
		url: `${!!(await readBestEffortConfig().catch(() => void 0))?.gateway?.tls?.enabled ? "wss" : "ws"}://127.0.0.1:${port}`,
		auth: {
			token: process.env.OPENCLAW_GATEWAY_TOKEN?.trim() || void 0,
			password: process.env.OPENCLAW_GATEWAY_PASSWORD?.trim() || void 0
		},
		timeoutMs: 1e3
	}).catch(() => null);
	if (!probe?.ok) return;
	if (!isRestartEnabled(probe.configSnapshot)) throw new Error("Gateway restart is disabled in the running gateway config (commands.restart=false); unmanaged SIGUSR1 restart would be ignored");
}
function resolveVerifiedGatewayListenerPids(port) {
	return findVerifiedGatewayListenerPidsOnPortSync(port).filter((pid) => Number.isFinite(pid) && pid > 0);
}
async function stopGatewayWithoutServiceManager(port) {
	const pids = resolveVerifiedGatewayListenerPids(port);
	if (pids.length === 0) return null;
	for (const pid of pids) signalVerifiedGatewayPidSync(pid, "SIGTERM");
	return {
		result: "stopped",
		message: `Gateway stop signal sent to unmanaged process${pids.length === 1 ? "" : "es"} on port ${port}: ${formatGatewayPidList(pids)}.`
	};
}
async function restartGatewayWithoutServiceManager(port) {
	await assertUnmanagedGatewayRestartEnabled(port);
	const pids = resolveVerifiedGatewayListenerPids(port);
	if (pids.length === 0) return null;
	if (pids.length > 1) throw new Error(`multiple gateway processes are listening on port ${port}: ${formatGatewayPidList(pids)}; use "openclaw gateway status --deep" before retrying restart`);
	signalVerifiedGatewayPidSync(pids[0], "SIGUSR1");
	return {
		result: "restarted",
		message: `Gateway restart signal sent to unmanaged process on port ${port}: ${pids[0]}.`
	};
}
async function runDaemonUninstall(opts = {}) {
	return await runServiceUninstall({
		serviceNoun: "Gateway",
		service: resolveGatewayService(),
		opts,
		stopBeforeUninstall: true,
		assertNotLoadedAfterUninstall: true
	});
}
async function runDaemonStart(opts = {}) {
	return await runServiceStart({
		serviceNoun: "Gateway",
		service: resolveGatewayService(),
		renderStartHints: renderGatewayServiceStartHints,
		onNotLoaded: process.platform === "darwin" ? async () => await recoverInstalledLaunchAgent({ result: "started" }) : void 0,
		opts
	});
}
async function runDaemonStop(opts = {}) {
	const service = resolveGatewayService();
	const gatewayPort = await resolveGatewayLifecyclePort(service).catch(() => resolveGatewayPortFallback());
	return await runServiceStop({
		serviceNoun: "Gateway",
		service,
		opts,
		onNotLoaded: async () => stopGatewayWithoutServiceManager(gatewayPort)
	});
}
/**
* Restart the gateway service service.
* @returns `true` if restart succeeded, `false` if the service was not loaded.
* Throws/exits on check or restart failures.
*/
async function runDaemonRestart(opts = {}) {
	const json = Boolean(opts.json);
	const service = resolveGatewayService();
	let restartedWithoutServiceManager = false;
	const restartPort = await resolveGatewayLifecyclePort(service).catch(() => resolveGatewayPortFallback());
	const restartWaitMs = POST_RESTART_HEALTH_ATTEMPTS * POST_RESTART_HEALTH_DELAY_MS;
	const restartWaitSeconds = Math.round(restartWaitMs / 1e3);
	return await runServiceRestart({
		serviceNoun: "Gateway",
		service,
		renderStartHints: renderGatewayServiceStartHints,
		opts,
		checkTokenDrift: true,
		onNotLoaded: async () => {
			const handled = await restartGatewayWithoutServiceManager(restartPort);
			if (handled) {
				restartedWithoutServiceManager = true;
				return handled;
			}
			return await recoverInstalledLaunchAgent({ result: "restarted" });
		},
		postRestartCheck: async ({ warnings, fail, stdout }) => {
			if (restartedWithoutServiceManager) {
				const health = await waitForGatewayHealthyListener({
					port: restartPort,
					attempts: POST_RESTART_HEALTH_ATTEMPTS,
					delayMs: POST_RESTART_HEALTH_DELAY_MS
				});
				if (health.healthy) return;
				const diagnostics = renderGatewayPortHealthDiagnostics(health);
				const timeoutLine = `Timed out after ${restartWaitSeconds}s waiting for gateway port ${restartPort} to become healthy.`;
				if (!json) {
					defaultRuntime.log(theme.warn(timeoutLine));
					for (const line of diagnostics) defaultRuntime.log(theme.muted(line));
				} else {
					warnings.push(timeoutLine);
					warnings.push(...diagnostics);
				}
				fail(`Gateway restart timed out after ${restartWaitSeconds}s waiting for health checks.`, [formatCliCommand("openclaw gateway status --deep"), formatCliCommand("openclaw doctor")]);
			}
			let health = await waitForGatewayHealthyRestart({
				service,
				port: restartPort,
				attempts: POST_RESTART_HEALTH_ATTEMPTS,
				delayMs: POST_RESTART_HEALTH_DELAY_MS,
				includeUnknownListenersAsStale: process.platform === "win32"
			});
			if (!health.healthy && health.staleGatewayPids.length > 0) {
				const staleMsg = `Found stale gateway process(es): ${health.staleGatewayPids.join(", ")}.`;
				warnings.push(staleMsg);
				if (!json) {
					defaultRuntime.log(theme.warn(staleMsg));
					defaultRuntime.log(theme.muted("Stopping stale process(es) and retrying restart..."));
				}
				await terminateStaleGatewayPids(health.staleGatewayPids);
				const retryRestart = await service.restart({
					env: process.env,
					stdout
				});
				if (retryRestart.outcome === "scheduled") return retryRestart;
				health = await waitForGatewayHealthyRestart({
					service,
					port: restartPort,
					attempts: POST_RESTART_HEALTH_ATTEMPTS,
					delayMs: POST_RESTART_HEALTH_DELAY_MS,
					includeUnknownListenersAsStale: process.platform === "win32"
				});
			}
			if (health.healthy) return;
			const diagnostics = renderRestartDiagnostics(health);
			const failure = formatRestartFailure({
				health,
				port: restartPort,
				timeoutSeconds: restartWaitSeconds
			});
			const runningNoPortLine = health.runtime.status === "running" && health.portUsage.status === "free" ? `Gateway process is running but port ${restartPort} is still free (startup hang/crash loop or very slow VM startup).` : null;
			if (!json) {
				defaultRuntime.log(theme.warn(failure.statusLine));
				if (runningNoPortLine) defaultRuntime.log(theme.warn(runningNoPortLine));
				for (const line of diagnostics) defaultRuntime.log(theme.muted(line));
			} else {
				warnings.push(failure.statusLine);
				if (runningNoPortLine) warnings.push(runningNoPortLine);
				warnings.push(...diagnostics);
			}
			fail(failure.failMessage, [formatCliCommand("openclaw gateway status --deep"), formatCliCommand("openclaw doctor")]);
		}
	});
}
//#endregion
//#region src/cli/daemon-cli/register-service-commands.ts
function resolveInstallOptions(cmdOpts, command) {
	const parentForce = inheritOptionFromParent(command, "force");
	const parentPort = inheritOptionFromParent(command, "port");
	const parentToken = inheritOptionFromParent(command, "token");
	return {
		...cmdOpts,
		force: Boolean(cmdOpts.force || parentForce),
		port: cmdOpts.port ?? parentPort,
		token: cmdOpts.token ?? parentToken
	};
}
function resolveRpcOptions(cmdOpts, command) {
	const parentToken = inheritOptionFromParent(command, "token");
	const parentPassword = inheritOptionFromParent(command, "password");
	return {
		...cmdOpts,
		token: cmdOpts.token ?? parentToken,
		password: cmdOpts.password ?? parentPassword
	};
}
function addGatewayServiceCommands(parent, opts) {
	parent.command("status").description(opts?.statusDescription ?? "Show gateway service status + probe the Gateway").option("--url <url>", "Gateway WebSocket URL (defaults to config/remote/local)").option("--token <token>", "Gateway token (if required)").option("--password <password>", "Gateway password (password auth)").option("--timeout <ms>", "Timeout in ms", "10000").option("--no-probe", "Skip RPC probe").option("--require-rpc", "Exit non-zero when the RPC probe fails", false).option("--deep", "Scan system-level services", false).option("--json", "Output JSON", false).action(async (cmdOpts, command) => {
		await runDaemonStatus({
			rpc: resolveRpcOptions(cmdOpts, command),
			probe: Boolean(cmdOpts.probe),
			requireRpc: Boolean(cmdOpts.requireRpc),
			deep: Boolean(cmdOpts.deep),
			json: Boolean(cmdOpts.json)
		});
	});
	parent.command("install").description("Install the Gateway service (launchd/systemd/schtasks)").option("--port <port>", "Gateway port").option("--runtime <runtime>", "Daemon runtime (node|bun). Default: node").option("--token <token>", "Gateway token (token auth)").option("--force", "Reinstall/overwrite if already installed", false).option("--json", "Output JSON", false).action(async (cmdOpts, command) => {
		await runDaemonInstall(resolveInstallOptions(cmdOpts, command));
	});
	parent.command("uninstall").description("Uninstall the Gateway service (launchd/systemd/schtasks)").option("--json", "Output JSON", false).action(async (cmdOpts) => {
		await runDaemonUninstall(cmdOpts);
	});
	parent.command("start").description("Start the Gateway service (launchd/systemd/schtasks)").option("--json", "Output JSON", false).action(async (cmdOpts) => {
		await runDaemonStart(cmdOpts);
	});
	parent.command("stop").description("Stop the Gateway service (launchd/systemd/schtasks)").option("--json", "Output JSON", false).action(async (cmdOpts) => {
		await runDaemonStop(cmdOpts);
	});
	parent.command("restart").description("Restart the Gateway service (launchd/systemd/schtasks)").option("--json", "Output JSON", false).action(async (cmdOpts) => {
		await runDaemonRestart(cmdOpts);
	});
}
//#endregion
//#region src/cli/daemon-cli/register.ts
function registerDaemonCli(program) {
	addGatewayServiceCommands(program.command("daemon").description("Manage the Gateway service (launchd/systemd/schtasks)").addHelpText("after", () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/gateway", "docs.openclaw.ai/cli/gateway")}\n`), { statusDescription: "Show service install status + probe the Gateway" });
}
//#endregion
export { runDaemonStop as a, runDaemonStart as i, addGatewayServiceCommands as n, runDaemonUninstall as o, runDaemonRestart as r, runDaemonInstall as s, registerDaemonCli as t };
