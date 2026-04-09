import { n as defineBundledChannelSetupEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/googlechat/setup-entry.ts
var setup_entry_default = defineBundledChannelSetupEntry({
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "googlechatPlugin"
	}
});
//#endregion
export { setup_entry_default as default };
