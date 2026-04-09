import { i as isRecord$1 } from "./shared-BTjsck-6.js";
import { s as isEnabledFlag } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { a as collectSimpleChannelFieldAssignments, i as collectNestedChannelTtsAssignments, l as isBaseFieldActiveForChannelSurface, r as collectNestedChannelFieldAssignments, s as getChannelSurface } from "./security-runtime-DoGZwxD5.js";
import { t as resolveDiscordPreviewStreamMode } from "./preview-streaming-BlSrG5YE.js";
//#region extensions/discord/src/doctor-contract.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function normalizeDiscordDmAliases(params) {
	let changed = false;
	let updated = params.entry;
	const rawDm = updated.dm;
	const dm = asObjectRecord(rawDm) ? structuredClone(rawDm) : null;
	let dmChanged = false;
	const shouldPromoteLegacyAllowFrom = !(params.pathPrefix === "channels.discord" && asObjectRecord(updated.accounts));
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
	if (shouldPromoteLegacyAllowFrom) {
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
function hasLegacyDiscordStreamingAliases(value) {
	const entry = asObjectRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean" || typeof entry.streaming === "string" && entry.streaming !== resolveDiscordPreviewStreamMode(entry);
}
function hasLegacyDiscordAccountStreamingAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacyDiscordStreamingAliases(account));
}
const LEGACY_TTS_PROVIDER_KEYS = [
	"openai",
	"elevenlabs",
	"microsoft",
	"edge"
];
function hasLegacyTtsProviderKeys(value) {
	const tts = asObjectRecord(value);
	if (!tts) return false;
	return LEGACY_TTS_PROVIDER_KEYS.some((key) => Object.prototype.hasOwnProperty.call(tts, key));
}
function hasLegacyDiscordAccountTtsProviderKeys(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((accountValue) => {
		return hasLegacyTtsProviderKeys(asObjectRecord(asObjectRecord(accountValue)?.voice)?.tts);
	});
}
function mergeMissing(target, source) {
	for (const [key, value] of Object.entries(source)) {
		if (value === void 0) continue;
		const existing = target[key];
		if (existing === void 0) {
			target[key] = value;
			continue;
		}
		if (existing && typeof existing === "object" && !Array.isArray(existing) && value && typeof value === "object" && !Array.isArray(value)) mergeMissing(existing, value);
	}
}
function getOrCreateTtsProviders(tts) {
	const providers = asObjectRecord(tts.providers) ?? {};
	tts.providers = providers;
	return providers;
}
function mergeLegacyTtsProviderConfig(tts, legacyKey, providerId) {
	const legacyValue = asObjectRecord(tts[legacyKey]);
	if (!legacyValue) return false;
	const providers = getOrCreateTtsProviders(tts);
	const existing = asObjectRecord(providers[providerId]) ?? {};
	const merged = structuredClone(existing);
	mergeMissing(merged, legacyValue);
	providers[providerId] = merged;
	delete tts[legacyKey];
	return true;
}
function migrateLegacyTtsConfig(tts, pathLabel, changes) {
	if (!tts) return false;
	let changed = false;
	if (mergeLegacyTtsProviderConfig(tts, "openai", "openai")) {
		changes.push(`Moved ${pathLabel}.openai → ${pathLabel}.providers.openai.`);
		changed = true;
	}
	if (mergeLegacyTtsProviderConfig(tts, "elevenlabs", "elevenlabs")) {
		changes.push(`Moved ${pathLabel}.elevenlabs → ${pathLabel}.providers.elevenlabs.`);
		changed = true;
	}
	if (mergeLegacyTtsProviderConfig(tts, "microsoft", "microsoft")) {
		changes.push(`Moved ${pathLabel}.microsoft → ${pathLabel}.providers.microsoft.`);
		changed = true;
	}
	if (mergeLegacyTtsProviderConfig(tts, "edge", "microsoft")) {
		changes.push(`Moved ${pathLabel}.edge → ${pathLabel}.providers.microsoft.`);
		changed = true;
	}
	return changed;
}
const legacyConfigRules = [
	{
		path: ["channels", "discord"],
		message: "channels.discord.streamMode and boolean channels.discord.streaming are legacy; use channels.discord.streaming.",
		match: hasLegacyDiscordStreamingAliases
	},
	{
		path: [
			"channels",
			"discord",
			"accounts"
		],
		message: "channels.discord.accounts.<id>.streamMode and boolean channels.discord.accounts.<id>.streaming are legacy; use channels.discord.accounts.<id>.streaming.",
		match: hasLegacyDiscordAccountStreamingAliases
	},
	{
		path: [
			"channels",
			"discord",
			"voice",
			"tts"
		],
		message: "channels.discord.voice.tts.<provider> keys (openai/elevenlabs/microsoft/edge) are legacy; use channels.discord.voice.tts.providers.<provider>. Run \"openclaw doctor --fix\".",
		match: hasLegacyTtsProviderKeys
	},
	{
		path: [
			"channels",
			"discord",
			"accounts"
		],
		message: "channels.discord.accounts.<id>.voice.tts.<provider> keys (openai/elevenlabs/microsoft/edge) are legacy; use channels.discord.accounts.<id>.voice.tts.providers.<provider>. Run \"openclaw doctor --fix\".",
		match: hasLegacyDiscordAccountTtsProviderKeys
	}
];
function normalizeCompatibilityConfig({ cfg }) {
	const rawEntry = asObjectRecord(cfg.channels?.discord);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	const dm = normalizeDiscordDmAliases({
		entry: updated,
		pathPrefix: "channels.discord",
		changes
	});
	updated = dm.entry;
	changed = changed || dm.changed;
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
			const accountDm = normalizeDiscordDmAliases({
				entry: accountEntry,
				pathPrefix: `channels.discord.accounts.${accountId}`,
				changes
			});
			accountEntry = accountDm.entry;
			accountChanged = accountDm.changed;
			const accountStreaming = normalizeDiscordStreamingAliases({
				entry: accountEntry,
				pathPrefix: `channels.discord.accounts.${accountId}`,
				changes
			});
			accountEntry = accountStreaming.entry;
			accountChanged = accountChanged || accountStreaming.changed;
			const accountVoice = asObjectRecord(accountEntry.voice);
			if (accountVoice && migrateLegacyTtsConfig(asObjectRecord(accountVoice.tts), `channels.discord.accounts.${accountId}.voice.tts`, changes)) {
				accountEntry = {
					...accountEntry,
					voice: accountVoice
				};
				accountChanged = true;
			}
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
	const voice = asObjectRecord(updated.voice);
	if (voice && migrateLegacyTtsConfig(asObjectRecord(voice.tts), "channels.discord.voice.tts", changes)) {
		updated = {
			...updated,
			voice
		};
		changed = true;
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
//#endregion
//#region extensions/discord/src/secret-config-contract.ts
const secretTargetRegistryEntries = [
	{
		id: "channels.discord.accounts.*.pluralkit.token",
		targetType: "channels.discord.accounts.*.pluralkit.token",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.accounts.*.pluralkit.token",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.discord.accounts.*.token",
		targetType: "channels.discord.accounts.*.token",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.accounts.*.token",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.discord.accounts.*.voice.tts.providers.*.apiKey",
		targetType: "channels.discord.accounts.*.voice.tts.providers.*.apiKey",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.accounts.*.voice.tts.providers.*.apiKey",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true,
		providerIdPathSegmentIndex: 6
	},
	{
		id: "channels.discord.pluralkit.token",
		targetType: "channels.discord.pluralkit.token",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.pluralkit.token",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.discord.token",
		targetType: "channels.discord.token",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.token",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.discord.voice.tts.providers.*.apiKey",
		targetType: "channels.discord.voice.tts.providers.*.apiKey",
		configFile: "openclaw.json",
		pathPattern: "channels.discord.voice.tts.providers.*.apiKey",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true,
		providerIdPathSegmentIndex: 4
	}
];
function collectRuntimeConfigAssignments(params) {
	const resolved = getChannelSurface(params.config, "discord");
	if (!resolved) return;
	const { channel: discord, surface } = resolved;
	collectSimpleChannelFieldAssignments({
		channelKey: "discord",
		field: "token",
		channel: discord,
		surface,
		defaults: params.defaults,
		context: params.context,
		topInactiveReason: "no enabled account inherits this top-level Discord token.",
		accountInactiveReason: "Discord account is disabled."
	});
	collectNestedChannelFieldAssignments({
		channelKey: "discord",
		nestedKey: "pluralkit",
		field: "token",
		channel: discord,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActive: isBaseFieldActiveForChannelSurface(surface, "pluralkit") && isRecord$1(discord.pluralkit) && isEnabledFlag(discord.pluralkit),
		topInactiveReason: "no enabled Discord surface inherits this top-level PluralKit config or PluralKit is disabled.",
		accountActive: ({ account, enabled }) => enabled && isRecord$1(account.pluralkit) && isEnabledFlag(account.pluralkit),
		accountInactiveReason: "Discord account is disabled or PluralKit is disabled for this account."
	});
	collectNestedChannelTtsAssignments({
		channelKey: "discord",
		nestedKey: "voice",
		channel: discord,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActive: isBaseFieldActiveForChannelSurface(surface, "voice") && isRecord$1(discord.voice) && isEnabledFlag(discord.voice),
		topInactiveReason: "no enabled Discord surface inherits this top-level voice config or voice is disabled.",
		accountActive: ({ account, enabled }) => enabled && isRecord$1(account.voice) && isEnabledFlag(account.voice),
		accountInactiveReason: "Discord account is disabled or voice is disabled for this account."
	});
}
//#endregion
//#region extensions/discord/src/security-contract.ts
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
const unsupportedSecretRefSurfacePatterns = ["channels.discord.threadBindings.webhookToken", "channels.discord.accounts.*.threadBindings.webhookToken"];
function collectUnsupportedSecretRefConfigCandidates(raw) {
	if (!isRecord(raw)) return [];
	if (!isRecord(raw.channels) || !isRecord(raw.channels.discord)) return [];
	const candidates = [];
	const discord = raw.channels.discord;
	const threadBindings = isRecord(discord.threadBindings) ? discord.threadBindings : null;
	if (threadBindings) candidates.push({
		path: "channels.discord.threadBindings.webhookToken",
		value: threadBindings.webhookToken
	});
	const accounts = isRecord(discord.accounts) ? discord.accounts : null;
	if (!accounts) return candidates;
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!isRecord(account) || !isRecord(account.threadBindings)) continue;
		candidates.push({
			path: `channels.discord.accounts.${accountId}.threadBindings.webhookToken`,
			value: account.threadBindings.webhookToken
		});
	}
	return candidates;
}
//#endregion
//#region extensions/discord/src/session-contract.ts
function deriveLegacySessionChatType(sessionKey) {
	return /^discord:(?:[^:]+:)?guild-[^:]+:channel-[^:]+$/.test(sessionKey) ? "channel" : void 0;
}
//#endregion
export { secretTargetRegistryEntries as a, collectRuntimeConfigAssignments as i, collectUnsupportedSecretRefConfigCandidates as n, legacyConfigRules as o, unsupportedSecretRefSurfacePatterns as r, normalizeCompatibilityConfig as s, deriveLegacySessionChatType as t };
