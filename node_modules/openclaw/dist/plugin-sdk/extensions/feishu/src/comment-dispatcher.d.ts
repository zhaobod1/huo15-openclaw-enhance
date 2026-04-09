import { type ClawdbotConfig, type RuntimeEnv } from "./comment-dispatcher-runtime-api.js";
import type { CommentFileType } from "./comment-target.js";
export type CreateFeishuCommentReplyDispatcherParams = {
    cfg: ClawdbotConfig;
    agentId: string;
    runtime: RuntimeEnv;
    accountId?: string;
    fileToken: string;
    fileType: CommentFileType;
    commentId: string;
    isWholeComment?: boolean;
};
export declare function createFeishuCommentReplyDispatcher(params: CreateFeishuCommentReplyDispatcherParams): {
    dispatcher: import("openclaw/plugin-sdk/reply-runtime").ReplyDispatcher;
    replyOptions: Pick<import("openclaw/plugin-sdk/reply-runtime").GetReplyOptions, "onReplyStart" | "onTypingController" | "onTypingCleanup">;
    markDispatchIdle: () => void;
};
