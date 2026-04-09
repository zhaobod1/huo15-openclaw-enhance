import { i as listChannelCatalogEntries } from "./ids-Dm8ff2qI.js";
//#region src/channels/plugins/bundled-ids.ts
const BUNDLED_CHANNEL_PLUGIN_IDS = listChannelCatalogEntries({ origin: "bundled" }).map((entry) => entry.pluginId).toSorted((left, right) => left.localeCompare(right));
function listBundledChannelPluginIds() {
	return [...BUNDLED_CHANNEL_PLUGIN_IDS];
}
//#endregion
export { listBundledChannelPluginIds as t };
