import type { AnyAgentTool } from "../agents/tools/common.js";
import type { ChannelPlugin } from "../channels/plugins/types.js";
import type { OperatorScope } from "../gateway/method-scopes.js";
import type { GatewayRequestHandler, GatewayRequestHandlers } from "../gateway/server-methods/types.js";
import { registerInternalHook } from "../hooks/internal-hooks.js";
import type { HookEntry } from "../hooks/types.js";
import type { PluginActivationSource } from "./config-state.js";
import type { PluginManifestContracts } from "./manifest.js";
import { type MemoryEmbeddingProviderAdapter } from "./memory-embedding-providers.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { ImageGenerationProviderPlugin, MusicGenerationProviderPlugin, RealtimeTranscriptionProviderPlugin, OpenClawPluginApi, OpenClawPluginChannelRegistration, OpenClawPluginCliCommandDescriptor, OpenClawPluginCliRegistrar, OpenClawPluginCommandDefinition, PluginConversationBindingResolvedEvent, OpenClawPluginHttpRouteAuth, OpenClawPluginHttpRouteMatch, OpenClawPluginHttpRouteHandler, OpenClawPluginHookOptions, OpenClawPluginNodeHostCommand, OpenClawPluginReloadRegistration, OpenClawPluginSecurityAuditCollector, MediaUnderstandingProviderPlugin, ProviderPlugin, RealtimeVoiceProviderPlugin, OpenClawPluginService, OpenClawPluginToolFactory, PluginConfigUiHint, PluginDiagnostic, PluginBundleFormat, PluginFormat, PluginLogger, PluginOrigin, PluginKind, PluginRegistrationMode, PluginHookName, PluginHookHandlerMap, PluginHookRegistration as TypedPluginHookRegistration, SpeechProviderPlugin, VideoGenerationProviderPlugin, WebFetchProviderPlugin, WebSearchProviderPlugin } from "./types.js";
export type PluginToolRegistration = {
    pluginId: string;
    pluginName?: string;
    factory: OpenClawPluginToolFactory;
    names: string[];
    optional: boolean;
    source: string;
    rootDir?: string;
};
export type PluginCliRegistration = {
    pluginId: string;
    pluginName?: string;
    register: OpenClawPluginCliRegistrar;
    commands: string[];
    descriptors: OpenClawPluginCliCommandDescriptor[];
    source: string;
    rootDir?: string;
};
export type PluginHttpRouteRegistration = {
    pluginId?: string;
    path: string;
    handler: OpenClawPluginHttpRouteHandler;
    auth: OpenClawPluginHttpRouteAuth;
    match: OpenClawPluginHttpRouteMatch;
    source?: string;
};
export type PluginChannelRegistration = {
    pluginId: string;
    pluginName?: string;
    plugin: ChannelPlugin;
    source: string;
    rootDir?: string;
};
export type PluginChannelSetupRegistration = {
    pluginId: string;
    pluginName?: string;
    plugin: ChannelPlugin;
    source: string;
    enabled: boolean;
    rootDir?: string;
};
export type PluginProviderRegistration = {
    pluginId: string;
    pluginName?: string;
    provider: ProviderPlugin;
    source: string;
    rootDir?: string;
};
type PluginOwnedProviderRegistration<T extends {
    id: string;
}> = {
    pluginId: string;
    pluginName?: string;
    provider: T;
    source: string;
    rootDir?: string;
};
export type PluginSpeechProviderRegistration = PluginOwnedProviderRegistration<SpeechProviderPlugin>;
export type PluginRealtimeTranscriptionProviderRegistration = PluginOwnedProviderRegistration<RealtimeTranscriptionProviderPlugin>;
export type PluginRealtimeVoiceProviderRegistration = PluginOwnedProviderRegistration<RealtimeVoiceProviderPlugin>;
export type PluginMediaUnderstandingProviderRegistration = PluginOwnedProviderRegistration<MediaUnderstandingProviderPlugin>;
export type PluginImageGenerationProviderRegistration = PluginOwnedProviderRegistration<ImageGenerationProviderPlugin>;
export type PluginVideoGenerationProviderRegistration = PluginOwnedProviderRegistration<VideoGenerationProviderPlugin>;
export type PluginMusicGenerationProviderRegistration = PluginOwnedProviderRegistration<MusicGenerationProviderPlugin>;
export type PluginWebFetchProviderRegistration = PluginOwnedProviderRegistration<WebFetchProviderPlugin>;
export type PluginWebSearchProviderRegistration = PluginOwnedProviderRegistration<WebSearchProviderPlugin>;
export type PluginMemoryEmbeddingProviderRegistration = PluginOwnedProviderRegistration<MemoryEmbeddingProviderAdapter>;
export type PluginHookRegistration = {
    pluginId: string;
    entry: HookEntry;
    events: string[];
    source: string;
    rootDir?: string;
};
export type PluginServiceRegistration = {
    pluginId: string;
    pluginName?: string;
    service: OpenClawPluginService;
    source: string;
    rootDir?: string;
};
export type PluginReloadRegistration = {
    pluginId: string;
    pluginName?: string;
    registration: OpenClawPluginReloadRegistration;
    source: string;
    rootDir?: string;
};
export type PluginNodeHostCommandRegistration = {
    pluginId: string;
    pluginName?: string;
    command: OpenClawPluginNodeHostCommand;
    source: string;
    rootDir?: string;
};
export type PluginSecurityAuditCollectorRegistration = {
    pluginId: string;
    pluginName?: string;
    collector: OpenClawPluginSecurityAuditCollector;
    source: string;
    rootDir?: string;
};
export type PluginCommandRegistration = {
    pluginId: string;
    pluginName?: string;
    command: OpenClawPluginCommandDefinition;
    source: string;
    rootDir?: string;
};
export type PluginConversationBindingResolvedHandlerRegistration = {
    pluginId: string;
    pluginName?: string;
    pluginRoot?: string;
    handler: (event: PluginConversationBindingResolvedEvent) => void | Promise<void>;
    source: string;
    rootDir?: string;
};
export type PluginRecord = {
    id: string;
    name: string;
    version?: string;
    description?: string;
    format?: PluginFormat;
    bundleFormat?: PluginBundleFormat;
    bundleCapabilities?: string[];
    kind?: PluginKind | PluginKind[];
    source: string;
    rootDir?: string;
    origin: PluginOrigin;
    workspaceDir?: string;
    enabled: boolean;
    explicitlyEnabled?: boolean;
    activated?: boolean;
    imported?: boolean;
    activationSource?: PluginActivationSource;
    activationReason?: string;
    status: "loaded" | "disabled" | "error";
    error?: string;
    failedAt?: Date;
    failurePhase?: "validation" | "load" | "register";
    toolNames: string[];
    hookNames: string[];
    channelIds: string[];
    providerIds: string[];
    speechProviderIds: string[];
    realtimeTranscriptionProviderIds: string[];
    realtimeVoiceProviderIds: string[];
    mediaUnderstandingProviderIds: string[];
    imageGenerationProviderIds: string[];
    videoGenerationProviderIds: string[];
    musicGenerationProviderIds: string[];
    webFetchProviderIds: string[];
    webSearchProviderIds: string[];
    memoryEmbeddingProviderIds: string[];
    gatewayMethods: string[];
    cliCommands: string[];
    services: string[];
    commands: string[];
    httpRoutes: number;
    hookCount: number;
    configSchema: boolean;
    configUiHints?: Record<string, PluginConfigUiHint>;
    configJsonSchema?: Record<string, unknown>;
    contracts?: PluginManifestContracts;
    memorySlotSelected?: boolean;
};
export type PluginRegistry = {
    plugins: PluginRecord[];
    tools: PluginToolRegistration[];
    hooks: PluginHookRegistration[];
    typedHooks: TypedPluginHookRegistration[];
    channels: PluginChannelRegistration[];
    channelSetups: PluginChannelSetupRegistration[];
    providers: PluginProviderRegistration[];
    speechProviders: PluginSpeechProviderRegistration[];
    realtimeTranscriptionProviders: PluginRealtimeTranscriptionProviderRegistration[];
    realtimeVoiceProviders: PluginRealtimeVoiceProviderRegistration[];
    mediaUnderstandingProviders: PluginMediaUnderstandingProviderRegistration[];
    imageGenerationProviders: PluginImageGenerationProviderRegistration[];
    videoGenerationProviders: PluginVideoGenerationProviderRegistration[];
    musicGenerationProviders: PluginMusicGenerationProviderRegistration[];
    webFetchProviders: PluginWebFetchProviderRegistration[];
    webSearchProviders: PluginWebSearchProviderRegistration[];
    memoryEmbeddingProviders: PluginMemoryEmbeddingProviderRegistration[];
    gatewayHandlers: GatewayRequestHandlers;
    gatewayMethodScopes?: Partial<Record<string, OperatorScope>>;
    httpRoutes: PluginHttpRouteRegistration[];
    cliRegistrars: PluginCliRegistration[];
    reloads?: PluginReloadRegistration[];
    nodeHostCommands?: PluginNodeHostCommandRegistration[];
    securityAuditCollectors?: PluginSecurityAuditCollectorRegistration[];
    services: PluginServiceRegistration[];
    commands: PluginCommandRegistration[];
    conversationBindingResolvedHandlers: PluginConversationBindingResolvedHandlerRegistration[];
    diagnostics: PluginDiagnostic[];
};
export type PluginRegistryParams = {
    logger: PluginLogger;
    coreGatewayHandlers?: GatewayRequestHandlers;
    runtime: PluginRuntime;
    activateGlobalSideEffects?: boolean;
};
type PluginTypedHookPolicy = {
    allowPromptInjection?: boolean;
};
export { createEmptyPluginRegistry } from "./registry-empty.js";
export declare function createPluginRegistry(registryParams: PluginRegistryParams): {
    registry: PluginRegistry;
    createApi: (record: PluginRecord, params: {
        config: OpenClawPluginApi["config"];
        pluginConfig?: Record<string, unknown>;
        hookPolicy?: PluginTypedHookPolicy;
        registrationMode?: PluginRegistrationMode;
    }) => OpenClawPluginApi;
    pushDiagnostic: (diag: PluginDiagnostic) => void;
    registerTool: (record: PluginRecord, tool: AnyAgentTool | OpenClawPluginToolFactory, opts?: {
        name?: string;
        names?: string[];
        optional?: boolean;
    }) => void;
    registerChannel: (record: PluginRecord, registration: OpenClawPluginChannelRegistration | ChannelPlugin, mode?: PluginRegistrationMode) => void;
    registerProvider: (record: PluginRecord, provider: ProviderPlugin) => void;
    registerSpeechProvider: (record: PluginRecord, provider: SpeechProviderPlugin) => void;
    registerRealtimeTranscriptionProvider: (record: PluginRecord, provider: RealtimeTranscriptionProviderPlugin) => void;
    registerRealtimeVoiceProvider: (record: PluginRecord, provider: RealtimeVoiceProviderPlugin) => void;
    registerMediaUnderstandingProvider: (record: PluginRecord, provider: MediaUnderstandingProviderPlugin) => void;
    registerImageGenerationProvider: (record: PluginRecord, provider: ImageGenerationProviderPlugin) => void;
    registerVideoGenerationProvider: (record: PluginRecord, provider: VideoGenerationProviderPlugin) => void;
    registerMusicGenerationProvider: (record: PluginRecord, provider: MusicGenerationProviderPlugin) => void;
    registerWebSearchProvider: (record: PluginRecord, provider: WebSearchProviderPlugin) => void;
    registerGatewayMethod: (record: PluginRecord, method: string, handler: GatewayRequestHandler, opts?: {
        scope?: OperatorScope;
    }) => void;
    registerCli: (record: PluginRecord, registrar: OpenClawPluginCliRegistrar, opts?: {
        commands?: string[];
        descriptors?: OpenClawPluginCliCommandDescriptor[];
    }) => void;
    registerReload: (record: PluginRecord, registration: OpenClawPluginReloadRegistration) => void;
    registerNodeHostCommand: (record: PluginRecord, nodeCommand: OpenClawPluginNodeHostCommand) => void;
    registerSecurityAuditCollector: (record: PluginRecord, collector: OpenClawPluginSecurityAuditCollector) => void;
    registerService: (record: PluginRecord, service: OpenClawPluginService) => void;
    registerCommand: (record: PluginRecord, command: OpenClawPluginCommandDefinition) => void;
    registerHook: (record: PluginRecord, events: string | string[], handler: Parameters<typeof registerInternalHook>[1], opts: OpenClawPluginHookOptions | undefined, config: OpenClawPluginApi["config"]) => void;
    registerTypedHook: <K extends PluginHookName>(record: PluginRecord, hookName: K, handler: PluginHookHandlerMap[K], opts?: {
        priority?: number;
    }, policy?: PluginTypedHookPolicy) => void;
};
