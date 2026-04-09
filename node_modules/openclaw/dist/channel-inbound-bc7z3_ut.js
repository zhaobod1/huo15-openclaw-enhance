import { t as hasControlCommand } from "./command-detection-B5SSBbHQ.js";
import { n as resolveInboundDebounceMs, t as createInboundDebouncer } from "./inbound-debounce-EqEQqJ-R.js";
import "./mentions-Xv-PavLt.js";
import "./direct-dm-FXOCN0sA.js";
import "./session-envelope-oXR9OZTd.js";
//#region src/channels/inbound-debounce-policy.ts
function shouldDebounceTextInbound(params) {
	if (params.allowDebounce === false) return false;
	if (params.hasMedia) return false;
	const text = params.text?.trim() ?? "";
	if (!text) return false;
	return !hasControlCommand(text, params.cfg, params.commandOptions);
}
function createChannelInboundDebouncer(params) {
	const debounceMs = resolveInboundDebounceMs({
		cfg: params.cfg,
		channel: params.channel,
		overrideMs: params.debounceMsOverride
	});
	const { cfg: _cfg, channel: _channel, debounceMsOverride: _override, ...rest } = params;
	return {
		debounceMs,
		debouncer: createInboundDebouncer({
			debounceMs,
			...rest
		})
	};
}
//#endregion
export { shouldDebounceTextInbound as n, createChannelInboundDebouncer as t };
