import { t as defineSingleProviderPluginEntry } from "../../provider-entry-S0yj9ufe.js";
import { t as buildNvidiaProvider } from "../../provider-catalog-Dz-yYiG1.js";
var nvidia_default = defineSingleProviderPluginEntry({
	id: "nvidia",
	name: "NVIDIA Provider",
	description: "Bundled NVIDIA provider plugin",
	provider: {
		label: "NVIDIA",
		docsPath: "/providers/nvidia",
		envVars: ["NVIDIA_API_KEY"],
		auth: [],
		catalog: { buildProvider: buildNvidiaProvider }
	}
});
//#endregion
export { nvidia_default as default };
