import { O as getPrimaryCommand, j as hasHelpOrVersion } from "./logger-C-bijuBQ.js";
import { n as removeCommandByName, t as registerLazyCommand } from "./register-lazy-command-BooiHQbr.js";
import { t as getCoreCliCommandDescriptors } from "./core-command-descriptors-DMNqnfed.js";
import { i as registerSubCliCommands } from "./register.subclis-BEIRPyMJ.js";
//#region src/cli/program/command-registry.ts
const shouldRegisterCorePrimaryOnly = (argv) => {
	if (hasHelpOrVersion(argv)) return false;
	return true;
};
const coreEntries = [
	{
		commands: [{
			name: "setup",
			description: "Initialize local config and agent workspace",
			hasSubcommands: false
		}],
		register: async ({ program }) => {
			(await import("./register.setup-B6wgWVWx.js")).registerSetupCommand(program);
		}
	},
	{
		commands: [{
			name: "onboard",
			description: "Interactive onboarding for gateway, workspace, and skills",
			hasSubcommands: false
		}],
		register: async ({ program }) => {
			(await import("./register.onboard-DGsCUA4U.js")).registerOnboardCommand(program);
		}
	},
	{
		commands: [{
			name: "configure",
			description: "Interactive configuration for credentials, channels, gateway, and agent defaults",
			hasSubcommands: false
		}],
		register: async ({ program }) => {
			(await import("./register.configure-D0Px5GfB.js")).registerConfigureCommand(program);
		}
	},
	{
		commands: [{
			name: "config",
			description: "Non-interactive config helpers (get/set/unset/file/validate). Default: starts guided setup.",
			hasSubcommands: true
		}],
		register: async ({ program }) => {
			(await import("./config-cli-DkFEov2s.js")).registerConfigCli(program);
		}
	},
	{
		commands: [{
			name: "backup",
			description: "Create and verify local backup archives for OpenClaw state",
			hasSubcommands: true
		}],
		register: async ({ program }) => {
			(await import("./register.backup-DYD5DilC.js")).registerBackupCommand(program);
		}
	},
	{
		commands: [
			{
				name: "doctor",
				description: "Health checks + quick fixes for the gateway and channels",
				hasSubcommands: false
			},
			{
				name: "dashboard",
				description: "Open the Control UI with your current token",
				hasSubcommands: false
			},
			{
				name: "reset",
				description: "Reset local config/state (keeps the CLI installed)",
				hasSubcommands: false
			},
			{
				name: "uninstall",
				description: "Uninstall the gateway service + local data (CLI remains)",
				hasSubcommands: false
			}
		],
		register: async ({ program }) => {
			(await import("./register.maintenance-zZQvKluB.js")).registerMaintenanceCommands(program);
		}
	},
	{
		commands: [{
			name: "message",
			description: "Send, read, and manage messages",
			hasSubcommands: true
		}],
		register: async ({ program, ctx }) => {
			(await import("./register.message-BZtBk61s.js")).registerMessageCommands(program, ctx);
		}
	},
	{
		commands: [{
			name: "mcp",
			description: "Manage OpenClaw MCP config and channel bridge",
			hasSubcommands: true
		}],
		register: async ({ program }) => {
			(await import("./mcp-cli-D7usQujE.js")).registerMcpCli(program);
		}
	},
	{
		commands: [{
			name: "agent",
			description: "Run one agent turn via the Gateway",
			hasSubcommands: false
		}, {
			name: "agents",
			description: "Manage isolated agents (workspaces, auth, routing)",
			hasSubcommands: true
		}],
		register: async ({ program, ctx }) => {
			(await import("./register.agent-pG6HVfhZ.js")).registerAgentCommands(program, { agentChannelOptions: ctx.agentChannelOptions });
		}
	},
	{
		commands: [
			{
				name: "status",
				description: "Show channel health and recent session recipients",
				hasSubcommands: false
			},
			{
				name: "health",
				description: "Fetch health from the running gateway",
				hasSubcommands: false
			},
			{
				name: "sessions",
				description: "List stored conversation sessions",
				hasSubcommands: true
			},
			{
				name: "tasks",
				description: "Inspect durable background task state",
				hasSubcommands: true
			}
		],
		register: async ({ program }) => {
			(await import("./register.status-health-sessions-DdgnE3BH.js")).registerStatusHealthSessionsCommands(program);
		}
	}
];
function getCoreCliCommandNames() {
	return getCoreCliCommandDescriptors().map((command) => command.name);
}
function removeEntryCommands(program, entry) {
	for (const cmd of entry.commands) removeCommandByName(program, cmd.name);
}
function registerLazyCoreCommand(program, ctx, entry, command) {
	registerLazyCommand({
		program,
		name: command.name,
		description: command.description,
		removeNames: entry.commands.map((cmd) => cmd.name),
		register: async () => {
			await entry.register({
				program,
				ctx,
				argv: process.argv
			});
		}
	});
}
async function registerCoreCliByName(program, ctx, name, argv = process.argv) {
	const entry = coreEntries.find((candidate) => candidate.commands.some((cmd) => cmd.name === name));
	if (!entry) return false;
	removeEntryCommands(program, entry);
	await entry.register({
		program,
		ctx,
		argv
	});
	return true;
}
function registerCoreCliCommands(program, ctx, argv) {
	const primary = getPrimaryCommand(argv);
	if (primary && shouldRegisterCorePrimaryOnly(argv)) {
		const entry = coreEntries.find((candidate) => candidate.commands.some((cmd) => cmd.name === primary));
		if (entry) {
			const cmd = entry.commands.find((c) => c.name === primary);
			if (cmd) registerLazyCoreCommand(program, ctx, entry, cmd);
			return;
		}
	}
	for (const entry of coreEntries) for (const cmd of entry.commands) registerLazyCoreCommand(program, ctx, entry, cmd);
}
function registerProgramCommands(program, ctx, argv = process.argv) {
	registerCoreCliCommands(program, ctx, argv);
	registerSubCliCommands(program, argv);
}
//#endregion
export { registerProgramCommands as i, registerCoreCliByName as n, registerCoreCliCommands as r, getCoreCliCommandNames as t };
