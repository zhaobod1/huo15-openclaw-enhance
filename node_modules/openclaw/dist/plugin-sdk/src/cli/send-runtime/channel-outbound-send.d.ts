import type { ChannelId } from "../../channels/plugins/types.js";
import { loadConfig } from "../../config/config.js";
type RuntimeSendOpts = {
    cfg?: ReturnType<typeof loadConfig>;
    mediaUrl?: string;
    mediaLocalRoots?: readonly string[];
    accountId?: string;
    messageThreadId?: string | number;
    replyToMessageId?: string | number;
    silent?: boolean;
    forceDocument?: boolean;
    gifPlayback?: boolean;
    gatewayClientScopes?: readonly string[];
};
export declare function createChannelOutboundRuntimeSend(params: {
    channelId: ChannelId;
    unavailableMessage: string;
}): {
    sendMessage: (to: string, text: string, opts?: RuntimeSendOpts) => Promise<import("../../plugin-sdk/twitch.ts").OutboundDeliveryResult>;
};
export {};
