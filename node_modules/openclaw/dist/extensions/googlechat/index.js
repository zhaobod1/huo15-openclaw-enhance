import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/googlechat/index.ts
var googlechat_default = defineBundledChannelEntry({
	id: "googlechat",
	name: "Google Chat",
	description: "OpenClaw Google Chat channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "googlechatPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setGoogleChatRuntime"
	}
});
//#endregion
export { googlechat_default as default };
