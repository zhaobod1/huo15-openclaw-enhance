import { n as resolvePreferredOpenClawTmpDir } from "../tmp-openclaw-dir-BobVQuve.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "../session-key-BR3Z-ljs.js";
import { m as MarkdownConfigSchema } from "../zod-schema.core-BITC5-JP.js";
import { o as ToolPolicySchema } from "../zod-schema.agent-runtime-cSDGDkCI.js";
import { r as buildChannelConfigSchema } from "../config-schema-BEuKmAWr.js";
import { d as resolveOutboundMediaUrls, h as sendMediaWithLeadingCaption, i as deliverTextOrMediaReply, l as isNumericTargetId, p as resolveSendableOutboundReplyParts, y as sendPayloadWithChunkedTextAndMedia } from "../reply-payload-Dp5nBPsr.js";
import { n as deleteAccountFromConfigSection, r as setAccountEnabledInConfigSection } from "../config-helpers-C78vnTXw.js";
import { n as isDangerousNameMatchingEnabled } from "../dangerous-name-matching-CMg2IF_2.js";
import { t as createAccountListHelpers } from "../account-helpers-A6tF0W1f.js";
import { n as formatPairingApproveHint } from "../helpers-C-YC9Mfg.js";
import { n as emptyPluginConfigSchema } from "../config-schema-BTVf9GZX.js";
import { l as patchScopedAccountConfig, n as applySetupAccountConfigPatch, s as migrateBaseNameToDefaultAccount, t as applyAccountNameToChannelSection } from "../setup-helpers-BiAtGxsL.js";
import { i as mergeAllowlist, o as summarizeMapping } from "../resolve-utils-DApDdMGF.js";
import { t as formatAllowFromLowercase } from "../allow-from-DjymPYUA.js";
import { a as warnMissingProviderGroupPolicyFallbackOnce, i as resolveOpenProviderRuntimeGroupPolicy, r as resolveDefaultGroupPolicy } from "../runtime-group-policy-DxOE0SLn.js";
import { a as resolveSenderScopedGroupPolicy, t as evaluateGroupRouteAccessForPolicy } from "../group-access-agsrqQrw.js";
import { X as setTopLevelChannelDmPolicyWithAllowFrom, t as addWildcardAllowFrom, v as mergeAllowFromEntries } from "../setup-wizard-helpers-ecC16ic3.js";
import { t as createChannelReplyPipeline } from "../channel-reply-pipeline-DkatqAK5.js";
import { n as createChannelPairingController } from "../channel-pairing-DrJTvhRN.js";
import { t as buildBaseAccountStatusSnapshot } from "../status-helpers-ChR3_7qO.js";
import { t as formatResolvedUnresolvedNote } from "../setup-Dp8bIdbL.js";
import { t as createOptionalChannelSetupSurface } from "../channel-setup-B910pSi0.js";
import { t as loadOutboundMediaFromUrl } from "../outbound-media-55sTJsgk.js";
import { t as chunkTextForOutbound } from "../text-chunking-BQ3u22Jv.js";
import { n as resolveSenderCommandAuthorization } from "../command-auth-Bpii4TsA.js";
import { n as resolveMentionGatingWithBypass } from "../mention-gating-ChSbLk0u.js";
import { r as buildChannelSendResult } from "../channel-send-result-6453QwSe.js";
import { t as resolveChannelAccountConfigBasePath } from "../config-paths-RxxgmOBI.js";
//#region src/plugin-sdk/zalouser.ts
const zalouserSetup = createOptionalChannelSetupSurface({
	channel: "zalouser",
	label: "Zalo Personal",
	npmSpec: "@openclaw/zalouser",
	docsPath: "/channels/zalouser"
});
const zalouserSetupAdapter = zalouserSetup.setupAdapter;
const zalouserSetupWizard = zalouserSetup.setupWizard;
//#endregion
export { DEFAULT_ACCOUNT_ID, MarkdownConfigSchema, ToolPolicySchema, addWildcardAllowFrom, applyAccountNameToChannelSection, applySetupAccountConfigPatch, buildBaseAccountStatusSnapshot, buildChannelConfigSchema, buildChannelSendResult, chunkTextForOutbound, createAccountListHelpers, createChannelPairingController, createChannelReplyPipeline, deleteAccountFromConfigSection, deliverTextOrMediaReply, emptyPluginConfigSchema, evaluateGroupRouteAccessForPolicy, formatAllowFromLowercase, formatPairingApproveHint, formatResolvedUnresolvedNote, isDangerousNameMatchingEnabled, isNumericTargetId, loadOutboundMediaFromUrl, mergeAllowFromEntries, mergeAllowlist, migrateBaseNameToDefaultAccount, normalizeAccountId, patchScopedAccountConfig, resolveChannelAccountConfigBasePath, resolveDefaultGroupPolicy, resolveMentionGatingWithBypass, resolveOpenProviderRuntimeGroupPolicy, resolveOutboundMediaUrls, resolvePreferredOpenClawTmpDir, resolveSendableOutboundReplyParts, resolveSenderCommandAuthorization, resolveSenderScopedGroupPolicy, sendMediaWithLeadingCaption, sendPayloadWithChunkedTextAndMedia, setAccountEnabledInConfigSection, setTopLevelChannelDmPolicyWithAllowFrom, summarizeMapping, warnMissingProviderGroupPolicyFallbackOnce, zalouserSetupAdapter, zalouserSetupWizard };
