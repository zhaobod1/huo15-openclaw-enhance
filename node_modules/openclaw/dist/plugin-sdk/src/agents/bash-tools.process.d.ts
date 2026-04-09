import type { AgentToolWithMeta } from "./tools/common.js";
export type ProcessToolDefaults = {
    cleanupMs?: number;
    hasCronTool?: boolean;
    scopeKey?: string;
};
export declare function describeProcessTool(params?: {
    hasCronTool?: boolean;
}): string;
export declare function createProcessTool(defaults?: ProcessToolDefaults): AgentToolWithMeta<any, unknown>;
export declare const processTool: AgentToolWithMeta<any, unknown>;
