import { a as loadConfig } from "./io-CS2J_l4V.js";
import { n as listChannelPlugins } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import "./config-dzPpvDz6.js";
import { t as loadChannelOutboundAdapter } from "./load-CHL56t5h.js";
import { a as createLazyRuntimeSurface } from "./lazy-runtime-BwFSOU2O.js";
import { t as createOutboundSendDepsFromCliSource } from "./outbound-send-mapping-cKW7OLpL.js";
//#region src/cli/send-runtime/channel-outbound-send.ts
function createChannelOutboundRuntimeSend(params) {
	return { sendMessage: async (to, text, opts = {}) => {
		const outbound = await loadChannelOutboundAdapter(params.channelId);
		if (!outbound?.sendText) throw new Error(params.unavailableMessage);
		return await outbound.sendText({
			cfg: opts.cfg ?? loadConfig(),
			to,
			text,
			mediaUrl: opts.mediaUrl,
			mediaLocalRoots: opts.mediaLocalRoots,
			accountId: opts.accountId,
			threadId: opts.messageThreadId,
			replyToId: opts.replyToMessageId == null ? void 0 : String(opts.replyToMessageId).trim() || void 0,
			silent: opts.silent,
			forceDocument: opts.forceDocument,
			gifPlayback: opts.gifPlayback,
			gatewayClientScopes: opts.gatewayClientScopes
		});
	} };
}
//#endregion
//#region src/cli/deps.ts
const senderCache = /* @__PURE__ */ new Map();
/**
* Create a lazy-loading send function proxy for a channel.
* The channel's module is loaded on first call and cached for reuse.
*/
function createLazySender(channelId, loader) {
	const loadRuntimeSend = createLazyRuntimeSurface(loader, ({ runtimeSend }) => runtimeSend);
	return async (...args) => {
		let cached = senderCache.get(channelId);
		if (!cached) {
			cached = loadRuntimeSend();
			senderCache.set(channelId, cached);
		}
		return await (await cached).sendMessage(...args);
	};
}
function createDefaultDeps() {
	const deps = {};
	for (const plugin of listChannelPlugins()) deps[plugin.id] = createLazySender(plugin.id, async () => ({ runtimeSend: createChannelOutboundRuntimeSend({
		channelId: plugin.id,
		unavailableMessage: `${plugin.meta.label ?? plugin.id} outbound adapter is unavailable.`
	}) }));
	return deps;
}
function createOutboundSendDeps(deps) {
	return createOutboundSendDepsFromCliSource(deps);
}
//#endregion
export { createOutboundSendDeps as n, createDefaultDeps as t };
