import type { ChannelId, ChannelPlugin } from "./types.js";
export declare function listBootstrapChannelPluginIds(): readonly string[];
export declare function iterateBootstrapChannelPlugins(): IterableIterator<ChannelPlugin>;
export declare function listBootstrapChannelPlugins(): readonly ChannelPlugin[];
export declare function getBootstrapChannelPlugin(id: ChannelId): ChannelPlugin | undefined;
export declare function clearBootstrapChannelPluginCache(): void;
