import type { ChannelSetupAdapter } from "openclaw/plugin-sdk/channel-setup";
import { type OpenClawConfig } from "./runtime-api.js";
import { type ResolvedMattermostAccount } from "./setup.accounts.runtime.js";
export declare function isMattermostConfigured(account: ResolvedMattermostAccount): boolean;
export declare function resolveMattermostAccountWithSecrets(cfg: OpenClawConfig, accountId: string): ResolvedMattermostAccount;
export declare const mattermostSetupAdapter: ChannelSetupAdapter;
