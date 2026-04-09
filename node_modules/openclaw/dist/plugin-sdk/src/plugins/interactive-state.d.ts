import type { PluginInteractiveHandlerRegistration } from "./types.js";
export type RegisteredInteractiveHandler = PluginInteractiveHandlerRegistration & {
    pluginId: string;
    pluginName?: string;
    pluginRoot?: string;
};
export declare function getPluginInteractiveHandlersState(): Map<string, RegisteredInteractiveHandler>;
export declare function getPluginInteractiveCallbackDedupeState(): import("../infra/dedupe.js").DedupeCache;
export declare function clearPluginInteractiveHandlersState(): void;
