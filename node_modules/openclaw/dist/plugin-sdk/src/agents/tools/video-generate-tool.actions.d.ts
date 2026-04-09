import type { OpenClawConfig } from "../../config/config.js";
type VideoGenerateActionResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: Record<string, unknown>;
};
export declare function createVideoGenerateListActionResult(config?: OpenClawConfig): VideoGenerateActionResult;
export declare function createVideoGenerateStatusActionResult(sessionKey?: string): VideoGenerateActionResult;
export declare function createVideoGenerateDuplicateGuardResult(sessionKey?: string): VideoGenerateActionResult | null;
export {};
