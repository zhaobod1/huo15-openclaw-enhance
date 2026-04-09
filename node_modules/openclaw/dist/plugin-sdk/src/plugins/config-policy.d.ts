import type { OpenClawConfig } from "../config/config.js";
import type { PluginKind, PluginOrigin } from "./types.js";
export type PluginActivationSource = "disabled" | "explicit" | "auto" | "default";
export type PluginActivationState = {
    enabled: boolean;
    activated: boolean;
    explicitlyEnabled: boolean;
    source: PluginActivationSource;
    reason?: string;
};
export type NormalizedPluginsConfig = {
    enabled: boolean;
    allow: string[];
    deny: string[];
    loadPaths: string[];
    slots: {
        memory?: string | null;
    };
    entries: Record<string, {
        enabled?: boolean;
        hooks?: {
            allowPromptInjection?: boolean;
        };
        subagent?: {
            allowModelOverride?: boolean;
            allowedModels?: string[];
            hasAllowedModelsConfig?: boolean;
        };
        config?: unknown;
    }>;
};
type NormalizePluginId = (id: string) => string;
export declare function normalizePluginsConfigWithResolver(config?: OpenClawConfig["plugins"], normalizePluginId?: NormalizePluginId): NormalizedPluginsConfig;
export declare function resolvePluginActivationState(params: {
    id: string;
    origin: PluginOrigin;
    config: NormalizedPluginsConfig;
    rootConfig?: OpenClawConfig;
    enabledByDefault?: boolean;
    sourceConfig?: NormalizedPluginsConfig;
    sourceRootConfig?: OpenClawConfig;
    autoEnabledReason?: string;
}): PluginActivationState;
export declare function hasExplicitPluginConfig(plugins?: OpenClawConfig["plugins"]): boolean;
export declare function resolveEnableState(id: string, origin: PluginOrigin, config: NormalizedPluginsConfig, enabledByDefault?: boolean): {
    enabled: boolean;
    reason?: string;
};
export declare function isBundledChannelEnabledByChannelConfig(cfg: OpenClawConfig | undefined, pluginId: string): boolean;
export declare function resolveEffectiveEnableState(params: {
    id: string;
    origin: PluginOrigin;
    config: NormalizedPluginsConfig;
    rootConfig?: OpenClawConfig;
    enabledByDefault?: boolean;
    sourceConfig?: NormalizedPluginsConfig;
    sourceRootConfig?: OpenClawConfig;
    autoEnabledReason?: string;
}): {
    enabled: boolean;
    reason?: string;
};
export declare function resolveEffectivePluginActivationState(params: {
    id: string;
    origin: PluginOrigin;
    config: NormalizedPluginsConfig;
    rootConfig?: OpenClawConfig;
    enabledByDefault?: boolean;
    sourceConfig?: NormalizedPluginsConfig;
    sourceRootConfig?: OpenClawConfig;
    autoEnabledReason?: string;
}): PluginActivationState;
export declare function resolveMemorySlotDecision(params: {
    id: string;
    kind?: PluginKind | PluginKind[];
    slot: string | null | undefined;
    selectedId: string | null;
}): {
    enabled: boolean;
    reason?: string;
    selected?: boolean;
};
export {};
