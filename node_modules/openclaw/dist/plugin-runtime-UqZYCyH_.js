import { n as resolveGlobalSingleton } from "./global-singleton-vftIYBun.js";
import "./types-COS905i3.js";
import "./hook-runner-global-Dd0oQ2OY.js";
import { n as resolveGlobalDedupeCache } from "./dedupe-CB5IJsQ1.js";
import "./lazy-service-module-t59FA6X-.js";
import { o as detachPluginConversationBinding, p as requestPluginConversationBinding, s as getCurrentPluginConversationBinding } from "./conversation-binding-SztCYbdB.js";
import "./commands-T_UGDmXI.js";
import "./http-registry-UDbwC7Vv.js";
//#region src/plugins/interactive-binding-helpers.ts
function createInteractiveConversationBindingHelpers(params) {
	const { registration, senderId, conversation } = params;
	const pluginRoot = registration.pluginRoot;
	return {
		requestConversationBinding: async (binding = {}) => {
			if (!pluginRoot) return {
				status: "error",
				message: "This interaction cannot bind the current conversation."
			};
			return requestPluginConversationBinding({
				pluginId: registration.pluginId,
				pluginName: registration.pluginName,
				pluginRoot,
				requestedBySenderId: senderId,
				conversation,
				binding
			});
		},
		detachConversationBinding: async () => {
			if (!pluginRoot) return { removed: false };
			return detachPluginConversationBinding({
				pluginRoot,
				conversation
			});
		},
		getCurrentConversationBinding: async () => {
			if (!pluginRoot) return null;
			return getCurrentPluginConversationBinding({
				pluginRoot,
				conversation
			});
		}
	};
}
//#endregion
//#region src/plugins/interactive.ts
const PLUGIN_INTERACTIVE_STATE_KEY = Symbol.for("openclaw.pluginInteractiveState");
const getState = () => resolveGlobalSingleton(PLUGIN_INTERACTIVE_STATE_KEY, () => ({
	interactiveHandlers: /* @__PURE__ */ new Map(),
	callbackDedupe: resolveGlobalDedupeCache(Symbol.for("openclaw.pluginInteractiveCallbackDedupe"), {
		ttlMs: 5 * 6e4,
		maxSize: 4096
	})
}));
const getInteractiveHandlers = () => getState().interactiveHandlers;
const getCallbackDedupe = () => getState().callbackDedupe;
function toRegistryKey(channel, namespace) {
	return `${channel.trim().toLowerCase()}:${namespace.trim()}`;
}
function normalizeNamespace(namespace) {
	return namespace.trim();
}
function validateNamespace(namespace) {
	if (!namespace.trim()) return "Interactive handler namespace cannot be empty";
	if (!/^[A-Za-z0-9._-]+$/.test(namespace.trim())) return "Interactive handler namespace must contain only letters, numbers, dots, underscores, and hyphens";
	return null;
}
function resolveNamespaceMatch(channel, data) {
	const interactiveHandlers = getInteractiveHandlers();
	const trimmedData = data.trim();
	if (!trimmedData) return null;
	const separatorIndex = trimmedData.indexOf(":");
	const namespace = separatorIndex >= 0 ? trimmedData.slice(0, separatorIndex) : normalizeNamespace(trimmedData);
	const registration = interactiveHandlers.get(toRegistryKey(channel, namespace));
	if (!registration) return null;
	return {
		registration,
		namespace,
		payload: separatorIndex >= 0 ? trimmedData.slice(separatorIndex + 1) : ""
	};
}
function registerPluginInteractiveHandler(pluginId, registration, opts) {
	const interactiveHandlers = getInteractiveHandlers();
	const namespace = normalizeNamespace(registration.namespace);
	const validationError = validateNamespace(namespace);
	if (validationError) return {
		ok: false,
		error: validationError
	};
	const key = toRegistryKey(registration.channel, namespace);
	const existing = interactiveHandlers.get(key);
	if (existing) return {
		ok: false,
		error: `Interactive handler namespace "${namespace}" already registered by plugin "${existing.pluginId}"`
	};
	interactiveHandlers.set(key, {
		...registration,
		namespace,
		pluginId,
		pluginName: opts?.pluginName,
		pluginRoot: opts?.pluginRoot
	});
	return { ok: true };
}
function clearPluginInteractiveHandlers() {
	const interactiveHandlers = getInteractiveHandlers();
	const callbackDedupe = getCallbackDedupe();
	interactiveHandlers.clear();
	callbackDedupe.clear();
}
function clearPluginInteractiveHandlersForPlugin(pluginId) {
	const interactiveHandlers = getInteractiveHandlers();
	for (const [key, value] of interactiveHandlers.entries()) if (value.pluginId === pluginId) interactiveHandlers.delete(key);
}
async function dispatchPluginInteractiveHandler(params) {
	const callbackDedupe = getCallbackDedupe();
	const match = resolveNamespaceMatch(params.channel, params.data);
	if (!match) return {
		matched: false,
		handled: false,
		duplicate: false
	};
	const dedupeKey = params.dedupeId?.trim();
	if (dedupeKey && callbackDedupe.peek(dedupeKey)) return {
		matched: true,
		handled: true,
		duplicate: true
	};
	await params.onMatched?.();
	const resolved = await params.invoke(match);
	if (dedupeKey) callbackDedupe.check(dedupeKey);
	return {
		matched: true,
		handled: resolved?.handled ?? true,
		duplicate: false
	};
}
//#endregion
export { createInteractiveConversationBindingHelpers as a, registerPluginInteractiveHandler as i, clearPluginInteractiveHandlersForPlugin as n, dispatchPluginInteractiveHandler as r, clearPluginInteractiveHandlers as t };
