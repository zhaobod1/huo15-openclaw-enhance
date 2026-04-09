export type BundledPluginContractSnapshot = {
    pluginId: string;
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
    toolNames: string[];
};
export declare const BUNDLED_PLUGIN_CONTRACT_SNAPSHOTS: readonly BundledPluginContractSnapshot[];
export declare const BUNDLED_LEGACY_PLUGIN_ID_ALIASES: Readonly<Record<string, string>>;
export declare const BUNDLED_AUTO_ENABLE_PROVIDER_PLUGIN_IDS: Readonly<Record<string, string>>;
