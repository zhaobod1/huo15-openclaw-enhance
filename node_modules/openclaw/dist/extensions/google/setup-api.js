import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { s as normalizeGoogleProviderConfig } from "../../api-C29T3o68.js";
//#region extensions/google/setup-api.ts
var setup_api_default = definePluginEntry({
	id: "google",
	name: "Google Setup",
	description: "Lightweight Google setup hooks",
	register(api) {
		api.registerProvider({
			id: "google",
			label: "Google AI Studio",
			hookAliases: ["google-antigravity", "google-vertex"],
			auth: [],
			normalizeConfig: ({ provider, providerConfig }) => normalizeGoogleProviderConfig(provider, providerConfig)
		});
	}
});
//#endregion
export { setup_api_default as default };
