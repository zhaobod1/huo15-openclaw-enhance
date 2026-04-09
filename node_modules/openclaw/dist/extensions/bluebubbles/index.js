import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/bluebubbles/index.ts
var bluebubbles_default = defineBundledChannelEntry({
	id: "bluebubbles",
	name: "BlueBubbles",
	description: "BlueBubbles channel plugin (macOS app)",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "bluebubblesPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setBlueBubblesRuntime"
	}
});
//#endregion
export { bluebubbles_default as default };
