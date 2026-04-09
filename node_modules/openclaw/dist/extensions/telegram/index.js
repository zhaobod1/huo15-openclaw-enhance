import { t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/telegram/index.ts
var telegram_default = defineBundledChannelEntry({
	id: "telegram",
	name: "Telegram",
	description: "Telegram channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./channel-plugin-api.js",
		exportName: "telegramPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setTelegramRuntime"
	}
});
//#endregion
export { telegram_default as default };
