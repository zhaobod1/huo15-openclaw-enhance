import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import "../../core-D7mi2qmR.js";
//#region extensions/browser/cli-metadata.ts
var cli_metadata_default = definePluginEntry({
	id: "browser",
	name: "Browser",
	description: "Default browser tool plugin",
	register(api) {
		api.registerCli(async ({ program }) => {
			const { registerBrowserCli } = await import("./runtime-api.js");
			registerBrowserCli(program);
		}, { commands: ["browser"] });
	}
});
//#endregion
export { cli_metadata_default as default };
