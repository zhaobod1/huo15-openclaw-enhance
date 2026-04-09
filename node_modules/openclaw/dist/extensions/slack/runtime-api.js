import { g as DEFAULT_ACCOUNT_ID } from "../../session-key-BR3Z-ljs.js";
import { a as resolveSlackAccount, c as resolveSlackBotToken, i as resolveDefaultSlackAccountId, n as listSlackAccountIds, s as resolveSlackAppToken, t as listEnabledSlackAccounts } from "../../accounts-BpbTO6KH.js";
import { a as resolveSlackGroupToolPolicy, i as resolveSlackGroupRequireMention, r as setSlackRuntime } from "../../runtime-D6Ziyk7-.js";
import { t as resolveSlackChannelAllowlist } from "../../resolve-channels-DWtECfQ-.js";
import { t as resolveSlackUserAllowlist } from "../../resolve-users-DiYm9cnJ.js";
import { t as sendMessageSlack } from "../../send-DiHSVP5U.js";
import { a as listSlackEmojis, c as pinSlackMessage, d as removeOwnSlackReactions, f as removeSlackReaction, i as getSlackMemberInfo, l as reactSlackMessage, m as unpinSlackMessage, o as listSlackPins, p as sendSlackMessage, r as editSlackMessage, s as listSlackReactions, t as deleteSlackMessage, u as readSlackMessages } from "../../actions-ClxauASC.js";
import { r as normalizeSlackWebhookPath } from "../../registry-BEsNHDqX.js";
import { t as probeSlack } from "../../probe-DnSb9DOc.js";
import { t as monitorSlackProvider } from "../../provider-BjbH0iHx.js";
import { n as slackActionRuntime, t as handleSlackAction } from "../../action-runtime-CFwUuKJb.js";
import { n as listSlackDirectoryPeersLive, t as listSlackDirectoryGroupsLive } from "../../directory-live-Bmf0fRg_.js";
import "../../monitor-BbX7zelN.js";
//#region extensions/slack/src/http/plugin-routes.ts
let slackHttpHandlerRuntimePromise = null;
async function loadSlackHttpHandlerRuntime() {
	slackHttpHandlerRuntimePromise ??= import("../../handler.runtime-DpSlUaWR.js");
	return await slackHttpHandlerRuntimePromise;
}
function registerSlackPluginHttpRoutes(api) {
	const accountIds = new Set([DEFAULT_ACCOUNT_ID, ...listSlackAccountIds(api.config)]);
	const registeredPaths = /* @__PURE__ */ new Set();
	for (const accountId of accountIds) {
		const account = resolveSlackAccount({
			cfg: api.config,
			accountId
		});
		registeredPaths.add(normalizeSlackWebhookPath(account.config.webhookPath));
	}
	if (registeredPaths.size === 0) registeredPaths.add(normalizeSlackWebhookPath());
	for (const path of registeredPaths) api.registerHttpRoute({
		path,
		auth: "plugin",
		handler: async (req, res) => await (await loadSlackHttpHandlerRuntime()).handleSlackHttpRequest(req, res)
	});
}
//#endregion
export { deleteSlackMessage, editSlackMessage, getSlackMemberInfo, handleSlackAction, listEnabledSlackAccounts, listSlackAccountIds, listSlackDirectoryGroupsLive, listSlackDirectoryPeersLive, listSlackEmojis, listSlackPins, listSlackReactions, monitorSlackProvider, pinSlackMessage, probeSlack, reactSlackMessage, readSlackMessages, registerSlackPluginHttpRoutes, removeOwnSlackReactions, removeSlackReaction, resolveDefaultSlackAccountId, resolveSlackAccount, resolveSlackAppToken, resolveSlackBotToken, resolveSlackChannelAllowlist, resolveSlackGroupRequireMention, resolveSlackGroupToolPolicy, resolveSlackUserAllowlist, sendMessageSlack, sendSlackMessage, setSlackRuntime, slackActionRuntime, unpinSlackMessage };
