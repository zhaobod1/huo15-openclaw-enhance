import { type OpenClawConfig } from "./channel-api.js";
type LineGroupContext = {
    cfg: OpenClawConfig;
    accountId?: string | null;
    groupId?: string | null;
};
export declare function resolveLineGroupRequireMention(params: LineGroupContext): boolean;
export {};
