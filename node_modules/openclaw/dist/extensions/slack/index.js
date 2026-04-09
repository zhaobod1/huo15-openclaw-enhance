import { r as loadBundledEntryExportSync, t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/slack/index.ts
function registerSlackPluginHttpRoutes(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./runtime-api.js",
		exportName: "registerSlackPluginHttpRoutes"
	})(api);
}
var slack_default = defineBundledChannelEntry({
	id: "slack",
	name: "Slack",
	description: "Slack channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./channel-plugin-api.js",
		exportName: "slackPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setSlackRuntime"
	},
	registerFull: registerSlackPluginHttpRoutes
});
//#endregion
export { slack_default as default };
