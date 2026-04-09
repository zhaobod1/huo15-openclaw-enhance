export declare function resolveFeishuParentConversationCandidates(rawId: string): string[];
export declare function resolveFeishuSessionConversation(params: {
    kind: "group" | "channel";
    rawId: string;
}): {
    id: string;
    baseConversationId: string;
    parentConversationCandidates: string[];
} | null;
