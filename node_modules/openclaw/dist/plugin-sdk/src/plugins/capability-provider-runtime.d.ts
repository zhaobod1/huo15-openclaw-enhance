import type { OpenClawConfig } from "../config/config.js";
import type { PluginRegistry } from "./registry.js";
type CapabilityProviderRegistryKey = "memoryEmbeddingProviders" | "speechProviders" | "realtimeTranscriptionProviders" | "realtimeVoiceProviders" | "mediaUnderstandingProviders" | "imageGenerationProviders" | "videoGenerationProviders" | "musicGenerationProviders";
type CapabilityProviderForKey<K extends CapabilityProviderRegistryKey> = PluginRegistry[K][number] extends {
    provider: infer T;
} ? T : never;
export declare function resolvePluginCapabilityProviders<K extends CapabilityProviderRegistryKey>(params: {
    key: K;
    cfg?: OpenClawConfig;
}): CapabilityProviderForKey<K>[];
export {};
