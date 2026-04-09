import type { PluginManifestRegistry } from "../plugins/manifest-registry.js";
import type { OpenClawConfig } from "./config.js";
import { type PluginAutoEnableCandidate, type PluginAutoEnableResult } from "./plugin-auto-enable.shared.js";
export declare function materializePluginAutoEnableCandidates(params: {
    config?: OpenClawConfig;
    candidates: readonly PluginAutoEnableCandidate[];
    env?: NodeJS.ProcessEnv;
    manifestRegistry?: PluginManifestRegistry;
}): PluginAutoEnableResult;
export declare function applyPluginAutoEnable(params: {
    config?: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
    manifestRegistry?: PluginManifestRegistry;
}): PluginAutoEnableResult;
