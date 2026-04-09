import { a as hasOwnProperty } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { c as hasConfiguredSecretInputValue, n as collectConditionalChannelFieldAssignments, s as getChannelSurface } from "./security-runtime-DoGZwxD5.js";
//#region extensions/telegram/src/secret-contract.ts
const secretTargetRegistryEntries = [
	{
		id: "channels.telegram.accounts.*.botToken",
		targetType: "channels.telegram.accounts.*.botToken",
		configFile: "openclaw.json",
		pathPattern: "channels.telegram.accounts.*.botToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.telegram.accounts.*.webhookSecret",
		targetType: "channels.telegram.accounts.*.webhookSecret",
		configFile: "openclaw.json",
		pathPattern: "channels.telegram.accounts.*.webhookSecret",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.telegram.botToken",
		targetType: "channels.telegram.botToken",
		configFile: "openclaw.json",
		pathPattern: "channels.telegram.botToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.telegram.webhookSecret",
		targetType: "channels.telegram.webhookSecret",
		configFile: "openclaw.json",
		pathPattern: "channels.telegram.webhookSecret",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	}
];
function collectRuntimeConfigAssignments(params) {
	const resolved = getChannelSurface(params.config, "telegram");
	if (!resolved) return;
	const { channel: telegram, surface } = resolved;
	const baseTokenFile = typeof telegram.tokenFile === "string" ? telegram.tokenFile.trim() : "";
	const accountTokenFile = (account) => typeof account.tokenFile === "string" ? account.tokenFile.trim() : "";
	collectConditionalChannelFieldAssignments({
		channelKey: "telegram",
		field: "botToken",
		channel: telegram,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActiveWithoutAccounts: baseTokenFile.length === 0,
		topLevelInheritedAccountActive: ({ account, enabled }) => {
			if (!enabled || baseTokenFile.length > 0) return false;
			return !hasConfiguredSecretInputValue(account.botToken, params.defaults) && accountTokenFile(account).length === 0;
		},
		accountActive: ({ account, enabled }) => enabled && accountTokenFile(account).length === 0,
		topInactiveReason: "no enabled Telegram surface inherits this top-level botToken (tokenFile is configured).",
		accountInactiveReason: "Telegram account is disabled or tokenFile is configured."
	});
	const baseWebhookUrl = typeof telegram.webhookUrl === "string" ? telegram.webhookUrl.trim() : "";
	const accountWebhookUrl = (account) => hasOwnProperty(account, "webhookUrl") ? typeof account.webhookUrl === "string" ? account.webhookUrl.trim() : "" : baseWebhookUrl;
	collectConditionalChannelFieldAssignments({
		channelKey: "telegram",
		field: "webhookSecret",
		channel: telegram,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActiveWithoutAccounts: baseWebhookUrl.length > 0,
		topLevelInheritedAccountActive: ({ account, enabled }) => enabled && !hasOwnProperty(account, "webhookSecret") && accountWebhookUrl(account).length > 0,
		accountActive: ({ account, enabled }) => enabled && accountWebhookUrl(account).length > 0,
		topInactiveReason: "no enabled Telegram webhook surface inherits this top-level webhookSecret (webhook mode is not active).",
		accountInactiveReason: "Telegram account is disabled or webhook mode is not active for this account."
	});
}
//#endregion
//#region extensions/telegram/src/setup-contract.ts
const singleAccountKeysToMove = ["streaming"];
//#endregion
export { collectRuntimeConfigAssignments as n, secretTargetRegistryEntries as r, singleAccountKeysToMove as t };
