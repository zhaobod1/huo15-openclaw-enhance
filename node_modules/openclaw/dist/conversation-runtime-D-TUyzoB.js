import { u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { n as deriveLastRoutePolicy } from "./resolve-route-CavttejP.js";
import "./session-binding-service-1Qw5xtDF.js";
import "./conversation-binding-SztCYbdB.js";
import "./thread-bindings-policy-C5NA_pbl.js";
import { n as resolveConfiguredBinding } from "./binding-registry-eKkVLEIK.js";
import "./session-CTQg3QT8.js";
import "./pairing-store--adbbV4I.js";
import "./dm-policy-shared-CWGTUVOf.js";
import { t as ensureConfiguredBindingTargetReady } from "./binding-targets-Cevasxf4.js";
import "./pairing-labels-ClKNVP7c.js";
//#region src/channels/plugins/binding-routing.ts
function resolveConfiguredBindingConversationRef(params) {
	if ("conversation" in params) return params.conversation;
	return {
		channel: params.channel,
		accountId: params.accountId,
		conversationId: params.conversationId,
		parentConversationId: params.parentConversationId
	};
}
function resolveConfiguredBindingRoute(params) {
	const bindingResolution = resolveConfiguredBinding({
		cfg: params.cfg,
		conversation: resolveConfiguredBindingConversationRef(params)
	}) ?? null;
	if (!bindingResolution) return {
		bindingResolution: null,
		route: params.route
	};
	const boundSessionKey = bindingResolution.statefulTarget.sessionKey.trim();
	if (!boundSessionKey) return {
		bindingResolution,
		route: params.route
	};
	const boundAgentId = resolveAgentIdFromSessionKey(boundSessionKey) || bindingResolution.statefulTarget.agentId;
	return {
		bindingResolution,
		boundSessionKey,
		boundAgentId,
		route: {
			...params.route,
			sessionKey: boundSessionKey,
			agentId: boundAgentId,
			lastRoutePolicy: deriveLastRoutePolicy({
				sessionKey: boundSessionKey,
				mainSessionKey: params.route.mainSessionKey
			}),
			matchedBy: "binding.channel"
		}
	};
}
async function ensureConfiguredBindingRouteReady(params) {
	return await ensureConfiguredBindingTargetReady(params);
}
//#endregion
//#region src/channels/session-meta.ts
let inboundSessionRuntimePromise = null;
function loadInboundSessionRuntime() {
	inboundSessionRuntimePromise ??= import("./inbound.runtime-COqCAy8k.js");
	return inboundSessionRuntimePromise;
}
async function recordInboundSessionMetaSafe(params) {
	const runtime = await loadInboundSessionRuntime();
	const storePath = runtime.resolveStorePath(params.cfg.session?.store, { agentId: params.agentId });
	try {
		await runtime.recordSessionMetaFromInbound({
			storePath,
			sessionKey: params.sessionKey,
			ctx: params.ctx
		});
	} catch (err) {
		params.onError?.(err);
	}
}
//#endregion
export { ensureConfiguredBindingRouteReady as n, resolveConfiguredBindingRoute as r, recordInboundSessionMetaSafe as t };
