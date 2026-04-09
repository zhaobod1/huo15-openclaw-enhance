import type { OpenClawConfig } from "../../config/config.js";
import type { DeliveryContext } from "../../utils/delivery-context.js";
import { type AgentInternalEvent } from "../internal-events.js";
export type MediaGenerationTaskHandle = {
    taskId: string;
    runId: string;
    requesterSessionKey: string;
    requesterOrigin?: DeliveryContext;
    taskLabel: string;
};
export declare function createMediaGenerationTaskRun(params: {
    sessionKey?: string;
    requesterOrigin?: DeliveryContext;
    prompt: string;
    providerId?: string;
    toolName: string;
    taskKind: string;
    label: string;
    queuedProgressSummary: string;
}): MediaGenerationTaskHandle | null;
export declare function recordMediaGenerationTaskProgress(params: {
    handle: MediaGenerationTaskHandle | null;
    progressSummary: string;
    eventSummary?: string;
}): void;
export declare function completeMediaGenerationTaskRun(params: {
    handle: MediaGenerationTaskHandle | null;
    provider: string;
    model: string;
    count: number;
    paths: string[];
    generatedLabel: string;
}): void;
export declare function failMediaGenerationTaskRun(params: {
    handle: MediaGenerationTaskHandle | null;
    error: unknown;
    progressSummary: string;
}): void;
export declare function wakeMediaGenerationTaskCompletion(params: {
    config?: OpenClawConfig;
    handle: MediaGenerationTaskHandle | null;
    status: "ok" | "error";
    statusLabel: string;
    result: string;
    mediaUrls?: string[];
    statsLine?: string;
    eventSource: AgentInternalEvent["source"];
    announceType: string;
    toolName: string;
    completionLabel: string;
}): Promise<void>;
