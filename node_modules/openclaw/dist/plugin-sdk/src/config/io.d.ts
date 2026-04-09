import fs from "node:fs";
import JSON5 from "json5";
import { clearRuntimeConfigSnapshot as clearRuntimeConfigSnapshotState, getRuntimeConfigSnapshot as getRuntimeConfigSnapshotState, getRuntimeConfigSourceSnapshot as getRuntimeConfigSourceSnapshotState, resetConfigRuntimeState as resetConfigRuntimeStateState, setRuntimeConfigSnapshot as setRuntimeConfigSnapshotState, setRuntimeConfigSnapshotRefreshHandler as setRuntimeConfigSnapshotRefreshHandlerState } from "./runtime-snapshot.js";
import type { OpenClawConfig, ConfigFileSnapshot } from "./types.js";
export { clearRuntimeConfigSnapshotState as clearRuntimeConfigSnapshot, getRuntimeConfigSnapshotState as getRuntimeConfigSnapshot, getRuntimeConfigSourceSnapshotState as getRuntimeConfigSourceSnapshot, resetConfigRuntimeStateState as resetConfigRuntimeState, setRuntimeConfigSnapshotState as setRuntimeConfigSnapshot, setRuntimeConfigSnapshotRefreshHandlerState as setRuntimeConfigSnapshotRefreshHandler, };
export { CircularIncludeError, ConfigIncludeError } from "./includes.js";
export { MissingEnvVarError } from "./env-substitution.js";
export type ParseConfigJson5Result = {
    ok: true;
    parsed: unknown;
} | {
    ok: false;
    error: string;
};
export type ConfigWriteOptions = {
    /**
     * Read-time env snapshot used to validate `${VAR}` restoration decisions.
     * If omitted, write falls back to current process env.
     */
    envSnapshotForRestore?: Record<string, string | undefined>;
    /**
     * Optional safety check: only use envSnapshotForRestore when writing the
     * same config file path that produced the snapshot.
     */
    expectedConfigPath?: string;
    /**
     * Paths that must be explicitly removed from the persisted file payload,
     * even if schema/default normalization reintroduces them.
     */
    unsetPaths?: string[][];
};
export type ReadConfigFileSnapshotForWriteResult = {
    snapshot: ConfigFileSnapshot;
    writeOptions: ConfigWriteOptions;
};
export type ConfigWriteNotification = {
    configPath: string;
    sourceConfig: OpenClawConfig;
    runtimeConfig: OpenClawConfig;
    persistedHash: string;
    writtenAtMs: number;
};
export declare class ConfigRuntimeRefreshError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function resolveConfigSnapshotHash(snapshot: {
    hash?: string;
    raw?: string | null;
}): string | null;
export type ConfigIoDeps = {
    fs?: typeof fs;
    json5?: typeof JSON5;
    env?: NodeJS.ProcessEnv;
    homedir?: () => string;
    configPath?: string;
    logger?: Pick<typeof console, "error" | "warn">;
};
export declare function parseConfigJson5(raw: string, json5?: {
    parse: (value: string) => unknown;
}): ParseConfigJson5Result;
export declare function createConfigIO(overrides?: ConfigIoDeps): {
    configPath: string;
    loadConfig: () => OpenClawConfig;
    readConfigFileSnapshot: () => Promise<ConfigFileSnapshot>;
    readConfigFileSnapshotForWrite: () => Promise<ReadConfigFileSnapshotForWriteResult>;
    writeConfigFile: (cfg: OpenClawConfig, options?: ConfigWriteOptions) => Promise<{
        persistedHash: string;
    }>;
};
export declare function clearConfigCache(): void;
export declare function registerConfigWriteListener(listener: (event: ConfigWriteNotification) => void): () => void;
export declare function projectConfigOntoRuntimeSourceSnapshot(config: OpenClawConfig): OpenClawConfig;
export declare function loadConfig(): OpenClawConfig;
export declare function getRuntimeConfig(): OpenClawConfig;
export declare function readBestEffortConfig(): Promise<OpenClawConfig>;
export declare function readConfigFileSnapshot(): Promise<ConfigFileSnapshot>;
export declare function readSourceConfigSnapshot(): Promise<ConfigFileSnapshot>;
export declare function readConfigFileSnapshotForWrite(): Promise<ReadConfigFileSnapshotForWriteResult>;
export declare function readSourceConfigSnapshotForWrite(): Promise<ReadConfigFileSnapshotForWriteResult>;
export declare function writeConfigFile(cfg: OpenClawConfig, options?: ConfigWriteOptions): Promise<void>;
