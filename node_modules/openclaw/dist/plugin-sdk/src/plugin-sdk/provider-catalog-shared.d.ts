import type { ModelProviderConfig } from "./provider-model-shared.js";
export type { ProviderCatalogContext, ProviderCatalogResult } from "../plugins/types.js";
export { buildPairedProviderApiKeyCatalog, buildSingleProviderApiKeyCatalog, findCatalogTemplate, } from "../plugins/provider-catalog.js";
export declare function supportsNativeStreamingUsageCompat(params: {
    providerId: string;
    baseUrl: string | undefined;
}): boolean;
export declare function applyProviderNativeStreamingUsageCompat(params: {
    providerId: string;
    providerConfig: ModelProviderConfig;
}): ModelProviderConfig;
