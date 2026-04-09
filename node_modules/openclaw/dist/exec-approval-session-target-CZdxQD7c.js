import { d as normalizeMessageChannel } from "./message-channel-DnQkETjb.js";
import { v as normalizeOptionalAccountId, w as parseAgentSessionKey } from "./session-key-BR3Z-ljs.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { i as resolveSessionDeliveryTarget } from "./targets-B4dqnBo1.js";
//#region src/infra/approval-request-account-binding.ts
function normalizeOptionalString$1(value) {
	const normalized = value?.trim();
	return normalized ? normalized : void 0;
}
function normalizeOptionalChannel$1(value) {
	return normalizeMessageChannel(value);
}
function resolvePersistedApprovalRequestSessionBinding(params) {
	const sessionKey = normalizeOptionalString$1(params.request.request.sessionKey);
	if (!sessionKey) return null;
	const agentId = parseAgentSessionKey(sessionKey)?.agentId ?? params.request.request.agentId ?? "main";
	const entry = loadSessionStore(resolveStorePath(params.cfg.session?.store, { agentId }))[sessionKey];
	if (!entry) return null;
	const channel = normalizeOptionalChannel$1(entry.origin?.provider ?? entry.lastChannel);
	const accountId = normalizeOptionalAccountId(entry.origin?.accountId ?? entry.lastAccountId);
	return channel || accountId ? {
		channel,
		accountId
	} : null;
}
function resolveApprovalRequestAccountId(params) {
	const expectedChannel = normalizeOptionalChannel$1(params.channel);
	const turnSourceChannel = normalizeOptionalChannel$1(params.request.request.turnSourceChannel);
	if (expectedChannel && turnSourceChannel && turnSourceChannel !== expectedChannel) return null;
	const turnSourceAccountId = normalizeOptionalAccountId(params.request.request.turnSourceAccountId);
	if (turnSourceAccountId) return turnSourceAccountId;
	const sessionBinding = resolvePersistedApprovalRequestSessionBinding(params);
	const sessionChannel = sessionBinding?.channel;
	if (expectedChannel && sessionChannel && sessionChannel !== expectedChannel) return null;
	return sessionBinding?.accountId ?? null;
}
function resolveApprovalRequestChannelAccountId(params) {
	const expectedChannel = normalizeOptionalChannel$1(params.channel);
	if (!expectedChannel) return null;
	const turnSourceChannel = normalizeOptionalChannel$1(params.request.request.turnSourceChannel);
	if (!turnSourceChannel || turnSourceChannel === expectedChannel) return resolveApprovalRequestAccountId(params);
	const sessionBinding = resolvePersistedApprovalRequestSessionBinding(params);
	return sessionBinding?.channel === expectedChannel ? sessionBinding.accountId ?? null : null;
}
function doesApprovalRequestMatchChannelAccount(params) {
	const expectedChannel = normalizeOptionalChannel$1(params.channel);
	if (!expectedChannel) return false;
	const turnSourceChannel = normalizeOptionalChannel$1(params.request.request.turnSourceChannel);
	if (turnSourceChannel && turnSourceChannel !== expectedChannel) return false;
	const turnSourceAccountId = normalizeOptionalAccountId(params.request.request.turnSourceAccountId);
	const expectedAccountId = normalizeOptionalAccountId(params.accountId);
	if (turnSourceAccountId) return !expectedAccountId || expectedAccountId === turnSourceAccountId;
	const sessionBinding = resolvePersistedApprovalRequestSessionBinding(params);
	const sessionChannel = sessionBinding?.channel;
	if (sessionChannel && sessionChannel !== expectedChannel) return false;
	const boundAccountId = sessionBinding?.accountId;
	return !expectedAccountId || !boundAccountId || expectedAccountId === boundAccountId;
}
//#endregion
//#region src/infra/exec-approval-session-target.ts
function normalizeOptionalString(value) {
	const normalized = value?.trim();
	return normalized ? normalized : void 0;
}
function normalizeOptionalThreadId(value) {
	if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
	if (typeof value !== "string") return;
	const normalized = Number.parseInt(value, 10);
	return Number.isFinite(normalized) ? normalized : void 0;
}
function isExecApprovalRequest(request) {
	return "command" in request.request;
}
function toExecLikeApprovalRequest(request) {
	if (isExecApprovalRequest(request)) return request;
	return {
		id: request.id,
		request: {
			command: request.request.title,
			sessionKey: request.request.sessionKey ?? void 0,
			turnSourceChannel: request.request.turnSourceChannel ?? void 0,
			turnSourceTo: request.request.turnSourceTo ?? void 0,
			turnSourceAccountId: request.request.turnSourceAccountId ?? void 0,
			turnSourceThreadId: request.request.turnSourceThreadId ?? void 0
		},
		createdAtMs: request.createdAtMs,
		expiresAtMs: request.expiresAtMs
	};
}
function normalizeOptionalChannel(value) {
	return normalizeMessageChannel(value);
}
function resolveExecApprovalSessionTarget(params) {
	const sessionKey = normalizeOptionalString(params.request.request.sessionKey);
	if (!sessionKey) return null;
	const agentId = parseAgentSessionKey(sessionKey)?.agentId ?? params.request.request.agentId ?? "main";
	const entry = loadSessionStore(resolveStorePath(params.cfg.session?.store, { agentId }))[sessionKey];
	if (!entry) return null;
	const target = resolveSessionDeliveryTarget({
		entry,
		requestedChannel: "last",
		turnSourceChannel: normalizeOptionalString(params.turnSourceChannel),
		turnSourceTo: normalizeOptionalString(params.turnSourceTo),
		turnSourceAccountId: normalizeOptionalString(params.turnSourceAccountId),
		turnSourceThreadId: normalizeOptionalThreadId(params.turnSourceThreadId)
	});
	if (!target.to) return null;
	return {
		channel: normalizeOptionalString(target.channel),
		to: target.to,
		accountId: normalizeOptionalString(target.accountId),
		threadId: normalizeOptionalThreadId(target.threadId)
	};
}
function resolveApprovalRequestSessionTarget(params) {
	const execLikeRequest = toExecLikeApprovalRequest(params.request);
	return resolveExecApprovalSessionTarget({
		cfg: params.cfg,
		request: execLikeRequest,
		turnSourceChannel: execLikeRequest.request.turnSourceChannel ?? void 0,
		turnSourceTo: execLikeRequest.request.turnSourceTo ?? void 0,
		turnSourceAccountId: execLikeRequest.request.turnSourceAccountId ?? void 0,
		turnSourceThreadId: execLikeRequest.request.turnSourceThreadId ?? void 0
	});
}
function resolveApprovalRequestStoredSessionTarget(params) {
	const execLikeRequest = toExecLikeApprovalRequest(params.request);
	return resolveExecApprovalSessionTarget({
		cfg: params.cfg,
		request: execLikeRequest
	});
}
function resolveApprovalRequestOriginTarget(params) {
	if (!doesApprovalRequestMatchChannelAccount({
		cfg: params.cfg,
		request: params.request,
		channel: params.channel,
		accountId: params.accountId
	})) return null;
	const turnSourceTarget = params.resolveTurnSourceTarget(params.request);
	const expectedChannel = normalizeOptionalChannel(params.channel);
	const sessionTargetBinding = resolveApprovalRequestStoredSessionTarget({
		cfg: params.cfg,
		request: params.request
	});
	const sessionTarget = sessionTargetBinding && normalizeOptionalChannel(sessionTargetBinding.channel) === expectedChannel ? params.resolveSessionTarget(sessionTargetBinding) : null;
	if (turnSourceTarget && sessionTarget && !params.targetsMatch(turnSourceTarget, sessionTarget)) return null;
	return turnSourceTarget ?? sessionTarget ?? params.resolveFallbackTarget?.(params.request) ?? null;
}
//#endregion
export { resolveApprovalRequestAccountId as a, doesApprovalRequestMatchChannelAccount as i, resolveApprovalRequestSessionTarget as n, resolveApprovalRequestChannelAccountId as o, resolveExecApprovalSessionTarget as r, resolveApprovalRequestOriginTarget as t };
