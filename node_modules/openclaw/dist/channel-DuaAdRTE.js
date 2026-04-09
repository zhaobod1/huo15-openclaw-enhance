import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { c as GroupPolicySchema, m as MarkdownConfigSchema, r as ContextVisibilityModeSchema } from "./zod-schema.core-BITC5-JP.js";
import { o as ToolPolicySchema } from "./zod-schema.agent-runtime-cSDGDkCI.js";
import { i as buildNestedDmConfigSchema, r as buildChannelConfigSchema, t as AllowFromListSchema } from "./config-schema-BEuKmAWr.js";
import { a as resolveSessionStoreEntry } from "./store-Cx4GsUxp.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { d as readNumberParam, h as readStringParam, i as createActionGate } from "./common-B7pbdYUb.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { i as createLazyRuntimeNamedExport } from "./lazy-runtime-BwFSOU2O.js";
import { n as formatPluginInstallPathIssue, t as detectPluginInstallPathIssue } from "./plugin-install-path-warnings-C5EQaMLE.js";
import { t as removePluginFromConfig } from "./uninstall-CXemyjN2.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { t as createScopedAccountReplyToModeResolver } from "./threading-helpers-DainoJbi.js";
import { r as buildSecretInputSchema } from "./secret-input-D5U3kuko.js";
import "./channel-config-schema-BT1Xyv2r.js";
import { m as createAllowlistProviderOpenWarningCollector, x as projectAccountConfigWarningCollector } from "./channel-policy-DIVRdPsQ.js";
import { t as createChannelDirectoryAdapter } from "./directory-runtime-BrmKrim8.js";
import { i as createResolvedDirectoryEntriesLister } from "./directory-config-helpers-47ChUpH6.js";
import { n as createRuntimeOutboundDelegates, t as createRuntimeDirectoryLiveAdapter } from "./runtime-forwarders-Dhqc-dWG.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-B1YYl-hh.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-DrJTvhRN.js";
import { c as collectStatusIssuesFromLastError, d as createDefaultChannelRuntimeState, i as buildProbeChannelStatusSummary, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./runtime-doctor-Ac5edmSG.js";
import "./config-runtime-OuR9WVXH.js";
import "./outbound-runtime-BSC4z6CP.js";
import { o as migrateLegacyFlatAllowPrivateNetworkAlias, r as hasLegacyFlatAllowPrivateNetworkAlias } from "./ssrf-policy-Cb9w9jMO.js";
import "./ssrf-runtime-DGIvmaoK.js";
import "./conversation-runtime-D-TUyzoB.js";
import { r as buildTrafficStatusSummary } from "./extension-shared-CKz43ndd.js";
import "./channel-config-primitives-DiYud7LO.js";
import { n as createChatChannelPlugin, t as buildChannelOutboundSessionRoute } from "./channel-core-BVR4R0_P.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import "./channel-status-45SWZx-g.js";
import { n as requiresExplicitMatrixDefaultAccount } from "./account-selection-BneLmcra.js";
import { s as resolveMatrixAccountConfig } from "./config-paths-nydRhwNZ.js";
import { i as resolveMatrixAccount, r as resolveDefaultMatrixAccountId, t as listMatrixAccountIds } from "./accounts-CQDhvmdl.js";
import "./runtime-api-BHJ90QeI.js";
import { c as shouldSuppressLocalMatrixExecApprovalPrompt, l as normalizeMatrixAllowList, n as resolveMatrixRoomConfig, r as matrixApprovalCapability, t as resolveMatrixStoredSessionMeta, u as normalizeMatrixUserId } from "./session-store-metadata-D_NTborR.js";
import { a as resolveMatrixTargetIdentity, i as resolveMatrixDirectUserId, n as normalizeMatrixMessagingTarget, r as normalizeMatrixResolvableTarget } from "./target-ids-D7JNR-GU.js";
import { a as detectLegacyMatrixState, i as autoMigrateLegacyMatrixState, n as hasPendingMatrixMigration, o as autoPrepareLegacyMatrixCrypto, r as maybeCreateMatrixMigrationSnapshot, s as detectLegacyMatrixCrypto, t as hasActionableMatrixMigration } from "./runtime-heavy-api-C-OGEob5.js";
import "./matrix-migration.runtime-DqBL54MW.js";
import { f as setMatrixThreadBindingMaxAgeBySessionKey, u as setMatrixThreadBindingIdleTimeoutBySessionKey } from "./thread-bindings-shared-xF9Fm7l4.js";
import { n as collectRuntimeConfigAssignments, r as secretTargetRegistryEntries, t as matrixOnboardingAdapter } from "./setup-surface-CtLowrwK.js";
import { a as resolveSingleAccountPromotionTarget, i as namedAccountPromotionKeys, o as singleAccountKeysToMove, t as matrixSetupAdapter } from "./setup-core-FBjthm_-.js";
import { Type } from "@sinclair/typebox";
//#region extensions/matrix/src/actions.ts
const MATRIX_PLUGIN_HANDLED_ACTIONS = new Set([
	"send",
	"poll-vote",
	"react",
	"reactions",
	"read",
	"edit",
	"delete",
	"pin",
	"unpin",
	"list-pins",
	"set-profile",
	"member-info",
	"channel-info",
	"permissions"
]);
function createMatrixExposedActions(params) {
	const actions = new Set(["poll", "poll-vote"]);
	if (params.gate("messages")) {
		actions.add("send");
		actions.add("read");
		actions.add("edit");
		actions.add("delete");
	}
	if (params.gate("reactions")) {
		actions.add("react");
		actions.add("reactions");
	}
	if (params.gate("pins")) {
		actions.add("pin");
		actions.add("unpin");
		actions.add("list-pins");
	}
	if (params.gate("profile")) actions.add("set-profile");
	if (params.gate("memberInfo")) actions.add("member-info");
	if (params.gate("channelInfo")) actions.add("channel-info");
	if (params.encryptionEnabled && params.gate("verification")) actions.add("permissions");
	return actions;
}
function buildMatrixProfileToolSchema() {
	return { properties: {
		displayName: Type.Optional(Type.String({ description: "Profile display name for Matrix self-profile update actions." })),
		display_name: Type.Optional(Type.String({ description: "snake_case alias of displayName for Matrix self-profile update actions." })),
		avatarUrl: Type.Optional(Type.String({ description: "Profile avatar URL for Matrix self-profile update actions. Matrix accepts mxc:// and http(s) URLs." })),
		avatar_url: Type.Optional(Type.String({ description: "snake_case alias of avatarUrl for Matrix self-profile update actions. Matrix accepts mxc:// and http(s) URLs." })),
		avatarPath: Type.Optional(Type.String({ description: "Local avatar file path for Matrix self-profile update actions. Matrix uploads this file and sets the resulting MXC URI." })),
		avatar_path: Type.Optional(Type.String({ description: "snake_case alias of avatarPath for Matrix self-profile update actions. Matrix uploads this file and sets the resulting MXC URI." }))
	} };
}
const matrixMessageActions = {
	describeMessageTool: ({ cfg, accountId }) => {
		const resolvedCfg = cfg;
		if (!accountId && requiresExplicitMatrixDefaultAccount(resolvedCfg)) return {
			actions: [],
			capabilities: []
		};
		const account = resolveMatrixAccount({
			cfg: resolvedCfg,
			accountId: accountId ?? resolveDefaultMatrixAccountId(resolvedCfg)
		});
		if (!account.enabled || !account.configured) return {
			actions: [],
			capabilities: []
		};
		const actions = createMatrixExposedActions({
			gate: createActionGate(account.config.actions),
			encryptionEnabled: account.config.encryption === true
		});
		const listedActions = Array.from(actions);
		return {
			actions: listedActions,
			capabilities: [],
			schema: listedActions.includes("set-profile") ? buildMatrixProfileToolSchema() : null
		};
	},
	supportsAction: ({ action }) => MATRIX_PLUGIN_HANDLED_ACTIONS.has(action),
	extractToolSend: ({ args }) => {
		if ((typeof args.action === "string" ? args.action.trim() : "") !== "sendMessage") return null;
		const to = typeof args.to === "string" ? args.to : void 0;
		if (!to) return null;
		return { to };
	},
	handleAction: async (ctx) => {
		const { handleMatrixAction } = await import("./tool-actions.runtime-BRYG3WRV.js");
		const { action, params, cfg, accountId, mediaLocalRoots } = ctx;
		const dispatch = async (actionParams) => await handleMatrixAction({
			...actionParams,
			...accountId ? { accountId } : {}
		}, cfg, { mediaLocalRoots });
		const resolveRoomId = () => readStringParam(params, "roomId") ?? readStringParam(params, "channelId") ?? readStringParam(params, "to", { required: true });
		if (action === "send") {
			const to = readStringParam(params, "to", { required: true });
			const mediaUrl = readStringParam(params, "media", { trim: false }) ?? readStringParam(params, "mediaUrl", { trim: false }) ?? readStringParam(params, "filePath", { trim: false }) ?? readStringParam(params, "path", { trim: false });
			const content = readStringParam(params, "message", {
				required: !mediaUrl,
				allowEmpty: true
			});
			const replyTo = readStringParam(params, "replyTo");
			const threadId = readStringParam(params, "threadId");
			const audioAsVoice = typeof params.asVoice === "boolean" ? params.asVoice : typeof params.audioAsVoice === "boolean" ? params.audioAsVoice : void 0;
			return await dispatch({
				action: "sendMessage",
				to,
				content,
				mediaUrl: mediaUrl ?? void 0,
				replyToId: replyTo ?? void 0,
				threadId: threadId ?? void 0,
				audioAsVoice
			});
		}
		if (action === "poll-vote") return await dispatch({
			...params,
			action: "pollVote"
		});
		if (action === "react") {
			const messageId = readStringParam(params, "messageId", { required: true });
			const emoji = readStringParam(params, "emoji", { allowEmpty: true });
			const remove = typeof params.remove === "boolean" ? params.remove : void 0;
			return await dispatch({
				action: "react",
				roomId: resolveRoomId(),
				messageId,
				emoji,
				remove
			});
		}
		if (action === "reactions") {
			const messageId = readStringParam(params, "messageId", { required: true });
			const limit = readNumberParam(params, "limit", { integer: true });
			return await dispatch({
				action: "reactions",
				roomId: resolveRoomId(),
				messageId,
				limit
			});
		}
		if (action === "read") {
			const limit = readNumberParam(params, "limit", { integer: true });
			return await dispatch({
				action: "readMessages",
				roomId: resolveRoomId(),
				limit,
				before: readStringParam(params, "before"),
				after: readStringParam(params, "after")
			});
		}
		if (action === "edit") {
			const messageId = readStringParam(params, "messageId", { required: true });
			const content = readStringParam(params, "message", { required: true });
			return await dispatch({
				action: "editMessage",
				roomId: resolveRoomId(),
				messageId,
				content
			});
		}
		if (action === "delete") {
			const messageId = readStringParam(params, "messageId", { required: true });
			return await dispatch({
				action: "deleteMessage",
				roomId: resolveRoomId(),
				messageId
			});
		}
		if (action === "pin" || action === "unpin" || action === "list-pins") {
			const messageId = action === "list-pins" ? void 0 : readStringParam(params, "messageId", { required: true });
			return await dispatch({
				action: action === "pin" ? "pinMessage" : action === "unpin" ? "unpinMessage" : "listPins",
				roomId: resolveRoomId(),
				messageId
			});
		}
		if (action === "set-profile") {
			const avatarPath = readStringParam(params, "avatarPath") ?? readStringParam(params, "path") ?? readStringParam(params, "filePath");
			return await dispatch({
				action: "setProfile",
				displayName: readStringParam(params, "displayName") ?? readStringParam(params, "name"),
				avatarUrl: readStringParam(params, "avatarUrl"),
				avatarPath
			});
		}
		if (action === "member-info") return await dispatch({
			action: "memberInfo",
			userId: readStringParam(params, "userId", { required: true }),
			roomId: readStringParam(params, "roomId") ?? readStringParam(params, "channelId")
		});
		if (action === "channel-info") return await dispatch({
			action: "channelInfo",
			roomId: resolveRoomId()
		});
		if (action === "permissions") {
			const operation = (readStringParam(params, "operation") ?? readStringParam(params, "mode") ?? "verification-list").trim().toLowerCase();
			const operationToAction = {
				"encryption-status": "encryptionStatus",
				"verification-status": "verificationStatus",
				"verification-bootstrap": "verificationBootstrap",
				"verification-recovery-key": "verificationRecoveryKey",
				"verification-backup-status": "verificationBackupStatus",
				"verification-backup-restore": "verificationBackupRestore",
				"verification-list": "verificationList",
				"verification-request": "verificationRequest",
				"verification-accept": "verificationAccept",
				"verification-cancel": "verificationCancel",
				"verification-start": "verificationStart",
				"verification-generate-qr": "verificationGenerateQr",
				"verification-scan-qr": "verificationScanQr",
				"verification-sas": "verificationSas",
				"verification-confirm": "verificationConfirm",
				"verification-mismatch": "verificationMismatch",
				"verification-confirm-qr": "verificationConfirmQr"
			};
			const resolvedAction = operationToAction[operation];
			if (!resolvedAction) throw new Error(`Unsupported Matrix permissions operation: ${operation}. Supported values: ${Object.keys(operationToAction).join(", ")}`);
			return await dispatch({
				...params,
				action: resolvedAction
			});
		}
		throw new Error(`Action ${action} is not supported for provider matrix.`);
	}
};
//#endregion
//#region extensions/matrix/src/config-schema.ts
const matrixActionSchema = zod_exports.z.object({
	reactions: zod_exports.z.boolean().optional(),
	messages: zod_exports.z.boolean().optional(),
	pins: zod_exports.z.boolean().optional(),
	profile: zod_exports.z.boolean().optional(),
	memberInfo: zod_exports.z.boolean().optional(),
	channelInfo: zod_exports.z.boolean().optional(),
	verification: zod_exports.z.boolean().optional()
}).optional();
const matrixThreadBindingsSchema = zod_exports.z.object({
	enabled: zod_exports.z.boolean().optional(),
	idleHours: zod_exports.z.number().nonnegative().optional(),
	maxAgeHours: zod_exports.z.number().nonnegative().optional(),
	spawnSubagentSessions: zod_exports.z.boolean().optional(),
	spawnAcpSessions: zod_exports.z.boolean().optional()
}).optional();
const matrixExecApprovalsSchema = zod_exports.z.object({
	enabled: zod_exports.z.boolean().optional(),
	approvers: AllowFromListSchema,
	agentFilter: zod_exports.z.array(zod_exports.z.string()).optional(),
	sessionFilter: zod_exports.z.array(zod_exports.z.string()).optional(),
	target: zod_exports.z.enum([
		"dm",
		"channel",
		"both"
	]).optional()
}).optional();
const matrixRoomSchema = zod_exports.z.object({
	account: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	requireMention: zod_exports.z.boolean().optional(),
	allowBots: zod_exports.z.union([zod_exports.z.boolean(), zod_exports.z.literal("mentions")]).optional(),
	tools: ToolPolicySchema,
	autoReply: zod_exports.z.boolean().optional(),
	users: AllowFromListSchema,
	skills: zod_exports.z.array(zod_exports.z.string()).optional(),
	systemPrompt: zod_exports.z.string().optional()
}).optional();
const matrixNetworkSchema = zod_exports.z.object({ dangerouslyAllowPrivateNetwork: zod_exports.z.boolean().optional() }).strict().optional();
const MatrixConfigSchema = zod_exports.z.object({
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	defaultAccount: zod_exports.z.string().optional(),
	accounts: zod_exports.z.record(zod_exports.z.string(), zod_exports.z.unknown()).optional(),
	markdown: MarkdownConfigSchema,
	homeserver: zod_exports.z.string().optional(),
	network: matrixNetworkSchema,
	proxy: zod_exports.z.string().optional(),
	userId: zod_exports.z.string().optional(),
	accessToken: buildSecretInputSchema().optional(),
	password: buildSecretInputSchema().optional(),
	deviceId: zod_exports.z.string().optional(),
	deviceName: zod_exports.z.string().optional(),
	avatarUrl: zod_exports.z.string().optional(),
	initialSyncLimit: zod_exports.z.number().optional(),
	encryption: zod_exports.z.boolean().optional(),
	allowlistOnly: zod_exports.z.boolean().optional(),
	allowBots: zod_exports.z.union([zod_exports.z.boolean(), zod_exports.z.literal("mentions")]).optional(),
	groupPolicy: GroupPolicySchema.optional(),
	contextVisibility: ContextVisibilityModeSchema.optional(),
	blockStreaming: zod_exports.z.boolean().optional(),
	streaming: zod_exports.z.union([zod_exports.z.enum([
		"partial",
		"quiet",
		"off"
	]), zod_exports.z.boolean()]).optional(),
	replyToMode: zod_exports.z.enum([
		"off",
		"first",
		"all",
		"batched"
	]).optional(),
	threadReplies: zod_exports.z.enum([
		"off",
		"inbound",
		"always"
	]).optional(),
	textChunkLimit: zod_exports.z.number().optional(),
	chunkMode: zod_exports.z.enum(["length", "newline"]).optional(),
	responsePrefix: zod_exports.z.string().optional(),
	ackReaction: zod_exports.z.string().optional(),
	ackReactionScope: zod_exports.z.enum([
		"group-mentions",
		"group-all",
		"direct",
		"all",
		"none",
		"off"
	]).optional(),
	reactionNotifications: zod_exports.z.enum(["off", "own"]).optional(),
	threadBindings: matrixThreadBindingsSchema,
	startupVerification: zod_exports.z.enum(["off", "if-unverified"]).optional(),
	startupVerificationCooldownHours: zod_exports.z.number().optional(),
	mediaMaxMb: zod_exports.z.number().optional(),
	historyLimit: zod_exports.z.number().int().min(0).optional(),
	autoJoin: zod_exports.z.enum([
		"always",
		"allowlist",
		"off"
	]).optional(),
	autoJoinAllowlist: AllowFromListSchema,
	groupAllowFrom: AllowFromListSchema,
	dm: buildNestedDmConfigSchema({
		sessionScope: zod_exports.z.enum(["per-user", "per-room"]).optional(),
		threadReplies: zod_exports.z.enum([
			"off",
			"inbound",
			"always"
		]).optional()
	}),
	execApprovals: matrixExecApprovalsSchema,
	groups: zod_exports.z.object({}).catchall(matrixRoomSchema).optional(),
	rooms: zod_exports.z.object({}).catchall(matrixRoomSchema).optional(),
	actions: matrixActionSchema
});
//#endregion
//#region extensions/matrix/src/doctor.ts
function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasLegacyMatrixRoomAllowAlias(value) {
	const room = isRecord(value) ? value : null;
	return Boolean(room && typeof room.allow === "boolean");
}
function hasLegacyMatrixRoomMapAllowAliases(value) {
	const rooms = isRecord(value) ? value : null;
	return Boolean(rooms && Object.values(rooms).some((room) => hasLegacyMatrixRoomAllowAlias(room)));
}
function hasLegacyMatrixAccountRoomAllowAliases(value) {
	const accounts = isRecord(value) ? value : null;
	if (!accounts) return false;
	return Object.values(accounts).some((account) => {
		if (!isRecord(account)) return false;
		return hasLegacyMatrixRoomMapAllowAliases(account.groups) || hasLegacyMatrixRoomMapAllowAliases(account.rooms);
	});
}
function hasLegacyMatrixAccountPrivateNetworkAliases(value) {
	const accounts = isRecord(value) ? value : null;
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(account) ? account : {}));
}
function normalizeMatrixRoomAllowAliases(params) {
	let changed = false;
	const nextRooms = { ...params.rooms };
	for (const [roomId, roomValue] of Object.entries(params.rooms)) {
		const room = isRecord(roomValue) ? roomValue : null;
		if (!room || typeof room.allow !== "boolean") continue;
		const nextRoom = { ...room };
		if (typeof nextRoom.enabled !== "boolean") nextRoom.enabled = room.allow;
		delete nextRoom.allow;
		nextRooms[roomId] = nextRoom;
		changed = true;
		params.changes.push(`Moved ${params.pathPrefix}.${roomId}.allow → ${params.pathPrefix}.${roomId}.enabled (${String(nextRoom.enabled)}).`);
	}
	return {
		rooms: nextRooms,
		changed
	};
}
function normalizeMatrixCompatibilityConfig(cfg) {
	const channels = isRecord(cfg.channels) ? cfg.channels : null;
	const matrix = isRecord(channels?.matrix) ? channels.matrix : null;
	if (!matrix) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updatedMatrix = matrix;
	let changed = false;
	const topLevelPrivateNetwork = migrateLegacyFlatAllowPrivateNetworkAlias({
		entry: updatedMatrix,
		pathPrefix: "channels.matrix",
		changes
	});
	updatedMatrix = topLevelPrivateNetwork.entry;
	changed = changed || topLevelPrivateNetwork.changed;
	const normalizeTopLevelRoomScope = (key) => {
		const rooms = isRecord(updatedMatrix[key]) ? updatedMatrix[key] : null;
		if (!rooms) return;
		const normalized = normalizeMatrixRoomAllowAliases({
			rooms,
			pathPrefix: `channels.matrix.${key}`,
			changes
		});
		if (normalized.changed) {
			updatedMatrix = {
				...updatedMatrix,
				[key]: normalized.rooms
			};
			changed = true;
		}
	};
	normalizeTopLevelRoomScope("groups");
	normalizeTopLevelRoomScope("rooms");
	const accounts = isRecord(updatedMatrix.accounts) ? updatedMatrix.accounts : null;
	if (accounts) {
		let accountsChanged = false;
		const nextAccounts = { ...accounts };
		for (const [accountId, accountValue] of Object.entries(accounts)) {
			const account = isRecord(accountValue) ? accountValue : null;
			if (!account) continue;
			let nextAccount = account;
			let accountChanged = false;
			const privateNetworkMigration = migrateLegacyFlatAllowPrivateNetworkAlias({
				entry: nextAccount,
				pathPrefix: `channels.matrix.accounts.${accountId}`,
				changes
			});
			if (privateNetworkMigration.changed) {
				nextAccount = privateNetworkMigration.entry;
				accountChanged = true;
			}
			for (const key of ["groups", "rooms"]) {
				const rooms = isRecord(nextAccount[key]) ? nextAccount[key] : null;
				if (!rooms) continue;
				const normalized = normalizeMatrixRoomAllowAliases({
					rooms,
					pathPrefix: `channels.matrix.accounts.${accountId}.${key}`,
					changes
				});
				if (normalized.changed) {
					nextAccount = {
						...nextAccount,
						[key]: normalized.rooms
					};
					accountChanged = true;
				}
			}
			if (accountChanged) {
				nextAccounts[accountId] = nextAccount;
				accountsChanged = true;
			}
		}
		if (accountsChanged) {
			updatedMatrix = {
				...updatedMatrix,
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
				...cfg.channels ?? {},
				matrix: updatedMatrix
			}
		},
		changes
	};
}
const MATRIX_LEGACY_CONFIG_RULES = [
	{
		path: ["channels", "matrix"],
		message: "channels.matrix.allowPrivateNetwork is legacy; use channels.matrix.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
		match: (value) => hasLegacyFlatAllowPrivateNetworkAlias(isRecord(value) ? value : {})
	},
	{
		path: [
			"channels",
			"matrix",
			"accounts"
		],
		message: "channels.matrix.accounts.<id>.allowPrivateNetwork is legacy; use channels.matrix.accounts.<id>.network.dangerouslyAllowPrivateNetwork instead. Run \"openclaw doctor --fix\".",
		match: hasLegacyMatrixAccountPrivateNetworkAliases
	},
	{
		path: [
			"channels",
			"matrix",
			"groups"
		],
		message: "channels.matrix.groups.<room>.allow is legacy; use channels.matrix.groups.<room>.enabled instead. Run \"openclaw doctor --fix\".",
		match: hasLegacyMatrixRoomMapAllowAliases
	},
	{
		path: [
			"channels",
			"matrix",
			"rooms"
		],
		message: "channels.matrix.rooms.<room>.allow is legacy; use channels.matrix.rooms.<room>.enabled instead. Run \"openclaw doctor --fix\".",
		match: hasLegacyMatrixRoomMapAllowAliases
	},
	{
		path: [
			"channels",
			"matrix",
			"accounts"
		],
		message: "channels.matrix.accounts.<id>.{groups,rooms}.<room>.allow is legacy; use channels.matrix.accounts.<id>.{groups,rooms}.<room>.enabled instead. Run \"openclaw doctor --fix\".",
		match: hasLegacyMatrixAccountRoomAllowAliases
	}
];
function hasConfiguredMatrixChannel(cfg) {
	const channels = cfg.channels;
	return isRecord(channels?.matrix);
}
function hasConfiguredMatrixPluginSurface(cfg) {
	return Boolean(cfg.plugins?.installs?.matrix || cfg.plugins?.entries?.matrix || cfg.plugins?.allow?.includes("matrix") || cfg.plugins?.deny?.includes("matrix"));
}
function hasConfiguredMatrixEnv(env) {
	return Object.entries(env).some(([key, value]) => key.startsWith("MATRIX_") && typeof value === "string" && value.trim());
}
function configMayNeedMatrixDoctorSequence(cfg, env) {
	return hasConfiguredMatrixChannel(cfg) || hasConfiguredMatrixPluginSurface(cfg) || hasConfiguredMatrixEnv(env);
}
function formatMatrixLegacyStatePreview(detection) {
	return [
		"- Matrix plugin upgraded in place.",
		`- Legacy sync store: ${detection.legacyStoragePath} -> ${detection.targetStoragePath}`,
		`- Legacy crypto store: ${detection.legacyCryptoPath} -> ${detection.targetCryptoPath}`,
		...detection.selectionNote ? [`- ${detection.selectionNote}`] : [],
		"- Run \"openclaw doctor --fix\" to migrate this Matrix state now."
	].join("\n");
}
function formatMatrixLegacyCryptoPreview(detection) {
	const notes = [];
	for (const warning of detection.warnings) notes.push(`- ${warning}`);
	for (const plan of detection.plans) notes.push([
		`- Matrix encrypted-state migration is pending for account "${plan.accountId}".`,
		`- Legacy crypto store: ${plan.legacyCryptoPath}`,
		`- New recovery key file: ${plan.recoveryKeyPath}`,
		`- Migration state file: ${plan.statePath}`,
		"- Run \"openclaw doctor --fix\" to extract any saved backup key now. Backed-up room keys will restore automatically on next gateway start."
	].join("\n"));
	return notes;
}
async function collectMatrixInstallPathWarnings(cfg) {
	const issue = await detectPluginInstallPathIssue({
		pluginId: "matrix",
		install: cfg.plugins?.installs?.matrix
	});
	if (!issue) return [];
	return formatPluginInstallPathIssue({
		issue,
		pluginLabel: "Matrix",
		defaultInstallCommand: "openclaw plugins install @openclaw/matrix"
	}).map((entry) => `- ${entry}`);
}
async function cleanStaleMatrixPluginConfig(cfg) {
	const issue = await detectPluginInstallPathIssue({
		pluginId: "matrix",
		install: cfg.plugins?.installs?.matrix
	});
	if (!issue || issue.kind !== "missing-path") return {
		config: cfg,
		changes: []
	};
	const { config, actions } = removePluginFromConfig(cfg, "matrix");
	const removed = [];
	if (actions.install) removed.push("install record");
	if (actions.loadPath) removed.push("load path");
	if (actions.entry) removed.push("plugin entry");
	if (actions.allowlist) removed.push("allowlist entry");
	if (removed.length === 0) return {
		config: cfg,
		changes: []
	};
	return {
		config,
		changes: [`Removed stale Matrix plugin references (${removed.join(", ")}). The previous install path no longer exists: ${issue.path}`]
	};
}
async function applyMatrixDoctorRepair(params) {
	const changes = [];
	const warnings = [];
	const pendingMatrixMigration = hasPendingMatrixMigration({
		cfg: params.cfg,
		env: params.env
	});
	const actionableMatrixMigration = hasActionableMatrixMigration({
		cfg: params.cfg,
		env: params.env
	});
	let matrixSnapshotReady = true;
	if (actionableMatrixMigration) try {
		const snapshot = await maybeCreateMatrixMigrationSnapshot({
			trigger: "doctor-fix",
			env: params.env
		});
		changes.push(`Matrix migration snapshot ${snapshot.created ? "created" : "reused"} before applying Matrix upgrades.\n- ${snapshot.archivePath}`);
	} catch (error) {
		matrixSnapshotReady = false;
		warnings.push(`- Failed creating a Matrix migration snapshot before repair: ${String(error)}`);
		warnings.push("- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun \"openclaw doctor --fix\".");
	}
	else if (pendingMatrixMigration) warnings.push("- Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.");
	if (!matrixSnapshotReady) return {
		changes,
		warnings
	};
	const matrixStateRepair = await autoMigrateLegacyMatrixState({
		cfg: params.cfg,
		env: params.env
	});
	if (matrixStateRepair.changes.length > 0) changes.push([
		"Matrix plugin upgraded in place.",
		...matrixStateRepair.changes.map((entry) => `- ${entry}`),
		"- No user action required."
	].join("\n"));
	if (matrixStateRepair.warnings.length > 0) warnings.push(matrixStateRepair.warnings.map((entry) => `- ${entry}`).join("\n"));
	const matrixCryptoRepair = await autoPrepareLegacyMatrixCrypto({
		cfg: params.cfg,
		env: params.env
	});
	if (matrixCryptoRepair.changes.length > 0) changes.push(["Matrix encrypted-state migration prepared.", ...matrixCryptoRepair.changes.map((entry) => `- ${entry}`)].join("\n"));
	if (matrixCryptoRepair.warnings.length > 0) warnings.push(matrixCryptoRepair.warnings.map((entry) => `- ${entry}`).join("\n"));
	return {
		changes,
		warnings
	};
}
async function runMatrixDoctorSequence(params) {
	const warningNotes = [];
	const changeNotes = [];
	const installWarnings = await collectMatrixInstallPathWarnings(params.cfg);
	if (installWarnings.length > 0) warningNotes.push(installWarnings.join("\n"));
	if (!configMayNeedMatrixDoctorSequence(params.cfg, params.env)) return {
		changeNotes,
		warningNotes
	};
	const legacyState = detectLegacyMatrixState({
		cfg: params.cfg,
		env: params.env
	});
	const legacyCrypto = detectLegacyMatrixCrypto({
		cfg: params.cfg,
		env: params.env
	});
	if (params.shouldRepair) {
		const repair = await applyMatrixDoctorRepair({
			cfg: params.cfg,
			env: params.env
		});
		changeNotes.push(...repair.changes);
		warningNotes.push(...repair.warnings);
	} else if (legacyState) if ("warning" in legacyState) warningNotes.push(`- ${legacyState.warning}`);
	else warningNotes.push(formatMatrixLegacyStatePreview(legacyState));
	if (!params.shouldRepair && (legacyCrypto.warnings.length > 0 || legacyCrypto.plans.length > 0)) warningNotes.push(...formatMatrixLegacyCryptoPreview(legacyCrypto));
	return {
		changeNotes,
		warningNotes
	};
}
const matrixDoctor = {
	dmAllowFromMode: "nestedOnly",
	groupModel: "sender",
	groupAllowFromFallbackToAllowFrom: false,
	warnOnEmptyGroupSenderAllowlist: true,
	legacyConfigRules: MATRIX_LEGACY_CONFIG_RULES,
	normalizeCompatibilityConfig: ({ cfg }) => normalizeMatrixCompatibilityConfig(cfg),
	runConfigSequence: async ({ cfg, env, shouldRepair }) => await runMatrixDoctorSequence({
		cfg,
		env,
		shouldRepair
	}),
	cleanStaleConfig: async ({ cfg }) => await cleanStaleMatrixPluginConfig(cfg)
};
//#endregion
//#region extensions/matrix/src/group-mentions.ts
function resolveMatrixRoomConfigForGroup(params) {
	const roomId = normalizeMatrixResolvableTarget(params.groupId?.trim() ?? "");
	const groupChannel = params.groupChannel?.trim() ?? "";
	const aliases = groupChannel ? [normalizeMatrixResolvableTarget(groupChannel)] : [];
	const cfg = params.cfg;
	const matrixConfig = resolveMatrixAccountConfig({
		cfg,
		accountId: params.accountId
	});
	return resolveMatrixRoomConfig({
		rooms: matrixConfig.groups ?? matrixConfig.rooms,
		roomId,
		aliases
	}).config;
}
function resolveMatrixGroupRequireMention(params) {
	const resolved = resolveMatrixRoomConfigForGroup(params);
	if (resolved) {
		if (resolved.autoReply === true) return false;
		if (resolved.autoReply === false) return true;
		if (typeof resolved.requireMention === "boolean") return resolved.requireMention;
	}
	return true;
}
function resolveMatrixGroupToolPolicy(params) {
	return resolveMatrixRoomConfigForGroup(params)?.tools;
}
//#endregion
//#region extensions/matrix/src/session-route.ts
function resolveEffectiveMatrixAccountId(params) {
	return normalizeAccountId(params.accountId ?? resolveDefaultMatrixAccountId(params.cfg));
}
function resolveMatrixDmSessionScope(params) {
	return resolveMatrixAccountConfig({
		cfg: params.cfg,
		accountId: params.accountId
	}).dm?.sessionScope ?? "per-user";
}
function resolveMatrixCurrentDmRoomId(params) {
	const sessionKey = params.currentSessionKey?.trim();
	if (!sessionKey) return;
	try {
		const existing = resolveSessionStoreEntry({
			store: loadSessionStore(resolveStorePath(params.cfg.session?.store, { agentId: params.agentId })),
			sessionKey
		}).existing;
		const currentSession = resolveMatrixStoredSessionMeta(existing);
		if (!currentSession) return;
		if (currentSession.accountId && currentSession.accountId !== params.accountId) return;
		if (!currentSession.directUserId || currentSession.directUserId !== params.targetUserId) return;
		return currentSession.roomId;
	} catch {
		return;
	}
}
function resolveMatrixOutboundSessionRoute(params) {
	const target = resolveMatrixTargetIdentity(params.resolvedTarget?.to ?? params.target) ?? resolveMatrixTargetIdentity(params.target);
	if (!target) return null;
	const effectiveAccountId = resolveEffectiveMatrixAccountId(params);
	const roomScopedDmId = target.kind === "user" && resolveMatrixDmSessionScope({
		cfg: params.cfg,
		accountId: effectiveAccountId
	}) === "per-room" ? resolveMatrixCurrentDmRoomId({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: effectiveAccountId,
		currentSessionKey: params.currentSessionKey,
		targetUserId: target.id
	}) : void 0;
	const peer = roomScopedDmId !== void 0 ? {
		kind: "channel",
		id: roomScopedDmId
	} : {
		kind: target.kind === "user" ? "direct" : "channel",
		id: target.id
	};
	const chatType = target.kind === "user" ? "direct" : "channel";
	const from = target.kind === "user" ? `matrix:${target.id}` : `matrix:channel:${target.id}`;
	const to = `room:${roomScopedDmId ?? target.id}`;
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "matrix",
		accountId: effectiveAccountId,
		peer,
		chatType,
		from,
		to
	});
}
//#endregion
//#region extensions/matrix/src/startup-maintenance.ts
async function runBestEffortMatrixMigrationStep(params) {
	try {
		await params.run();
	} catch (err) {
		params.log.warn?.(`${params.logPrefix?.trim() || "gateway"}: ${params.label} failed during Matrix migration; continuing startup: ${String(err)}`);
	}
}
async function runMatrixStartupMaintenance(params) {
	const env = params.env ?? process.env;
	const createSnapshot = params.deps?.maybeCreateMatrixMigrationSnapshot ?? maybeCreateMatrixMigrationSnapshot;
	const migrateLegacyState = params.deps?.autoMigrateLegacyMatrixState ?? autoMigrateLegacyMatrixState;
	const prepareLegacyCrypto = params.deps?.autoPrepareLegacyMatrixCrypto ?? autoPrepareLegacyMatrixCrypto;
	const trigger = params.trigger?.trim() || "gateway-startup";
	const logPrefix = params.logPrefix?.trim() || "gateway";
	const actionable = hasActionableMatrixMigration({
		cfg: params.cfg,
		env
	});
	if (!(actionable || hasPendingMatrixMigration({
		cfg: params.cfg,
		env
	}))) return;
	if (!actionable) {
		params.log.info?.("matrix: migration remains in a warning-only state; no pre-migration snapshot was needed yet");
		return;
	}
	try {
		await createSnapshot({
			trigger,
			env,
			log: params.log
		});
	} catch (err) {
		params.log.warn?.(`${logPrefix}: failed creating a Matrix migration snapshot; skipping Matrix migration for now: ${String(err)}`);
		return;
	}
	await runBestEffortMatrixMigrationStep({
		label: "legacy Matrix state migration",
		log: params.log,
		logPrefix,
		run: () => migrateLegacyState({
			cfg: params.cfg,
			env,
			log: params.log
		})
	});
	await runBestEffortMatrixMigrationStep({
		label: "legacy Matrix encrypted-state preparation",
		log: params.log,
		logPrefix,
		run: () => prepareLegacyCrypto({
			cfg: params.cfg,
			env,
			log: params.log
		})
	});
}
//#endregion
//#region extensions/matrix/src/channel.ts
let matrixStartupLock = Promise.resolve();
function chunkTextForOutbound(text, limit) {
	const chunks = [];
	let remaining = text;
	while (remaining.length > limit) {
		const window = remaining.slice(0, limit);
		const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
		const breakAt = splitAt > 0 ? splitAt : limit;
		chunks.push(remaining.slice(0, breakAt).trimEnd());
		remaining = remaining.slice(breakAt).trimStart();
	}
	if (remaining.length > 0 || text.length === 0) chunks.push(remaining);
	return chunks;
}
const loadMatrixChannelRuntime = createLazyRuntimeNamedExport(() => import("./channel2.runtime-C3dN8VkR.js"), "matrixChannelRuntime");
const meta = {
	id: "matrix",
	label: "Matrix",
	selectionLabel: "Matrix (plugin)",
	docsPath: "/channels/matrix",
	docsLabel: "matrix",
	blurb: "open protocol; configure a homeserver + access token.",
	order: 70,
	quickstartAllowFrom: true
};
const listMatrixDirectoryPeersFromConfig = createResolvedDirectoryEntriesLister({
	kind: "user",
	resolveAccount: adaptScopedAccountAccessor(resolveMatrixAccount),
	resolveSources: (account) => [
		account.config.dm?.allowFrom ?? [],
		account.config.groupAllowFrom ?? [],
		...Object.values(account.config.groups ?? account.config.rooms ?? {}).map((room) => room.users ?? [])
	],
	normalizeId: (entry) => {
		const raw = entry.replace(/^matrix:/i, "").trim();
		if (!raw || raw === "*") return null;
		const cleaned = raw.toLowerCase().startsWith("user:") ? raw.slice(5).trim() : raw;
		return cleaned.startsWith("@") ? `user:${cleaned}` : cleaned;
	}
});
const listMatrixDirectoryGroupsFromConfig = createResolvedDirectoryEntriesLister({
	kind: "group",
	resolveAccount: adaptScopedAccountAccessor(resolveMatrixAccount),
	resolveSources: (account) => [Object.keys(account.config.groups ?? account.config.rooms ?? {})],
	normalizeId: (entry) => {
		const raw = entry.replace(/^matrix:/i, "").trim();
		if (!raw || raw === "*") return null;
		const lowered = raw.toLowerCase();
		if (lowered.startsWith("room:") || lowered.startsWith("channel:")) return raw;
		return raw.startsWith("!") ? `room:${raw}` : raw;
	}
});
const matrixConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: "matrix",
	listAccountIds: listMatrixAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveMatrixAccount),
	resolveAccessorAccount: ({ cfg, accountId }) => resolveMatrixAccountConfig({
		cfg,
		accountId
	}),
	defaultAccountId: resolveDefaultMatrixAccountId,
	clearBaseFields: [
		"name",
		"homeserver",
		"network",
		"proxy",
		"userId",
		"accessToken",
		"password",
		"deviceId",
		"deviceName",
		"avatarUrl",
		"initialSyncLimit"
	],
	resolveAllowFrom: (account) => account.dm?.allowFrom,
	formatAllowFrom: (allowFrom) => normalizeMatrixAllowList(allowFrom)
});
const resolveMatrixDmPolicy = createScopedDmSecurityResolver({
	channelKey: "matrix",
	resolvePolicy: (account) => account.config.dm?.policy,
	resolveAllowFrom: (account) => account.config.dm?.allowFrom,
	allowFromPathSuffix: "dm.",
	normalizeEntry: (raw) => normalizeMatrixUserId(raw)
});
const collectMatrixSecurityWarnings = createAllowlistProviderOpenWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.matrix !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	buildOpenWarning: {
		surface: "Matrix rooms",
		openBehavior: "allows any room to trigger (mention-gated)",
		remediation: "Set channels.matrix.groupPolicy=\"allowlist\" + channels.matrix.groups (and optionally channels.matrix.groupAllowFrom) to restrict rooms"
	}
});
function resolveMatrixAccountConfigPath(accountId, field) {
	return accountId === "default" ? `channels.matrix.${field}` : `channels.matrix.accounts.${accountId}.${field}`;
}
function collectMatrixSecurityWarningsForAccount(params) {
	const warnings = collectMatrixSecurityWarnings(params);
	if (params.account.accountId !== "default") {
		const groupPolicyPath = resolveMatrixAccountConfigPath(params.account.accountId, "groupPolicy");
		const groupsPath = resolveMatrixAccountConfigPath(params.account.accountId, "groups");
		const groupAllowFromPath = resolveMatrixAccountConfigPath(params.account.accountId, "groupAllowFrom");
		return warnings.map((warning) => warning.replace("channels.matrix.groupPolicy", groupPolicyPath).replace("channels.matrix.groups", groupsPath).replace("channels.matrix.groupAllowFrom", groupAllowFromPath));
	}
	if (params.account.config.autoJoin !== "always") return warnings;
	const autoJoinPath = resolveMatrixAccountConfigPath(params.account.accountId, "autoJoin");
	const autoJoinAllowlistPath = resolveMatrixAccountConfigPath(params.account.accountId, "autoJoinAllowlist");
	return [...warnings, `- Matrix invites: autoJoin="always" joins any invited room before message policy applies. Set ${autoJoinPath}="allowlist" + ${autoJoinAllowlistPath} (or ${autoJoinPath}="off") to restrict joins.`];
}
function normalizeMatrixAcpConversationId(conversationId) {
	const target = resolveMatrixTargetIdentity(conversationId);
	if (!target || target.kind !== "room") return null;
	return { conversationId: target.id };
}
function matchMatrixAcpConversation(params) {
	const binding = normalizeMatrixAcpConversationId(params.bindingConversationId);
	if (!binding) return null;
	if (binding.conversationId === params.conversationId) return {
		conversationId: params.conversationId,
		matchPriority: 2
	};
	if (params.parentConversationId && params.parentConversationId !== params.conversationId && binding.conversationId === params.parentConversationId) return {
		conversationId: params.parentConversationId,
		matchPriority: 1
	};
	return null;
}
function resolveMatrixCommandConversation(params) {
	const parentConversationId = [
		params.originatingTo,
		params.commandTo,
		params.fallbackTo
	].map((candidate) => {
		const trimmed = candidate?.trim();
		if (!trimmed) return;
		const target = resolveMatrixTargetIdentity(trimmed);
		return target?.kind === "room" ? target.id : void 0;
	}).find((candidate) => Boolean(candidate));
	if (params.threadId) return {
		conversationId: params.threadId,
		...parentConversationId ? { parentConversationId } : {}
	};
	return parentConversationId ? { conversationId: parentConversationId } : null;
}
function resolveMatrixInboundConversation(params) {
	const rawTarget = params.to?.trim() || params.conversationId?.trim() || "";
	const target = rawTarget ? resolveMatrixTargetIdentity(rawTarget) : null;
	const parentConversationId = target?.kind === "room" ? target.id : void 0;
	const threadId = params.threadId != null ? String(params.threadId).trim() || void 0 : void 0;
	if (threadId) return {
		conversationId: threadId,
		...parentConversationId ? { parentConversationId } : {}
	};
	return parentConversationId ? { conversationId: parentConversationId } : null;
}
function resolveMatrixDeliveryTarget(params) {
	const parentConversationId = params.parentConversationId?.trim();
	if (parentConversationId && parentConversationId !== params.conversationId.trim()) {
		const parentTarget = resolveMatrixTargetIdentity(parentConversationId);
		if (parentTarget?.kind === "room") return {
			to: `room:${parentTarget.id}`,
			threadId: params.conversationId.trim()
		};
	}
	const conversationTarget = resolveMatrixTargetIdentity(params.conversationId);
	if (conversationTarget?.kind === "room") return { to: `room:${conversationTarget.id}` };
	return null;
}
const matrixPlugin = createChatChannelPlugin({
	base: {
		id: "matrix",
		meta,
		setupWizard: matrixOnboardingAdapter,
		capabilities: {
			chatTypes: [
				"direct",
				"group",
				"thread"
			],
			polls: true,
			reactions: true,
			threads: true,
			media: true
		},
		reload: { configPrefixes: ["channels.matrix"] },
		configSchema: buildChannelConfigSchema(MatrixConfigSchema),
		config: {
			...matrixConfigAdapter,
			isConfigured: (account) => account.configured,
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: account.configured,
				extra: { baseUrl: account.homeserver }
			})
		},
		approvalCapability: matrixApprovalCapability,
		groups: {
			resolveRequireMention: resolveMatrixGroupRequireMention,
			resolveToolPolicy: resolveMatrixGroupToolPolicy
		},
		conversationBindings: {
			supportsCurrentConversationBinding: true,
			defaultTopLevelPlacement: "child",
			setIdleTimeoutBySessionKey: ({ targetSessionKey, accountId, idleTimeoutMs }) => setMatrixThreadBindingIdleTimeoutBySessionKey({
				targetSessionKey,
				accountId: accountId ?? "",
				idleTimeoutMs
			}).map((binding) => ({
				boundAt: binding.boundAt,
				lastActivityAt: typeof binding.metadata?.lastActivityAt === "number" ? binding.metadata.lastActivityAt : binding.boundAt,
				idleTimeoutMs: typeof binding.metadata?.idleTimeoutMs === "number" ? binding.metadata.idleTimeoutMs : void 0,
				maxAgeMs: typeof binding.metadata?.maxAgeMs === "number" ? binding.metadata.maxAgeMs : void 0
			})),
			setMaxAgeBySessionKey: ({ targetSessionKey, accountId, maxAgeMs }) => setMatrixThreadBindingMaxAgeBySessionKey({
				targetSessionKey,
				accountId: accountId ?? "",
				maxAgeMs
			}).map((binding) => ({
				boundAt: binding.boundAt,
				lastActivityAt: typeof binding.metadata?.lastActivityAt === "number" ? binding.metadata.lastActivityAt : binding.boundAt,
				idleTimeoutMs: typeof binding.metadata?.idleTimeoutMs === "number" ? binding.metadata.idleTimeoutMs : void 0,
				maxAgeMs: typeof binding.metadata?.maxAgeMs === "number" ? binding.metadata.maxAgeMs : void 0
			}))
		},
		messaging: {
			normalizeTarget: normalizeMatrixMessagingTarget,
			resolveInboundConversation: ({ to, conversationId, threadId }) => resolveMatrixInboundConversation({
				to,
				conversationId,
				threadId
			}),
			resolveDeliveryTarget: ({ conversationId, parentConversationId }) => resolveMatrixDeliveryTarget({
				conversationId,
				parentConversationId
			}),
			resolveOutboundSessionRoute: (params) => resolveMatrixOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: (raw) => {
					const trimmed = raw.trim();
					if (!trimmed) return false;
					if (/^(matrix:)?[!#@]/i.test(trimmed)) return true;
					return trimmed.includes(":");
				},
				hint: "<room|alias|user>"
			}
		},
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => {
				return (await listMatrixDirectoryPeersFromConfig(params)).map((entry) => {
					const raw = entry.id.startsWith("user:") ? entry.id.slice(5) : entry.id;
					return !raw.startsWith("@") || !raw.includes(":") ? {
						...entry,
						name: "incomplete id; expected @user:server"
					} : entry;
				});
			},
			listGroups: async (params) => await listMatrixDirectoryGroupsFromConfig(params),
			...createRuntimeDirectoryLiveAdapter({
				getRuntime: loadMatrixChannelRuntime,
				listPeersLive: (runtime) => runtime.listMatrixDirectoryPeersLive,
				listGroupsLive: (runtime) => runtime.listMatrixDirectoryGroupsLive
			})
		}),
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind, runtime }) => (await loadMatrixChannelRuntime()).resolveMatrixTargets({
			cfg,
			accountId,
			inputs,
			kind,
			runtime
		}) },
		actions: matrixMessageActions,
		secrets: {
			secretTargetRegistryEntries,
			collectRuntimeConfigAssignments
		},
		setup: {
			...matrixSetupAdapter,
			singleAccountKeysToMove,
			namedAccountPromotionKeys,
			resolveSingleAccountPromotionTarget
		},
		bindings: {
			compileConfiguredBinding: ({ conversationId }) => normalizeMatrixAcpConversationId(conversationId),
			matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) => matchMatrixAcpConversation({
				bindingConversationId: compiledBinding.conversationId,
				conversationId,
				parentConversationId
			}),
			resolveCommandConversation: ({ threadId, originatingTo, commandTo, fallbackTo }) => resolveMatrixCommandConversation({
				threadId,
				originatingTo,
				commandTo,
				fallbackTo
			})
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("matrix", accounts),
			buildChannelSummary: ({ snapshot }) => buildProbeChannelStatusSummary(snapshot, { baseUrl: snapshot.baseUrl ?? null }),
			probeAccount: async ({ account, timeoutMs, cfg }) => {
				try {
					const { probeMatrix, resolveMatrixAuth } = await loadMatrixChannelRuntime();
					const auth = await resolveMatrixAuth({
						cfg,
						accountId: account.accountId
					});
					return await probeMatrix({
						homeserver: auth.homeserver,
						accessToken: auth.accessToken,
						userId: auth.userId,
						timeoutMs,
						accountId: account.accountId,
						allowPrivateNetwork: auth.allowPrivateNetwork,
						ssrfPolicy: auth.ssrfPolicy,
						dispatcherPolicy: auth.dispatcherPolicy
					});
				} catch (err) {
					return {
						ok: false,
						error: err instanceof Error ? err.message : String(err),
						elapsedMs: 0
					};
				}
			},
			resolveAccountSnapshot: ({ account, runtime }) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: account.configured,
				extra: {
					baseUrl: account.homeserver,
					lastProbeAt: runtime?.lastProbeAt ?? null,
					...buildTrafficStatusSummary(runtime)
				}
			})
		}),
		gateway: { startAccount: async (ctx) => {
			const account = ctx.account;
			ctx.setStatus({
				accountId: account.accountId,
				baseUrl: account.homeserver
			});
			ctx.log?.info(`[${account.accountId}] starting provider (${account.homeserver ?? "matrix"})`);
			const previousLock = matrixStartupLock;
			let releaseLock = () => {};
			matrixStartupLock = new Promise((resolve) => {
				releaseLock = resolve;
			});
			await previousLock;
			let monitorMatrixProvider;
			try {
				monitorMatrixProvider = (await import("./monitor-Ba5Pwkbl.js")).monitorMatrixProvider;
			} finally {
				releaseLock();
			}
			return monitorMatrixProvider({
				runtime: ctx.runtime,
				abortSignal: ctx.abortSignal,
				mediaMaxMb: account.config.mediaMaxMb,
				initialSyncLimit: account.config.initialSyncLimit,
				replyToMode: account.config.replyToMode,
				accountId: account.accountId
			});
		} },
		doctor: matrixDoctor,
		lifecycle: { runStartupMaintenance: runMatrixStartupMaintenance }
	},
	security: {
		resolveDmPolicy: resolveMatrixDmPolicy,
		collectWarnings: projectAccountConfigWarningCollector((cfg) => cfg, collectMatrixSecurityWarningsForAccount)
	},
	pairing: { text: {
		idLabel: "matrixUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^matrix:/i),
		notify: async ({ id, message, accountId }) => {
			const { sendMessageMatrix } = await loadMatrixChannelRuntime();
			await sendMessageMatrix(`user:${id}`, message, { ...accountId ? { accountId } : {} });
		}
	} },
	threading: {
		resolveReplyToMode: createScopedAccountReplyToModeResolver({
			resolveAccount: adaptScopedAccountAccessor(resolveMatrixAccountConfig),
			resolveReplyToMode: (account) => account.replyToMode
		}),
		buildToolContext: ({ context, hasRepliedRef }) => {
			return {
				currentChannelId: context.To?.trim() || void 0,
				currentThreadTs: context.MessageThreadId != null ? String(context.MessageThreadId) : void 0,
				currentDirectUserId: resolveMatrixDirectUserId({
					from: context.From,
					to: context.To,
					chatType: context.ChatType
				}),
				hasRepliedRef
			};
		}
	},
	outbound: {
		deliveryMode: "direct",
		chunker: chunkTextForOutbound,
		chunkerMode: "markdown",
		textChunkLimit: 4e3,
		shouldSuppressLocalPayloadPrompt: ({ cfg, accountId, payload }) => shouldSuppressLocalMatrixExecApprovalPrompt({
			cfg,
			accountId,
			payload
		}),
		...createRuntimeOutboundDelegates({
			getRuntime: loadMatrixChannelRuntime,
			sendText: {
				resolve: (runtime) => runtime.matrixOutbound.sendText,
				unavailableMessage: "Matrix outbound text delivery is unavailable"
			},
			sendMedia: {
				resolve: (runtime) => runtime.matrixOutbound.sendMedia,
				unavailableMessage: "Matrix outbound media delivery is unavailable"
			},
			sendPoll: {
				resolve: (runtime) => runtime.matrixOutbound.sendPoll,
				unavailableMessage: "Matrix outbound poll delivery is unavailable"
			}
		})
	}
});
//#endregion
export { matrixPlugin as t };
