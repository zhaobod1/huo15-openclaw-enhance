import type * as Lark from "@larksuiteoapi/node-sdk";
import type { OpenClawPluginApi } from "../runtime-api.js";
import { type CommentFileType } from "./comment-target.js";
export declare function replyComment(client: Lark.Client, params: {
    file_token: string;
    file_type: CommentFileType;
    comment_id: string;
    content: string;
}): Promise<{
    success: true;
    reply_id?: string;
} & Record<string, unknown>>;
export declare function deliverCommentThreadText(client: Lark.Client, params: {
    file_token: string;
    file_type: CommentFileType;
    comment_id: string;
    content: string;
    is_whole_comment?: boolean;
}): Promise<({
    success: true;
    reply_id?: string;
} & Record<string, unknown> & {
    delivery_mode: "reply_comment";
}) | ({
    success: true;
    comment_id?: string;
} & Record<string, unknown> & {
    delivery_mode: "add_comment";
})>;
export declare function registerFeishuDriveTools(api: OpenClawPluginApi): void;
