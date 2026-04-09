import type { LegacyConfigRule } from "../config/legacy.shared.js";
export declare function clearPluginDoctorContractRegistryCache(): void;
export declare function listPluginDoctorLegacyConfigRules(params?: {
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
}): LegacyConfigRule[];
