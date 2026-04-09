import { i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { i as isRecord } from "./shared-BTjsck-6.js";
import { s as wrapExternalContent } from "./external-content-Ds1GARoy.js";
import { a as hasOwnProperty, o as isChannelAccountEffectivelyEnabled, r as collectSecretInputAssignment, s as isEnabledFlag, t as collectTtsApiKeyAssignments } from "./runtime-config-collectors-tts-B43VyFVH.js";
import "./dm-policy-shared-CWGTUVOf.js";
//#region src/secrets/channel-secret-collector-runtime.ts
function getChannelRecord(config, channelKey) {
	const channels = config.channels;
	if (!isRecord(channels)) return;
	const channel = channels[channelKey];
	return isRecord(channel) ? channel : void 0;
}
function getChannelSurface(config, channelKey) {
	const channel = getChannelRecord(config, channelKey);
	if (!channel) return null;
	return {
		channel,
		surface: resolveChannelAccountSurface(channel)
	};
}
function resolveChannelAccountSurface(channel) {
	const channelEnabled = isEnabledFlag(channel);
	const accounts = channel.accounts;
	if (!isRecord(accounts) || Object.keys(accounts).length === 0) return {
		hasExplicitAccounts: false,
		channelEnabled,
		accounts: [{
			accountId: "default",
			account: channel,
			enabled: channelEnabled
		}]
	};
	const accountEntries = [];
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!isRecord(account)) continue;
		accountEntries.push({
			accountId,
			account,
			enabled: isChannelAccountEffectivelyEnabled(channel, account)
		});
	}
	return {
		hasExplicitAccounts: true,
		channelEnabled,
		accounts: accountEntries
	};
}
function isBaseFieldActiveForChannelSurface(surface, rootKey) {
	if (!surface.channelEnabled) return false;
	if (!surface.hasExplicitAccounts) return true;
	return surface.accounts.some(({ account, enabled }) => enabled && !hasOwnProperty(account, rootKey));
}
function normalizeSecretStringValue(value) {
	return typeof value === "string" ? value.trim() : "";
}
function hasConfiguredSecretInputValue(value, defaults) {
	return normalizeSecretStringValue(value).length > 0 || coerceSecretRef(value, defaults) !== null;
}
function collectSimpleChannelFieldAssignments(params) {
	collectSecretInputAssignment({
		value: params.channel[params.field],
		path: `channels.${params.channelKey}.${params.field}`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: isBaseFieldActiveForChannelSurface(params.surface, params.field),
		inactiveReason: params.topInactiveReason,
		apply: (value) => {
			params.channel[params.field] = value;
		}
	});
	if (!params.surface.hasExplicitAccounts) return;
	for (const { accountId, account, enabled } of params.surface.accounts) {
		if (!hasOwnProperty(account, params.field)) continue;
		collectSecretInputAssignment({
			value: account[params.field],
			path: `channels.${params.channelKey}.accounts.${accountId}.${params.field}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: enabled,
			inactiveReason: params.accountInactiveReason,
			apply: (value) => {
				account[params.field] = value;
			}
		});
	}
}
function isConditionalTopLevelFieldActive(params) {
	if (!params.surface.channelEnabled) return false;
	if (!params.surface.hasExplicitAccounts) return params.activeWithoutAccounts;
	return params.surface.accounts.some(params.inheritedAccountActive);
}
function collectConditionalChannelFieldAssignments(params) {
	collectSecretInputAssignment({
		value: params.channel[params.field],
		path: `channels.${params.channelKey}.${params.field}`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: isConditionalTopLevelFieldActive({
			surface: params.surface,
			activeWithoutAccounts: params.topLevelActiveWithoutAccounts,
			inheritedAccountActive: params.topLevelInheritedAccountActive
		}),
		inactiveReason: params.topInactiveReason,
		apply: (value) => {
			params.channel[params.field] = value;
		}
	});
	if (!params.surface.hasExplicitAccounts) return;
	for (const entry of params.surface.accounts) {
		if (!hasOwnProperty(entry.account, params.field)) continue;
		collectSecretInputAssignment({
			value: entry.account[params.field],
			path: `channels.${params.channelKey}.accounts.${entry.accountId}.${params.field}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.accountActive(entry),
			inactiveReason: typeof params.accountInactiveReason === "function" ? params.accountInactiveReason(entry) : params.accountInactiveReason,
			apply: (value) => {
				entry.account[params.field] = value;
			}
		});
	}
}
function collectNestedChannelFieldAssignments(params) {
	const topLevelNested = params.channel[params.nestedKey];
	if (isRecord(topLevelNested)) collectSecretInputAssignment({
		value: topLevelNested[params.field],
		path: `channels.${params.channelKey}.${params.nestedKey}.${params.field}`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: params.topLevelActive,
		inactiveReason: params.topInactiveReason,
		apply: (value) => {
			topLevelNested[params.field] = value;
		}
	});
	if (!params.surface.hasExplicitAccounts) return;
	for (const entry of params.surface.accounts) {
		const nested = entry.account[params.nestedKey];
		if (!isRecord(nested)) continue;
		collectSecretInputAssignment({
			value: nested[params.field],
			path: `channels.${params.channelKey}.accounts.${entry.accountId}.${params.nestedKey}.${params.field}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.accountActive(entry),
			inactiveReason: typeof params.accountInactiveReason === "function" ? params.accountInactiveReason(entry) : params.accountInactiveReason,
			apply: (value) => {
				nested[params.field] = value;
			}
		});
	}
}
function collectNestedChannelTtsAssignments(params) {
	const topLevelNested = params.channel[params.nestedKey];
	if (isRecord(topLevelNested) && isRecord(topLevelNested.tts)) collectTtsApiKeyAssignments({
		tts: topLevelNested.tts,
		pathPrefix: `channels.${params.channelKey}.${params.nestedKey}.tts`,
		defaults: params.defaults,
		context: params.context,
		active: params.topLevelActive,
		inactiveReason: params.topInactiveReason
	});
	if (!params.surface.hasExplicitAccounts) return;
	for (const entry of params.surface.accounts) {
		const nested = entry.account[params.nestedKey];
		if (!isRecord(nested) || !isRecord(nested.tts)) continue;
		collectTtsApiKeyAssignments({
			tts: nested.tts,
			pathPrefix: `channels.${params.channelKey}.accounts.${entry.accountId}.${params.nestedKey}.tts`,
			defaults: params.defaults,
			context: params.context,
			active: params.accountActive(entry),
			inactiveReason: typeof params.accountInactiveReason === "function" ? params.accountInactiveReason(entry) : params.accountInactiveReason
		});
	}
}
//#endregion
//#region src/security/channel-metadata.ts
const DEFAULT_MAX_CHARS = 800;
const DEFAULT_MAX_ENTRY_CHARS = 400;
function normalizeEntry(entry) {
	return entry.replace(/\s+/g, " ").trim();
}
function truncateText(value, maxChars) {
	if (maxChars <= 0) return "";
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}
function buildUntrustedChannelMetadata(params) {
	const deduped = params.entries.map((entry) => typeof entry === "string" ? normalizeEntry(entry) : "").filter((entry) => Boolean(entry)).map((entry) => truncateText(entry, DEFAULT_MAX_ENTRY_CHARS)).filter((entry, index, list) => list.indexOf(entry) === index);
	if (deduped.length === 0) return;
	const body = deduped.join("\n");
	return wrapExternalContent(truncateText(`${`UNTRUSTED channel metadata (${params.source})`}\n${`${params.label}:\n${body}`}`, params.maxChars ?? DEFAULT_MAX_CHARS), {
		source: "channel_metadata",
		includeWarning: false
	});
}
//#endregion
export { collectSimpleChannelFieldAssignments as a, hasConfiguredSecretInputValue as c, resolveChannelAccountSurface as d, collectNestedChannelTtsAssignments as i, isBaseFieldActiveForChannelSurface as l, collectConditionalChannelFieldAssignments as n, getChannelRecord as o, collectNestedChannelFieldAssignments as r, getChannelSurface as s, buildUntrustedChannelMetadata as t, normalizeSecretStringValue as u };
