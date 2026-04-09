import { r as __testing$2, t as __testing$1 } from "./manager-B8s0Ep5O.js";
import "./session-meta-BpAuMZIp.js";
//#region src/plugin-sdk/acp-runtime.ts
let dispatchAcpRuntimePromise = null;
function loadDispatchAcpRuntime() {
	dispatchAcpRuntimePromise ??= import("./dispatch-acp.runtime-m1vtkkau.js");
	return dispatchAcpRuntimePromise;
}
function hasExplicitCommandCandidate(ctx) {
	const commandBody = ctx.CommandBody;
	if (typeof commandBody === "string" && commandBody.trim().length > 0) return true;
	const bodyForCommands = ctx.BodyForCommands;
	if (typeof bodyForCommands !== "string") return false;
	const normalized = bodyForCommands.trim();
	if (!normalized) return false;
	return normalized.startsWith("!") || normalized.startsWith("/");
}
async function tryDispatchAcpReplyHook(event, ctx) {
	if (event.sendPolicy === "deny" && !hasExplicitCommandCandidate(event.ctx)) return;
	const runtime = await loadDispatchAcpRuntime();
	const bypassForCommand = await runtime.shouldBypassAcpDispatchForCommand(event.ctx, ctx.cfg);
	if (event.sendPolicy === "deny" && !bypassForCommand) return;
	const result = await runtime.tryDispatchAcpReply({
		ctx: event.ctx,
		cfg: ctx.cfg,
		dispatcher: ctx.dispatcher,
		runId: event.runId,
		sessionKey: event.sessionKey,
		abortSignal: ctx.abortSignal,
		inboundAudio: event.inboundAudio,
		sessionTtsAuto: event.sessionTtsAuto,
		ttsChannel: event.ttsChannel,
		suppressUserDelivery: event.suppressUserDelivery,
		shouldRouteToOriginating: event.shouldRouteToOriginating,
		originatingChannel: event.originatingChannel,
		originatingTo: event.originatingTo,
		shouldSendToolSummaries: event.shouldSendToolSummaries,
		bypassForCommand,
		onReplyStart: ctx.onReplyStart,
		recordProcessed: ctx.recordProcessed,
		markIdle: ctx.markIdle
	});
	if (!result) return;
	return {
		handled: true,
		queuedFinal: result.queuedFinal,
		counts: result.counts
	};
}
const __testing = new Proxy({}, {
	get(_target, prop, receiver) {
		if (Reflect.has(__testing$1, prop)) return Reflect.get(__testing$1, prop, receiver);
		return Reflect.get(__testing$2, prop, receiver);
	},
	has(_target, prop) {
		return Reflect.has(__testing$1, prop) || Reflect.has(__testing$2, prop);
	},
	ownKeys() {
		return Array.from(new Set([...Reflect.ownKeys(__testing$1), ...Reflect.ownKeys(__testing$2)]));
	},
	getOwnPropertyDescriptor(_target, prop) {
		if (Reflect.has(__testing$1, prop) || Reflect.has(__testing$2, prop)) return {
			configurable: true,
			enumerable: true
		};
	}
});
//#endregion
export { tryDispatchAcpReplyHook as n, __testing as t };
