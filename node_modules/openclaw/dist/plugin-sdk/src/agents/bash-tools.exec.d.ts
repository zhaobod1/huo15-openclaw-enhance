import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec-types.js";
import { type AgentToolWithMeta } from "./tools/common.js";
export type { BashSandboxConfig } from "./bash-tools.shared.js";
export type { ExecElevatedDefaults, ExecToolDefaults, ExecToolDetails, } from "./bash-tools.exec-types.js";
export declare function describeExecTool(params?: {
    agentId?: string;
    hasCronTool?: boolean;
}): string;
export declare function createExecTool(defaults?: ExecToolDefaults): AgentToolWithMeta<any, ExecToolDetails>;
export declare const execTool: AgentToolWithMeta<any, ExecToolDetails>;
