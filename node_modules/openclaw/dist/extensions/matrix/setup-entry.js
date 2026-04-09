import { n as defineBundledChannelSetupEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/matrix/setup-entry.ts
var setup_entry_default = defineBundledChannelSetupEntry({
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./channel-plugin-api.js",
		exportName: "matrixPlugin"
	}
});
//#endregion
export { setup_entry_default as default };
