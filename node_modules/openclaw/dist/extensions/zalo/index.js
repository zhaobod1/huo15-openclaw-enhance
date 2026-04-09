import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/zalo/index.ts
var zalo_default = defineBundledChannelEntry({
	id: "zalo",
	name: "Zalo",
	description: "Zalo channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "zaloPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setZaloRuntime"
	}
});
//#endregion
export { zalo_default as default };
