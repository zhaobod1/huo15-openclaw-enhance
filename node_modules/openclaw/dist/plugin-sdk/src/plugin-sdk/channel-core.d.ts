import type { ChannelOutboundAdapter, ChannelPairingAdapter, ChannelSecurityAdapter } from "../channels/plugins/types.adapters.js";
import type { ChannelMessagingAdapter, ChannelOutboundSessionRoute, ChannelPollResult, ChannelThreadingAdapter } from "../channels/plugins/types.core.js";
import type { ChannelConfigSchema, ChannelConfigUiHint, ChannelPlugin } from "../channels/plugins/types.plugin.js";
import type { OpenClawConfig } from "../config/config.js";
import type { ReplyToMode } from "../config/types.base.js";
import type { OutboundDeliveryResult } from "../infra/outbound/deliver.js";
import type { PluginRuntime } from "../plugins/runtime/types.js";
import type { OpenClawPluginApi, PluginCommandContext } from "../plugins/types.js";
export type { ChannelConfigUiHint, ChannelPlugin };
export type { OpenClawConfig };
export type { PluginRuntime };
export type { OpenClawPluginApi, PluginCommandContext };
export { buildChannelConfigSchema } from "../channels/plugins/config-schema.js";
export { clearAccountEntryFields } from "../channels/plugins/config-helpers.js";
export { parseOptionalDelimitedEntries } from "../channels/plugins/helpers.js";
export { tryReadSecretFileSync } from "../infra/secret-file.js";
export type ChannelOutboundSessionRouteParams = Parameters<NonNullable<ChannelMessagingAdapter["resolveOutboundSessionRoute"]>>[0];
type ChannelEntryConfigSchema<TPlugin> = TPlugin extends ChannelPlugin<unknown> ? NonNullable<TPlugin["configSchema"]> : ChannelConfigSchema;
type DefineChannelPluginEntryOptions<TPlugin = ChannelPlugin> = {
    id: string;
    name: string;
    description: string;
    plugin: TPlugin;
    configSchema?: ChannelEntryConfigSchema<TPlugin> | (() => ChannelEntryConfigSchema<TPlugin>);
    setRuntime?: (runtime: PluginRuntime) => void;
    registerCliMetadata?: (api: OpenClawPluginApi) => void;
    registerFull?: (api: OpenClawPluginApi) => void;
};
type DefinedChannelPluginEntry<TPlugin> = {
    id: string;
    name: string;
    description: string;
    configSchema: ChannelEntryConfigSchema<TPlugin>;
    register: (api: OpenClawPluginApi) => void;
    channelPlugin: TPlugin;
    setChannelRuntime?: (runtime: PluginRuntime) => void;
};
type ChatChannelPluginBase<TResolvedAccount, Probe, Audit> = Omit<ChannelPlugin<TResolvedAccount, Probe, Audit>, "security" | "pairing" | "threading" | "outbound"> & Partial<Pick<ChannelPlugin<TResolvedAccount, Probe, Audit>, "security" | "pairing" | "threading" | "outbound">>;
type ChatChannelSecurityOptions<TResolvedAccount extends {
    accountId?: string | null;
}> = {
    dm: {
        channelKey: string;
        resolvePolicy: (account: TResolvedAccount) => string | null | undefined;
        resolveAllowFrom: (account: TResolvedAccount) => Array<string | number> | null | undefined;
        resolveFallbackAccountId?: (account: TResolvedAccount) => string | null | undefined;
        defaultPolicy?: string;
        allowFromPathSuffix?: string;
        policyPathSuffix?: string;
        approveChannelId?: string;
        approveHint?: string;
        normalizeEntry?: (raw: string) => string;
    };
    collectWarnings?: ChannelSecurityAdapter<TResolvedAccount>["collectWarnings"];
    collectAuditFindings?: ChannelSecurityAdapter<TResolvedAccount>["collectAuditFindings"];
};
type ChatChannelPairingOptions = {
    text: {
        idLabel: string;
        message: string;
        normalizeAllowEntry?: ChannelPairingAdapter["normalizeAllowEntry"];
        notify: (params: Parameters<NonNullable<ChannelPairingAdapter["notifyApproval"]>>[0] & {
            message: string;
        }) => Promise<void> | void;
    };
};
type ChatChannelThreadingReplyModeOptions<TResolvedAccount> = {
    topLevelReplyToMode: string;
} | {
    scopedAccountReplyToMode: {
        resolveAccount: (cfg: OpenClawConfig, accountId?: string | null) => TResolvedAccount;
        resolveReplyToMode: (account: TResolvedAccount, chatType?: string | null) => ReplyToMode | null | undefined;
        fallback?: ReplyToMode;
    };
} | {
    resolveReplyToMode: NonNullable<ChannelThreadingAdapter["resolveReplyToMode"]>;
};
type ChatChannelThreadingOptions<TResolvedAccount> = ChatChannelThreadingReplyModeOptions<TResolvedAccount> & Omit<ChannelThreadingAdapter, "resolveReplyToMode">;
type ChatChannelAttachedOutboundOptions = {
    base: Omit<ChannelOutboundAdapter, "sendText" | "sendMedia" | "sendPoll">;
    attachedResults: {
        channel: string;
        sendText?: (ctx: Parameters<NonNullable<ChannelOutboundAdapter["sendText"]>>[0]) => MaybePromise<Omit<OutboundDeliveryResult, "channel">>;
        sendMedia?: (ctx: Parameters<NonNullable<ChannelOutboundAdapter["sendMedia"]>>[0]) => MaybePromise<Omit<OutboundDeliveryResult, "channel">>;
        sendPoll?: (ctx: Parameters<NonNullable<ChannelOutboundAdapter["sendPoll"]>>[0]) => MaybePromise<Omit<ChannelPollResult, "channel">>;
    };
};
type MaybePromise<T> = T | Promise<T>;
export declare function defineChannelPluginEntry<TPlugin>({ id, name, description, plugin, configSchema, setRuntime, registerCliMetadata, registerFull, }: DefineChannelPluginEntryOptions<TPlugin>): DefinedChannelPluginEntry<TPlugin>;
export declare function defineSetupPluginEntry<TPlugin>(plugin: TPlugin): {
    plugin: TPlugin;
};
export declare function stripChannelTargetPrefix(raw: string, ...providers: string[]): string;
export declare function stripTargetKindPrefix(raw: string): string;
export declare function buildChannelOutboundSessionRoute(params: {
    cfg: OpenClawConfig;
    agentId: string;
    channel: string;
    accountId?: string | null;
    peer: {
        kind: "direct" | "group" | "channel";
        id: string;
    };
    chatType: "direct" | "group" | "channel";
    from: string;
    to: string;
    threadId?: string | number;
}): ChannelOutboundSessionRoute;
export declare function createChatChannelPlugin<TResolvedAccount extends {
    accountId?: string | null;
}, Probe = unknown, Audit = unknown>(params: {
    base: ChatChannelPluginBase<TResolvedAccount, Probe, Audit>;
    security?: ChannelSecurityAdapter<TResolvedAccount> | ChatChannelSecurityOptions<TResolvedAccount>;
    pairing?: ChannelPairingAdapter | ChatChannelPairingOptions;
    threading?: ChannelThreadingAdapter | ChatChannelThreadingOptions<TResolvedAccount>;
    outbound?: ChannelOutboundAdapter | ChatChannelAttachedOutboundOptions;
}): ChannelPlugin<TResolvedAccount, Probe, Audit>;
