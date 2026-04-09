import type { OpenClawConfig } from "../config/config.js";
import type { MusicGenerationProviderPlugin } from "../plugins/types.js";
export declare function listMusicGenerationProviders(cfg?: OpenClawConfig): MusicGenerationProviderPlugin[];
export declare function getMusicGenerationProvider(providerId: string | undefined, cfg?: OpenClawConfig): MusicGenerationProviderPlugin | undefined;
