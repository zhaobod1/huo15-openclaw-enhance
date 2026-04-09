import { r as loadBundledEntryExportSync, t as defineBundledChannelEntry } from "../../channel-entry-contract-DyY5TZkc.js";
//#region extensions/feishu/index.ts
let feishuSubagentHooksPromise = null;
function loadFeishuSubagentHooksModule() {
	feishuSubagentHooksPromise ??= import("./api.js");
	return feishuSubagentHooksPromise;
}
function registerFeishuDocTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuDocTools"
	})(api);
}
function registerFeishuChatTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuChatTools"
	})(api);
}
function registerFeishuWikiTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuWikiTools"
	})(api);
}
function registerFeishuDriveTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuDriveTools"
	})(api);
}
function registerFeishuPermTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuPermTools"
	})(api);
}
function registerFeishuBitableTools(api) {
	loadBundledEntryExportSync(import.meta.url, {
		specifier: "./api.js",
		exportName: "registerFeishuBitableTools"
	})(api);
}
var feishu_default = defineBundledChannelEntry({
	id: "feishu",
	name: "Feishu",
	description: "Feishu/Lark channel plugin",
	importMetaUrl: import.meta.url,
	plugin: {
		specifier: "./api.js",
		exportName: "feishuPlugin"
	},
	runtime: {
		specifier: "./runtime-api.js",
		exportName: "setFeishuRuntime"
	},
	registerFull(api) {
		api.on("subagent_spawning", async (event, ctx) => {
			const { handleFeishuSubagentSpawning } = await loadFeishuSubagentHooksModule();
			return await handleFeishuSubagentSpawning(event, ctx);
		});
		api.on("subagent_delivery_target", async (event) => {
			const { handleFeishuSubagentDeliveryTarget } = await loadFeishuSubagentHooksModule();
			return await handleFeishuSubagentDeliveryTarget(event);
		});
		api.on("subagent_ended", async (event) => {
			const { handleFeishuSubagentEnded } = await loadFeishuSubagentHooksModule();
			await handleFeishuSubagentEnded(event);
		});
		registerFeishuDocTools(api);
		registerFeishuChatTools(api);
		registerFeishuWikiTools(api);
		registerFeishuDriveTools(api);
		registerFeishuPermTools(api);
		registerFeishuBitableTools(api);
	}
});
//#endregion
export { feishu_default as default };
