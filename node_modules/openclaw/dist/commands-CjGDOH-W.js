import { x as isPlainObject } from "./utils-ms6h9yny.js";
import { o as normalizeChannelId } from "./registry-DldQsVOb.js";
import { t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
//#region src/config/commands.ts
function resolveAutoDefault(providerId, kind) {
	const id = normalizeChannelId(providerId);
	if (!id) return false;
	const plugin = getChannelPlugin(id);
	if (!plugin) return false;
	if (kind === "native") return plugin.commands?.nativeCommandsAutoEnabled === true;
	return plugin.commands?.nativeSkillsAutoEnabled === true;
}
function resolveNativeSkillsEnabled(params) {
	return resolveNativeCommandSetting({
		...params,
		kind: "nativeSkills"
	});
}
function resolveNativeCommandsEnabled(params) {
	return resolveNativeCommandSetting({
		...params,
		kind: "native"
	});
}
function resolveNativeCommandSetting(params) {
	const { providerId, providerSetting, globalSetting, kind = "native" } = params;
	const setting = providerSetting === void 0 ? globalSetting : providerSetting;
	if (setting === true) return true;
	if (setting === false) return false;
	return resolveAutoDefault(providerId, kind);
}
function isNativeCommandsExplicitlyDisabled(params) {
	const { providerSetting, globalSetting } = params;
	if (providerSetting === false) return true;
	if (providerSetting === void 0) return globalSetting === false;
	return false;
}
function getOwnCommandFlagValue(config, key) {
	const { commands } = config ?? {};
	if (!isPlainObject(commands) || !Object.hasOwn(commands, key)) return;
	return commands[key];
}
function isCommandFlagEnabled(config, key) {
	return getOwnCommandFlagValue(config, key) === true;
}
function isRestartEnabled(config) {
	return getOwnCommandFlagValue(config, "restart") !== false;
}
//#endregion
export { resolveNativeSkillsEnabled as a, resolveNativeCommandsEnabled as i, isNativeCommandsExplicitlyDisabled as n, isRestartEnabled as r, isCommandFlagEnabled as t };
