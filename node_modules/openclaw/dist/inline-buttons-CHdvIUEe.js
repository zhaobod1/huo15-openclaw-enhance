import { l as listTelegramAccountIds, p as resolveTelegramAccount } from "./targets-CzovValH.js";
//#region extensions/telegram/src/inline-buttons.ts
const DEFAULT_INLINE_BUTTONS_SCOPE = "allowlist";
function normalizeInlineButtonsScope(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim().toLowerCase();
	if (trimmed === "off" || trimmed === "dm" || trimmed === "group" || trimmed === "all" || trimmed === "allowlist") return trimmed;
}
function readInlineButtonsCapability(value) {
	if (!value || Array.isArray(value) || typeof value !== "object" || !("inlineButtons" in value)) return;
	return value.inlineButtons;
}
function resolveTelegramInlineButtonsConfigScope(capabilities) {
	return normalizeInlineButtonsScope(readInlineButtonsCapability(capabilities));
}
function resolveTelegramInlineButtonsScopeFromCapabilities(capabilities) {
	if (!capabilities) return DEFAULT_INLINE_BUTTONS_SCOPE;
	if (Array.isArray(capabilities)) return capabilities.some((entry) => String(entry).trim().toLowerCase() === "inlinebuttons") ? "all" : "off";
	if (typeof capabilities === "object") return resolveTelegramInlineButtonsConfigScope(capabilities) ?? DEFAULT_INLINE_BUTTONS_SCOPE;
	return DEFAULT_INLINE_BUTTONS_SCOPE;
}
function resolveTelegramInlineButtonsScope(params) {
	return resolveTelegramInlineButtonsScopeFromCapabilities(resolveTelegramAccount({
		cfg: params.cfg,
		accountId: params.accountId
	}).config.capabilities);
}
function isTelegramInlineButtonsEnabled(params) {
	if (params.accountId) return resolveTelegramInlineButtonsScope(params) !== "off";
	const accountIds = listTelegramAccountIds(params.cfg);
	if (accountIds.length === 0) return resolveTelegramInlineButtonsScope(params) !== "off";
	return accountIds.some((accountId) => resolveTelegramInlineButtonsScope({
		cfg: params.cfg,
		accountId
	}) !== "off");
}
//#endregion
export { resolveTelegramInlineButtonsScopeFromCapabilities as i, resolveTelegramInlineButtonsConfigScope as n, resolveTelegramInlineButtonsScope as r, isTelegramInlineButtonsEnabled as t };
