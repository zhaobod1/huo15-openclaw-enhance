import { d as normalizeMessageChannel } from "./message-channel-DnQkETjb.js";
import "./routing-DdBDhOmH.js";
//#region src/plugin-sdk/approval-delivery-helpers.ts
function buildApproverRestrictedNativeApprovalCapability(params) {
	const pluginSenderAuth = params.isPluginAuthorizedSender ?? params.isExecAuthorizedSender;
	const normalizePreferredSurface = (mode) => mode === "channel" ? "origin" : mode === "dm" ? "approver-dm" : "both";
	return createChannelApprovalCapability({
		authorizeActorAction: ({ cfg, accountId, senderId, approvalKind }) => {
			return (approvalKind === "plugin" ? pluginSenderAuth({
				cfg,
				accountId,
				senderId
			}) : params.isExecAuthorizedSender({
				cfg,
				accountId,
				senderId
			})) ? { authorized: true } : {
				authorized: false,
				reason: `❌ You are not authorized to approve ${approvalKind} requests on ${params.channelLabel}.`
			};
		},
		getActionAvailabilityState: ({ cfg, accountId }) => params.hasApprovers({
			cfg,
			accountId
		}) ? { kind: "enabled" } : { kind: "disabled" },
		describeExecApprovalSetup: params.describeExecApprovalSetup,
		approvals: {
			delivery: {
				hasConfiguredDmRoute: ({ cfg }) => params.listAccountIds(cfg).some((accountId) => {
					if (!params.hasApprovers({
						cfg,
						accountId
					})) return false;
					if (!params.isNativeDeliveryEnabled({
						cfg,
						accountId
					})) return false;
					const target = params.resolveNativeDeliveryMode({
						cfg,
						accountId
					});
					return target === "dm" || target === "both";
				}),
				shouldSuppressForwardingFallback: (input) => {
					if ((normalizeMessageChannel(input.target.channel) ?? input.target.channel) !== params.channel) return false;
					if (params.requireMatchingTurnSourceChannel) {
						if (normalizeMessageChannel(input.request.request.turnSourceChannel) !== params.channel) return false;
					}
					const resolvedAccountId = params.resolveSuppressionAccountId?.(input);
					const accountId = (resolvedAccountId === void 0 ? input.target.accountId?.trim() : resolvedAccountId.trim()) || void 0;
					return params.isNativeDeliveryEnabled({
						cfg: input.cfg,
						accountId
					});
				}
			},
			native: params.resolveOriginTarget || params.resolveApproverDmTargets ? {
				describeDeliveryCapabilities: ({ cfg, accountId }) => ({
					enabled: params.hasApprovers({
						cfg,
						accountId
					}) && params.isNativeDeliveryEnabled({
						cfg,
						accountId
					}),
					preferredSurface: normalizePreferredSurface(params.resolveNativeDeliveryMode({
						cfg,
						accountId
					})),
					supportsOriginSurface: Boolean(params.resolveOriginTarget),
					supportsApproverDmSurface: Boolean(params.resolveApproverDmTargets),
					notifyOriginWhenDmOnly: params.notifyOriginWhenDmOnly ?? false
				}),
				resolveOriginTarget: params.resolveOriginTarget,
				resolveApproverDmTargets: params.resolveApproverDmTargets
			} : void 0
		}
	});
}
function createApproverRestrictedNativeApprovalAdapter(params) {
	return splitChannelApprovalCapability(buildApproverRestrictedNativeApprovalCapability(params));
}
function createChannelApprovalCapability(params) {
	return {
		authorizeActorAction: params.authorizeActorAction,
		getActionAvailabilityState: params.getActionAvailabilityState,
		resolveApproveCommandBehavior: params.resolveApproveCommandBehavior,
		describeExecApprovalSetup: params.describeExecApprovalSetup,
		delivery: params.approvals?.delivery,
		render: params.approvals?.render,
		native: params.approvals?.native
	};
}
function splitChannelApprovalCapability(capability) {
	return {
		auth: {
			authorizeActorAction: capability.authorizeActorAction,
			getActionAvailabilityState: capability.getActionAvailabilityState,
			resolveApproveCommandBehavior: capability.resolveApproveCommandBehavior
		},
		delivery: capability.delivery,
		render: capability.render,
		native: capability.native,
		describeExecApprovalSetup: capability.describeExecApprovalSetup
	};
}
function createApproverRestrictedNativeApprovalCapability(params) {
	return buildApproverRestrictedNativeApprovalCapability(params);
}
//#endregion
export { splitChannelApprovalCapability as i, createApproverRestrictedNativeApprovalCapability as n, createChannelApprovalCapability as r, createApproverRestrictedNativeApprovalAdapter as t };
