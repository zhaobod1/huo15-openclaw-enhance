import { i as discordSetupAdapter, r as createDiscordPluginBase } from "./channel-D0kY3Gd-.js";
import { n as createDiscordSetupWizardProxy } from "./setup-core-CRgMPXcC.js";
//#endregion
//#region extensions/discord/src/channel.setup.ts
const discordSetupPlugin = { ...createDiscordPluginBase({
	setupWizard: createDiscordSetupWizardProxy(async () => (await import("./setup-surface-Z3J7ja3c.js")).discordSetupWizard),
	setup: discordSetupAdapter
}) };
//#endregion
export { discordSetupPlugin as t };
