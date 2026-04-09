import "./status-yaHSTeGo.js";
import "./commands-registry-CyAozniN.js";
import "./command-detection-B5SSBbHQ.js";
import { o as resolveDmGroupAccessWithLists } from "./dm-policy-shared-CWGTUVOf.js";
import "./command-auth-DswtzwKC.js";
import "./model-selection-CDZG0zcK.js";
import "./commands-models-BROMICu6.js";
import "./direct-dm-FXOCN0sA.js";
import "./skill-commands-CwndRm6t.js";
//#region src/plugin-sdk/telegram-command-ui.ts
function buildCommandsPaginationKeyboard(currentPage, totalPages, agentId) {
	const buttons = [];
	const suffix = agentId ? `:${agentId}` : "";
	if (currentPage > 1) buttons.push({
		text: "◀ Prev",
		callback_data: `commands_page_${currentPage - 1}${suffix}`
	});
	buttons.push({
		text: `${currentPage}/${totalPages}`,
		callback_data: `commands_page_noop${suffix}`
	});
	if (currentPage < totalPages) buttons.push({
		text: "Next ▶",
		callback_data: `commands_page_${currentPage + 1}${suffix}`
	});
	return [buttons];
}
//#endregion
//#region src/plugin-sdk/command-auth.ts
/** Fast-path DM command authorization when only policy and sender allowlist state matter. */
function resolveDirectDmAuthorizationOutcome(params) {
	if (params.isGroup) return "allowed";
	if (params.dmPolicy === "disabled") return "disabled";
	if (params.dmPolicy !== "open" && !params.senderAllowedForCommands) return "unauthorized";
	return "allowed";
}
/** Runtime-backed wrapper around sender command authorization for grouped helper surfaces. */
async function resolveSenderCommandAuthorizationWithRuntime(params) {
	return resolveSenderCommandAuthorization({
		...params,
		shouldComputeCommandAuthorized: params.runtime.shouldComputeCommandAuthorized,
		resolveCommandAuthorizedFromAuthorizers: params.runtime.resolveCommandAuthorizedFromAuthorizers
	});
}
/** Compute effective allowlists and command authorization for one inbound sender. */
async function resolveSenderCommandAuthorization(params) {
	const shouldComputeAuth = params.shouldComputeCommandAuthorized(params.rawBody, params.cfg);
	const storeAllowFrom = !params.isGroup && params.dmPolicy !== "allowlist" && (params.dmPolicy !== "open" || shouldComputeAuth) ? await params.readAllowFromStore().catch(() => []) : [];
	const access = resolveDmGroupAccessWithLists({
		isGroup: params.isGroup,
		dmPolicy: params.dmPolicy,
		groupPolicy: "allowlist",
		allowFrom: params.configuredAllowFrom,
		groupAllowFrom: params.configuredGroupAllowFrom ?? [],
		storeAllowFrom,
		isSenderAllowed: (allowFrom) => params.isSenderAllowed(params.senderId, allowFrom)
	});
	const effectiveAllowFrom = access.effectiveAllowFrom;
	const effectiveGroupAllowFrom = access.effectiveGroupAllowFrom;
	const useAccessGroups = params.cfg.commands?.useAccessGroups !== false;
	const senderAllowedForCommands = params.isSenderAllowed(params.senderId, params.isGroup ? effectiveGroupAllowFrom : effectiveAllowFrom);
	const ownerAllowedForCommands = params.isSenderAllowed(params.senderId, effectiveAllowFrom);
	const groupAllowedForCommands = params.isSenderAllowed(params.senderId, effectiveGroupAllowFrom);
	return {
		shouldComputeAuth,
		effectiveAllowFrom,
		effectiveGroupAllowFrom,
		senderAllowedForCommands,
		commandAuthorized: shouldComputeAuth ? params.resolveCommandAuthorizedFromAuthorizers({
			useAccessGroups,
			authorizers: [{
				configured: effectiveAllowFrom.length > 0,
				allowed: ownerAllowedForCommands
			}, {
				configured: effectiveGroupAllowFrom.length > 0,
				allowed: groupAllowedForCommands
			}]
		}) : void 0
	};
}
//#endregion
export { buildCommandsPaginationKeyboard as i, resolveSenderCommandAuthorization as n, resolveSenderCommandAuthorizationWithRuntime as r, resolveDirectDmAuthorizationOutcome as t };
