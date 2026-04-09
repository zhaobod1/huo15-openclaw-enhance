import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/irc/index.ts
var irc_default = defineBundledChannelEntry({
	id: "irc",
	name: "IRC",
	description: "IRC channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./channel-plugin-api.js",
		exportName: "ircPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setIrcRuntime"
	}
});
//#endregion
export { irc_default as default };
