declare const matrixBaseNativeApprovalAdapter: import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalNativeAdapter | undefined;
declare const matrixBaseDeliveryAdapter: import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalDeliveryAdapter | undefined;
type MatrixForwardingSuppressionParams = Parameters<NonNullable<NonNullable<typeof matrixBaseDeliveryAdapter>["shouldSuppressForwardingFallback"]>>[0];
export declare const matrixApprovalCapability: import("openclaw/plugin-sdk/channel-contract").ChannelApprovalCapability;
export declare const matrixNativeApprovalAdapter: {
    auth: {
        authorizeActorAction: ((params: {
            cfg: import("openclaw/plugin-sdk").OpenClawConfig;
            accountId?: string | null;
            senderId?: string | null;
            action: "approve";
            approvalKind: "exec" | "plugin";
        }) => {
            authorized: boolean;
            reason?: string;
        }) | undefined;
        getActionAvailabilityState: ((params: {
            cfg: import("openclaw/plugin-sdk").OpenClawConfig;
            accountId?: string | null;
            action: "approve";
        }) => import("openclaw/plugin-sdk/channel-runtime").ChannelActionAvailabilityState) | undefined;
    };
    delivery: {
        shouldSuppressForwardingFallback: (params: MatrixForwardingSuppressionParams) => boolean;
        hasConfiguredDmRoute?: (params: {
            cfg: import("openclaw/plugin-sdk").OpenClawConfig;
        }) => boolean;
    } | undefined;
    render: import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalRenderAdapter | undefined;
    native: {
        describeDeliveryCapabilities: (params: Parameters<typeof matrixBaseNativeApprovalAdapter.describeDeliveryCapabilities>[0]) => import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalNativeDeliveryCapabilities;
        resolveOriginTarget: (params: Parameters<NonNullable<typeof matrixBaseNativeApprovalAdapter.resolveOriginTarget>>[0]) => Promise<import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalNativeTarget | null>;
        resolveApproverDmTargets: (params: Parameters<NonNullable<typeof matrixBaseNativeApprovalAdapter.resolveApproverDmTargets>>[0]) => Promise<import("../../../src/channels/plugins/types.adapters.ts").ChannelApprovalNativeTarget[]>;
    } | undefined;
};
export {};
