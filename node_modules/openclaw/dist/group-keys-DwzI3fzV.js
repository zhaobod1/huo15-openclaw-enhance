import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { t as resolveAccountEntry } from "./account-lookup-CrwHQQ0r.js";
import "./account-resolution-CIVX3Yfx.js";
//#region extensions/line/src/group-keys.ts
function resolveLineGroupLookupIds(groupId) {
	const normalized = groupId?.trim();
	if (!normalized) return [];
	if (normalized.startsWith("group:") || normalized.startsWith("room:")) {
		const rawId = normalized.split(":").slice(1).join(":");
		return rawId ? [rawId, normalized] : [normalized];
	}
	return [
		normalized,
		`group:${normalized}`,
		`room:${normalized}`
	];
}
function resolveLineGroupConfigEntry(groups, params) {
	if (!groups) return;
	for (const candidate of resolveLineGroupLookupIds(params.groupId)) {
		const hit = groups[candidate];
		if (hit) return hit;
	}
	for (const candidate of resolveLineGroupLookupIds(params.roomId)) {
		const hit = groups[candidate];
		if (hit) return hit;
	}
	return groups["*"];
}
function resolveLineGroupsConfig(cfg, accountId) {
	const lineConfig = cfg.channels?.line;
	if (!lineConfig) return;
	const normalizedAccountId = normalizeAccountId(accountId);
	return resolveAccountEntry(lineConfig.accounts, normalizedAccountId)?.groups ?? lineConfig.groups;
}
function resolveExactLineGroupConfigKey(params) {
	const groups = resolveLineGroupsConfig(params.cfg, params.accountId);
	if (!groups) return;
	return resolveLineGroupLookupIds(params.groupId).find((candidate) => Object.hasOwn(groups, candidate));
}
function resolveLineGroupHistoryKey(params) {
	return params.groupId?.trim() || params.roomId?.trim() || void 0;
}
//#endregion
export { resolveLineGroupsConfig as a, resolveLineGroupLookupIds as i, resolveLineGroupConfigEntry as n, resolveLineGroupHistoryKey as r, resolveExactLineGroupConfigKey as t };
