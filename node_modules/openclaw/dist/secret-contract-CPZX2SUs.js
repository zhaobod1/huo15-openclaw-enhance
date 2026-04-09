import { a as resolveNativeSkillsEnabled, i as resolveNativeCommandsEnabled } from "./commands-CjGDOH-W.js";
import { a as hasOwnProperty } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { a as readChannelAllowFromStore } from "./pairing-store--adbbV4I.js";
import "./config-runtime-OuR9WVXH.js";
import "./conversation-runtime-D-TUyzoB.js";
import { a as collectSimpleChannelFieldAssignments, n as collectConditionalChannelFieldAssignments, s as getChannelSurface } from "./security-runtime-DoGZwxD5.js";
//#region extensions/slack/src/security-audit.ts
function normalizeAllowFromList(list) {
	if (!Array.isArray(list)) return [];
	return list.map((value) => String(value).trim()).filter(Boolean);
}
function coerceNativeSetting(value) {
	if (value === true || value === false || value === "auto") return value;
}
async function collectSlackSecurityAuditFindings(params) {
	const findings = [];
	const slackCfg = params.account.config ?? {};
	const accountId = params.accountId?.trim() || params.account.accountId || "default";
	const nativeEnabled = resolveNativeCommandsEnabled({
		providerId: "slack",
		providerSetting: coerceNativeSetting(slackCfg.commands?.native),
		globalSetting: params.cfg.commands?.native
	});
	const nativeSkillsEnabled = resolveNativeSkillsEnabled({
		providerId: "slack",
		providerSetting: coerceNativeSetting(slackCfg.commands?.nativeSkills),
		globalSetting: params.cfg.commands?.nativeSkills
	});
	if (!(nativeEnabled || nativeSkillsEnabled || slackCfg.slashCommand?.enabled === true)) return findings;
	if (!(params.cfg.commands?.useAccessGroups !== false)) {
		findings.push({
			checkId: "channels.slack.commands.slash.useAccessGroups_off",
			severity: "critical",
			title: "Slack slash commands bypass access groups",
			detail: "Slack slash/native commands are enabled while commands.useAccessGroups=false; this can allow unrestricted /… command execution from channels/users you didn't explicitly authorize.",
			remediation: "Set commands.useAccessGroups=true (recommended)."
		});
		return findings;
	}
	const allowFromRaw = slackCfg.allowFrom;
	const legacyAllowFromRaw = params.account.dm?.allowFrom;
	const allowFrom = Array.isArray(allowFromRaw) ? allowFromRaw : Array.isArray(legacyAllowFromRaw) ? legacyAllowFromRaw : [];
	const storeAllowFrom = await readChannelAllowFromStore("slack", process.env, accountId).catch(() => []);
	const ownerAllowFromConfigured = normalizeAllowFromList([...allowFrom, ...storeAllowFrom]).length > 0;
	const channels = slackCfg.channels ?? {};
	const hasAnyChannelUsersAllowlist = Object.values(channels).some((value) => {
		if (!value || typeof value !== "object") return false;
		const channel = value;
		return Array.isArray(channel.users) && channel.users.length > 0;
	});
	if (!ownerAllowFromConfigured && !hasAnyChannelUsersAllowlist) findings.push({
		checkId: "channels.slack.commands.slash.no_allowlists",
		severity: "warn",
		title: "Slack slash commands have no allowlists",
		detail: "Slack slash/native commands are enabled, but neither an owner allowFrom list nor any channels.<id>.users allowlist is configured; /… commands will be rejected for everyone.",
		remediation: "Approve yourself via pairing (recommended), or set channels.slack.allowFrom and/or channels.slack.channels.<id>.users."
	});
	return findings;
}
//#endregion
//#region extensions/slack/src/secret-contract.ts
const secretTargetRegistryEntries = [
	{
		id: "channels.slack.accounts.*.appToken",
		targetType: "channels.slack.accounts.*.appToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.accounts.*.appToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.accounts.*.botToken",
		targetType: "channels.slack.accounts.*.botToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.accounts.*.botToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.accounts.*.signingSecret",
		targetType: "channels.slack.accounts.*.signingSecret",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.accounts.*.signingSecret",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.accounts.*.userToken",
		targetType: "channels.slack.accounts.*.userToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.accounts.*.userToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.appToken",
		targetType: "channels.slack.appToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.appToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.botToken",
		targetType: "channels.slack.botToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.botToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.signingSecret",
		targetType: "channels.slack.signingSecret",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.signingSecret",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.slack.userToken",
		targetType: "channels.slack.userToken",
		configFile: "openclaw.json",
		pathPattern: "channels.slack.userToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	}
];
function collectRuntimeConfigAssignments(params) {
	const resolved = getChannelSurface(params.config, "slack");
	if (!resolved) return;
	const { channel: slack, surface } = resolved;
	const baseMode = slack.mode === "http" || slack.mode === "socket" ? slack.mode : "socket";
	for (const field of ["botToken", "userToken"]) collectSimpleChannelFieldAssignments({
		channelKey: "slack",
		field,
		channel: slack,
		surface,
		defaults: params.defaults,
		context: params.context,
		topInactiveReason: `no enabled account inherits this top-level Slack ${field}.`,
		accountInactiveReason: "Slack account is disabled."
	});
	const resolveAccountMode = (account) => account.mode === "http" || account.mode === "socket" ? account.mode : baseMode;
	collectConditionalChannelFieldAssignments({
		channelKey: "slack",
		field: "appToken",
		channel: slack,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActiveWithoutAccounts: baseMode !== "http",
		topLevelInheritedAccountActive: ({ account, enabled }) => enabled && !hasOwnProperty(account, "appToken") && resolveAccountMode(account) !== "http",
		accountActive: ({ account, enabled }) => enabled && resolveAccountMode(account) !== "http",
		topInactiveReason: "no enabled Slack socket-mode surface inherits this top-level appToken.",
		accountInactiveReason: "Slack account is disabled or not running in socket mode."
	});
	collectConditionalChannelFieldAssignments({
		channelKey: "slack",
		field: "signingSecret",
		channel: slack,
		surface,
		defaults: params.defaults,
		context: params.context,
		topLevelActiveWithoutAccounts: baseMode === "http",
		topLevelInheritedAccountActive: ({ account, enabled }) => enabled && !hasOwnProperty(account, "signingSecret") && resolveAccountMode(account) === "http",
		accountActive: ({ account, enabled }) => enabled && resolveAccountMode(account) === "http",
		topInactiveReason: "no enabled Slack HTTP-mode surface inherits this top-level signingSecret.",
		accountInactiveReason: "Slack account is disabled or not running in HTTP mode."
	});
}
//#endregion
export { secretTargetRegistryEntries as n, collectSlackSecurityAuditFindings as r, collectRuntimeConfigAssignments as t };
