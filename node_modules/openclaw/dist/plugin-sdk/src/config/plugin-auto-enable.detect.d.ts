import type { PluginManifestRegistry } from "../plugins/manifest-registry.js";
import type { OpenClawConfig } from "./config.js";
import { type PluginAutoEnableCandidate } from "./plugin-auto-enable.shared.js";
export declare function detectPluginAutoEnableCandidates(params: {
    config?: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
    manifestRegistry?: PluginManifestRegistry;
}): PluginAutoEnableCandidate[];
