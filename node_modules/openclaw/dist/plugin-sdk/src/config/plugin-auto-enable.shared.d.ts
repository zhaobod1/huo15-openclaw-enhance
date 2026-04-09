import { type PluginManifestRegistry } from "../plugins/manifest-registry.js";
import type { OpenClawConfig } from "./config.js";
export type PluginAutoEnableCandidate = {
    pluginId: string;
    kind: "channel-configured";
    channelId: string;
} | {
    pluginId: string;
    kind: "provider-auth-configured";
    providerId: string;
} | {
    pluginId: string;
    kind: "provider-model-configured";
    modelRef: string;
} | {
    pluginId: string;
    kind: "web-fetch-provider-selected";
    providerId: string;
} | {
    pluginId: string;
    kind: "plugin-web-search-configured";
} | {
    pluginId: string;
    kind: "plugin-web-fetch-configured";
} | {
    pluginId: string;
    kind: "plugin-tool-configured";
} | {
    pluginId: string;
    kind: "setup-auto-enable";
    reason: string;
};
export type PluginAutoEnableResult = {
    config: OpenClawConfig;
    changes: string[];
    autoEnabledReasons: Record<string, string[]>;
};
export declare function configMayNeedPluginAutoEnable(cfg: OpenClawConfig, env: NodeJS.ProcessEnv): boolean;
export declare function resolvePluginAutoEnableCandidateReason(candidate: PluginAutoEnableCandidate): string;
export declare function resolveConfiguredPluginAutoEnableCandidates(params: {
    config: OpenClawConfig;
    env: NodeJS.ProcessEnv;
    registry: PluginManifestRegistry;
}): PluginAutoEnableCandidate[];
export declare function resolvePluginAutoEnableManifestRegistry(params: {
    config: OpenClawConfig;
    env: NodeJS.ProcessEnv;
    manifestRegistry?: PluginManifestRegistry;
}): PluginManifestRegistry;
export declare function materializePluginAutoEnableCandidatesInternal(params: {
    config?: OpenClawConfig;
    candidates: readonly PluginAutoEnableCandidate[];
    env: NodeJS.ProcessEnv;
    manifestRegistry: PluginManifestRegistry;
}): PluginAutoEnableResult;
