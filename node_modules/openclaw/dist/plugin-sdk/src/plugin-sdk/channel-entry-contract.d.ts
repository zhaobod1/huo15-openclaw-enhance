import type { ChannelConfigSchema, ChannelPlugin } from "../channels/plugins/types.plugin.js";
import type { PluginRuntime } from "../plugins/runtime/types.js";
import type { AnyAgentTool, OpenClawPluginApi, PluginCommandContext } from "../plugins/types.js";
export type { AnyAgentTool, OpenClawPluginApi, PluginCommandContext };
type ChannelEntryConfigSchema<TPlugin> = TPlugin extends ChannelPlugin<unknown> ? NonNullable<TPlugin["configSchema"]> : ChannelConfigSchema;
type BundledEntryModuleRef = {
    specifier: string;
    exportName?: string;
};
type DefineBundledChannelEntryOptions<TPlugin = ChannelPlugin> = {
    id: string;
    name: string;
    description: string;
    importMetaUrl: string;
    plugin: BundledEntryModuleRef;
    configSchema?: ChannelEntryConfigSchema<TPlugin> | (() => ChannelEntryConfigSchema<TPlugin>);
    runtime?: BundledEntryModuleRef;
    registerCliMetadata?: (api: OpenClawPluginApi) => void;
    registerFull?: (api: OpenClawPluginApi) => void;
};
type DefineBundledChannelSetupEntryOptions = {
    importMetaUrl: string;
    plugin: BundledEntryModuleRef;
};
export type BundledChannelEntryContract<TPlugin = ChannelPlugin> = {
    kind: "bundled-channel-entry";
    id: string;
    name: string;
    description: string;
    configSchema: ChannelEntryConfigSchema<TPlugin>;
    register: (api: OpenClawPluginApi) => void;
    loadChannelPlugin: () => TPlugin;
    setChannelRuntime?: (runtime: PluginRuntime) => void;
};
export type BundledChannelSetupEntryContract<TPlugin = ChannelPlugin> = {
    kind: "bundled-channel-setup-entry";
    loadSetupPlugin: () => TPlugin;
};
export declare function loadBundledEntryExportSync<T>(importMetaUrl: string, reference: BundledEntryModuleRef): T;
export declare function defineBundledChannelEntry<TPlugin = ChannelPlugin>({ id, name, description, importMetaUrl, plugin, configSchema, runtime, registerCliMetadata, registerFull, }: DefineBundledChannelEntryOptions<TPlugin>): BundledChannelEntryContract<TPlugin>;
export declare function defineBundledChannelSetupEntry<TPlugin = ChannelPlugin>({ importMetaUrl, plugin, }: DefineBundledChannelSetupEntryOptions): BundledChannelSetupEntryContract<TPlugin>;
