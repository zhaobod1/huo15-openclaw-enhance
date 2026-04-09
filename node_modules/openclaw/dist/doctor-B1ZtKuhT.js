import { t as collectProviderDangerousNameMatchingScopes } from "./dangerous-name-matching-CMg2IF_2.js";
import "./runtime-doctor-Ac5edmSG.js";
import { t as resolveDiscordPreviewStreamMode } from "./preview-streaming-BlSrG5YE.js";
import { t as DISCORD_LEGACY_CONFIG_RULES } from "./doctor-shared-CJkx97Bx.js";
//#region extensions/discord/src/doctor.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function sanitizeForLog(value) {
	return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
function isDiscordMutableAllowEntry(raw) {
	const text = raw.trim();
	if (!text || text === "*") return false;
	const maybeMentionId = text.replace(/^<@!?/, "").replace(/>$/, "");
	if (/^\d+$/.test(maybeMentionId)) return false;
	for (const prefix of [
		"discord:",
		"user:",
		"pk:"
	]) {
		if (!text.startsWith(prefix)) continue;
		return text.slice(prefix.length).trim().length === 0;
	}
	return true;
}
function normalizeDiscordDmAliases(params) {
	let changed = false;
	let updated = params.entry;
	const rawDm = updated.dm;
	const dm = asObjectRecord(rawDm) ? structuredClone(rawDm) : null;
	let dmChanged = false;
	const allowFromEqual = (a, b) => {
		if (!Array.isArray(a) || !Array.isArray(b)) return false;
		const na = a.map((v) => String(v).trim()).filter(Boolean);
		const nb = b.map((v) => String(v).trim()).filter(Boolean);
		if (na.length !== nb.length) return false;
		return na.every((v, i) => v === nb[i]);
	};
	const topDmPolicy = updated.dmPolicy;
	const legacyDmPolicy = dm?.policy;
	if (topDmPolicy === void 0 && legacyDmPolicy !== void 0) {
		updated = {
			...updated,
			dmPolicy: legacyDmPolicy
		};
		changed = true;
		if (dm) {
			delete dm.policy;
			dmChanged = true;
		}
		params.changes.push(`Moved ${params.pathPrefix}.dm.policy → ${params.pathPrefix}.dmPolicy.`);
	} else if (topDmPolicy !== void 0 && legacyDmPolicy !== void 0 && topDmPolicy === legacyDmPolicy) {
		if (dm) {
			delete dm.policy;
			dmChanged = true;
			params.changes.push(`Removed ${params.pathPrefix}.dm.policy (dmPolicy already set).`);
		}
	}
	const topAllowFrom = updated.allowFrom;
	const legacyAllowFrom = dm?.allowFrom;
	if (topAllowFrom === void 0 && legacyAllowFrom !== void 0) {
		updated = {
			...updated,
			allowFrom: legacyAllowFrom
		};
		changed = true;
		if (dm) {
			delete dm.allowFrom;
			dmChanged = true;
		}
		params.changes.push(`Moved ${params.pathPrefix}.dm.allowFrom → ${params.pathPrefix}.allowFrom.`);
	} else if (topAllowFrom !== void 0 && legacyAllowFrom !== void 0 && allowFromEqual(topAllowFrom, legacyAllowFrom)) {
		if (dm) {
			delete dm.allowFrom;
			dmChanged = true;
			params.changes.push(`Removed ${params.pathPrefix}.dm.allowFrom (allowFrom already set).`);
		}
	}
	if (dm && asObjectRecord(rawDm) && dmChanged) if (Object.keys(dm).length === 0) {
		if (updated.dm !== void 0) {
			const { dm: _ignored, ...rest } = updated;
			updated = rest;
			changed = true;
			params.changes.push(`Removed empty ${params.pathPrefix}.dm after migration.`);
		}
	} else {
		updated = {
			...updated,
			dm
		};
		changed = true;
	}
	return {
		entry: updated,
		changed
	};
}
function normalizeDiscordStreamingAliases(params) {
	let updated = params.entry;
	const hadLegacyStreamMode = updated.streamMode !== void 0;
	const beforeStreaming = updated.streaming;
	const resolved = resolveDiscordPreviewStreamMode(updated);
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
	if (params.pathPrefix.startsWith("channels.discord") && resolved === "off" && hadLegacyStreamMode) params.changes.push(`${params.pathPrefix}.streaming remains off by default to avoid Discord preview-edit rate limits; set ${params.pathPrefix}.streaming="partial" to opt in explicitly.`);
	return {
		entry: updated,
		changed
	};
}
function normalizeDiscordCompatibilityConfig(cfg) {
	const rawEntry = asObjectRecord(cfg.channels?.discord);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	const base = normalizeDiscordDmAliases({
		entry: rawEntry,
		pathPrefix: "channels.discord",
		changes
	});
	updated = base.entry;
	changed = base.changed;
	const streaming = normalizeDiscordStreamingAliases({
		entry: updated,
		pathPrefix: "channels.discord",
		changes
	});
	updated = streaming.entry;
	changed = changed || streaming.changed;
	const rawAccounts = asObjectRecord(updated.accounts);
	if (rawAccounts) {
		let accountsChanged = false;
		const accounts = { ...rawAccounts };
		for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
			const account = asObjectRecord(rawAccount);
			if (!account) continue;
			let accountEntry = account;
			let accountChanged = false;
			const dm = normalizeDiscordDmAliases({
				entry: account,
				pathPrefix: `channels.discord.accounts.${accountId}`,
				changes
			});
			accountEntry = dm.entry;
			accountChanged = dm.changed;
			const accountStreaming = normalizeDiscordStreamingAliases({
				entry: accountEntry,
				pathPrefix: `channels.discord.accounts.${accountId}`,
				changes
			});
			accountEntry = accountStreaming.entry;
			accountChanged = accountChanged || accountStreaming.changed;
			if (accountChanged) {
				accounts[accountId] = accountEntry;
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
	if (!changed) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				discord: updated
			}
		},
		changes
	};
}
function collectDiscordAccountScopes(cfg) {
	const scopes = [];
	const discord = asObjectRecord(cfg.channels?.discord);
	if (!discord) return scopes;
	scopes.push({
		prefix: "channels.discord",
		account: discord
	});
	const accounts = asObjectRecord(discord.accounts);
	if (!accounts) return scopes;
	for (const key of Object.keys(accounts)) {
		const account = asObjectRecord(accounts[key]);
		if (account) scopes.push({
			prefix: `channels.discord.accounts.${key}`,
			account
		});
	}
	return scopes;
}
function collectDiscordIdLists(prefix, account) {
	const refs = [{
		pathLabel: `${prefix}.allowFrom`,
		holder: account,
		key: "allowFrom"
	}];
	const dm = asObjectRecord(account.dm);
	if (dm) {
		refs.push({
			pathLabel: `${prefix}.dm.allowFrom`,
			holder: dm,
			key: "allowFrom"
		});
		refs.push({
			pathLabel: `${prefix}.dm.groupChannels`,
			holder: dm,
			key: "groupChannels"
		});
	}
	const execApprovals = asObjectRecord(account.execApprovals);
	if (execApprovals) refs.push({
		pathLabel: `${prefix}.execApprovals.approvers`,
		holder: execApprovals,
		key: "approvers"
	});
	const guilds = asObjectRecord(account.guilds);
	if (!guilds) return refs;
	for (const guildId of Object.keys(guilds)) {
		const guild = asObjectRecord(guilds[guildId]);
		if (!guild) continue;
		refs.push({
			pathLabel: `${prefix}.guilds.${guildId}.users`,
			holder: guild,
			key: "users"
		});
		refs.push({
			pathLabel: `${prefix}.guilds.${guildId}.roles`,
			holder: guild,
			key: "roles"
		});
		const channels = asObjectRecord(guild.channels);
		if (!channels) continue;
		for (const channelId of Object.keys(channels)) {
			const channel = asObjectRecord(channels[channelId]);
			if (!channel) continue;
			refs.push({
				pathLabel: `${prefix}.guilds.${guildId}.channels.${channelId}.users`,
				holder: channel,
				key: "users"
			});
			refs.push({
				pathLabel: `${prefix}.guilds.${guildId}.channels.${channelId}.roles`,
				holder: channel,
				key: "roles"
			});
		}
	}
	return refs;
}
function scanDiscordNumericIdEntries(cfg) {
	const hits = [];
	const scanList = (pathLabel, list) => {
		if (!Array.isArray(list)) return;
		for (const [index, entry] of list.entries()) {
			if (typeof entry !== "number") continue;
			hits.push({
				path: `${pathLabel}[${index}]`,
				entry,
				safe: Number.isSafeInteger(entry) && entry >= 0
			});
		}
	};
	for (const scope of collectDiscordAccountScopes(cfg)) for (const ref of collectDiscordIdLists(scope.prefix, scope.account)) scanList(ref.pathLabel, ref.holder[ref.key]);
	return hits;
}
function collectDiscordNumericIdWarnings(params) {
	if (params.hits.length === 0) return [];
	const hitsByListPath = /* @__PURE__ */ new Map();
	for (const hit of params.hits) {
		const listPath = hit.path.replace(/\[\d+\]$/, "");
		const existing = hitsByListPath.get(listPath);
		if (existing) existing.push(hit);
		else hitsByListPath.set(listPath, [hit]);
	}
	const repairableHits = [];
	const blockedHits = [];
	for (const hits of hitsByListPath.values()) if (hits.some((hit) => !hit.safe)) blockedHits.push(...hits);
	else repairableHits.push(...hits);
	const lines = [];
	if (repairableHits.length > 0) {
		const sample = repairableHits[0];
		lines.push(`- Discord allowlists contain ${repairableHits.length} numeric ${repairableHits.length === 1 ? "entry" : "entries"} (e.g. ${sanitizeForLog(sample.path)}=${sanitizeForLog(String(sample.entry))}).`, `- Discord IDs must be strings; run "${params.doctorFixCommand}" to convert numeric IDs to quoted strings.`);
	}
	if (blockedHits.length > 0) {
		const sample = blockedHits[0];
		lines.push(`- Discord allowlists contain ${blockedHits.length} numeric ${blockedHits.length === 1 ? "entry" : "entries"} in lists that cannot be auto-repaired (e.g. ${sanitizeForLog(sample.path)}).`, `- These lists include invalid or precision-losing numeric IDs; manually quote the original values in your config file, then rerun "${params.doctorFixCommand}".`);
	}
	return lines;
}
function maybeRepairDiscordNumericIds(cfg, doctorFixCommand) {
	const hits = scanDiscordNumericIdEntries(cfg);
	if (hits.length === 0) return {
		config: cfg,
		changes: []
	};
	const next = structuredClone(cfg);
	const changes = [];
	const repairList = (pathLabel, holder, key) => {
		const raw = holder[key];
		if (!Array.isArray(raw)) return;
		if (raw.some((entry) => typeof entry === "number" && (!Number.isSafeInteger(entry) || entry < 0))) return;
		let converted = 0;
		holder[key] = raw.map((entry) => {
			if (typeof entry === "number") {
				converted += 1;
				return String(entry);
			}
			return entry;
		});
		if (converted > 0) changes.push(`- ${sanitizeForLog(pathLabel)}: converted ${converted} numeric ${converted === 1 ? "ID" : "IDs"} to strings`);
	};
	for (const scope of collectDiscordAccountScopes(next)) for (const ref of collectDiscordIdLists(scope.prefix, scope.account)) repairList(ref.pathLabel, ref.holder, ref.key);
	if (changes.length === 0) return {
		config: cfg,
		changes: [],
		warnings: collectDiscordNumericIdWarnings({
			hits,
			doctorFixCommand
		})
	};
	return {
		config: next,
		changes,
		warnings: collectDiscordNumericIdWarnings({
			hits: hits.filter((hit) => !hit.safe),
			doctorFixCommand
		})
	};
}
function collectDiscordMutableAllowlistWarnings(cfg) {
	const hits = [];
	const addHits = (pathLabel, list) => {
		if (!Array.isArray(list)) return;
		for (const entry of list) {
			const text = String(entry).trim();
			if (!text || text === "*" || !isDiscordMutableAllowEntry(text)) continue;
			hits.push({
				path: pathLabel,
				entry: text
			});
		}
	};
	for (const scope of collectProviderDangerousNameMatchingScopes(cfg, "discord")) {
		if (scope.dangerousNameMatchingEnabled) continue;
		addHits(`${scope.prefix}.allowFrom`, scope.account.allowFrom);
		const dm = asObjectRecord(scope.account.dm);
		if (dm) addHits(`${scope.prefix}.dm.allowFrom`, dm.allowFrom);
		const guilds = asObjectRecord(scope.account.guilds);
		if (!guilds) continue;
		for (const [guildId, guildRaw] of Object.entries(guilds)) {
			const guild = asObjectRecord(guildRaw);
			if (!guild) continue;
			addHits(`${scope.prefix}.guilds.${guildId}.users`, guild.users);
			const channels = asObjectRecord(guild.channels);
			if (!channels) continue;
			for (const [channelId, channelRaw] of Object.entries(channels)) {
				const channel = asObjectRecord(channelRaw);
				if (channel) addHits(`${scope.prefix}.guilds.${guildId}.channels.${channelId}.users`, channel.users);
			}
		}
	}
	if (hits.length === 0) return [];
	const exampleLines = hits.slice(0, 8).map((hit) => `- ${sanitizeForLog(hit.path)}: ${sanitizeForLog(hit.entry)}`);
	const remaining = hits.length > 8 ? `- +${hits.length - 8} more mutable allowlist entries.` : null;
	return [
		`- Found ${hits.length} mutable allowlist ${hits.length === 1 ? "entry" : "entries"} across discord while name matching is disabled by default.`,
		...exampleLines,
		...remaining ? [remaining] : [],
		`- Option A (break-glass): enable channels.discord.dangerousNameMatching=true for the affected scope.`,
		`- Option B (recommended): resolve names to stable Discord IDs and rewrite the allowlist entries.`
	];
}
const discordDoctor = {
	dmAllowFromMode: "topOrNested",
	groupModel: "route",
	groupAllowFromFallbackToAllowFrom: false,
	warnOnEmptyGroupSenderAllowlist: false,
	legacyConfigRules: DISCORD_LEGACY_CONFIG_RULES,
	normalizeCompatibilityConfig: ({ cfg }) => normalizeDiscordCompatibilityConfig(cfg),
	collectPreviewWarnings: ({ cfg, doctorFixCommand }) => collectDiscordNumericIdWarnings({
		hits: scanDiscordNumericIdEntries(cfg),
		doctorFixCommand
	}),
	collectMutableAllowlistWarnings: ({ cfg }) => collectDiscordMutableAllowlistWarnings(cfg),
	repairConfig: ({ cfg, doctorFixCommand }) => maybeRepairDiscordNumericIds(cfg, doctorFixCommand)
};
//#endregion
export { collectDiscordNumericIdWarnings, discordDoctor, maybeRepairDiscordNumericIds, scanDiscordNumericIdEntries };
