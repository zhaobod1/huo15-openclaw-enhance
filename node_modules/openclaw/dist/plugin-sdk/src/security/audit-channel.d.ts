import type { listChannelPlugins } from "../channels/plugins/index.js";
import type { OpenClawConfig } from "../config/config.js";
import type { SecurityAuditFinding } from "./audit.js";
export declare function collectChannelSecurityFindings(params: {
    cfg: OpenClawConfig;
    sourceConfig?: OpenClawConfig;
    plugins: ReturnType<typeof listChannelPlugins>;
}): Promise<SecurityAuditFinding[]>;
