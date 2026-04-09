import { o as migrateLegacyFlatAllowPrivateNetworkAlias, r as hasLegacyFlatAllowPrivateNetworkAlias } from "../../ssrf-policy-Cb9w9jMO.js";
import "../../ssrf-runtime-DGIvmaoK.js";
import { n as secretTargetRegistryEntries, t as collectRuntimeConfigAssignments } from "../../secret-contract-DzAqZdnf.js";
//#region extensions/mattermost/src/doctor-contract.ts
function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasLegacyAllowPrivateNetworkInAccounts(value) {
	const accounts = isRecord(value) ? value : null;
	return Boolean(accounts && Object.values(accounts).some((account) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(account) ? account : {})));
}
const legacyConfigRules = [{
	path: ["channels", "mattermost"],
	message: "channels.mattermost.allowPrivateNetwork is legacy; use channels.mattermost.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
	match: (value) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(value) ? value : {})
}, {
	path: [
		"channels",
		"mattermost",
		"accounts"
	],
	message: "channels.mattermost.accounts.<id>.allowPrivateNetwork is legacy; use channels.mattermost.accounts.<id>.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
	match: hasLegacyAllowPrivateNetworkInAccounts
}];
function normalizeCompatibilityConfig({ cfg }) {
	const channels = isRecord(cfg.channels) ? cfg.channels : null;
	const mattermost = isRecord(channels?.mattermost) ? channels.mattermost : null;
	if (!mattermost) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updatedMattermost = mattermost;
	let changed = false;
	const topLevel = migrateLegacyFlatAllowPrivateNetworkAlias({
		entry: updatedMattermost,
		pathPrefix: "channels.mattermost",
		changes
	});
	updatedMattermost = topLevel.entry;
	changed = changed || topLevel.changed;
	const accounts = isRecord(updatedMattermost.accounts) ? updatedMattermost.accounts : null;
	if (accounts) {
		let accountsChanged = false;
		const nextAccounts = { ...accounts };
		for (const [accountId, accountValue] of Object.entries(accounts)) {
			const account = isRecord(accountValue) ? accountValue : null;
			if (!account) continue;
			const migrated = migrateLegacyFlatAllowPrivateNetworkAlias({
				entry: account,
				pathPrefix: `channels.mattermost.accounts.${accountId}`,
				changes
			});
			if (!migrated.changed) continue;
			nextAccounts[accountId] = migrated.entry;
			accountsChanged = true;
		}
		if (accountsChanged) {
			updatedMattermost = {
				...updatedMattermost,
				accounts: nextAccounts
			};
			changed = true;
		}
	}
	if (!changed) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				mattermost: updatedMattermost
			}
		},
		changes
	};
}
//#endregion
export { collectRuntimeConfigAssignments, legacyConfigRules, normalizeCompatibilityConfig, secretTargetRegistryEntries };
