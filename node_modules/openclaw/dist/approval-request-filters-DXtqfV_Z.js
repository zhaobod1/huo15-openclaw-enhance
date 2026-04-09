import { i as testRegexWithBoundedInput, t as compileSafeRegex } from "./safe-regex-tLlDZYfM.js";
import { w as parseAgentSessionKey } from "./session-key-BR3Z-ljs.js";
//#region src/infra/approval-request-filters.ts
function matchesApprovalRequestSessionFilter(sessionKey, patterns) {
	return patterns.some((pattern) => {
		if (sessionKey.includes(pattern)) return true;
		const regex = compileSafeRegex(pattern);
		return regex ? testRegexWithBoundedInput(regex, sessionKey) : false;
	});
}
function matchesApprovalRequestFilters(params) {
	if (params.agentFilter?.length) {
		const explicitAgentId = params.request.agentId?.trim() || void 0;
		const sessionAgentId = params.fallbackAgentIdFromSessionKey ? parseAgentSessionKey(params.request.sessionKey)?.agentId ?? void 0 : void 0;
		const agentId = explicitAgentId ?? sessionAgentId;
		if (!agentId || !params.agentFilter.includes(agentId)) return false;
	}
	if (params.sessionFilter?.length) {
		const sessionKey = params.request.sessionKey?.trim();
		if (!sessionKey || !matchesApprovalRequestSessionFilter(sessionKey, params.sessionFilter)) return false;
	}
	return true;
}
//#endregion
export { matchesApprovalRequestSessionFilter as n, matchesApprovalRequestFilters as t };
