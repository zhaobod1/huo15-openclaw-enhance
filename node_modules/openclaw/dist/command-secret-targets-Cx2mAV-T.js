import { v as normalizeOptionalAccountId } from "./session-key-BR3Z-ljs.js";
import { r as discoverConfigSecretTargetsByIds, s as listSecretTargetRegistryEntries } from "./target-registry-4ZVRjB-K.js";
//#region src/cli/command-secret-targets.ts
function idsByPrefix(prefixes) {
	return listSecretTargetRegistryEntries().map((entry) => entry.id).filter((id) => prefixes.some((prefix) => id.startsWith(prefix))).toSorted();
}
function idsByPredicate(predicate) {
	return listSecretTargetRegistryEntries().map((entry) => entry.id).filter(predicate).toSorted();
}
let cachedCommandSecretTargets;
function buildCommandSecretTargets() {
	const webPluginSecretTargets = idsByPredicate((id) => /^plugins\.entries\.[^.]+\.config\.(webSearch|webFetch)\.apiKey$/.test(id));
	return {
		qrRemote: ["gateway.remote.token", "gateway.remote.password"],
		channels: idsByPrefix(["channels."]),
		models: idsByPrefix(["models.providers."]),
		agentRuntime: idsByPrefix([
			"channels.",
			"models.providers.",
			"agents.defaults.memorySearch.remote.",
			"agents.list[].memorySearch.remote.",
			"skills.entries.",
			"messages.tts.",
			"tools.web.search"
		]).concat(webPluginSecretTargets),
		status: idsByPrefix([
			"channels.",
			"agents.defaults.memorySearch.remote.",
			"agents.list[].memorySearch.remote."
		]),
		securityAudit: idsByPrefix([
			"channels.",
			"gateway.auth.",
			"gateway.remote."
		])
	};
}
function getCommandSecretTargets() {
	cachedCommandSecretTargets ??= buildCommandSecretTargets();
	return cachedCommandSecretTargets;
}
function toTargetIdSet(values) {
	return new Set(values);
}
function normalizeScopedChannelId(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : void 0;
}
function selectChannelTargetIds(channel) {
	const commandSecretTargets = getCommandSecretTargets();
	if (!channel) return toTargetIdSet(commandSecretTargets.channels);
	return toTargetIdSet(commandSecretTargets.channels.filter((id) => id.startsWith(`channels.${channel}.`)));
}
function pathTargetsScopedChannelAccount(params) {
	const [root, channelId, accountRoot, accountId] = params.pathSegments;
	if (root !== "channels" || channelId !== params.channel) return false;
	if (accountRoot !== "accounts") return true;
	return accountId === params.accountId;
}
function getScopedChannelsCommandSecretTargets(params) {
	const channel = normalizeScopedChannelId(params.channel);
	const targetIds = selectChannelTargetIds(channel);
	const normalizedAccountId = normalizeOptionalAccountId(params.accountId);
	if (!channel || !normalizedAccountId) return { targetIds };
	const allowedPaths = /* @__PURE__ */ new Set();
	for (const target of discoverConfigSecretTargetsByIds(params.config, targetIds)) if (pathTargetsScopedChannelAccount({
		pathSegments: target.pathSegments,
		channel,
		accountId: normalizedAccountId
	})) allowedPaths.add(target.path);
	return {
		targetIds,
		allowedPaths
	};
}
function getQrRemoteCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().qrRemote);
}
function getChannelsCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().channels);
}
function getModelsCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().models);
}
function getAgentRuntimeCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().agentRuntime);
}
function getStatusCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().status);
}
function getSecurityAuditCommandSecretTargetIds() {
	return toTargetIdSet(getCommandSecretTargets().securityAudit);
}
//#endregion
export { getScopedChannelsCommandSecretTargets as a, getQrRemoteCommandSecretTargetIds as i, getChannelsCommandSecretTargetIds as n, getSecurityAuditCommandSecretTargetIds as o, getModelsCommandSecretTargetIds as r, getStatusCommandSecretTargetIds as s, getAgentRuntimeCommandSecretTargetIds as t };
