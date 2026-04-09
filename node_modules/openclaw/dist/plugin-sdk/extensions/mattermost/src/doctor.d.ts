import type { ChannelDoctorAdapter, ChannelDoctorConfigMutation, ChannelDoctorLegacyConfigRule } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
export declare const collectMattermostMutableAllowlistWarnings: ({ cfg }: {
    cfg: OpenClawConfig;
}) => string[];
export declare const MATTERMOST_LEGACY_CONFIG_RULES: ChannelDoctorLegacyConfigRule[];
export declare function normalizeMattermostCompatibilityConfig(cfg: OpenClawConfig): ChannelDoctorConfigMutation;
export declare const mattermostDoctor: ChannelDoctorAdapter;
