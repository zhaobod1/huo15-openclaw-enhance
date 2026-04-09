import type { PluginManifestRegistry } from "../plugins/manifest-registry.js";
import type { OpenClawConfig } from "./config.js";
import type { PluginAutoEnableCandidate } from "./plugin-auto-enable.shared.js";
export declare function shouldSkipPreferredPluginAutoEnable(params: {
    config: OpenClawConfig;
    entry: PluginAutoEnableCandidate;
    configured: readonly PluginAutoEnableCandidate[];
    env: NodeJS.ProcessEnv;
    registry: PluginManifestRegistry;
    isPluginDenied: (config: OpenClawConfig, pluginId: string) => boolean;
    isPluginExplicitlyDisabled: (config: OpenClawConfig, pluginId: string) => boolean;
}): boolean;
