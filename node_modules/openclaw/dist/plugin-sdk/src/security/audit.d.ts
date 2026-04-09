import type { listChannelPlugins } from "../channels/plugins/index.js";
import type { ConfigFileSnapshot, OpenClawConfig } from "../config/config.js";
import type { ExecFn } from "./windows-acl.js";
type ExecDockerRawFn = typeof import("../agents/sandbox/docker.js").execDockerRaw;
type ProbeGatewayFn = typeof import("../gateway/probe.js").probeGateway;
export type SecurityAuditSeverity = "info" | "warn" | "critical";
export type SecurityAuditFinding = {
    checkId: string;
    severity: SecurityAuditSeverity;
    title: string;
    detail: string;
    remediation?: string;
};
export type SecurityAuditSummary = {
    critical: number;
    warn: number;
    info: number;
};
export type SecurityAuditReport = {
    ts: number;
    summary: SecurityAuditSummary;
    findings: SecurityAuditFinding[];
    deep?: {
        gateway?: {
            attempted: boolean;
            url: string | null;
            ok: boolean;
            error: string | null;
            close?: {
                code: number;
                reason: string;
            } | null;
        };
    };
};
export type SecurityAuditOptions = {
    config: OpenClawConfig;
    sourceConfig?: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
    deep?: boolean;
    includeFilesystem?: boolean;
    includeChannelSecurity?: boolean;
    /** Override where to check state (default: resolveStateDir()). */
    stateDir?: string;
    /** Override config path check (default: resolveConfigPath()). */
    configPath?: string;
    /** Time limit for deep gateway probe. */
    deepTimeoutMs?: number;
    /** Dependency injection for tests. */
    plugins?: ReturnType<typeof listChannelPlugins>;
    /** Dependency injection for tests (Windows ACL checks). */
    execIcacls?: ExecFn;
    /** Dependency injection for tests (Docker label checks). */
    execDockerRawFn?: ExecDockerRawFn;
    /** Optional preloaded config snapshot to skip audit-time config file reads. */
    configSnapshot?: ConfigFileSnapshot | null;
    /** Optional cache for code-safety summaries across repeated deep audits. */
    codeSafetySummaryCache?: Map<string, Promise<unknown>>;
    /** Optional explicit auth for deep gateway probe. */
    deepProbeAuth?: {
        token?: string;
        password?: string;
    };
    /** Dependency injection for tests. */
    probeGatewayFn?: ProbeGatewayFn;
};
export declare function runSecurityAudit(opts: SecurityAuditOptions): Promise<SecurityAuditReport>;
export {};
