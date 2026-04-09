import type { ClawdbotConfig } from "../runtime-api.js";
import { createFeishuClient } from "./client.js";
import { type CommentFileType } from "./comment-target.js";
import type { ResolvedFeishuAccount } from "./types.js";
type FeishuDriveCommentUserId = {
    open_id?: string;
    user_id?: string;
    union_id?: string;
};
export type FeishuDriveCommentNoticeEvent = {
    comment_id?: string;
    event_id?: string;
    is_mentioned?: boolean;
    notice_meta?: {
        file_token?: string;
        file_type?: string;
        from_user_id?: FeishuDriveCommentUserId;
        notice_type?: string;
        to_user_id?: FeishuDriveCommentUserId;
    };
    reply_id?: string;
    timestamp?: string;
    type?: string;
};
type ResolveDriveCommentEventParams = {
    cfg: ClawdbotConfig;
    accountId: string;
    event: FeishuDriveCommentNoticeEvent;
    botOpenId?: string;
    createClient?: (account: ResolvedFeishuAccount) => FeishuRequestClient;
    verificationTimeoutMs?: number;
    logger?: (message: string) => void;
    waitMs?: (ms: number) => Promise<void>;
};
export type ResolvedDriveCommentEventTurn = {
    eventId: string;
    messageId: string;
    commentId: string;
    replyId?: string;
    noticeType: "add_comment" | "add_reply";
    fileToken: string;
    fileType: CommentFileType;
    isWholeComment?: boolean;
    senderId: string;
    senderUserId?: string;
    timestamp?: string;
    isMentioned?: boolean;
    documentTitle?: string;
    documentUrl?: string;
    quoteText?: string;
    rootCommentText?: string;
    targetReplyText?: string;
    prompt: string;
    preview: string;
};
type FeishuRequestClient = ReturnType<typeof createFeishuClient> & {
    request(params: {
        method: "GET" | "POST";
        url: string;
        data: unknown;
        timeout: number;
    }): Promise<unknown>;
};
export declare function parseFeishuDriveCommentNoticeEventPayload(value: unknown): FeishuDriveCommentNoticeEvent | null;
export declare function resolveDriveCommentEventTurn(params: ResolveDriveCommentEventParams): Promise<ResolvedDriveCommentEventTurn | null>;
export {};
