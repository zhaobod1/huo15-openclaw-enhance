import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import "./routing-DdBDhOmH.js";
import { n as resolveApprovalApprovers } from "./approval-auth-helpers-DNJdxO4L.js";
import { t as matchesApprovalRequestFilters } from "./approval-request-filters-DXtqfV_Z.js";
import { n as isChannelExecApprovalClientEnabledFromConfig, r as isChannelExecApprovalTargetRecipient, t as createChannelExecApprovalProfile } from "./approval-client-helpers-DFLM0RL9.js";
import "./approval-client-runtime-Ci7-A1l2.js";
import { o as resolveApprovalRequestChannelAccountId } from "./exec-approval-session-target-CZdxQD7c.js";
import "./approval-native-runtime-CsStbzrF.js";
import { a as resolveTelegramTargetChatType, l as listTelegramAccountIds, n as normalizeTelegramChatId, p as resolveTelegramAccount } from "./targets-CzovValH.js";
import { n as resolveTelegramInlineButtonsConfigScope } from "./inline-buttons-CHdvIUEe.js";
//#region extensions/telegram/src/exec-approvals.ts
function normalizeApproverId(value) {
	return String(value).trim();
}
function normalizeTelegramDirectApproverId(value) {
	const chatId = normalizeTelegramChatId(normalizeApproverId(value));
	if (!chatId || chatId.startsWith("-")) return;
	return chatId;
}
function resolveTelegramExecApprovalConfig(params) {
	const account = resolveTelegramAccount(params);
	const config = account.config.execApprovals;
	if (!config) return;
	return {
		...config,
		enabled: account.enabled && account.tokenSource !== "none" ? config.enabled : false
	};
}
function getTelegramExecApprovalApprovers(params) {
	const account = resolveTelegramAccount(params).config;
	return resolveApprovalApprovers({
		explicit: resolveTelegramExecApprovalConfig(params)?.approvers,
		allowFrom: account.allowFrom,
		defaultTo: account.defaultTo ? String(account.defaultTo) : null,
		normalizeApprover: normalizeTelegramDirectApproverId
	});
}
function isTelegramExecApprovalTargetRecipient(params) {
	return isChannelExecApprovalTargetRecipient({
		...params,
		channel: "telegram",
		matchTarget: ({ target, normalizedSenderId }) => {
			const to = target.to ? normalizeTelegramChatId(target.to) : void 0;
			if (!to || to.startsWith("-")) return false;
			return to === normalizedSenderId;
		}
	});
}
function countTelegramExecApprovalEligibleAccounts(params) {
	return listTelegramAccountIds(params.cfg).filter((accountId) => {
		const account = resolveTelegramAccount({
			cfg: params.cfg,
			accountId
		});
		if (!account.enabled || account.tokenSource === "none") return false;
		const config = resolveTelegramExecApprovalConfig({
			cfg: params.cfg,
			accountId
		});
		return isChannelExecApprovalClientEnabledFromConfig({
			enabled: config?.enabled,
			approverCount: getTelegramExecApprovalApprovers({
				cfg: params.cfg,
				accountId
			}).length
		}) && matchesApprovalRequestFilters({
			request: params.request.request,
			agentFilter: config?.agentFilter,
			sessionFilter: config?.sessionFilter,
			fallbackAgentIdFromSessionKey: true
		});
	}).length;
}
function matchesTelegramRequestAccount(params) {
	const turnSourceChannel = params.request.request.turnSourceChannel?.trim().toLowerCase() || "";
	const boundAccountId = resolveApprovalRequestChannelAccountId({
		cfg: params.cfg,
		request: params.request,
		channel: "telegram"
	});
	if (turnSourceChannel && turnSourceChannel !== "telegram" && !boundAccountId) return countTelegramExecApprovalEligibleAccounts({
		cfg: params.cfg,
		request: params.request
	}) <= 1;
	return !boundAccountId || !params.accountId || normalizeAccountId(boundAccountId) === normalizeAccountId(params.accountId);
}
const telegramExecApprovalProfile = createChannelExecApprovalProfile({
	resolveConfig: resolveTelegramExecApprovalConfig,
	resolveApprovers: getTelegramExecApprovalApprovers,
	isTargetRecipient: isTelegramExecApprovalTargetRecipient,
	matchesRequestAccount: matchesTelegramRequestAccount,
	fallbackAgentIdFromSessionKey: true,
	requireClientEnabledForLocalPromptSuppression: false
});
const isTelegramExecApprovalClientEnabled = telegramExecApprovalProfile.isClientEnabled;
const isTelegramExecApprovalApprover = telegramExecApprovalProfile.isApprover;
const isTelegramExecApprovalAuthorizedSender = telegramExecApprovalProfile.isAuthorizedSender;
const resolveTelegramExecApprovalTarget = telegramExecApprovalProfile.resolveTarget;
const shouldHandleTelegramExecApprovalRequest = telegramExecApprovalProfile.shouldHandleRequest;
function shouldInjectTelegramExecApprovalButtons(params) {
	if (!isTelegramExecApprovalClientEnabled(params)) return false;
	const target = resolveTelegramExecApprovalTarget(params);
	const chatType = resolveTelegramTargetChatType(params.to);
	if (chatType === "direct") return target === "dm" || target === "both";
	if (chatType === "group") return target === "channel" || target === "both";
	return target === "both";
}
function resolveExecApprovalButtonsExplicitlyDisabled(params) {
	const capabilities = resolveTelegramAccount(params).config.capabilities;
	return resolveTelegramInlineButtonsConfigScope(capabilities) === "off";
}
function shouldEnableTelegramExecApprovalButtons(params) {
	if (!shouldInjectTelegramExecApprovalButtons(params)) return false;
	return !resolveExecApprovalButtonsExplicitlyDisabled(params);
}
function shouldSuppressLocalTelegramExecApprovalPrompt(params) {
	return telegramExecApprovalProfile.shouldSuppressLocalPrompt(params);
}
function isTelegramExecApprovalHandlerConfigured(params) {
	return isChannelExecApprovalClientEnabledFromConfig({
		enabled: resolveTelegramExecApprovalConfig(params)?.enabled,
		approverCount: getTelegramExecApprovalApprovers(params).length
	});
}
//#endregion
export { isTelegramExecApprovalHandlerConfigured as a, resolveTelegramExecApprovalTarget as c, shouldInjectTelegramExecApprovalButtons as d, shouldSuppressLocalTelegramExecApprovalPrompt as f, isTelegramExecApprovalClientEnabled as i, shouldEnableTelegramExecApprovalButtons as l, isTelegramExecApprovalApprover as n, isTelegramExecApprovalTargetRecipient as o, isTelegramExecApprovalAuthorizedSender as r, resolveTelegramExecApprovalConfig as s, getTelegramExecApprovalApprovers as t, shouldHandleTelegramExecApprovalRequest as u };
