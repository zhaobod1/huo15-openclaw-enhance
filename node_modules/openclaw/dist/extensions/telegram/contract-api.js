import { t as resolveTelegramPreviewStreamMode } from "../../preview-streaming-CdKNfjeG.js";
import { t as collectTelegramSecurityAuditFindings } from "../../security-audit-DNhN4HVV.js";
import { t as parseTelegramTopicConversation } from "../../topic-conversation-CNt_Cuq0.js";
import { a as buildTelegramModelsProviderChannelData, t as buildCommandsPaginationKeyboard } from "../../command-ui-BcPWw2rl.js";
import { i as resolveTelegramCustomCommands, n as normalizeTelegramCommandDescription, r as normalizeTelegramCommandName, t as TELEGRAM_COMMAND_NAME_PATTERN } from "../../command-config-C_OqJKyM.js";
import { n as collectRuntimeConfigAssignments, r as secretTargetRegistryEntries, t as singleAccountKeysToMove } from "../../setup-contract-DfZJm7Lt.js";
//#region extensions/telegram/src/doctor-contract.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function normalizeTelegramStreamingAliases(params) {
	let updated = params.entry;
	const hadLegacyStreamMode = updated.streamMode !== void 0;
	const beforeStreaming = updated.streaming;
	const resolved = resolveTelegramPreviewStreamMode(updated);
	if (!(hadLegacyStreamMode || typeof beforeStreaming === "boolean" || typeof beforeStreaming === "string" && beforeStreaming !== resolved)) return {
		entry: updated,
		changed: false
	};
	let changed = false;
	if (beforeStreaming !== resolved) {
		updated = {
			...updated,
			streaming: resolved
		};
		changed = true;
	}
	if (hadLegacyStreamMode) {
		const { streamMode: _ignored, ...rest } = updated;
		updated = rest;
		changed = true;
		params.changes.push(`Moved ${params.pathPrefix}.streamMode → ${params.pathPrefix}.streaming (${resolved}).`);
	}
	if (typeof beforeStreaming === "boolean") params.changes.push(`Normalized ${params.pathPrefix}.streaming boolean → enum (${resolved}).`);
	else if (typeof beforeStreaming === "string" && beforeStreaming !== resolved) params.changes.push(`Normalized ${params.pathPrefix}.streaming (${beforeStreaming}) → (${resolved}).`);
	return {
		entry: updated,
		changed
	};
}
function hasLegacyTelegramStreamingAliases(value) {
	const entry = asObjectRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean" || typeof entry.streaming === "string" && entry.streaming !== resolveTelegramPreviewStreamMode(entry);
}
function hasLegacyTelegramAccountStreamingAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacyTelegramStreamingAliases(account));
}
function resolveCompatibleDefaultGroupEntry(section) {
	const existingGroups = section.groups;
	if (existingGroups !== void 0 && !asObjectRecord(existingGroups)) return null;
	const groups = asObjectRecord(existingGroups) ?? {};
	const existingEntry = groups["*"];
	if (existingEntry !== void 0 && !asObjectRecord(existingEntry)) return null;
	return {
		groups,
		entry: asObjectRecord(existingEntry) ?? {}
	};
}
const legacyConfigRules = [
	{
		path: [
			"channels",
			"telegram",
			"groupMentionsOnly"
		],
		message: "channels.telegram.groupMentionsOnly was removed; use channels.telegram.groups.\"*\".requireMention instead. Run \"openclaw doctor --fix\"."
	},
	{
		path: ["channels", "telegram"],
		message: "channels.telegram.streamMode and boolean channels.telegram.streaming are legacy; use channels.telegram.streaming=\"off|partial|block\".",
		match: hasLegacyTelegramStreamingAliases
	},
	{
		path: [
			"channels",
			"telegram",
			"accounts"
		],
		message: "channels.telegram.accounts.<id>.streamMode and boolean channels.telegram.accounts.<id>.streaming are legacy; use channels.telegram.accounts.<id>.streaming=\"off|partial|block\".",
		match: hasLegacyTelegramAccountStreamingAliases
	}
];
function normalizeCompatibilityConfig({ cfg }) {
	const rawEntry = asObjectRecord(cfg.channels?.telegram);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	if (updated.groupMentionsOnly !== void 0) {
		const defaultGroupEntry = resolveCompatibleDefaultGroupEntry(updated);
		if (!defaultGroupEntry) changes.push("Skipped channels.telegram.groupMentionsOnly migration because channels.telegram.groups already has an incompatible shape; fix remaining issues manually.");
		else {
			const { groups, entry } = defaultGroupEntry;
			if (entry.requireMention === void 0) {
				entry.requireMention = updated.groupMentionsOnly;
				groups["*"] = entry;
				updated = {
					...updated,
					groups
				};
				changes.push("Moved channels.telegram.groupMentionsOnly → channels.telegram.groups.\"*\".requireMention.");
			} else changes.push("Removed channels.telegram.groupMentionsOnly (channels.telegram.groups.\"*\" already set).");
			const { groupMentionsOnly: _ignored, ...rest } = updated;
			updated = rest;
			changed = true;
		}
	}
	const base = normalizeTelegramStreamingAliases({
		entry: updated,
		pathPrefix: "channels.telegram",
		changes
	});
	updated = base.entry;
	changed = changed || base.changed;
	const rawAccounts = asObjectRecord(updated.accounts);
	if (rawAccounts) {
		let accountsChanged = false;
		const accounts = { ...rawAccounts };
		for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
			const account = asObjectRecord(rawAccount);
			if (!account) continue;
			const accountStreaming = normalizeTelegramStreamingAliases({
				entry: account,
				pathPrefix: `channels.telegram.accounts.${accountId}`,
				changes
			});
			if (accountStreaming.changed) {
				accounts[accountId] = accountStreaming.entry;
				accountsChanged = true;
			}
		}
		if (accountsChanged) {
			updated = {
				...updated,
				accounts
			};
			changed = true;
		}
	}
	if (!changed && changes.length === 0) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				telegram: updated
			}
		},
		changes
	};
}
//#endregion
export { TELEGRAM_COMMAND_NAME_PATTERN, buildCommandsPaginationKeyboard, buildTelegramModelsProviderChannelData, collectRuntimeConfigAssignments, collectTelegramSecurityAuditFindings, legacyConfigRules, normalizeCompatibilityConfig, normalizeTelegramCommandDescription, normalizeTelegramCommandName, parseTelegramTopicConversation, resolveTelegramCustomCommands, secretTargetRegistryEntries, singleAccountKeysToMove };
