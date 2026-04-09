import type { ResolvedBrowserProfile } from "./config.js";
export declare function resolveIdleProfileStopOutcome(profile: ResolvedBrowserProfile): {
    stopped: boolean;
    closePlaywright: boolean;
};
export declare function closePlaywrightBrowserConnectionForProfile(cdpUrl?: string): Promise<void>;
