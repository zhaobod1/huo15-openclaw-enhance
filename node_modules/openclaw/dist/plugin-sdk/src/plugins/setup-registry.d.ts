import type { OpenClawConfig } from "../config/config.js";
import type { PluginConfigMigration, PluginSetupAutoEnableProbe, ProviderPlugin } from "./types.js";
type SetupProviderEntry = {
    pluginId: string;
    provider: ProviderPlugin;
};
type SetupConfigMigrationEntry = {
    pluginId: string;
    migrate: PluginConfigMigration;
};
type SetupAutoEnableProbeEntry = {
    pluginId: string;
    probe: PluginSetupAutoEnableProbe;
};
type PluginSetupRegistry = {
    providers: SetupProviderEntry[];
    configMigrations: SetupConfigMigrationEntry[];
    autoEnableProbes: SetupAutoEnableProbeEntry[];
};
type SetupAutoEnableReason = {
    pluginId: string;
    reason: string;
};
export declare function clearPluginSetupRegistryCache(): void;
export declare function resolvePluginSetupRegistry(params?: {
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
}): PluginSetupRegistry;
export declare function resolvePluginSetupProvider(params: {
    provider: string;
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
}): ProviderPlugin | undefined;
export declare function runPluginSetupConfigMigrations(params: {
    config: OpenClawConfig;
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
}): {
    config: OpenClawConfig;
    changes: string[];
};
export declare function resolvePluginSetupAutoEnableReasons(params: {
    config: OpenClawConfig;
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
}): SetupAutoEnableReason[];
export {};
