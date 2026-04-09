import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { r as normalizeStringEntries } from "./string-normalization-CvImYLpT.js";
import { i as resolveChannelEntryMatch, n as buildChannelKeyCandidates } from "./channel-config-DH9ug5w9.js";
import { i as resolveAllowlistMatchByCandidates } from "./allowlist-match-BwqmzAfd.js";
import { l as getExecApprovalReplyMetadata } from "./exec-approval-reply-28aiYmKw.js";
import "./core-D7mi2qmR.js";
import "./routing-DdBDhOmH.js";
import "./channel-targets-BmwNqxOt.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import { n as resolveApprovalApprovers, t as createResolvedApproverActionAuthAdapter } from "./approval-auth-helpers-DNJdxO4L.js";
import { t as matchesApprovalRequestFilters } from "./approval-request-filters-DXtqfV_Z.js";
import { n as isChannelExecApprovalClientEnabledFromConfig, r as isChannelExecApprovalTargetRecipient, t as createChannelExecApprovalProfile } from "./approval-client-helpers-DFLM0RL9.js";
import "./approval-client-runtime-Ci7-A1l2.js";
import { i as splitChannelApprovalCapability, n as createApproverRestrictedNativeApprovalCapability, r as createChannelApprovalCapability } from "./approval-delivery-helpers-D5p52i-E.js";
import "./approval-delivery-runtime-Cx_lhKsS.js";
import { o as resolveApprovalRequestChannelAccountId } from "./exec-approval-session-target-CZdxQD7c.js";
import { n as createChannelNativeOriginTargetResolver, t as createChannelApproverDmTargetResolver } from "./approval-native-helpers-BRBrzKt_.js";
import "./approval-native-runtime-CsStbzrF.js";
import "./agent-media-payload-t2IfQA3D.js";
import "./channel-feedback-CG9vt7uF.js";
import "./channel-inbound-bc7z3_ut.js";
import { i as resolveMatrixAccount, t as listMatrixAccountIds } from "./accounts-CQDhvmdl.js";
import { a as resolveMatrixTargetIdentity, i as resolveMatrixDirectUserId } from "./target-ids-D7JNR-GU.js";
//#region extensions/matrix/src/matrix/monitor/allowlist.ts
function normalizeAllowList(list) {
	return normalizeStringEntries(list);
}
function normalizeMatrixUser(raw) {
	const value = (raw ?? "").trim();
	if (!value) return "";
	if (!value.startsWith("@") || !value.includes(":")) return value.toLowerCase();
	const withoutAt = value.slice(1);
	const splitIndex = withoutAt.indexOf(":");
	if (splitIndex === -1) return value.toLowerCase();
	const localpart = withoutAt.slice(0, splitIndex).toLowerCase();
	const server = withoutAt.slice(splitIndex + 1).toLowerCase();
	if (!server) return value.toLowerCase();
	return `@${localpart}:${server.toLowerCase()}`;
}
function normalizeMatrixUserId(raw) {
	const trimmed = (raw ?? "").trim();
	if (!trimmed) return "";
	const lowered = trimmed.toLowerCase();
	if (lowered.startsWith("matrix:")) return normalizeMatrixUser(trimmed.slice(7));
	if (lowered.startsWith("user:")) return normalizeMatrixUser(trimmed.slice(5));
	return normalizeMatrixUser(trimmed);
}
function normalizeMatrixAllowListEntry(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	if (trimmed === "*") return trimmed;
	const lowered = trimmed.toLowerCase();
	if (lowered.startsWith("matrix:")) return `matrix:${normalizeMatrixUser(trimmed.slice(7))}`;
	if (lowered.startsWith("user:")) return `user:${normalizeMatrixUser(trimmed.slice(5))}`;
	return normalizeMatrixUser(trimmed);
}
function normalizeMatrixAllowList(list) {
	return normalizeAllowList(list).map((entry) => normalizeMatrixAllowListEntry(entry));
}
function resolveMatrixAllowListMatch(params) {
	const allowList = params.allowList;
	if (allowList.length === 0) return { allowed: false };
	if (allowList.includes("*")) return {
		allowed: true,
		matchKey: "*",
		matchSource: "wildcard"
	};
	const userId = normalizeMatrixUser(params.userId);
	return resolveAllowlistMatchByCandidates({
		allowList,
		candidates: [
			{
				value: userId,
				source: "id"
			},
			{
				value: userId ? `matrix:${userId}` : "",
				source: "prefixed-id"
			},
			{
				value: userId ? `user:${userId}` : "",
				source: "prefixed-user"
			}
		]
	});
}
//#endregion
//#region extensions/matrix/src/exec-approvals.ts
function normalizeMatrixApproverId(value) {
	return normalizeMatrixUserId(String(value)) || void 0;
}
function normalizeMatrixExecApproverId(value) {
	const normalized = normalizeMatrixApproverId(value);
	return normalized === "*" ? void 0 : normalized;
}
function resolveMatrixExecApprovalConfig(params) {
	const account = resolveMatrixAccount(params);
	const config = account.config.execApprovals;
	if (!config) return;
	return {
		...config,
		enabled: account.enabled && account.configured ? config.enabled : false
	};
}
function countMatrixExecApprovalEligibleAccounts(params) {
	return listMatrixAccountIds(params.cfg).filter((accountId) => {
		const account = resolveMatrixAccount({
			cfg: params.cfg,
			accountId
		});
		if (!account.enabled || !account.configured) return false;
		const config = resolveMatrixExecApprovalConfig({
			cfg: params.cfg,
			accountId
		});
		const filters = config?.enabled ? {
			agentFilter: config.agentFilter,
			sessionFilter: config.sessionFilter
		} : {
			agentFilter: void 0,
			sessionFilter: void 0
		};
		return isChannelExecApprovalClientEnabledFromConfig({
			enabled: config?.enabled,
			approverCount: getMatrixExecApprovalApprovers({
				cfg: params.cfg,
				accountId
			}).length
		}) && matchesApprovalRequestFilters({
			request: params.request.request,
			agentFilter: filters.agentFilter,
			sessionFilter: filters.sessionFilter
		});
	}).length;
}
function matchesMatrixRequestAccount(params) {
	const turnSourceChannel = params.request.request.turnSourceChannel?.trim().toLowerCase() || "";
	const boundAccountId = resolveApprovalRequestChannelAccountId({
		cfg: params.cfg,
		request: params.request,
		channel: "matrix"
	});
	if (turnSourceChannel && turnSourceChannel !== "matrix" && !boundAccountId) return countMatrixExecApprovalEligibleAccounts({
		cfg: params.cfg,
		request: params.request
	}) <= 1;
	return !boundAccountId || !params.accountId || normalizeAccountId(boundAccountId) === normalizeAccountId(params.accountId);
}
function getMatrixExecApprovalApprovers(params) {
	const account = resolveMatrixAccount(params).config;
	return resolveApprovalApprovers({
		explicit: account.execApprovals?.approvers,
		allowFrom: account.dm?.allowFrom,
		normalizeApprover: normalizeMatrixExecApproverId
	});
}
function isMatrixExecApprovalTargetRecipient(params) {
	return isChannelExecApprovalTargetRecipient({
		...params,
		channel: "matrix",
		normalizeSenderId: normalizeMatrixApproverId,
		matchTarget: ({ target, normalizedSenderId }) => normalizeMatrixApproverId(target.to) === normalizedSenderId
	});
}
const matrixExecApprovalProfile = createChannelExecApprovalProfile({
	resolveConfig: resolveMatrixExecApprovalConfig,
	resolveApprovers: getMatrixExecApprovalApprovers,
	normalizeSenderId: normalizeMatrixApproverId,
	isTargetRecipient: isMatrixExecApprovalTargetRecipient,
	matchesRequestAccount: matchesMatrixRequestAccount
});
const isMatrixExecApprovalClientEnabled = matrixExecApprovalProfile.isClientEnabled;
matrixExecApprovalProfile.isApprover;
const isMatrixExecApprovalAuthorizedSender = matrixExecApprovalProfile.isAuthorizedSender;
const resolveMatrixExecApprovalTarget = matrixExecApprovalProfile.resolveTarget;
const shouldHandleMatrixExecApprovalRequest = matrixExecApprovalProfile.shouldHandleRequest;
function buildFilterCheckRequest(params) {
	return {
		id: params.metadata.approvalId,
		request: {
			command: "",
			agentId: params.metadata.agentId ?? null,
			sessionKey: params.metadata.sessionKey ?? null
		},
		createdAtMs: 0,
		expiresAtMs: 0
	};
}
function shouldSuppressLocalMatrixExecApprovalPrompt(params) {
	if (!matrixExecApprovalProfile.shouldSuppressLocalPrompt(params)) return false;
	const metadata = getExecApprovalReplyMetadata(params.payload);
	if (!metadata) return false;
	if (metadata.approvalKind !== "exec") return false;
	const request = buildFilterCheckRequest({ metadata });
	return shouldHandleMatrixExecApprovalRequest({
		cfg: params.cfg,
		accountId: params.accountId,
		request
	});
}
//#endregion
//#region extensions/matrix/src/approval-auth.ts
function getMatrixApprovalAuthApprovers(params) {
	return resolveApprovalApprovers({
		allowFrom: resolveMatrixAccount(params).config.dm?.allowFrom,
		normalizeApprover: normalizeMatrixApproverId
	});
}
const matrixApprovalAuth = createResolvedApproverActionAuthAdapter({
	channelLabel: "Matrix",
	resolveApprovers: ({ cfg, accountId }) => getMatrixApprovalAuthApprovers({
		cfg,
		accountId
	}),
	normalizeSenderId: (value) => normalizeMatrixApproverId(value)
});
//#endregion
//#region extensions/matrix/src/approval-native.ts
const MATRIX_PLUGIN_NATIVE_DELIVERY_DISABLED = {
	enabled: false,
	preferredSurface: "approver-dm",
	supportsOriginSurface: false,
	supportsApproverDmSurface: false,
	notifyOriginWhenDmOnly: false
};
function normalizeComparableTarget(value) {
	const target = resolveMatrixTargetIdentity(value);
	if (!target) return value.trim().toLowerCase();
	if (target.kind === "user") return `user:${normalizeMatrixUserId(target.id)}`;
	return `${target.kind.toLowerCase()}:${target.id}`;
}
function resolveMatrixNativeTarget(raw) {
	const target = resolveMatrixTargetIdentity(raw);
	if (!target) return null;
	return target.kind === "user" ? `user:${target.id}` : `room:${target.id}`;
}
function normalizeThreadId(value) {
	return (value == null ? "" : String(value).trim()) || void 0;
}
function resolveTurnSourceMatrixOriginTarget(request) {
	const turnSourceChannel = request.request.turnSourceChannel?.trim().toLowerCase() || "";
	const target = resolveMatrixNativeTarget(request.request.turnSourceTo?.trim() || "");
	if (turnSourceChannel !== "matrix" || !target) return null;
	return {
		to: target,
		threadId: normalizeThreadId(request.request.turnSourceThreadId)
	};
}
function resolveSessionMatrixOriginTarget(sessionTarget) {
	const target = resolveMatrixNativeTarget(sessionTarget.to);
	if (!target) return null;
	return {
		to: target,
		threadId: normalizeThreadId(sessionTarget.threadId)
	};
}
function matrixTargetsMatch(a, b) {
	return normalizeComparableTarget(a.to) === normalizeComparableTarget(b.to) && (a.threadId ?? "") === (b.threadId ?? "");
}
function hasMatrixPluginApprovers(params) {
	return getMatrixApprovalAuthApprovers(params).length > 0;
}
const matrixNativeApprovalCapability = createApproverRestrictedNativeApprovalCapability({
	channel: "matrix",
	channelLabel: "Matrix",
	describeExecApprovalSetup: ({ accountId }) => {
		const prefix = accountId && accountId !== "default" ? `channels.matrix.accounts.${accountId}` : "channels.matrix";
		return `Approve it from the Web UI or terminal UI for now. Matrix supports native exec approvals for this account. Configure \`${prefix}.execApprovals.approvers\` or \`${prefix}.dm.allowFrom\`; leave \`${prefix}.execApprovals.enabled\` unset/\`auto\` or set it to \`true\`.`;
	},
	listAccountIds: listMatrixAccountIds,
	hasApprovers: ({ cfg, accountId }) => getMatrixExecApprovalApprovers({
		cfg,
		accountId
	}).length > 0,
	isExecAuthorizedSender: ({ cfg, accountId, senderId }) => isMatrixExecApprovalAuthorizedSender({
		cfg,
		accountId,
		senderId
	}),
	isNativeDeliveryEnabled: ({ cfg, accountId }) => isMatrixExecApprovalClientEnabled({
		cfg,
		accountId
	}),
	resolveNativeDeliveryMode: ({ cfg, accountId }) => resolveMatrixExecApprovalTarget({
		cfg,
		accountId
	}),
	requireMatchingTurnSourceChannel: true,
	resolveSuppressionAccountId: ({ target, request }) => target.accountId?.trim() || request.request.turnSourceAccountId?.trim() || void 0,
	resolveOriginTarget: createChannelNativeOriginTargetResolver({
		channel: "matrix",
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleMatrixExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveTurnSourceTarget: resolveTurnSourceMatrixOriginTarget,
		resolveSessionTarget: resolveSessionMatrixOriginTarget,
		targetsMatch: matrixTargetsMatch
	}),
	resolveApproverDmTargets: createChannelApproverDmTargetResolver({
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleMatrixExecApprovalRequest({
			cfg,
			accountId,
			request
		}),
		resolveApprovers: getMatrixExecApprovalApprovers,
		mapApprover: (approver) => {
			const normalized = normalizeMatrixUserId(approver);
			return normalized ? { to: `user:${normalized}` } : null;
		}
	})
});
const splitMatrixApprovalCapability = splitChannelApprovalCapability(matrixNativeApprovalCapability);
const matrixBaseNativeApprovalAdapter = splitMatrixApprovalCapability.native;
const matrixBaseDeliveryAdapter = splitMatrixApprovalCapability.delivery;
const matrixDeliveryAdapter = matrixBaseDeliveryAdapter && {
	...matrixBaseDeliveryAdapter,
	shouldSuppressForwardingFallback: (params) => params.approvalKind === "plugin" ? false : matrixBaseDeliveryAdapter.shouldSuppressForwardingFallback?.(params) ?? false
};
const matrixExecOnlyNativeApprovalAdapter = matrixBaseNativeApprovalAdapter && {
	describeDeliveryCapabilities: (params) => params.approvalKind === "plugin" ? MATRIX_PLUGIN_NATIVE_DELIVERY_DISABLED : matrixBaseNativeApprovalAdapter.describeDeliveryCapabilities(params),
	resolveOriginTarget: async (params) => params.approvalKind === "plugin" ? null : await matrixBaseNativeApprovalAdapter.resolveOriginTarget?.(params) ?? null,
	resolveApproverDmTargets: async (params) => params.approvalKind === "plugin" ? [] : await matrixBaseNativeApprovalAdapter.resolveApproverDmTargets?.(params) ?? []
};
const matrixApprovalCapability = createChannelApprovalCapability({
	authorizeActorAction: (params) => {
		if (params.approvalKind !== "plugin") return matrixNativeApprovalCapability.authorizeActorAction?.(params) ?? { authorized: true };
		if (!hasMatrixPluginApprovers({
			cfg: params.cfg,
			accountId: params.accountId
		})) return {
			authorized: false,
			reason: "❌ Matrix plugin approvals are not enabled for this bot account."
		};
		return matrixApprovalAuth.authorizeActorAction(params);
	},
	getActionAvailabilityState: (params) => hasMatrixPluginApprovers({
		cfg: params.cfg,
		accountId: params.accountId
	}) ? { kind: "enabled" } : matrixNativeApprovalCapability.getActionAvailabilityState?.(params) ?? { kind: "disabled" },
	describeExecApprovalSetup: matrixNativeApprovalCapability.describeExecApprovalSetup,
	approvals: {
		delivery: matrixDeliveryAdapter,
		native: matrixExecOnlyNativeApprovalAdapter,
		render: matrixNativeApprovalCapability.render
	}
});
const matrixNativeApprovalAdapter = {
	auth: {
		authorizeActorAction: matrixApprovalCapability.authorizeActorAction,
		getActionAvailabilityState: matrixApprovalCapability.getActionAvailabilityState
	},
	delivery: matrixDeliveryAdapter,
	render: matrixApprovalCapability.render,
	native: matrixExecOnlyNativeApprovalAdapter
};
//#endregion
//#region extensions/matrix/src/matrix/monitor/rooms.ts
function readLegacyRoomAllowAlias(room) {
	const rawRoom = room;
	return typeof rawRoom?.allow === "boolean" ? rawRoom.allow : void 0;
}
function resolveMatrixRoomConfig(params) {
	const rooms = params.rooms ?? {};
	const allowlistConfigured = Object.keys(rooms).length > 0;
	const { entry: matched, key: matchedKey, wildcardEntry, wildcardKey } = resolveChannelEntryMatch({
		entries: rooms,
		keys: buildChannelKeyCandidates(params.roomId, `room:${params.roomId}`, ...params.aliases),
		wildcardKey: "*"
	});
	const resolved = matched ?? wildcardEntry;
	const legacyAllow = readLegacyRoomAllowAlias(resolved);
	return {
		allowed: resolved ? resolved.enabled !== false && legacyAllow !== false : false,
		allowlistConfigured,
		config: resolved,
		matchKey: matchedKey ?? wildcardKey,
		matchSource: matched ? "direct" : wildcardEntry ? "wildcard" : void 0
	};
}
//#endregion
//#region extensions/matrix/src/matrix/session-store-metadata.ts
function trimMaybeString(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function resolveMatrixRoomTargetId(value) {
	const trimmed = trimMaybeString(value);
	if (!trimmed) return;
	const target = resolveMatrixTargetIdentity(trimmed);
	return target?.kind === "room" && target.id.startsWith("!") ? target.id : void 0;
}
function resolveMatrixSessionAccountId(value) {
	const trimmed = trimMaybeString(value);
	return trimmed ? normalizeAccountId(trimmed) : void 0;
}
function resolveMatrixStoredRoomId(params) {
	return resolveMatrixRoomTargetId(params.deliveryTo) ?? resolveMatrixRoomTargetId(params.lastTo) ?? resolveMatrixRoomTargetId(params.originNativeChannelId) ?? resolveMatrixRoomTargetId(params.originTo);
}
function resolveMatrixStoredSessionMeta(entry) {
	if (!entry) return null;
	const channel = trimMaybeString(entry.deliveryContext?.channel) ?? trimMaybeString(entry.lastChannel) ?? trimMaybeString(entry.origin?.provider);
	const accountId = resolveMatrixSessionAccountId(entry.deliveryContext?.accountId ?? entry.lastAccountId ?? entry.origin?.accountId) ?? void 0;
	const roomId = resolveMatrixStoredRoomId({
		deliveryTo: entry.deliveryContext?.to,
		lastTo: entry.lastTo,
		originNativeChannelId: entry.origin?.nativeChannelId,
		originTo: entry.origin?.to
	});
	const chatType = trimMaybeString(entry.origin?.chatType) ?? trimMaybeString(entry.chatType) ?? void 0;
	const directUserId = chatType === "direct" ? trimMaybeString(entry.origin?.nativeDirectUserId) ?? resolveMatrixDirectUserId({
		from: trimMaybeString(entry.origin?.from),
		to: (roomId ? `room:${roomId}` : void 0) ?? trimMaybeString(entry.deliveryContext?.to) ?? trimMaybeString(entry.lastTo) ?? trimMaybeString(entry.origin?.to),
		chatType
	}) : void 0;
	if (!channel && !accountId && !roomId && !directUserId) return null;
	return {
		...channel ? { channel } : {},
		...accountId ? { accountId } : {},
		...roomId ? { roomId } : {},
		...directUserId ? { directUserId } : {}
	};
}
//#endregion
export { isMatrixExecApprovalAuthorizedSender as a, shouldSuppressLocalMatrixExecApprovalPrompt as c, resolveMatrixAllowListMatch as d, matrixNativeApprovalAdapter as i, normalizeMatrixAllowList as l, resolveMatrixRoomConfig as n, isMatrixExecApprovalClientEnabled as o, matrixApprovalCapability as r, shouldHandleMatrixExecApprovalRequest as s, resolveMatrixStoredSessionMeta as t, normalizeMatrixUserId as u };
