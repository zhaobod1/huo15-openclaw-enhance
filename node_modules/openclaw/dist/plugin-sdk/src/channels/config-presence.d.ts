import type { OpenClawConfig } from "../config/config.js";
type ChannelPresenceOptions = {
    includePersistedAuthState?: boolean;
};
export declare function hasMeaningfulChannelConfig(value: unknown): boolean;
export declare function listPotentialConfiguredChannelIds(cfg: OpenClawConfig, env?: NodeJS.ProcessEnv, options?: ChannelPresenceOptions): string[];
export declare function hasPotentialConfiguredChannels(cfg: OpenClawConfig | null | undefined, env?: NodeJS.ProcessEnv, options?: ChannelPresenceOptions): boolean;
export {};
