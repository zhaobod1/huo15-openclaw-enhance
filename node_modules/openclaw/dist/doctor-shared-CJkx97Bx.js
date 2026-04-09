import { t as resolveDiscordPreviewStreamMode } from "./preview-streaming-BlSrG5YE.js";
//#region extensions/discord/src/doctor-shared.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
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
const DISCORD_LEGACY_CONFIG_RULES = [{
	path: ["channels", "discord"],
	message: "channels.discord.streamMode and boolean channels.discord.streaming are legacy; use channels.discord.streaming.",
	match: hasLegacyDiscordStreamingAliases
}, {
	path: [
		"channels",
		"discord",
		"accounts"
	],
	message: "channels.discord.accounts.<id>.streamMode and boolean channels.discord.accounts.<id>.streaming are legacy; use channels.discord.accounts.<id>.streaming.",
	match: hasLegacyDiscordAccountStreamingAliases
}];
//#endregion
export { DISCORD_LEGACY_CONFIG_RULES as t };
