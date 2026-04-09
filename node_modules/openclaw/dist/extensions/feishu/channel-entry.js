import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/feishu/channel-entry.ts
var channel_entry_default = defineBundledChannelEntry({
	id: "feishu",
	name: "Feishu",
	description: "Feishu/Lark channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "feishuPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setFeishuRuntime"
	}
});
//#endregion
export { channel_entry_default as default };
