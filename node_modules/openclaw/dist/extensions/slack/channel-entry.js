import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/slack/channel-entry.ts
var channel_entry_default = defineBundledChannelEntry({
	id: "slack",
	name: "Slack",
	description: "Slack channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "slackPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setSlackRuntime"
	}
});
//#endregion
export { channel_entry_default as default };
