import { l as isRecord } from "./utils-ms6h9yny.js";
import { t as getBootstrapChannelPlugin } from "./bootstrap-registry-DSG7nIY1.js";
import { a as hasBundledChannelPackageState, i as hasBundledChannelPersistedAuthState, t as hasMeaningfulChannelConfig } from "./config-presence-Bwyumb-a.js";
//#region src/channels/plugins/configured-state.ts
function hasBundledChannelConfiguredState(params) {
	return hasBundledChannelPackageState({
		metadataKey: "configuredState",
		channelId: params.channelId,
		cfg: params.cfg,
		env: params.env
	});
}
//#endregion
//#region src/config/channel-configured.ts
function resolveChannelConfig(cfg, channelId) {
	const entry = cfg.channels?.[channelId];
	return isRecord(entry) ? entry : null;
}
function isGenericChannelConfigured(cfg, channelId) {
	return hasMeaningfulChannelConfig(resolveChannelConfig(cfg, channelId));
}
function isChannelConfigured(cfg, channelId, env = process.env) {
	if (hasBundledChannelConfiguredState({
		channelId,
		cfg,
		env
	})) return true;
	if (hasBundledChannelPersistedAuthState({
		channelId,
		cfg,
		env
	})) return true;
	if (isGenericChannelConfigured(cfg, channelId)) return true;
	const plugin = getBootstrapChannelPlugin(channelId);
	return Boolean(plugin?.config?.hasConfiguredState?.({
		cfg,
		env
	}));
}
//#endregion
export { isChannelConfigured as t };
