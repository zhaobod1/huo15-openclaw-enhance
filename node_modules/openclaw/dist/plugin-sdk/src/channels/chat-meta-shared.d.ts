import { type ChatChannelId } from "./ids.js";
import type { ChannelMeta } from "./plugins/types.js";
export type ChatChannelMeta = ChannelMeta;
export declare function buildChatChannelMetaById(): Record<ChatChannelId, ChatChannelMeta>;
