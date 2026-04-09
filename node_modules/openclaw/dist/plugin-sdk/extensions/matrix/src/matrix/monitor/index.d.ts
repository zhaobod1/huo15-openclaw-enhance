import { type RuntimeEnv } from "../../runtime-api.js";
import type { ReplyToMode } from "../../types.js";
export type MonitorMatrixOpts = {
    runtime?: RuntimeEnv;
    abortSignal?: AbortSignal;
    mediaMaxMb?: number;
    initialSyncLimit?: number;
    replyToMode?: ReplyToMode;
    accountId?: string | null;
};
export declare function monitorMatrixProvider(opts?: MonitorMatrixOpts): Promise<void>;
