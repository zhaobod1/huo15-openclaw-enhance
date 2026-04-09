import type { OpenClawConfig } from "../../config/config.js";
type MusicGenerateActionResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: Record<string, unknown>;
};
export declare function createMusicGenerateListActionResult(config?: OpenClawConfig): MusicGenerateActionResult;
export declare function createMusicGenerateStatusActionResult(sessionKey?: string): MusicGenerateActionResult;
export declare function createMusicGenerateDuplicateGuardResult(sessionKey?: string): MusicGenerateActionResult | null;
export {};
