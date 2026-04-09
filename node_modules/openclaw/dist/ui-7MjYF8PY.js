import { l as getExecApprovalReplyMetadata } from "./exec-approval-reply-28aiYmKw.js";
import { n as resolveApprovalApprovers } from "./approval-auth-helpers-DNJdxO4L.js";
import { t as matchesApprovalRequestFilters } from "./approval-request-filters-DXtqfV_Z.js";
import { n as isChannelExecApprovalClientEnabledFromConfig } from "./approval-client-helpers-DFLM0RL9.js";
import "./approval-client-runtime-Ci7-A1l2.js";
import { n as createApproverRestrictedNativeApprovalCapability } from "./approval-delivery-helpers-D5p52i-E.js";
import "./approval-delivery-runtime-Cx_lhKsS.js";
import { i as doesApprovalRequestMatchChannelAccount } from "./exec-approval-session-target-CZdxQD7c.js";
import { n as createChannelNativeOriginTargetResolver, t as createChannelApproverDmTargetResolver } from "./approval-native-helpers-BRBrzKt_.js";
import "./approval-native-runtime-CsStbzrF.js";
import { n as listDiscordAccountIds, o as resolveDiscordAccount } from "./accounts-0gXQeT93.js";
import { t as parseDiscordTarget } from "./target-parsing-CSh64UAG.js";
import { t as inspectDiscordAccount } from "./account-inspect-Ba31ZWUu.js";
import { Container } from "@buape/carbon";
//#region extensions/discord/src/exec-approvals.ts
function normalizeDiscordApproverId(value) {
	const trimmed = value.trim();
	if (!trimmed) return;
	if (/^\d+$/.test(trimmed)) return trimmed;
	try {
		const target = parseDiscordTarget(trimmed);
		return target?.kind === "user" ? target.id : void 0;
	} catch {
		return;
	}
}
function resolveDiscordOwnerApprovers(cfg) {
	const ownerAllowFrom = cfg.commands?.ownerAllowFrom;
	if (!Array.isArray(ownerAllowFrom) || ownerAllowFrom.length === 0) return [];
	return resolveApprovalApprovers({
		explicit: ownerAllowFrom,
		normalizeApprover: (value) => normalizeDiscordApproverId(String(value))
	});
}
function getDiscordExecApprovalApprovers(params) {
	return resolveApprovalApprovers({
		explicit: params.configOverride?.approvers ?? resolveDiscordAccount(params).config.execApprovals?.approvers ?? resolveDiscordOwnerApprovers(params.cfg),
		normalizeApprover: (value) => normalizeDiscordApproverId(String(value))
	});
}
function isDiscordExecApprovalClientEnabled(params) {
	return isChannelExecApprovalClientEnabledFromConfig({
		enabled: (params.configOverride ?? resolveDiscordAccount(params).config.execApprovals)?.enabled,
		approverCount: getDiscordExecApprovalApprovers({
			cfg: params.cfg,
			accountId: params.accountId,
			configOverride: params.configOverride
		}).length
	});
}
function isDiscordExecApprovalApprover(params) {
	const senderId = params.senderId?.trim();
	if (!senderId) return false;
	return getDiscordExecApprovalApprovers({
		cfg: params.cfg,
		accountId: params.accountId,
		configOverride: params.configOverride
	}).includes(senderId);
}
function shouldSuppressLocalDiscordExecApprovalPrompt(params) {
	return isDiscordExecApprovalClientEnabled(params) && getExecApprovalReplyMetadata(params.payload) !== null;
}
//#endregion
//#region extensions/discord/src/approval-native.ts
function extractDiscordChannelId(sessionKey) {
	if (!sessionKey) return null;
	const match = sessionKey.match(/discord:(?:channel|group):(\d+)/);
	return match ? match[1] : null;
}
function extractDiscordSessionKind(sessionKey) {
	if (!sessionKey) return null;
	const match = sessionKey.match(/discord:(channel|group|dm):/);
	if (!match) return null;
	return match[1];
}
function normalizeDiscordOriginChannelId(value) {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const prefixed = trimmed.match(/^(?:channel|group):(\d+)$/i);
	if (prefixed) return prefixed[1];
	return /^\d+$/.test(trimmed) ? trimmed : null;
}
function shouldHandleDiscordApprovalRequest(params) {
	const config = params.configOverride ?? resolveDiscordAccount({
		cfg: params.cfg,
		accountId: params.accountId
	}).config.execApprovals;
	const approvers = getDiscordExecApprovalApprovers({
		cfg: params.cfg,
		accountId: params.accountId,
		configOverride: params.configOverride
	});
	if (!doesApprovalRequestMatchChannelAccount({
		cfg: params.cfg,
		request: params.request,
		channel: "discord",
		accountId: params.accountId
	})) return false;
	if (!isChannelExecApprovalClientEnabledFromConfig({
		enabled: config?.enabled,
		approverCount: approvers.length
	})) return false;
	return matchesApprovalRequestFilters({
		request: params.request.request,
		agentFilter: config?.agentFilter,
		sessionFilter: config?.sessionFilter
	});
}
function createDiscordOriginTargetResolver(configOverride) {
	return createChannelNativeOriginTargetResolver({
		channel: "discord",
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleDiscordApprovalRequest({
			cfg,
			accountId,
			request,
			configOverride
		}),
		resolveTurnSourceTarget: (request) => {
			const sessionKind = extractDiscordSessionKind(request.request.sessionKey?.trim() || null);
			const turnSourceChannel = request.request.turnSourceChannel?.trim().toLowerCase() || "";
			const rawTurnSourceTo = request.request.turnSourceTo?.trim() || "";
			const turnSourceTo = normalizeDiscordOriginChannelId(rawTurnSourceTo);
			const hasExplicitOriginTarget = /^(?:channel|group):/i.test(rawTurnSourceTo);
			if (turnSourceChannel !== "discord" || !turnSourceTo || sessionKind === "dm") return null;
			return hasExplicitOriginTarget || sessionKind === "channel" || sessionKind === "group" ? { to: turnSourceTo } : null;
		},
		resolveSessionTarget: (sessionTarget, request) => {
			if (extractDiscordSessionKind(request.request.sessionKey?.trim() || null) === "dm") return null;
			const targetTo = normalizeDiscordOriginChannelId(sessionTarget.to);
			return targetTo ? { to: targetTo } : null;
		},
		targetsMatch: (a, b) => a.to === b.to,
		resolveFallbackTarget: (request) => {
			if (extractDiscordSessionKind(request.request.sessionKey?.trim() || null) === "dm") return null;
			const legacyChannelId = extractDiscordChannelId(request.request.sessionKey?.trim() || null);
			return legacyChannelId ? { to: legacyChannelId } : null;
		}
	});
}
function createDiscordApproverDmTargetResolver(configOverride) {
	return createChannelApproverDmTargetResolver({
		shouldHandleRequest: ({ cfg, accountId, request }) => shouldHandleDiscordApprovalRequest({
			cfg,
			accountId,
			request,
			configOverride
		}),
		resolveApprovers: ({ cfg, accountId }) => getDiscordExecApprovalApprovers({
			cfg,
			accountId,
			configOverride
		}),
		mapApprover: (approver) => ({ to: String(approver) })
	});
}
function createDiscordApprovalCapability(configOverride) {
	return createApproverRestrictedNativeApprovalCapability({
		channel: "discord",
		channelLabel: "Discord",
		describeExecApprovalSetup: ({ accountId }) => {
			const prefix = accountId && accountId !== "default" ? `channels.discord.accounts.${accountId}` : "channels.discord";
			return `Approve it from the Web UI or terminal UI for now. Discord supports native exec approvals for this account. Configure \`${prefix}.execApprovals.approvers\` or \`commands.ownerAllowFrom\`; leave \`${prefix}.execApprovals.enabled\` unset/\`auto\` or set it to \`true\`.`;
		},
		listAccountIds: listDiscordAccountIds,
		hasApprovers: ({ cfg, accountId }) => getDiscordExecApprovalApprovers({
			cfg,
			accountId,
			configOverride
		}).length > 0,
		isExecAuthorizedSender: ({ cfg, accountId, senderId }) => isDiscordExecApprovalApprover({
			cfg,
			accountId,
			senderId,
			configOverride
		}),
		isNativeDeliveryEnabled: ({ cfg, accountId }) => isDiscordExecApprovalClientEnabled({
			cfg,
			accountId,
			configOverride
		}),
		resolveNativeDeliveryMode: ({ cfg, accountId }) => configOverride?.target ?? resolveDiscordAccount({
			cfg,
			accountId
		}).config.execApprovals?.target ?? "dm",
		resolveOriginTarget: createDiscordOriginTargetResolver(configOverride),
		resolveApproverDmTargets: createDiscordApproverDmTargetResolver(configOverride),
		notifyOriginWhenDmOnly: true
	});
}
let cachedDiscordApprovalCapability;
function getDiscordApprovalCapability() {
	cachedDiscordApprovalCapability ??= createDiscordApprovalCapability();
	return cachedDiscordApprovalCapability;
}
//#endregion
//#region extensions/discord/src/ui.ts
const DEFAULT_DISCORD_ACCENT_COLOR = "#5865F2";
function normalizeDiscordAccentColor(raw) {
	const trimmed = (raw ?? "").trim();
	if (!trimmed) return null;
	const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
	if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return null;
	return normalized.toUpperCase();
}
function resolveDiscordAccentColor(params) {
	return normalizeDiscordAccentColor(inspectDiscordAccount({
		cfg: params.cfg,
		accountId: params.accountId
	}).config.ui?.components?.accentColor) ?? DEFAULT_DISCORD_ACCENT_COLOR;
}
var DiscordUiContainer = class extends Container {
	constructor(params) {
		const accentColor = normalizeDiscordAccentColor(params.accentColor) ?? resolveDiscordAccentColor({
			cfg: params.cfg,
			accountId: params.accountId
		});
		super(params.components, {
			accentColor,
			spoiler: params.spoiler
		});
	}
};
//#endregion
export { getDiscordExecApprovalApprovers as a, shouldSuppressLocalDiscordExecApprovalPrompt as c, shouldHandleDiscordApprovalRequest as i, createDiscordApprovalCapability as n, isDiscordExecApprovalApprover as o, getDiscordApprovalCapability as r, isDiscordExecApprovalClientEnabled as s, DiscordUiContainer as t };
