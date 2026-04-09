import type { PluginInteractiveHandlerRegistration } from "./types.js";
type RegisteredInteractiveHandler = PluginInteractiveHandlerRegistration & {
    pluginId: string;
    pluginName?: string;
    pluginRoot?: string;
};
type InteractiveRegistrationResult = {
    ok: boolean;
    error?: string;
};
type InteractiveDispatchResult = {
    matched: false;
    handled: false;
    duplicate: false;
} | {
    matched: true;
    handled: boolean;
    duplicate: boolean;
};
type PluginInteractiveDispatchRegistration = {
    channel: string;
    namespace: string;
};
export type PluginInteractiveMatch<TRegistration extends PluginInteractiveDispatchRegistration> = {
    registration: RegisteredInteractiveHandler & TRegistration;
    namespace: string;
    payload: string;
};
export declare function registerPluginInteractiveHandler(pluginId: string, registration: PluginInteractiveHandlerRegistration, opts?: {
    pluginName?: string;
    pluginRoot?: string;
}): InteractiveRegistrationResult;
export declare function clearPluginInteractiveHandlers(): void;
export declare function clearPluginInteractiveHandlersForPlugin(pluginId: string): void;
export declare function dispatchPluginInteractiveHandler<TRegistration extends PluginInteractiveDispatchRegistration>(params: {
    channel: TRegistration["channel"];
    data: string;
    dedupeId?: string;
    onMatched?: () => Promise<void> | void;
    invoke: (match: PluginInteractiveMatch<TRegistration>) => Promise<{
        handled?: boolean;
    } | void> | {
        handled?: boolean;
    } | void;
}): Promise<InteractiveDispatchResult>;
export {};
