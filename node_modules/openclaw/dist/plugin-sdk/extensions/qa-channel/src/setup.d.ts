import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
export declare function applyQaSetup(params: {
    cfg: OpenClawConfig;
    accountId: string;
    input: Record<string, unknown>;
}): OpenClawConfig;
