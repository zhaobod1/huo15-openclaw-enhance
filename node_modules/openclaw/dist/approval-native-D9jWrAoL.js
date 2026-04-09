import { i as splitChannelApprovalCapability, n as createApproverRestrictedNativeApprovalCapability } from "./approval-delivery-helpers-D5p52i-E.js";
import "./approval-delivery-runtime-Cx_lhKsS.js";
import { n as createChannelNativeOriginTargetResolver, t as createChannelApproverDmTargetResolver } from "./approval-native-helpers-BRBrzKt_.js";
import "./approval-native-runtime-CsStbzrF.js";
import { i as parseTelegramTarget, l as listTelegramAccountIds, n as normalizeTelegramChatId } from "./targets-CzovValH.js";
import { c as resolveTelegramExecApprovalTarget, i as isTelegramExecApprovalClientEnabled, n as isTelegramExecApprovalApprover, o as isTelegramExecApprovalTargetRecipient, r as isTelegramExecApprovalAuthorizedSender, t as getTelegramExecApprovalApprovers, u as shouldHandleTelegramExecApprovalRequest } from "./exec-approvals-Vma-Sn09.js";
//#region extensions/telegram/src/approval-native.ts
function resolveTurnSourceTelegramOriginTarget(request) {
	const turnSourceChannel = request.request.turnSourceChannel?.trim().toLowerCase() || "";
	const rawTurnSourceTo = request.request.turnSourceTo?.trim() || "";
	const parsedTurnSourceTarget = rawTurnSourceTo ? parseTelegramTarget(rawTurnSourceTo) : null;
	const turnSourceTo = normalizeTelegramChatId(parsedTurnSourceTarget?.chatId ?? rawTurnSourceTo);
	if (turnSourceChannel !== "telegram" || !turnSourceTo) return null;
	const rawThreadId = request.request.turnSourceThreadId ?? parsedTurnSourceTarget?.messageThreadId ?? void 0;
	const threadId = typeof rawThreadId === "number" ? rawThreadId : typeof rawThreadId === "string" ? Number.parseInt(rawThreadId, 10) : void 0;
	return {
		to: turnSourceTo,
		threadId: Number.isFinite(threadId) ? threadId : void 0
	};
}
function resolveSessionTelegramOriginTarget(sessionTarget) {
	return {
		to: normalizeTelegramChatId(sessionTarget.to) ?? sessionTarget.to,
		threadId: sessionTarget.threadId ?? void 0
	};
}
function telegramTargetsMatch(a, b) {
	return (normalizeTelegramChatId(a.to) ?? a.to) === (normalizeTelegramChatId(b.to) ?? b.to) && a.threadId === b.threadId;
}
const telegramNativeApprovalCapability = createApproverRestrictedNativeApprovalCapability({
	channel: "telegram",
	channelLabel: "Telegram",
	describeExecApprovalSetup: ({ accountId }) => {
		const prefix = accountId && accountId !== "default" ? `channels.telegram.accounts.${accountId}` : "channels.telegram";
		return `Approve it from the Web UI or terminal UI for now. Telegram supports native exec approvals for this account. Configure \`${prefix}.execApprovals.approvers\`; if you leave it unset, OpenClaw can infer numeric owner IDs from \`${prefix}.allowFrom\` or direct-message \`${prefix}.defaultTo\` when possible. Leave \`${prefix}.execApprovals.enabled\` unset/\`auto\` or set it to \`true\`.`;
	},
	listAccountIds: listTelegramAccountIds,
	hasApprovers: ({ cfg, accountId }) => getTelegramExecApprovalApprovers({
		cfg,
		accountId
	}).length > 0,
	isExecAuthorizedSender: ({ cfg, accountId, senderId }) => isTelegramExecApprovalAuthorizedSender({
		cfg,
		accountId,
		senderId
	}),
	isPluginAuthorizedSender: ({ cfg, accountId, senderId }) => isTelegramExecApprovalApprover({
		cfg,
		accountId,
		senderId
	}),
	isNativeDeliveryEnabled: ({ cfg, accountId }) => isTelegramExecApprovalClientEnabled({
		cfg,
		accountId
	}),
	resolveNativeDeliveryMode: ({ cfg, accountId }) => resolveTelegramExecApprovalTarget({
		cfg,
		accountId
	}),
	requireMatchingTurnSourceChannel: true,
	resolveSuppressionAccountId: ({ target, request }) => target.accountId?.trim() || request.request.turnSourceAccountId?.trim() || void 0,
	resolveOriginTarget: createChannelNativeOriginTargetResolver({
		channel: "telegram",
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleTelegramExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveTurnSourceTarget: resolveTurnSourceTelegramOriginTarget,
		resolveSessionTarget: resolveSessionTelegramOriginTarget,
		targetsMatch: telegramTargetsMatch
	}),
	resolveApproverDmTargets: createChannelApproverDmTargetResolver({
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleTelegramExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveApprovers: getTelegramExecApprovalApprovers,
		mapApprover: (approver) => ({ to: approver })
	})
});
const resolveTelegramApproveCommandBehavior = ({ cfg, accountId, senderId, approvalKind }) => {
	if (approvalKind !== "exec") return;
	if (isTelegramExecApprovalClientEnabled({
		cfg,
		accountId
	})) return;
	if (isTelegramExecApprovalTargetRecipient({
		cfg,
		accountId,
		senderId
	})) return;
	if (isTelegramExecApprovalAuthorizedSender({
		cfg,
		accountId,
		senderId
	}) && !isTelegramExecApprovalApprover({
		cfg,
		accountId,
		senderId
	})) return;
	return {
		kind: "reply",
		text: "❌ Telegram exec approvals are not enabled for this bot account."
	};
};
const telegramApprovalCapability = {
	...telegramNativeApprovalCapability,
	resolveApproveCommandBehavior: resolveTelegramApproveCommandBehavior
};
const telegramNativeApprovalAdapter = splitChannelApprovalCapability(telegramApprovalCapability);
//#endregion
export { telegramNativeApprovalAdapter as n, telegramApprovalCapability as t };
