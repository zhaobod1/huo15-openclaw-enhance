import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { t as registerBedrockMantlePlugin } from "../../register.sync.runtime-B8C_xpVq.js";
//#region extensions/amazon-bedrock-mantle/index.ts
var amazon_bedrock_mantle_default = definePluginEntry({
	id: "amazon-bedrock-mantle",
	name: "Amazon Bedrock Mantle Provider",
	description: "Bundled Amazon Bedrock Mantle (OpenAI-compatible) provider plugin",
	register(api) {
		registerBedrockMantlePlugin(api);
	}
});
//#endregion
export { amazon_bedrock_mantle_default as default };
