import { type ClawdbotConfig, type RuntimeEnv } from "./comment-handler-runtime-api.js";
import { type FeishuDriveCommentNoticeEvent } from "./monitor.comment.js";
type HandleFeishuCommentEventParams = {
    cfg: ClawdbotConfig;
    accountId: string;
    runtime?: RuntimeEnv;
    event: FeishuDriveCommentNoticeEvent;
    botOpenId?: string;
};
export declare function handleFeishuCommentEvent(params: HandleFeishuCommentEventParams): Promise<void>;
export {};
