import { g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { r as buildChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { a as createHybridChannelConfigAdapter } from "./channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { t as buildChannelOutboundSessionRoute } from "./core-D7mi2qmR.js";
import "./channel-config-schema-BT1Xyv2r.js";
import { n as createRuntimeOutboundDelegates } from "./runtime-forwarders-Dhqc-dWG.js";
import { d as createDefaultChannelRuntimeState, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./outbound-runtime-BSC4z6CP.js";
import { o as migrateLegacyFlatAllowPrivateNetworkAlias, r as hasLegacyFlatAllowPrivateNetworkAlias } from "./ssrf-policy-Cb9w9jMO.js";
import "./ssrf-runtime-DGIvmaoK.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import { a as tlonSetupAdapter, c as listTlonAccountIds, d as normalizeShip, l as resolveTlonAccount, m as resolveTlonOutboundTarget, n as createTlonSetupWizardBase, p as parseTlonTarget, u as formatTargetHint } from "./setup-core-THaM5w8p.js";
//#region extensions/tlon/src/config-schema.ts
const ShipSchema = zod_exports.z.string().min(1);
const ChannelNestSchema = zod_exports.z.string().min(1);
const TlonChannelRuleSchema = zod_exports.z.object({
	mode: zod_exports.z.enum(["restricted", "open"]).optional(),
	allowedShips: zod_exports.z.array(ShipSchema).optional()
});
const TlonAuthorizationSchema = zod_exports.z.object({ channelRules: zod_exports.z.record(zod_exports.z.string(), TlonChannelRuleSchema).optional() });
const TlonNetworkSchema = zod_exports.z.object({ dangerouslyAllowPrivateNetwork: zod_exports.z.boolean().optional() }).strict().optional();
const tlonCommonConfigFields = {
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	ship: ShipSchema.optional(),
	url: zod_exports.z.string().optional(),
	code: zod_exports.z.string().optional(),
	network: TlonNetworkSchema,
	groupChannels: zod_exports.z.array(ChannelNestSchema).optional(),
	dmAllowlist: zod_exports.z.array(ShipSchema).optional(),
	autoDiscoverChannels: zod_exports.z.boolean().optional(),
	showModelSignature: zod_exports.z.boolean().optional(),
	responsePrefix: zod_exports.z.string().optional(),
	autoAcceptDmInvites: zod_exports.z.boolean().optional(),
	autoAcceptGroupInvites: zod_exports.z.boolean().optional(),
	ownerShip: ShipSchema.optional()
};
const TlonAccountSchema = zod_exports.z.object({ ...tlonCommonConfigFields });
const tlonChannelConfigSchema = buildChannelConfigSchema(zod_exports.z.object({
	...tlonCommonConfigFields,
	authorization: TlonAuthorizationSchema.optional(),
	defaultAuthorizedShips: zod_exports.z.array(ShipSchema).optional(),
	accounts: zod_exports.z.record(zod_exports.z.string(), TlonAccountSchema).optional()
}));
//#endregion
//#region extensions/tlon/src/doctor.ts
function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasLegacyAllowPrivateNetworkInAccounts(value) {
	const accounts = isRecord(value) ? value : null;
	return Boolean(accounts && Object.values(accounts).some((account) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(account) ? account : {})));
}
function normalizeTlonCompatibilityConfig(cfg) {
	const channels = isRecord(cfg.channels) ? cfg.channels : null;
	const tlon = isRecord(channels?.tlon) ? channels.tlon : null;
	if (!tlon) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updatedTlon = tlon;
	let changed = false;
	const topLevel = migrateLegacyFlatAllowPrivateNetworkAlias({
		entry: updatedTlon,
		pathPrefix: "channels.tlon",
		changes
	});
	updatedTlon = topLevel.entry;
	changed = changed || topLevel.changed;
	const accounts = isRecord(updatedTlon.accounts) ? updatedTlon.accounts : null;
	if (accounts) {
		let accountsChanged = false;
		const nextAccounts = { ...accounts };
		for (const [accountId, accountValue] of Object.entries(accounts)) {
			const account = isRecord(accountValue) ? accountValue : null;
			if (!account) continue;
			const migrated = migrateLegacyFlatAllowPrivateNetworkAlias({
				entry: account,
				pathPrefix: `channels.tlon.accounts.${accountId}`,
				changes
			});
			if (!migrated.changed) continue;
			nextAccounts[accountId] = migrated.entry;
			accountsChanged = true;
		}
		if (accountsChanged) {
			updatedTlon = {
				...updatedTlon,
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
				tlon: updatedTlon
			}
		},
		changes
	};
}
const tlonDoctor = {
	legacyConfigRules: [{
		path: ["channels", "tlon"],
		message: "channels.tlon.allowPrivateNetwork is legacy; use channels.tlon.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
		match: (value) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(value) ? value : {})
	}, {
		path: [
			"channels",
			"tlon",
			"accounts"
		],
		message: "channels.tlon.accounts.<id>.allowPrivateNetwork is legacy; use channels.tlon.accounts.<id>.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
		match: hasLegacyAllowPrivateNetworkInAccounts
	}],
	normalizeCompatibilityConfig: ({ cfg }) => normalizeTlonCompatibilityConfig(cfg)
};
//#endregion
//#region extensions/tlon/src/session-route.ts
function resolveTlonOutboundSessionRoute(params) {
	const parsed = parseTlonTarget(params.target);
	if (!parsed) return null;
	if (parsed.kind === "group") return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "tlon",
		accountId: params.accountId,
		peer: {
			kind: "group",
			id: parsed.nest
		},
		chatType: "group",
		from: `tlon:group:${parsed.nest}`,
		to: `tlon:${parsed.nest}`
	});
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "tlon",
		accountId: params.accountId,
		peer: {
			kind: "direct",
			id: parsed.ship
		},
		chatType: "direct",
		from: `tlon:${parsed.ship}`,
		to: `tlon:${parsed.ship}`
	});
}
//#endregion
//#region extensions/tlon/src/channel.ts
const TLON_CHANNEL_ID = "tlon";
const loadTlonChannelRuntime = createLazyRuntimeModule(() => import("./channel.runtime-CJV-PWGg.js"));
const tlonSetupWizardProxy = createTlonSetupWizardBase({
	resolveConfigured: async ({ cfg, accountId }) => await (await loadTlonChannelRuntime()).tlonSetupWizard.status.resolveConfigured({
		cfg,
		accountId
	}),
	resolveStatusLines: async ({ cfg, accountId, configured }) => await (await loadTlonChannelRuntime()).tlonSetupWizard.status.resolveStatusLines?.({
		cfg,
		accountId,
		configured
	}) ?? [],
	finalize: async (params) => await (await loadTlonChannelRuntime()).tlonSetupWizard.finalize(params)
});
const tlonConfigAdapter = createHybridChannelConfigAdapter({
	sectionKey: TLON_CHANNEL_ID,
	listAccountIds: listTlonAccountIds,
	resolveAccount: resolveTlonAccount,
	defaultAccountId: () => DEFAULT_ACCOUNT_ID,
	clearBaseFields: [
		"ship",
		"code",
		"url",
		"name"
	],
	preserveSectionOnDefaultDelete: true,
	resolveAllowFrom: (account) => account.dmAllowlist,
	formatAllowFrom: (allowFrom) => allowFrom.map((entry) => normalizeShip(String(entry))).filter(Boolean)
});
const tlonPlugin = createChatChannelPlugin({
	base: {
		id: TLON_CHANNEL_ID,
		meta: {
			id: TLON_CHANNEL_ID,
			label: "Tlon",
			selectionLabel: "Tlon (Urbit)",
			docsPath: "/channels/tlon",
			docsLabel: "tlon",
			blurb: "Decentralized messaging on Urbit",
			aliases: ["urbit"],
			order: 90
		},
		capabilities: {
			chatTypes: [
				"direct",
				"group",
				"thread"
			],
			media: true,
			reply: true,
			threads: true
		},
		setup: tlonSetupAdapter,
		setupWizard: tlonSetupWizardProxy,
		reload: { configPrefixes: ["channels.tlon"] },
		configSchema: tlonChannelConfigSchema,
		config: {
			...tlonConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.configured,
				extra: {
					ship: account.ship,
					url: account.url
				}
			})
		},
		doctor: tlonDoctor,
		messaging: {
			normalizeTarget: (target) => {
				const parsed = parseTlonTarget(target);
				if (!parsed) return target.trim();
				if (parsed.kind === "dm") return parsed.ship;
				return parsed.nest;
			},
			targetResolver: {
				looksLikeId: (target) => Boolean(parseTlonTarget(target)),
				hint: formatTargetHint()
			},
			resolveOutboundSessionRoute: (params) => resolveTlonOutboundSessionRoute(params)
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: (accounts) => {
				return accounts.flatMap((account) => {
					if (!account.configured) return [{
						channel: TLON_CHANNEL_ID,
						accountId: account.accountId,
						kind: "config",
						message: "Account not configured (missing ship, code, or url)"
					}];
					return [];
				});
			},
			buildChannelSummary: ({ snapshot }) => {
				const s = snapshot;
				return {
					configured: s.configured ?? false,
					ship: s.ship ?? null,
					url: s.url ?? null
				};
			},
			probeAccount: async ({ account }) => {
				if (!account.configured || !account.ship || !account.url || !account.code) return {
					ok: false,
					error: "Not configured"
				};
				return await (await loadTlonChannelRuntime()).probeTlonAccount(account);
			},
			resolveAccountSnapshot: ({ account }) => ({
				accountId: account.accountId,
				name: account.name ?? void 0,
				enabled: account.enabled,
				configured: account.configured,
				extra: {
					ship: account.ship,
					url: account.url
				}
			})
		}),
		gateway: { startAccount: async (ctx) => await (await loadTlonChannelRuntime()).startTlonGatewayAccount(ctx) }
	},
	outbound: {
		deliveryMode: "direct",
		textChunkLimit: 1e4,
		resolveTarget: ({ to }) => resolveTlonOutboundTarget(to),
		...createRuntimeOutboundDelegates({
			getRuntime: loadTlonChannelRuntime,
			sendText: { resolve: (runtime) => runtime.tlonRuntimeOutbound.sendText },
			sendMedia: { resolve: (runtime) => runtime.tlonRuntimeOutbound.sendMedia }
		})
	}
});
//#endregion
export { tlonPlugin as t };
