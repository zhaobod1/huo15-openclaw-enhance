import { u as normalizeE164 } from "./utils-ms6h9yny.js";
import { d as normalizeMessageChannel } from "./message-channel-DnQkETjb.js";
import { l as normalizeMainKey, r as buildAgentMainSessionKey, t as DEFAULT_AGENT_ID } from "./session-key-BR3Z-ljs.js";
import { n as listChannelPlugins, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { _ as resolveGroupSessionKey } from "./store-Cx4GsUxp.js";
//#region src/config/sessions/explicit-session-key-normalization.ts
function resolveExplicitSessionKeyNormalizerCandidates(sessionKey, ctx) {
	const normalizedProvider = ctx.Provider?.trim().toLowerCase();
	const normalizedSurface = ctx.Surface?.trim().toLowerCase();
	const normalizedFrom = (ctx.From ?? "").trim().toLowerCase();
	const candidates = /* @__PURE__ */ new Set();
	const maybeAdd = (value) => {
		const normalized = normalizeMessageChannel(value);
		if (normalized) candidates.add(normalized);
	};
	maybeAdd(normalizedSurface);
	maybeAdd(normalizedProvider);
	maybeAdd(normalizedFrom.split(":", 1)[0]);
	for (const plugin of listChannelPlugins()) {
		const pluginId = normalizeMessageChannel(plugin.id);
		if (!pluginId) continue;
		if (sessionKey.startsWith(`${pluginId}:`) || sessionKey.includes(`:${pluginId}:`)) candidates.add(pluginId);
	}
	return [...candidates];
}
function normalizeExplicitSessionKey(sessionKey, ctx) {
	const normalized = sessionKey.trim().toLowerCase();
	for (const channelId of resolveExplicitSessionKeyNormalizerCandidates(normalized, ctx)) {
		const normalize = getChannelPlugin(channelId)?.messaging?.normalizeExplicitSessionKey;
		const next = normalize?.({
			sessionKey: normalized,
			ctx
		});
		if (typeof next === "string" && next.trim()) return next.trim().toLowerCase();
	}
	return normalized;
}
//#endregion
//#region src/config/sessions/session-key.ts
function deriveSessionKey(scope, ctx) {
	if (scope === "global") return "global";
	const resolvedGroup = resolveGroupSessionKey(ctx);
	if (resolvedGroup) return resolvedGroup.key;
	return (ctx.From ? normalizeE164(ctx.From) : "") || "unknown";
}
/**
* Resolve the session key with a canonical direct-chat bucket (default: "main").
* All non-group direct chats collapse to this bucket; groups stay isolated.
*/
function resolveSessionKey(scope, ctx, mainKey) {
	const explicit = ctx.SessionKey?.trim();
	if (explicit) return normalizeExplicitSessionKey(explicit, ctx);
	const raw = deriveSessionKey(scope, ctx);
	if (scope === "global") return raw;
	const canonical = buildAgentMainSessionKey({
		agentId: DEFAULT_AGENT_ID,
		mainKey: normalizeMainKey(mainKey)
	});
	if (!(raw.includes(":group:") || raw.includes(":channel:"))) return canonical;
	return `agent:${DEFAULT_AGENT_ID}:${raw}`;
}
//#endregion
export { resolveSessionKey as n, deriveSessionKey as t };
