import { o as getChatChannelMeta } from "../../core-D7mi2qmR.js";
import { i as splitChannelApprovalCapability } from "../../approval-delivery-helpers-D5p52i-E.js";
import "../../approval-delivery-runtime-Cx_lhKsS.js";
import { n as buildDmGroupAccountAllowlistAdapter } from "../../allowlist-config-edit-CWwW-8J5.js";
import { p as resolveTelegramAccount } from "../../targets-CzovValH.js";
import { i as telegramConfigAdapter } from "../../shared-BcMjbMbX.js";
import { t as telegramApprovalCapability } from "../../approval-native-D9jWrAoL.js";
//#region extensions/telegram/test-support.ts
const telegramNativeApprovalAdapter = splitChannelApprovalCapability(telegramApprovalCapability);
const telegramCommandTestPlugin = {
	id: "telegram",
	meta: getChatChannelMeta("telegram"),
	capabilities: {
		chatTypes: [
			"direct",
			"group",
			"channel",
			"thread"
		],
		reactions: true,
		threads: true,
		media: true,
		polls: true,
		nativeCommands: true,
		blockStreaming: true
	},
	config: telegramConfigAdapter,
	auth: telegramNativeApprovalAdapter.auth,
	approvalCapability: telegramApprovalCapability,
	pairing: { idLabel: "telegramUserId" },
	allowlist: buildDmGroupAccountAllowlistAdapter({
		channelId: "telegram",
		resolveAccount: resolveTelegramAccount,
		normalize: ({ cfg, accountId, values }) => telegramConfigAdapter.formatAllowFrom({
			cfg,
			accountId,
			allowFrom: values
		}),
		resolveDmAllowFrom: (account) => account.config.allowFrom,
		resolveGroupAllowFrom: (account) => account.config.groupAllowFrom,
		resolveDmPolicy: (account) => account.config.dmPolicy,
		resolveGroupPolicy: (account) => account.config.groupPolicy
	})
};
//#endregion
export { telegramCommandTestPlugin };
