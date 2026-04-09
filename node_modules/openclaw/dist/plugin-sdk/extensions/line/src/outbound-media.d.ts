export type LineOutboundMediaKind = "image" | "video" | "audio";
export type LineOutboundMediaResolved = {
    mediaUrl: string;
    mediaKind: LineOutboundMediaKind;
    previewImageUrl?: string;
    durationMs?: number;
    trackingId?: string;
};
type ResolveLineOutboundMediaOpts = {
    mediaKind?: LineOutboundMediaKind;
    previewImageUrl?: string;
    durationMs?: number;
    trackingId?: string;
};
export declare function validateLineMediaUrl(url: string): void;
export declare function detectLineMediaKind(mimeType: string): LineOutboundMediaKind;
export declare function resolveLineOutboundMedia(mediaUrl: string, opts?: ResolveLineOutboundMediaOpts): Promise<LineOutboundMediaResolved>;
export {};
