import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { a as hasConfiguredSecretInput } from "./types.secrets-BZdSA8i7.js";
import { i as isPrivateOrLoopbackHost } from "./net-DwNAtbJy.js";
import { a as hasOwnProperty, r as collectSecretInputAssignment } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { O as promptAccountId, t as addWildcardAllowFrom, v as mergeAllowFromEntries } from "./setup-wizard-helpers-ecC16ic3.js";
import { t as promptChannelAccessConfig } from "./setup-group-access-Cq1zeHF4.js";
import { a as isPrivateNetworkOptInEnabled } from "./ssrf-policy-Cb9w9jMO.js";
import "./ssrf-runtime-DGIvmaoK.js";
import { c as hasConfiguredSecretInputValue, s as getChannelSurface, u as normalizeSecretStringValue } from "./security-runtime-DoGZwxD5.js";
import { n as requiresExplicitMatrixDefaultAccount, o as getMatrixScopedEnvVarNames } from "./account-selection-BneLmcra.js";
import { s as resolveMatrixAccountConfig, t as resolveMatrixConfigFieldPath } from "./config-paths-nydRhwNZ.js";
import { i as resolveMatrixAccount, r as resolveDefaultMatrixAccountId, t as listMatrixAccountIds } from "./accounts-CQDhvmdl.js";
import "./runtime-api-BHJ90QeI.js";
import { n as moveSingleMatrixAccountConfigToNamedAccount, r as resolveMatrixEnvAuthReadiness } from "./setup-core-FBjthm_-.js";
import { t as updateMatrixAccountConfig } from "./config-update-D6jgCQhg.js";
import { c as validateMatrixHomeserverUrl, s as resolveValidatedMatrixHomeserverUrl } from "./config-CKBswU4Q.js";
import "./client-D5ulyvLU.js";
import { n as listMatrixDirectoryGroupsLive, t as resolveMatrixTargets } from "./resolve-targets-WY-y-2j2.js";
import { n as ensureMatrixSdkInstalled, r as isMatrixSdkAvailable } from "./deps-BEf6znsR.js";
//#region extensions/matrix/src/secret-contract.ts
const secretTargetRegistryEntries = [
	{
		id: "channels.matrix.accounts.*.accessToken",
		targetType: "channels.matrix.accounts.*.accessToken",
		configFile: "openclaw.json",
		pathPattern: "channels.matrix.accounts.*.accessToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.matrix.accounts.*.password",
		targetType: "channels.matrix.accounts.*.password",
		configFile: "openclaw.json",
		pathPattern: "channels.matrix.accounts.*.password",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.matrix.accessToken",
		targetType: "channels.matrix.accessToken",
		configFile: "openclaw.json",
		pathPattern: "channels.matrix.accessToken",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	},
	{
		id: "channels.matrix.password",
		targetType: "channels.matrix.password",
		configFile: "openclaw.json",
		pathPattern: "channels.matrix.password",
		secretShape: "secret_input",
		expectedResolvedValue: "string",
		includeInPlan: true,
		includeInConfigure: true,
		includeInAudit: true
	}
];
function collectRuntimeConfigAssignments(params) {
	const resolved = getChannelSurface(params.config, "matrix");
	if (!resolved) return;
	const { channel: matrix, surface } = resolved;
	const envAccessTokenConfigured = normalizeSecretStringValue(params.context.env.MATRIX_ACCESS_TOKEN).length > 0;
	const defaultScopedAccessTokenConfigured = normalizeSecretStringValue(params.context.env[getMatrixScopedEnvVarNames("default").accessToken]).length > 0;
	const defaultAccountAccessTokenConfigured = surface.accounts.some(({ accountId, account }) => normalizeAccountId(accountId) === "default" && hasConfiguredSecretInputValue(account.accessToken, params.defaults));
	const baseAccessTokenConfigured = hasConfiguredSecretInputValue(matrix.accessToken, params.defaults);
	collectSecretInputAssignment({
		value: matrix.accessToken,
		path: "channels.matrix.accessToken",
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: surface.channelEnabled,
		inactiveReason: "Matrix channel is disabled.",
		apply: (value) => {
			matrix.accessToken = value;
		}
	});
	collectSecretInputAssignment({
		value: matrix.password,
		path: "channels.matrix.password",
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: surface.channelEnabled && !(baseAccessTokenConfigured || envAccessTokenConfigured || defaultScopedAccessTokenConfigured || defaultAccountAccessTokenConfigured),
		inactiveReason: "Matrix channel is disabled or access-token auth is configured for the default Matrix account.",
		apply: (value) => {
			matrix.password = value;
		}
	});
	if (!surface.hasExplicitAccounts) return;
	for (const { accountId, account, enabled } of surface.accounts) {
		if (hasOwnProperty(account, "accessToken")) collectSecretInputAssignment({
			value: account.accessToken,
			path: `channels.matrix.accounts.${accountId}.accessToken`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: enabled,
			inactiveReason: "Matrix account is disabled.",
			apply: (value) => {
				account.accessToken = value;
			}
		});
		if (!hasOwnProperty(account, "password")) continue;
		const accountAccessTokenConfigured = hasConfiguredSecretInputValue(account.accessToken, params.defaults);
		const scopedEnvAccessTokenConfigured = normalizeSecretStringValue(params.context.env[getMatrixScopedEnvVarNames(accountId).accessToken]).length > 0;
		const inheritedDefaultAccountAccessTokenConfigured = normalizeAccountId(accountId) === "default" && (baseAccessTokenConfigured || envAccessTokenConfigured);
		collectSecretInputAssignment({
			value: account.password,
			path: `channels.matrix.accounts.${accountId}.password`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: enabled && !(accountAccessTokenConfigured || scopedEnvAccessTokenConfigured || inheritedDefaultAccountAccessTokenConfigured),
			inactiveReason: "Matrix account is disabled or this account has an accessToken configured.",
			apply: (value) => {
				account.password = value;
			}
		});
	}
}
//#endregion
//#region extensions/matrix/src/onboarding.ts
const channel = "matrix";
function resolveMatrixOnboardingAccountId(cfg, accountId) {
	return normalizeAccountId(accountId?.trim() || resolveDefaultMatrixAccountId(cfg) || "default");
}
function setMatrixDmPolicy(cfg, policy, accountId) {
	const resolvedAccountId = resolveMatrixOnboardingAccountId(cfg, accountId);
	const existing = resolveMatrixAccountConfig({
		cfg,
		accountId: resolvedAccountId
	});
	const allowFrom = policy === "open" ? addWildcardAllowFrom(existing.dm?.allowFrom) : void 0;
	return updateMatrixAccountConfig(cfg, resolvedAccountId, { dm: {
		...existing.dm,
		policy,
		...allowFrom ? { allowFrom } : {}
	} });
}
async function noteMatrixAuthHelp(prompter) {
	await prompter.note([
		"Matrix requires a homeserver URL.",
		"Use an access token (recommended) or password login to an existing account.",
		"With access token: user ID is fetched automatically.",
		"Env vars supported: MATRIX_HOMESERVER, MATRIX_USER_ID, MATRIX_ACCESS_TOKEN, MATRIX_PASSWORD, MATRIX_DEVICE_ID, MATRIX_DEVICE_NAME.",
		"Per-account env vars: MATRIX_<ACCOUNT_ID>_HOMESERVER, MATRIX_<ACCOUNT_ID>_USER_ID, MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN, MATRIX_<ACCOUNT_ID>_PASSWORD, MATRIX_<ACCOUNT_ID>_DEVICE_ID, MATRIX_<ACCOUNT_ID>_DEVICE_NAME.",
		`Docs: ${formatDocsLink("/channels/matrix", "channels/matrix")}`
	].join("\n"), "Matrix setup");
}
function requiresMatrixPrivateNetworkOptIn(homeserver) {
	try {
		const parsed = new URL(homeserver);
		return parsed.protocol === "http:" && !isPrivateOrLoopbackHost(parsed.hostname);
	} catch {
		return false;
	}
}
async function promptMatrixAllowFrom(params) {
	const { cfg, prompter } = params;
	const accountId = resolveMatrixOnboardingAccountId(cfg, params.accountId);
	const existingConfig = resolveMatrixAccountConfig({
		cfg,
		accountId
	});
	const existingAllowFrom = existingConfig.dm?.allowFrom ?? [];
	const account = resolveMatrixAccount({
		cfg,
		accountId
	});
	const canResolve = Boolean(account.configured);
	const parseInput = (raw) => raw.split(/[\n,;]+/g).map((entry) => entry.trim()).filter(Boolean);
	const isFullUserId = (value) => value.startsWith("@") && value.includes(":");
	while (true) {
		const entry = await prompter.text({
			message: "Matrix allowFrom (full @user:server; display name only if unique)",
			placeholder: "@user:server",
			initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : void 0,
			validate: (value) => String(value ?? "").trim() ? void 0 : "Required"
		});
		const parts = parseInput(String(entry));
		const resolvedIds = [];
		const pending = [];
		const unresolved = [];
		const unresolvedNotes = [];
		for (const part of parts) {
			if (isFullUserId(part)) {
				resolvedIds.push(part);
				continue;
			}
			if (!canResolve) {
				unresolved.push(part);
				continue;
			}
			pending.push(part);
		}
		if (pending.length > 0) {
			const results = await resolveMatrixTargets({
				cfg,
				accountId,
				inputs: pending,
				kind: "user"
			}).catch(() => []);
			for (const result of results) {
				if (result?.resolved && result.id) {
					resolvedIds.push(result.id);
					continue;
				}
				if (result?.input) {
					unresolved.push(result.input);
					if (result.note) unresolvedNotes.push(`${result.input}: ${result.note}`);
				}
			}
		}
		if (unresolved.length > 0) {
			const details = unresolvedNotes.length > 0 ? unresolvedNotes : unresolved;
			await prompter.note(`Could not resolve:\n${details.join("\n")}\nUse full @user:server IDs.`, "Matrix allowlist");
			continue;
		}
		const unique = mergeAllowFromEntries(existingAllowFrom, resolvedIds);
		return updateMatrixAccountConfig(cfg, accountId, { dm: {
			...existingConfig.dm,
			policy: "allowlist",
			allowFrom: unique
		} });
	}
}
function setMatrixGroupPolicy(cfg, groupPolicy, accountId) {
	return updateMatrixAccountConfig(cfg, resolveMatrixOnboardingAccountId(cfg, accountId), { groupPolicy });
}
function setMatrixGroupRooms(cfg, roomKeys, accountId) {
	const groups = Object.fromEntries(roomKeys.map((key) => [key, { enabled: true }]));
	return updateMatrixAccountConfig(cfg, resolveMatrixOnboardingAccountId(cfg, accountId), {
		groups,
		rooms: null
	});
}
const dmPolicy = {
	label: "Matrix",
	channel,
	policyKey: "channels.matrix.dm.policy",
	allowFromKey: "channels.matrix.dm.allowFrom",
	resolveConfigKeys: (cfg, accountId) => {
		const effectiveAccountId = resolveMatrixOnboardingAccountId(cfg, accountId);
		return {
			policyKey: resolveMatrixConfigFieldPath(cfg, effectiveAccountId, "dm.policy"),
			allowFromKey: resolveMatrixConfigFieldPath(cfg, effectiveAccountId, "dm.allowFrom")
		};
	},
	getCurrent: (cfg, accountId) => resolveMatrixAccountConfig({
		cfg,
		accountId: resolveMatrixOnboardingAccountId(cfg, accountId)
	}).dm?.policy ?? "pairing",
	setPolicy: (cfg, policy, accountId) => setMatrixDmPolicy(cfg, policy, accountId),
	promptAllowFrom: promptMatrixAllowFrom
};
async function runMatrixConfigure(params) {
	let next = params.cfg;
	await ensureMatrixSdkInstalled({
		runtime: params.runtime,
		confirm: async (message) => await params.prompter.confirm({
			message,
			initialValue: true
		})
	});
	const defaultAccountId = resolveDefaultMatrixAccountId(next);
	let accountId = defaultAccountId || "default";
	if (params.intent === "add-account") {
		const enteredName = String(await params.prompter.text({
			message: "Matrix account name",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim();
		accountId = normalizeAccountId(enteredName);
		if (enteredName !== accountId) await params.prompter.note(`Account id will be "${accountId}".`, "Matrix account");
		if (accountId !== "default") next = moveSingleMatrixAccountConfigToNamedAccount(next);
		next = updateMatrixAccountConfig(next, accountId, {
			name: enteredName,
			enabled: true
		});
	} else {
		const override = params.accountOverrides?.[channel]?.trim();
		if (override) accountId = normalizeAccountId(override);
		else if (params.shouldPromptAccountIds) accountId = await promptAccountId({
			cfg: next,
			prompter: params.prompter,
			label: "Matrix",
			currentId: accountId,
			listAccountIds: (inputCfg) => listMatrixAccountIds(inputCfg),
			defaultAccountId
		});
	}
	const existing = resolveMatrixAccountConfig({
		cfg: next,
		accountId
	});
	if (!resolveMatrixAccount({
		cfg: next,
		accountId
	}).configured) await noteMatrixAuthHelp(params.prompter);
	const envReadiness = resolveMatrixEnvAuthReadiness(accountId, process.env);
	const envReady = envReadiness.ready;
	const envHomeserver = envReadiness.homeserver;
	const envUserId = envReadiness.userId;
	if (envReady && !existing.homeserver && !existing.userId && !existing.accessToken && !existing.password) {
		if (await params.prompter.confirm({
			message: `Matrix env vars detected (${envReadiness.sourceHint}). Use env values?`,
			initialValue: true
		})) {
			next = updateMatrixAccountConfig(next, accountId, { enabled: true });
			if (params.forceAllowFrom) next = await promptMatrixAllowFrom({
				cfg: next,
				prompter: params.prompter,
				accountId
			});
			return {
				cfg: next,
				accountId
			};
		}
	}
	const homeserver = String(await params.prompter.text({
		message: "Matrix homeserver URL",
		initialValue: existing.homeserver ?? envHomeserver,
		validate: (value) => {
			try {
				validateMatrixHomeserverUrl(String(value ?? ""), { allowPrivateNetwork: true });
				return;
			} catch (error) {
				return error instanceof Error ? error.message : "Invalid Matrix homeserver URL";
			}
		}
	})).trim();
	const requiresAllowPrivateNetwork = requiresMatrixPrivateNetworkOptIn(homeserver);
	const shouldPromptAllowPrivateNetwork = requiresAllowPrivateNetwork || isPrivateNetworkOptInEnabled(existing);
	const allowPrivateNetwork = shouldPromptAllowPrivateNetwork ? await params.prompter.confirm({
		message: "Allow private/internal Matrix homeserver traffic for this account?",
		initialValue: isPrivateNetworkOptInEnabled(existing) || requiresAllowPrivateNetwork
	}) : false;
	if (requiresAllowPrivateNetwork && !allowPrivateNetwork) throw new Error("Matrix homeserver requires explicit private-network opt-in");
	await resolveValidatedMatrixHomeserverUrl(homeserver, { dangerouslyAllowPrivateNetwork: allowPrivateNetwork });
	let accessToken = existing.accessToken;
	let password = existing.password;
	let userId = existing.userId ?? "";
	if (hasConfiguredSecretInput(accessToken) || hasConfiguredSecretInput(password)) {
		if (!await params.prompter.confirm({
			message: "Matrix credentials already configured. Keep them?",
			initialValue: true
		})) {
			accessToken = void 0;
			password = void 0;
			userId = "";
		}
	}
	if (!hasConfiguredSecretInput(accessToken) && !hasConfiguredSecretInput(password)) if (await params.prompter.select({
		message: "Matrix auth method",
		options: [{
			value: "token",
			label: "Access token (user ID fetched automatically)"
		}, {
			value: "password",
			label: "Password (requires user ID)"
		}]
	}) === "token") {
		accessToken = String(await params.prompter.text({
			message: "Matrix access token",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim();
		password = void 0;
		userId = "";
	} else {
		userId = String(await params.prompter.text({
			message: "Matrix user ID",
			initialValue: existing.userId ?? envUserId,
			validate: (value) => {
				const raw = String(value ?? "").trim();
				if (!raw) return "Required";
				if (!raw.startsWith("@")) return "Matrix user IDs should start with @";
				if (!raw.includes(":")) return "Matrix user IDs should include a server (:server)";
			}
		})).trim();
		password = String(await params.prompter.text({
			message: "Matrix password",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim();
		accessToken = void 0;
	}
	const deviceName = String(await params.prompter.text({
		message: "Matrix device name (optional)",
		initialValue: existing.deviceName ?? "OpenClaw Gateway"
	})).trim();
	const enableEncryption = await params.prompter.confirm({
		message: "Enable end-to-end encryption (E2EE)?",
		initialValue: existing.encryption ?? false
	});
	next = updateMatrixAccountConfig(next, accountId, {
		enabled: true,
		homeserver,
		...shouldPromptAllowPrivateNetwork ? { allowPrivateNetwork: allowPrivateNetwork ? true : null } : {},
		userId: userId || null,
		accessToken: accessToken ?? null,
		password: password ?? null,
		deviceName: deviceName || null,
		encryption: enableEncryption
	});
	if (params.forceAllowFrom) next = await promptMatrixAllowFrom({
		cfg: next,
		prompter: params.prompter,
		accountId
	});
	const existingAccountConfig = resolveMatrixAccountConfig({
		cfg: next,
		accountId
	});
	const existingGroups = existingAccountConfig.groups ?? existingAccountConfig.rooms;
	const accessConfig = await promptChannelAccessConfig({
		prompter: params.prompter,
		label: "Matrix rooms",
		currentPolicy: existingAccountConfig.groupPolicy ?? "allowlist",
		currentEntries: Object.keys(existingGroups ?? {}),
		placeholder: "!roomId:server, #alias:server, Project Room",
		updatePrompt: Boolean(existingGroups)
	});
	if (accessConfig) if (accessConfig.policy !== "allowlist") next = setMatrixGroupPolicy(next, accessConfig.policy, accountId);
	else {
		let roomKeys = accessConfig.entries;
		if (accessConfig.entries.length > 0) try {
			const resolvedIds = [];
			const unresolved = [];
			for (const entry of accessConfig.entries) {
				const trimmed = entry.trim();
				if (!trimmed) continue;
				const cleaned = trimmed.replace(/^(room|channel):/i, "").trim();
				if (cleaned.startsWith("!") && cleaned.includes(":")) {
					resolvedIds.push(cleaned);
					continue;
				}
				const matches = await listMatrixDirectoryGroupsLive({
					cfg: next,
					accountId,
					query: trimmed,
					limit: 10
				});
				const best = matches.find((match) => (match.name ?? "").toLowerCase() === trimmed.toLowerCase()) ?? matches[0];
				if (best?.id) resolvedIds.push(best.id);
				else unresolved.push(entry);
			}
			roomKeys = [...resolvedIds, ...unresolved.map((entry) => entry.trim()).filter(Boolean)];
			if (resolvedIds.length > 0 || unresolved.length > 0) await params.prompter.note([resolvedIds.length > 0 ? `Resolved: ${resolvedIds.join(", ")}` : void 0, unresolved.length > 0 ? `Unresolved (kept as typed): ${unresolved.join(", ")}` : void 0].filter(Boolean).join("\n"), "Matrix rooms");
		} catch (err) {
			await params.prompter.note(`Room lookup failed; keeping entries as typed. ${String(err)}`, "Matrix rooms");
		}
		next = setMatrixGroupPolicy(next, "allowlist", accountId);
		next = setMatrixGroupRooms(next, roomKeys, accountId);
	}
	return {
		cfg: next,
		accountId
	};
}
const matrixOnboardingAdapter = {
	channel,
	getStatus: async ({ cfg, accountOverrides }) => {
		const resolvedCfg = cfg;
		const sdkReady = isMatrixSdkAvailable();
		if (!accountOverrides[channel] && requiresExplicitMatrixDefaultAccount(resolvedCfg)) return {
			channel,
			configured: false,
			statusLines: ["Matrix: set \"channels.matrix.defaultAccount\" to select a named account"],
			selectionHint: !sdkReady ? "install Matrix deps" : "set defaultAccount"
		};
		const configured = resolveMatrixAccount({
			cfg: resolvedCfg,
			accountId: resolveMatrixOnboardingAccountId(resolvedCfg, accountOverrides[channel])
		}).configured;
		return {
			channel,
			configured,
			statusLines: [`Matrix: ${configured ? "configured" : "needs homeserver + access token or password"}`],
			selectionHint: !sdkReady ? "install Matrix deps" : configured ? "configured" : "needs auth"
		};
	},
	configure: async ({ cfg, runtime, prompter, forceAllowFrom, accountOverrides, shouldPromptAccountIds }) => await runMatrixConfigure({
		cfg,
		runtime,
		prompter,
		forceAllowFrom,
		accountOverrides,
		shouldPromptAccountIds,
		intent: "update"
	}),
	configureInteractive: async ({ cfg, runtime, prompter, forceAllowFrom, accountOverrides, shouldPromptAccountIds, configured }) => {
		if (!configured) return await runMatrixConfigure({
			cfg,
			runtime,
			prompter,
			forceAllowFrom,
			accountOverrides,
			shouldPromptAccountIds,
			intent: "update"
		});
		const action = await prompter.select({
			message: "Matrix already configured. What do you want to do?",
			options: [
				{
					value: "update",
					label: "Modify settings"
				},
				{
					value: "add-account",
					label: "Add account"
				},
				{
					value: "skip",
					label: "Skip (leave as-is)"
				}
			],
			initialValue: "update"
		});
		if (action === "skip") return "skip";
		return await runMatrixConfigure({
			cfg,
			runtime,
			prompter,
			forceAllowFrom,
			accountOverrides,
			shouldPromptAccountIds,
			intent: action === "add-account" ? "add-account" : "update"
		});
	},
	afterConfigWritten: async ({ previousCfg, cfg, accountId, runtime }) => {
		const { runMatrixSetupBootstrapAfterConfigWrite } = await import("./setup-bootstrap-CIVZT1j-.js");
		await runMatrixSetupBootstrapAfterConfigWrite({
			previousCfg,
			cfg,
			accountId,
			runtime
		});
	},
	dmPolicy,
	disable: (cfg) => ({
		...cfg,
		channels: {
			...cfg.channels,
			matrix: {
				...cfg.channels?.["matrix"],
				enabled: false
			}
		}
	})
};
//#endregion
export { collectRuntimeConfigAssignments as n, secretTargetRegistryEntries as r, matrixOnboardingAdapter as t };
