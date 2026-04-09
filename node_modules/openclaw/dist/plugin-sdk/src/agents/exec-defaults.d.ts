import type { OpenClawConfig } from "../config/config.js";
import type { SessionEntry } from "../config/sessions.js";
import type { ExecAsk, ExecHost, ExecSecurity, ExecTarget } from "../infra/exec-approvals.js";
export declare function canExecRequestNode(params: {
    cfg?: OpenClawConfig;
    sessionEntry?: SessionEntry;
    agentId?: string;
    sessionKey?: string;
}): boolean;
export declare function resolveExecDefaults(params: {
    cfg?: OpenClawConfig;
    sessionEntry?: SessionEntry;
    agentId?: string;
    sessionKey?: string;
    sandboxAvailable?: boolean;
}): {
    host: ExecTarget;
    effectiveHost: ExecHost;
    security: ExecSecurity;
    ask: ExecAsk;
    node?: string;
    canRequestNode: boolean;
};
