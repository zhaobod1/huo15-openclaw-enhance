import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { n as createExaWebSearchProvider } from "../../exa-web-search-provider-Df3Zmn8r.js";
//#region extensions/exa/index.ts
var exa_default = definePluginEntry({
	id: "exa",
	name: "Exa Plugin",
	description: "Bundled Exa web search plugin",
	register(api) {
		api.registerWebSearchProvider(createExaWebSearchProvider());
	}
});
//#endregion
export { exa_default as default };
