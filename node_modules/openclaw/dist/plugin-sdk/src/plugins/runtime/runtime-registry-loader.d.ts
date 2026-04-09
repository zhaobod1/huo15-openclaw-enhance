import type { OpenClawConfig } from "../../config/config.js";
export type PluginRegistryScope = "configured-channels" | "channels" | "all";
export declare function ensurePluginRegistryLoaded(options?: {
    scope?: PluginRegistryScope;
    config?: OpenClawConfig;
    activationSourceConfig?: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
    onlyPluginIds?: string[];
}): void;
export declare const __testing: {
    resetPluginRegistryLoadedForTests(): void;
};
