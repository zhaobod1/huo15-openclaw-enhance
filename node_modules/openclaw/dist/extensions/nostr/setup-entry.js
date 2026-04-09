import { n as defineBundledChannelSetupEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/nostr/setup-entry.ts
var setup_entry_default = defineBundledChannelSetupEntry({
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "nostrPlugin"
	}
});
//#endregion
export { setup_entry_default as default };
