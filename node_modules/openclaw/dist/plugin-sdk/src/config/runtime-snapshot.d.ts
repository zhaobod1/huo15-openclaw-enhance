import type { OpenClawConfig } from "./types.js";
export type RuntimeConfigSnapshotRefreshParams = {
    sourceConfig: OpenClawConfig;
};
export type RuntimeConfigSnapshotRefreshHandler = {
    refresh: (params: RuntimeConfigSnapshotRefreshParams) => boolean | Promise<boolean>;
    clearOnRefreshFailure?: () => void;
};
export declare function setRuntimeConfigSnapshot(config: OpenClawConfig, sourceConfig?: OpenClawConfig): void;
export declare function resetConfigRuntimeState(): void;
export declare function clearRuntimeConfigSnapshot(): void;
export declare function getRuntimeConfigSnapshot(): OpenClawConfig | null;
export declare function getRuntimeConfigSourceSnapshot(): OpenClawConfig | null;
export declare function setRuntimeConfigSnapshotRefreshHandler(refreshHandler: RuntimeConfigSnapshotRefreshHandler | null): void;
export declare function getRuntimeConfigSnapshotRefreshHandler(): RuntimeConfigSnapshotRefreshHandler | null;
