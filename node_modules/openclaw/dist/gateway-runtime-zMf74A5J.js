import "./method-scopes-D4ep-GlN.js";
import "./operator-approvals-client-D0EEmbBT.js";
//#region src/gateway/channel-status-patches.ts
function createConnectedChannelStatusPatch(at = Date.now()) {
	return {
		connected: true,
		lastConnectedAt: at,
		lastEventAt: at
	};
}
//#endregion
export { createConnectedChannelStatusPatch as t };
