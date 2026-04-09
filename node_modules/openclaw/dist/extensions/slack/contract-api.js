import { d as vi } from "../../dist-KOGvtMrW.js";
import { A as primeChannelOutboundSendMock, r as loadBundledPluginTestApiSync } from "../../testing-Bm7nQy_i.js";
import { n as secretTargetRegistryEntries, r as collectSlackSecurityAuditFindings, t as collectRuntimeConfigAssignments } from "../../secret-contract-CPZX2SUs.js";
import { a as resolveSlackStreamingMode, i as resolveSlackNativeStreaming, n as formatSlackStreamingBooleanMigrationMessage, t as formatSlackStreamModeMigrationMessage } from "../../streaming-compat-DD36WDEG.js";
//#region extensions/slack/src/doctor-contract.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function normalizeSlackStreamingAliases(params) {
	let updated = params.entry;
	const hadLegacyStreamMode = updated.streamMode !== void 0;
	const legacyStreaming = updated.streaming;
	const beforeStreaming = updated.streaming;
	const beforeNativeStreaming = updated.nativeStreaming;
	const resolvedStreaming = resolveSlackStreamingMode(updated);
	const resolvedNativeStreaming = resolveSlackNativeStreaming(updated);
	if (!(hadLegacyStreamMode || typeof legacyStreaming === "boolean" || typeof legacyStreaming === "string" && legacyStreaming !== resolvedStreaming)) return {
		entry: updated,
		changed: false
	};
	let changed = false;
	if (beforeStreaming !== resolvedStreaming) {
		updated = {
			...updated,
			streaming: resolvedStreaming
		};
		changed = true;
	}
	if (typeof beforeNativeStreaming !== "boolean" || beforeNativeStreaming !== resolvedNativeStreaming) {
		updated = {
			...updated,
			nativeStreaming: resolvedNativeStreaming
		};
		changed = true;
	}
	if (hadLegacyStreamMode) {
		const { streamMode: _ignored, ...rest } = updated;
		updated = rest;
		changed = true;
		params.changes.push(formatSlackStreamModeMigrationMessage(params.pathPrefix, resolvedStreaming));
	}
	if (typeof legacyStreaming === "boolean") params.changes.push(formatSlackStreamingBooleanMigrationMessage(params.pathPrefix, resolvedNativeStreaming));
	else if (typeof legacyStreaming === "string" && legacyStreaming !== resolvedStreaming) params.changes.push(`Normalized ${params.pathPrefix}.streaming (${legacyStreaming}) → (${resolvedStreaming}).`);
	return {
		entry: updated,
		changed
	};
}
function hasLegacySlackStreamingAliases(value) {
	const entry = asObjectRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean" || typeof entry.streaming === "string" && entry.streaming !== resolveSlackStreamingMode(entry);
}
function hasLegacySlackAccountStreamingAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacySlackStreamingAliases(account));
}
const legacyConfigRules = [{
	path: ["channels", "slack"],
	message: "channels.slack.streamMode and boolean channels.slack.streaming are legacy; use channels.slack.streaming and channels.slack.nativeStreaming.",
	match: hasLegacySlackStreamingAliases
}, {
	path: [
		"channels",
		"slack",
		"accounts"
	],
	message: "channels.slack.accounts.<id>.streamMode and boolean channels.slack.accounts.<id>.streaming are legacy; use channels.slack.accounts.<id>.streaming and channels.slack.accounts.<id>.nativeStreaming.",
	match: hasLegacySlackAccountStreamingAliases
}];
function normalizeCompatibilityConfig({ cfg }) {
	const rawEntry = asObjectRecord(cfg.channels?.slack);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	const baseStreaming = normalizeSlackStreamingAliases({
		entry: updated,
		pathPrefix: "channels.slack",
		changes
	});
	updated = baseStreaming.entry;
	changed = changed || baseStreaming.changed;
	const rawAccounts = asObjectRecord(updated.accounts);
	if (rawAccounts) {
		let accountsChanged = false;
		const accounts = { ...rawAccounts };
		for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
			const account = asObjectRecord(rawAccount);
			if (!account) continue;
			const streaming = normalizeSlackStreamingAliases({
				entry: account,
				pathPrefix: `channels.slack.accounts.${accountId}`,
				changes
			});
			if (streaming.changed) {
				accounts[accountId] = streaming.entry;
				accountsChanged = true;
			}
		}
		if (accountsChanged) {
			updated = {
				...updated,
				accounts
			};
			changed = true;
		}
	}
	if (!changed) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				slack: updated
			}
		},
		changes
	};
}
//#endregion
//#region extensions/slack/src/outbound-payload-harness.ts
let slackOutboundCache;
function getSlackOutbound() {
	if (!slackOutboundCache) ({slackOutbound: slackOutboundCache} = loadBundledPluginTestApiSync("slack"));
	return slackOutboundCache;
}
function createSlackOutboundPayloadHarness(params) {
	const sendSlack = vi.fn();
	primeChannelOutboundSendMock(sendSlack, {
		messageId: "sl-1",
		channelId: "C12345",
		ts: "1234.5678"
	}, params.sendResults);
	const ctx = {
		cfg: {},
		to: "C12345",
		text: "",
		payload: params.payload,
		deps: { sendSlack }
	};
	return {
		run: async () => await getSlackOutbound().sendPayload(ctx),
		sendMock: sendSlack,
		to: ctx.to
	};
}
//#endregion
export { collectRuntimeConfigAssignments, collectSlackSecurityAuditFindings, createSlackOutboundPayloadHarness, legacyConfigRules, normalizeCompatibilityConfig, secretTargetRegistryEntries };
