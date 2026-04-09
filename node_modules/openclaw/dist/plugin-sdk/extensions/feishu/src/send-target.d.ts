import type { ClawdbotConfig } from "../runtime-api.js";
import { createFeishuClient } from "./client.js";
import { resolveReceiveIdType } from "./targets.js";
type FeishuSendTarget = {
    client: ReturnType<typeof createFeishuClient>;
    receiveId: string;
    receiveIdType: ReturnType<typeof resolveReceiveIdType>;
};
export declare function resolveFeishuSendTarget(params: {
    cfg: ClawdbotConfig;
    to: string;
    accountId?: string;
}): FeishuSendTarget;
export {};
