import { a as createSlackPluginBase, i as slackSetupAdapter, r as slackSetupWizard } from "./channel-cVxfXBcu.js";
//#region extensions/slack/src/channel.setup.ts
const slackSetupPlugin = { ...createSlackPluginBase({
	setupWizard: slackSetupWizard,
	setup: slackSetupAdapter
}) };
//#endregion
export { slackSetupPlugin as t };
