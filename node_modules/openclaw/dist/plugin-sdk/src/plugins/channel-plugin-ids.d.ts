import type { OpenClawConfig } from "../config/config.js";
export declare function resolveChannelPluginIds(params: {
    config: OpenClawConfig;
    workspaceDir?: string;
    env: NodeJS.ProcessEnv;
}): string[];
export declare function resolveConfiguredChannelPluginIds(params: {
    config: OpenClawConfig;
    workspaceDir?: string;
    env: NodeJS.ProcessEnv;
}): string[];
export declare function resolveConfiguredDeferredChannelPluginIds(params: {
    config: OpenClawConfig;
    workspaceDir?: string;
    env: NodeJS.ProcessEnv;
}): string[];
export declare function resolveGatewayStartupPluginIds(params: {
    config: OpenClawConfig;
    activationSourceConfig?: OpenClawConfig;
    workspaceDir?: string;
    env: NodeJS.ProcessEnv;
}): string[];
