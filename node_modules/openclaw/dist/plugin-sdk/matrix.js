import { n as redactSensitiveText } from "../redact-BDinS1q9.js";
import { s as getChatChannelMeta } from "../registry-DldQsVOb.js";
import { t as formatDocsLink } from "../links-BFfjc3N-.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID, u as resolveAgentIdFromSessionKey, v as normalizeOptionalAccountId } from "../session-key-BR3Z-ljs.js";
import { r as normalizeStringEntries } from "../string-normalization-CvImYLpT.js";
import { i as resolveChannelEntryMatch, n as buildChannelKeyCandidates } from "../channel-config-DH9ug5w9.js";
import { i as resolveAllowlistMatchByCandidates, n as formatAllowlistMatchMeta, o as resolveCompiledAllowlistMatch, r as resolveAllowlistCandidates, t as compileAllowlist } from "../allowlist-match-BwqmzAfd.js";
import { m as MarkdownConfigSchema } from "../zod-schema.core-BITC5-JP.js";
import { a as hasConfiguredSecretInput, c as normalizeResolvedSecretInputString, l as normalizeSecretInputString } from "../types.secrets-BZdSA8i7.js";
import { o as ToolPolicySchema } from "../zod-schema.agent-runtime-cSDGDkCI.js";
import { r as buildChannelConfigSchema } from "../config-schema-BEuKmAWr.js";
import { i as isPrivateOrLoopbackHost } from "../net-DwNAtbJy.js";
import { c as jsonResult, d as readNumberParam, f as readReactionParams, h as readStringParam, i as createActionGate, p as readStringArrayParam } from "../common-B7pbdYUb.js";
import { n as fetchWithSsrFGuard } from "../fetch-guard-Bl48brXk.js";
import { t as resolveAckReaction } from "../identity-BnWdHPUW.js";
import { n as normalizePollInput } from "../polls-DHTlCLT8.js";
import { r as getAgentScopedMediaLocalRoots } from "../local-roots-Dk1WAJor.js";
import { t as resolveOutboundSendDep } from "../send-deps-CVbk0lDS.js";
import { n as deleteAccountFromConfigSection, r as setAccountEnabledInConfigSection } from "../config-helpers-C78vnTXw.js";
import { a as registerSessionBindingAdapter, o as unregisterSessionBindingAdapter, r as getSessionBindingService } from "../session-binding-service-1Qw5xtDF.js";
import { n as writeJsonFileAtomically, t as readJsonFileWithFallback } from "../json-store-DmPegdww.js";
import { n as resolveRuntimeEnv, t as createLoggerBackedRuntime } from "../runtime-logger-BnKnijEj.js";
import "../runtime-C9er17zX.js";
import { h as resolveThreadBindingFarewellText, l as resolveThreadBindingMaxAgeMsForChannel, o as resolveThreadBindingIdleTimeoutMsForChannel } from "../thread-bindings-policy-C5NA_pbl.js";
import { t as createAccountListHelpers } from "../account-helpers-A6tF0W1f.js";
import { n as formatPairingApproveHint } from "../helpers-C-YC9Mfg.js";
import { n as emptyPluginConfigSchema } from "../config-schema-BTVf9GZX.js";
import { c as moveSingleAccountChannelSectionToDefaultAccount, t as applyAccountNameToChannelSection } from "../setup-helpers-BiAtGxsL.js";
import { n as formatZonedTimestamp } from "../format-datetime-mjlYeCZJ.js";
import { r as buildSecretInputSchema } from "../secret-input-D5U3kuko.js";
import { n as resolveControlCommandGate } from "../command-gating-C6mMbL1P.js";
import { a as patchAllowlistUsersInConfigEntries, i as mergeAllowlist, n as buildAllowlistResolutionSummary, o as summarizeMapping, r as canonicalizeAllowlistWithResolvedIds, t as addAllowlistUserEntriesFromConfigEntry } from "../resolve-utils-DApDdMGF.js";
import { a as warnMissingProviderGroupPolicyFallbackOnce, n as resolveAllowlistProviderRuntimeGroupPolicy, r as resolveDefaultGroupPolicy, t as GROUP_POLICY_BLOCKED_LABEL } from "../runtime-group-policy-DxOE0SLn.js";
import { a as resolveSenderScopedGroupPolicy, t as evaluateGroupRouteAccessForPolicy } from "../group-access-agsrqQrw.js";
import { n as logInboundDrop, r as logTypingFailure } from "../logging-DomMbySE.js";
import { O as promptAccountId, P as promptSingleChannelSecretInput, Z as setTopLevelChannelGroupPolicy, n as buildSingleChannelSecretPromptState, t as addWildcardAllowFrom, v as mergeAllowFromEntries } from "../setup-wizard-helpers-ecC16ic3.js";
import { t as PAIRING_APPROVED_MESSAGE } from "../pairing-message-B1YYl-hh.js";
import { n as createReplyPrefixOptions } from "../reply-prefix-DWH6-cyp.js";
import { t as createTypingCallbacks } from "../typing-DMcCrqyG.js";
import { t as createChannelReplyPipeline } from "../channel-reply-pipeline-DkatqAK5.js";
import { n as createChannelPairingController } from "../channel-pairing-DrJTvhRN.js";
import { c as collectStatusIssuesFromLastError, i as buildProbeChannelStatusSummary, r as buildComputedAccountStatusSnapshot } from "../status-helpers-ChR3_7qO.js";
import { t as runPluginCommandWithTimeout } from "../run-command-BZ6lhcoj.js";
import { t as promptChannelAccessConfig } from "../setup-group-access-Cq1zeHF4.js";
import { t as formatResolvedUnresolvedNote } from "../setup-Dp8bIdbL.js";
import { t as createOptionalChannelSetupSurface } from "../channel-setup-B910pSi0.js";
import { t as loadOutboundMediaFromUrl } from "../outbound-media-55sTJsgk.js";
import { t as chunkTextForOutbound } from "../text-chunking-BQ3u22Jv.js";
import "../channel-plugin-common-CsTcAEqq.js";
import { n as toLocationContext, t as formatLocationText } from "../location-BcUMSJBU.js";
import { n as setMatrixThreadBindingMaxAgeBySessionKey, t as setMatrixThreadBindingIdleTimeoutBySessionKey } from "../matrix-thread-bindings-QB9q-n90.js";
import { a as resolveMatrixAccountStorageRoot, c as resolveMatrixCredentialsPath, i as resolveConfiguredMatrixAccountIds, l as resolveMatrixDefaultOrOnlyAccountId, n as getMatrixScopedEnvVarNames, o as resolveMatrixChannelConfig, r as requiresExplicitMatrixDefaultAccount, s as resolveMatrixCredentialsDir, t as findMatrixAccountEntry, u as resolveMatrixLegacyFlatStoragePaths } from "../matrix-helper-CgYgzVt7.js";
import { n as setMatrixRuntime, t as resolveMatrixAccountStringValues } from "../matrix-runtime-surface-DfieYOj-.js";
import { r as resetMatrixThreadBindingsForTests, t as createMatrixThreadBindingManager } from "../matrix-surface-DAubkGp0.js";
//#region src/plugin-sdk/matrix.ts
const matrixSetup = createOptionalChannelSetupSurface({
	channel: "matrix",
	label: "Matrix",
	npmSpec: "@openclaw/matrix",
	docsPath: "/channels/matrix"
});
const matrixSetupWizard = matrixSetup.setupWizard;
const matrixSetupAdapter = matrixSetup.setupAdapter;
//#endregion
export { DEFAULT_ACCOUNT_ID, GROUP_POLICY_BLOCKED_LABEL, MarkdownConfigSchema, PAIRING_APPROVED_MESSAGE, ToolPolicySchema, addAllowlistUserEntriesFromConfigEntry, addWildcardAllowFrom, applyAccountNameToChannelSection, buildAllowlistResolutionSummary, buildChannelConfigSchema, buildChannelKeyCandidates, buildComputedAccountStatusSnapshot, buildProbeChannelStatusSummary, buildSecretInputSchema, buildSingleChannelSecretPromptState, canonicalizeAllowlistWithResolvedIds, chunkTextForOutbound, collectStatusIssuesFromLastError, compileAllowlist, createAccountListHelpers, createActionGate, createChannelPairingController, createChannelReplyPipeline, createLoggerBackedRuntime, createMatrixThreadBindingManager, createReplyPrefixOptions, createTypingCallbacks, deleteAccountFromConfigSection, emptyPluginConfigSchema, evaluateGroupRouteAccessForPolicy, fetchWithSsrFGuard, findMatrixAccountEntry, formatAllowlistMatchMeta, formatDocsLink, formatLocationText, formatPairingApproveHint, formatResolvedUnresolvedNote, formatZonedTimestamp, getAgentScopedMediaLocalRoots, getChatChannelMeta, getMatrixScopedEnvVarNames, getSessionBindingService, hasConfiguredSecretInput, isPrivateOrLoopbackHost, jsonResult, loadOutboundMediaFromUrl, logInboundDrop, logTypingFailure, matrixSetupAdapter, matrixSetupWizard, mergeAllowFromEntries, mergeAllowlist, moveSingleAccountChannelSectionToDefaultAccount, normalizeAccountId, normalizeOptionalAccountId, normalizePollInput, normalizeResolvedSecretInputString, normalizeSecretInputString, normalizeStringEntries, patchAllowlistUsersInConfigEntries, promptAccountId, promptChannelAccessConfig, promptSingleChannelSecretInput, readJsonFileWithFallback, readNumberParam, readReactionParams, readStringArrayParam, readStringParam, redactSensitiveText, registerSessionBindingAdapter, requiresExplicitMatrixDefaultAccount, resetMatrixThreadBindingsForTests, resolveAckReaction, resolveAgentIdFromSessionKey, resolveAllowlistCandidates, resolveAllowlistMatchByCandidates, resolveAllowlistProviderRuntimeGroupPolicy, resolveChannelEntryMatch, resolveCompiledAllowlistMatch, resolveConfiguredMatrixAccountIds, resolveControlCommandGate, resolveDefaultGroupPolicy, resolveMatrixAccountStorageRoot, resolveMatrixAccountStringValues, resolveMatrixChannelConfig, resolveMatrixCredentialsDir, resolveMatrixCredentialsPath, resolveMatrixDefaultOrOnlyAccountId, resolveMatrixLegacyFlatStoragePaths, resolveOutboundSendDep, resolveRuntimeEnv, resolveSenderScopedGroupPolicy, resolveThreadBindingFarewellText, resolveThreadBindingIdleTimeoutMsForChannel, resolveThreadBindingMaxAgeMsForChannel, runPluginCommandWithTimeout, setAccountEnabledInConfigSection, setMatrixRuntime, setMatrixThreadBindingIdleTimeoutBySessionKey, setMatrixThreadBindingMaxAgeBySessionKey, setTopLevelChannelGroupPolicy, summarizeMapping, toLocationContext, unregisterSessionBindingAdapter, warnMissingProviderGroupPolicyFallbackOnce, writeJsonFileAtomically };
