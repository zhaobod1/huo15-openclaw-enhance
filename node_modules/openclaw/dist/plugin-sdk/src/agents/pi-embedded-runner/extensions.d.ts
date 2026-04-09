import type { ExtensionFactory, SessionManager } from "@mariozechner/pi-coding-agent";
import type { OpenClawConfig } from "../../config/config.js";
import type { ProviderRuntimeModel } from "../../plugins/types.js";
import { ensurePiCompactionReserveTokens } from "../pi-settings.js";
export declare function buildEmbeddedExtensionFactories(params: {
    cfg: OpenClawConfig | undefined;
    sessionManager: SessionManager;
    provider: string;
    modelId: string;
    model: ProviderRuntimeModel | undefined;
}): ExtensionFactory[];
export { ensurePiCompactionReserveTokens };
