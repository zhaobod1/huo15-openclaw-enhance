import { n as VERSION } from "./version-Bh_RSQ5Y.js";
import { t as getCoreCliCommandDescriptors } from "./core-command-descriptors-DMNqnfed.js";
import { n as getSubCliEntries } from "./subcli-descriptors-ccHk2lGV.js";
import { t as configureProgramHelp } from "./help-By9yZ4UH.js";
import { t as getPluginCliCommandDescriptors } from "./cli-CdIfYE8N.js";
import { Command } from "commander";
//#region src/cli/program/root-help.ts
async function buildRootHelpProgram(renderOptions) {
	const program = new Command();
	configureProgramHelp(program, {
		programVersion: VERSION,
		channelOptions: [],
		messageChannelOptions: "",
		agentChannelOptions: ""
	});
	const existingCommands = /* @__PURE__ */ new Set();
	for (const command of getCoreCliCommandDescriptors()) {
		program.command(command.name).description(command.description);
		existingCommands.add(command.name);
	}
	for (const command of getSubCliEntries()) {
		if (existingCommands.has(command.name)) continue;
		program.command(command.name).description(command.description);
		existingCommands.add(command.name);
	}
	for (const command of await getPluginCliCommandDescriptors(renderOptions?.config, renderOptions?.env, { pluginSdkResolution: renderOptions?.pluginSdkResolution })) {
		if (existingCommands.has(command.name)) continue;
		program.command(command.name).description(command.description);
		existingCommands.add(command.name);
	}
	return program;
}
async function renderRootHelpText(renderOptions) {
	const program = await buildRootHelpProgram(renderOptions);
	let output = "";
	const originalWrite = process.stdout.write.bind(process.stdout);
	const captureWrite = ((chunk) => {
		output += String(chunk);
		return true;
	});
	process.stdout.write = captureWrite;
	try {
		program.outputHelp();
	} finally {
		process.stdout.write = originalWrite;
	}
	return output;
}
async function outputRootHelp(renderOptions) {
	process.stdout.write(await renderRootHelpText(renderOptions));
}
//#endregion
export { outputRootHelp };
