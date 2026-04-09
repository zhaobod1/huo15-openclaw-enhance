import { type ResolverContext, type SecretDefaults } from "openclaw/plugin-sdk/security-runtime";
export declare const secretTargetRegistryEntries: {
    id: string;
    targetType: string;
    configFile: "openclaw.json";
    pathPattern: string;
    secretShape: "secret_input";
    expectedResolvedValue: "string";
    includeInPlan: true;
    includeInConfigure: true;
    includeInAudit: true;
}[];
export declare function collectRuntimeConfigAssignments(params: {
    config: {
        channels?: Record<string, unknown>;
    };
    defaults: SecretDefaults | undefined;
    context: ResolverContext;
}): void;
