import type { StreamFn } from "@mariozechner/pi-agent-core";
import { type Api, type Context, type Model } from "@mariozechner/pi-ai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions.js";
import type { FunctionTool, ResponseCreateParamsStreaming, ResponseInput } from "openai/resources/responses/responses.js";
type BaseStreamOptions = {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    apiKey?: string;
    cacheRetention?: "none" | "short" | "long";
    sessionId?: string;
    onPayload?: (payload: unknown, model: Model<Api>) => unknown;
    headers?: Record<string, string>;
};
type OpenAIResponsesOptions = BaseStreamOptions & {
    reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
    reasoningSummary?: "auto" | "detailed" | "concise" | null;
    serviceTier?: ResponseCreateParamsStreaming["service_tier"];
};
type OpenAICompletionsOptions = BaseStreamOptions & {
    toolChoice?: "auto" | "none" | "required" | {
        type: "function";
        function: {
            name: string;
        };
    };
    reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
};
type OpenAIModeModel = Model<Api> & {
    compat?: Record<string, unknown>;
};
export { sanitizeTransportPayloadText } from "./transport-stream-shared.js";
export declare function resolveAzureOpenAIApiVersion(env?: NodeJS.ProcessEnv): string;
export declare function createOpenAIResponsesTransportStreamFn(): StreamFn;
export declare function buildOpenAIResponsesParams(model: Model<Api>, context: Context, options: OpenAIResponsesOptions | undefined, metadata?: Record<string, string>): OpenAIResponsesRequestParams;
export declare function createAzureOpenAIResponsesTransportStreamFn(): StreamFn;
export declare function createOpenAICompletionsTransportStreamFn(): StreamFn;
type OpenAIResponsesRequestParams = {
    model: string;
    input: ResponseInput;
    stream: true;
    prompt_cache_key?: string;
    prompt_cache_retention?: "24h";
    metadata?: Record<string, string>;
    store?: boolean;
    max_output_tokens?: number;
    temperature?: number;
    service_tier?: ResponseCreateParamsStreaming["service_tier"];
    tools?: FunctionTool[];
    reasoning?: {
        effort: "none";
    } | {
        effort: NonNullable<OpenAIResponsesOptions["reasoningEffort"]>;
        summary: NonNullable<OpenAIResponsesOptions["reasoningSummary"]>;
    };
    include?: string[];
};
export declare function buildOpenAICompletionsParams(model: OpenAIModeModel, context: Context, options: OpenAICompletionsOptions | undefined): Record<string, unknown>;
export declare function parseTransportChunkUsage(rawUsage: NonNullable<ChatCompletionChunk["usage"]>, model: Model<Api>): {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        total: number;
    };
};
