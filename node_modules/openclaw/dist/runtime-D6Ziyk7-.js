import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { n as normalizeHyphenSlug } from "./string-normalization-CvImYLpT.js";
import { i as resolveToolsBySender } from "./group-policy-D1X7pmp3.js";
import { t as createPluginRuntimeStore } from "./runtime-store-Cwr8GGg4.js";
import "./channel-policy-DIVRdPsQ.js";
import "./account-resolution-CIVX3Yfx.js";
import { i as resolveDefaultSlackAccountId, r as mergeSlackAccountConfig } from "./accounts-BpbTO6KH.js";
//#region extensions/slack/src/group-policy.ts
function resolveSlackChannelPolicyEntry(params) {
	const accountId = normalizeAccountId(params.accountId ?? resolveDefaultSlackAccountId(params.cfg));
	const channelMap = mergeSlackAccountConfig(params.cfg, accountId).channels ?? {};
	if (Object.keys(channelMap).length === 0) return;
	const channelId = params.groupId?.trim();
	const channelName = params.groupChannel?.replace(/^#/, "");
	const normalizedName = normalizeHyphenSlug(channelName);
	const candidates = [
		channelId ?? "",
		channelName ? `#${channelName}` : "",
		channelName ?? "",
		normalizedName
	].filter(Boolean);
	for (const candidate of candidates) if (candidate && channelMap[candidate]) return channelMap[candidate];
	return channelMap["*"];
}
function resolveSenderToolsEntry(entry, params) {
	if (!entry) return;
	return resolveToolsBySender({
		toolsBySender: entry.toolsBySender,
		senderId: params.senderId,
		senderName: params.senderName,
		senderUsername: params.senderUsername,
		senderE164: params.senderE164
	}) ?? entry.tools;
}
function resolveSlackGroupRequireMention(params) {
	const resolved = resolveSlackChannelPolicyEntry(params);
	if (typeof resolved?.requireMention === "boolean") return resolved.requireMention;
	return true;
}
function resolveSlackGroupToolPolicy(params) {
	return resolveSenderToolsEntry(resolveSlackChannelPolicyEntry(params), params);
}
//#endregion
//#region extensions/slack/src/runtime.ts
const { setRuntime: setSlackRuntime, clearRuntime: clearSlackRuntime, tryGetRuntime: getOptionalSlackRuntime, getRuntime: getSlackRuntime } = createPluginRuntimeStore("Slack runtime not initialized");
//#endregion
export { resolveSlackGroupToolPolicy as a, resolveSlackGroupRequireMention as i, getSlackRuntime as n, setSlackRuntime as r, getOptionalSlackRuntime as t };
