import { a as writeQaDockerHarnessFiles, i as buildQaDockerHarnessImage, r as startQaMockOpenAiServer, t as runQaSuite, u as startQaLabServer } from "./suite-wiaQ0zRW.js";
import path from "node:path";
//#region extensions/qa-lab/src/cli.runtime.ts
async function runQaLabSelfCheckCommand(opts) {
	const server = await startQaLabServer({ outputPath: opts.output });
	try {
		const result = await server.runSelfCheck();
		process.stdout.write(`QA self-check report: ${result.outputPath}\n`);
	} finally {
		await server.stop();
	}
}
async function runQaSuiteCommand(opts) {
	const result = await runQaSuite({
		outputDir: opts.outputDir ? path.resolve(opts.outputDir) : void 0,
		providerMode: opts.providerMode,
		primaryModel: opts.primaryModel,
		alternateModel: opts.alternateModel,
		fastMode: opts.fastMode
	});
	process.stdout.write(`QA suite watch: ${result.watchUrl}\n`);
	process.stdout.write(`QA suite report: ${result.reportPath}\n`);
	process.stdout.write(`QA suite summary: ${result.summaryPath}\n`);
}
async function runQaLabUiCommand(opts) {
	const server = await startQaLabServer({
		host: opts.host,
		port: Number.isFinite(opts.port) ? opts.port : void 0,
		advertiseHost: opts.advertiseHost,
		advertisePort: Number.isFinite(opts.advertisePort) ? opts.advertisePort : void 0,
		controlUiUrl: opts.controlUiUrl,
		controlUiToken: opts.controlUiToken,
		controlUiProxyTarget: opts.controlUiProxyTarget,
		autoKickoffTarget: opts.autoKickoffTarget,
		embeddedGateway: opts.embeddedGateway,
		sendKickoffOnStart: opts.sendKickoffOnStart
	});
	process.stdout.write(`QA Lab UI: ${server.baseUrl}\n`);
	process.stdout.write("Press Ctrl+C to stop.\n");
	const shutdown = async () => {
		process.off("SIGINT", onSignal);
		process.off("SIGTERM", onSignal);
		await server.stop();
		process.exit(0);
	};
	const onSignal = () => {
		shutdown();
	};
	process.on("SIGINT", onSignal);
	process.on("SIGTERM", onSignal);
	await new Promise(() => void 0);
}
async function runQaDockerScaffoldCommand(opts) {
	const result = await writeQaDockerHarnessFiles({
		outputDir: path.resolve(opts.outputDir),
		repoRoot: process.cwd(),
		gatewayPort: Number.isFinite(opts.gatewayPort) ? opts.gatewayPort : void 0,
		qaLabPort: Number.isFinite(opts.qaLabPort) ? opts.qaLabPort : void 0,
		providerBaseUrl: opts.providerBaseUrl,
		imageName: opts.image,
		usePrebuiltImage: opts.usePrebuiltImage
	});
	process.stdout.write(`QA docker scaffold: ${result.outputDir}\n`);
}
async function runQaDockerBuildImageCommand(opts) {
	const result = await buildQaDockerHarnessImage({
		repoRoot: process.cwd(),
		imageName: opts.image
	});
	process.stdout.write(`QA docker image: ${result.imageName}\n`);
}
async function runQaMockOpenAiCommand(opts) {
	const server = await startQaMockOpenAiServer({
		host: opts.host,
		port: Number.isFinite(opts.port) ? opts.port : void 0
	});
	process.stdout.write(`QA mock OpenAI: ${server.baseUrl}\n`);
	process.stdout.write("Press Ctrl+C to stop.\n");
	const shutdown = async () => {
		process.off("SIGINT", onSignal);
		process.off("SIGTERM", onSignal);
		await server.stop();
		process.exit(0);
	};
	const onSignal = () => {
		shutdown();
	};
	process.on("SIGINT", onSignal);
	process.on("SIGTERM", onSignal);
	await new Promise(() => void 0);
}
//#endregion
export { runQaDockerBuildImageCommand, runQaDockerScaffoldCommand, runQaLabSelfCheckCommand, runQaLabUiCommand, runQaMockOpenAiCommand, runQaSuiteCommand };
