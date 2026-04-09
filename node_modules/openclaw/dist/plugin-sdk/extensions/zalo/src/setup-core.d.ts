import { type ChannelSetupWizard, type ChannelSetupDmPolicy } from "openclaw/plugin-sdk/setup";
export declare const zaloSetupAdapter: import("openclaw/plugin-sdk/setup").ChannelSetupAdapter;
export declare const zaloDmPolicy: ChannelSetupDmPolicy;
export declare function createZaloSetupWizardProxy(loadWizard: () => Promise<ChannelSetupWizard>): ChannelSetupWizard;
