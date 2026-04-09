import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { OpenClawConfig } from "../../config/config.js";
export type PdfModelConfig = {
    primary?: string;
    fallbacks?: string[];
};
/**
 * Check whether a provider supports native PDF document input.
 */
export declare function providerSupportsNativePdf(provider: string): boolean;
/**
 * Parse a page range string (e.g. "1-5", "3", "1-3,7-9") into an array of 1-based page numbers.
 */
export declare function parsePageRange(range: string, maxPages: number): number[];
export declare function coercePdfAssistantText(params: {
    message: AssistantMessage;
    provider: string;
    model: string;
}): string;
export declare function coercePdfModelConfig(cfg?: OpenClawConfig): PdfModelConfig;
export declare function resolvePdfToolMaxTokens(modelMaxTokens: number | undefined, requestedMaxTokens?: number): number;
