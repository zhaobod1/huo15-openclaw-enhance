import { r as getActivePluginRegistry } from "./runtime-Dji2WXDE.js";
import { i as listChannelCatalogEntries, n as CHAT_CHANNEL_ORDER, r as normalizeChatChannelId } from "./ids-Dm8ff2qI.js";
//#region src/channels/plugins/exposure.ts
function resolveChannelExposure(meta) {
	return {
		configured: meta.exposure?.configured ?? meta.showConfigured ?? true,
		setup: meta.exposure?.setup ?? meta.showInSetup ?? true,
		docs: meta.exposure?.docs ?? true
	};
}
function isChannelVisibleInConfiguredLists(meta) {
	return resolveChannelExposure(meta).configured;
}
function isChannelVisibleInSetup(meta) {
	return resolveChannelExposure(meta).setup;
}
//#endregion
//#region src/channels/chat-meta-shared.ts
const CHAT_CHANNEL_ID_SET = new Set(CHAT_CHANNEL_ORDER);
function toChatChannelMeta(params) {
	const label = params.channel.label?.trim();
	if (!label) throw new Error(`Missing label for bundled chat channel "${params.id}"`);
	const exposure = resolveChannelExposure(params.channel);
	return {
		id: params.id,
		label,
		selectionLabel: params.channel.selectionLabel?.trim() || label,
		docsPath: params.channel.docsPath?.trim() || `/channels/${params.id}`,
		docsLabel: params.channel.docsLabel?.trim() || void 0,
		blurb: params.channel.blurb?.trim() || "",
		...params.channel.aliases?.length ? { aliases: params.channel.aliases } : {},
		...params.channel.order !== void 0 ? { order: params.channel.order } : {},
		...params.channel.selectionDocsPrefix !== void 0 ? { selectionDocsPrefix: params.channel.selectionDocsPrefix } : {},
		...params.channel.selectionDocsOmitLabel !== void 0 ? { selectionDocsOmitLabel: params.channel.selectionDocsOmitLabel } : {},
		...params.channel.selectionExtras?.length ? { selectionExtras: params.channel.selectionExtras } : {},
		...params.channel.detailLabel?.trim() ? { detailLabel: params.channel.detailLabel.trim() } : {},
		...params.channel.systemImage?.trim() ? { systemImage: params.channel.systemImage.trim() } : {},
		...params.channel.markdownCapable !== void 0 ? { markdownCapable: params.channel.markdownCapable } : {},
		exposure,
		...params.channel.quickstartAllowFrom !== void 0 ? { quickstartAllowFrom: params.channel.quickstartAllowFrom } : {},
		...params.channel.forceAccountBinding !== void 0 ? { forceAccountBinding: params.channel.forceAccountBinding } : {},
		...params.channel.preferSessionLookupForAnnounceTarget !== void 0 ? { preferSessionLookupForAnnounceTarget: params.channel.preferSessionLookupForAnnounceTarget } : {},
		...params.channel.preferOver?.length ? { preferOver: params.channel.preferOver } : {}
	};
}
function buildChatChannelMetaById() {
	const entries = /* @__PURE__ */ new Map();
	for (const entry of listChannelCatalogEntries({ origin: "bundled" })) {
		const channel = entry.channel;
		if (!channel) continue;
		const rawId = channel?.id?.trim();
		if (!rawId || !CHAT_CHANNEL_ID_SET.has(rawId)) continue;
		const id = rawId;
		entries.set(id, toChatChannelMeta({
			id,
			channel
		}));
	}
	return Object.freeze(Object.fromEntries(entries));
}
//#endregion
//#region src/channels/chat-meta.ts
const CHAT_CHANNEL_META = buildChatChannelMetaById();
function listChatChannels() {
	return CHAT_CHANNEL_ORDER.map((id) => CHAT_CHANNEL_META[id]);
}
function getChatChannelMeta(id) {
	return CHAT_CHANNEL_META[id];
}
//#endregion
//#region src/channels/registry.ts
function listRegisteredChannelPluginEntries() {
	return getActivePluginRegistry()?.channels ?? [];
}
function findRegisteredChannelPluginEntry(normalizedKey) {
	return listRegisteredChannelPluginEntries().find((entry) => {
		const id = String(entry.plugin.id ?? "").trim().toLowerCase();
		if (id && id === normalizedKey) return true;
		return (entry.plugin.meta?.aliases ?? []).some((alias) => alias.trim().toLowerCase() === normalizedKey);
	});
}
function findRegisteredChannelPluginEntryById(id) {
	const normalizedId = normalizeChannelKey(id);
	if (!normalizedId) return;
	return listRegisteredChannelPluginEntries().find((entry) => normalizeChannelKey(entry.plugin.id) === normalizedId);
}
const normalizeChannelKey = (raw) => {
	return raw?.trim().toLowerCase() || void 0;
};
function normalizeChannelId(raw) {
	return normalizeChatChannelId(raw);
}
function normalizeAnyChannelId(raw) {
	const key = normalizeChannelKey(raw);
	if (!key) return null;
	return findRegisteredChannelPluginEntry(key)?.plugin.id ?? null;
}
function listRegisteredChannelPluginIds() {
	return listRegisteredChannelPluginEntries().flatMap((entry) => {
		const id = entry.plugin.id?.trim();
		return id ? [id] : [];
	});
}
function getRegisteredChannelPluginMeta(id) {
	return findRegisteredChannelPluginEntryById(id)?.plugin.meta ?? null;
}
function formatChannelPrimerLine(meta) {
	return `${meta.label}: ${meta.blurb}`;
}
function formatChannelSelectionLine(meta, docsLink) {
	const docsPrefix = meta.selectionDocsPrefix ?? "Docs:";
	const docsLabel = meta.docsLabel ?? meta.id;
	const docs = meta.selectionDocsOmitLabel ? docsLink(meta.docsPath) : docsLink(meta.docsPath, docsLabel);
	const extras = (meta.selectionExtras ?? []).filter(Boolean).join(" ");
	return `${meta.label} — ${meta.blurb} ${docsPrefix ? `${docsPrefix} ` : ""}${docs}${extras ? ` ${extras}` : ""}`;
}
//#endregion
export { normalizeAnyChannelId as a, listChatChannels as c, resolveChannelExposure as d, listRegisteredChannelPluginIds as i, isChannelVisibleInConfiguredLists as l, formatChannelSelectionLine as n, normalizeChannelId as o, getRegisteredChannelPluginMeta as r, getChatChannelMeta as s, formatChannelPrimerLine as t, isChannelVisibleInSetup as u };
