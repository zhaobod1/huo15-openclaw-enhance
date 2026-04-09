import type { OpenClawPluginApi } from "../runtime-api.js";
type FeishuSubagentContext = {
    requesterSessionKey?: string;
};
type FeishuSubagentSpawningEvent = {
    threadRequested?: boolean;
    requester?: {
        channel?: string;
        accountId?: string;
        to?: string;
        threadId?: string | number;
    };
    childSessionKey: string;
    agentId?: string;
    label?: string;
};
type FeishuSubagentDeliveryTargetEvent = {
    expectsCompletionMessage?: boolean;
    requesterOrigin?: {
        channel?: string;
        accountId?: string;
        to?: string;
        threadId?: string | number;
    };
    childSessionKey: string;
    requesterSessionKey?: string;
};
type FeishuSubagentEndedEvent = {
    accountId?: string;
    targetSessionKey: string;
};
export declare function handleFeishuSubagentSpawning(event: FeishuSubagentSpawningEvent, ctx: FeishuSubagentContext): Promise<{
    status: "error";
    error: string;
    threadBindingReady?: undefined;
} | {
    status: "ok";
    threadBindingReady: boolean;
    error?: undefined;
} | undefined>;
export declare function handleFeishuSubagentDeliveryTarget(event: FeishuSubagentDeliveryTargetEvent): {
    origin: {
        channel: "feishu";
        accountId: string;
        to: string;
        threadId?: string;
    };
} | undefined;
export declare function handleFeishuSubagentEnded(event: FeishuSubagentEndedEvent): void;
export declare function registerFeishuSubagentHooks(api: OpenClawPluginApi): void;
export {};
