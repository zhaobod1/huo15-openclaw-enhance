import { _ as resolveAgentCommand, g as DEFAULT_AGENT_NAME, t as AcpClient } from "./acp-client-DOkp1hpf.js";
//#region extensions/acpx/src/health/probe.ts
function toSdkMcpServers(config) {
	return Object.entries(config.mcpServers).map(([name, server]) => ({
		name,
		command: server.command,
		args: [...server.args ?? []],
		env: Object.entries(server.env ?? {}).map(([envName, value]) => ({
			name: envName,
			value
		}))
	}));
}
function resolveProbeAgentName(config) {
	return DEFAULT_AGENT_NAME;
}
async function probeEmbeddedRuntime(config) {
	const agentName = resolveProbeAgentName(config);
	const agentCommand = resolveAgentCommand(agentName, config.agents);
	const client = new AcpClient({
		agentCommand,
		cwd: config.cwd,
		mcpServers: toSdkMcpServers(config),
		permissionMode: config.permissionMode,
		nonInteractivePermissions: config.nonInteractivePermissions,
		verbose: false
	});
	try {
		await client.start();
		return {
			ok: true,
			message: "embedded ACP runtime ready",
			details: [
				`agent=${agentName}`,
				`command=${agentCommand}`,
				`cwd=${config.cwd}`,
				`stateDir=${config.stateDir}`,
				...client.initializeResult?.protocolVersion ? [`protocolVersion=${client.initializeResult.protocolVersion}`] : []
			]
		};
	} catch (error) {
		return {
			ok: false,
			message: "embedded ACP runtime probe failed",
			details: [
				`agent=${agentName}`,
				`command=${agentCommand}`,
				`cwd=${config.cwd}`,
				`stateDir=${config.stateDir}`,
				error instanceof Error ? error.message : String(error)
			]
		};
	} finally {
		await client.close().catch(() => {});
	}
}
//#endregion
export { probeEmbeddedRuntime };
