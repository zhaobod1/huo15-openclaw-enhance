import type { OpenClawConfig } from "../config/config.js";
import type { GatewayMessageChannel } from "../utils/message-channel.js";
export type OpenClawPluginToolOptions = {
    agentSessionKey?: string;
    agentChannel?: GatewayMessageChannel;
    agentAccountId?: string;
    agentTo?: string;
    agentThreadId?: string | number;
    agentDir?: string;
    workspaceDir?: string;
    config?: OpenClawConfig;
    requesterSenderId?: string | null;
    senderIsOwner?: boolean;
    sessionId?: string;
    sandboxBrowserBridgeUrl?: string;
    allowHostBrowserControl?: boolean;
    sandboxed?: boolean;
    allowGatewaySubagentBinding?: boolean;
};
export declare function resolveOpenClawPluginToolInputs(params: {
    options?: OpenClawPluginToolOptions;
    resolvedConfig?: OpenClawConfig;
    runtimeConfig?: OpenClawConfig;
}): {
    context: {
        config: OpenClawConfig | undefined;
        runtimeConfig: OpenClawConfig | undefined;
        workspaceDir: string;
        agentDir: string | undefined;
        agentId: string;
        sessionKey: string | undefined;
        sessionId: string | undefined;
        browser: {
            sandboxBridgeUrl: string | undefined;
            allowHostControl: boolean | undefined;
        };
        messageChannel: import("../plugin-sdk/channel-targets.ts").ChannelId | undefined;
        agentAccountId: string | undefined;
        deliveryContext: import("../utils/delivery-context.js").DeliveryContext | undefined;
        requesterSenderId: string | undefined;
        senderIsOwner: boolean | undefined;
        sandboxed: boolean | undefined;
    };
    allowGatewaySubagentBinding: boolean | undefined;
};
