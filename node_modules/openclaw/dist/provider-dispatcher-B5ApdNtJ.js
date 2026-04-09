import { n as dispatchInboundMessageWithBufferedDispatcher, r as dispatchInboundMessageWithDispatcher } from "./dispatch-CYHzwBjK.js";
//#region src/auto-reply/reply/provider-dispatcher.ts
async function dispatchReplyWithBufferedBlockDispatcher(params) {
	return await dispatchInboundMessageWithBufferedDispatcher({
		ctx: params.ctx,
		cfg: params.cfg,
		dispatcherOptions: params.dispatcherOptions,
		replyResolver: params.replyResolver,
		replyOptions: params.replyOptions
	});
}
async function dispatchReplyWithDispatcher(params) {
	return await dispatchInboundMessageWithDispatcher({
		ctx: params.ctx,
		cfg: params.cfg,
		dispatcherOptions: params.dispatcherOptions,
		replyResolver: params.replyResolver,
		replyOptions: params.replyOptions
	});
}
//#endregion
export { dispatchReplyWithDispatcher as n, dispatchReplyWithBufferedBlockDispatcher as t };
