import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { t as buildAlibabaVideoGenerationProvider } from "../../video-generation-provider-B2Oh4g4S.js";
//#region extensions/alibaba/index.ts
var alibaba_default = definePluginEntry({
	id: "alibaba",
	name: "Alibaba Model Studio Plugin",
	description: "Bundled Alibaba Model Studio video provider plugin",
	register(api) {
		api.registerVideoGenerationProvider(buildAlibabaVideoGenerationProvider());
	}
});
//#endregion
export { alibaba_default as default };
