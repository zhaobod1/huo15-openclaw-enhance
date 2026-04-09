import type { OpenClawConfig } from "../../config/config.js";
import type { DeliverableMessageChannel } from "../../utils/message-channel.js";
export declare function resetOutboundChannelBootstrapStateForTests(): void;
export declare function bootstrapOutboundChannelPlugin(params: {
    channel: DeliverableMessageChannel;
    cfg?: OpenClawConfig;
}): void;
