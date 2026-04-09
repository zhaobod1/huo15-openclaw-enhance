import type { OpenClawConfig } from "../config/config.js";
export declare function expectGeneratedTokenPersistedToGatewayAuth(params: {
    generatedToken?: string;
    authToken?: string;
    persistedConfig?: OpenClawConfig;
}): void;
