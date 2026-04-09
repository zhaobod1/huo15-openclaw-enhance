import { r as getActivePluginRegistry } from "./runtime-Dji2WXDE.js";
import { d as normalizeMessageChannel, r as isDeliverableMessageChannel } from "./message-channel-DnQkETjb.js";
import { t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { t as bootstrapOutboundChannelPlugin } from "./channel-bootstrap.runtime-fw7N4bDs.js";
//#region src/infra/outbound/channel-resolution.ts
function normalizeDeliverableOutboundChannel(raw) {
	const normalized = normalizeMessageChannel(raw);
	if (!normalized || !isDeliverableMessageChannel(normalized)) return;
	return normalized;
}
function maybeBootstrapChannelPlugin(params) {
	bootstrapOutboundChannelPlugin(params);
}
function resolveDirectFromActiveRegistry(channel) {
	const activeRegistry = getActivePluginRegistry();
	if (!activeRegistry) return;
	for (const entry of activeRegistry.channels) {
		const plugin = entry?.plugin;
		if (plugin?.id === channel) return plugin;
	}
}
function resolveOutboundChannelPlugin(params) {
	const normalized = normalizeDeliverableOutboundChannel(params.channel);
	if (!normalized) return;
	const resolve = () => getChannelPlugin(normalized);
	const current = resolve();
	if (current) return current;
	const directCurrent = resolveDirectFromActiveRegistry(normalized);
	if (directCurrent) return directCurrent;
	maybeBootstrapChannelPlugin({
		channel: normalized,
		cfg: params.cfg
	});
	return resolve() ?? resolveDirectFromActiveRegistry(normalized);
}
//#endregion
export { resolveOutboundChannelPlugin as n, normalizeDeliverableOutboundChannel as t };
