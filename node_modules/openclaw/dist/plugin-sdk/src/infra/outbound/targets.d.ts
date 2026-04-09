import type { ChannelOutboundTargetMode } from "../../channels/plugins/types.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions.js";
import type { AgentDefaultsConfig } from "../../config/types.agent-defaults.js";
import { type DeliveryContext } from "../../utils/delivery-context.js";
import type { DeliverableMessageChannel, GatewayMessageChannel } from "../../utils/message-channel.js";
export type OutboundChannel = DeliverableMessageChannel;
export type HeartbeatTarget = OutboundChannel;
export type OutboundTarget = {
    channel: OutboundChannel;
    to?: string;
    reason?: string;
    accountId?: string;
    threadId?: string | number;
    lastChannel?: DeliverableMessageChannel;
    lastAccountId?: string;
};
export type HeartbeatSenderContext = {
    sender: string;
    provider?: DeliverableMessageChannel;
    allowFrom: string[];
};
export type OutboundTargetResolution = {
    ok: true;
    to: string;
} | {
    ok: false;
    error: Error;
};
export { resolveSessionDeliveryTarget, type SessionDeliveryTarget } from "./targets-session.js";
export declare function resolveOutboundTarget(params: {
    channel: GatewayMessageChannel;
    to?: string;
    allowFrom?: string[];
    cfg?: OpenClawConfig;
    accountId?: string | null;
    mode?: ChannelOutboundTargetMode;
}): OutboundTargetResolution;
export declare function resolveHeartbeatDeliveryTarget(params: {
    cfg: OpenClawConfig;
    entry?: SessionEntry;
    heartbeat?: AgentDefaultsConfig["heartbeat"];
    turnSource?: DeliveryContext;
}): OutboundTarget;
export declare function resolveHeartbeatSenderContext(params: {
    cfg: OpenClawConfig;
    entry?: SessionEntry;
    delivery: OutboundTarget;
}): HeartbeatSenderContext;
