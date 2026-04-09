import { t as detectBinary } from "./detect-binary-B5tovLqI.js";
import { J as setSetupChannelEnabled } from "./setup-wizard-helpers-ecC16ic3.js";
import { l as createDetectedBinaryStatus } from "./setup-wizard-proxy-CnO9z2dq.js";
import "./setup-Dp8bIdbL.js";
import "./setup-tools-DC-2q-4o.js";
import { i as resolveSignalAccount, n as listSignalAccountIds } from "./accounts-Djmr8-2w.js";
import { a as signalDmPolicy, i as signalCompletionNote, o as signalNumberTextInput, t as createSignalCliPathTextInput } from "./setup-core-ngfuiQCB.js";
import { n as installSignalCli } from "./install-signal-cli-PhpwGNBy.js";
//#region extensions/signal/src/setup-surface.ts
const channel = "signal";
//#endregion
//#region extensions/signal/src/channel.runtime.ts
const signalSetupWizard = {
	channel,
	status: createDetectedBinaryStatus({
		channelLabel: "Signal",
		binaryLabel: "signal-cli",
		configuredLabel: "configured",
		unconfiguredLabel: "needs setup",
		configuredHint: "signal-cli found",
		unconfiguredHint: "signal-cli missing",
		configuredScore: 1,
		unconfiguredScore: 0,
		resolveConfigured: ({ cfg, accountId }) => accountId ? resolveSignalAccount({
			cfg,
			accountId
		}).configured : listSignalAccountIds(cfg).some((resolvedAccountId) => resolveSignalAccount({
			cfg,
			accountId: resolvedAccountId
		}).configured),
		resolveBinaryPath: ({ cfg, accountId }) => resolveSignalAccount({
			cfg,
			accountId
		}).config.cliPath ?? "signal-cli",
		detectBinary
	}),
	prepare: async ({ cfg, accountId, credentialValues, runtime, prompter, options }) => {
		if (!options?.allowSignalInstall) return;
		const cliDetected = await detectBinary((typeof credentialValues.cliPath === "string" ? credentialValues.cliPath : void 0) ?? resolveSignalAccount({
			cfg,
			accountId
		}).config.cliPath ?? "signal-cli");
		if (!await prompter.confirm({
			message: cliDetected ? "signal-cli detected. Reinstall/update now?" : "signal-cli not found. Install now?",
			initialValue: !cliDetected
		})) return;
		try {
			const result = await installSignalCli(runtime);
			if (result.ok && result.cliPath) {
				await prompter.note(`Installed signal-cli at ${result.cliPath}`, "Signal");
				return { credentialValues: { cliPath: result.cliPath } };
			}
			if (!result.ok) await prompter.note(result.error ?? "signal-cli install failed.", "Signal");
		} catch (error) {
			await prompter.note(`signal-cli install failed: ${String(error)}`, "Signal");
		}
	},
	credentials: [],
	textInputs: [createSignalCliPathTextInput(async ({ currentValue }) => {
		return !await detectBinary(currentValue ?? "signal-cli");
	}), signalNumberTextInput],
	completionNote: signalCompletionNote,
	dmPolicy: signalDmPolicy,
	disable: (cfg) => setSetupChannelEnabled(cfg, channel, false)
};
//#endregion
export { signalSetupWizard };
