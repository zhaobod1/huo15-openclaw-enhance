import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import "./directory-runtime-BrmKrim8.js";
import { i as createResolvedDirectoryEntriesLister } from "./directory-config-helpers-47ChUpH6.js";
import "./account-resolution-CIVX3Yfx.js";
import { i as resolveDefaultSlackAccountId, r as mergeSlackAccountConfig } from "./accounts-BpbTO6KH.js";
import { r as parseSlackTarget } from "./target-parsing-Tzk67ZVP.js";
//#region extensions/slack/src/directory-config.ts
function resolveSlackDirectoryConfigAccount(cfg, accountId) {
	const resolvedAccountId = normalizeAccountId(accountId ?? resolveDefaultSlackAccountId(cfg));
	const config = mergeSlackAccountConfig(cfg, resolvedAccountId);
	return {
		accountId: resolvedAccountId,
		config,
		dm: config.dm
	};
}
const listSlackDirectoryPeersFromConfig = createResolvedDirectoryEntriesLister({
	kind: "user",
	resolveAccount: (cfg, accountId) => resolveSlackDirectoryConfigAccount(cfg, accountId),
	resolveSources: (account) => {
		const allowFrom = account.config.allowFrom ?? account.dm?.allowFrom ?? [];
		const channelUsers = Object.values(account.config.channels ?? {}).flatMap((channel) => channel.users ?? []);
		return [
			allowFrom,
			Object.keys(account.config.dms ?? {}),
			channelUsers
		];
	},
	normalizeId: (raw) => {
		const normalizedUserId = (raw.match(/^<@([A-Z0-9]+)>$/i)?.[1] ?? raw).replace(/^(slack|user):/i, "").trim();
		if (!normalizedUserId) return null;
		const normalized = parseSlackTarget(`user:${normalizedUserId}`, { defaultKind: "user" });
		return normalized?.kind === "user" ? `user:${normalized.id.toLowerCase()}` : null;
	}
});
const listSlackDirectoryGroupsFromConfig = createResolvedDirectoryEntriesLister({
	kind: "group",
	resolveAccount: (cfg, accountId) => resolveSlackDirectoryConfigAccount(cfg, accountId),
	resolveSources: (account) => [Object.keys(account.config.channels ?? {})],
	normalizeId: (raw) => {
		const normalized = parseSlackTarget(raw, { defaultKind: "channel" });
		return normalized?.kind === "channel" ? `channel:${normalized.id.toLowerCase()}` : null;
	}
});
//#endregion
export { listSlackDirectoryPeersFromConfig as n, listSlackDirectoryGroupsFromConfig as t };
