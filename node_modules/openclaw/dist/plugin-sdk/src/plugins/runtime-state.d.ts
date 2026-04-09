import type { PluginRegistry } from "./registry.js";
export declare const PLUGIN_REGISTRY_STATE: unique symbol;
export type RegistrySurfaceState = {
    registry: PluginRegistry | null;
    pinned: boolean;
    version: number;
};
export type RegistryState = {
    activeRegistry: PluginRegistry | null;
    activeVersion: number;
    httpRoute: RegistrySurfaceState;
    channel: RegistrySurfaceState;
    key: string | null;
    workspaceDir: string | null;
    runtimeSubagentMode: "default" | "explicit" | "gateway-bindable";
    importedPluginIds: Set<string>;
};
export declare function getPluginRegistryState(): RegistryState | undefined;
export declare function getActivePluginChannelRegistryFromState(): PluginRegistry | null;
export declare function getActivePluginRegistryWorkspaceDirFromState(): string | undefined;
