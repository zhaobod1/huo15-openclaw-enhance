import { n as resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir-BobVQuve.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { a as DmPolicySchema, c as GroupPolicySchema, m as MarkdownConfigSchema } from "./zod-schema.core-BITC5-JP.js";
import { o as ToolPolicySchema } from "./zod-schema.agent-runtime-cSDGDkCI.js";
import { n as buildCatchallMultiAccountChannelSchema, r as buildChannelConfigSchema, t as AllowFromListSchema } from "./config-schema-BEuKmAWr.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { l as isNumericTargetId, y as sendPayloadWithChunkedTextAndMedia } from "./reply-payload-Dp5nBPsr.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { n as isDangerousNameMatchingEnabled, t as collectProviderDangerousNameMatchingScopes } from "./dangerous-name-matching-CMg2IF_2.js";
import "./browser-security-runtime-CMb_3kMM.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { n as createStaticReplyToModeResolver } from "./threading-helpers-DainoJbi.js";
import { i as createPatchedAccountSetupAdapter, l as patchScopedAccountConfig } from "./setup-helpers-BiAtGxsL.js";
import "./core-D7mi2qmR.js";
import { t as createAccountStatusSink } from "./channel-lifecycle.core-CEzRKpfY.js";
import { t as formatAllowFromLowercase } from "./allow-from-DjymPYUA.js";
import "./channel-config-schema-BT1Xyv2r.js";
import { t as addWildcardAllowFrom, v as mergeAllowFromEntries } from "./setup-wizard-helpers-ecC16ic3.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-DrJTvhRN.js";
import { d as createDefaultChannelRuntimeState, l as createAsyncComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./runtime-doctor-Ac5edmSG.js";
import { t as formatResolvedUnresolvedNote } from "./setup-Dp8bIdbL.js";
import "./setup-runtime-QdMg-xhs.js";
import "./config-runtime-OuR9WVXH.js";
import "./conversation-runtime-D-TUyzoB.js";
import { t as chunkTextForOutbound } from "./text-chunking-BQ3u22Jv.js";
import { i as coerceStatusIssueAccountId, n as buildPassiveProbedChannelStatusSummary, o as readStatusIssueFields } from "./extension-shared-CKz43ndd.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { a as createEmptyChannelResult, o as createRawChannelSendResultAdapter } from "./channel-send-result-6453QwSe.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import { a as checkZcaAuthenticated, c as resolveDefaultZalouserAccountId, i as resolveZalouserOutboundSessionRoute, l as resolveZalouserAccountSync, n as parseZalouserDirectoryGroupId, r as parseZalouserOutboundTarget, s as listZalouserAccountIds, t as normalizeZalouserTarget } from "./session-route-VcCP_xT9.js";
import { a as resolveZalouserReactionMessageIds, o as buildZalouserGroupCandidates, s as findZalouserGroupEntry, t as getZalouserRuntime } from "./runtime-Bqx5Uax5.js";
import { b as waitForZaloQrLogin, c as logoutZaloProfile, d as resolveZaloGroupsByEntries, i as listZaloFriendsMatching, l as resolveZaloAllowFromEntries, n as getZaloUserInfo, s as listZaloGroupsMatching, t as checkZaloAuthenticated, y as startZaloQrLogin } from "./zalo-js-BtNWSFcP.js";
import { n as isZalouserMutableGroupEntry } from "./security-audit-Dq5ZlmtR.js";
import { i as sendMessageZalouser, n as sendImageZalouser, r as sendLinkZalouser } from "./send-igNBrqKG.js";
import path from "node:path";
import fs from "node:fs/promises";
import { Type } from "@sinclair/typebox";
//#region extensions/zalouser/src/qr-temp-file.ts
async function writeQrDataUrlToTempFile(qrDataUrl, profile) {
	const base64 = (qrDataUrl.trim().match(/^data:image\/png;base64,(.+)$/i)?.[1] ?? "").trim();
	if (!base64) return null;
	const safeProfile = profile.replace(/[^a-zA-Z0-9_-]+/g, "-") || "default";
	const filePath = path.join(resolvePreferredOpenClawTmpDir(), `openclaw-zalouser-qr-${safeProfile}.png`);
	await fs.writeFile(filePath, Buffer.from(base64, "base64"));
	return filePath;
}
const zalouserSetupAdapter = createPatchedAccountSetupAdapter({
	channelKey: "zalouser",
	validateInput: () => null,
	buildPatch: () => ({})
});
//#endregion
//#region extensions/zalouser/src/setup-surface.ts
const channel = "zalouser";
const ZALOUSER_ALLOW_FROM_PLACEHOLDER = "Alice, 123456789, or leave empty to configure later";
const ZALOUSER_GROUPS_PLACEHOLDER = "Family, Work, 123456789, or leave empty for now";
const ZALOUSER_DM_ACCESS_TITLE = "Zalo Personal DM access";
const ZALOUSER_ALLOWLIST_TITLE = "Zalo Personal allowlist";
const ZALOUSER_GROUPS_TITLE = "Zalo groups";
function parseZalouserEntries(raw) {
	return raw.split(/[\n,;]+/g).map((entry) => entry.trim()).filter(Boolean);
}
function setZalouserAccountScopedConfig(cfg, accountId, defaultPatch, accountPatch = defaultPatch) {
	return patchScopedAccountConfig({
		cfg,
		channelKey: channel,
		accountId,
		patch: defaultPatch,
		accountPatch
	});
}
function setZalouserDmPolicy(cfg, accountId, policy) {
	const resolvedAccountId = normalizeAccountId(accountId) ?? "default";
	const resolved = resolveZalouserAccountSync({
		cfg,
		accountId: resolvedAccountId
	});
	return setZalouserAccountScopedConfig(cfg, resolvedAccountId, {
		dmPolicy: policy,
		...policy === "open" ? { allowFrom: addWildcardAllowFrom(resolved.config.allowFrom) } : {}
	}, {
		dmPolicy: policy,
		...policy === "open" ? { allowFrom: addWildcardAllowFrom(resolved.config.allowFrom) } : {}
	});
}
function setZalouserGroupPolicy(cfg, accountId, groupPolicy) {
	return setZalouserAccountScopedConfig(cfg, accountId, { groupPolicy });
}
function setZalouserGroupAllowlist(cfg, accountId, groupKeys) {
	return setZalouserAccountScopedConfig(cfg, accountId, { groups: Object.fromEntries(groupKeys.map((key) => [key, {
		enabled: true,
		requireMention: true
	}])) });
}
function ensureZalouserPluginEnabled(cfg) {
	const next = {
		...cfg,
		plugins: {
			...cfg.plugins,
			entries: {
				...cfg.plugins?.entries,
				zalouser: {
					...cfg.plugins?.entries?.zalouser,
					enabled: true
				}
			}
		}
	};
	const allow = next.plugins?.allow;
	if (!Array.isArray(allow) || allow.includes(channel)) return next;
	return {
		...next,
		plugins: {
			...next.plugins,
			allow: [...allow, channel]
		}
	};
}
async function noteZalouserHelp(prompter) {
	await prompter.note([
		"Zalo Personal Account login via QR code.",
		"",
		"This plugin uses zca-js directly (no external CLI dependency).",
		"",
		`Docs: ${formatDocsLink("/channels/zalouser", "zalouser")}`
	].join("\n"), "Zalo Personal Setup");
}
async function promptZalouserAllowFrom(params) {
	const { cfg, prompter, accountId } = params;
	const resolved = resolveZalouserAccountSync({
		cfg,
		accountId
	});
	const existingAllowFrom = resolved.config.allowFrom ?? [];
	while (true) {
		const entry = await prompter.text({
			message: "Zalouser allowFrom (name or user id)",
			placeholder: ZALOUSER_ALLOW_FROM_PLACEHOLDER,
			initialValue: existingAllowFrom.length > 0 ? existingAllowFrom.join(", ") : void 0
		});
		const parts = parseZalouserEntries(String(entry));
		if (parts.length === 0) {
			await prompter.note([
				"No DM allowlist entries added yet.",
				"Direct chats will stay blocked until you add people later.",
				`Tip: use \`${formatCliCommand("openclaw directory peers list --channel zalouser")}\` to look up people after onboarding.`
			].join("\n"), ZALOUSER_ALLOWLIST_TITLE);
			return setZalouserAccountScopedConfig(cfg, accountId, {
				dmPolicy: "allowlist",
				allowFrom: []
			});
		}
		const resolvedEntries = await resolveZaloAllowFromEntries({
			profile: resolved.profile,
			entries: parts
		});
		const unresolved = resolvedEntries.filter((item) => !item.resolved).map((item) => item.input);
		if (unresolved.length > 0) {
			await prompter.note(`Could not resolve: ${unresolved.join(", ")}. Use numeric user ids or exact friend names.`, ZALOUSER_ALLOWLIST_TITLE);
			continue;
		}
		const unique = mergeAllowFromEntries(existingAllowFrom, resolvedEntries.filter((item) => item.resolved && item.id).map((item) => item.id));
		const notes = resolvedEntries.filter((item) => item.note).map((item) => `${item.input} -> ${item.id} (${item.note})`);
		if (notes.length > 0) await prompter.note(notes.join("\n"), ZALOUSER_ALLOWLIST_TITLE);
		return setZalouserAccountScopedConfig(cfg, accountId, {
			dmPolicy: "allowlist",
			allowFrom: unique
		});
	}
}
const zalouserDmPolicy = {
	label: "Zalo Personal",
	channel,
	policyKey: "channels.zalouser.dmPolicy",
	allowFromKey: "channels.zalouser.allowFrom",
	resolveConfigKeys: (cfg, accountId) => (accountId ?? resolveDefaultZalouserAccountId(cfg)) !== "default" ? {
		policyKey: `channels.zalouser.accounts.${accountId ?? resolveDefaultZalouserAccountId(cfg)}.dmPolicy`,
		allowFromKey: `channels.zalouser.accounts.${accountId ?? resolveDefaultZalouserAccountId(cfg)}.allowFrom`
	} : {
		policyKey: "channels.zalouser.dmPolicy",
		allowFromKey: "channels.zalouser.allowFrom"
	},
	getCurrent: (cfg, accountId) => resolveZalouserAccountSync({
		cfg,
		accountId: accountId ?? resolveDefaultZalouserAccountId(cfg)
	}).config.dmPolicy ?? "pairing",
	setPolicy: (cfg, policy, accountId) => setZalouserDmPolicy(cfg, accountId ?? resolveDefaultZalouserAccountId(cfg), policy),
	promptAllowFrom: async ({ cfg, prompter, accountId }) => {
		return await promptZalouserAllowFrom({
			cfg,
			prompter,
			accountId: accountId && normalizeAccountId(accountId) ? normalizeAccountId(accountId) ?? "default" : resolveDefaultZalouserAccountId(cfg)
		});
	}
};
async function promptZalouserQuickstartDmPolicy(params) {
	const { cfg, prompter, accountId } = params;
	const resolved = resolveZalouserAccountSync({
		cfg,
		accountId
	});
	const existingPolicy = resolved.config.dmPolicy ?? "pairing";
	const existingAllowFrom = resolved.config.allowFrom ?? [];
	const existingLabel = existingAllowFrom.length > 0 ? existingAllowFrom.join(", ") : "unset";
	await prompter.note([
		"Direct chats are configured separately from group chats.",
		"- pairing (default): unknown people get a pairing code",
		"- allowlist: only listed people can DM",
		"- open: anyone can DM",
		"- disabled: ignore DMs",
		"",
		`Current: dmPolicy=${existingPolicy}, allowFrom=${existingLabel}`,
		"If you choose allowlist now, you can leave it empty and add people later."
	].join("\n"), ZALOUSER_DM_ACCESS_TITLE);
	const policy = await prompter.select({
		message: "Zalo Personal DM policy",
		options: [
			{
				value: "pairing",
				label: "Pairing (recommended)"
			},
			{
				value: "allowlist",
				label: "Allowlist (specific users only)"
			},
			{
				value: "open",
				label: "Open (public inbound DMs)"
			},
			{
				value: "disabled",
				label: "Disabled (ignore DMs)"
			}
		],
		initialValue: existingPolicy
	});
	if (policy === "allowlist") return await promptZalouserAllowFrom({
		cfg,
		prompter,
		accountId
	});
	return setZalouserDmPolicy(cfg, accountId, policy);
}
const zalouserSetupWizard = {
	channel,
	status: {
		configuredLabel: "logged in",
		unconfiguredLabel: "needs QR login",
		configuredHint: "recommended · logged in",
		unconfiguredHint: "recommended · QR login",
		configuredScore: 1,
		unconfiguredScore: 15,
		resolveConfigured: async ({ cfg, accountId }) => {
			const ids = accountId ? [accountId] : listZalouserAccountIds(cfg);
			for (const resolvedAccountId of ids) if (await checkZcaAuthenticated(resolveZalouserAccountSync({
				cfg,
				accountId: resolvedAccountId
			}).profile)) return true;
			return false;
		},
		resolveStatusLines: async ({ cfg, accountId, configured }) => {
			return [`${accountId && accountId !== "default" ? `Zalo Personal (${accountId})` : "Zalo Personal"}: ${configured ? "logged in" : "needs QR login"}`];
		}
	},
	prepare: async ({ cfg, accountId, prompter, options }) => {
		let next = cfg;
		const account = resolveZalouserAccountSync({
			cfg: next,
			accountId
		});
		if (!await checkZcaAuthenticated(account.profile)) {
			await noteZalouserHelp(prompter);
			if (await prompter.confirm({
				message: "Login via QR code now?",
				initialValue: true
			})) {
				const start = await startZaloQrLogin({
					profile: account.profile,
					timeoutMs: 35e3
				});
				if (start.qrDataUrl) {
					const qrPath = await writeQrDataUrlToTempFile(start.qrDataUrl, account.profile);
					await prompter.note([
						start.message,
						qrPath ? `QR image saved to: ${qrPath}` : "Could not write QR image file; use gateway web login UI instead.",
						"Scan + approve on phone, then continue."
					].join("\n"), "QR Login");
					if (await prompter.confirm({
						message: "Did you scan and approve the QR on your phone?",
						initialValue: true
					})) {
						const waited = await waitForZaloQrLogin({
							profile: account.profile,
							timeoutMs: 12e4
						});
						await prompter.note(waited.message, waited.connected ? "Success" : "Login pending");
					}
				} else await prompter.note(start.message, "Login pending");
			}
		} else if (!await prompter.confirm({
			message: "Zalo Personal already logged in. Keep session?",
			initialValue: true
		})) {
			await logoutZaloProfile(account.profile);
			const start = await startZaloQrLogin({
				profile: account.profile,
				force: true,
				timeoutMs: 35e3
			});
			if (start.qrDataUrl) {
				const qrPath = await writeQrDataUrlToTempFile(start.qrDataUrl, account.profile);
				await prompter.note([start.message, qrPath ? `QR image saved to: ${qrPath}` : void 0].filter(Boolean).join("\n"), "QR Login");
				const waited = await waitForZaloQrLogin({
					profile: account.profile,
					timeoutMs: 12e4
				});
				await prompter.note(waited.message, waited.connected ? "Success" : "Login pending");
			}
		}
		next = setZalouserAccountScopedConfig(next, accountId, { profile: account.profile !== "default" ? account.profile : void 0 }, {
			profile: account.profile,
			enabled: true
		});
		if (options?.quickstartDefaults) next = await promptZalouserQuickstartDmPolicy({
			cfg: next,
			prompter,
			accountId
		});
		return { cfg: next };
	},
	credentials: [],
	groupAccess: {
		label: "Zalo groups",
		placeholder: ZALOUSER_GROUPS_PLACEHOLDER,
		currentPolicy: ({ cfg, accountId }) => resolveZalouserAccountSync({
			cfg,
			accountId
		}).config.groupPolicy ?? "allowlist",
		currentEntries: ({ cfg, accountId }) => Object.keys(resolveZalouserAccountSync({
			cfg,
			accountId
		}).config.groups ?? {}),
		updatePrompt: ({ cfg, accountId }) => Boolean(resolveZalouserAccountSync({
			cfg,
			accountId
		}).config.groups),
		setPolicy: ({ cfg, accountId, policy }) => setZalouserGroupPolicy(cfg, accountId, policy),
		resolveAllowlist: async ({ cfg, accountId, entries, prompter }) => {
			if (entries.length === 0) {
				await prompter.note([
					"No group allowlist entries added yet.",
					"Group chats will stay blocked until you add groups later.",
					`Tip: use \`${formatCliCommand("openclaw directory groups list --channel zalouser")}\` after onboarding to find group IDs.`,
					"Mention requirement stays on by default for groups you allow later."
				].join("\n"), ZALOUSER_GROUPS_TITLE);
				return [];
			}
			const updatedAccount = resolveZalouserAccountSync({
				cfg,
				accountId
			});
			try {
				const resolved = await resolveZaloGroupsByEntries({
					profile: updatedAccount.profile,
					entries
				});
				const resolvedIds = resolved.filter((entry) => entry.resolved && entry.id).map((entry) => entry.id);
				const unresolved = resolved.filter((entry) => !entry.resolved).map((entry) => entry.input);
				const keys = [...resolvedIds, ...unresolved.map((entry) => entry.trim()).filter(Boolean)];
				const resolution = formatResolvedUnresolvedNote({
					resolved: resolvedIds,
					unresolved
				});
				if (resolution) await prompter.note(resolution, ZALOUSER_GROUPS_TITLE);
				return keys;
			} catch (err) {
				await prompter.note(`Group lookup failed; keeping entries as typed. ${String(err)}`, ZALOUSER_GROUPS_TITLE);
				return entries.map((entry) => entry.trim()).filter(Boolean);
			}
		},
		applyAllowlist: ({ cfg, accountId, resolved }) => setZalouserGroupAllowlist(cfg, accountId, resolved)
	},
	finalize: async ({ cfg, accountId, forceAllowFrom, options, prompter }) => {
		let next = cfg;
		if (forceAllowFrom && !options?.quickstartDefaults) next = await promptZalouserAllowFrom({
			cfg: next,
			prompter,
			accountId
		});
		return { cfg: ensureZalouserPluginEnabled(next) };
	},
	dmPolicy: zalouserDmPolicy
};
//#endregion
//#region extensions/zalouser/src/config-schema.ts
const groupConfigSchema = zod_exports.z.object({
	enabled: zod_exports.z.boolean().optional(),
	requireMention: zod_exports.z.boolean().optional(),
	tools: ToolPolicySchema
});
const ZalouserConfigSchema = buildCatchallMultiAccountChannelSchema(zod_exports.z.object({
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	markdown: MarkdownConfigSchema,
	profile: zod_exports.z.string().optional(),
	dangerouslyAllowNameMatching: zod_exports.z.boolean().optional(),
	dmPolicy: DmPolicySchema.optional(),
	allowFrom: AllowFromListSchema,
	historyLimit: zod_exports.z.number().int().min(0).optional(),
	groupAllowFrom: AllowFromListSchema,
	groupPolicy: GroupPolicySchema.optional().default("allowlist"),
	groups: zod_exports.z.object({}).catchall(groupConfigSchema).optional(),
	messagePrefix: zod_exports.z.string().optional(),
	responsePrefix: zod_exports.z.string().optional()
}));
//#endregion
//#region extensions/zalouser/src/doctor.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function sanitizeForLog(value) {
	return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
function hasLegacyZalouserGroupAllowAlias(value) {
	const group = asObjectRecord(value);
	return Boolean(group && typeof group.allow === "boolean");
}
function hasLegacyZalouserGroupAllowAliases(value) {
	const groups = asObjectRecord(value);
	return Boolean(groups && Object.values(groups).some((group) => hasLegacyZalouserGroupAllowAlias(group)));
}
function hasLegacyZalouserAccountGroupAllowAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => {
		const accountRecord = asObjectRecord(account);
		return Boolean(accountRecord && hasLegacyZalouserGroupAllowAliases(accountRecord.groups));
	});
}
function normalizeZalouserGroupAllowAliases(params) {
	let changed = false;
	const nextGroups = { ...params.groups };
	for (const [groupId, groupValue] of Object.entries(params.groups)) {
		const group = asObjectRecord(groupValue);
		if (!group || typeof group.allow !== "boolean") continue;
		const nextGroup = { ...group };
		if (typeof nextGroup.enabled !== "boolean") nextGroup.enabled = group.allow;
		delete nextGroup.allow;
		nextGroups[groupId] = nextGroup;
		changed = true;
		params.changes.push(`Moved ${params.pathPrefix}.${groupId}.allow → ${params.pathPrefix}.${groupId}.enabled (${String(nextGroup.enabled)}).`);
	}
	return {
		groups: nextGroups,
		changed
	};
}
function normalizeZalouserCompatibilityConfig(cfg) {
	const zalouser = asObjectRecord(asObjectRecord(cfg.channels)?.zalouser);
	if (!zalouser) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updatedZalouser = zalouser;
	let changed = false;
	const groups = asObjectRecord(updatedZalouser.groups);
	if (groups) {
		const normalized = normalizeZalouserGroupAllowAliases({
			groups,
			pathPrefix: "channels.zalouser.groups",
			changes
		});
		if (normalized.changed) {
			updatedZalouser = {
				...updatedZalouser,
				groups: normalized.groups
			};
			changed = true;
		}
	}
	const accounts = asObjectRecord(updatedZalouser.accounts);
	if (accounts) {
		let accountsChanged = false;
		const nextAccounts = { ...accounts };
		for (const [accountId, accountValue] of Object.entries(accounts)) {
			const account = asObjectRecord(accountValue);
			if (!account) continue;
			const accountGroups = asObjectRecord(account.groups);
			if (!accountGroups) continue;
			const normalized = normalizeZalouserGroupAllowAliases({
				groups: accountGroups,
				pathPrefix: `channels.zalouser.accounts.${accountId}.groups`,
				changes
			});
			if (!normalized.changed) continue;
			nextAccounts[accountId] = {
				...account,
				groups: normalized.groups
			};
			accountsChanged = true;
		}
		if (accountsChanged) {
			updatedZalouser = {
				...updatedZalouser,
				accounts: nextAccounts
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
				zalouser: updatedZalouser
			}
		},
		changes
	};
}
const ZALOUSER_LEGACY_CONFIG_RULES = [{
	path: [
		"channels",
		"zalouser",
		"groups"
	],
	message: "channels.zalouser.groups.<id>.allow is legacy; use channels.zalouser.groups.<id>.enabled instead. Run \"openclaw doctor --fix\".",
	match: hasLegacyZalouserGroupAllowAliases
}, {
	path: [
		"channels",
		"zalouser",
		"accounts"
	],
	message: "channels.zalouser.accounts.<id>.groups.<id>.allow is legacy; use channels.zalouser.accounts.<id>.groups.<id>.enabled instead. Run \"openclaw doctor --fix\".",
	match: hasLegacyZalouserAccountGroupAllowAliases
}];
function collectZalouserMutableAllowlistWarnings(cfg) {
	const hits = [];
	for (const scope of collectProviderDangerousNameMatchingScopes(cfg, "zalouser")) {
		if (scope.dangerousNameMatchingEnabled) continue;
		const groups = asObjectRecord(scope.account.groups);
		if (!groups) continue;
		for (const entry of Object.keys(groups)) if (isZalouserMutableGroupEntry(entry)) hits.push({
			path: `${scope.prefix}.groups`,
			entry
		});
	}
	if (hits.length === 0) return [];
	const exampleLines = hits.slice(0, 8).map((hit) => `- ${sanitizeForLog(hit.path)}: ${sanitizeForLog(hit.entry)}`);
	const remaining = hits.length > 8 ? `- +${hits.length - 8} more mutable allowlist entries.` : null;
	return [
		`- Found ${hits.length} mutable allowlist ${hits.length === 1 ? "entry" : "entries"} across zalouser while name matching is disabled by default.`,
		...exampleLines,
		...remaining ? [remaining] : [],
		"- Option A (break-glass): enable channels.zalouser.dangerousNameMatching=true for the affected scope.",
		"- Option B (recommended): resolve mutable group names to stable IDs and rewrite the allowlist entries."
	];
}
const zalouserDoctor = {
	dmAllowFromMode: "topOnly",
	groupModel: "hybrid",
	groupAllowFromFallbackToAllowFrom: false,
	warnOnEmptyGroupSenderAllowlist: false,
	legacyConfigRules: ZALOUSER_LEGACY_CONFIG_RULES,
	normalizeCompatibilityConfig: ({ cfg }) => normalizeZalouserCompatibilityConfig(cfg),
	collectMutableAllowlistWarnings: ({ cfg }) => collectZalouserMutableAllowlistWarnings(cfg)
};
//#endregion
//#region extensions/zalouser/src/shared.ts
const zalouserMeta = {
	id: "zalouser",
	label: "Zalo Personal",
	selectionLabel: "Zalo (Personal Account)",
	docsPath: "/channels/zalouser",
	docsLabel: "zalouser",
	blurb: "Zalo personal account via QR code login.",
	aliases: ["zlu"],
	order: 85,
	quickstartAllowFrom: false
};
const zalouserConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: "zalouser",
	listAccountIds: listZalouserAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveZalouserAccountSync),
	defaultAccountId: resolveDefaultZalouserAccountId,
	clearBaseFields: [
		"profile",
		"name",
		"dmPolicy",
		"allowFrom",
		"historyLimit",
		"groupAllowFrom",
		"groupPolicy",
		"groups",
		"messagePrefix"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({
		allowFrom,
		stripPrefixRe: /^(zalouser|zlu):/i
	})
});
function createZalouserPluginBase(params) {
	return {
		id: "zalouser",
		meta: zalouserMeta,
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: ["direct", "group"],
			media: true,
			reactions: true,
			threads: false,
			polls: false,
			nativeCommands: false,
			blockStreaming: true
		},
		doctor: zalouserDoctor,
		reload: { configPrefixes: ["channels.zalouser"] },
		configSchema: buildChannelConfigSchema(ZalouserConfigSchema),
		config: {
			...zalouserConfigAdapter,
			isConfigured: async (account) => await checkZcaAuthenticated(account.profile),
			describeAccount: (account) => describeAccountSnapshot({ account })
		},
		setup: params.setup
	};
}
//#endregion
//#region extensions/zalouser/src/status-issues.ts
const ZALOUSER_STATUS_FIELDS = [
	"accountId",
	"enabled",
	"configured",
	"dmPolicy",
	"lastError"
];
function collectZalouserStatusIssues(accounts) {
	const issues = [];
	for (const entry of accounts) {
		const account = readStatusIssueFields(entry, ZALOUSER_STATUS_FIELDS);
		if (!account) continue;
		const accountId = coerceStatusIssueAccountId(account.accountId) ?? "default";
		if (!(account.enabled !== false)) continue;
		if (!(account.configured === true)) {
			issues.push({
				channel: "zalouser",
				accountId,
				kind: "auth",
				message: "Not authenticated (no saved Zalo session).",
				fix: "Run: openclaw channels login --channel zalouser"
			});
			continue;
		}
		if (account.dmPolicy === "open") issues.push({
			channel: "zalouser",
			accountId,
			kind: "config",
			message: "Zalo Personal dmPolicy is \"open\", allowing any user to message the bot without pairing.",
			fix: "Set channels.zalouser.dmPolicy to \"pairing\" or \"allowlist\" to restrict access."
		});
	}
	return issues;
}
//#endregion
//#region extensions/zalouser/src/channel.ts
const loadZalouserChannelRuntime = createLazyRuntimeModule(() => import("./channel.runtime-BwDP4kTE.js"));
const ZALOUSER_TEXT_CHUNK_LIMIT = 2e3;
const zalouserRawSendResultAdapter = createRawChannelSendResultAdapter({
	channel: "zalouser",
	sendText: async ({ to, text, accountId, cfg }) => {
		const { sendMessageZalouser } = await loadZalouserChannelRuntime();
		const account = resolveZalouserAccountSync({
			cfg,
			accountId
		});
		const target = parseZalouserOutboundTarget(to);
		return await sendMessageZalouser(target.threadId, text, {
			profile: account.profile,
			isGroup: target.isGroup,
			textMode: "markdown",
			textChunkMode: resolveZalouserOutboundChunkMode(cfg, account.accountId),
			textChunkLimit: resolveZalouserOutboundTextChunkLimit(cfg, account.accountId)
		});
	},
	sendMedia: async ({ to, text, mediaUrl, accountId, cfg, mediaLocalRoots, mediaReadFile }) => {
		const { sendMessageZalouser } = await loadZalouserChannelRuntime();
		const account = resolveZalouserAccountSync({
			cfg,
			accountId
		});
		const target = parseZalouserOutboundTarget(to);
		return await sendMessageZalouser(target.threadId, text, {
			profile: account.profile,
			isGroup: target.isGroup,
			mediaUrl,
			mediaLocalRoots,
			mediaReadFile,
			textMode: "markdown",
			textChunkMode: resolveZalouserOutboundChunkMode(cfg, account.accountId),
			textChunkLimit: resolveZalouserOutboundTextChunkLimit(cfg, account.accountId)
		});
	}
});
function resolveZalouserQrProfile(accountId) {
	const normalized = normalizeAccountId(accountId);
	if (!normalized || normalized === "default") return process.env.ZALOUSER_PROFILE?.trim() || process.env.ZCA_PROFILE?.trim() || "default";
	return normalized;
}
function resolveZalouserOutboundChunkMode(cfg, accountId) {
	return getZalouserRuntime().channel.text.resolveChunkMode(cfg, "zalouser", accountId);
}
function resolveZalouserOutboundTextChunkLimit(cfg, accountId) {
	return getZalouserRuntime().channel.text.resolveTextChunkLimit(cfg, "zalouser", accountId, { fallbackLimit: ZALOUSER_TEXT_CHUNK_LIMIT });
}
function mapUser(params) {
	return {
		kind: "user",
		id: params.id,
		name: params.name ?? void 0,
		avatarUrl: params.avatarUrl ?? void 0,
		raw: params.raw
	};
}
function mapGroup(params) {
	return {
		kind: "group",
		id: params.id,
		name: params.name ?? void 0,
		raw: params.raw
	};
}
function resolveZalouserGroupPolicyEntry(params) {
	const account = resolveZalouserAccountSync({
		cfg: params.cfg,
		accountId: params.accountId ?? void 0
	});
	return findZalouserGroupEntry(account.config.groups ?? {}, buildZalouserGroupCandidates({
		groupId: params.groupId,
		groupChannel: params.groupChannel,
		includeWildcard: true,
		allowNameMatching: isDangerousNameMatchingEnabled(account.config)
	}));
}
function resolveZalouserGroupToolPolicy(params) {
	return resolveZalouserGroupPolicyEntry(params)?.tools;
}
function resolveZalouserRequireMention(params) {
	const entry = resolveZalouserGroupPolicyEntry(params);
	if (typeof entry?.requireMention === "boolean") return entry.requireMention;
	return true;
}
const resolveZalouserDmPolicy = createScopedDmSecurityResolver({
	channelKey: "zalouser",
	resolvePolicy: (account) => account.config.dmPolicy,
	resolveAllowFrom: (account) => account.config.allowFrom,
	policyPathSuffix: "dmPolicy",
	normalizeEntry: (raw) => raw.trim().replace(/^(zalouser|zlu):/i, "")
});
const zalouserMessageActions = {
	describeMessageTool: ({ cfg, accountId }) => {
		if ((accountId ? [resolveZalouserAccountSync({
			cfg,
			accountId
		})].filter((account) => account.enabled) : listZalouserAccountIds(cfg).map((resolvedAccountId) => resolveZalouserAccountSync({
			cfg,
			accountId: resolvedAccountId
		})).filter((account) => account.enabled)).length === 0) return null;
		return { actions: ["react"] };
	},
	supportsAction: ({ action }) => action === "react",
	handleAction: async ({ action, params, cfg, accountId, toolContext }) => {
		if (action !== "react") throw new Error(`Zalouser action ${action} not supported`);
		const { sendReactionZalouser } = await loadZalouserChannelRuntime();
		const account = resolveZalouserAccountSync({
			cfg,
			accountId
		});
		const threadId = (typeof params.threadId === "string" ? params.threadId.trim() : "") || (typeof params.to === "string" ? params.to.trim() : "") || (typeof params.chatId === "string" ? params.chatId.trim() : "") || (toolContext?.currentChannelId?.trim() ?? "");
		if (!threadId) throw new Error("Zalouser react requires threadId (or to/chatId).");
		const emoji = typeof params.emoji === "string" ? params.emoji.trim() : "";
		if (!emoji) throw new Error("Zalouser react requires emoji.");
		const ids = resolveZalouserReactionMessageIds({
			messageId: typeof params.messageId === "string" ? params.messageId : void 0,
			cliMsgId: typeof params.cliMsgId === "string" ? params.cliMsgId : void 0,
			currentMessageId: toolContext?.currentMessageId
		});
		if (!ids) throw new Error("Zalouser react requires messageId + cliMsgId (or a current message context id).");
		const result = await sendReactionZalouser({
			profile: account.profile,
			threadId,
			isGroup: params.isGroup === true,
			msgId: ids.msgId,
			cliMsgId: ids.cliMsgId,
			emoji,
			remove: params.remove === true
		});
		if (!result.ok) throw new Error(result.error || "Failed to react on Zalo message");
		return {
			content: [{
				type: "text",
				text: params.remove === true ? `Removed reaction ${emoji} from ${ids.msgId}` : `Reacted ${emoji} on ${ids.msgId}`
			}],
			details: {
				messageId: ids.msgId,
				cliMsgId: ids.cliMsgId,
				threadId
			}
		};
	}
};
const zalouserPlugin = createChatChannelPlugin({
	base: {
		...createZalouserPluginBase({
			setupWizard: zalouserSetupWizard,
			setup: zalouserSetupAdapter
		}),
		groups: {
			resolveRequireMention: resolveZalouserRequireMention,
			resolveToolPolicy: resolveZalouserGroupToolPolicy
		},
		actions: zalouserMessageActions,
		messaging: {
			normalizeTarget: (raw) => normalizeZalouserTarget(raw),
			resolveOutboundSessionRoute: (params) => resolveZalouserOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: (raw) => {
					const normalized = normalizeZalouserTarget(raw);
					if (!normalized) return false;
					if (/^group:[^\s]+$/i.test(normalized) || /^user:[^\s]+$/i.test(normalized)) return true;
					return isNumericTargetId(normalized);
				},
				hint: "<user:id|group:id>"
			}
		},
		directory: {
			self: async ({ cfg, accountId }) => {
				const { getZaloUserInfo } = await loadZalouserChannelRuntime();
				const parsed = await getZaloUserInfo(resolveZalouserAccountSync({
					cfg,
					accountId
				}).profile);
				if (!parsed?.userId) return null;
				return mapUser({
					id: String(parsed.userId),
					name: parsed.displayName ?? null,
					avatarUrl: parsed.avatar ?? null,
					raw: parsed
				});
			},
			listPeers: async ({ cfg, accountId, query, limit }) => {
				const { listZaloFriendsMatching } = await loadZalouserChannelRuntime();
				const rows = (await listZaloFriendsMatching(resolveZalouserAccountSync({
					cfg,
					accountId
				}).profile, query)).map((friend) => mapUser({
					id: String(friend.userId),
					name: friend.displayName ?? null,
					avatarUrl: friend.avatar ?? null,
					raw: friend
				}));
				return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows;
			},
			listGroups: async ({ cfg, accountId, query, limit }) => {
				const { listZaloGroupsMatching } = await loadZalouserChannelRuntime();
				const rows = (await listZaloGroupsMatching(resolveZalouserAccountSync({
					cfg,
					accountId
				}).profile, query)).map((group) => mapGroup({
					id: `group:${String(group.groupId)}`,
					name: group.name ?? null,
					raw: group
				}));
				return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows;
			},
			listGroupMembers: async ({ cfg, accountId, groupId, limit }) => {
				const { listZaloGroupMembers } = await loadZalouserChannelRuntime();
				const account = resolveZalouserAccountSync({
					cfg,
					accountId
				});
				const normalizedGroupId = parseZalouserDirectoryGroupId(groupId);
				const rows = (await listZaloGroupMembers(account.profile, normalizedGroupId)).map((member) => mapUser({
					id: member.userId,
					name: member.displayName,
					avatarUrl: member.avatar ?? null,
					raw: member
				}));
				return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows;
			}
		},
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind, runtime }) => {
			const results = [];
			for (const input of inputs) {
				const trimmed = input.trim();
				if (!trimmed) {
					results.push({
						input,
						resolved: false,
						note: "empty input"
					});
					continue;
				}
				if (/^\d+$/.test(trimmed)) {
					results.push({
						input,
						resolved: true,
						id: trimmed
					});
					continue;
				}
				try {
					const runtimeModule = await loadZalouserChannelRuntime();
					const account = resolveZalouserAccountSync({
						cfg,
						accountId: accountId ?? resolveDefaultZalouserAccountId(cfg)
					});
					if (kind === "user") {
						const friends = await runtimeModule.listZaloFriendsMatching(account.profile, trimmed);
						const best = friends[0];
						results.push({
							input,
							resolved: Boolean(best?.userId),
							id: best?.userId,
							name: best?.displayName,
							note: friends.length > 1 ? "multiple matches; chose first" : void 0
						});
					} else {
						const groups = await runtimeModule.listZaloGroupsMatching(account.profile, trimmed);
						const best = groups.find((group) => group.name.toLowerCase() === trimmed.toLowerCase()) ?? groups[0];
						results.push({
							input,
							resolved: Boolean(best?.groupId),
							id: best?.groupId,
							name: best?.name,
							note: groups.length > 1 ? "multiple matches; chose first" : void 0
						});
					}
				} catch (err) {
					runtime.error?.(`zalouser resolve failed: ${String(err)}`);
					results.push({
						input,
						resolved: false,
						note: "lookup failed"
					});
				}
			}
			return results;
		} },
		auth: { login: async ({ cfg, accountId, runtime }) => {
			const { startZaloQrLogin, waitForZaloQrLogin } = await loadZalouserChannelRuntime();
			const account = resolveZalouserAccountSync({
				cfg,
				accountId: accountId ?? resolveDefaultZalouserAccountId(cfg)
			});
			runtime.log(`Generating QR login for Zalo Personal (account: ${account.accountId}, profile: ${account.profile})...`);
			const started = await startZaloQrLogin({
				profile: account.profile,
				timeoutMs: 35e3
			});
			if (!started.qrDataUrl) throw new Error(started.message || "Failed to start QR login");
			const qrPath = await writeQrDataUrlToTempFile(started.qrDataUrl, account.profile);
			if (qrPath) runtime.log(`Scan QR image: ${qrPath}`);
			else runtime.log("QR generated but could not be written to a temp file.");
			const waited = await waitForZaloQrLogin({
				profile: account.profile,
				timeoutMs: 18e4
			});
			if (!waited.connected) throw new Error(waited.message || "Zalouser login failed");
			runtime.log(waited.message);
		} },
		status: createAsyncComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: collectZalouserStatusIssues,
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot),
			probeAccount: async ({ account, timeoutMs }) => (await loadZalouserChannelRuntime()).probeZalouser(account.profile, timeoutMs),
			resolveAccountSnapshot: async ({ account, runtime }) => {
				const configured = await checkZcaAuthenticated(account.profile);
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured,
					extra: {
						dmPolicy: account.config.dmPolicy ?? "pairing",
						lastError: configured ? runtime?.lastError ?? null : runtime?.lastError ?? "not authenticated"
					}
				};
			}
		}),
		gateway: {
			startAccount: async (ctx) => {
				const { getZaloUserInfo } = await loadZalouserChannelRuntime();
				const account = ctx.account;
				let userLabel = "";
				try {
					const userInfo = await getZaloUserInfo(account.profile);
					if (userInfo?.displayName) userLabel = ` (${userInfo.displayName})`;
					ctx.setStatus({
						accountId: account.accountId,
						profile: userInfo
					});
				} catch {}
				const statusSink = createAccountStatusSink({
					accountId: ctx.accountId,
					setStatus: ctx.setStatus
				});
				ctx.log?.info(`[${account.accountId}] starting zalouser provider${userLabel}`);
				const { monitorZalouserProvider } = await import("./monitor-Di6Ukq78.js");
				return monitorZalouserProvider({
					account,
					config: ctx.cfg,
					runtime: ctx.runtime,
					abortSignal: ctx.abortSignal,
					statusSink
				});
			},
			loginWithQrStart: async (params) => {
				const { startZaloQrLogin } = await loadZalouserChannelRuntime();
				return await startZaloQrLogin({
					profile: resolveZalouserQrProfile(params.accountId),
					force: params.force,
					timeoutMs: params.timeoutMs
				});
			},
			loginWithQrWait: async (params) => {
				const { waitForZaloQrLogin } = await loadZalouserChannelRuntime();
				return await waitForZaloQrLogin({
					profile: resolveZalouserQrProfile(params.accountId),
					timeoutMs: params.timeoutMs
				});
			},
			logoutAccount: async (ctx) => await (await loadZalouserChannelRuntime()).logoutZaloProfile(ctx.account.profile || resolveZalouserQrProfile(ctx.accountId))
		}
	},
	security: {
		resolveDmPolicy: resolveZalouserDmPolicy,
		collectAuditFindings: async (params) => (await loadZalouserChannelRuntime()).collectZalouserSecurityAuditFindings(params)
	},
	threading: { resolveReplyToMode: createStaticReplyToModeResolver("off") },
	pairing: { text: {
		idLabel: "zalouserUserId",
		message: "Your pairing request has been approved.",
		normalizeAllowEntry: createPairingPrefixStripper(/^(zalouser|zlu):/i),
		notify: async ({ cfg, id, message }) => {
			const { sendMessageZalouser } = await loadZalouserChannelRuntime();
			const account = resolveZalouserAccountSync({ cfg });
			if (!await checkZcaAuthenticated(account.profile)) throw new Error("Zalouser not authenticated");
			await sendMessageZalouser(id, message, { profile: account.profile });
		}
	} },
	outbound: {
		deliveryMode: "direct",
		chunker: chunkTextForOutbound,
		chunkerMode: "markdown",
		sendPayload: async (ctx) => await sendPayloadWithChunkedTextAndMedia({
			ctx,
			sendText: (nextCtx) => zalouserRawSendResultAdapter.sendText(nextCtx),
			sendMedia: (nextCtx) => zalouserRawSendResultAdapter.sendMedia(nextCtx),
			emptyResult: createEmptyChannelResult("zalouser")
		}),
		...zalouserRawSendResultAdapter
	}
});
//#endregion
//#region extensions/zalouser/src/channel.setup.ts
const zalouserSetupPlugin = { ...createZalouserPluginBase({
	setupWizard: zalouserSetupWizard,
	setup: zalouserSetupAdapter
}) };
//#endregion
//#region extensions/zalouser/src/tool.ts
const ACTIONS = [
	"send",
	"image",
	"link",
	"friends",
	"groups",
	"me",
	"status"
];
function stringEnum(values, options = {}) {
	return Type.Unsafe({
		type: "string",
		enum: [...values],
		...options
	});
}
const ZalouserToolSchema = Type.Object({
	action: stringEnum(ACTIONS, { description: `Action to perform: ${ACTIONS.join(", ")}` }),
	threadId: Type.Optional(Type.String({ description: "Thread ID for messaging" })),
	message: Type.Optional(Type.String({ description: "Message text" })),
	isGroup: Type.Optional(Type.Boolean({ description: "Is group chat" })),
	profile: Type.Optional(Type.String({ description: "Profile name" })),
	query: Type.Optional(Type.String({ description: "Search query" })),
	url: Type.Optional(Type.String({ description: "URL for media/link" }))
}, { additionalProperties: false });
function json(payload) {
	return {
		content: [{
			type: "text",
			text: JSON.stringify(payload, null, 2)
		}],
		details: payload
	};
}
function resolveAmbientZalouserTarget(context) {
	const deliveryContext = context?.deliveryContext;
	const rawTarget = deliveryContext?.to;
	if ((deliveryContext?.channel === void 0 || deliveryContext.channel === "zalouser") && typeof rawTarget === "string" && rawTarget.trim()) try {
		return parseZalouserOutboundTarget(rawTarget);
	} catch {}
	if (deliveryContext?.channel && deliveryContext.channel !== "zalouser") return {};
	const ambientThreadId = deliveryContext?.threadId;
	if (typeof ambientThreadId === "string" && ambientThreadId.trim()) return { threadId: ambientThreadId.trim() };
	if (typeof ambientThreadId === "number" && Number.isFinite(ambientThreadId)) return { threadId: String(ambientThreadId) };
	return {};
}
function resolveZalouserSendTarget(params, context) {
	const explicitThreadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
	const ambientTarget = resolveAmbientZalouserTarget(context);
	return {
		threadId: explicitThreadId || ambientTarget.threadId,
		isGroup: typeof params.isGroup === "boolean" ? params.isGroup : ambientTarget.isGroup
	};
}
async function executeZalouserTool(_toolCallId, params, _signal, _onUpdate, context) {
	try {
		switch (params.action) {
			case "send": {
				const target = resolveZalouserSendTarget(params, context);
				if (!target.threadId || !params.message) throw new Error("threadId and message required for send action");
				const result = await sendMessageZalouser(target.threadId, params.message, {
					profile: params.profile,
					isGroup: target.isGroup
				});
				if (!result.ok) throw new Error(result.error || "Failed to send message");
				return json({
					success: true,
					messageId: result.messageId
				});
			}
			case "image": {
				const target = resolveZalouserSendTarget(params, context);
				if (!target.threadId) throw new Error("threadId required for image action");
				if (!params.url) throw new Error("url required for image action");
				const result = await sendImageZalouser(target.threadId, params.url, {
					profile: params.profile,
					caption: params.message,
					isGroup: target.isGroup
				});
				if (!result.ok) throw new Error(result.error || "Failed to send image");
				return json({
					success: true,
					messageId: result.messageId
				});
			}
			case "link": {
				const target = resolveZalouserSendTarget(params, context);
				if (!target.threadId || !params.url) throw new Error("threadId and url required for link action");
				const result = await sendLinkZalouser(target.threadId, params.url, {
					profile: params.profile,
					caption: params.message,
					isGroup: target.isGroup
				});
				if (!result.ok) throw new Error(result.error || "Failed to send link");
				return json({
					success: true,
					messageId: result.messageId
				});
			}
			case "friends": return json(await listZaloFriendsMatching(params.profile, params.query));
			case "groups": return json(await listZaloGroupsMatching(params.profile, params.query));
			case "me": return json(await getZaloUserInfo(params.profile) ?? { error: "Not authenticated" });
			case "status": {
				const authenticated = await checkZaloAuthenticated(params.profile);
				return json({
					authenticated,
					output: authenticated ? "authenticated" : "not authenticated"
				});
			}
			default:
				params.action;
				throw new Error(`Unknown action: ${String(params.action)}. Valid actions: send, image, link, friends, groups, me, status`);
		}
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : String(err) });
	}
}
function createZalouserTool(context) {
	return {
		name: "zalouser",
		label: "Zalo Personal",
		description: "Send messages and access data via Zalo personal account. Actions: send (text message), image (send image URL), link (send link), friends (list/search friends), groups (list groups), me (profile info), status (auth check).",
		parameters: ZalouserToolSchema,
		execute: async (toolCallId, params, signal, onUpdate) => await executeZalouserTool(toolCallId, params, signal, onUpdate, context)
	};
}
//#endregion
export { zalouserSetupAdapter as a, zalouserSetupWizard as i, zalouserSetupPlugin as n, zalouserPlugin as r, createZalouserTool as t };
