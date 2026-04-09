import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/qa-channel/index.ts
var qa_channel_default = defineBundledChannelEntry({
	id: "qa-channel",
	name: "QA Channel",
	description: "Synthetic QA channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "qaChannelPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setQaChannelRuntime"
	}
});
//#endregion
export { qa_channel_default as default };
