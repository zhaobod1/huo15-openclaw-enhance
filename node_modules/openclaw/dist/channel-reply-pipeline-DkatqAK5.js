import { r as normalizeChannelId, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { n as createReplyPrefixOptions } from "./reply-prefix-DWH6-cyp.js";
import { t as createTypingCallbacks } from "./typing-DMcCrqyG.js";
//#region src/plugin-sdk/channel-reply-pipeline.ts
function createChannelReplyPipeline(params) {
	const channelId = params.channel ? normalizeChannelId(params.channel) ?? params.channel : void 0;
	const plugin = channelId ? getChannelPlugin(channelId) : void 0;
	const transformReplyPayload = plugin?.messaging?.transformReplyPayload ? (payload) => plugin.messaging?.transformReplyPayload?.({
		payload,
		cfg: params.cfg,
		accountId: params.accountId
	}) ?? payload : void 0;
	return {
		...createReplyPrefixOptions({
			cfg: params.cfg,
			agentId: params.agentId,
			channel: params.channel,
			accountId: params.accountId
		}),
		...transformReplyPayload ? { transformReplyPayload } : {},
		...params.typingCallbacks ? { typingCallbacks: params.typingCallbacks } : params.typing ? { typingCallbacks: createTypingCallbacks(params.typing) } : {}
	};
}
//#endregion
export { createChannelReplyPipeline as t };
