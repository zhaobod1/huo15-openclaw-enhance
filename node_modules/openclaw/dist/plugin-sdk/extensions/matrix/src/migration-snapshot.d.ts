import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
export type MatrixMigrationSnapshotResult = {
    created: boolean;
    archivePath: string;
    markerPath: string;
};
export declare function resolveMatrixMigrationSnapshotMarkerPath(env?: NodeJS.ProcessEnv): string;
export declare function resolveMatrixMigrationSnapshotOutputDir(env?: NodeJS.ProcessEnv): string;
export declare function hasPendingMatrixMigration(params: {
    cfg: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
}): boolean;
export declare function hasActionableMatrixMigration(params: {
    cfg: OpenClawConfig;
    env?: NodeJS.ProcessEnv;
}): boolean;
export declare function maybeCreateMatrixMigrationSnapshot(params: {
    trigger: string;
    env?: NodeJS.ProcessEnv;
    outputDir?: string;
    createBackupArchive?: typeof import("openclaw/plugin-sdk/runtime").createBackupArchive;
    log?: {
        info?: (message: string) => void;
        warn?: (message: string) => void;
    };
}): Promise<MatrixMigrationSnapshotResult>;
