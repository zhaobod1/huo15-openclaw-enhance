import type { EmbeddedRunAttemptResult } from "./types.js";
type ReplayMetadataAttempt = Pick<EmbeddedRunAttemptResult, "toolMetas" | "didSendViaMessagingTool" | "successfulCronAdds">;
type IncompleteTurnAttempt = Pick<EmbeddedRunAttemptResult, "clientToolCall" | "yieldDetected" | "didSendDeterministicApprovalPrompt" | "lastToolError" | "lastAssistant" | "replayMetadata">;
type PlanningOnlyAttempt = Pick<EmbeddedRunAttemptResult, "assistantTexts" | "clientToolCall" | "yieldDetected" | "didSendDeterministicApprovalPrompt" | "didSendViaMessagingTool" | "lastToolError" | "lastAssistant" | "itemLifecycle" | "replayMetadata" | "toolMetas">;
export declare const PLANNING_ONLY_RETRY_INSTRUCTION = "The previous assistant turn only described the plan. Do not restate the plan. Act now: take the first concrete tool action you can. If a real blocker prevents action, reply with the exact blocker in one sentence.";
export declare const ACK_EXECUTION_FAST_PATH_INSTRUCTION = "The latest user message is a short approval to proceed. Do not recap or restate the plan. Start with the first concrete tool action immediately. Keep any user-facing follow-up brief and natural.";
export type PlanningOnlyPlanDetails = {
    explanation: string;
    steps: string[];
};
export declare function buildAttemptReplayMetadata(params: ReplayMetadataAttempt): EmbeddedRunAttemptResult["replayMetadata"];
export declare function resolveIncompleteTurnPayloadText(params: {
    payloadCount: number;
    aborted: boolean;
    timedOut: boolean;
    attempt: IncompleteTurnAttempt;
}): string | null;
export declare function isLikelyExecutionAckPrompt(text: string): boolean;
export declare function resolveAckExecutionFastPathInstruction(params: {
    provider?: string;
    modelId?: string;
    prompt: string;
}): string | null;
export declare function extractPlanningOnlyPlanDetails(text: string): PlanningOnlyPlanDetails | null;
export declare function resolvePlanningOnlyRetryInstruction(params: {
    provider?: string;
    modelId?: string;
    aborted: boolean;
    timedOut: boolean;
    attempt: PlanningOnlyAttempt;
}): string | null;
export {};
