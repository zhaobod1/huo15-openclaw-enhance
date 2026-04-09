import { i as normalizeStringEntriesLower, n as normalizeHyphenSlug, r as normalizeStringEntries } from "./string-normalization-CvImYLpT.js";
import { o as resolveCompiledAllowlistMatch, t as compileAllowlist } from "./allowlist-match-BwqmzAfd.js";
import { n as resolveApprovalApprovers, t as createResolvedApproverActionAuthAdapter } from "./approval-auth-helpers-DNJdxO4L.js";
import { r as isChannelExecApprovalTargetRecipient, t as createChannelExecApprovalProfile } from "./approval-client-helpers-DFLM0RL9.js";
import "./approval-client-runtime-Ci7-A1l2.js";
import { i as splitChannelApprovalCapability, n as createApproverRestrictedNativeApprovalCapability } from "./approval-delivery-helpers-D5p52i-E.js";
import "./approval-delivery-runtime-Cx_lhKsS.js";
import { i as doesApprovalRequestMatchChannelAccount } from "./exec-approval-session-target-CZdxQD7c.js";
import { n as createChannelNativeOriginTargetResolver, t as createChannelApproverDmTargetResolver } from "./approval-native-helpers-BRBrzKt_.js";
import "./approval-native-runtime-CsStbzrF.js";
import { a as resolveSlackAccount, n as listSlackAccountIds } from "./accounts-BpbTO6KH.js";
import { r as parseSlackTarget } from "./target-parsing-Tzk67ZVP.js";
//#region extensions/slack/src/exec-approvals.ts
function normalizeSlackApproverId(value) {
	const trimmed = String(value).trim();
	if (!trimmed) return;
	const prefixed = trimmed.match(/^(?:slack|user):([A-Z0-9]+)$/i);
	if (prefixed?.[1]) return prefixed[1];
	const mention = trimmed.match(/^<@([A-Z0-9]+)>$/i);
	if (mention?.[1]) return mention[1];
	return /^[UW][A-Z0-9]+$/i.test(trimmed) ? trimmed : void 0;
}
function resolveSlackOwnerApprovers(cfg) {
	const ownerAllowFrom = cfg.commands?.ownerAllowFrom;
	if (!Array.isArray(ownerAllowFrom) || ownerAllowFrom.length === 0) return [];
	return resolveApprovalApprovers({
		explicit: ownerAllowFrom,
		normalizeApprover: normalizeSlackApproverId
	});
}
function getSlackExecApprovalApprovers(params) {
	const account = resolveSlackAccount(params).config;
	return resolveApprovalApprovers({
		explicit: account.execApprovals?.approvers ?? resolveSlackOwnerApprovers(params.cfg),
		normalizeApprover: normalizeSlackApproverId
	});
}
function isSlackExecApprovalTargetRecipient(params) {
	return isChannelExecApprovalTargetRecipient({
		...params,
		channel: "slack",
		normalizeSenderId: normalizeSlackApproverId,
		matchTarget: ({ target, normalizedSenderId }) => normalizeSlackApproverId(target.to) === normalizedSenderId
	});
}
const slackExecApprovalProfile = createChannelExecApprovalProfile({
	resolveConfig: (params) => resolveSlackAccount(params).config.execApprovals,
	resolveApprovers: getSlackExecApprovalApprovers,
	normalizeSenderId: normalizeSlackApproverId,
	isTargetRecipient: isSlackExecApprovalTargetRecipient,
	matchesRequestAccount: (params) => doesApprovalRequestMatchChannelAccount({
		cfg: params.cfg,
		request: params.request,
		channel: "slack",
		accountId: params.accountId
	})
});
const isSlackExecApprovalClientEnabled = slackExecApprovalProfile.isClientEnabled;
slackExecApprovalProfile.isApprover;
const isSlackExecApprovalAuthorizedSender = slackExecApprovalProfile.isAuthorizedSender;
const resolveSlackExecApprovalTarget = slackExecApprovalProfile.resolveTarget;
const shouldHandleSlackExecApprovalRequest = slackExecApprovalProfile.shouldHandleRequest;
const shouldSuppressLocalSlackExecApprovalPrompt = slackExecApprovalProfile.shouldSuppressLocalPrompt;
//#endregion
//#region extensions/slack/src/approval-auth.ts
function getSlackApprovalApprovers(params) {
	const account = resolveSlackAccount(params).config;
	return resolveApprovalApprovers({
		allowFrom: account.allowFrom,
		extraAllowFrom: account.dm?.allowFrom,
		defaultTo: account.defaultTo,
		normalizeApprover: normalizeSlackApproverId,
		normalizeDefaultTo: normalizeSlackApproverId
	});
}
function isSlackApprovalAuthorizedSender(params) {
	const senderId = params.senderId ? normalizeSlackApproverId(params.senderId) : void 0;
	if (!senderId) return false;
	return getSlackApprovalApprovers(params).includes(senderId);
}
createResolvedApproverActionAuthAdapter({
	channelLabel: "Slack",
	resolveApprovers: ({ cfg, accountId }) => getSlackApprovalApprovers({
		cfg,
		accountId
	}),
	normalizeSenderId: (value) => normalizeSlackApproverId(value)
});
//#endregion
//#region extensions/slack/src/approval-native.ts
function extractSlackSessionKind(sessionKey) {
	if (!sessionKey) return null;
	const match = sessionKey.match(/slack:(direct|channel|group):/i);
	return match?.[1] ? match[1].toLowerCase() : null;
}
function normalizeComparableTarget(value) {
	return value.trim().toLowerCase();
}
function normalizeSlackThreadMatchKey(threadId) {
	const trimmed = threadId?.trim();
	if (!trimmed) return "";
	return trimmed.match(/^\d+/)?.[0] ?? trimmed;
}
function resolveTurnSourceSlackOriginTarget(request) {
	const turnSourceChannel = request.request.turnSourceChannel?.trim().toLowerCase() || "";
	const turnSourceTo = request.request.turnSourceTo?.trim() || "";
	if (turnSourceChannel !== "slack" || !turnSourceTo) return null;
	const parsed = parseSlackTarget(turnSourceTo, { defaultKind: extractSlackSessionKind(request.request.sessionKey ?? void 0) === "direct" ? "user" : "channel" });
	if (!parsed) return null;
	const threadId = typeof request.request.turnSourceThreadId === "string" ? request.request.turnSourceThreadId.trim() || void 0 : typeof request.request.turnSourceThreadId === "number" ? String(request.request.turnSourceThreadId) : void 0;
	return {
		to: `${parsed.kind}:${parsed.id}`,
		threadId
	};
}
function resolveSessionSlackOriginTarget(sessionTarget) {
	return {
		to: sessionTarget.to,
		threadId: typeof sessionTarget.threadId === "string" ? sessionTarget.threadId : typeof sessionTarget.threadId === "number" ? String(sessionTarget.threadId) : void 0
	};
}
function slackTargetsMatch(a, b) {
	return normalizeComparableTarget(a.to) === normalizeComparableTarget(b.to) && normalizeSlackThreadMatchKey(a.threadId) === normalizeSlackThreadMatchKey(b.threadId);
}
const slackApprovalCapability = createApproverRestrictedNativeApprovalCapability({
	channel: "slack",
	channelLabel: "Slack",
	describeExecApprovalSetup: ({ accountId }) => {
		const prefix = accountId && accountId !== "default" ? `channels.slack.accounts.${accountId}` : "channels.slack";
		return `Approve it from the Web UI or terminal UI for now. Slack supports native exec approvals for this account. Configure \`${prefix}.execApprovals.approvers\` or \`commands.ownerAllowFrom\`; leave \`${prefix}.execApprovals.enabled\` unset/\`auto\` or set it to \`true\`.`;
	},
	listAccountIds: listSlackAccountIds,
	hasApprovers: ({ cfg, accountId }) => getSlackExecApprovalApprovers({
		cfg,
		accountId
	}).length > 0,
	isExecAuthorizedSender: ({ cfg, accountId, senderId }) => isSlackExecApprovalAuthorizedSender({
		cfg,
		accountId,
		senderId
	}),
	isPluginAuthorizedSender: ({ cfg, accountId, senderId }) => isSlackApprovalAuthorizedSender({
		cfg,
		accountId,
		senderId
	}),
	isNativeDeliveryEnabled: ({ cfg, accountId }) => isSlackExecApprovalClientEnabled({
		cfg,
		accountId
	}),
	resolveNativeDeliveryMode: ({ cfg, accountId }) => resolveSlackExecApprovalTarget({
		cfg,
		accountId
	}),
	requireMatchingTurnSourceChannel: true,
	resolveSuppressionAccountId: ({ target, request }) => target.accountId?.trim() || request.request.turnSourceAccountId?.trim() || void 0,
	resolveOriginTarget: createChannelNativeOriginTargetResolver({
		channel: "slack",
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleSlackExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveTurnSourceTarget: resolveTurnSourceSlackOriginTarget,
		resolveSessionTarget: resolveSessionSlackOriginTarget,
		targetsMatch: slackTargetsMatch
	}),
	resolveApproverDmTargets: createChannelApproverDmTargetResolver({
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleSlackExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveApprovers: getSlackExecApprovalApprovers,
		mapApprover: (approver) => ({ to: `user:${approver}` })
	}),
	notifyOriginWhenDmOnly: true
});
const slackNativeApprovalAdapter = splitChannelApprovalCapability(slackApprovalCapability);
//#endregion
//#region extensions/slack/src/monitor/allow-list.ts
const SLACK_SLUG_CACHE_MAX = 512;
const slackSlugCache = /* @__PURE__ */ new Map();
function normalizeSlackSlug(raw) {
	const key = raw ?? "";
	const cached = slackSlugCache.get(key);
	if (cached !== void 0) return cached;
	const normalized = normalizeHyphenSlug(raw);
	slackSlugCache.set(key, normalized);
	if (slackSlugCache.size > SLACK_SLUG_CACHE_MAX) {
		const oldest = slackSlugCache.keys().next();
		if (!oldest.done) slackSlugCache.delete(oldest.value);
	}
	return normalized;
}
function normalizeAllowList(list) {
	return normalizeStringEntries(list);
}
function normalizeAllowListLower(list) {
	return normalizeStringEntriesLower(list);
}
function normalizeSlackAllowOwnerEntry(entry) {
	const trimmed = entry.trim().toLowerCase();
	if (!trimmed || trimmed === "*") return;
	const withoutPrefix = trimmed.replace(/^(slack:|user:)/, "");
	return /^u[a-z0-9]+$/.test(withoutPrefix) ? withoutPrefix : void 0;
}
function resolveSlackAllowListMatch(params) {
	const compiledAllowList = compileAllowlist(params.allowList);
	const id = params.id?.toLowerCase();
	const name = params.name?.toLowerCase();
	const slug = normalizeSlackSlug(name);
	return resolveCompiledAllowlistMatch({
		compiledAllowlist: compiledAllowList,
		candidates: [
			{
				value: id,
				source: "id"
			},
			{
				value: id ? `slack:${id}` : void 0,
				source: "prefixed-id"
			},
			{
				value: id ? `user:${id}` : void 0,
				source: "prefixed-user"
			},
			...params.allowNameMatching === true ? [
				{
					value: name,
					source: "name"
				},
				{
					value: name ? `slack:${name}` : void 0,
					source: "prefixed-name"
				},
				{
					value: slug,
					source: "slug"
				}
			] : []
		]
	});
}
function allowListMatches(params) {
	return resolveSlackAllowListMatch(params).allowed;
}
function resolveSlackUserAllowed(params) {
	const allowList = normalizeAllowListLower(params.allowList);
	if (allowList.length === 0) return true;
	return allowListMatches({
		allowList,
		id: params.userId,
		name: params.userName,
		allowNameMatching: params.allowNameMatching
	});
}
//#endregion
export { normalizeSlackSlug as a, slackApprovalCapability as c, normalizeSlackApproverId as d, shouldHandleSlackExecApprovalRequest as f, normalizeSlackAllowOwnerEntry as i, slackNativeApprovalAdapter as l, normalizeAllowList as n, resolveSlackAllowListMatch as o, shouldSuppressLocalSlackExecApprovalPrompt as p, normalizeAllowListLower as r, resolveSlackUserAllowed as s, allowListMatches as t, isSlackExecApprovalClientEnabled as u };
