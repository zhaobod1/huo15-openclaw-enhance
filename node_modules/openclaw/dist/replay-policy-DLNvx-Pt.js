import { f as buildNativeAnthropicReplayPolicyForModel } from "./provider-model-shared-DUTxdm38.js";
//#region extensions/anthropic/replay-policy.ts
/**
* Returns the provider-owned replay policy for Anthropic transports.
*/
function buildAnthropicReplayPolicy(ctx) {
	return buildNativeAnthropicReplayPolicyForModel(ctx.modelId);
}
//#endregion
export { buildAnthropicReplayPolicy as t };
