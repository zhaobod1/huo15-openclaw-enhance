import type { OpenClawConfig } from "../config/config.js";
export type SecurityAuditFinding = {
    checkId: string;
    severity: "info" | "warn" | "critical";
    title: string;
    detail: string;
    remediation?: string;
};
export declare function collectAttackSurfaceSummaryFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectSyncedFolderFindings(params: {
    stateDir: string;
    configPath: string;
}): SecurityAuditFinding[];
export declare function collectSecretsInConfigFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectHooksHardeningFindings(cfg: OpenClawConfig, env?: NodeJS.ProcessEnv): SecurityAuditFinding[];
export declare function collectGatewayHttpSessionKeyOverrideFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectGatewayHttpNoAuthFindings(cfg: OpenClawConfig, env: NodeJS.ProcessEnv): SecurityAuditFinding[];
export declare function collectSandboxDockerNoopFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectSandboxDangerousConfigFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectNodeDenyCommandPatternFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectNodeDangerousAllowCommandFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectMinimalProfileOverrideFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectModelHygieneFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectSmallModelRiskFindings(params: {
    cfg: OpenClawConfig;
    env: NodeJS.ProcessEnv;
}): SecurityAuditFinding[];
export declare function collectExposureMatrixFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
export declare function collectLikelyMultiUserSetupFindings(cfg: OpenClawConfig): SecurityAuditFinding[];
