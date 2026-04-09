//#region extensions/qa-lab/src/cli.ts
let qaLabCliRuntimePromise = null;
async function loadQaLabCliRuntime() {
	qaLabCliRuntimePromise ??= import("./cli.runtime-Cl5-SDN_.js");
	return await qaLabCliRuntimePromise;
}
async function runQaSelfCheck(opts) {
	await (await loadQaLabCliRuntime()).runQaLabSelfCheckCommand(opts);
}
async function runQaSuite(opts) {
	await (await loadQaLabCliRuntime()).runQaSuiteCommand(opts);
}
async function runQaUi(opts) {
	await (await loadQaLabCliRuntime()).runQaLabUiCommand(opts);
}
async function runQaDockerScaffold(opts) {
	await (await loadQaLabCliRuntime()).runQaDockerScaffoldCommand(opts);
}
async function runQaDockerBuildImage(opts) {
	await (await loadQaLabCliRuntime()).runQaDockerBuildImageCommand(opts);
}
async function runQaMockOpenAi(opts) {
	await (await loadQaLabCliRuntime()).runQaMockOpenAiCommand(opts);
}
function registerQaLabCli(program) {
	const qa = program.command("qa").description("Run private QA automation flows and launch the QA debugger");
	qa.command("run").description("Run the bundled QA self-check and write a Markdown report").option("--output <path>", "Report output path").action(async (opts) => {
		await runQaSelfCheck(opts);
	});
	qa.command("suite").description("Run all repo-backed QA scenarios against the real QA gateway lane").option("--output-dir <path>", "Suite artifact directory").option("--provider-mode <mode>", "Provider mode: mock-openai or live-openai", "mock-openai").option("--model <ref>", "Primary provider/model ref").option("--alt-model <ref>", "Alternate provider/model ref").option("--fast", "Enable provider fast mode where supported", false).action(async (opts) => {
		await runQaSuite({
			outputDir: opts.outputDir,
			providerMode: opts.providerMode,
			primaryModel: opts.model,
			alternateModel: opts.altModel,
			fastMode: opts.fast
		});
	});
	qa.command("ui").description("Start the private QA debugger UI and local QA bus").option("--host <host>", "Bind host", "127.0.0.1").option("--port <port>", "Bind port", (value) => Number(value)).option("--advertise-host <host>", "Optional public host to advertise in bootstrap payloads").option("--advertise-port <port>", "Optional public port to advertise", (value) => Number(value)).option("--control-ui-url <url>", "Optional Control UI URL to embed beside the QA panel").option("--control-ui-token <token>", "Optional Control UI token for embedded links").option("--control-ui-proxy-target <url>", "Optional upstream Control UI target for /control-ui proxying").option("--auto-kickoff-target <kind>", "Kickoff default target (direct or channel)").option("--embedded-gateway <mode>", "Embedded gateway mode hint", "enabled").option("--send-kickoff-on-start", "Inject the repo-backed kickoff task when the UI starts", false).action(async (opts) => {
		await runQaUi(opts);
	});
	qa.command("docker-scaffold").description("Write a prebaked Docker scaffold for the QA dashboard + gateway lane").requiredOption("--output-dir <path>", "Output directory for docker-compose + state files").option("--gateway-port <port>", "Gateway host port", (value) => Number(value)).option("--qa-lab-port <port>", "QA lab host port", (value) => Number(value)).option("--provider-base-url <url>", "Provider base URL for the QA gateway").option("--image <name>", "Prebaked image name", "openclaw:qa-local-prebaked").option("--use-prebuilt-image", "Use image: instead of build: in docker-compose", false).action(async (opts) => {
		await runQaDockerScaffold(opts);
	});
	qa.command("docker-build-image").description("Build the prebaked QA Docker image with qa-channel + qa-lab bundled").option("--image <name>", "Image tag", "openclaw:qa-local-prebaked").action(async (opts) => {
		await runQaDockerBuildImage(opts);
	});
	qa.command("mock-openai").description("Run the local mock OpenAI Responses API server for QA").option("--host <host>", "Bind host", "127.0.0.1").option("--port <port>", "Bind port", (value) => Number(value)).action(async (opts) => {
		await runQaMockOpenAi(opts);
	});
}
//#endregion
export { registerQaLabCli as t };
