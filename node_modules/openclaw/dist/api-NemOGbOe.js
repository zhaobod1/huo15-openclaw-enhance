import { r as __exportAll, s as __toESM, t as __commonJSMin } from "./chunk-iyeSoAlh.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID$1 } from "./session-key-BR3Z-ljs.js";
import { m as MarkdownConfigSchema } from "./zod-schema.core-BITC5-JP.js";
import { r as buildChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { i as listCombinedAccountIds, n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { t as createPluginRuntimeStore } from "./runtime-store-Cwr8GGg4.js";
import { i as createPairingPrefixStripper, r as createLoggedPairingApprovalNotifier } from "./channel-pairing-DrJTvhRN.js";
import { d as createDefaultChannelRuntimeState, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./setup-Dp8bIdbL.js";
import "./account-resolution-CIVX3Yfx.js";
import { n as buildPassiveProbedChannelStatusSummary } from "./extension-shared-CKz43ndd.js";
import "./channel-config-primitives-DiYud7LO.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import { t as require_retry } from "./retry-BmBG4663.js";
import "./runtime-api-B4pYRfhO.js";
import { a as __read, i as __generator, n as __decorate, o as __spreadArray, r as __extends, s as init_tslib_es6, t as __awaiter } from "./tslib.es6-cxU1nIhC.js";
import { randomUUID } from "node:crypto";
import { WebSocket as WebSocket$2 } from "ws";
import * as tls from "tls";
import { Socket } from "net";
//#region extensions/twitch/src/token.ts
/**
* Twitch access token resolution with environment variable support.
*
* Supports reading Twitch OAuth access tokens from config or environment variable.
* The OPENCLAW_TWITCH_ACCESS_TOKEN env var is only used for the default account.
*
* Token resolution priority:
* 1. Account access token from merged config (accounts.{id} or base-level for default)
* 2. Environment variable: OPENCLAW_TWITCH_ACCESS_TOKEN (default account only)
*/
/**
* Normalize a Twitch OAuth token - ensure it has the oauth: prefix
*/
function normalizeTwitchToken(raw) {
	if (!raw) return;
	const trimmed = raw.trim();
	if (!trimmed) return;
	return trimmed.startsWith("oauth:") ? trimmed : `oauth:${trimmed}`;
}
/**
* Resolve Twitch access token from config or environment variable.
*
* Priority:
* 1. Account access token (from merged config - base-level for default, or accounts.{accountId})
* 2. Environment variable: OPENCLAW_TWITCH_ACCESS_TOKEN (default account only)
*
* The getAccountConfig function handles merging base-level config with accounts.default,
* so this logic works for both simplified and multi-account patterns.
*
* @param cfg - OpenClaw config
* @param opts - Options including accountId and optional envToken override
* @returns Token resolution with source
*/
function resolveTwitchToken(cfg, opts = {}) {
	const accountId = normalizeAccountId(opts.accountId);
	const twitchCfg = cfg?.channels?.twitch;
	const accountCfg = accountId === "default" ? twitchCfg?.accounts?.[DEFAULT_ACCOUNT_ID$1] : twitchCfg?.accounts?.[accountId];
	let token;
	if (accountId === "default") token = normalizeTwitchToken((typeof twitchCfg?.accessToken === "string" ? twitchCfg.accessToken : void 0) || accountCfg?.accessToken);
	else token = normalizeTwitchToken(accountCfg?.accessToken);
	if (token) return {
		token,
		source: "config"
	};
	const envToken = accountId === "default" ? normalizeTwitchToken(opts.envToken ?? process.env.OPENCLAW_TWITCH_ACCESS_TOKEN) : void 0;
	if (envToken) return {
		token: envToken,
		source: "env"
	};
	return {
		token: "",
		source: "none"
	};
}
//#endregion
//#region extensions/twitch/src/utils/twitch.ts
/**
* Twitch-specific utility functions
*/
/**
* Normalize Twitch channel names.
*
* Removes the '#' prefix if present, converts to lowercase, and trims whitespace.
* Twitch channel names are case-insensitive and don't use the '#' prefix in the API.
*
* @param channel - The channel name to normalize
* @returns Normalized channel name
*
* @example
* normalizeTwitchChannel("#TwitchChannel") // "twitchchannel"
* normalizeTwitchChannel("MyChannel") // "mychannel"
*/
function normalizeTwitchChannel(channel) {
	const trimmed = channel.trim().toLowerCase();
	return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
}
/**
* Create a standardized error message for missing target.
*
* @param provider - The provider name (e.g., "Twitch")
* @param hint - Optional hint for how to fix the issue
* @returns Error object with descriptive message
*/
function missingTargetError(provider, hint) {
	return /* @__PURE__ */ new Error(`Delivering to ${provider} requires target${hint ? ` ${hint}` : ""}`);
}
/**
* Generate a unique message ID for Twitch messages.
*
* Twurple's say() doesn't return the message ID, so we generate one
* for tracking purposes.
*
* @returns A unique message ID
*/
function generateMessageId() {
	return `${Date.now()}-${randomUUID()}`;
}
/**
* Normalize OAuth token by removing the "oauth:" prefix if present.
*
* Twurple doesn't require the "oauth:" prefix, so we strip it for consistency.
*
* @param token - The OAuth token to normalize
* @returns Normalized token without "oauth:" prefix
*
* @example
* normalizeToken("oauth:abc123") // "abc123"
* normalizeToken("abc123") // "abc123"
*/
function normalizeToken(token) {
	return token.startsWith("oauth:") ? token.slice(6) : token;
}
/**
* Check if an account is properly configured with required credentials.
*
* @param account - The Twitch account config to check
* @returns true if the account has required credentials
*/
function isAccountConfigured(account, resolvedToken) {
	const token = resolvedToken ?? account?.accessToken;
	return Boolean(account?.username && token && account?.clientId);
}
//#endregion
//#region extensions/twitch/src/config.ts
/**
* Default account ID for Twitch
*/
const DEFAULT_ACCOUNT_ID = "default";
/**
* Get account config from core config
*
* Handles two patterns:
* 1. Simplified single-account: base-level properties create implicit "default" account
* 2. Multi-account: explicit accounts object
*
* For "default" account, base-level properties take precedence over accounts.default
* For other accounts, only the accounts object is checked
*/
function getAccountConfig(coreConfig, accountId) {
	if (!coreConfig || typeof coreConfig !== "object") return null;
	const twitchRaw = coreConfig.channels?.twitch;
	const accounts = twitchRaw?.accounts;
	if (accountId === "default") {
		const accountFromAccounts = accounts?.[DEFAULT_ACCOUNT_ID];
		const baseLevel = {
			username: typeof twitchRaw?.username === "string" ? twitchRaw.username : void 0,
			accessToken: typeof twitchRaw?.accessToken === "string" ? twitchRaw.accessToken : void 0,
			clientId: typeof twitchRaw?.clientId === "string" ? twitchRaw.clientId : void 0,
			channel: typeof twitchRaw?.channel === "string" ? twitchRaw.channel : void 0,
			enabled: typeof twitchRaw?.enabled === "boolean" ? twitchRaw.enabled : void 0,
			allowFrom: Array.isArray(twitchRaw?.allowFrom) ? twitchRaw.allowFrom : void 0,
			allowedRoles: Array.isArray(twitchRaw?.allowedRoles) ? twitchRaw.allowedRoles : void 0,
			requireMention: typeof twitchRaw?.requireMention === "boolean" ? twitchRaw.requireMention : void 0,
			clientSecret: typeof twitchRaw?.clientSecret === "string" ? twitchRaw.clientSecret : void 0,
			refreshToken: typeof twitchRaw?.refreshToken === "string" ? twitchRaw.refreshToken : void 0,
			expiresIn: typeof twitchRaw?.expiresIn === "number" ? twitchRaw.expiresIn : void 0,
			obtainmentTimestamp: typeof twitchRaw?.obtainmentTimestamp === "number" ? twitchRaw.obtainmentTimestamp : void 0
		};
		const merged = {
			...accountFromAccounts,
			...baseLevel
		};
		if (merged.username) return merged;
		if (accountFromAccounts) return accountFromAccounts;
		return null;
	}
	if (!accounts || !accounts[accountId]) return null;
	return accounts[accountId];
}
/**
* List all configured account IDs
*
* Includes both explicit accounts and implicit "default" from base-level config
*/
function listAccountIds(cfg) {
	const twitchRaw = cfg.channels?.twitch;
	const accountMap = twitchRaw?.accounts;
	const hasBaseLevelConfig = twitchRaw && (typeof twitchRaw.username === "string" || typeof twitchRaw.accessToken === "string" || typeof twitchRaw.channel === "string");
	return listCombinedAccountIds({
		configuredAccountIds: Object.keys(accountMap ?? {}),
		implicitAccountId: hasBaseLevelConfig ? DEFAULT_ACCOUNT_ID : void 0
	});
}
function resolveDefaultTwitchAccountId(cfg) {
	const preferred = typeof cfg.channels?.twitch?.defaultAccount === "string" ? cfg.channels.twitch.defaultAccount.trim() : "";
	const ids = listAccountIds(cfg);
	if (preferred && ids.includes(preferred)) return preferred;
	if (ids.includes("default")) return DEFAULT_ACCOUNT_ID;
	return ids[0] ?? "default";
}
function resolveTwitchAccountContext(cfg, accountId) {
	const resolvedAccountId = accountId?.trim() || resolveDefaultTwitchAccountId(cfg);
	const account = getAccountConfig(cfg, resolvedAccountId);
	const tokenResolution = resolveTwitchToken(cfg, { accountId: resolvedAccountId });
	return {
		accountId: resolvedAccountId,
		account,
		tokenResolution,
		configured: account ? isAccountConfigured(account, tokenResolution.token) : false,
		availableAccountIds: listAccountIds(cfg)
	};
}
function resolveTwitchSnapshotAccountId(cfg, account) {
	const accountMap = (cfg.channels?.twitch)?.accounts ?? {};
	return Object.entries(accountMap).find(([, value]) => value === account)?.[0] ?? "default";
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/decorators/Enumerable.mjs
function Enumerable(enumerable) {
	if (enumerable === void 0) enumerable = true;
	return function(target, key) {
		Object.defineProperty(target, key, {
			get: function() {},
			set: function(val) {
				Object.defineProperty(this, key, {
					value: val,
					writable: true,
					enumerable
				});
			},
			enumerable
		});
	};
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/array/flatten.mjs
init_tslib_es6();
function flatten(arr) {
	var _a;
	return (_a = []).concat.apply(_a, __spreadArray([], __read(arr), false));
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/config/resolveConfigValue.mjs
init_tslib_es6();
function resolveConfigValue(value) {
	return __awaiter(this, void 0, Promise, function() {
		return __generator(this, function(_a) {
			switch (_a.label) {
				case 0:
					if (!(typeof value === "function")) return [3, 2];
					return [4, value()];
				case 1: return [2, _a.sent()];
				case 2: return [2, value];
			}
		});
	});
}
function resolveConfigValueSync(value) {
	if (typeof value === "function") return value();
	return value;
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/math/fib.mjs
init_tslib_es6();
function fibWithLimit(limit) {
	var current, next;
	var _a;
	return __generator(this, function(_b) {
		switch (_b.label) {
			case 0:
				current = 0;
				next = 1;
				_b.label = 1;
			case 1:
				if (!(current < limit)) return [3, 3];
				return [4, current];
			case 2:
				_b.sent();
				_a = __read([next, current + next], 2), current = _a[0], next = _a[1];
				return [3, 1];
			case 3: return [4, limit];
			case 4:
				_b.sent();
				return [3, 3];
			case 5: return [2];
		}
	});
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/object/arrayToObject.mjs
init_tslib_es6();
function arrayToObject(arr, fn) {
	return Object.assign.apply(Object, __spreadArray([{}], __read(arr.map(fn)), false));
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/object/forEachObjectEntry.mjs
init_tslib_es6();
function forEachObjectEntry(obj, fn) {
	Object.entries(obj).forEach(function(_a) {
		var _b = __read(_a, 2), key = _b[0], value = _b[1];
		return fn(value, key);
	});
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/object/indexBy.mjs
function indexBy(arr, keyFn) {
	if (typeof keyFn !== "function") {
		var key_1 = keyFn;
		keyFn = (function(value) {
			return value[key_1].toString();
		});
	}
	return arrayToObject(arr, function(val) {
		var _a;
		return _a = {}, _a[keyFn(val)] = val, _a;
	});
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/optional/mapOptional.mjs
function isNullish(value) {
	return value == null;
}
function mapNullable(value, cb) {
	return isNullish(value) ? null : cb(value);
}
function mapOptional(value, cb) {
	return isNullish(value) ? void 0 : cb(value);
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/promise/delay.mjs
init_tslib_es6();
function delay(ms) {
	return __awaiter(this, void 0, Promise, function() {
		return __generator(this, function(_a) {
			switch (_a.label) {
				case 0: return [4, new Promise(function(resolve) {
					return setTimeout(resolve, ms);
				})];
				case 1:
					_a.sent();
					return [2];
			}
		});
	});
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/promise/withResolvers.mjs
function promiseWithResolvers() {
	var resolve;
	var reject;
	return {
		promise: new Promise(function(_resolve, _reject) {
			resolve = _resolve;
			reject = _reject;
		}),
		resolve,
		reject
	};
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/string/padLeft.mjs
function padLeft(str, length, padding) {
	if (typeof str === "number") str = str.toString();
	length = length - str.length;
	if (length <= 0) return str;
	if (padding === void 0) padding = " ";
	var paddingStr = "";
	do {
		if ((length & 1) === 1) paddingStr += padding;
		length >>= 1;
		if (length) padding += padding;
	} while (length);
	return paddingStr + str;
}
//#endregion
//#region node_modules/@d-fischer/shared-utils/es/functions/string/splitWithLimit.mjs
init_tslib_es6();
function splitWithLimit(str, delim, count) {
	var parts = str.split(delim);
	if (parts.length <= count) return parts;
	return __spreadArray(__spreadArray([], __read(parts.slice(0, count - 1)), false), [parts.slice(count - 1).join(delim)], false);
}
//#endregion
//#region node_modules/@twurple/auth/lib/AccessToken.js
const EXPIRY_GRACE_PERIOD = 6e4;
function getExpiryMillis(token) {
	return mapNullable(token.expiresIn, (_) => token.obtainmentTimestamp + _ * 1e3 - EXPIRY_GRACE_PERIOD);
}
/**
* Calculates whether the given access token is expired.
*
* A one-minute grace period is applied for smooth handling of API latency.
*
* @param token The access token.
*/
function accessTokenIsExpired(token) {
	return mapNullable(getExpiryMillis(token), (_) => Date.now() > _) ?? false;
}
//#endregion
//#region node_modules/@twurple/common/lib/DataObject.js
/** @private */
const rawDataSymbol = Symbol("twurpleRawData");
/** @private */
var DataObject = class {
	/** @private */ [rawDataSymbol];
	/** @private */
	constructor(data) {
		this[rawDataSymbol] = data;
	}
};
//#endregion
//#region node_modules/@twurple/common/lib/mockApiPort.js
/** @private */
function getMockApiPort() {
	try {
		return process.env.TWURPLE_MOCK_API_PORT ?? null;
	} catch {
		try {
			return import.meta.env.TWURPLE_MOCK_API_PORT ?? null;
		} catch {
			return null;
		}
	}
}
//#endregion
//#region node_modules/@twurple/common/lib/qs.js
function qsStringify(obj) {
	if (!obj) return "";
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(obj)) if (value === null) params.append(key, "");
	else if (Array.isArray(value)) for (const v of value) params.append(key, v.toString());
	else if (value !== void 0) params.append(key, value.toString());
	const result = params.toString();
	return result ? `?${result}` : "";
}
//#endregion
//#region node_modules/@twurple/common/lib/errors/CustomError.js
/** @private */
var CustomError$1 = class extends Error {
	constructor(message, options) {
		super(message, options);
		Object.setPrototypeOf(this, new.target.prototype);
		Error.captureStackTrace?.(this, new.target.constructor);
	}
	get name() {
		return this.constructor.name;
	}
};
//#endregion
//#region node_modules/@twurple/common/lib/errors/RelationAssertionError.js
/**
* Thrown when a relation that is expected to never be null does return null.
*/
var RelationAssertionError = class extends CustomError$1 {
	constructor() {
		super("Relation returned null - this may be a library bug or a race condition in your own code");
	}
};
//#endregion
//#region node_modules/@twurple/common/lib/relations.js
/** @private */
function checkRelationAssertion(value) {
	if (value == null) throw new RelationAssertionError();
	return value;
}
//#endregion
//#region node_modules/@twurple/common/lib/rtfm.js
/** @private */
function rtfm(pkg, name, idKey) {
	return (clazz) => {
		const fn = idKey ? function() {
			return `[${name}#${this[idKey]} - please check https://twurple.js.org/reference/${pkg}/classes/${name}.html for available properties]`;
		} : function() {
			return `[${name} - please check https://twurple.js.org/reference/${pkg}/classes/${name}.html for available properties]`;
		};
		Object.defineProperty(clazz.prototype, Symbol.for("nodejs.util.inspect.custom"), {
			value: fn,
			enumerable: false
		});
	};
}
//#endregion
//#region node_modules/@twurple/common/lib/extensions/HelixExtension.js
init_tslib_es6();
/**
* A Twitch Extension.
*/
let HelixExtension = class HelixExtension extends DataObject {
	/**
	* The name of the extension's author.
	*/
	get authorName() {
		return this[rawDataSymbol].author_name;
	}
	/**
	* Whether bits are enabled for the extension.
	*/
	get bitsEnabled() {
		return this[rawDataSymbol].bits_enabled;
	}
	/**
	* Whether the extension can be installed.
	*/
	get installable() {
		return this[rawDataSymbol].can_install;
	}
	/**
	* The location of the extension's configuration.
	*/
	get configurationLocation() {
		return this[rawDataSymbol].configuration_location;
	}
	/**
	* The extension's description.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The URL of the extension's terms of service.
	*/
	get tosUrl() {
		return this[rawDataSymbol].eula_tos_url;
	}
	/**
	* Whether the extension has support for sending chat messages.
	*/
	get hasChatSupport() {
		return this[rawDataSymbol].has_chat_support;
	}
	/**
	* The URL of the extension's default sized icon.
	*/
	get iconUrl() {
		return this[rawDataSymbol].icon_url;
	}
	/**
	* Gets the URL of the extension's icon in the given size.
	*
	* @param size The size of the icon.
	*/
	getIconUrl(size) {
		return this[rawDataSymbol].icon_urls[size];
	}
	/**
	* The extension's ID.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The extension's name.
	*/
	get name() {
		return this[rawDataSymbol].name;
	}
	/**
	* The URL of the extension's privacy policy.
	*/
	get privacyPolicyUrl() {
		return this[rawDataSymbol].privacy_policy_url;
	}
	/**
	* Whether the extension requests its users to share their identity with it.
	*/
	get requestsIdentityLink() {
		return this[rawDataSymbol].request_identity_link;
	}
	/**
	* The URLs of the extension's screenshots.
	*/
	get screenshotUrls() {
		return this[rawDataSymbol].screenshot_urls;
	}
	/**
	* The extension's activity state.
	*/
	get state() {
		return this[rawDataSymbol].state;
	}
	/**
	* The extension's level of support for subscriptions.
	*/
	get subscriptionsSupportLevel() {
		return this[rawDataSymbol].subscriptions_support_level;
	}
	/**
	* The extension's feature summary.
	*/
	get summary() {
		return this[rawDataSymbol].summary;
	}
	/**
	* The extension's support email address.
	*/
	get supportEmail() {
		return this[rawDataSymbol].support_email;
	}
	/**
	* The extension's version.
	*/
	get version() {
		return this[rawDataSymbol].version;
	}
	/**
	* The extension's feature summary for viewers.
	*/
	get viewerSummary() {
		return this[rawDataSymbol].viewer_summary;
	}
	/**
	* The extension's feature summary for viewers.
	*
	* @deprecated Use `viewerSummary` instead.
	*/
	get viewerSummery() {
		return this[rawDataSymbol].viewer_summary;
	}
	/**
	* The extension's allowed configuration URLs.
	*/
	get allowedConfigUrls() {
		return this[rawDataSymbol].allowlisted_config_urls;
	}
	/**
	* The extension's allowed panel URLs.
	*/
	get allowedPanelUrls() {
		return this[rawDataSymbol].allowlisted_panel_urls;
	}
	/**
	* The URL shown when a viewer opens the extension on a mobile device.
	*
	* If the extension does not have a mobile view, this is null.
	*/
	get mobileViewerUrl() {
		return this[rawDataSymbol].views.mobile?.viewer_url ?? null;
	}
	/**
	* The URL shown to the viewer when the extension is shown as a panel.
	*
	* If the extension does not have a panel view, this is null.
	*/
	get panelViewerUrl() {
		return this[rawDataSymbol].views.panel?.viewer_url ?? null;
	}
	/**
	* The height of the extension panel.
	*
	* If the extension does not have a panel view, this is null.
	*/
	get panelHeight() {
		return this[rawDataSymbol].views.panel?.height ?? null;
	}
	/**
	* Whether the extension can link to external content from its panel view.
	*
	* If the extension does not have a panel view, this is null.
	*/
	get panelCanLinkExternalContent() {
		return this[rawDataSymbol].views.panel?.can_link_external_content ?? null;
	}
	/**
	* The URL shown to the viewer when the extension is shown as a video overlay.
	*
	* If the extension does not have a overlay view, this is null.
	*/
	get overlayViewerUrl() {
		return this[rawDataSymbol].views.video_overlay?.viewer_url ?? null;
	}
	/**
	* Whether the extension can link to external content from its overlay view.
	*
	* If the extension does not have a overlay view, this is null.
	*/
	get overlayCanLinkExternalContent() {
		return this[rawDataSymbol].views.video_overlay?.can_link_external_content ?? null;
	}
	/**
	* The URL shown to the viewer when the extension is shown as a video component.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentViewerUrl() {
		return this[rawDataSymbol].views.component?.viewer_url ?? null;
	}
	/**
	* The aspect width of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentAspectWidth() {
		return this[rawDataSymbol].views.component?.aspect_width ?? null;
	}
	/**
	* The aspect height of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentAspectHeight() {
		return this[rawDataSymbol].views.component?.aspect_height ?? null;
	}
	/**
	* The horizontal aspect ratio of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentAspectRatioX() {
		return this[rawDataSymbol].views.component?.aspect_ratio_x ?? null;
	}
	/**
	* The vertical aspect ratio of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentAspectRatioY() {
		return this[rawDataSymbol].views.component?.aspect_ratio_y ?? null;
	}
	/**
	* Whether the extension's component view should automatically scale.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentAutoScales() {
		return this[rawDataSymbol].views.component?.autoscale ?? null;
	}
	/**
	* The base width of the extension's component view to use for scaling.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentScalePixels() {
		return this[rawDataSymbol].views.component?.scale_pixels ?? null;
	}
	/**
	* The target height of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentTargetHeight() {
		return this[rawDataSymbol].views.component?.target_height ?? null;
	}
	/**
	* The size of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentSize() {
		return this[rawDataSymbol].views.component?.size ?? null;
	}
	/**
	* Whether zooming is enabled for the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentZoom() {
		return this[rawDataSymbol].views.component?.zoom ?? null;
	}
	/**
	* The zoom pixels of the extension's component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentZoomPixels() {
		return this[rawDataSymbol].views.component?.zoom_pixels ?? null;
	}
	/**
	* Whether the extension can link to external content from its component view.
	*
	* If the extension does not have a component view, this is null.
	*/
	get componentCanLinkExternalContent() {
		return this[rawDataSymbol].views.component?.can_link_external_content ?? null;
	}
	/**
	* The URL shown to the viewer when the extension's configuration page is shown.
	*
	* If the extension does not have a config view, this is null.
	*/
	get configViewerUrl() {
		return this[rawDataSymbol].views.config?.viewer_url ?? null;
	}
	/**
	* Whether the extension can link to external content from its config view.
	*
	* If the extension does not have a config view, this is null.
	*/
	get configCanLinkExternalContent() {
		return this[rawDataSymbol].views.config?.can_link_external_content ?? null;
	}
};
HelixExtension = __decorate([rtfm("api", "HelixExtension", "id")], HelixExtension);
//#endregion
//#region node_modules/@twurple/common/lib/errors/HellFreezesOverError.js
/**
* These are the kind of errors that should never happen.
*
* If you see one thrown, please file a bug in the GitHub issue tracker.
*/
var HellFreezesOverError = class extends CustomError$1 {
	constructor(message) {
		super(`${message} - this should never happen, please file a bug in the GitHub issue tracker`);
	}
};
//#endregion
//#region node_modules/@twurple/common/lib/userResolvers.js
/**
* Extracts the user ID from an argument that is possibly an object containing that ID.
*
* @param user The user ID or object.
*/
function extractUserId(user) {
	if (typeof user === "string") return user;
	if (typeof user === "number") return user.toString(10);
	return user.id;
}
/**
* Extracts the username from an argument that is possibly an object containing that name.
*
* @param user The username or object.
*/
function extractUserName(user) {
	return typeof user === "string" ? user : user.name;
}
//#endregion
//#region node_modules/@twurple/api-call/lib/errors/HttpStatusCodeError.js
/**
* Thrown whenever a HTTP error occurs. Some HTTP errors are handled in the library when they're expected.
*/
var HttpStatusCodeError = class extends CustomError$1 {
	_statusCode;
	_url;
	_method;
	_body;
	/** @private */
	constructor(_statusCode, statusText, _url, _method, _body, isJson) {
		super(`Encountered HTTP status code ${_statusCode}: ${statusText}\n\nURL: ${_url}\nMethod: ${_method}\nBody:\n${!isJson && _body.length > 150 ? `${_body.slice(0, 147)}...` : _body}`);
		this._statusCode = _statusCode;
		this._url = _url;
		this._method = _method;
		this._body = _body;
	}
	/**
	* The HTTP status code of the error.
	*/
	get statusCode() {
		return this._statusCode;
	}
	/**
	* The URL that was requested.
	*/
	get url() {
		return this._url;
	}
	/**
	* The HTTP method that was used for the request.
	*/
	get method() {
		return this._method;
	}
	/**
	* The body that was used for the request, as a string.
	*/
	get body() {
		return this._body;
	}
};
//#endregion
//#region node_modules/@twurple/api-call/lib/helpers/transform.js
/** @private */
async function handleTwitchApiResponseError(response, options) {
	if (!response.ok) {
		const isJson = response.headers.get("Content-Type") === "application/json";
		const text = isJson ? JSON.stringify(await response.json(), null, 2) : await response.text();
		const params = qsStringify(options.query);
		const fullUrl = `${options.url}${params}`;
		throw new HttpStatusCodeError(response.status, response.statusText, fullUrl, options.method ?? "GET", text, isJson);
	}
}
/** @private */
async function transformTwitchApiResponse(response) {
	if (response.status === 204) return;
	const text = await response.text();
	if (!text) return;
	return JSON.parse(text);
}
//#endregion
//#region node_modules/@twurple/api-call/lib/helpers/url.js
/** @internal */
function getTwitchApiUrl(url, type) {
	const mockServerPort = getMockApiPort();
	switch (type) {
		case "helix": {
			const unprefixedUrl = url.replace(/^\//, "");
			return mockServerPort ? unprefixedUrl === "eventsub/subscriptions" ? `http://localhost:${mockServerPort}/${unprefixedUrl}` : `http://localhost:${mockServerPort}/mock/${unprefixedUrl}` : `https://api.twitch.tv/helix/${unprefixedUrl}`;
		}
		case "auth": {
			const unprefixedUrl = url.replace(/^\//, "");
			return mockServerPort ? `http://localhost:${mockServerPort}/auth/${unprefixedUrl}` : `https://id.twitch.tv/oauth2/${unprefixedUrl}`;
		}
		case "custom": return url;
		default: return url;
	}
}
//#endregion
//#region node_modules/@twurple/api-call/lib/apiCall.js
/**
* Makes a call to the Twitch API using the given credentials, returning the raw Response object.
*
* @param options The configuration of the call.
* @param clientId The client ID of your application.
* @param accessToken The access token to call the API with.
*
* You need to obtain one using one of the [Twitch OAuth flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).
* @param authorizationType The type of Authorization header to send.
*
* Defaults to "Bearer" for Helix and "OAuth" for everything else.
* @param fetchOptions Additional options to be passed to the `fetch` function.
*/
async function callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions = {}) {
	const type = options.type ?? "helix";
	const url = getTwitchApiUrl(options.url, type);
	const params = qsStringify(options.query);
	const headers = new Headers({ Accept: "application/json" });
	let body = void 0;
	if (options.jsonBody) {
		body = JSON.stringify(options.jsonBody);
		headers.append("Content-Type", "application/json");
	}
	if (clientId && type !== "auth") headers.append("Client-ID", clientId);
	if (accessToken) headers.append("Authorization", `${type === "helix" ? authorizationType ?? "Bearer" : "OAuth"} ${accessToken}`);
	const requestOptions = {
		...fetchOptions,
		method: options.method ?? "GET",
		headers,
		body
	};
	return await fetch(`${url}${params}`, requestOptions);
}
/**
* Makes a call to the Twitch API using given credentials.
*
* @param options The configuration of the call.
* @param clientId The client ID of your application.
* @param accessToken The access token to call the API with.
*
* You need to obtain one using one of the [Twitch OAuth flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).
* @param authorizationType The type of Authorization header to send.
*
* Defaults to "Bearer" for Helix and "OAuth" for everything else.
* @param fetchOptions Additional options to be passed to the `fetch` function.
*/
async function callTwitchApi(options, clientId, accessToken, authorizationType, fetchOptions = {}) {
	const response = await callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions);
	await handleTwitchApiResponseError(response, options);
	return await transformTwitchApiResponse(response);
}
//#endregion
//#region node_modules/@twurple/api-call/lib/helpers/queries.external.js
function createBroadcasterQuery(user) {
	return { broadcaster_id: extractUserId(user) };
}
//#endregion
//#region node_modules/@twurple/auth/lib/errors/InvalidTokenError.js
/**
* Thrown whenever an invalid token is supplied.
*/
var InvalidTokenError = class extends CustomError$1 {
	/** @private */
	constructor(options) {
		super("Invalid token supplied", options);
	}
};
//#endregion
//#region node_modules/@twurple/auth/lib/errors/InvalidTokenTypeError.js
/**
* Thrown whenever a different token type (user vs. app) is expected in the method you're calling.
*/
var InvalidTokenTypeError = class extends CustomError$1 {};
//#endregion
//#region node_modules/@twurple/auth/lib/helpers.external.js
/** @internal */
function createExchangeCodeQuery(clientId, clientSecret, code, redirectUri) {
	return {
		grant_type: "authorization_code",
		client_id: clientId,
		client_secret: clientSecret,
		code,
		redirect_uri: redirectUri
	};
}
/** @internal */
function createGetAppTokenQuery(clientId, clientSecret) {
	return {
		grant_type: "client_credentials",
		client_id: clientId,
		client_secret: clientSecret
	};
}
/** @internal */
function createRefreshTokenQuery(clientId, clientSecret, refreshToken) {
	return {
		grant_type: "refresh_token",
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken
	};
}
//#endregion
//#region node_modules/@twurple/auth/lib/TokenInfo.js
init_tslib_es6();
/**
* Information about an access token.
*/
let TokenInfo = class TokenInfo extends DataObject {
	_obtainmentDate;
	/** @internal */
	constructor(data) {
		super(data);
		this._obtainmentDate = /* @__PURE__ */ new Date();
	}
	/**
	* The client ID.
	*/
	get clientId() {
		return this[rawDataSymbol].client_id;
	}
	/**
	* The ID of the authenticated user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id ?? null;
	}
	/**
	* The name of the authenticated user.
	*/
	get userName() {
		return this[rawDataSymbol].login ?? null;
	}
	/**
	* The scopes for which the token is valid.
	*/
	get scopes() {
		return this[rawDataSymbol].scopes;
	}
	/**
	* The time when the token will expire.
	*
	* If this returns null, it means that the token never expires (happens with some old client IDs).
	*/
	get expiryDate() {
		return mapNullable(this[rawDataSymbol].expires_in, (v) => new Date(this._obtainmentDate.getTime() + v * 1e3));
	}
};
TokenInfo = __decorate([rtfm("auth", "TokenInfo", "clientId")], TokenInfo);
//#endregion
//#region node_modules/@twurple/auth/lib/helpers.js
/** @internal */
function createAccessTokenFromData(data) {
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token || null,
		scope: data.scope ?? [],
		expiresIn: data.expires_in ?? null,
		obtainmentTimestamp: Date.now()
	};
}
/**
* Gets an access token with your client credentials and an authorization code.
*
* @param clientId The client ID of your application.
* @param clientSecret The client secret of your application.
* @param code The authorization code.
* @param redirectUri The redirect URI.
*
* This serves no real purpose here, but must still match one of the redirect URIs you configured in the Twitch Developer dashboard.
*/
async function exchangeCode(clientId, clientSecret, code, redirectUri) {
	return createAccessTokenFromData(await callTwitchApi({
		type: "auth",
		url: "token",
		method: "POST",
		query: createExchangeCodeQuery(clientId, clientSecret, code, redirectUri)
	}));
}
/**
* Gets an app access token with your client credentials.
*
* @param clientId The client ID of your application.
* @param clientSecret The client secret of your application.
*/
async function getAppToken(clientId, clientSecret) {
	return createAccessTokenFromData(await callTwitchApi({
		type: "auth",
		url: "token",
		method: "POST",
		query: createGetAppTokenQuery(clientId, clientSecret)
	}));
}
/**
* Refreshes an expired access token with your client credentials and the refresh token that was given by the initial authentication.
*
* @param clientId The client ID of your application.
* @param clientSecret The client secret of your application.
* @param refreshToken The refresh token.
*/
async function refreshUserToken(clientId, clientSecret, refreshToken) {
	return createAccessTokenFromData(await callTwitchApi({
		type: "auth",
		url: "token",
		method: "POST",
		query: createRefreshTokenQuery(clientId, clientSecret, refreshToken)
	}));
}
/**
* Gets information about an access token.
*
* @param accessToken The access token to get the information of.
* @param clientId The client ID of your application.
*
* You need to obtain one using one of the [Twitch OAuth flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).
*/
async function getTokenInfo(accessToken, clientId) {
	try {
		return new TokenInfo(await callTwitchApi({
			type: "auth",
			url: "validate"
		}, clientId, accessToken));
	} catch (e) {
		if (e instanceof HttpStatusCodeError && e.statusCode === 401) throw new InvalidTokenError({ cause: e });
		throw e;
	}
}
const scopeEquivalencies = new Map([
	["channel_commercial", ["channel:edit:commercial"]],
	["channel_editor", ["channel:manage:broadcast"]],
	["channel_read", ["channel:read:stream_key"]],
	["channel_subscriptions", ["channel:read:subscriptions"]],
	["user_blocks_read", ["user:read:blocked_users"]],
	["user_blocks_edit", ["user:manage:blocked_users"]],
	["user_follows_edit", ["user:edit:follows"]],
	["user_read", ["user:read:email"]],
	["user_subscriptions", ["user:read:subscriptions"]],
	["user:edit:broadcast", ["channel:manage:broadcast", "channel:manage:extensions"]]
]);
/**
* Compares scopes for a non-upgradable {@link AuthProvider} instance.
*
* @param scopesToCompare The scopes to compare against.
* @param requestedScopes The scopes you requested.
*/
function compareScopes(scopesToCompare, requestedScopes) {
	if (requestedScopes?.length) {
		const scopes = new Set(scopesToCompare.flatMap((scope) => [scope, ...scopeEquivalencies.get(scope) ?? []]));
		if (requestedScopes.every((scope) => !scopes.has(scope))) {
			const scopesStr = requestedScopes.join(", ");
			throw new Error(`This token does not have any of the requested scopes (${scopesStr}) and can not be upgraded.
If you need dynamically upgrading scopes, please implement the AuthProvider interface accordingly:

\thttps://twurple.js.org/reference/auth/interfaces/AuthProvider.html`);
		}
	}
}
/**
* Compares scope sets for a non-upgradable {@link AuthProvider} instance.
*
* @param scopesToCompare The scopes to compare against.
* @param requestedScopeSets The scope sets you requested.
*/
function compareScopeSets(scopesToCompare, requestedScopeSets) {
	for (const requestedScopes of requestedScopeSets) compareScopes(scopesToCompare, requestedScopes);
}
/**
* Compares scopes for a non-upgradable `AuthProvider` instance, loading them from the token if necessary,
* and returns them together with the user ID.
*
* @param clientId The client ID of your application.
* @param token The access token.
* @param userId The user ID that was already loaded.
* @param loadedScopes The scopes that were already loaded.
* @param requestedScopeSets The scope sets you requested.
*/
async function loadAndCompareTokenInfo(clientId, token, userId, loadedScopes, requestedScopeSets) {
	if (requestedScopeSets?.length || !userId) {
		const userInfo = await getTokenInfo(token, clientId);
		if (!userInfo.userId) throw new Error("Trying to use an app access token as a user access token");
		const scopesToCompare = loadedScopes ?? userInfo.scopes;
		if (requestedScopeSets) compareScopeSets(scopesToCompare, requestedScopeSets.filter((val) => Boolean(val)));
		return [scopesToCompare, userInfo.userId];
	}
	return [loadedScopes, userId];
}
//#endregion
//#region node_modules/@twurple/auth/lib/TokenFetcher.js
var TokenFetcher = class {
	_executor;
	_newTokenScopeSets = [];
	_newTokenPromise = null;
	_queuedScopeSets = [];
	_queueExecutor = null;
	_queuePromise = null;
	constructor(executor) {
		this._executor = executor;
	}
	async fetch(...scopeSets) {
		const filteredScopeSets = scopeSets.filter((val) => Boolean(val));
		if (this._newTokenPromise) {
			if (!filteredScopeSets.length) return await this._newTokenPromise;
			if (this._queueExecutor) this._queuedScopeSets.push(...filteredScopeSets);
			else this._queuedScopeSets = [...filteredScopeSets];
			if (!this._queuePromise) {
				const { promise, resolve, reject } = promiseWithResolvers();
				this._queuePromise = promise;
				this._queueExecutor = async () => {
					if (!this._queuePromise) return;
					this._newTokenScopeSets = this._queuedScopeSets;
					this._queuedScopeSets = [];
					this._newTokenPromise = this._queuePromise;
					this._queuePromise = null;
					this._queueExecutor = null;
					try {
						resolve(await this._executor(this._newTokenScopeSets));
					} catch (e) {
						reject(e);
					} finally {
						this._newTokenPromise = null;
						this._newTokenScopeSets = [];
						this._queueExecutor?.();
					}
				};
			}
			return await this._queuePromise;
		}
		this._newTokenScopeSets = [...filteredScopeSets];
		const { promise, resolve, reject } = promiseWithResolvers();
		this._newTokenPromise = promise;
		try {
			resolve(await this._executor(this._newTokenScopeSets));
		} catch (e) {
			reject(e);
		} finally {
			this._newTokenPromise = null;
			this._newTokenScopeSets = [];
			this._queueExecutor?.();
		}
		return await promise;
	}
};
//#endregion
//#region node_modules/@d-fischer/typed-event-emitter/es/Listener.mjs
var Listener = class {
	/** @private */
	constructor(owner, event, listener, _internal = false) {
		this.owner = owner;
		this.event = event;
		this.listener = listener;
		this._internal = _internal;
	}
	unbind() {
		this.owner.removeListener(this);
	}
};
//#endregion
//#region node_modules/@d-fischer/typed-event-emitter/es/EventEmitter.mjs
var EventEmitter = class {
	constructor() {
		this._eventListeners = /* @__PURE__ */ new Map();
		this._internalEventListeners = /* @__PURE__ */ new Map();
	}
	on(event, listener) {
		return this._addListener(false, event, listener);
	}
	addListener(event, listener) {
		return this._addListener(false, event, listener);
	}
	removeListener(idOrEvent, listener) {
		this._removeListener(false, idOrEvent, listener);
	}
	registerEvent() {
		const eventBinder = (handler) => this.addListener(eventBinder, handler);
		return eventBinder;
	}
	emit(event, ...args) {
		if (this._eventListeners.has(event)) for (const listener of this._eventListeners.get(event)) listener(...args);
		if (this._internalEventListeners.has(event)) for (const listener of this._internalEventListeners.get(event)) listener(...args);
	}
	registerInternalEvent() {
		const eventBinder = (handler) => this.addInternalListener(eventBinder, handler);
		return eventBinder;
	}
	addInternalListener(event, listener) {
		return this._addListener(true, event, listener);
	}
	removeInternalListener(idOrEvent, listener) {
		this._removeListener(true, idOrEvent, listener);
	}
	_addListener(internal, event, listener) {
		const listenerMap = internal ? this._eventListeners : this._internalEventListeners;
		if (listenerMap.has(event)) listenerMap.get(event).push(listener);
		else listenerMap.set(event, [listener]);
		return new Listener(this, event, listener, internal);
	}
	_removeListener(internal, idOrEvent, listener) {
		const listenerMap = internal ? this._eventListeners : this._internalEventListeners;
		if (!idOrEvent) listenerMap.clear();
		else if (typeof idOrEvent === "object") {
			const id = idOrEvent;
			this._removeListener(id._internal, id.event, id.listener);
		} else {
			const event = idOrEvent;
			if (listenerMap.has(event)) if (listener) {
				const listeners = listenerMap.get(event);
				let idx = 0;
				while ((idx = listeners.indexOf(listener)) !== -1) listeners.splice(idx, 1);
			} else listenerMap.delete(event);
		}
	}
};
//#endregion
//#region node_modules/@twurple/auth/lib/errors/CachedRefreshFailureError.js
/**
* Thrown whenever you try to execute an action in the context of a user
* who is already known to have an invalid token saved in its {@link AuthProvider}.
*/
var CachedRefreshFailureError = class extends CustomError$1 {
	userId;
	constructor(userId) {
		super(`The user context for the user ${userId} has been disabled.
This happened because the access token became invalid (e.g. by expiry) and refreshing it failed (e.g. because the account's password was changed).

Use .addUser(), .addUserForToken() or .addUserForCode() for the same user context to re-enable the user with a new, valid token.`);
		this.userId = userId;
	}
};
//#endregion
//#region node_modules/@twurple/auth/lib/errors/IntermediateUserRemovalError.js
/**
* Thrown whenever a user is removed from an {@link AuthProvider}
* and at the same time you try to execute an action in that user's context.
*/
var IntermediateUserRemovalError = class extends CustomError$1 {
	userId;
	constructor(userId) {
		super(`User ${userId} was removed while trying to fetch a token.

Make sure you're not executing any actions when you want to remove a user.`);
		this.userId = userId;
	}
};
//#endregion
//#region node_modules/@twurple/auth/lib/errors/UnknownIntentError.js
/**
* Thrown when an intent is requested that was not recognized by the {@link AuthProvider}.
*/
var UnknownIntentError = class extends CustomError$1 {
	/**
	* The intent that was requested.
	*/
	intent;
	/** @private */
	constructor(intent) {
		super(`Unknown intent: ${intent}`);
		this.intent = intent;
	}
};
//#endregion
//#region node_modules/@twurple/auth/lib/providers/RefreshingAuthProvider.js
init_tslib_es6();
/**
* An auth provider with the ability to make use of refresh tokens,
* automatically refreshing the access token whenever necessary.
*/
let RefreshingAuthProvider = class RefreshingAuthProvider extends EventEmitter {
	_clientId;
	/** @internal */ _clientSecret;
	_redirectUri;
	/** @internal */ _userAccessTokens = /* @__PURE__ */ new Map();
	/** @internal */ _userTokenFetchers = /* @__PURE__ */ new Map();
	_intentToUserId = /* @__PURE__ */ new Map();
	_userIdToIntents = /* @__PURE__ */ new Map();
	_cachedRefreshFailures = /* @__PURE__ */ new Set();
	/** @internal */ _appAccessToken;
	/** @internal */ _appTokenFetcher;
	_appImpliedScopes;
	/**
	* Fires when a user token is refreshed.
	*
	* @param userId The ID of the user whose token was successfully refreshed.
	* @param token The refreshed token data.
	*/
	onRefresh = this.registerEvent();
	/**
	* Fires when a user token fails to refresh.
	*
	* @param userId The ID of the user whose token wasn't successfully refreshed.
	*/
	onRefreshFailure = this.registerEvent();
	/**
	* Creates a new auth provider based on the given one that can automatically
	* refresh access tokens.
	*
	* @param refreshConfig The information necessary to automatically refresh an access token.
	*/
	constructor(refreshConfig) {
		super();
		this._clientId = refreshConfig.clientId;
		this._clientSecret = refreshConfig.clientSecret;
		this._redirectUri = refreshConfig.redirectUri;
		this._appImpliedScopes = refreshConfig.appImpliedScopes ?? [];
		this._appTokenFetcher = new TokenFetcher(async (scopes) => await this._fetchAppToken(scopes));
	}
	/**
	* Adds the given user with their corresponding token to the provider.
	*
	* @param user The user to add.
	* @param initialToken The token for the user.
	* @param intents The intents to add to the user.
	*
	* Any intents that were already set before will be overwritten to point to this user instead.
	*/
	addUser(user, initialToken, intents) {
		const userId = extractUserId(user);
		if (!initialToken.refreshToken) throw new Error(`Trying to add user ${userId} without refresh token`);
		this._cachedRefreshFailures.delete(userId);
		this._userAccessTokens.set(userId, {
			...initialToken,
			userId
		});
		if (!this._userTokenFetchers.has(userId)) this._userTokenFetchers.set(userId, new TokenFetcher(async (scopes) => await this._fetchUserToken(userId, scopes)));
		if (intents) this.addIntentsToUser(user, intents);
	}
	/**
	* Figures out the user associated to the given token and adds them to the provider.
	*
	* If you already know the ID of the user you're adding,
	* consider using {@link RefreshingAuthProvider#addUser} instead.
	*
	* @param initialToken The token for the user.
	* @param intents The intents to add to the user.
	*
	* Any intents that were already set before will be overwritten to point to the associated user instead.
	*/
	async addUserForToken(initialToken, intents) {
		let tokenWithInfo = null;
		if (initialToken.accessToken && !accessTokenIsExpired(initialToken)) try {
			tokenWithInfo = [initialToken, await getTokenInfo(initialToken.accessToken)];
		} catch (e) {
			if (!(e instanceof InvalidTokenError)) throw e;
		}
		if (!tokenWithInfo) {
			if (!initialToken.refreshToken) throw new InvalidTokenError();
			const refreshedToken = await refreshUserToken(this._clientId, this._clientSecret, initialToken.refreshToken);
			const tokenInfo = await getTokenInfo(refreshedToken.accessToken);
			this.emit(this.onRefresh, tokenInfo.userId, refreshedToken);
			tokenWithInfo = [refreshedToken, tokenInfo];
		}
		const [tokenToAdd, tokenInfo] = tokenWithInfo;
		if (!tokenInfo.userId) throw new InvalidTokenTypeError("Could not determine a user ID for your token; you might be trying to disguise an app token as a user token.");
		const token = tokenToAdd.scope ? tokenToAdd : {
			...tokenToAdd,
			scope: tokenInfo.scopes
		};
		this.addUser(tokenInfo.userId, token, intents);
		return tokenInfo.userId;
	}
	/**
	* Gets an OAuth token from the given authorization code and adds the user to the provider.
	*
	* An authorization code can be obtained using the
	* [OAuth Authorization Code flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow).
	*
	* @param code The authorization code.
	* @param intents The intents to add to the user.
	*
	* Any intents that were already set before will be overwritten to point to the associated user instead.
	*/
	async addUserForCode(code, intents) {
		if (!this._redirectUri) throw new Error("This method requires you to pass a `redirectUri` as a configuration property");
		const token = await exchangeCode(this._clientId, this._clientSecret, code, this._redirectUri);
		return await this.addUserForToken(token, intents);
	}
	/**
	* Checks whether a user was added to the provider.
	*
	* @param user The user to check.
	*/
	hasUser(user) {
		return this._userTokenFetchers.has(extractUserId(user));
	}
	/**
	* Removes a user from the provider.
	*
	* This also makes all intents this user was assigned to unusable.
	*
	* @param user The user to remove.
	*/
	removeUser(user) {
		const userId = extractUserId(user);
		if (this._userIdToIntents.has(userId)) {
			const intents = this._userIdToIntents.get(userId);
			for (const intent of intents) this._intentToUserId.delete(intent);
			this._userIdToIntents.delete(userId);
		}
		this._userAccessTokens.delete(userId);
		this._userTokenFetchers.delete(userId);
		this._cachedRefreshFailures.delete(userId);
	}
	/**
	* Adds intents to a user.
	*
	* Any intents that were already set before will be overwritten to point to this user instead.
	*
	* @param user The user to add intents to.
	* @param intents The intents to add to the user.
	*/
	addIntentsToUser(user, intents) {
		const userId = extractUserId(user);
		if (!this._userAccessTokens.has(userId)) throw new Error("Trying to add intents to a user that was not added to this provider");
		for (const intent of intents) {
			if (this._intentToUserId.has(intent)) this._userIdToIntents.get(this._intentToUserId.get(intent)).delete(intent);
			this._intentToUserId.set(intent, userId);
			if (this._userIdToIntents.has(userId)) this._userIdToIntents.get(userId).add(intent);
			else this._userIdToIntents.set(userId, new Set([intent]));
		}
	}
	/**
	* Gets all intents assigned to the given user.
	*
	* @param user The user to get intents of.
	*/
	getIntentsForUser(user) {
		const userId = extractUserId(user);
		return this._userIdToIntents.has(userId) ? Array.from(this._userIdToIntents.get(userId)) : [];
	}
	/**
	* Removes all given intents from any user who they might be assigned to.
	*
	* Intents that have not been assigned are silently ignored.
	*
	* @param intents The intents to remove.
	*/
	removeIntents(intents) {
		for (const intent of intents) if (this._intentToUserId.has(intent)) {
			const userId = this._intentToUserId.get(intent);
			this._userIdToIntents.get(userId)?.delete(intent);
			this._intentToUserId.delete(intent);
		}
	}
	/**
	* Requests that the provider fetches a new token from Twitch for the given user.
	*
	* @param user The user to refresh the token for.
	*/
	async refreshAccessTokenForUser(user) {
		const userId = extractUserId(user);
		if (this._cachedRefreshFailures.has(userId)) throw new CachedRefreshFailureError(userId);
		const previousTokenData = this._userAccessTokens.get(userId);
		if (!previousTokenData) throw new Error("Trying to refresh token for user that was not added to the provider");
		const tokenData = await this._refreshUserTokenWithCallback(userId, previousTokenData.refreshToken);
		this._checkIntermediateUserRemoval(userId);
		this._userAccessTokens.set(userId, {
			...tokenData,
			userId
		});
		this.emit(this.onRefresh, userId, tokenData);
		return {
			...tokenData,
			userId
		};
	}
	/**
	* Requests that the provider fetches a new token from Twitch for the given intent.
	*
	* @param intent The intent to refresh the token for.
	*/
	async refreshAccessTokenForIntent(intent) {
		if (!this._intentToUserId.has(intent)) throw new UnknownIntentError(intent);
		const userId = this._intentToUserId.get(intent);
		return await this.refreshAccessTokenForUser(userId);
	}
	/**
	* The client ID.
	*/
	get clientId() {
		return this._clientId;
	}
	/**
	* Gets the scopes that are currently available using the access token.
	*
	* @param user The user to get the current scopes for.
	*/
	getCurrentScopesForUser(user) {
		const token = this._userAccessTokens.get(extractUserId(user));
		if (!token) throw new Error("Trying to get scopes for user that was not added to the provider");
		return token.scope ?? [];
	}
	/**
	* Gets an access token for the given user.
	*
	* @param user The user to get an access token for.
	* @param scopeSets The requested scopes.
	*/
	async getAccessTokenForUser(user, ...scopeSets) {
		const userId = extractUserId(user);
		const fetcher = this._userTokenFetchers.get(userId);
		if (!fetcher) return null;
		if (this._cachedRefreshFailures.has(userId)) throw new CachedRefreshFailureError(userId);
		compareScopeSets(this.getCurrentScopesForUser(userId), scopeSets.filter(Boolean));
		return await fetcher.fetch(...scopeSets);
	}
	/**
	* Fetches a token for a user identified by the given intent.
	*
	* @param intent The intent to fetch a token for.
	* @param scopeSets The requested scopes.
	*/
	async getAccessTokenForIntent(intent, ...scopeSets) {
		if (!this._intentToUserId.has(intent)) return null;
		const userId = this._intentToUserId.get(intent);
		const newToken = await this.getAccessTokenForUser(userId, ...scopeSets);
		if (!newToken) throw new HellFreezesOverError(`Found intent ${intent} corresponding to user ID ${userId} but no token was found`);
		return {
			...newToken,
			userId
		};
	}
	/**
	* Fetches any token to use with a request that supports both user and app tokens,
	* i.e. public data relating to a user.
	*
	* @param user The user.
	*/
	async getAnyAccessToken(user) {
		if (user) {
			const userId = extractUserId(user);
			if (this._userAccessTokens.has(userId)) {
				const token = await this.getAccessTokenForUser(userId);
				if (!token) throw new HellFreezesOverError(`Token for user ID ${userId} exists but nothing was returned by getAccessTokenForUser`);
				return {
					...token,
					userId
				};
			}
		}
		return await this.getAppAccessToken();
	}
	/**
	* Fetches an app access token.
	*
	* @param forceNew Whether to always get a new token, even if the old one is still deemed valid internally.
	*/
	async getAppAccessToken(forceNew = false) {
		if (forceNew) this._appAccessToken = void 0;
		return await this._appTokenFetcher.fetch(...this._appImpliedScopes.map((scopes) => [scopes]));
	}
	_checkIntermediateUserRemoval(userId) {
		if (!this._userTokenFetchers.has(userId)) {
			this._cachedRefreshFailures.delete(userId);
			throw new IntermediateUserRemovalError(userId);
		}
	}
	async _fetchUserToken(userId, scopeSets) {
		const previousToken = this._userAccessTokens.get(userId);
		if (!previousToken) throw new Error("Trying to get token for user that was not added to the provider");
		if (previousToken.accessToken && !accessTokenIsExpired(previousToken)) try {
			if (previousToken.scope) {
				compareScopeSets(previousToken.scope, scopeSets);
				return previousToken;
			}
			const [scope = []] = await loadAndCompareTokenInfo(this._clientId, previousToken.accessToken, userId, previousToken.scope, scopeSets);
			const newToken = {
				...previousToken,
				scope
			};
			this._checkIntermediateUserRemoval(userId);
			this._userAccessTokens.set(userId, newToken);
			return newToken;
		} catch (e) {
			if (!(e instanceof InvalidTokenError)) throw e;
		}
		this._checkIntermediateUserRemoval(userId);
		const refreshedToken = await this.refreshAccessTokenForUser(userId);
		compareScopeSets(refreshedToken.scope, scopeSets);
		return refreshedToken;
	}
	async _refreshUserTokenWithCallback(userId, refreshToken) {
		try {
			return await refreshUserToken(this.clientId, this._clientSecret, refreshToken);
		} catch (e) {
			this._cachedRefreshFailures.add(userId);
			this.emit(this.onRefreshFailure, userId, e);
			throw e;
		}
	}
	async _fetchAppToken(scopeSets) {
		if (scopeSets.length > 0) for (const scopes of scopeSets) if (this._appImpliedScopes.length) {
			if (scopes.every((scope) => !this._appImpliedScopes.includes(scope))) throw new Error(`One of the scopes ${scopes.join(", ")} requested but only the scope ${this._appImpliedScopes.join(", ")} is implied`);
		} else throw new Error(`One of the scopes ${scopes.join(", ")} requested but the client credentials flow does not support scopes`);
		if (!this._appAccessToken || accessTokenIsExpired(this._appAccessToken)) return await this._refreshAppToken();
		return this._appAccessToken;
	}
	async _refreshAppToken() {
		return this._appAccessToken = await getAppToken(this._clientId, this._clientSecret);
	}
};
__decorate([Enumerable(false)], RefreshingAuthProvider.prototype, "_clientSecret", void 0);
__decorate([Enumerable(false)], RefreshingAuthProvider.prototype, "_userAccessTokens", void 0);
__decorate([Enumerable(false)], RefreshingAuthProvider.prototype, "_userTokenFetchers", void 0);
__decorate([Enumerable(false)], RefreshingAuthProvider.prototype, "_appAccessToken", void 0);
__decorate([Enumerable(false)], RefreshingAuthProvider.prototype, "_appTokenFetcher", void 0);
RefreshingAuthProvider = __decorate([rtfm("auth", "RefreshingAuthProvider", "clientId")], RefreshingAuthProvider);
//#endregion
//#region node_modules/@twurple/auth/lib/providers/StaticAuthProvider.js
init_tslib_es6();
/**
* An auth provider that always returns the same initially given credentials.
*
* You are advised to roll your own auth provider that can handle scope upgrades,
* or to plan ahead and supply only access tokens that account for all scopes
* you will ever need.
*/
let StaticAuthProvider = class StaticAuthProvider {
	/** @internal */ _clientId;
	/** @internal */ _accessToken;
	_userId;
	_scopes;
	/**
	* Creates a new auth provider with static credentials.
	*
	* @param clientId The client ID of your application.
	* @param accessToken The access token to provide.
	*
	* You need to obtain one using one of the [Twitch OAuth flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).
	* @param scopes The scopes the supplied token has.
	*
	* If this argument is given, the scopes need to be correct, or weird things might happen. If it's not (i.e. it's `undefined`), we fetch the correct scopes for you.
	*
	* If you can't exactly say which scopes your token has, don't use this parameter/set it to `undefined`.
	*/
	constructor(clientId, accessToken, scopes) {
		this._clientId = clientId || "";
		this._accessToken = typeof accessToken === "string" ? {
			accessToken,
			refreshToken: null,
			scope: scopes ?? [],
			expiresIn: null,
			obtainmentTimestamp: Date.now()
		} : accessToken;
		this._scopes = scopes;
	}
	/**
	* The client ID.
	*/
	get clientId() {
		return this._clientId;
	}
	/**
	* Gets the static access token.
	*
	* If the current access token does not have the requested scopes, this method throws.
	* This makes supplying an access token with the correct scopes from the beginning necessary.
	*
	* @param user Ignored.
	* @param scopeSets The requested scopes.
	*/
	async getAccessTokenForUser(user, ...scopeSets) {
		return await this._getAccessToken(scopeSets);
	}
	/**
	* Gets the static access token.
	*
	* If the current access token does not have the requested scopes, this method throws.
	* This makes supplying an access token with the correct scopes from the beginning necessary.
	*
	* @param intent Ignored.
	* @param scopeSets The requested scopes.
	*/
	async getAccessTokenForIntent(intent, ...scopeSets) {
		return await this._getAccessToken(scopeSets);
	}
	/**
	* Gets the static access token.
	*/
	async getAnyAccessToken() {
		return await this._getAccessToken();
	}
	/**
	* The scopes that are currently available using the access token.
	*/
	getCurrentScopesForUser() {
		return this._scopes ?? [];
	}
	async _getAccessToken(requestedScopeSets) {
		const [scopes, userId] = await loadAndCompareTokenInfo(this._clientId, this._accessToken.accessToken, this._userId, this._scopes, requestedScopeSets);
		this._scopes = scopes;
		this._userId = userId;
		return {
			...this._accessToken,
			userId
		};
	}
};
__decorate([Enumerable(false)], StaticAuthProvider.prototype, "_clientId", void 0);
__decorate([Enumerable(false)], StaticAuthProvider.prototype, "_accessToken", void 0);
StaticAuthProvider = __decorate([rtfm("auth", "StaticAuthProvider", "clientId")], StaticAuthProvider);
//#endregion
//#region node_modules/@d-fischer/logger/es/LogLevel.mjs
var import_detect_node = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports.isNode = Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
})))();
var _a$2;
var LogLevel;
(function(LogLevel) {
	LogLevel[LogLevel["CRITICAL"] = 0] = "CRITICAL";
	LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
	LogLevel[LogLevel["WARNING"] = 2] = "WARNING";
	LogLevel[LogLevel["INFO"] = 3] = "INFO";
	LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
	LogLevel[LogLevel["TRACE"] = 7] = "TRACE";
})(LogLevel || (LogLevel = {}));
function resolveLogLevel(level) {
	if (typeof level === "number") {
		if (Object.prototype.hasOwnProperty.call(LogLevel, level)) return level;
		var eligibleLevels = Object.keys(LogLevel).map(function(k) {
			return parseInt(k, 10);
		}).filter(function(k) {
			return !isNaN(k) && k < level;
		});
		if (!eligibleLevels.length) return LogLevel.WARNING;
		return Math.max.apply(Math, eligibleLevels);
	}
	var strLevel = level.replace(/\d+$/, "").toUpperCase();
	if (!Object.prototype.hasOwnProperty.call(LogLevel, strLevel)) throw new Error("Unknown log level string: ".concat(level));
	return LogLevel[strLevel];
}
var debugFunction = import_detect_node.isNode ? console.log.bind(console) : console.debug.bind(console);
var LogLevelToConsoleFunction = (_a$2 = {}, _a$2[LogLevel.CRITICAL] = console.error.bind(console), _a$2[LogLevel.ERROR] = console.error.bind(console), _a$2[LogLevel.WARNING] = console.warn.bind(console), _a$2[LogLevel.INFO] = console.info.bind(console), _a$2[LogLevel.DEBUG] = debugFunction.bind(console), _a$2[LogLevel.TRACE] = console.trace.bind(console), _a$2);
//#endregion
//#region node_modules/@d-fischer/logger/es/getMinLogLevelFromEnv.mjs
var _a$1, _b$1;
var data = typeof process === "undefined" ? [] : (_b$1 = (_a$1 = process.env.LOGGING) === null || _a$1 === void 0 ? void 0 : _a$1.split(";").map(function(part) {
	var _a = part.split("=", 2), namespace = _a[0], strLevel = _a[1];
	if (strLevel) return [namespace === "default" ? void 0 : namespace.split(":"), resolveLogLevel(strLevel)];
	return null;
}).filter(function(v) {
	return !!v;
}).sort(function(_a, _b) {
	var _c, _d;
	var a = _a[0];
	var b = _b[0];
	return ((_c = b === null || b === void 0 ? void 0 : b.length) !== null && _c !== void 0 ? _c : 0) - ((_d = a === null || a === void 0 ? void 0 : a.length) !== null && _d !== void 0 ? _d : 0);
})) !== null && _b$1 !== void 0 ? _b$1 : [];
var defaultIndex = data.findIndex(function(_a) {
	return !_a[0];
});
var defaultLevel = void 0;
if (defaultIndex !== -1) {
	defaultLevel = data[defaultIndex][1];
	data.splice(defaultIndex);
}
function isPrefix(value, prefix) {
	return prefix.length <= value.length && prefix.every(function(item, i) {
		return item === value[i];
	});
}
function getMinLogLevelFromEnv(name) {
	var nameSplit = name.split(":");
	for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
		var _a = data_1[_i], nsParts = _a[0], level = _a[1];
		if (isPrefix(nameSplit, nsParts)) return level;
	}
	return defaultLevel;
}
//#endregion
//#region node_modules/@d-fischer/logger/es/BaseLogger.mjs
var BaseLogger = function() {
	function BaseLogger(_a) {
		var name = _a.name, minLevel = _a.minLevel, _b = _a.emoji, emoji = _b === void 0 ? false : _b, colors = _a.colors, _c = _a.timestamps, timestamps = _c === void 0 ? import_detect_node.isNode : _c;
		var _d, _e;
		this._name = name;
		this._minLevel = (_e = (_d = mapOptional(minLevel, function(lv) {
			return resolveLogLevel(lv);
		})) !== null && _d !== void 0 ? _d : getMinLogLevelFromEnv(name)) !== null && _e !== void 0 ? _e : LogLevel.WARNING;
		this._emoji = emoji;
		this._colors = colors;
		this._timestamps = timestamps;
	}
	BaseLogger.prototype.crit = function(message) {
		this.log(LogLevel.CRITICAL, message);
	};
	BaseLogger.prototype.error = function(message) {
		this.log(LogLevel.ERROR, message);
	};
	BaseLogger.prototype.warn = function(message) {
		this.log(LogLevel.WARNING, message);
	};
	BaseLogger.prototype.info = function(message) {
		this.log(LogLevel.INFO, message);
	};
	BaseLogger.prototype.debug = function(message) {
		this.log(LogLevel.DEBUG, message);
	};
	BaseLogger.prototype.trace = function(message) {
		this.log(LogLevel.TRACE, message);
	};
	return BaseLogger;
}();
//#endregion
//#region node_modules/@d-fischer/logger/es/BrowserLogger.mjs
init_tslib_es6();
var BrowserLogger = function(_super) {
	__extends(BrowserLogger, _super);
	function BrowserLogger() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	BrowserLogger.prototype.log = function(level, message) {
		if (level > this._minLevel) return;
		var logFn = LogLevelToConsoleFunction[level];
		var formattedMessage = "[".concat(this._name, "] ").concat(message);
		if (this._timestamps) formattedMessage = "[".concat((/* @__PURE__ */ new Date()).toISOString(), "] ").concat(message);
		logFn(formattedMessage);
	};
	return BrowserLogger;
}(BaseLogger);
//#endregion
//#region node_modules/@d-fischer/logger/es/CustomLoggerWrapper.mjs
var CustomLoggerWrapper = function() {
	function CustomLoggerWrapper(_a) {
		var name = _a.name, minLevel = _a.minLevel, custom = _a.custom;
		var _b;
		this._minLevel = (_b = mapOptional(minLevel, function(lv) {
			return resolveLogLevel(lv);
		})) !== null && _b !== void 0 ? _b : getMinLogLevelFromEnv(name);
		this._override = typeof custom === "function" ? { log: custom } : custom;
	}
	CustomLoggerWrapper.prototype.log = function(level, message) {
		if (this._shouldLog(level)) this._override.log(level, message);
	};
	CustomLoggerWrapper.prototype.crit = function(message) {
		if (!this._override.crit) this.log(LogLevel.CRITICAL, message);
		else if (this._shouldLog(LogLevel.CRITICAL)) this._override.crit(message);
	};
	CustomLoggerWrapper.prototype.error = function(message) {
		if (!this._override.error) this.log(LogLevel.ERROR, message);
		else if (this._shouldLog(LogLevel.ERROR)) this._override.error(message);
	};
	CustomLoggerWrapper.prototype.warn = function(message) {
		if (!this._override.warn) this.log(LogLevel.WARNING, message);
		else if (this._shouldLog(LogLevel.WARNING)) this._override.warn(message);
	};
	CustomLoggerWrapper.prototype.info = function(message) {
		if (!this._override.info) this.log(LogLevel.INFO, message);
		else if (this._shouldLog(LogLevel.INFO)) this._override.info(message);
	};
	CustomLoggerWrapper.prototype.debug = function(message) {
		if (!this._override.debug) this.log(LogLevel.DEBUG, message);
		else if (this._shouldLog(LogLevel.DEBUG)) this._override.debug(message);
	};
	CustomLoggerWrapper.prototype.trace = function(message) {
		if (!this._override.trace) this.log(LogLevel.TRACE, message);
		else if (this._shouldLog(LogLevel.TRACE)) this._override.trace(message);
	};
	CustomLoggerWrapper.prototype._shouldLog = function(level) {
		return this._minLevel === void 0 || this._minLevel >= level;
	};
	return CustomLoggerWrapper;
}();
//#endregion
//#region node_modules/@d-fischer/logger/es/NodeLogger.mjs
init_tslib_es6();
var _a, _b, _c;
var LogLevelToEmoji = (_a = {}, _a[LogLevel.CRITICAL] = "🛑", _a[LogLevel.ERROR] = "❌", _a[LogLevel.WARNING] = "⚠️ ", _a[LogLevel.INFO] = "ℹ️ ", _a[LogLevel.DEBUG] = "🐞", _a[LogLevel.TRACE] = "🐾", _a);
var colors = {
	black: 30,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	magenta: 35,
	cyan: 36,
	white: 37,
	blackBright: 90,
	redBright: 91,
	greenBright: 92,
	yellowBright: 93,
	blueBright: 94,
	magentaBright: 95,
	cyanBright: 96,
	whiteBright: 97
};
var bgColors = {
	bgBlack: 40,
	bgRed: 41,
	bgGreen: 42,
	bgYellow: 43,
	bgBlue: 44,
	bgMagenta: 45,
	bgCyan: 46,
	bgWhite: 47,
	bgBlackBright: 100,
	bgRedBright: 101,
	bgGreenBright: 102,
	bgYellowBright: 103,
	bgBlueBright: 104,
	bgMagentaBright: 105,
	bgCyanBright: 106,
	bgWhiteBright: 107
};
function createGenericWrapper(color, ending, inner) {
	return function(str) {
		return "\x1B[".concat(color, "m").concat(inner ? inner(str) : str, "\x1B[").concat(ending, "m");
	};
}
function createColorWrapper(color) {
	return createGenericWrapper(colors[color], 39);
}
function createBgWrapper(color, fgWrapper) {
	return createGenericWrapper(bgColors[color], 49, fgWrapper);
}
var LogLevelToColor = (_b = {}, _b[LogLevel.CRITICAL] = createColorWrapper("red"), _b[LogLevel.ERROR] = createColorWrapper("redBright"), _b[LogLevel.WARNING] = createColorWrapper("yellow"), _b[LogLevel.INFO] = createColorWrapper("blue"), _b[LogLevel.DEBUG] = createColorWrapper("magenta"), _b[LogLevel.TRACE] = createGenericWrapper(0, 0), _b);
var LogLevelToBackgroundColor = (_c = {}, _c[LogLevel.CRITICAL] = createBgWrapper("bgRed", createColorWrapper("white")), _c[LogLevel.ERROR] = createBgWrapper("bgRedBright", createColorWrapper("white")), _c[LogLevel.WARNING] = createBgWrapper("bgYellow", createColorWrapper("black")), _c[LogLevel.INFO] = createBgWrapper("bgBlue", createColorWrapper("white")), _c[LogLevel.DEBUG] = createBgWrapper("bgMagenta", createColorWrapper("black")), _c[LogLevel.TRACE] = createGenericWrapper(7, 27), _c);
var NodeLogger = function(_super) {
	__extends(NodeLogger, _super);
	function NodeLogger() {
		return _super !== null && _super.apply(this, arguments) || this;
	}
	NodeLogger.prototype.log = function(level, message) {
		var _a, _b, _c;
		if (level > this._minLevel) return;
		var logFn = LogLevelToConsoleFunction[level];
		var builtMessage = "";
		if (this._timestamps) builtMessage += "[".concat((/* @__PURE__ */ new Date()).toISOString(), "] ");
		if (this._emoji) {
			var emoji = LogLevelToEmoji[level];
			builtMessage += "".concat(emoji, " ");
		}
		if ((_c = (_a = this._colors) !== null && _a !== void 0 ? _a : (_b = process.stdout) === null || _b === void 0 ? void 0 : _b.isTTY) !== null && _c !== void 0 ? _c : true) builtMessage += "".concat(LogLevelToBackgroundColor[level](this._name), " ").concat(LogLevelToBackgroundColor[level](LogLevel[level]), " ").concat(LogLevelToColor[level](message));
		else builtMessage += "[".concat(this._name, ":").concat(LogLevel[level].toLowerCase(), "] ").concat(message);
		logFn(builtMessage);
	};
	return NodeLogger;
}(BaseLogger);
//#endregion
//#region node_modules/@d-fischer/logger/es/createLogger.mjs
function createLogger$1(options) {
	if (options.custom) return new CustomLoggerWrapper(options);
	if (import_detect_node.isNode) return new NodeLogger(options);
	return new BrowserLogger(options);
}
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/errors/CustomError.mjs
/** @private */
var CustomError = class extends Error {
	constructor(...params) {
		var _a;
		super(...params);
		Object.setPrototypeOf(this, new.target.prototype);
		(_a = Error.captureStackTrace) === null || _a === void 0 || _a.call(Error, this, new.target.constructor);
	}
	get name() {
		return this.constructor.name;
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/errors/RateLimiterDestroyedError.mjs
var RateLimiterDestroyedError = class extends CustomError {};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/errors/RateLimitReachedError.mjs
var RateLimitReachedError = class extends CustomError {};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/errors/RetryAfterError.mjs
var RetryAfterError = class extends CustomError {
	constructor(after) {
		super(`Need to retry after ${after} ms`);
		this._retryAt = Date.now() + after;
	}
	get retryAt() {
		return this._retryAt;
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/limiters/ResponseBasedRateLimiter.mjs
var ResponseBasedRateLimiter = class {
	constructor({ logger }) {
		this._queue = [];
		this._batchRunning = false;
		this._paused = false;
		this._logger = createLogger$1({
			name: "rate-limiter",
			emoji: true,
			...logger
		});
	}
	async request(req, options) {
		this._logger.trace("request start");
		return await new Promise((resolve, reject) => {
			var _a;
			const reqSpec = {
				req,
				resolve,
				reject,
				limitReachedBehavior: (_a = options === null || options === void 0 ? void 0 : options.limitReachedBehavior) !== null && _a !== void 0 ? _a : "enqueue"
			};
			if (this._batchRunning || !!this._nextBatchTimer || this._paused) {
				this._logger.trace(`request queued batchRunning:${this._batchRunning.toString()} hasNextBatchTimer:${(!!this._nextBatchTimer).toString()} paused:${this._paused.toString()}`);
				this._queue.push(reqSpec);
			} else this._runRequestBatch([reqSpec]);
		});
	}
	clear() {
		this._queue = [];
	}
	pause() {
		this._paused = true;
	}
	resume() {
		this._paused = false;
		this._runNextBatch();
	}
	get stats() {
		var _a, _b, _c, _d, _e;
		return {
			lastKnownLimit: (_b = (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.limit) !== null && _b !== void 0 ? _b : null,
			lastKnownRemainingRequests: (_d = (_c = this._parameters) === null || _c === void 0 ? void 0 : _c.remaining) !== null && _d !== void 0 ? _d : null,
			lastKnownResetDate: mapNullable((_e = this._parameters) === null || _e === void 0 ? void 0 : _e.resetsAt, (v) => new Date(v))
		};
	}
	async _runRequestBatch(reqSpecs) {
		this._logger.trace(`runRequestBatch start specs:${reqSpecs.length}`);
		this._batchRunning = true;
		if (this._parameters) this._logger.debug(`Remaining requests: ${this._parameters.remaining}`);
		this._logger.debug(`Doing ${reqSpecs.length} requests, new queue length is ${this._queue.length}`);
		const promises = reqSpecs.map(async (reqSpec) => {
			const { req, resolve, reject } = reqSpec;
			try {
				const result = await this.doRequest(req);
				const retry = this.needsToRetryAfter(result);
				if (retry !== null) {
					this._queue.unshift(reqSpec);
					this._logger.info(`Retrying after ${retry} ms`);
					throw new RetryAfterError(retry);
				}
				const params = this.getParametersFromResponse(result);
				resolve(result);
				return params;
			} catch (e) {
				if (e instanceof RetryAfterError) throw e;
				reject(e);
				return;
			}
		});
		const settledPromises = await Promise.allSettled(promises);
		const rejectedPromises = settledPromises.filter((p) => p.status === "rejected");
		const now = Date.now();
		if (rejectedPromises.length) {
			this._logger.trace("runRequestBatch some rejected");
			const retryAfter = Math.max(now, ...rejectedPromises.map((p) => p.reason.retryAt)) - now;
			this._logger.warn(`Waiting for ${retryAfter} ms because the rate limit was exceeded`);
			this._nextBatchTimer = setTimeout(() => {
				this._parameters = void 0;
				this._runNextBatch();
			}, retryAfter);
		} else {
			this._logger.trace("runRequestBatch none rejected");
			const params = settledPromises.filter((p) => p.status === "fulfilled" && p.value !== void 0).map((p) => p.value).reduce((carry, v) => {
				if (!carry) return v;
				return v.remaining < carry.remaining ? v : carry;
			}, void 0);
			this._batchRunning = false;
			if (params) {
				this._parameters = params;
				if (params.resetsAt < now || params.remaining > 0) {
					this._logger.trace("runRequestBatch canRunMore");
					this._runNextBatch();
				} else {
					const delay = params.resetsAt - now;
					this._logger.trace(`runRequestBatch delay:${delay}`);
					this._logger.warn(`Waiting for ${delay} ms because the rate limit was reached`);
					this._queue = this._queue.filter((entry) => {
						switch (entry.limitReachedBehavior) {
							case "enqueue": return true;
							case "null":
								entry.resolve(null);
								return false;
							case "throw":
								entry.reject(new RateLimitReachedError("Request removed from queue because the rate limit was reached"));
								return false;
							default: throw new Error("this should never happen");
						}
					});
					this._nextBatchTimer = setTimeout(() => {
						this._parameters = void 0;
						this._runNextBatch();
					}, delay);
				}
			}
		}
		this._logger.trace("runRequestBatch end");
	}
	_runNextBatch() {
		if (this._paused) return;
		this._logger.trace("runNextBatch start");
		if (this._nextBatchTimer) {
			clearTimeout(this._nextBatchTimer);
			this._nextBatchTimer = void 0;
		}
		const amount = this._parameters ? Math.min(this._parameters.remaining, this._parameters.limit / 10) : 1;
		const reqSpecs = this._queue.splice(0, amount);
		if (reqSpecs.length) this._runRequestBatch(reqSpecs);
		this._logger.trace("runNextBatch end");
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/limiters/PartitionedRateLimiter.mjs
var PartitionedRateLimiter = class {
	constructor(options) {
		this._children = /* @__PURE__ */ new Map();
		this._paused = false;
		this._partitionKeyCallback = options.getPartitionKey;
		this._createChildCallback = options.createChild;
	}
	async request(req, options) {
		const partitionKey = this._partitionKeyCallback(req);
		return await this._getChild(partitionKey).request(req, options);
	}
	clear() {
		for (const child of this._children.values()) child.clear();
	}
	pause() {
		this._paused = true;
		for (const child of this._children.values()) child.pause();
	}
	resume() {
		this._paused = false;
		for (const child of this._children.values()) child.resume();
	}
	getChildStats(partitionKey) {
		if (!this._children.has(partitionKey)) return null;
		const child = this._children.get(partitionKey);
		if (!(child instanceof ResponseBasedRateLimiter)) return null;
		return child.stats;
	}
	_getChild(partitionKey) {
		if (this._children.has(partitionKey)) return this._children.get(partitionKey);
		const result = this._createChildCallback(partitionKey);
		if (this._paused) result.pause();
		this._children.set(partitionKey, result);
		return result;
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/limiters/PartitionedTimeBasedRateLimiter.mjs
var PartitionedTimeBasedRateLimiter = class {
	constructor({ logger, bucketSize, timeFrame, doRequest, getPartitionKey }) {
		this._partitionedQueue = /* @__PURE__ */ new Map();
		this._usedFromBucket = /* @__PURE__ */ new Map();
		this._counterTimers = /* @__PURE__ */ new Set();
		this._paused = false;
		this._destroyed = false;
		this._logger = createLogger$1({
			name: "rate-limiter",
			emoji: true,
			...logger
		});
		this._bucketSize = bucketSize;
		this._timeFrame = timeFrame;
		this._callback = doRequest;
		this._partitionKeyCallback = getPartitionKey;
	}
	async request(req, options) {
		return await new Promise((resolve, reject) => {
			var _a, _b;
			if (this._destroyed) {
				reject(new RateLimiterDestroyedError("Rate limiter was destroyed"));
				return;
			}
			const reqSpec = {
				req,
				resolve,
				reject,
				limitReachedBehavior: (_a = options === null || options === void 0 ? void 0 : options.limitReachedBehavior) !== null && _a !== void 0 ? _a : "enqueue"
			};
			const partitionKey = this._partitionKeyCallback(req);
			const usedFromBucket = (_b = this._usedFromBucket.get(partitionKey)) !== null && _b !== void 0 ? _b : 0;
			if (usedFromBucket >= this._bucketSize || this._paused) switch (reqSpec.limitReachedBehavior) {
				case "enqueue": {
					const queue = this._getPartitionedQueue(partitionKey);
					queue.push(reqSpec);
					if (usedFromBucket + queue.length >= this._bucketSize) this._logger.warn(`Rate limit of ${this._bucketSize} for ${partitionKey ? `partition ${partitionKey}` : "default partition"} was reached, waiting for ${this._paused ? "the limiter to be unpaused" : "a free bucket entry"}; queue size is ${queue.length}`);
					else this._logger.info(`Enqueueing request for ${partitionKey ? `partition ${partitionKey}` : "default partition"} because the rate limiter is paused; queue size is ${queue.length}`);
					break;
				}
				case "null":
					reqSpec.resolve(null);
					if (this._paused) this._logger.info(`Returning null for request for ${partitionKey ? `partition ${partitionKey}` : "default partition"} because the rate limiter is paused`);
					else this._logger.warn(`Rate limit of ${this._bucketSize} for ${partitionKey ? `partition ${partitionKey}` : "default partition"} was reached, dropping request and returning null`);
					break;
				case "throw":
					reqSpec.reject(new RateLimitReachedError(`Request dropped because ${this._paused ? "the rate limiter is paused" : `the rate limit for ${partitionKey ? `partition ${partitionKey}` : "default partition"} was reached`}`));
					break;
				default: throw new Error("this should never happen");
			}
			else this._runRequest(reqSpec, partitionKey);
		});
	}
	clear() {
		this._partitionedQueue.clear();
	}
	pause() {
		this._paused = true;
	}
	resume() {
		this._paused = false;
		for (const partitionKey of this._partitionedQueue.keys()) this._runNextRequest(partitionKey);
	}
	destroy() {
		this._paused = false;
		this._destroyed = true;
		this._counterTimers.forEach((timer) => {
			clearTimeout(timer);
		});
		for (const queue of this._partitionedQueue.values()) for (const req of queue) req.reject(new RateLimiterDestroyedError("Rate limiter was destroyed"));
		this._partitionedQueue.clear();
	}
	_getPartitionedQueue(partitionKey) {
		if (this._partitionedQueue.has(partitionKey)) return this._partitionedQueue.get(partitionKey);
		const newQueue = [];
		this._partitionedQueue.set(partitionKey, newQueue);
		return newQueue;
	}
	async _runRequest(reqSpec, partitionKey) {
		var _a;
		const queue = this._getPartitionedQueue(partitionKey);
		this._logger.debug(`doing a request for ${partitionKey ? `partition ${partitionKey}` : "default partition"}, new queue length is ${queue.length}`);
		this._usedFromBucket.set(partitionKey, ((_a = this._usedFromBucket.get(partitionKey)) !== null && _a !== void 0 ? _a : 0) + 1);
		const { req, resolve, reject } = reqSpec;
		try {
			resolve(await this._callback(req));
		} catch (e) {
			reject(e);
		} finally {
			const counterTimer = setTimeout(() => {
				this._counterTimers.delete(counterTimer);
				const newUsed = this._usedFromBucket.get(partitionKey) - 1;
				this._usedFromBucket.set(partitionKey, newUsed);
				if (queue.length && newUsed < this._bucketSize) this._runNextRequest(partitionKey);
			}, this._timeFrame);
			this._counterTimers.add(counterTimer);
		}
	}
	_runNextRequest(partitionKey) {
		if (this._paused) return;
		const reqSpec = this._getPartitionedQueue(partitionKey).shift();
		if (reqSpec) this._runRequest(reqSpec, partitionKey);
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/limiters/TimeBasedRateLimiter.mjs
var TimeBasedRateLimiter = class {
	constructor({ logger, bucketSize, timeFrame, doRequest }) {
		this._queue = [];
		this._usedFromBucket = 0;
		this._counterTimers = /* @__PURE__ */ new Set();
		this._paused = false;
		this._destroyed = false;
		this._logger = createLogger$1({
			name: "rate-limiter",
			emoji: true,
			...logger
		});
		this._bucketSize = bucketSize;
		this._timeFrame = timeFrame;
		this._callback = doRequest;
	}
	async request(req, options) {
		return await new Promise((resolve, reject) => {
			var _a;
			if (this._destroyed) {
				reject(new RateLimiterDestroyedError("Rate limiter was destroyed"));
				return;
			}
			const reqSpec = {
				req,
				resolve,
				reject,
				limitReachedBehavior: (_a = options === null || options === void 0 ? void 0 : options.limitReachedBehavior) !== null && _a !== void 0 ? _a : "enqueue"
			};
			if (this._usedFromBucket >= this._bucketSize || this._paused) switch (reqSpec.limitReachedBehavior) {
				case "enqueue":
					this._queue.push(reqSpec);
					if (this._usedFromBucket + this._queue.length >= this._bucketSize) this._logger.warn(`Rate limit of ${this._bucketSize} was reached, waiting for ${this._paused ? "the limiter to be unpaused" : "a free bucket entry"}; queue size is ${this._queue.length}`);
					else this._logger.info(`Enqueueing request because the rate limiter is paused; queue size is ${this._queue.length}`);
					break;
				case "null":
					reqSpec.resolve(null);
					this._logger.warn(`Rate limit of ${this._bucketSize} was reached, dropping request and returning null`);
					if (this._paused) this._logger.info("Returning null for request because the rate limiter is paused");
					else this._logger.warn(`Rate limit of ${this._bucketSize} was reached, dropping request and returning null`);
					break;
				case "throw":
					reqSpec.reject(new RateLimitReachedError(`Request dropped because ${this._paused ? "the rate limiter is paused" : "the rate limit was reached"}`));
					break;
				default: throw new Error("this should never happen");
			}
			else this._runRequest(reqSpec);
		});
	}
	clear() {
		this._queue = [];
	}
	pause() {
		this._paused = true;
	}
	resume() {
		this._paused = false;
		this._runNextRequest();
	}
	destroy() {
		this._paused = false;
		this._destroyed = true;
		this._counterTimers.forEach((timer) => {
			clearTimeout(timer);
		});
		for (const req of this._queue) req.reject(new RateLimiterDestroyedError("Rate limiter was destroyed"));
		this._queue = [];
	}
	async _runRequest(reqSpec) {
		this._logger.debug(`doing a request, new queue length is ${this._queue.length}`);
		this._usedFromBucket += 1;
		const { req, resolve, reject } = reqSpec;
		try {
			resolve(await this._callback(req));
		} catch (e) {
			reject(e);
		} finally {
			const counterTimer = setTimeout(() => {
				this._counterTimers.delete(counterTimer);
				this._usedFromBucket -= 1;
				if (this._queue.length && this._usedFromBucket < this._bucketSize) this._runNextRequest();
			}, this._timeFrame);
			this._counterTimers.add(counterTimer);
		}
	}
	_runNextRequest() {
		if (this._paused) return;
		const reqSpec = this._queue.shift();
		if (reqSpec) this._runRequest(reqSpec);
	}
};
//#endregion
//#region node_modules/@d-fischer/rate-limiter/es/limiters/TimedPassthruRateLimiter.mjs
var TimedPassthruRateLimiter = class extends TimeBasedRateLimiter {
	constructor(child, config) {
		super({
			...config,
			async doRequest(req, options) {
				return await child.request(req, options);
			}
		});
	}
};
//#endregion
//#region node_modules/@d-fischer/connection/es/AbstractConnection.mjs
var AbstractConnection = class extends EventEmitter {
	constructor({ lineBased, logger, additionalOptions } = {}) {
		super();
		this._currentLine = "";
		this._connecting = false;
		this._connected = false;
		this.onReceive = this.registerEvent();
		this.onConnect = this.registerEvent();
		this.onDisconnect = this.registerEvent();
		this.onEnd = this.registerEvent();
		this._lineBased = lineBased !== null && lineBased !== void 0 ? lineBased : false;
		this._logger = logger;
		this._additionalOptions = additionalOptions;
	}
	get isConnecting() {
		return this._connecting;
	}
	get isConnected() {
		return this._connected;
	}
	sendLine(line) {
		if (this._connected) {
			line = line.replace(/[\0\r\n]/g, "");
			this.sendRaw(`${line}\r\n`);
		}
	}
	assumeExternalDisconnect() {
		var _a;
		(_a = this._logger) === null || _a === void 0 || _a.trace("AbstractConnection assumeExternalDisconnect");
		this._connected = false;
		this._connecting = false;
		this.clearSocket();
		this.emit(this.onDisconnect, false);
	}
	receiveRaw(data) {
		var _a, _b;
		if (!this._lineBased) {
			this.emit(this.onReceive, data);
			return;
		}
		const receivedLines = data.split("\r\n");
		this._currentLine += (_a = receivedLines.shift()) !== null && _a !== void 0 ? _a : "";
		if (receivedLines.length) {
			this.emit(this.onReceive, this._currentLine);
			this._currentLine = (_b = receivedLines.pop()) !== null && _b !== void 0 ? _b : "";
			for (const line of receivedLines) this.emit(this.onReceive, line);
		}
	}
};
//#endregion
//#region node_modules/@d-fischer/connection/es/DirectConnection.mjs
var DirectConnection = class extends AbstractConnection {
	constructor(target, options) {
		var _a;
		super(options);
		this._socket = null;
		this._closingOnDemand = false;
		this._hadError = false;
		if (!target.hostName || !target.port) throw new Error("DirectConnection requires hostName and port to be set");
		this._host = target.hostName;
		this._port = target.port;
		this._secure = (_a = target.secure) !== null && _a !== void 0 ? _a : true;
	}
	get hasSocket() {
		return !!this._socket;
	}
	sendRaw(line) {
		var _a;
		(_a = this._socket) === null || _a === void 0 || _a.write(line);
	}
	connect() {
		var _a;
		(_a = this._logger) === null || _a === void 0 || _a.trace("DirectConnection connect");
		this._connecting = true;
		if (this._secure) this._socket = tls.connect(this._port, this._host);
		else {
			this._socket = new Socket();
			this._socket.connect(this._port, this._host);
		}
		this._socket.on("connect", () => {
			var _a;
			(_a = this._logger) === null || _a === void 0 || _a.trace("DirectConnection onConnect");
			this._connecting = false;
			this._connected = true;
			this._closingOnDemand = false;
			this._hadError = false;
			this.emit(this.onConnect);
		});
		this._socket.on("error", (err) => {
			var _a;
			(_a = this._logger) === null || _a === void 0 || _a.trace(`DirectConnection onError message:${err.message}`);
			this._connected = false;
			this._connecting = false;
			this.emit(this.onDisconnect, false, err);
			this._hadError = true;
		});
		this._socket.on("data", (data) => {
			this.receiveRaw(data.toString());
		});
		this._socket.on("close", () => {
			var _a;
			(_a = this._logger) === null || _a === void 0 || _a.trace(`DirectConnection onClose closingOnDemand:${this._closingOnDemand.toString()} hadError:${this._hadError.toString()}`);
			if (!this._hadError) {
				this._connected = false;
				this._connecting = false;
				this.emit(this.onDisconnect, this._closingOnDemand);
			}
			this._closingOnDemand = false;
			this._hadError = false;
			this.clearSocket();
		});
	}
	disconnect() {
		var _a, _b;
		(_a = this._logger) === null || _a === void 0 || _a.trace("DirectConnection disconnect");
		this._closingOnDemand = true;
		(_b = this._socket) === null || _b === void 0 || _b.end();
	}
	clearSocket() {
		if (this._socket) {
			this._socket.removeAllListeners("connect");
			this._socket.removeAllListeners("error");
			this._socket.removeAllListeners("data");
			this._socket.removeAllListeners("close");
			this._socket.resetAndDestroy();
			this._socket = null;
		}
	}
};
//#endregion
//#region node_modules/@d-fischer/connection/es/PersistentConnection.mjs
var PersistentConnection = class extends EventEmitter {
	constructor(_type, _target, _config = {}) {
		var _a;
		super();
		this._type = _type;
		this._target = _target;
		this._config = _config;
		this._retryLimit = Infinity;
		this._initialRetryLimit = 3;
		this._connecting = false;
		this._connectionRetryCount = 0;
		this.onReceive = this.registerEvent();
		this.onConnect = this.registerEvent();
		this.onDisconnect = this.registerEvent();
		this.onEnd = this.registerEvent();
		this._retryLimit = (_a = _config.retryLimit) !== null && _a !== void 0 ? _a : Infinity;
		this._logger = _config.logger;
	}
	get isConnected() {
		var _a, _b;
		return (_b = (_a = this._currentConnection) === null || _a === void 0 ? void 0 : _a.isConnected) !== null && _b !== void 0 ? _b : false;
	}
	get isConnecting() {
		var _a, _b;
		return (_b = (_a = this._currentConnection) === null || _a === void 0 ? void 0 : _a.isConnecting) !== null && _b !== void 0 ? _b : this._connecting;
	}
	get hasSocket() {
		var _a, _b;
		return (_b = (_a = this._currentConnection) === null || _a === void 0 ? void 0 : _a.hasSocket) !== null && _b !== void 0 ? _b : false;
	}
	sendLine(line) {
		var _a;
		(_a = this._currentConnection) === null || _a === void 0 || _a.sendLine(line);
	}
	connect() {
		if (this._currentConnection || this._connecting) throw new Error("Connection already present");
		this._connecting = true;
		this._connectionRetryCount = 0;
		this._tryConnect(true);
	}
	disconnect() {
		var _a;
		(_a = this._logger) === null || _a === void 0 || _a.trace(`PersistentConnection disconnect currentConnectionExists:${Boolean(this._currentConnection).toString()} connecting:${this._connecting.toString()}`);
		this._connecting = false;
		if (this._currentConnection) {
			const lastConnection = this._currentConnection;
			this._currentConnection = void 0;
			lastConnection.disconnect();
		}
	}
	assumeExternalDisconnect() {
		var _a, _b;
		(_a = this._logger) === null || _a === void 0 || _a.trace("PersistentConnection assumeExternalDisconnect");
		(_b = this._currentConnection) === null || _b === void 0 || _b.assumeExternalDisconnect();
	}
	reconnect() {
		this._reconnect(true);
	}
	acknowledgeSuccessfulReconnect() {
		if (this._previousConnection) {
			this._previousConnection.disconnect();
			this._previousConnection = void 0;
		}
	}
	_startTryingToConnect(userGenerated = false) {
		this._connecting = true;
		this._connectionRetryCount = 0;
		this._tryConnect(userGenerated);
	}
	_tryConnect(userGenerated = false) {
		var _a, _b;
		(_a = this._logger) === null || _a === void 0 || _a.trace(`PersistentConnection tryConnect currentConnectionExists:${Boolean(this._currentConnection).toString()} connecting:${this._connecting.toString()}`);
		const retryLimit = userGenerated ? this._initialRetryLimit : this._retryLimit;
		(_b = this._retryTimerGenerator) !== null && _b !== void 0 || (this._retryTimerGenerator = fibWithLimit(120));
		const newConnection = this._currentConnection = new this._type(resolveConfigValueSync(this._target), this._config);
		newConnection.onReceive((line) => this.emit(this.onReceive, line));
		newConnection.onConnect(() => {
			this.emit(this.onConnect);
			this._connecting = false;
			this._retryTimerGenerator = void 0;
		});
		newConnection.onDisconnect((manually, reason) => {
			var _a, _b, _c;
			this.emit(this.onDisconnect, manually, reason);
			if (manually) {
				this.emit(this.onEnd, true);
				this._connecting = false;
				this._retryTimerGenerator = void 0;
				newConnection.disconnect();
				if (this._currentConnection === newConnection) this._currentConnection = void 0;
				if (this._previousConnection === newConnection) this._previousConnection = void 0;
			} else if (this._connecting) {
				(_a = this._logger) === null || _a === void 0 || _a.debug(`Connection error caught: ${(_b = reason === null || reason === void 0 ? void 0 : reason.message) !== null && _b !== void 0 ? _b : "unknown error"}`);
				if (this._connectionRetryCount >= retryLimit) return;
				this._connectionRetryCount++;
				const secs = this._retryTimerGenerator.next().value;
				if (secs !== 0) (_c = this._logger) === null || _c === void 0 || _c.info(`Retrying in ${secs} seconds`);
				setTimeout(() => {
					var _a;
					if (!this._connecting) return;
					(_a = this._logger) === null || _a === void 0 || _a.info(userGenerated ? "Retrying connection" : "Trying to reconnect");
					this._tryConnect();
				}, secs * 1e3);
			} else this._reconnect();
		});
		newConnection.connect();
	}
	_reconnect(userGenerated = false) {
		if (userGenerated && this._config.overlapManualReconnect) {
			this._previousConnection = this._currentConnection;
			this._currentConnection = void 0;
		} else this.disconnect();
		this._startTryingToConnect(userGenerated);
	}
};
//#endregion
//#region node_modules/@d-fischer/connection/es/WebSocketConnection.mjs
var WebSocketConnection = class extends AbstractConnection {
	constructor(target, options) {
		super(options);
		this._socket = null;
		this._closingOnDemand = false;
		if (target.hostName && target.port) this._url = `ws${target.secure ? "s" : ""}://${target.hostName}:${target.port}`;
		else if (target.url) this._url = target.url;
		else throw new Error("WebSocketConnection requires either hostName & port or url to be set");
	}
	get hasSocket() {
		return !!this._socket;
	}
	sendRaw(line) {
		var _a;
		(_a = this._socket) === null || _a === void 0 || _a.send(line);
	}
	connect() {
		var _a, _b;
		(_a = this._logger) === null || _a === void 0 || _a.trace("WebSocketConnection connect");
		this._connecting = true;
		this._socket = new WebSocket$2(this._url, (_b = this._additionalOptions) === null || _b === void 0 ? void 0 : _b.wsOptions);
		this._socket.onopen = () => {
			var _a;
			(_a = this._logger) === null || _a === void 0 || _a.trace("WebSocketConnection onOpen");
			this._connected = true;
			this._connecting = false;
			this._closingOnDemand = false;
			this.emit(this.onConnect);
		};
		this._socket.onmessage = ({ data }) => {
			this.receiveRaw(data.toString());
		};
		this._socket.onerror = (e) => {
			var _a;
			(_a = this._logger) === null || _a === void 0 || _a.trace(`WebSocketConnection onError message:${e.message}`);
		};
		this._socket.onclose = (e) => {
			var _a;
			const wasConnected = this._connected;
			const wasConnecting = this._connecting;
			(_a = this._logger) === null || _a === void 0 || _a.trace(`WebSocketConnection onClose wasConnected:${wasConnected.toString()} wasConnecting:${wasConnecting.toString()} closingOnDemand:${this._closingOnDemand.toString()} wasClean:${e.wasClean.toString()}`);
			this._connected = false;
			this._connecting = false;
			if (this._closingOnDemand) {
				this._closingOnDemand = false;
				this.emit(this.onDisconnect, true);
				this.emit(this.onEnd, true);
			} else {
				const err = /* @__PURE__ */ new Error(`[${e.code}] ${e.reason}`);
				this.emit(this.onDisconnect, false, err);
				this.emit(this.onEnd, false, err);
			}
			this.clearSocket();
		};
	}
	disconnect() {
		var _a, _b;
		(_a = this._logger) === null || _a === void 0 || _a.trace("WebSocketConnection disconnect");
		this._closingOnDemand = true;
		(_b = this._socket) === null || _b === void 0 || _b.close();
	}
	clearSocket() {
		if (this._socket) {
			this._socket.onopen = null;
			this._socket.onmessage = null;
			this._socket.onerror = null;
			this._socket.onclose = null;
			if (this._socket.terminate) this._socket.terminate();
			else this._socket.close();
			this._socket = null;
		}
	}
};
//#endregion
//#region node_modules/klona/json/index.mjs
function klona(val) {
	var k, out, tmp;
	if (Array.isArray(val)) {
		out = Array(k = val.length);
		while (k--) out[k] = (tmp = val[k]) && typeof tmp === "object" ? klona(tmp) : tmp;
		return out;
	}
	if (Object.prototype.toString.call(val) === "[object Object]") {
		out = {};
		for (k in val) if (k === "__proto__") Object.defineProperty(out, k, {
			value: klona(val[k]),
			configurable: true,
			enumerable: true,
			writable: true
		});
		else out[k] = (tmp = val[k]) && typeof tmp === "object" ? klona(tmp) : tmp;
		return out;
	}
	return val;
}
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/AwayNotifyCapability.mjs
const AwayNotifyCapability = { name: "away-notify" };
//#endregion
//#region node_modules/ircv3/es/Errors/NotEnoughParametersError.mjs
var NotEnoughParametersError = class NotEnoughParametersError extends Error {
	constructor(_command, _expectedParams, _actualParams) {
		super(`command "${_command}" expected ${_expectedParams} or more parameters, got ${_actualParams}`);
		this._command = _command;
		this._expectedParams = _expectedParams;
		this._actualParams = _actualParams;
		Object.setPrototypeOf(this, NotEnoughParametersError.prototype);
		if (Error.captureStackTrace) Error.captureStackTrace(this, NotEnoughParametersError);
	}
	get command() {
		return this._command;
	}
	get expectedParams() {
		return this._expectedParams;
	}
	get actualParams() {
		return this._actualParams;
	}
};
//#endregion
//#region node_modules/ircv3/es/Errors/ParameterRequirementMismatchError.mjs
var ParameterRequirementMismatchError = class ParameterRequirementMismatchError extends Error {
	constructor(_command, _paramName, _paramSpec, _givenValue) {
		var _a;
		super(`required parameter "${_paramName}" did not validate against ${(_a = _paramSpec.type) !== null && _a !== void 0 ? _a : "regex"} validation: "${_givenValue}"`);
		this._command = _command;
		this._paramName = _paramName;
		this._paramSpec = _paramSpec;
		this._givenValue = _givenValue;
		Object.setPrototypeOf(this, ParameterRequirementMismatchError.prototype);
		if (Error.captureStackTrace) Error.captureStackTrace(this, ParameterRequirementMismatchError);
	}
	get command() {
		return this._command;
	}
	get paramName() {
		return this._paramName;
	}
	get paramSpec() {
		return this._paramSpec;
	}
	get givenValue() {
		return this._givenValue;
	}
};
//#endregion
//#region node_modules/ircv3/es/ServerProperties.mjs
const defaultServerProperties = {
	channelTypes: "#&",
	supportedUserModes: "iwso",
	supportedChannelModes: {
		prefix: "ov",
		list: "b",
		alwaysWithParam: "ovk",
		paramWhenSet: "l",
		noParam: "imnpst"
	},
	prefixes: [{
		modeChar: "v",
		prefix: "+"
	}, {
		modeChar: "o",
		prefix: "@"
	}]
};
//#endregion
//#region node_modules/ircv3/es/Toolkit/StringTools.mjs
var import_escape_string_regexp = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = (string) => {
		if (typeof string !== "string") throw new TypeError("Expected a string");
		return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
	};
	module.exports.default = module.exports;
})))(), 1);
function isChannel(str, validTypes = "#&") {
	return new RegExp(`^[${(0, import_escape_string_regexp.default)(validTypes)}][^ \b\0\n\r,]+$`).test(str);
}
const ctcpEscapeMap = {
	0: "\0",
	n: "\n",
	r: "\r",
	"": ""
};
function decodeCtcp(message) {
	if (!message.startsWith("")) return false;
	message = message.substring(1);
	if (message.endsWith("")) message = message.slice(0, -1);
	if (!message) return false;
	message = message.replace(/\x10(.)/, (_, escapedChar) => escapedChar in ctcpEscapeMap ? ctcpEscapeMap[escapedChar] : "");
	let [command, params = ""] = splitWithLimit(message, " ", 2);
	command = command ? command.toUpperCase() : "";
	return {
		command,
		params
	};
}
//#endregion
//#region node_modules/ircv3/es/Message/Message.mjs
const tagEscapeMap = {
	"\\": "\\",
	";": ":",
	"\n": "n",
	"\r": "r",
	" ": "s"
};
function escapeTag(str) {
	return str.replace(/[\\;\n\r ]/g, (match) => `\\${tagEscapeMap[match]}`);
}
function prefixToString(prefix) {
	let result = `${prefix.nick}`;
	if (prefix.user) result += `!${prefix.user}`;
	if (prefix.host) result += `@${prefix.host}`;
	return result;
}
function createMessage(type, params, prefix, tags, serverProperties = defaultServerProperties, isServer = false) {
	const message = new type(type.COMMAND, void 0, { serverProperties });
	const parsedParams = {};
	if (message._paramSpec) forEachObjectEntry(message._paramSpec, (paramSpec, paramName) => {
		if (isServer && paramSpec.noServer) return;
		if (!isServer && paramSpec.noClient) return;
		if (paramName in params) {
			const param = params[paramName];
			if (param !== void 0) {
				if (type.checkParam(param, paramSpec, serverProperties)) parsedParams[paramName] = {
					value: param,
					trailing: Boolean(paramSpec.trailing)
				};
				else if (!paramSpec.optional) throw new Error(`required parameter "${paramName}" did not suit requirements: "${param}"`);
			}
		}
		if (!(paramName in parsedParams) && !paramSpec.optional) throw new Error(`required parameter "${paramName}" not found in command "${type.COMMAND}"`);
	});
	message._parsedParams = parsedParams;
	if (message._paramSpec) for (const key of Object.keys(message._paramSpec)) Object.defineProperty(message, key, { get() {
		var _a, _b;
		return (_b = (_a = this._parsedParams) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b.value;
	} });
	message._initPrefixAndTags(prefix, tags);
	return message;
}
var Message = class Message {
	static checkParam(param, spec, serverProperties = defaultServerProperties) {
		if (spec.type === "channel") {
			if (!isChannel(param, serverProperties.channelTypes)) return false;
		}
		if (spec.type === "channelList") {
			if (!param.split(",").every((chan) => isChannel(chan, serverProperties.channelTypes))) return false;
		}
		if (spec.match) {
			if (!spec.match.test(param)) return false;
		}
		return true;
	}
	constructor(command, { params, tags, prefix, rawLine } = {}, { serverProperties = defaultServerProperties, isServer = false, shouldParseParams = true } = {}, paramSpec) {
		this._params = [];
		this._serverProperties = defaultServerProperties;
		this._paramSpec = paramSpec;
		this._command = command;
		this._params = params;
		this._tags = tags !== null && tags !== void 0 ? tags : /* @__PURE__ */ new Map();
		this._prefix = prefix;
		this._serverProperties = serverProperties;
		this._raw = rawLine;
		if (shouldParseParams) this.parseParams(isServer);
	}
	getMinParamCount(isServer = false) {
		if (!this._paramSpec) return 0;
		return Object.values(this._paramSpec).filter((spec) => {
			if (spec.noServer && isServer) return false;
			if (spec.noClient && !isServer) return false;
			return !spec.optional;
		}).length;
	}
	get paramCount() {
		var _a, _b;
		return (_b = (_a = this._params) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
	}
	prefixToString() {
		if (!this._prefix) return "";
		return prefixToString(this._prefix);
	}
	tagsToString() {
		return [...this._tags.entries()].map(([key, value]) => value ? `${key}=${escapeTag(value)}` : key).join(";");
	}
	toString(includePrefix = false, fromRawParams = false) {
		const parts = [fromRawParams ? this._buildCommandFromRawParams() : this._buildCommandFromNamedParams()];
		if (includePrefix) {
			const prefix = this.prefixToString();
			if (prefix) parts.unshift(`:${prefix}`);
		}
		const tags = this.tagsToString();
		if (tags) parts.unshift(`@${tags}`);
		return parts.join(" ");
	}
	/** @private */
	_initPrefixAndTags(prefix, tags) {
		this._prefix = prefix;
		if (tags) this._tags = tags;
	}
	parseParams(isServer = false) {
		if (this._params) {
			let requiredParamsLeft = this.getMinParamCount(isServer);
			if (requiredParamsLeft > this._params.length) throw new NotEnoughParametersError(this._command, requiredParamsLeft, this._params.length);
			const paramSpecList = this._paramSpec;
			if (!paramSpecList) return;
			let i = 0;
			const parsedParams = {};
			for (const [paramName, paramSpec] of Object.entries(paramSpecList)) {
				if (paramSpec.noServer && isServer) continue;
				if (paramSpec.noClient && !isServer) continue;
				if (this._params.length - i <= requiredParamsLeft) {
					if (paramSpec.optional) continue;
					else if (this._params.length - i !== requiredParamsLeft) throw new Error("not enough parameters left for required parameters parsing (this is a library bug)");
				}
				let param = this._params[i];
				if (!param) {
					if (paramSpec.optional) break;
					throw new Error("unexpected parameter underflow");
				}
				if (paramSpec.rest) {
					const restParams = [];
					while (this._params[i] && !this._params[i].trailing) {
						restParams.push(this._params[i].value);
						++i;
					}
					if (!restParams.length) {
						if (paramSpec.optional) continue;
						throw new Error(`no parameters left for required rest parameter "${paramName}"`);
					}
					param = {
						value: restParams.join(" "),
						trailing: false
					};
				}
				if (Message.checkParam(param.value, paramSpec)) {
					parsedParams[paramName] = { ...param };
					if (!paramSpec.optional) --requiredParamsLeft;
					if (!paramSpec.rest) ++i;
				} else if (!paramSpec.optional) throw new ParameterRequirementMismatchError(this._command, paramName, paramSpec, param.value);
				if (paramSpec.trailing) break;
			}
			this._parsedParams = parsedParams;
			if (this._paramSpec) for (const key of Object.keys(this._paramSpec)) Object.defineProperty(this, key, { get() {
				var _a, _b;
				return (_b = (_a = this._parsedParams) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b.value;
			} });
		}
	}
	get rawParamValues() {
		var _a, _b;
		return (_b = (_a = this._params) === null || _a === void 0 ? void 0 : _a.map((param) => param.value)) !== null && _b !== void 0 ? _b : [];
	}
	get prefix() {
		return this._prefix;
	}
	get command() {
		return this._command;
	}
	get tags() {
		return this._tags;
	}
	get rawLine() {
		return this._raw;
	}
	isResponseTo(originalMessage) {
		return false;
	}
	endsResponseTo(originalMessage) {
		return false;
	}
	_acceptsInReplyCollection(message) {
		return message.isResponseTo(this);
	}
	_buildCommandFromNamedParams() {
		const specKeys = this._paramSpec ? Object.keys(this._paramSpec) : [];
		return [this._command, ...specKeys.map((paramName) => {
			var _a;
			const param = (_a = this._parsedParams) === null || _a === void 0 ? void 0 : _a[paramName];
			if (param) return (param.trailing ? ":" : "") + param.value;
		}).filter((param) => param !== void 0)].join(" ");
	}
	_buildCommandFromRawParams() {
		var _a, _b;
		return [this._command, ...(_b = (_a = this._params) === null || _a === void 0 ? void 0 : _a.map((param) => `${param.trailing ? ":" : ""}${param.value}`)) !== null && _b !== void 0 ? _b : []].join(" ");
	}
};
Message.COMMAND = "";
Message.SUPPORTS_CAPTURE = false;
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/BatchCapability/MessageTypes/Commands/Batch.mjs
var Batch = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			reference: {},
			type: { optional: true },
			additionalParams: { optional: true }
		});
	}
};
Batch.COMMAND = "BATCH";
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/BatchCapability/index.mjs
const BatchCapability = {
	name: "batch",
	messageTypes: [Batch],
	usesTags: true
};
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/CapNotifyCapability.mjs
const CapNotifyCapability = { name: "cap-notify" };
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/ChgHostCapability/MessageTypes/Commands/ChgHost.mjs
var ChgHost = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			newUser: {},
			newHost: {}
		});
	}
};
ChgHost.COMMAND = "CHGHOST";
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/ChgHostCapability/index.mjs
const ChgHostCapability = {
	name: "chghost",
	messageTypes: [ChgHost]
};
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/InviteNotifyCapability.mjs
const InviteNotifyCapability = { name: "invite-notify" };
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/LabeledResponseCapability/MessageTypes/Commands/Acknowledgement.mjs
var Acknowledgement = class extends Message {};
Acknowledgement.COMMAND = "ACK";
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/LabeledResponseCapability/index.mjs
const LabeledResponseCapability = {
	name: "labeled-response",
	messageTypes: [Acknowledgement],
	usesTags: true
};
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/MessageTagsCapability.mjs
const MessageTagsCapability = {
	name: "message-tags",
	usesTags: true
};
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/MultiPrefixCapability.mjs
const MultiPrefixCapability = { name: "multi-prefix" };
//#endregion
//#region node_modules/ircv3/es/Capability/CoreCapabilities/index.mjs
var CoreCapabilities_exports = /* @__PURE__ */ __exportAll({
	AwayNotify: () => AwayNotifyCapability,
	Batch: () => BatchCapability,
	CapNotify: () => CapNotifyCapability,
	ChgHost: () => ChgHostCapability,
	InviteNotify: () => InviteNotifyCapability,
	LabeledResponse: () => LabeledResponseCapability,
	MessageTags: () => MessageTagsCapability,
	MultiPrefix: () => MultiPrefixCapability
});
//#endregion
//#region node_modules/ircv3/es/Message/MessageCollector.mjs
var MessageCollector = class {
	constructor(_client, _originalMessage, ...types) {
		this._client = _client;
		this._originalMessage = _originalMessage;
		this._messages = [];
		this._endEventHandlers = /* @__PURE__ */ new Map();
		this._types = new Set(types);
	}
	untilEvent(eventType) {
		this._cleanEndEventHandler(eventType);
		const listener = this._client.on(eventType, () => this.end());
		this._endEventHandlers.set(eventType, listener);
	}
	async promise() {
		this._promise || (this._promise = new Promise((resolve) => {
			this._promiseResolve = resolve;
		}));
		return await this._promise;
	}
	collect(message) {
		if (!this._originalMessage._acceptsInReplyCollection(message)) return false;
		this._messages.push(message);
		if (message.endsResponseTo(this._originalMessage)) this.end();
		return true;
	}
	end() {
		this._client.stopCollect(this);
		this._cleanEndEventHandlers();
		if (this._promiseResolve) this._promiseResolve(this._messages);
	}
	_cleanEndEventHandlers() {
		this._endEventHandlers.forEach((listener) => {
			this._client.removeListener(listener);
		});
		this._endEventHandlers.clear();
	}
	_cleanEndEventHandler(eventType) {
		if (this._endEventHandlers.has(eventType)) {
			this._client.removeListener(this._endEventHandlers.get(eventType));
			this._endEventHandlers.delete(eventType);
		}
	}
};
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Password.mjs
var Password = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { password: {} });
	}
};
Password.COMMAND = "PASS";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/NickChange.mjs
var NickChange = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { nick: {} });
	}
};
NickChange.COMMAND = "NICK";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/UserRegistration.mjs
var UserRegistration = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			user: {},
			mode: {},
			unused: {},
			realName: { trailing: true }
		});
	}
};
UserRegistration.COMMAND = "USER";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/OperLogin.mjs
var OperLogin = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			name: {},
			password: {}
		});
	}
};
OperLogin.COMMAND = "OPER";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ClientQuit.mjs
var ClientQuit = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { text: {
			trailing: true,
			optional: true
		} });
	}
};
ClientQuit.COMMAND = "QUIT";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ServerQuit.mjs
var ServerQuit = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			server: {},
			reason: { trailing: true }
		});
	}
};
ServerQuit.COMMAND = "SQUIT";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ChannelJoin.mjs
var ChannelJoin = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			key: { optional: true }
		});
	}
};
ChannelJoin.COMMAND = "JOIN";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ChannelPart.mjs
var ChannelPart = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			reason: {
				trailing: true,
				optional: true
			}
		});
	}
};
ChannelPart.COMMAND = "PART";
//#endregion
//#region node_modules/ircv3/es/Errors/UnknownChannelModeCharError.mjs
var UnknownChannelModeCharError = class UnknownChannelModeCharError extends Error {
	constructor(_char) {
		super(`Unknown channel mode character ${_char}`);
		this._char = _char;
		Object.setPrototypeOf(this, UnknownChannelModeCharError.prototype);
		if (Error.captureStackTrace) Error.captureStackTrace(this, UnknownChannelModeCharError);
	}
	get char() {
		return this._char;
	}
};
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Mode.mjs
var Mode = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			modes: {
				rest: true,
				optional: true
			}
		});
	}
	get isChannel() {
		return isChannel(this.target, this._serverProperties.channelTypes);
	}
	separate() {
		const result = [];
		const modeRestParam = this.modes;
		if (!modeRestParam) throw new Error("can't separate a channel mode request, just set actions");
		const modeParams = modeRestParam.split(" ");
		const modes = modeParams.shift();
		let currentModeAction = "add";
		for (const ch of modes) {
			let thisModeAction = currentModeAction;
			switch (ch) {
				case "+":
					currentModeAction = "add";
					break;
				case "-":
					currentModeAction = "remove";
					break;
				default: {
					let requiresParam = false;
					let known = true;
					if (this.isChannel) if (this._serverProperties.supportedChannelModes.alwaysWithParam.includes(ch) || this._serverProperties.supportedChannelModes.prefix.includes(ch)) requiresParam = true;
					else if (this._serverProperties.supportedChannelModes.paramWhenSet.includes(ch)) {
						if (currentModeAction === "add") requiresParam = true;
					} else if (this._serverProperties.supportedChannelModes.list.includes(ch)) if (modeParams.length) requiresParam = true;
					else thisModeAction = "getList";
					else if (this._serverProperties.supportedChannelModes.noParam.includes(ch)) {} else throw new UnknownChannelModeCharError(ch);
					else known = this._serverProperties.supportedUserModes.includes(ch);
					if (requiresParam && !modeParams.length) continue;
					result.push({
						prefix: this._prefix,
						action: thisModeAction,
						letter: ch,
						param: requiresParam ? modeParams.shift() : void 0,
						known
					});
				}
			}
		}
		return result;
	}
};
Mode.COMMAND = "MODE";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Topic.mjs
var Topic = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			newTopic: {
				optional: true,
				trailing: true
			}
		});
	}
};
Topic.COMMAND = "TOPIC";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Names.mjs
var Names = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { channel: {
			type: "channelList",
			optional: true
		} });
	}
};
Names.COMMAND = "NAMES";
Names.SUPPORTS_CAPTURE = true;
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ChannelList.mjs
var ChannelList = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { optional: true },
			server: { optional: true }
		});
	}
};
ChannelList.COMMAND = "LIST";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ChannelInvite.mjs
var ChannelInvite = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			channel: { type: "channel" }
		});
	}
};
ChannelInvite.COMMAND = "INVITE";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ChannelKick.mjs
var ChannelKick = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			target: {},
			reason: {
				trailing: true,
				optional: true
			}
		});
	}
};
ChannelKick.COMMAND = "KICK";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Time.mjs
var Time = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { server: { optional: true } });
	}
};
Time.COMMAND = "TIME";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/PrivateMessage.mjs
var PrivateMessage = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			text: { trailing: true }
		});
	}
};
PrivateMessage.COMMAND = "PRIVMSG";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Notice.mjs
var Notice = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			text: { trailing: true }
		});
	}
};
Notice.COMMAND = "NOTICE";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/WhoQuery.mjs
var WhoQuery = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			mask: {},
			flags: { optional: true },
			extendedMask: {
				optional: true,
				trailing: true
			}
		});
	}
};
WhoQuery.COMMAND = "WHO";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/WhoIsQuery.mjs
var WhoIsQuery = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			server: { optional: true },
			nickMask: {}
		});
	}
};
WhoIsQuery.COMMAND = "WHOIS";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/WhoWasQuery.mjs
var WhoWasQuery = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			nick: {},
			count: { optional: true },
			server: { optional: true }
		});
	}
};
WhoWasQuery.COMMAND = "WHOWAS";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Kill.mjs
var Kill = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			reason: {
				trailing: true,
				optional: true
			}
		});
	}
};
Kill.COMMAND = "KILL";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Ping.mjs
var Ping = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { text: { trailing: true } });
	}
};
Ping.COMMAND = "PING";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Pong.mjs
var Pong = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			server: { noClient: true },
			text: { trailing: true }
		});
	}
};
Pong.COMMAND = "PONG";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/ErrorMessage.mjs
var ErrorMessage = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { text: { trailing: true } });
	}
};
ErrorMessage.COMMAND = "ERROR";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Away.mjs
var Away = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { text: {
			trailing: true,
			optional: true
		} });
	}
};
Away.COMMAND = "AWAY";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Rehash.mjs
var Rehash = class extends Message {};
Rehash.COMMAND = "REHASH";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/Restart.mjs
var Restart = class extends Message {};
Restart.COMMAND = "RESTART";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/WallopsMessage.mjs
var WallopsMessage = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { text: { trailing: true } });
	}
};
WallopsMessage.COMMAND = "WALLOPS";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/UserHostQuery.mjs
var UserHostQuery = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { nicks: { rest: true } });
	}
};
UserHostQuery.COMMAND = "USERHOST";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/IsOnQuery.mjs
var IsOnQuery = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { nicks: { rest: true } });
	}
};
IsOnQuery.COMMAND = "ISON";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/CapabilityNegotiation.mjs
var CapabilityNegotiation = class CapabilityNegotiation extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {
				match: /^(?:[a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]+|\*)$/i,
				optional: true,
				noClient: true
			},
			subCommand: { match: /^(?:LS|LIST|REQ|ACK|NAK|END|NEW|DEL)$/i },
			version: {
				match: /^\d+$/,
				optional: true
			},
			continued: {
				match: /^\*$/,
				optional: true
			},
			capabilities: {
				trailing: true,
				optional: true
			}
		});
	}
	isResponseTo(originalMessage) {
		if (!(originalMessage instanceof CapabilityNegotiation)) return false;
		switch (this.subCommand) {
			case "ACK":
			case "NAK": return originalMessage.subCommand === "REQ" && originalMessage.capabilities === this.capabilities.trim();
			case "LS":
			case "LIST": return originalMessage.subCommand === this.subCommand;
			default: return false;
		}
	}
	endsResponseTo(originalMessage) {
		if (!(originalMessage instanceof CapabilityNegotiation)) return false;
		switch (this.subCommand) {
			case "LS":
			case "LIST": return !this.continued;
			default: return true;
		}
	}
};
CapabilityNegotiation.COMMAND = "CAP";
CapabilityNegotiation.SUPPORTS_CAPTURE = true;
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/TagMessage.mjs
var TagMessage = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, { target: {} });
	}
};
TagMessage.COMMAND = "TAGMSG";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Commands/index.mjs
var Commands_exports = /* @__PURE__ */ __exportAll({
	Away: () => Away,
	CapabilityNegotiation: () => CapabilityNegotiation,
	ChannelInvite: () => ChannelInvite,
	ChannelJoin: () => ChannelJoin,
	ChannelKick: () => ChannelKick,
	ChannelList: () => ChannelList,
	ChannelPart: () => ChannelPart,
	ClientQuit: () => ClientQuit,
	ErrorMessage: () => ErrorMessage,
	IsOnQuery: () => IsOnQuery,
	Kill: () => Kill,
	Mode: () => Mode,
	Names: () => Names,
	NickChange: () => NickChange,
	Notice: () => Notice,
	OperLogin: () => OperLogin,
	Password: () => Password,
	Ping: () => Ping,
	Pong: () => Pong,
	PrivateMessage: () => PrivateMessage,
	Rehash: () => Rehash,
	Restart: () => Restart,
	ServerQuit: () => ServerQuit,
	TagMessage: () => TagMessage,
	Time: () => Time,
	Topic: () => Topic,
	UserHostQuery: () => UserHostQuery,
	UserRegistration: () => UserRegistration,
	Wallops: () => WallopsMessage,
	WhoIsQuery: () => WhoIsQuery,
	WhoQuery: () => WhoQuery,
	WhoWasQuery: () => WhoWasQuery
});
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply001Welcome.mjs
var Reply001Welcome = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			welcomeText: { trailing: true }
		});
	}
};
Reply001Welcome.COMMAND = "001";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply002YourHost.mjs
var Reply002YourHost = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			yourHost: { trailing: true }
		});
	}
};
Reply002YourHost.COMMAND = "002";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply003Created.mjs
var Reply003Created = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			createdText: { trailing: true }
		});
	}
};
Reply003Created.COMMAND = "003";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply004ServerInfo.mjs
var Reply004ServerInfo = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			serverName: {},
			version: {},
			userModes: {},
			channelModes: {},
			channelModesWithParam: { optional: true }
		});
	}
};
Reply004ServerInfo.COMMAND = "004";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply005Isupport.mjs
var Reply005Isupport = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			supports: { rest: true },
			suffix: { trailing: true }
		});
	}
};
Reply005Isupport.COMMAND = "005";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply221UmodeIs.mjs
var Reply221UmodeIs = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			modes: {}
		});
	}
};
Reply221UmodeIs.COMMAND = "221";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply301Away.mjs
var Reply301Away = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			text: { trailing: true }
		});
	}
};
Reply301Away.COMMAND = "301";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply302UserHost.mjs
var Reply302UserHost = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			hosts: { trailing: true }
		});
	}
};
Reply302UserHost.COMMAND = "302";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply305UnAway.mjs
var Reply305UnAway = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Reply305UnAway.COMMAND = "305";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply306NowAway.mjs
var Reply306NowAway = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Reply306NowAway.COMMAND = "306";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply311WhoisUser.mjs
var Reply311WhoisUser = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			username: {},
			host: {},
			_unused: {},
			realname: { trailing: true }
		});
	}
};
Reply311WhoisUser.COMMAND = "311";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply315EndOfWho.mjs
var Reply315EndOfWho = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			query: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage instanceof WhoQuery;
	}
	endsResponseTo() {
		return true;
	}
};
Reply315EndOfWho.COMMAND = "315";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply318EndOfWhois.mjs
var Reply318EndOfWhois = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nickMask: {},
			suffix: { trailing: true }
		});
	}
};
Reply318EndOfWhois.COMMAND = "318";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply319WhoisChannels.mjs
var Reply319WhoisChannels = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			channels: { trailing: true }
		});
	}
};
Reply319WhoisChannels.COMMAND = "319";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply322List.mjs
var Reply322List = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			memberCount: {},
			topic: { trailing: true }
		});
	}
};
Reply322List.COMMAND = "322";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply323ListEnd.mjs
var Reply323ListEnd = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Reply323ListEnd.COMMAND = "323";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply324ChannelModeIs.mjs
var Reply324ChannelModeIs = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			modes: { rest: true }
		});
	}
};
Reply324ChannelModeIs.COMMAND = "324";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply331NoTopic.mjs
var Reply331NoTopic = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Reply331NoTopic.COMMAND = "331";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply332Topic.mjs
var Reply332Topic = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			topic: { trailing: true }
		});
	}
};
Reply332Topic.COMMAND = "332";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply333TopicWhoTime.mjs
var Reply333TopicWhoTime = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			who: {},
			ts: {}
		});
	}
};
Reply333TopicWhoTime.COMMAND = "333";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply341Inviting.mjs
var Reply341Inviting = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			channel: { type: "channel" }
		});
	}
};
Reply341Inviting.COMMAND = "341";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply348ExceptList.mjs
var Reply348ExceptList = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			mask: {},
			creatorName: { optional: true },
			timestamp: { optional: true }
		});
	}
};
Reply348ExceptList.COMMAND = "348";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply349EndOfExceptList.mjs
var Reply349EndOfExceptList = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Reply349EndOfExceptList.COMMAND = "349";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply352WhoReply.mjs
var Reply352WhoReply = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: {},
			user: {},
			host: {},
			server: {},
			nick: {},
			flags: {},
			hopsAndRealName: { trailing: true }
		});
	}
	/**
	* Checks whether the found user is /away.
	*/
	get isAway() {
		return this.flags.includes("G");
	}
	/**
	* Checks whether the found user is an IRCOp.
	*/
	get isOper() {
		return this.flags.includes("*");
	}
	/**
	* Checks whether the found user is a bot.
	*/
	get isBot() {
		return this.flags.includes("B");
	}
	isResponseTo(originalMessage) {
		return originalMessage instanceof WhoQuery;
	}
};
Reply352WhoReply.COMMAND = "352";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply353NamesReply.mjs
var Reply353NamesReply = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channelType: {},
			channel: { type: "channel" },
			names: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage instanceof Names;
	}
};
Reply353NamesReply.COMMAND = "353";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply366EndOfNames.mjs
var Reply366EndOfNames = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage instanceof Names;
	}
	endsResponseTo() {
		return true;
	}
};
Reply366EndOfNames.COMMAND = "366";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply367BanList.mjs
var Reply367BanList = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			mask: {},
			creatorName: { optional: true },
			timestamp: { optional: true }
		});
	}
};
Reply367BanList.COMMAND = "367";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply368EndOfBanList.mjs
var Reply368EndOfBanList = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Reply368EndOfBanList.COMMAND = "368";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply372Motd.mjs
var Reply372Motd = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			line: { trailing: true }
		});
	}
};
Reply372Motd.COMMAND = "372";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply375MotdStart.mjs
var Reply375MotdStart = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			line: { trailing: true }
		});
	}
};
Reply375MotdStart.COMMAND = "375";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply376EndOfMotd.mjs
var Reply376EndOfMotd = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Reply376EndOfMotd.COMMAND = "376";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply381YoureOper.mjs
var Reply381YoureOper = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Reply381YoureOper.COMMAND = "381";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Reply391Time.mjs
var Reply391Time = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			server: { optional: true },
			timestamp: { trailing: true }
		});
	}
};
Reply391Time.COMMAND = "391";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error401NoSuchNick.mjs
var Error401NoSuchNick = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			suffix: { trailing: true }
		});
	}
};
Error401NoSuchNick.COMMAND = "401";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error402NoSuchServer.mjs
var Error402NoSuchServer = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			server: {},
			suffix: { trailing: true }
		});
	}
};
Error402NoSuchServer.COMMAND = "402";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error403NoSuchChannel.mjs
var Error403NoSuchChannel = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: {},
			suffix: { trailing: true }
		});
	}
};
Error403NoSuchChannel.COMMAND = "403";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error404CanNotSendToChan.mjs
var Error404CanNotSendToChan = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error404CanNotSendToChan.COMMAND = "404";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error405TooManyChannels.mjs
var Error405TooManyChannels = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error405TooManyChannels.COMMAND = "405";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error410InvalidCapCmd.mjs
var Error410InvalidCapCmd = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			subCommand: {},
			suffix: { trailing: true }
		});
	}
};
Error410InvalidCapCmd.COMMAND = "410";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error421UnknownCommand.mjs
var Error421UnknownCommand = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			originalCommand: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === this.originalCommand;
	}
	endsResponseTo() {
		return true;
	}
};
Error421UnknownCommand.COMMAND = "421";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error422NoMotd.mjs
var Error422NoMotd = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error422NoMotd.COMMAND = "422";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error431NoNickNameGiven.mjs
var Error431NoNickNameGiven = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error431NoNickNameGiven.COMMAND = "431";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error432ErroneusNickname.mjs
var Error432ErroneusNickname = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error432ErroneusNickname.COMMAND = "432";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error433NickNameInUse.mjs
var Error433NickNameInUse = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error433NickNameInUse.COMMAND = "433";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error436NickCollision.mjs
var Error436NickCollision = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error436NickCollision.COMMAND = "436";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error441UserNotInChannel.mjs
var Error441UserNotInChannel = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error441UserNotInChannel.COMMAND = "441";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error442NotOnChannel.mjs
var Error442NotOnChannel = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error442NotOnChannel.COMMAND = "442";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error443UserOnChannel.mjs
var Error443UserOnChannel = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			nick: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
	isResponseTo(originalMessage) {
		return originalMessage.command === "NICK";
	}
	endsResponseTo() {
		return true;
	}
};
Error443UserOnChannel.COMMAND = "443";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error451NotRegistered.mjs
var Error451NotRegistered = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error451NotRegistered.COMMAND = "451";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error461NeedMoreParams.mjs
var Error461NeedMoreParams = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			originalCommand: {},
			suffix: { trailing: true }
		});
	}
};
Error461NeedMoreParams.COMMAND = "461";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error462AlreadyRegistered.mjs
var Error462AlreadyRegistered = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error462AlreadyRegistered.COMMAND = "462";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error471ChannelIsFull.mjs
var Error471ChannelIsFull = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error471ChannelIsFull.COMMAND = "471";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error472UnknownMode.mjs
var Error472UnknownMode = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			char: {},
			suffix: { trailing: true }
		});
	}
};
Error472UnknownMode.COMMAND = "472";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error473InviteOnlyChan.mjs
var Error473InviteOnlyChan = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error473InviteOnlyChan.COMMAND = "473";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error474BannedFromChan.mjs
var Error474BannedFromChan = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error474BannedFromChan.COMMAND = "474";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error475BadChannelKey.mjs
var Error475BadChannelKey = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: { type: "channel" },
			suffix: { trailing: true }
		});
	}
};
Error475BadChannelKey.COMMAND = "475";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error479BadChanName.mjs
var Error479BadChanName = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: {},
			suffix: { trailing: true }
		});
	}
};
Error479BadChanName.COMMAND = "479";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error481NoPrivileges.mjs
var Error481NoPrivileges = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error481NoPrivileges.COMMAND = "481";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error482ChanOpPrivsNeeded.mjs
var Error482ChanOpPrivsNeeded = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			channel: {},
			suffix: { trailing: true }
		});
	}
};
Error482ChanOpPrivsNeeded.COMMAND = "482";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error491NoOperHost.mjs
var Error491NoOperHost = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error491NoOperHost.COMMAND = "491";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error501UmodeUnknownFlag.mjs
var Error501UmodeUnknownFlag = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			modeChar: {
				optional: true,
				match: /^\w$/
			},
			suffix: { trailing: true }
		});
	}
};
Error501UmodeUnknownFlag.COMMAND = "501";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/Error502UsersDontMatch.mjs
var Error502UsersDontMatch = class extends Message {
	constructor(command, contents, config) {
		super(command, contents, config, {
			me: {},
			suffix: { trailing: true }
		});
	}
};
Error502UsersDontMatch.COMMAND = "502";
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/Numerics/index.mjs
var Numerics_exports = /* @__PURE__ */ __exportAll({
	Error401NoSuchNick: () => Error401NoSuchNick,
	Error402NoSuchServer: () => Error402NoSuchServer,
	Error403NoSuchChannel: () => Error403NoSuchChannel,
	Error404CanNotSendToChan: () => Error404CanNotSendToChan,
	Error405TooManyChannels: () => Error405TooManyChannels,
	Error410InvalidCapCmd: () => Error410InvalidCapCmd,
	Error421UnknownCommand: () => Error421UnknownCommand,
	Error422NoMotd: () => Error422NoMotd,
	Error431NoNickNameGiven: () => Error431NoNickNameGiven,
	Error432ErroneusNickname: () => Error432ErroneusNickname,
	Error433NickNameInUse: () => Error433NickNameInUse,
	Error436NickCollision: () => Error436NickCollision,
	Error441UserNotInChannel: () => Error441UserNotInChannel,
	Error442NotOnChannel: () => Error442NotOnChannel,
	Error443UserOnChannel: () => Error443UserOnChannel,
	Error451NotRegistered: () => Error451NotRegistered,
	Error461NeedMoreParams: () => Error461NeedMoreParams,
	Error462AlreadyRegistered: () => Error462AlreadyRegistered,
	Error471ChannelIsFull: () => Error471ChannelIsFull,
	Error472UnknownMode: () => Error472UnknownMode,
	Error473InviteOnlyChan: () => Error473InviteOnlyChan,
	Error474BannedFromChan: () => Error474BannedFromChan,
	Error475BadChannelKey: () => Error475BadChannelKey,
	Error479BadChanName: () => Error479BadChanName,
	Error481NoPrivileges: () => Error481NoPrivileges,
	Error482ChanOpPrivsNeeded: () => Error482ChanOpPrivsNeeded,
	Error491NoOperHost: () => Error491NoOperHost,
	Error501UmodeUnknownFlag: () => Error501UmodeUnknownFlag,
	Error502UsersDontMatch: () => Error502UsersDontMatch,
	Reply001Welcome: () => Reply001Welcome,
	Reply002YourHost: () => Reply002YourHost,
	Reply003Created: () => Reply003Created,
	Reply004ServerInfo: () => Reply004ServerInfo,
	Reply005Isupport: () => Reply005Isupport,
	Reply221UmodeIs: () => Reply221UmodeIs,
	Reply301Away: () => Reply301Away,
	Reply302UserHost: () => Reply302UserHost,
	Reply305UnAway: () => Reply305UnAway,
	Reply306NowAway: () => Reply306NowAway,
	Reply311WhoisUser: () => Reply311WhoisUser,
	Reply315EndOfWho: () => Reply315EndOfWho,
	Reply318EndOfWhois: () => Reply318EndOfWhois,
	Reply319WhoisChannels: () => Reply319WhoisChannels,
	Reply322List: () => Reply322List,
	Reply323ListEnd: () => Reply323ListEnd,
	Reply324ChannelModeIs: () => Reply324ChannelModeIs,
	Reply331NoTopic: () => Reply331NoTopic,
	Reply332Topic: () => Reply332Topic,
	Reply333TopicWhoTime: () => Reply333TopicWhoTime,
	Reply341Inviting: () => Reply341Inviting,
	Reply348ExceptList: () => Reply348ExceptList,
	Reply349EndOfExceptList: () => Reply349EndOfExceptList,
	Reply352WhoReply: () => Reply352WhoReply,
	Reply353NamesReply: () => Reply353NamesReply,
	Reply366EndOfNames: () => Reply366EndOfNames,
	Reply367BanList: () => Reply367BanList,
	Reply368EndOfBanList: () => Reply368EndOfBanList,
	Reply372Motd: () => Reply372Motd,
	Reply375MotdStart: () => Reply375MotdStart,
	Reply376EndOfMotd: () => Reply376EndOfMotd,
	Reply381YoureOper: () => Reply381YoureOper,
	Reply391Time: () => Reply391Time
});
//#endregion
//#region node_modules/ircv3/es/Message/MessageTypes/index.mjs
const all = new Map([...Object.values(Commands_exports), ...Object.values(Numerics_exports)].map((cmd) => [cmd.COMMAND, cmd]));
//#endregion
//#region node_modules/ircv3/es/Message/MessageParser.mjs
function parsePrefix(raw) {
	const [nick, hostName] = splitWithLimit(raw, "!", 2);
	if (hostName) {
		const [user, host] = splitWithLimit(hostName, "@", 2);
		if (host) return {
			nick,
			user,
			host
		};
		return {
			nick,
			host: user
		};
	}
	return { nick };
}
const tagUnescapeMap = {
	":": ";",
	n: "\n",
	r: "\r",
	s: " "
};
function parseTags(raw) {
	const tags = /* @__PURE__ */ new Map();
	const tagStrings = raw.split(";");
	for (const tagString of tagStrings) {
		const [tagName, tagValue] = splitWithLimit(tagString, "=", 2);
		if (tagName === "") continue;
		tags.set(tagName, tagValue ? tagValue.replace(/\\(.?)/g, (_, match) => Object.prototype.hasOwnProperty.call(tagUnescapeMap, match) ? tagUnescapeMap[match] : match) : "");
	}
	return tags;
}
function parseMessage(rawLine, serverProperties = defaultServerProperties, knownCommands = all, isServer = false, nonConformingCommands = [], shouldParseParams = true) {
	const splitLine = rawLine.split(" ");
	let token;
	let command;
	const params = [];
	let tags = void 0;
	let prefix;
	while (splitLine.length) {
		[token] = splitLine;
		if (token.startsWith("@") && !tags && !command && !prefix) tags = parseTags(token.slice(1));
		else if (token.startsWith(":")) if (!prefix && !command) {
			if (token.length > 1) prefix = parsePrefix(token.slice(1));
		} else {
			params.push({
				value: splitLine.join(" ").slice(1),
				trailing: true
			});
			break;
		}
		else if (command) params.push({
			value: token,
			trailing: false
		});
		else command = token.toUpperCase();
		splitLine.shift();
	}
	tags || (tags = /* @__PURE__ */ new Map());
	if (!command) throw new Error(`line without command received: ${rawLine}`);
	shouldParseParams && (shouldParseParams = !nonConformingCommands.includes(command));
	let messageClass = Message;
	if (knownCommands.has(command)) messageClass = knownCommands.get(command);
	return new messageClass(command, {
		params,
		tags,
		prefix,
		rawLine
	}, {
		serverProperties,
		isServer,
		shouldParseParams
	});
}
//#endregion
//#region node_modules/ircv3/es/IrcClient.mjs
init_tslib_es6();
var IrcClient = class extends EventEmitter {
	constructor(options) {
		super();
		this._registered = false;
		this._supportsCapabilities = true;
		this._events = /* @__PURE__ */ new Map();
		this._registeredMessageTypes = /* @__PURE__ */ new Map();
		/**
		* @eventListener
		*/
		this.onConnect = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onRegister = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onDisconnect = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onPrivmsg = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onAction = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onNotice = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onNickChange = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onCtcp = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onCtcpReply = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onPasswordError = this.registerEvent();
		/**
		* @eventListener
		*/
		this.onAnyMessage = this.registerEvent();
		this._serverProperties = klona(defaultServerProperties);
		this._supportedFeatures = {};
		this._collectors = [];
		this._clientCapabilities = /* @__PURE__ */ new Map();
		this._serverCapabilities = /* @__PURE__ */ new Map();
		this._negotiatedCapabilities = /* @__PURE__ */ new Map();
		this._currentChannels = /* @__PURE__ */ new Set();
		this._hasRegisteredBefore = false;
		this._channelsFromLastRegister = /* @__PURE__ */ new Set();
		this._initialConnectionSetupDone = false;
		const { connection, credentials, channels, channelTypes, webSocket, logger = {} } = options;
		this._options = options;
		const { pingOnInactivity = 60, pingTimeout = 10 } = connection;
		this._pingOnInactivity = pingOnInactivity;
		this._pingTimeout = pingTimeout;
		this._currentNick = credentials.nick;
		this._logger = createLogger$1({
			name: "ircv3",
			emoji: true,
			...logger
		});
		this.registerCoreMessageTypes();
		const { hostName, secure, reconnect = true } = connection;
		const connectionTarget = {
			hostName,
			port: this.port,
			secure
		};
		const connectionOptions = {
			lineBased: true,
			logger: this._logger,
			additionalOptions: options.connectionOptions
		};
		const ConnectionType = webSocket ? WebSocketConnection : DirectConnection;
		if (reconnect) this._connection = new PersistentConnection(ConnectionType, connectionTarget, connectionOptions);
		else this._connection = new ConnectionType(connectionOptions, this._logger, options.connectionOptions);
		for (const cap of Object.values(CoreCapabilities_exports)) this.addCapability(cap);
		this.addInternalListener(this.onRegister, async () => {
			const hasRegisteredBefore = this._hasRegisteredBefore;
			const channelsFromLastRegister = this._channelsFromLastRegister;
			this._hasRegisteredBefore = true;
			this._channelsFromLastRegister = /* @__PURE__ */ new Set();
			const resolvedChannels = hasRegisteredBefore && this._options.rejoinChannelsOnReconnect ? channelsFromLastRegister : await resolveConfigValue(channels);
			if (resolvedChannels) for (const channel of resolvedChannels) this.join(channel);
		});
		this.onTypedMessage(CapabilityNegotiation, async ({ subCommand, capabilities }) => {
			const caps = capabilities.split(" ");
			switch (subCommand.toUpperCase()) {
				case "NEW": {
					this._logger.debug(`Server registered new capabilities: ${caps.join(", ")}`);
					const capList = arrayToObject(caps, (part) => {
						if (!part) return {};
						const [cap, param] = splitWithLimit(part, "=", 2);
						return { [cap]: {
							name: cap,
							param: param || true
						} };
					});
					for (const [name, cap] of Object.entries(capList)) this._serverCapabilities.set(name, cap);
					const capNames = Object.keys(capList);
					await this._negotiateCapabilities(Array.from(this._clientCapabilities.entries()).filter(([name]) => capNames.includes(name)).map(([, cap]) => cap));
					break;
				}
				case "DEL":
					this._logger.debug(`Server removed capabilities: ${caps.join(", ")}`);
					for (const cap of caps) {
						this._serverCapabilities.delete(cap);
						this._negotiatedCapabilities.delete(cap);
					}
			}
		});
		this.onTypedMessage(Ping, ({ text }) => {
			this.sendMessage(Pong, { text });
		});
		this.onTypedMessage(Reply001Welcome, ({ me }) => this._handleReceivedClientNick(me));
		this.onTypedMessage(Reply004ServerInfo, ({ userModes }) => {
			if (userModes) this._serverProperties.supportedUserModes = userModes;
		});
		this.onTypedMessage(Reply005Isupport, ({ supports }) => {
			const newFeatures = arrayToObject(supports.split(" "), (part) => {
				const [support, param] = splitWithLimit(part, "=", 2);
				return { [support]: param || true };
			});
			this._supportedFeatures = {
				...this._supportedFeatures,
				...newFeatures
			};
		});
		this.onTypedMessage(Reply376EndOfMotd, ({ me }) => {
			if (!this._registered) {
				this._handleReceivedClientNick(me);
				this._registered = true;
				this.emit(this.onRegister);
			}
		});
		this.onTypedMessage(Error422NoMotd, ({ me }) => {
			if (!this._registered) {
				this._handleReceivedClientNick(me);
				this._registered = true;
				this.emit(this.onRegister);
			}
		});
		this.onTypedMessage(Error462AlreadyRegistered, ({ me }) => {
			if (!this._registered) {
				this._logger.warn("We thought we're not registered yet, but we actually are");
				this._handleReceivedClientNick(me);
				this._registered = true;
				this.emit(this.onRegister);
			}
		});
		this.onTypedMessage(PrivateMessage, (msg) => {
			var _a;
			const { target, text } = msg;
			const ctcpMessage = decodeCtcp(text);
			const nick = (_a = msg.prefix) === null || _a === void 0 ? void 0 : _a.nick;
			if (ctcpMessage) if (ctcpMessage.command === "ACTION") this.emit(this.onAction, target, nick, ctcpMessage.params, msg);
			else this.emit(this.onCtcp, target, nick, ctcpMessage.command, ctcpMessage.params, msg);
			else this.emit(this.onPrivmsg, target, nick, text, msg);
		});
		this.onTypedMessage(NickChange, (msg) => {
			var _a;
			const { nick: newNick } = msg;
			const oldNick = (_a = msg.prefix) === null || _a === void 0 ? void 0 : _a.nick;
			if (oldNick === this._currentNick) this._currentNick = newNick;
			this.emit(this.onNickChange, oldNick, newNick, msg);
		});
		this.onTypedMessage(Notice, (msg) => {
			var _a;
			const { target, text } = msg;
			const ctcpMessage = decodeCtcp(text);
			const nick = (_a = msg.prefix) === null || _a === void 0 ? void 0 : _a.nick;
			if (ctcpMessage) this.emit(this.onCtcpReply, target, nick, ctcpMessage.command, ctcpMessage.params, msg);
			this.emit(this.onNotice, target, nick, text, msg);
		});
		if (!this._options.manuallyAcknowledgeJoins) this.onTypedMessage(ChannelJoin, ({ channel, prefix }) => {
			if ((prefix === null || prefix === void 0 ? void 0 : prefix.nick) === this._currentNick) this.acknowledgeJoin(channel);
		});
		this.onTypedMessage(ChannelPart, (msg) => {
			var _a;
			if (((_a = msg.prefix) === null || _a === void 0 ? void 0 : _a.nick) === this._currentNick) {
				this._currentChannels.delete(msg.channel);
				this._channelsFromLastRegister.delete(msg.channel);
			}
		});
		this.addInternalListener(this.onRegister, () => this._startPingCheckTimer());
		this._desiredNick = credentials.nick;
		this._userName = credentials.userName;
		this._realName = credentials.realName;
		if (channelTypes) this._serverProperties.channelTypes = channelTypes;
	}
	receiveLine(line) {
		var _a;
		this._logger.debug(`Received message: ${line}`);
		let parsedMessage;
		try {
			parsedMessage = parseMessage(line, this._serverProperties, this._registeredMessageTypes, true, this._options.nonConformingCommands);
		} catch (e) {
			this._logger.error(`Error parsing message: ${e.message}`);
			this._logger.trace((_a = e.stack) !== null && _a !== void 0 ? _a : "No stack available");
			return;
		}
		this._logger.trace(`Parsed message: ${JSON.stringify(parsedMessage)}`);
		this._startPingCheckTimer();
		this.emit(this.onAnyMessage, parsedMessage);
		this._handleEvents(parsedMessage);
	}
	get serverProperties() {
		return klona(this._serverProperties);
	}
	get port() {
		const { webSocket, connection: { port, secure } } = this._options;
		if (port) return port;
		if (webSocket) return secure ? 443 : 80;
		return secure ? 6697 : 6667;
	}
	pingCheck() {
		const now = Date.now();
		const nowStr = now.toString();
		const handler = this.onTypedMessage(Pong, (msg) => {
			const { text } = msg;
			if (text === nowStr) {
				this._logger.debug(`Current ping: ${Date.now() - now}ms`);
				if (this._pingTimeoutTimer) clearTimeout(this._pingTimeoutTimer);
				this.removeMessageListener(handler);
			}
		});
		this._pingTimeoutTimer = setTimeout(() => {
			this.removeMessageListener(handler);
			if (this._options.connection.reconnect === false) this._logger.error(`Disconnecting because the last ping took over ${this._pingTimeout} seconds`);
			else this._logger.warn(`Reconnecting because the last ping took over ${this._pingTimeout} seconds`);
			this._connection.assumeExternalDisconnect();
		}, this._pingTimeout * 1e3);
		this.sendMessage(Ping, { text: nowStr });
	}
	reconnect(message) {
		this.quit(message);
		this.connect();
	}
	registerMessageType(cls) {
		if (cls.COMMAND !== "") {
			this._logger.trace(`Registering message type ${cls.COMMAND}`);
			this._registeredMessageTypes.set(cls.COMMAND.toUpperCase(), cls);
		}
	}
	knowsCommand(command) {
		return this._registeredMessageTypes.has(command.toUpperCase());
	}
	getCommandClass(command) {
		return this._registeredMessageTypes.get(command.toUpperCase());
	}
	acknowledgeJoin(channel) {
		this._currentChannels.add(channel);
		this._channelsFromLastRegister.add(channel);
	}
	connect() {
		this._supportsCapabilities = false;
		this._negotiatedCapabilities = /* @__PURE__ */ new Map();
		this._currentChannels = /* @__PURE__ */ new Set();
		this._currentNick = this._desiredNick;
		this._setupConnection();
		this._logger.info(`Connecting to ${this._options.connection.hostName}:${this.port}`);
		this._connection.connect();
	}
	addCapability(cap) {
		this._clientCapabilities.set(cap.name, cap);
		if (cap.messageTypes) for (const messageType of Object.values(cap.messageTypes)) this.registerMessageType(messageType);
	}
	async registerCapability(cap) {
		this.addCapability(cap);
		if (this._serverCapabilities.has(cap.name)) return await this._negotiateCapabilities([cap]);
		return [];
	}
	send(message) {
		this.sendRaw(message.toString());
	}
	sendRaw(line) {
		if (this._connection.isConnected) {
			this._logger.debug(`Sending message: ${line}`);
			this._connection.sendLine(line);
		}
	}
	onNamedMessage(commandName, handler, handlerName) {
		if (!this._events.has(commandName)) this._events.set(commandName, /* @__PURE__ */ new Map());
		const handlerList = this._events.get(commandName);
		if (!handlerName) do
			handlerName = `${commandName}:${padLeft(Math.random() * 1e4, 4, "0")}`;
		while (handlerList.has(handlerName));
		handlerList.set(handlerName, handler);
		return handlerName;
	}
	onTypedMessage(type, handler, handlerName) {
		return this.onNamedMessage(type.COMMAND, handler, handlerName);
	}
	removeMessageListener(handlerName) {
		const [commandName] = handlerName.split(":");
		if (!this._events.has(commandName)) return;
		this._events.get(commandName).delete(handlerName);
	}
	createMessage(type, params, tags) {
		return createMessage(type, params, void 0, tags ? new Map(Object.entries(tags)) : void 0, this.serverProperties);
	}
	sendMessage(type, params, tags) {
		this.send(this.createMessage(type, params, tags));
	}
	async sendMessageAndCaptureReply(type, params) {
		if (!type.SUPPORTS_CAPTURE) throw new Error(`The command "${type.COMMAND}" does not support reply capture`);
		const message = this.createMessage(type, params);
		const promise = this.collect(message).promise();
		this.send(message);
		return await promise;
	}
	get isConnected() {
		return this._connection.isConnected;
	}
	get isConnecting() {
		return this._connection.isConnecting;
	}
	get isRegistered() {
		return this._registered;
	}
	get currentNick() {
		return this._currentNick;
	}
	get currentChannels() {
		return Array.from(this._currentChannels);
	}
	/** @private */
	collect(originalMessage, ...types) {
		const collector = new MessageCollector(this, originalMessage, ...types);
		this._collectors.push(collector);
		return collector;
	}
	/** @private */
	stopCollect(collector) {
		this._collectors.splice(this._collectors.findIndex((value) => value === collector), 1);
	}
	join(channel, key) {
		this.sendMessage(ChannelJoin, {
			channel,
			key
		});
	}
	part(channel) {
		this.sendMessage(ChannelPart, { channel });
	}
	quit(text) {
		this.sendMessage(ClientQuit, { text });
		this.quitAbruptly();
	}
	quitAbruptly() {
		this._registered = false;
		this._connection.disconnect();
	}
	say(target, text, tags = {}) {
		this.sendMessage(PrivateMessage, {
			target,
			text
		}, tags);
	}
	sendCtcp(target, type, message) {
		this.say(target, `\x01${type.toUpperCase()} ${message}\x01`);
	}
	action(target, message) {
		this.sendCtcp(target, "ACTION", message);
	}
	changeNick(newNick) {
		if (this._currentNick === newNick) return;
		this._desiredNick = newNick;
		if (this.isRegistered) this.sendMessage(NickChange, { nick: newNick });
	}
	registerCoreMessageTypes() {
		forEachObjectEntry(Commands_exports, (type) => {
			this.registerMessageType(type);
		});
		forEachObjectEntry(Numerics_exports, (type) => {
			this.registerMessageType(type);
		});
	}
	async _negotiateCapabilityBatch(capabilities) {
		return await Promise.all(capabilities.filter((list) => list.length).map(async (capList) => await this._negotiateCapabilities(capList)));
	}
	async _negotiateCapabilities(capList) {
		const mappedCapList = arrayToObject(capList, (cap) => ({ [cap.name]: cap }));
		const capReply = (await this.sendMessageAndCaptureReply(CapabilityNegotiation, {
			subCommand: "REQ",
			capabilities: capList.map((cap) => cap.name).join(" ")
		})).shift();
		if (!capReply) throw new Error("capability negotiation failed unexpectedly without any reply");
		if (!(capReply instanceof CapabilityNegotiation)) throw new Error(`capability negotiation failed unexpectedly with "${capReply.command}" command`);
		const negotiatedCapNames = capReply.capabilities.split(" ").filter((c) => c);
		if (capReply.subCommand === "ACK") {
			this._logger.debug(`Successfully negotiated capabilities: ${negotiatedCapNames.join(", ")}`);
			const newNegotiatedCaps = negotiatedCapNames.map((capName) => mappedCapList[capName]);
			for (const newCap of newNegotiatedCaps) {
				const mergedCap = this._clientCapabilities.get(newCap.name);
				mergedCap.param = newCap.param;
				this._negotiatedCapabilities.set(mergedCap.name, mergedCap);
			}
			return newNegotiatedCaps;
		}
		this._logger.warn(`Failed to negotiate capabilities: ${negotiatedCapNames.join(", ")}`);
		return /* @__PURE__ */ new Error("capabilities failed to negotiate");
	}
	_setupConnection() {
		if (this._initialConnectionSetupDone) return;
		this._connection.onConnect(async () => {
			var _a, _b;
			this._logger.info(`Connection to server ${this._options.connection.hostName}:${this.port} established`);
			this.emit(this.onConnect);
			this._logger.debug("Determining connection password");
			try {
				const [password] = await Promise.all([resolveConfigValue(this._options.credentials.password), this.sendMessageAndCaptureReply(CapabilityNegotiation, {
					subCommand: "LS",
					version: "302"
				}).then(async (capReply) => {
					if (!capReply.length || !(capReply[0] instanceof CapabilityNegotiation)) {
						this._logger.debug("Server does not support capabilities");
						return [];
					}
					this._supportsCapabilities = true;
					const capLists = capReply.map((line) => arrayToObject(line.capabilities.split(" "), (part) => {
						if (!part) return {};
						const [cap, param] = splitWithLimit(part, "=", 2);
						return { [cap]: {
							name: cap,
							param: param || true
						} };
					}));
					this._serverCapabilities = new Map(Object.entries(Object.assign({}, ...capLists)));
					this._logger.debug(`Capabilities supported by server: ${Array.from(this._serverCapabilities.keys()).join(", ")}`);
					const capabilitiesToNegotiate = capLists.map((list) => {
						const capNames = Object.keys(list);
						return Array.from(this._clientCapabilities.entries()).filter(([name]) => capNames.includes(name)).map(([, cap]) => cap);
					});
					return await this._negotiateCapabilityBatch(capabilitiesToNegotiate);
				}).then(() => {
					this.sendMessage(CapabilityNegotiation, { subCommand: "END" });
				})]);
				if (password) this.sendMessage(Password, { password });
				this.sendMessage(NickChange, { nick: this._desiredNick });
				this.sendMessage(UserRegistration, {
					user: (_a = this._userName) !== null && _a !== void 0 ? _a : this._desiredNick,
					mode: "8",
					unused: "*",
					realName: (_b = this._realName) !== null && _b !== void 0 ? _b : this._desiredNick
				});
			} catch (e) {
				this.emit(this.onPasswordError, e);
				this.quit();
			}
		});
		this._initialConnectionSetupDone = true;
		this._connection.onReceive((line) => {
			this.receiveLine(line);
		});
		this._connection.onDisconnect((manually, reason) => {
			var _a;
			this._registered = false;
			if (this._pingCheckTimer) clearTimeout(this._pingCheckTimer);
			if (this._pingTimeoutTimer) clearTimeout(this._pingTimeoutTimer);
			if (manually) this._logger.info("Disconnected");
			else {
				const willReconnect = (_a = this._options.connection.reconnect) !== null && _a !== void 0 ? _a : true;
				const message = reason ? `Disconnected unexpectedly: ${reason.message}` : "Disconnected unexpectedly";
				if (willReconnect) this._logger.warn(`${message}; trying to reconnect`);
				else this._logger.error(message);
			}
			this.emit(this.onDisconnect, manually, reason);
		});
		this._connection.onEnd((manually) => {
			if (!manually) this._logger.warn("No further retries will be made");
		});
	}
	_handleReceivedClientNick(me) {
		if (this._currentNick !== me) {
			if (this._currentNick !== "") this._logger.warn(`Mismatching nicks: passed ${this._currentNick}, but you're actually ${me}`);
			this._currentNick = me;
		}
	}
	_handleEvents(message) {
		this._collectors.some((collector) => collector.collect(message));
		const handlers = this._events.get(message.constructor.COMMAND);
		if (!handlers) return;
		for (const handler of handlers.values()) handler(message);
	}
	_startPingCheckTimer() {
		if (this._pingCheckTimer) clearTimeout(this._pingCheckTimer);
		if (this._connection.isConnected) this._pingCheckTimer = setTimeout(() => this.pingCheck(), this._pingOnInactivity * 1e3);
		else this._pingCheckTimer = void 0;
	}
};
__decorate([Enumerable(false)], IrcClient.prototype, "_options", void 0);
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/ClearChat.js
var ClearChat = class extends Message {
	static COMMAND = "CLEARCHAT";
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			user: {
				trailing: true,
				optional: true
			}
		});
	}
	get date() {
		const timestamp = this._tags.get("tmi-sent-ts");
		return new Date(Number(timestamp));
	}
	get channelId() {
		return this._tags.get("room-id");
	}
	get targetUserId() {
		return this._tags.get("target-user-id") ?? null;
	}
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/Reconnect.js
/** @private */
var Reconnect = class extends Message {
	static COMMAND = "RECONNECT";
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/RoomState.js
var RoomState = class extends Message {
	static COMMAND = "ROOMSTATE";
	constructor(command, contents, config) {
		super(command, contents, config, { channel: { type: "channel" } });
	}
};
//#endregion
//#region node_modules/@d-fischer/cache-decorators/es/utils/createCacheKey.mjs
function createSingleCacheKey(param) {
	switch (typeof param) {
		case "undefined": return "";
		case "object": {
			if (param === null) return "";
			if ("cacheKey" in param) return param.cacheKey;
			const objKey = JSON.stringify(param);
			if (objKey !== "{}") return objKey;
		}
		default: return param.toString();
	}
}
function createCacheKey(propName, params, prefix) {
	return [propName, ...params.map(createSingleCacheKey)].join("/") + (prefix ? "/" : "");
}
//#endregion
//#region node_modules/@d-fischer/cache-decorators/es/decorators/Cacheable.mjs
const cacheSymbol = Symbol("cache");
function Cacheable(cls) {
	var _a, _b;
	return _b = class extends cls {
		constructor() {
			super(...arguments);
			this[_a] = /* @__PURE__ */ new Map();
		}
		getFromCache(cacheKey) {
			this._cleanCache();
			if (this[cacheSymbol].has(cacheKey)) {
				const entry = this[cacheSymbol].get(cacheKey);
				if (entry) return entry.value;
			}
		}
		setCache(cacheKey, value, timeInSeconds) {
			this[cacheSymbol].set(cacheKey, {
				value,
				expires: Date.now() + timeInSeconds * 1e3
			});
		}
		removeFromCache(cacheKey, prefix) {
			const internalCacheKey = this._getInternalCacheKey(cacheKey, prefix);
			if (prefix) this[cacheSymbol].forEach((val, key) => {
				if (key.startsWith(internalCacheKey)) this[cacheSymbol].delete(key);
			});
			else this[cacheSymbol].delete(internalCacheKey);
		}
		_cleanCache() {
			const now = Date.now();
			this[cacheSymbol].forEach((val, key) => {
				if (val.expires < now) this[cacheSymbol].delete(key);
			});
		}
		_getInternalCacheKey(cacheKey, prefix) {
			if (typeof cacheKey === "string") {
				let internalCacheKey = cacheKey;
				if (!internalCacheKey.endsWith("/")) internalCacheKey += "/";
				return internalCacheKey;
			} else return createCacheKey(cacheKey.shift(), cacheKey, prefix);
		}
	}, _a = cacheSymbol, _b;
}
//#endregion
//#region node_modules/@d-fischer/cache-decorators/es/decorators/CachedGetter.mjs
function CachedGetter(timeInSeconds = Infinity) {
	return function(target, propName, descriptor) {
		if (descriptor.get) {
			const origFn = descriptor.get;
			descriptor.get = function() {
				const cacheKey = createCacheKey(propName, []);
				const cachedValue = this.getFromCache(cacheKey);
				if (cachedValue) return cachedValue;
				const result = origFn.call(this);
				this.setCache(cacheKey, result, timeInSeconds);
				return result;
			};
		}
		return descriptor;
	};
}
//#endregion
//#region node_modules/@twurple/chat/lib/ChatUser.js
init_tslib_es6();
var ChatUser_1;
/**
* A user in chat.
*/
let ChatUser = ChatUser_1 = class ChatUser {
	/** @internal */ _userData;
	_userName;
	/** @internal */
	constructor(userName, userData) {
		this._userName = userName.toLowerCase();
		this._userData = userData ? new Map(userData) : /* @__PURE__ */ new Map();
	}
	static _parseBadgesLike(badgesLikeStr) {
		if (!badgesLikeStr) return /* @__PURE__ */ new Map();
		return new Map(badgesLikeStr.split(",").map((badge) => {
			const slashIndex = badge.indexOf("/");
			if (slashIndex === -1) return [badge, ""];
			return [badge.slice(0, slashIndex), badge.slice(slashIndex + 1)];
		}));
	}
	/**
	* The name of the user.
	*/
	get userName() {
		return this._userName;
	}
	/**
	* The display name of the user.
	*/
	get displayName() {
		return this._userData.get("display-name") ?? this._userName;
	}
	/**
	* The color the user chose to display in chat.
	*
	* Returns undefined if the user didn't choose a color.
	* In this case, you should generate your own color for this user and stick to it at least for one runtime.
	*/
	get color() {
		return this._userData.get("color");
	}
	/**
	* The badges of the user. Returned as a map that maps the badge category to the detail.
	*/
	get badges() {
		const badgesStr = this._userData.get("badges");
		return ChatUser_1._parseBadgesLike(badgesStr);
	}
	/**
	* The badge info of the user. Returned as a map that maps the badge category to the detail.
	*/
	get badgeInfo() {
		const badgeInfoStr = this._userData.get("badge-info");
		return ChatUser_1._parseBadgesLike(badgeInfoStr);
	}
	/**
	* The ID of the user.
	*/
	get userId() {
		return this._userData.get("user-id");
	}
	/**
	* The type of the user.
	* Possible values are undefined, 'mod', 'global_mod', 'admin' and 'staff'.
	*/
	get userType() {
		return this._userData.get("user-type");
	}
	/**
	* Whether the user is the broadcaster.
	*/
	get isBroadcaster() {
		return this.badges.has("broadcaster");
	}
	/**
	* Whether the user is subscribed to the channel.
	*/
	get isSubscriber() {
		return this.badges.has("subscriber") || this.isFounder;
	}
	/**
	* Whether the user is a Founder of the channel.
	*/
	get isFounder() {
		return this.badges.has("founder");
	}
	/**
	* Whether the user is a moderator of the channel.
	*/
	get isMod() {
		return this.badges.has("moderator") || this.isLeadMod;
	}
	/**
	* Whether the user is a lead moderator of the channel.
	*/
	get isLeadMod() {
		return this.badges.has("lead_moderator");
	}
	/**
	* Whether the user is a VIP in the channel.
	*/
	get isVip() {
		const badgeValue = this._userData.get("vip");
		return badgeValue != null && badgeValue !== "0";
	}
	/**
	* Whether the user is an artist of the channel.
	*/
	get isArtist() {
		return this.badges.has("artist-badge");
	}
};
__decorate([Enumerable(false)], ChatUser.prototype, "_userData", void 0);
__decorate([CachedGetter()], ChatUser.prototype, "badges", null);
__decorate([CachedGetter()], ChatUser.prototype, "badgeInfo", null);
ChatUser = ChatUser_1 = __decorate([Cacheable, rtfm("chat", "ChatUser", "userId")], ChatUser);
//#endregion
//#region node_modules/@twurple/chat/lib/utils/emoteUtil.js
/**
* Parses an emote offset string into a map that maps emote IDs to their position ranges.
*
* @param emotes The emote offset string.
*/
function parseEmoteOffsets(emotes) {
	if (!emotes) return /* @__PURE__ */ new Map();
	return new Map(emotes.split("/").map((emote) => {
		const [emoteId, placements] = emote.split(":", 2);
		if (!placements) return null;
		return [emoteId, placements.split(",")];
	}).filter((e) => e !== null));
}
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/UserNotice.js
var UserNotice = class extends Message {
	static COMMAND = "USERNOTICE";
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			text: {
				trailing: true,
				optional: true
			}
		});
	}
	get id() {
		return this._tags.get("id");
	}
	get date() {
		const timestamp = this._tags.get("tmi-sent-ts");
		return new Date(Number(timestamp));
	}
	get userInfo() {
		return new ChatUser(this._tags.get("login"), this._tags);
	}
	get channelId() {
		return this._tags.get("room-id") ?? null;
	}
	get emoteOffsets() {
		return parseEmoteOffsets(this._tags.get("emotes"));
	}
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/UserState.js
/** @private */
var UserState = class extends Message {
	static COMMAND = "USERSTATE";
	constructor(command, contents, config) {
		super(command, contents, config, { channel: { type: "channel" } });
	}
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/messageTypes/Whisper.js
/** @private */
var Whisper = class extends Message {
	static COMMAND = "WHISPER";
	constructor(command, contents, config) {
		super(command, contents, config, {
			target: {},
			text: { trailing: true }
		});
	}
	get userInfo() {
		return new ChatUser(this._prefix.nick, this._tags);
	}
	get emoteOffsets() {
		return parseEmoteOffsets(this._tags.get("emotes"));
	}
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchCommands/index.js
/** @internal */
const TwitchCommandsCapability = {
	name: "twitch.tv/commands",
	messageTypes: [
		ClearChat,
		Reconnect,
		RoomState,
		UserNotice,
		UserState,
		Whisper
	]
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/TwitchMembershipCapability.js
/**
* This capability just enables standard IRC commands that Twitch chose to disable by default.
* It has no message types on its own.
*
* @internal
*/
const TwitchMembershipCapability = { name: "twitch.tv/membership" };
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchTags/messageTypes/ClearMsg.js
var ClearMsg = class extends Message {
	static COMMAND = "CLEARMSG";
	constructor(command, contents, config) {
		super(command, contents, config, {
			channel: { type: "channel" },
			text: { trailing: true }
		});
	}
	get date() {
		const timestamp = this._tags.get("tmi-sent-ts");
		return new Date(Number(timestamp));
	}
	get userName() {
		return this._tags.get("login");
	}
	get channelId() {
		return this._tags.get("room-id");
	}
	get targetMessageId() {
		return this._tags.get("target-msg-id");
	}
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchTags/messageTypes/GlobalUserState.js
/**
* This command has no parameters, all information is in tags.
*
* @private
*/
var GlobalUserState = class extends Message {
	static COMMAND = "GLOBALUSERSTATE";
};
//#endregion
//#region node_modules/@twurple/chat/lib/caps/twitchTags/index.js
/**
* This capability mostly just adds tags to existing commands.
*
* @internal
*/
const TwitchTagsCapability = {
	name: "twitch.tv/tags",
	messageTypes: [GlobalUserState, ClearMsg]
};
//#endregion
//#region node_modules/@twurple/chat/lib/commands/ChatMessage.js
init_tslib_es6();
const HYPE_CHAT_LEVELS = [
	"ONE",
	"TWO",
	"THREE",
	"FOUR",
	"FIVE",
	"SIX",
	"SEVEN",
	"EIGHT",
	"NINE",
	"TEN"
];
/**
* A regular chat message.
*/
let ChatMessage = class ChatMessage extends PrivateMessage {
	/**
	* The ID of the message.
	*/
	get id() {
		return this._tags.get("id");
	}
	/**
	* The date the message was sent at.
	*/
	get date() {
		const timestamp = this._tags.get("tmi-sent-ts");
		return new Date(Number(timestamp));
	}
	/**
	* Info about the user that send the message, like their user ID and their status in the current channel.
	*/
	get userInfo() {
		return new ChatUser(this._prefix.nick, this._tags);
	}
	/**
	* The ID of the channel the message is in.
	*/
	get channelId() {
		return this._tags.get("room-id") ?? null;
	}
	/**
	* Whether the message is a cheer.
	*/
	get isCheer() {
		return this._tags.has("bits");
	}
	/**
	* Whether the message represents a redemption of a custom channel points reward.
	*/
	get isRedemption() {
		return Boolean(this._tags.get("custom-reward-id"));
	}
	/**
	* The ID of the redeemed reward, or `null` if the message does not represent a redemption.
	*/
	get rewardId() {
		return this._tags.get("custom-reward-id") || null;
	}
	/**
	* Whether the message is the first message of the chatter who sent it.
	*/
	get isFirst() {
		return this._tags.get("first-msg") === "1";
	}
	/**
	* Whether the message is sent by a returning chatter.
	*
	* Twitch defines this as a new viewer who has chatted at least twice in the last 30 days.
	*/
	get isReturningChatter() {
		return this._tags.get("returning-chatter") === "1";
	}
	/**
	* Whether the message is highlighted by using channel points.
	*/
	get isHighlight() {
		return this._tags.get("msg-id") === "highlighted-message";
	}
	/**
	* Whether the message is a reply to another message.
	*/
	get isReply() {
		return this._tags.has("reply-parent-msg-id");
	}
	/**
	* The ID of the message that this message is a reply to, or `null` if it's not a reply.
	*/
	get parentMessageId() {
		return this._tags.get("reply-parent-msg-id") ?? null;
	}
	/**
	* The text of the message that this message is a reply to, or `null` if it's not a reply.
	*/
	get parentMessageText() {
		return this._tags.get("reply-parent-msg-body") ?? null;
	}
	/**
	* The ID of the user that wrote the message that this message is a reply to, or `null` if it's not a reply.
	*/
	get parentMessageUserId() {
		return this._tags.get("reply-parent-user-id") ?? null;
	}
	/**
	* The name of the user that wrote the message that this message is a reply to, or `null` if it's not a reply.
	*/
	get parentMessageUserName() {
		return this._tags.get("reply-parent-user-login") ?? null;
	}
	/**
	* The display name of the user that wrote the message that this message is a reply to, or `null` if it's not a reply.
	*/
	get parentMessageUserDisplayName() {
		return this._tags.get("reply-parent-display-name") ?? null;
	}
	/**
	* The ID of the message that is the thread starter of this message, or `null` if it's not a reply.
	*/
	get threadMessageId() {
		return this._tags.get("reply-thread-parent-msg-id") ?? null;
	}
	/**
	* The ID of the user that wrote the thread starter message of this message, or `null` if it's not a reply.
	*/
	get threadMessageUserId() {
		return this._tags.get("reply-thread-parent-user-id") ?? null;
	}
	/**
	* The number of bits cheered with the message.
	*/
	get bits() {
		return Number(this._tags.get("bits") ?? 0);
	}
	/**
	* The offsets of emote usages in the message.
	*/
	get emoteOffsets() {
		return parseEmoteOffsets(this._tags.get("emotes"));
	}
	/**
	* Whether the message is a Hype Chat.
	*/
	get isHypeChat() {
		return this._tags.has("pinned-chat-paid-amount");
	}
	/**
	* The amount of money that was sent for Hype Chat, specified in the currency’s minor unit,
	* or `null` if the message is not a Hype Chat.
	*
	* For example, the minor units for USD is cents, so if the amount is $5.50 USD, `value` is set to 550.
	*/
	get hypeChatAmount() {
		return mapNullable(this._tags.get("pinned-chat-paid-amount"), Number);
	}
	/**
	* The number of decimal places used by the currency used for Hype Chat,
	* or `null` if the message is not a Hype Chat.
	*
	* For example, USD uses two decimal places.
	* Use this number to translate `hypeChatAmount` from minor units to major units by using the formula:
	*
	* `value / 10^decimalPlaces`
	*/
	get hypeChatDecimalPlaces() {
		return mapNullable(this._tags.get("pinned-chat-paid-exponent"), Number);
	}
	/**
	* The localized amount of money sent for Hype Chat, based on the value and the decimal places of the currency,
	* or `null` if the message is not a Hype Chat.
	*
	* For example, the minor units for USD is cents which uses two decimal places,
	* so if `value` is 550, `localizedValue` is set to 5.50.
	*/
	get hypeChatLocalizedAmount() {
		const amount = this.hypeChatAmount;
		if (!amount) return null;
		return amount / 10 ** this.hypeChatDecimalPlaces;
	}
	/**
	* The ISO-4217 three-letter currency code that identifies the currency used for Hype Chat,
	* or `null` if the message is not a Hype Chat.
	*/
	get hypeChatCurrency() {
		return this._tags.get("pinned-chat-paid-currency") ?? null;
	}
	/**
	* The level of the Hype Chat, or `null` if the message is not a Hype Chat.
	*/
	get hypeChatLevel() {
		const levelString = this._tags.get("pinned-chat-paid-level");
		if (!levelString) return null;
		return HYPE_CHAT_LEVELS.indexOf(levelString) + 1;
	}
	/**
	* Whether the system filled in the message for the Hype Chat (because the user didn't type one),
	* or `null` if the message is not a Hype Chat.
	*/
	get hypeChatIsSystemMessage() {
		const flagString = this._tags.get("pinned-chat-paid-is-system-message");
		if (!flagString) return null;
		return Boolean(Number(flagString));
	}
};
ChatMessage = __decorate([rtfm("chat", "ChatMessage", "id")], ChatMessage);
//#endregion
//#region node_modules/@twurple/chat/lib/ChatMessageAttributes.js
/** @private */
function extractMessageId(message) {
	return message instanceof ChatMessage ? message.tags.get("id") : message;
}
//#endregion
//#region node_modules/@twurple/chat/lib/utils/messageUtil.js
function splitOnSpaces(text, maxMsgLength) {
	if (text.length <= maxMsgLength) return [text];
	text = text.trim();
	const res = [];
	let startIndex = 0;
	let endIndex = maxMsgLength;
	while (startIndex < text.length) {
		let spaceIndex = text.lastIndexOf(" ", endIndex);
		if (spaceIndex === -1 || spaceIndex <= startIndex || text.length - startIndex + 1 <= maxMsgLength) spaceIndex = startIndex + maxMsgLength;
		const textSlice = text.slice(startIndex, spaceIndex).trim();
		if (textSlice.length) res.push(textSlice);
		startIndex = spaceIndex + (text[spaceIndex] === " " ? 1 : 0);
		endIndex = startIndex + maxMsgLength;
	}
	return res;
}
//#endregion
//#region node_modules/@twurple/chat/lib/utils/userUtil.js
const validNames = /^[a-z0-9][a-z0-9_]{0,24}$/;
/**
* Converts a chat-compatible channel name to an API-compatible username.
*
* @param channel The name of the channel.
*/
function toUserName(channel) {
	const name = channel.replace(/^#/, "").toLowerCase();
	if (!validNames.test(name)) throw new Error(`"${name}" is not a valid user or channel name. It must be at most 25 characters long, can only include letters, numbers and underscores, and can not start with an underscore.`);
	return name;
}
/**
* Converts an API-compatible username to a chat-compatible channel name.
*
* @param user The name of the user.
*/
function toChannelName(user) {
	return `#${toUserName(user)}`;
}
//#endregion
//#region node_modules/@twurple/chat/lib/ChatClient.js
init_tslib_es6();
var ChatClient_1;
/**
* An interface to Twitch chat.
*/
let ChatClient = ChatClient_1 = class ChatClient extends EventEmitter {
	/** @internal */ _authProvider;
	_useLegacyScopes;
	_readOnly;
	_authIntents;
	_authToken;
	_authVerified = false;
	_authRetryTimer;
	_authRetryCount = 0;
	_chatLogger;
	_isAlwaysMod;
	_botLevel;
	_messageRateLimiter;
	_joinRateLimiter;
	_ircClient;
	/**
	* Fires when the client successfully connects to the chat server.
	*
	* @eventListener
	*/
	onConnect = this.registerEvent();
	/**
	* Fires when the client disconnects from the chat server.
	*
	* @eventListener
	* @param manually Whether the disconnect was requested by the user.
	* @param reason The error that caused the disconnect, or `undefined` if there was no error.
	*/
	onDisconnect = this.registerEvent();
	/**
	* Fires when a user is timed out from a channel.
	*
	* @eventListener
	* @param channel The channel the user is timed out from.
	* @param user The timed out user.
	* @param duration The duration of the timeout, in seconds.
	* @param msg The full message object containing all message and user information.
	*/
	onTimeout = this.registerEvent();
	/**
	* Fires when a user is permanently banned from a channel.
	*
	* @eventListener
	* @param channel The channel the user is banned from.
	* @param user The banned user.
	* @param msg The full message object containing all message and user information.
	*/
	onBan = this.registerEvent();
	/**
	* Fires when a user upgrades their bits badge in a channel.
	*
	* @eventListener
	* @param channel The channel where the bits badge was upgraded.
	* @param user The user that has upgraded their bits badge.
	* @param ritualInfo Additional information about the upgrade.
	* @param msg The full message object containing all message and user information.
	*/
	onBitsBadgeUpgrade = this.registerEvent();
	/**
	* Fires when the chat of a channel is cleared.
	*
	* @eventListener
	* @param channel The channel whose chat is cleared.
	* @param msg The full message object containing all message and user information.
	*/
	onChatClear = this.registerEvent();
	/**
	* Fires when emote-only mode is toggled in a channel.
	*
	* @eventListener
	* @param channel The channel where emote-only mode is being toggled.
	* @param enabled Whether emote-only mode is being enabled. If false, it's being disabled.
	*/
	onEmoteOnly = this.registerEvent();
	/**
	* Fires when followers-only mode is toggled in a channel.
	*
	* @eventListener
	* @param channel The channel where followers-only mode is being toggled.
	* @param enabled Whether followers-only mode is being enabled. If false, it's being disabled.
	* @param delay The time (in minutes) a user needs to follow the channel to be able to talk. Only available when `enabled === true`.
	*/
	onFollowersOnly = this.registerEvent();
	/**
	* Fires when a user joins a channel.
	*
	* The join/part events are cached by the Twitch chat server and will be batched and sent every 30-60 seconds.
	*
	* Please note that unless you enabled the `requestMembershipEvents` option, this will only react to your own joins.
	*
	* @eventListener
	* @param channel The channel that is being joined.
	* @param user The user that joined.
	*/
	onJoin = this.registerEvent();
	/**
	* Fires when you fail to join a channel.
	*
	* @eventListener
	* @param channel The channel that you tried to join.
	* @param reason The reason for the failure.
	*/
	onJoinFailure = this.registerEvent();
	/**
	* Fires when a user leaves ("parts") a channel.
	*
	* The join/part events are cached by the Twitch chat server and will be batched and sent every 30-60 seconds.
	*
	* Please note that unless you enabled the `requestMembershipEvents` option, this will only react to your own parts.
	*
	* @eventListener
	* @param channel The channel that is being left.
	* @param user The user that left.
	*/
	onPart = this.registerEvent();
	/**
	* Fires when a single message is removed from a channel.
	*
	* @eventListener
	* @param channel The channel where the message was removed.
	* @param messageId The ID of the message that was removed.
	* @param msg The full message object containing all message and user information.
	*
	* This is *not* the message that was removed. The text of the message is available using `msg.params.message` though.
	*/
	onMessageRemove = this.registerEvent();
	/**
	* Fires when unique chat mode is toggled in a channel.
	*
	* @eventListener
	* @param channel The channel where unique chat mode is being toggled.
	* @param enabled Whether unique chat mode is being enabled. If false, it's being disabled.
	*/
	onUniqueChat = this.registerEvent();
	/**
	* Fires when a user raids a channel.
	*
	* @eventListener
	* @param channel The channel that was raided.
	* @param user The user that has raided the channel.
	* @param raidInfo Additional information about the raid.
	* @param msg The full message object containing all message and user information.
	*/
	onRaid = this.registerEvent();
	/**
	* Fires when a user cancels a raid.
	*
	* @eventListener
	* @param channel The channel where the raid was cancelled.
	* @param msg The full message object containing all message and user information.
	*/
	onRaidCancel = this.registerEvent();
	/**
	* Fires when a user performs a "ritual" in a channel.
	*
	* @eventListener
	* @param channel The channel where the ritual was performed.
	* @param user The user that has performed the ritual.
	* @param ritualInfo Additional information about the ritual.
	* @param msg The full message object containing all message and user information.
	*/
	onRitual = this.registerEvent();
	/**
	* Fires when a user performs a "viewermilestone" in a channel.
	*
	* @eventListener
	* @param channel The channel where the milestone was performed.
	* @param user The user that has performed the milestone.
	* @param milestoneInfo Additional information about the milestone.
	* @param msg The full message object containing all message and user information.
	*/
	onViewerMilestone = this.registerEvent();
	/**
	* Fires when slow mode is toggled in a channel.
	*
	* @eventListener
	* @param channel The channel where slow mode is being toggled.
	* @param enabled Whether slow mode is being enabled. If false, it's being disabled.
	* @param delay The time (in seconds) a user has to wait between sending messages. Only set when enabling slow mode.
	*/
	onSlow = this.registerEvent();
	/**
	* Fires when sub only mode is toggled in a channel.
	*
	* @eventListener
	* @param channel The channel where sub only mode is being toggled.
	* @param enabled Whether sub only mode is being enabled. If false, it's being disabled.
	*/
	onSubsOnly = this.registerEvent();
	/**
	* Fires when a user subscribes to a channel.
	*
	* @eventListener
	* @param channel The channel that was subscribed to.
	* @param user The subscribing user.
	* @param subInfo Additional information about the subscription.
	* @param msg The full message object containing all message and user information.
	*/
	onSub = this.registerEvent();
	/**
	* Fires when a user resubscribes to a channel.
	*
	* @eventListener
	* @param channel The channel that was resubscribed to.
	* @param user The resubscribing user.
	* @param subInfo Additional information about the resubscription.
	* @param msg The full message object containing all message and user information.
	*/
	onResub = this.registerEvent();
	/**
	* Fires when a user gifts a subscription to a channel to another user.
	*
	* Community subs also fire multiple `onSubGift` events.
	* To prevent alert spam, check [Sub gift spam](/docs/examples/chat/sub-gift-spam).
	*
	* @eventListener
	* @param channel The channel that was subscribed to.
	* @param user The user that the subscription was gifted to. The gifting user is defined in `subInfo.gifter`.
	* @param subInfo Additional information about the subscription.
	* @param msg The full message object containing all message and user information.
	*/
	onSubGift = this.registerEvent();
	/**
	* Fires when a user gifts random subscriptions to the community of a channel.
	*
	* Community subs also fire multiple `onSubGift` events.
	* To prevent alert spam, check [Sub gift spam](/docs/examples/chat/sub-gift-spam).
	*
	* @eventListener
	* @param channel The channel that was subscribed to.
	* @param user The gifting user.
	* @param subInfo Additional information about the community subscription.
	* @param msg The full message object containing all message and user information.
	*/
	onCommunitySub = this.registerEvent();
	/**
	* Fires when a user extends their subscription using a Sub Token.
	*
	* @eventListener
	* @param channel The channel where the subscription was extended.
	* @param user The user that extended their subscription.
	* @param subInfo Additional information about the subscription extension.
	* @param msg The full message object containing all message and user information.
	*/
	onSubExtend = this.registerEvent();
	/**
	* Fires when a user gifts rewards during a special event.
	*
	* @eventListener
	* @param channel The channel where the rewards were gifted.
	* @param user The user that gifted the rewards.
	* @param rewardGiftInfo Additional information about the reward gift.
	* @param msg The full message object containing all message and user information.
	*/
	onRewardGift = this.registerEvent();
	/**
	* Fires when a user upgrades their Prime subscription to a paid subscription in a channel.
	*
	* @eventListener
	* @param channel The channel where the subscription was upgraded.
	* @param user The user that upgraded their subscription.
	* @param subInfo Additional information about the subscription upgrade.
	* @param msg The full message object containing all message and user information.
	*/
	onPrimePaidUpgrade = this.registerEvent();
	/**
	* Fires when a user upgrades their gift subscription to a paid subscription in a channel.
	*
	* @eventListener
	* @param channel The channel where the subscription was upgraded.
	* @param user The user that upgraded their subscription.
	* @param subInfo Additional information about the subscription upgrade.
	* @param msg The full message object containing all message and user information.
	*/
	onGiftPaidUpgrade = this.registerEvent();
	/**
	* Fires when a user gifts a Twitch Prime benefit to the channel.
	*
	* @eventListener
	* @param channel The channel where the benefit was gifted.
	* @param user The user that received the gift.
	*
	* **WARNING:** This is a *display name* and thus will not work as an identifier for the API (login) in some cases.
	* @param subInfo Additional information about the gift.
	* @param msg The full message object containing all message and user information.
	*/
	onPrimeCommunityGift = this.registerEvent();
	/**
	* Fires when a user pays forward a subscription that was gifted to them to a specific user.
	*
	* @eventListener
	* @param channel The channel where the gift was forwarded.
	* @param user The user that forwarded the gift.
	* @param forwardInfo Additional information about the gift.
	* @param msg The full message object containing all message and user information.
	*/
	onStandardPayForward = this.registerEvent();
	/**
	* Fires when a user pays forward a subscription that was gifted to them to the community.
	*
	* @eventListener
	* @param channel The channel where the gift was forwarded.
	* @param user The user that forwarded the gift.
	* @param forwardInfo Additional information about the gift.
	* @param msg The full message object containing all message and user information.
	*/
	onCommunityPayForward = this.registerEvent();
	/**
	* Fires when a user sends an announcement (/announce) to a channel.
	*
	* @eventListener
	* @param channel The channel the announcement was sent to.
	* @param user The user that sent the announcement.
	* @param announcementInfo Additional information about the announcement.
	* @param msg The full message object containing all message and user information.
	*/
	onAnnouncement = this.registerEvent();
	/**
	* Fires when receiving a whisper from another user.
	*
	* @eventListener
	* @param user The user that sent the whisper.
	* @param text The message text.
	* @param msg The full message object containing all message and user information.
	*/
	onWhisper = this.registerEvent();
	/**
	* Fires when you tried to execute a command you don't have sufficient permission for.
	*
	* @eventListener
	* @param channel The channel that a command without sufficient permissions was executed on.
	* @param text The message text.
	*/
	onNoPermission = this.registerEvent();
	/**
	* Fires when a message you tried to send gets rejected by the ratelimiter.
	*
	* @eventListener
	* @param channel The channel that was attempted to send to.
	* @param text The message text.
	*/
	onMessageRatelimit = this.registerEvent();
	/**
	* Fires when authentication succeeds.
	*
	* @eventListener
	*/
	onAuthenticationSuccess = this.registerEvent();
	/**
	* Fires when authentication fails.
	*
	* @eventListener
	* @param text The message text.
	* @param retryCount The number of authentication attempts, including this one, that failed in the current attempt to connect.
	*
	* Resets when authentication succeeds.
	*/
	onAuthenticationFailure = this.registerEvent();
	/**
	* Fires when fetching a token fails.
	*
	* @eventListener
	* @param error The error that was thrown.
	*/
	onTokenFetchFailure = this.registerEvent();
	/**
	* Fires when sending a message fails.
	*
	* @eventListener
	* @param channel The channel that rejected the message.
	* @param reason The reason for the failure, e.g. you're banned (msg_banned)
	*/
	onMessageFailed = this.registerEvent();
	/**
	* Fires when a user sends a message to a channel.
	*
	* @eventListener
	* @param channel The channel the message was sent to.
	* @param user The user that sent the message.
	* @param text The message text.
	* @param msg The full message object containing all message and user information.
	*/
	onMessage = this.registerEvent();
	/**
	* Fires when a user sends an action (/me) to a channel.
	*
	* @eventListener
	* @param channel The channel the action was sent to.
	* @param user The user that sent the action.
	* @param text The action text.
	* @param msg The full message object containing all message and user information.
	*/
	onAction = this.registerEvent();
	_onJoinResult = this.registerInternalEvent();
	/**
	* Creates a new Twitch chat client.
	*
	* @expandParams
	*
	* @param config
	*/
	constructor(config = {}) {
		if (config.authProvider && !config.authProvider.getAccessTokenForIntent) throw new InvalidTokenTypeError("You can not connect to chat using an AuthProvider that does not support intents.\nTo get an anonymous, read-only connection, please don't pass an `AuthProvider` at all.\nTo get a read-write connection, please provide an auth provider that provides user access tokens via intents, such as `RefreshingAuthProvider`.");
		super();
		this._ircClient = new IrcClient({
			connection: {
				hostName: config.hostName ?? (config.webSocket ?? true ? "irc-ws.chat.twitch.tv" : "irc.chat.twitch.tv"),
				secure: config.ssl ?? true
			},
			credentials: {
				nick: "",
				password: async () => await this._getAuthToken()
			},
			webSocket: config.webSocket ?? true,
			connectionOptions: config.connectionOptions,
			logger: {
				name: "twurple:chat:irc",
				...config.logger
			},
			nonConformingCommands: ["004"],
			manuallyAcknowledgeJoins: true,
			rejoinChannelsOnReconnect: config.rejoinChannelsOnReconnect
		});
		this._ircClient.onDisconnect((manually, reason) => {
			this._messageRateLimiter?.clear();
			this._messageRateLimiter?.pause();
			this._joinRateLimiter?.clear();
			this._joinRateLimiter?.pause();
			this.emit(this.onDisconnect, manually, reason);
		});
		this._ircClient.registerMessageType(ChatMessage);
		this._chatLogger = createLogger$1({
			name: "twurple:chat:twitch",
			...config.logger
		});
		this._authProvider = config.authProvider;
		this._useLegacyScopes = !!config.legacyScopes;
		this._readOnly = !!config.readOnly;
		this._authIntents = [...config.authIntents ?? [], "chat"];
		this._isAlwaysMod = config.isAlwaysMod ?? false;
		this._botLevel = config.botLevel ?? "none";
		this._ircClient.addCapability(TwitchTagsCapability);
		this._ircClient.addCapability(TwitchCommandsCapability);
		if (config.requestMembershipEvents) this._ircClient.addCapability(TwitchMembershipCapability);
		this._ircClient.onConnect(() => {
			this.emit(this.onConnect);
		});
		this._ircClient.onRegister(async () => {
			this._messageRateLimiter?.resume();
			this._joinRateLimiter?.resume();
			this._authVerified = true;
			this._authRetryTimer = void 0;
			this._authRetryCount = 0;
			this.emit(this.onAuthenticationSuccess);
			const resolvedChannels = await resolveConfigValue(config.channels);
			if (resolvedChannels) await Promise.all(resolvedChannels.map(async (channel) => {
				try {
					await this.join(channel);
				} catch (e) {
					this._chatLogger.warn(`Failed to join configured channel ${channel}; original message: ${e?.message ?? e}`);
				}
			}));
		});
		this._ircClient.onPasswordError((e) => {
			this._chatLogger.error(`Error fetching a token for connecting to the server: ${e.message}`);
			this.emit(this.onTokenFetchFailure, e);
		});
		this._ircClient.onPrivmsg((channel, user, text, msg) => {
			if (user !== "jtv") this.emit(this.onMessage, toUserName(channel), user, text, msg);
		});
		this._ircClient.onAction((channel, user, text, msg) => {
			this.emit(this.onAction, toUserName(channel), user, text, msg);
		});
		this.addInternalListener(this._onJoinResult, (channel, _, error) => {
			if (error) this.emit(this.onJoinFailure, toUserName(channel), error);
			else this._ircClient.acknowledgeJoin(channel);
		});
		this._ircClient.onTypedMessage(ClearChat, (msg) => {
			const { channel, user, tags } = msg;
			const broadcasterName = toUserName(channel);
			if (user) {
				const duration = tags.get("ban-duration");
				if (duration === void 0) this.emit(this.onBan, broadcasterName, user, msg);
				else this.emit(this.onTimeout, broadcasterName, user, Number(duration), msg);
			} else this.emit(this.onChatClear, broadcasterName, msg);
		});
		this._ircClient.onTypedMessage(ClearMsg, (msg) => {
			const { channel, targetMessageId } = msg;
			this.emit(this.onMessageRemove, toUserName(channel), targetMessageId, msg);
		});
		this._ircClient.onTypedMessage(ChannelJoin, ({ prefix, channel }) => {
			this.emit(this.onJoin, toUserName(channel), prefix.nick);
		});
		this._ircClient.onTypedMessage(ChannelPart, ({ prefix, channel }) => {
			this.emit(this.onPart, toUserName(channel), prefix.nick);
		});
		this._ircClient.onTypedMessage(RoomState, ({ channel, tags }) => {
			let isInitial = false;
			if (tags.has("subs-only") && tags.has("slow")) {
				this.emit(this._onJoinResult, channel, tags);
				isInitial = true;
			}
			if (!isInitial) {
				const broadcasterName = toUserName(channel);
				if (tags.has("slow")) {
					const slowDelay = Number(tags.get("slow"));
					if (slowDelay) this.emit(this.onSlow, broadcasterName, true, slowDelay);
					else this.emit(this.onSlow, broadcasterName, false);
				}
				if (tags.has("followers-only")) {
					const followDelay = Number(tags.get("followers-only"));
					if (followDelay === -1) this.emit(this.onFollowersOnly, broadcasterName, false);
					else this.emit(this.onFollowersOnly, broadcasterName, true, followDelay);
				}
			}
		});
		this._ircClient.onTypedMessage(UserNotice, (userNotice) => {
			const { channel, text: message, tags } = userNotice;
			const messageType = tags.get("msg-id");
			const broadcasterName = toUserName(channel);
			switch (messageType) {
				case "sub":
				case "resub": {
					const event = messageType === "sub" ? this.onSub : this.onResub;
					const plan = tags.get("msg-param-sub-plan");
					const streakMonths = tags.get("msg-param-streak-months");
					const subInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						plan,
						planName: tags.get("msg-param-sub-plan-name"),
						isPrime: plan === "Prime",
						months: Number(tags.get("msg-param-cumulative-months")),
						streak: streakMonths ? Number(streakMonths) : void 0,
						message
					};
					if (tags.get("msg-param-was-gifted") === "true") {
						const wasAnonGift = tags.get("msg-param-anon-gift") === "true";
						const duration = Number(tags.get("msg-param-gift-months"));
						const redeemedMonth = Number(tags.get("msg-param-gift-month-being-redeemed"));
						if (wasAnonGift) subInfo.originalGiftInfo = {
							anonymous: true,
							duration,
							redeemedMonth
						};
						else subInfo.originalGiftInfo = {
							anonymous: false,
							duration,
							redeemedMonth,
							userId: tags.get("msg-param-gifter-id"),
							userName: tags.get("msg-param-gifter-login"),
							userDisplayName: tags.get("msg-param-gifter-name")
						};
					}
					this.emit(event, broadcasterName, tags.get("login"), subInfo, userNotice);
					break;
				}
				case "subgift": {
					const plan = tags.get("msg-param-sub-plan");
					const gifter = tags.get("login");
					const isAnon = gifter === "ananonymousgifter";
					const subInfo = {
						userId: tags.get("msg-param-recipient-id"),
						displayName: tags.get("msg-param-recipient-display-name"),
						gifter: isAnon ? void 0 : gifter,
						gifterUserId: isAnon ? void 0 : tags.get("user-id"),
						gifterDisplayName: isAnon ? void 0 : tags.get("display-name"),
						gifterGiftCount: isAnon ? void 0 : Number(tags.get("msg-param-sender-count")),
						giftDuration: Number(tags.get("msg-param-gift-months")),
						plan,
						planName: tags.get("msg-param-sub-plan-name"),
						isPrime: plan === "Prime",
						months: Number(tags.get("msg-param-months"))
					};
					this.emit(this.onSubGift, broadcasterName, tags.get("msg-param-recipient-user-name"), subInfo, userNotice);
					break;
				}
				case "submysterygift": {
					const gifter = tags.get("login");
					const isAnon = gifter === "ananonymousgifter";
					const communitySubInfo = {
						gifter: isAnon ? void 0 : gifter,
						gifterUserId: isAnon ? void 0 : tags.get("user-id"),
						gifterDisplayName: isAnon ? void 0 : tags.get("display-name"),
						gifterGiftCount: isAnon ? void 0 : Number(tags.get("msg-param-sender-count")),
						count: Number(tags.get("msg-param-mass-gift-count")),
						plan: tags.get("msg-param-sub-plan")
					};
					this.emit(this.onCommunitySub, broadcasterName, tags.get("login"), communitySubInfo, userNotice);
					break;
				}
				case "primepaidupgrade": {
					const upgradeInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						plan: tags.get("msg-param-sub-plan")
					};
					this.emit(this.onPrimePaidUpgrade, broadcasterName, tags.get("login"), upgradeInfo, userNotice);
					break;
				}
				case "giftpaidupgrade": {
					const upgradeInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						gifter: tags.get("msg-param-sender-login"),
						gifterDisplayName: tags.get("msg-param-sender-name")
					};
					this.emit(this.onGiftPaidUpgrade, broadcasterName, tags.get("login"), upgradeInfo, userNotice);
					break;
				}
				case "standardpayforward": {
					const wasAnon = tags.get("msg-param-prior-gifter-anonymous") === "true";
					const forwardInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						originalGifterUserId: wasAnon ? void 0 : tags.get("msg-param-prior-gifter-id"),
						originalGifterDisplayName: wasAnon ? void 0 : tags.get("msg-param-prior-gifter-display-name"),
						recipientUserId: tags.get("msg-param-recipient-id"),
						recipientDisplayName: tags.get("msg-param-recipient-display-name")
					};
					this.emit(this.onStandardPayForward, broadcasterName, tags.get("login"), forwardInfo, userNotice);
					break;
				}
				case "communitypayforward": {
					const wasAnon = tags.get("msg-param-prior-gifter-anonymous") === "true";
					const forwardInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						originalGifterUserId: wasAnon ? void 0 : tags.get("msg-param-prior-gifter-id"),
						originalGifterDisplayName: wasAnon ? void 0 : tags.get("msg-param-prior-gifter-display-name")
					};
					this.emit(this.onCommunityPayForward, broadcasterName, tags.get("login"), forwardInfo, userNotice);
					break;
				}
				case "primecommunitygiftreceived": {
					const giftInfo = {
						name: tags.get("msg-param-gift-name"),
						gifter: tags.get("login"),
						gifterDisplayName: tags.get("display-name")
					};
					this.emit(this.onPrimeCommunityGift, broadcasterName, tags.get("msg-param-recipient"), giftInfo, userNotice);
					break;
				}
				case "raid": {
					const raidInfo = {
						displayName: tags.get("msg-param-displayName"),
						viewerCount: Number(tags.get("msg-param-viewerCount"))
					};
					this.emit(this.onRaid, broadcasterName, tags.get("login"), raidInfo, userNotice);
					break;
				}
				case "unraid":
					this.emit(this.onRaidCancel, broadcasterName, userNotice);
					break;
				case "ritual": {
					const ritualInfo = {
						ritualName: tags.get("msg-param-ritual-name"),
						message
					};
					this.emit(this.onRitual, broadcasterName, tags.get("login"), ritualInfo, userNotice);
					break;
				}
				case "viewermilestone": {
					const milestoneInfo = {
						categoryName: tags.get("msg-param-category"),
						value: Number(tags.get("msg-param-value")),
						reward: Number(tags.get("msg-param-copoReward")),
						message
					};
					this.emit(this.onViewerMilestone, broadcasterName, tags.get("login"), milestoneInfo, userNotice);
					break;
				}
				case "bitsbadgetier": {
					const badgeUpgradeInfo = {
						displayName: tags.get("display-name"),
						threshold: Number(tags.get("msg-param-threshold"))
					};
					this.emit(this.onBitsBadgeUpgrade, broadcasterName, tags.get("login"), badgeUpgradeInfo, userNotice);
					break;
				}
				case "extendsub": {
					const extendInfo = {
						userId: tags.get("user-id"),
						displayName: tags.get("display-name"),
						plan: tags.get("msg-param-sub-plan"),
						months: Number(tags.get("msg-param-cumulative-months")),
						endMonth: Number(tags.get("msg-param-sub-benefit-end-month"))
					};
					this.emit(this.onSubExtend, broadcasterName, tags.get("login"), extendInfo, userNotice);
					break;
				}
				case "rewardgift": {
					const rewardGiftInfo = {
						domain: tags.get("msg-param-domain"),
						gifterId: tags.get("user-id"),
						gifterDisplayName: tags.get("display-name"),
						count: Number(tags.get("msg-param-selected-count")),
						gifterGiftCount: Number(tags.get("msg-param-total-reward-count")),
						triggerType: tags.get("msg-param-trigger-type")
					};
					this.emit(this.onRewardGift, broadcasterName, tags.get("login"), rewardGiftInfo, userNotice);
					break;
				}
				case "announcement": {
					const announcementInfo = { color: tags.get("msg-param-color") };
					this.emit(this.onAnnouncement, broadcasterName, tags.get("login"), announcementInfo, userNotice);
					break;
				}
				default: this._chatLogger.warn(`Unrecognized usernotice ID: ${messageType}`);
			}
		});
		this._ircClient.onTypedMessage(Whisper, (whisper) => {
			this.emit(this.onWhisper, whisper.prefix.nick, whisper.text, whisper);
		});
		this._ircClient.onTypedMessage(Notice, async ({ target: channel, text, tags }) => {
			const messageType = tags.get("msg-id");
			switch (messageType) {
				case "emote_only_on":
					this.emit(this.onEmoteOnly, toUserName(channel), true);
					break;
				case "emote_only_off":
					this.emit(this.onEmoteOnly, toUserName(channel), false);
					break;
				case "msg_channel_suspended":
				case "msg_banned":
					this.emit(this._onJoinResult, channel, void 0, messageType);
					break;
				case "r9k_on":
					this.emit(this.onUniqueChat, toUserName(channel), true);
					break;
				case "r9k_off":
					this.emit(this.onUniqueChat, toUserName(channel), false);
					break;
				case "subs_on":
					this.emit(this.onSubsOnly, toUserName(channel), true);
					break;
				case "subs_off":
					this.emit(this.onSubsOnly, toUserName(channel), false);
					break;
				case "cmds_available": break;
				case "followers_on":
				case "followers_on_zero":
				case "followers_off":
				case "slow_on":
				case "slow_off": break;
				case "timeout_success": break;
				case "unrecognized_cmd": break;
				case "no_permission":
					this.emit(this.onNoPermission, toUserName(channel), text);
					break;
				case "msg_ratelimit":
					this.emit(this.onMessageRatelimit, toUserName(channel), text);
					break;
				case "msg_duplicate":
				case "msg_emoteonly":
				case "msg_followersonly":
				case "msg_followersonly_followed":
				case "msg_followersonly_zero":
				case "msg_subsonly":
				case "msg_slowmode":
				case "msg_r9k":
				case "msg_verified_email":
				case "msg_timedout":
				case "msg_rejected_mandatory":
				case "msg_channel_blocked":
					this.emit(this.onMessageFailed, toUserName(channel), messageType);
					break;
				case void 0:
					if (text === "Login authentication failed" || text === "Improperly formatted AUTH" || text === "Invalid NICK") {
						this._authVerified = false;
						if (!this._authRetryTimer) {
							this._authRetryTimer = fibWithLimit(120);
							this._authRetryCount = 0;
						}
						const secs = this._authRetryTimer.next().value;
						const authRetries = ++this._authRetryCount;
						this.emit(this.onAuthenticationFailure, text, authRetries);
						if (secs !== 0) this._chatLogger.info(`Retrying authentication in ${secs} seconds`);
						await delay(secs * 1e3);
						this._ircClient.reconnect();
					}
					break;
				default: if (!messageType.startsWith("usage_")) this._chatLogger.warn(`Unrecognized notice ID: '${messageType}'`);
			}
		});
	}
	/**
	* Connects to the chat server.
	*/
	connect() {
		if (!this._authProvider) this._ircClient.changeNick(ChatClient_1._generateJustinfanNick());
		this._initializeRateLimiters();
		this._ircClient.connect();
	}
	/**
	* The underlying IRC client. Use sparingly.
	*/
	get irc() {
		return this._ircClient;
	}
	/**
	* Whether the chat client is currently connected.
	*/
	get isConnected() {
		return this._ircClient.isConnected;
	}
	/**
	* Whether the chat client is currently connecting.
	*/
	get isConnecting() {
		return this._ircClient.isConnecting;
	}
	/**
	* The channels the client is currently in.
	*/
	get currentChannels() {
		return this._ircClient.currentChannels;
	}
	/**
	* Sends a regular chat message to a channel.
	*
	* @param channel The channel to send the message to.
	* @param text The message to send.
	* @param attributes The attributes to add to the message.
	* @param rateLimiterOptions Options to pass to the rate limiter.
	*/
	async say(channel, text, attributes = {}, rateLimiterOptions) {
		const tags = {};
		if (attributes.replyTo) tags["reply-parent-msg-id"] = extractMessageId(attributes.replyTo);
		const texts = splitOnSpaces(text, 500);
		await Promise.all(texts.map(async (msg) => await this._messageRateLimiter.request({
			type: "say",
			channel: toChannelName(channel),
			text: msg,
			tags
		}, rateLimiterOptions)));
	}
	/**
	* Sends an action message (/me) to a channel.
	*
	* @param channel The channel to send the message to.
	* @param text The message to send.
	* @param rateLimiterOptions Options to pass to the rate limiter.
	*/
	async action(channel, text, rateLimiterOptions) {
		const texts = splitOnSpaces(text, 490);
		await Promise.all(texts.map(async (msg) => await this._messageRateLimiter.request({
			type: "action",
			channel: toChannelName(channel),
			text: msg
		}, rateLimiterOptions)));
	}
	/**
	* Joins a channel.
	*
	* @param channel The channel to join.
	*/
	async join(channel) {
		await this._joinRateLimiter.request(toChannelName(channel));
	}
	/**
	* Leaves a channel ("part" in IRC terms).
	*
	* @param channel The channel to leave.
	*/
	part(channel) {
		this._ircClient.part(toChannelName(channel));
	}
	/**
	* Disconnects from the chat server.
	*/
	quit() {
		this._messageRateLimiter?.destroy?.();
		this._joinRateLimiter?.destroy?.();
		this._messageRateLimiter = void 0;
		this._joinRateLimiter = void 0;
		this._ircClient.quitAbruptly();
	}
	/**
	* Reconnects to the chat server.
	*/
	reconnect() {
		this.quit();
		this.connect();
	}
	async _getAuthToken() {
		if (!this._authProvider) {
			this._chatLogger.debug("No authProvider given; connecting anonymously");
			return;
		}
		if (this._authToken && !accessTokenIsExpired(this._authToken) && this._authVerified) {
			this._chatLogger.debug("AccessToken assumed to be correct from last connection");
			return `oauth:${this._authToken.accessToken}`;
		}
		const scopes = this._getNecessaryScopes();
		let lastTokenError = void 0;
		let foundSomeIntent = false;
		for (const intent of this._authIntents) {
			try {
				this._authToken = await this._authProvider.getAccessTokenForIntent(intent, scopes);
				if (!this._authToken) continue;
				foundSomeIntent = true;
				const token = await getTokenInfo(this._authToken.accessToken);
				if (!token.userName) throw new InvalidTokenTypeError("Could not determine a user name for your token; you might be trying to disguise an app token as a user token.");
				this._ircClient.changeNick(token.userName);
				return `oauth:${this._authToken.accessToken}`;
			} catch (e) {
				if (e instanceof InvalidTokenError) lastTokenError = e;
				else this._chatLogger.error(`Retrieving an access token failed: ${e.message}`);
			}
			this._chatLogger.warn("No valid token available; trying to refresh");
			try {
				this._authToken = await this._authProvider.refreshAccessTokenForIntent?.(intent);
				if (this._authToken) {
					const token = await getTokenInfo(this._authToken.accessToken);
					if (!token.userName) throw new InvalidTokenTypeError("Could not determine a user name for your token; you might be trying to disguise an app token as a user token.");
					this._ircClient.changeNick(token.userName);
					return `oauth:${this._authToken.accessToken}`;
				}
			} catch (e) {
				if (e instanceof InvalidTokenError) lastTokenError = e;
				else this._chatLogger.error(`Refreshing the access token failed: ${e.message}`);
			}
		}
		this._authVerified = false;
		throw lastTokenError ?? /* @__PURE__ */ new Error(foundSomeIntent ? "Could not retrieve a valid token" : `None of the queried intents (${this._authIntents.join(", ")}) are known by the auth provider${this._authProvider instanceof RefreshingAuthProvider ? ".\nPlease add one of these to the user you want to connect with using the `addIntentToUser` method or the additional parameter to `addUser` or `addUserForToken`." : ""}`);
	}
	_getNecessaryScopes() {
		if (this._useLegacyScopes) return ["chat_login"];
		if (this._readOnly) return ["chat:read"];
		return ["chat:read", "chat:edit"];
	}
	static _generateJustinfanNick() {
		return `justinfan${Math.floor(Math.random() * 1e5).toString().padStart(5, "0")}`;
	}
	_initializeRateLimiters() {
		const executeChatMessageRequest = async ({ type, text, channel, tags }) => {
			if (type === "say") this._ircClient.say(channel, text, tags);
			else this._ircClient.action(channel, text);
		};
		const executeJoinRequest = async (channel) => {
			const { promise, resolve, reject } = promiseWithResolvers();
			let timer;
			const e = this.addInternalListener(this._onJoinResult, (chan, state, error) => {
				if (chan === channel) {
					clearTimeout(timer);
					if (error) reject(error);
					else resolve();
					this.removeListener(e);
				}
			});
			timer = setTimeout(() => {
				this.removeListener(e);
				this.emit(this._onJoinResult, channel, void 0, "twurple_timeout");
				reject(/* @__PURE__ */ new Error(`Did not receive a reply to join ${channel} in time; assuming that the join failed`));
			}, 1e4);
			this._ircClient.join(channel);
			await promise;
		};
		if (this._isAlwaysMod) this._messageRateLimiter = new TimeBasedRateLimiter({
			bucketSize: this._botLevel === "verified" ? 7500 : 100,
			timeFrame: 32e3,
			doRequest: executeChatMessageRequest
		});
		else {
			let bucketSize = 20;
			if (this._botLevel === "verified") bucketSize = 7500;
			else if (this._botLevel === "known") bucketSize = 50;
			this._messageRateLimiter = new TimedPassthruRateLimiter(new PartitionedTimeBasedRateLimiter({
				bucketSize: 1,
				timeFrame: 1200,
				logger: { minLevel: LogLevel.ERROR },
				doRequest: executeChatMessageRequest,
				getPartitionKey: ({ channel }) => channel
			}), {
				bucketSize,
				timeFrame: 32e3
			});
		}
		this._joinRateLimiter = new TimeBasedRateLimiter({
			bucketSize: this._botLevel === "verified" ? 2e3 : 20,
			timeFrame: 11e3,
			doRequest: executeJoinRequest
		});
		this._messageRateLimiter.pause();
		this._joinRateLimiter.pause();
	}
};
__decorate([Enumerable(false)], ChatClient.prototype, "_authProvider", void 0);
ChatClient = ChatClient_1 = __decorate([rtfm("chat", "ChatClient")], ChatClient);
//#endregion
//#region extensions/twitch/src/twitch-client.ts
/**
* Manages Twitch chat client connections
*/
var TwitchClientManager = class {
	constructor(logger) {
		this.logger = logger;
		this.clients = /* @__PURE__ */ new Map();
		this.messageHandlers = /* @__PURE__ */ new Map();
	}
	/**
	* Create an auth provider for the account.
	*/
	async createAuthProvider(account, normalizedToken) {
		if (!account.clientId) throw new Error("Missing Twitch client ID");
		if (account.clientSecret) {
			const authProvider = new RefreshingAuthProvider({
				clientId: account.clientId,
				clientSecret: account.clientSecret
			});
			await authProvider.addUserForToken({
				accessToken: normalizedToken,
				refreshToken: account.refreshToken ?? null,
				expiresIn: account.expiresIn ?? null,
				obtainmentTimestamp: account.obtainmentTimestamp ?? Date.now()
			}).then((userId) => {
				this.logger.info(`Added user ${userId} to RefreshingAuthProvider for ${account.username}`);
			}).catch((err) => {
				this.logger.error(`Failed to add user to RefreshingAuthProvider: ${err instanceof Error ? err.message : String(err)}`);
			});
			authProvider.onRefresh((userId, token) => {
				this.logger.info(`Access token refreshed for user ${userId} (expires in ${token.expiresIn ? `${token.expiresIn}s` : "unknown"})`);
			});
			authProvider.onRefreshFailure((userId, error) => {
				this.logger.error(`Failed to refresh access token for user ${userId}: ${error.message}`);
			});
			const refreshStatus = account.refreshToken ? "automatic token refresh enabled" : "token refresh disabled (no refresh token)";
			this.logger.info(`Using RefreshingAuthProvider for ${account.username} (${refreshStatus})`);
			return authProvider;
		}
		this.logger.info(`Using StaticAuthProvider for ${account.username} (no clientSecret provided)`);
		return new StaticAuthProvider(account.clientId, normalizedToken);
	}
	/**
	* Get or create a chat client for an account
	*/
	async getClient(account, cfg, accountId) {
		const key = this.getAccountKey(account);
		const existing = this.clients.get(key);
		if (existing) return existing;
		const tokenResolution = resolveTwitchToken(cfg, { accountId });
		if (!tokenResolution.token) {
			this.logger.error(`Missing Twitch token for account ${account.username} (set channels.twitch.accounts.${account.username}.token or OPENCLAW_TWITCH_ACCESS_TOKEN for default)`);
			throw new Error("Missing Twitch token");
		}
		this.logger.debug?.(`Using ${tokenResolution.source} token source for ${account.username}`);
		if (!account.clientId) {
			this.logger.error(`Missing Twitch client ID for account ${account.username}`);
			throw new Error("Missing Twitch client ID");
		}
		const normalizedToken = normalizeToken(tokenResolution.token);
		const client = new ChatClient({
			authProvider: await this.createAuthProvider(account, normalizedToken),
			channels: [account.channel],
			rejoinChannelsOnReconnect: true,
			requestMembershipEvents: true,
			logger: {
				minLevel: LogLevel.WARNING,
				custom: { log: (level, message) => {
					switch (level) {
						case LogLevel.CRITICAL:
							this.logger.error(message);
							break;
						case LogLevel.ERROR:
							this.logger.error(message);
							break;
						case LogLevel.WARNING:
							this.logger.warn(message);
							break;
						case LogLevel.INFO:
							this.logger.info(message);
							break;
						case LogLevel.DEBUG:
							this.logger.debug?.(message);
							break;
						case LogLevel.TRACE:
							this.logger.debug?.(message);
							break;
					}
				} }
			}
		});
		this.setupClientHandlers(client, account);
		client.connect();
		this.clients.set(key, client);
		this.logger.info(`Connected to Twitch as ${account.username}`);
		return client;
	}
	/**
	* Set up message and event handlers for a client
	*/
	setupClientHandlers(client, account) {
		const key = this.getAccountKey(account);
		client.onMessage((channelName, _user, messageText, msg) => {
			const handler = this.messageHandlers.get(key);
			if (handler) {
				const normalizedChannel = channelName.startsWith("#") ? channelName.slice(1) : channelName;
				const from = `twitch:${msg.userInfo.userName}`;
				const preview = messageText.slice(0, 100).replace(/\n/g, "\\n");
				this.logger.debug?.(`twitch inbound: channel=${normalizedChannel} from=${from} len=${messageText.length} preview="${preview}"`);
				handler({
					username: msg.userInfo.userName,
					displayName: msg.userInfo.displayName,
					userId: msg.userInfo.userId,
					message: messageText,
					channel: normalizedChannel,
					id: msg.id,
					timestamp: /* @__PURE__ */ new Date(),
					isMod: msg.userInfo.isMod,
					isOwner: msg.userInfo.isBroadcaster,
					isVip: msg.userInfo.isVip,
					isSub: msg.userInfo.isSubscriber,
					chatType: "group"
				});
			}
		});
		this.logger.info(`Set up handlers for ${key}`);
	}
	/**
	* Set a message handler for an account
	* @returns A function that removes the handler when called
	*/
	onMessage(account, handler) {
		const key = this.getAccountKey(account);
		this.messageHandlers.set(key, handler);
		return () => {
			this.messageHandlers.delete(key);
		};
	}
	/**
	* Disconnect a client
	*/
	async disconnect(account) {
		const key = this.getAccountKey(account);
		const client = this.clients.get(key);
		if (client) {
			client.quit();
			this.clients.delete(key);
			this.messageHandlers.delete(key);
			this.logger.info(`Disconnected ${key}`);
		}
	}
	/**
	* Disconnect all clients
	*/
	async disconnectAll() {
		this.clients.forEach((client) => client.quit());
		this.clients.clear();
		this.messageHandlers.clear();
		this.logger.info(" Disconnected all clients");
	}
	/**
	* Send a message to a channel
	*/
	async sendMessage(account, channel, message, cfg, accountId) {
		try {
			const client = await this.getClient(account, cfg, accountId);
			const messageId = crypto.randomUUID();
			await client.say(channel, message);
			return {
				ok: true,
				messageId
			};
		} catch (error) {
			this.logger.error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
	/**
	* Generate a unique key for an account
	*/
	getAccountKey(account) {
		return `${account.username}:${account.channel}`;
	}
	/**
	* Clear all clients and handlers (for testing)
	*/
	_clearForTest() {
		this.clients.clear();
		this.messageHandlers.clear();
	}
};
//#endregion
//#region extensions/twitch/src/client-manager-registry.ts
/**
* Client manager registry for Twitch plugin.
*
* Manages the lifecycle of TwitchClientManager instances across the plugin,
* ensuring proper cleanup when accounts are stopped or reconfigured.
*/
/**
* Global registry of client managers.
* Keyed by account ID.
*/
const registry = /* @__PURE__ */ new Map();
/**
* Get or create a client manager for an account.
*
* @param accountId - The account ID
* @param logger - Logger instance
* @returns The client manager
*/
function getOrCreateClientManager(accountId, logger) {
	const existing = registry.get(accountId);
	if (existing) return existing.manager;
	const manager = new TwitchClientManager(logger);
	registry.set(accountId, {
		manager,
		accountId,
		logger,
		createdAt: Date.now()
	});
	logger.info(`Registered client manager for account: ${accountId}`);
	return manager;
}
/**
* Get an existing client manager for an account.
*
* @param accountId - The account ID
* @returns The client manager, or undefined if not registered
*/
function getClientManager(accountId) {
	return registry.get(accountId)?.manager;
}
/**
* Disconnect and remove a client manager from the registry.
*
* @param accountId - The account ID
* @returns Promise that resolves when cleanup is complete
*/
async function removeClientManager(accountId) {
	const entry = registry.get(accountId);
	if (!entry) return;
	await entry.manager.disconnectAll();
	registry.delete(accountId);
	entry.logger.info(`Unregistered client manager for account: ${accountId}`);
}
//#endregion
//#region extensions/twitch/src/utils/markdown.ts
/**
* Markdown utilities for Twitch chat
*
* Twitch chat doesn't support markdown formatting, so we strip it before sending.
* Based on OpenClaw's markdownToText in src/agents/tools/web-fetch-utils.ts.
*/
/**
* Strip markdown formatting from text for Twitch compatibility.
*
* Removes images, links, bold, italic, strikethrough, code blocks, inline code,
* headers, and list formatting. Replaces newlines with spaces since Twitch
* is a single-line chat medium.
*
* @param markdown - The markdown text to strip
* @returns Plain text with markdown removed
*/
function stripMarkdownForTwitch(markdown) {
	return markdown.replace(/!\[[^\]]*]\([^)]+\)/g, "").replace(/\[([^\]]+)]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/_([^_]+)_/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?/g, "").replace(/```/g, "")).replace(/`([^`]+)`/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*+]\s+/gm, "").replace(/^\s*\d+\.\s+/gm, "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}
/**
* Simple word-boundary chunker for Twitch (500 char limit).
* Strips markdown before chunking to avoid breaking markdown patterns.
*
* @param text - The text to chunk
* @param limit - Maximum characters per chunk (Twitch limit is 500)
* @returns Array of text chunks
*/
function chunkTextForTwitch(text, limit) {
	const cleaned = stripMarkdownForTwitch(text);
	if (!cleaned) return [];
	if (limit <= 0) return [cleaned];
	if (cleaned.length <= limit) return [cleaned];
	const chunks = [];
	let remaining = cleaned;
	while (remaining.length > limit) {
		const window = remaining.slice(0, limit);
		const lastSpaceIndex = window.lastIndexOf(" ");
		if (lastSpaceIndex === -1) {
			chunks.push(window);
			remaining = remaining.slice(limit);
		} else {
			chunks.push(window.slice(0, lastSpaceIndex));
			remaining = remaining.slice(lastSpaceIndex + 1);
		}
	}
	if (remaining) chunks.push(remaining);
	return chunks;
}
//#endregion
//#region extensions/twitch/src/send.ts
/**
* Internal send function used by the outbound adapter.
*
* This function has access to the full OpenClaw config and handles
* account resolution, markdown stripping, and actual message sending.
*
* @param channel - The channel name
* @param text - The message text
* @param cfg - Full OpenClaw configuration
* @param accountId - Account ID to use
* @param stripMarkdown - Whether to strip markdown (default: true)
* @param logger - Logger instance
* @returns Result with message ID and status
*
* @example
* const result = await sendMessageTwitchInternal(
*   "#mychannel",
*   "Hello Twitch!",
*   openclawConfig,
*   "default",
*   true,
*   console,
* );
*/
async function sendMessageTwitchInternal(channel, text, cfg, accountId, stripMarkdown = true, logger = console) {
	const { account, configured, availableAccountIds, accountId: resolvedAccountId } = resolveTwitchAccountContext(cfg, accountId);
	if (!account) return {
		ok: false,
		messageId: generateMessageId(),
		error: `Account not found: ${accountId ?? "(default)"}. Available accounts: ${availableAccountIds.join(", ") || "none"}`
	};
	if (!configured) return {
		ok: false,
		messageId: generateMessageId(),
		error: `Account ${resolvedAccountId} is not properly configured. Required: username, clientId, and token (config or env for default account).`
	};
	const normalizedChannel = channel || account.channel;
	if (!normalizedChannel) return {
		ok: false,
		messageId: generateMessageId(),
		error: "No channel specified and no default channel in account config"
	};
	const cleanedText = stripMarkdown ? stripMarkdownForTwitch(text) : text;
	if (!cleanedText) return {
		ok: true,
		messageId: "skipped"
	};
	const clientManager = getClientManager(resolvedAccountId);
	if (!clientManager) return {
		ok: false,
		messageId: generateMessageId(),
		error: `Client manager not found for account: ${resolvedAccountId}. Please start the Twitch gateway first.`
	};
	try {
		const result = await clientManager.sendMessage(account, normalizeTwitchChannel(normalizedChannel), cleanedText, cfg, resolvedAccountId);
		if (!result.ok) return {
			ok: false,
			messageId: result.messageId ?? generateMessageId(),
			error: result.error ?? "Send failed"
		};
		return {
			ok: true,
			messageId: result.messageId ?? generateMessageId()
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		logger.error(`Failed to send message: ${errorMsg}`);
		return {
			ok: false,
			messageId: generateMessageId(),
			error: errorMsg
		};
	}
}
//#endregion
//#region extensions/twitch/src/outbound.ts
/**
* Twitch outbound adapter for sending messages.
*
* Implements the ChannelOutboundAdapter interface for Twitch chat.
* Supports text and media (URL) sending with markdown stripping and chunking.
*/
/**
* Twitch outbound adapter.
*
* Handles sending text and media to Twitch channels with automatic
* markdown stripping and message chunking.
*/
const twitchOutbound = {
	deliveryMode: "direct",
	textChunkLimit: 500,
	chunker: chunkTextForTwitch,
	resolveTarget: ({ to, allowFrom, mode }) => {
		const trimmed = to?.trim() ?? "";
		const allowListRaw = (allowFrom ?? []).map((entry) => String(entry).trim()).filter(Boolean);
		const hasWildcard = allowListRaw.includes("*");
		const allowList = allowListRaw.filter((entry) => entry !== "*").map((entry) => normalizeTwitchChannel(entry)).filter((entry) => entry.length > 0);
		if (trimmed) {
			const normalizedTo = normalizeTwitchChannel(trimmed);
			if (!normalizedTo) return {
				ok: false,
				error: missingTargetError("Twitch", "<channel-name>")
			};
			if (mode === "implicit" || mode === "heartbeat") {
				if (hasWildcard || allowList.length === 0) return {
					ok: true,
					to: normalizedTo
				};
				if (allowList.includes(normalizedTo)) return {
					ok: true,
					to: normalizedTo
				};
				return {
					ok: false,
					error: missingTargetError("Twitch", "<channel-name>")
				};
			}
			return {
				ok: true,
				to: normalizedTo
			};
		}
		return {
			ok: false,
			error: missingTargetError("Twitch", "<channel-name>")
		};
	},
	sendText: async (params) => {
		const { cfg, to, text, accountId } = params;
		if (params.signal?.aborted) throw new Error("Outbound delivery aborted");
		const resolvedAccountId = accountId ?? resolveTwitchAccountContext(cfg).accountId;
		const { account, availableAccountIds } = resolveTwitchAccountContext(cfg, resolvedAccountId);
		if (!account) throw new Error(`Twitch account not found: ${resolvedAccountId}. Available accounts: ${availableAccountIds.join(", ") || "none"}`);
		const channel = to || account.channel;
		if (!channel) throw new Error("No channel specified and no default channel in account config");
		const result = await sendMessageTwitchInternal(normalizeTwitchChannel(channel), text, cfg, resolvedAccountId, true, console);
		if (!result.ok) throw new Error(result.error ?? "Send failed");
		return {
			channel: "twitch",
			messageId: result.messageId,
			timestamp: Date.now()
		};
	},
	sendMedia: async (params) => {
		const { text, mediaUrl } = params;
		if (params.signal?.aborted) throw new Error("Outbound delivery aborted");
		const message = mediaUrl ? `${text || ""} ${mediaUrl}`.trim() : text;
		if (!twitchOutbound.sendText) throw new Error("sendText not implemented");
		return twitchOutbound.sendText({
			...params,
			text: message
		});
	}
};
//#endregion
//#region extensions/twitch/src/actions.ts
/**
* Twitch message actions adapter.
*
* Handles tool-based actions for Twitch, such as sending messages.
*/
/**
* Create a tool result with error content.
*/
function errorResponse(error) {
	return {
		content: [{
			type: "text",
			text: JSON.stringify({
				ok: false,
				error
			})
		}],
		details: { ok: false }
	};
}
/**
* Read a string parameter from action arguments.
*
* @param args - Action arguments
* @param key - Parameter key
* @param options - Options for reading the parameter
* @returns The parameter value or undefined if not found
*/
function readStringParam(args, key, options = {}) {
	const value = args[key];
	if (value === void 0 || value === null) {
		if (options.required) throw new Error(`Missing required parameter: ${key}`);
		return;
	}
	if (typeof value === "string") return options.trim !== false ? value.trim() : value;
	if (typeof value === "number" || typeof value === "boolean") {
		const str = String(value);
		return options.trim !== false ? str.trim() : str;
	}
	throw new Error(`Parameter ${key} must be a string, number, or boolean`);
}
/** Supported Twitch actions */
const TWITCH_ACTIONS = new Set(["send"]);
/**
* Twitch message actions adapter.
*/
const twitchMessageActions = {
	describeMessageTool: () => ({ actions: [...TWITCH_ACTIONS] }),
	supportsAction: ({ action }) => TWITCH_ACTIONS.has(action),
	extractToolSend: ({ args }) => {
		try {
			const to = readStringParam(args, "to", { required: true });
			const message = readStringParam(args, "message", { required: true });
			if (!to || !message) return null;
			return {
				to,
				message
			};
		} catch {
			return null;
		}
	},
	handleAction: async (ctx) => {
		if (ctx.action !== "send") return {
			content: [{
				type: "text",
				text: "Unsupported action"
			}],
			details: {
				ok: false,
				error: "Unsupported action"
			}
		};
		const message = readStringParam(ctx.params, "message", { required: true });
		const to = readStringParam(ctx.params, "to", { required: false });
		const accountId = ctx.accountId ?? resolveTwitchAccountContext(ctx.cfg).accountId;
		const { account, availableAccountIds } = resolveTwitchAccountContext(ctx.cfg, accountId);
		if (!account) return errorResponse(`Account not found: ${accountId}. Available accounts: ${availableAccountIds.join(", ") || "none"}`);
		const targetChannel = to || account.channel;
		if (!targetChannel) return errorResponse("No channel specified and no default channel in account config");
		if (!twitchOutbound.sendText) return errorResponse("sendText not implemented");
		try {
			const result = await twitchOutbound.sendText({
				cfg: ctx.cfg,
				to: targetChannel,
				text: message ?? "",
				accountId
			});
			return {
				content: [{
					type: "text",
					text: JSON.stringify(result)
				}],
				details: { ok: true }
			};
		} catch (error) {
			return errorResponse(error instanceof Error ? error.message : String(error));
		}
	}
};
//#endregion
//#region extensions/twitch/src/config-schema.ts
/**
* Twitch user roles that can be allowed to interact with the bot
*/
const TwitchRoleSchema = zod_exports.z.enum([
	"moderator",
	"owner",
	"vip",
	"subscriber",
	"all"
]);
/**
* Twitch account configuration schema
*/
const TwitchAccountSchema = zod_exports.z.object({
	username: zod_exports.z.string(),
	accessToken: zod_exports.z.string(),
	clientId: zod_exports.z.string().optional(),
	channel: zod_exports.z.string().min(1),
	enabled: zod_exports.z.boolean().optional(),
	allowFrom: zod_exports.z.array(zod_exports.z.string()).optional(),
	allowedRoles: zod_exports.z.array(TwitchRoleSchema).optional(),
	requireMention: zod_exports.z.boolean().optional(),
	responsePrefix: zod_exports.z.string().optional(),
	clientSecret: zod_exports.z.string().optional(),
	refreshToken: zod_exports.z.string().optional(),
	expiresIn: zod_exports.z.number().nullable().optional(),
	obtainmentTimestamp: zod_exports.z.number().optional()
});
/**
* Base configuration properties shared by both single and multi-account modes
*/
const TwitchConfigBaseSchema = zod_exports.z.object({
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	markdown: MarkdownConfigSchema.optional()
});
/**
* Simplified single-account configuration schema
*
* Use this for single-account setups. Properties are at the top level,
* creating an implicit "default" account.
*/
const SimplifiedSchema = zod_exports.z.intersection(TwitchConfigBaseSchema, TwitchAccountSchema);
/**
* Multi-account configuration schema
*
* Use this for multi-account setups. Each key is an account ID (e.g., "default", "secondary").
*/
const MultiAccountSchema = zod_exports.z.intersection(TwitchConfigBaseSchema, zod_exports.z.object({ accounts: zod_exports.z.record(zod_exports.z.string(), TwitchAccountSchema) }).refine((val) => Object.keys(val.accounts || {}).length > 0, { message: "accounts must contain at least one entry" }));
/**
* Twitch plugin configuration schema
*
* Supports two mutually exclusive patterns:
* 1. Simplified single-account: username, accessToken, clientId, channel at top level
* 2. Multi-account: accounts object with named account configs
*
* The union ensures clear discrimination between the two modes.
*/
const TwitchConfigSchema = zod_exports.z.union([SimplifiedSchema, MultiAccountSchema]);
//#endregion
//#region extensions/twitch/src/probe.ts
/**
* Probe a Twitch account to verify the connection is working
*
* This tests the Twitch OAuth token by attempting to connect
* to the chat server and verify the bot's username.
*/
async function probeTwitch(account, timeoutMs) {
	const started = Date.now();
	if (!account.accessToken || !account.username) return {
		ok: false,
		error: "missing credentials (accessToken, username)",
		username: account.username,
		elapsedMs: Date.now() - started
	};
	const rawToken = normalizeToken(account.accessToken.trim());
	let client;
	try {
		client = new ChatClient({ authProvider: new StaticAuthProvider(account.clientId ?? "", rawToken) });
		const connectionPromise = new Promise((resolve, reject) => {
			let settled = false;
			let connectListener;
			let disconnectListener;
			let authFailListener;
			const cleanup = () => {
				if (settled) return;
				settled = true;
				connectListener?.unbind();
				disconnectListener?.unbind();
				authFailListener?.unbind();
			};
			connectListener = client?.onConnect(() => {
				cleanup();
				resolve();
			});
			disconnectListener = client?.onDisconnect((_manually, reason) => {
				cleanup();
				reject(reason || /* @__PURE__ */ new Error("Disconnected"));
			});
			authFailListener = client?.onAuthenticationFailure(() => {
				cleanup();
				reject(/* @__PURE__ */ new Error("Authentication failed"));
			});
		});
		const timeout = new Promise((_, reject) => {
			setTimeout(() => reject(/* @__PURE__ */ new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
		});
		client.connect();
		await Promise.race([connectionPromise, timeout]);
		client.quit();
		client = void 0;
		return {
			ok: true,
			connected: true,
			username: account.username,
			channel: account.channel,
			elapsedMs: Date.now() - started
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
			username: account.username,
			channel: account.channel,
			elapsedMs: Date.now() - started
		};
	} finally {
		if (client) try {
			client.quit();
		} catch {}
	}
}
//#endregion
//#region node_modules/@twurple/api/lib/errors/ConfigError.js
/**
* Thrown whenever you try using invalid values in the client configuration.
*/
var ConfigError = class extends CustomError$1 {};
//#endregion
//#region node_modules/@twurple/api/lib/utils/HelixRateLimiter.js
/** @internal */
var HelixRateLimiter = class extends ResponseBasedRateLimiter {
	async doRequest({ options, clientId, accessToken, authorizationType, fetchOptions }) {
		return await callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions);
	}
	needsToRetryAfter(res) {
		if (res.status === 429 && (!res.headers.has("ratelimit-remaining") || Number(res.headers.get("ratelimit-remaining")) === 0)) return +res.headers.get("ratelimit-reset") * 1e3 - Date.now();
		return null;
	}
	getParametersFromResponse(res) {
		const { headers } = res;
		return {
			limit: +headers.get("ratelimit-limit"),
			remaining: +headers.get("ratelimit-remaining"),
			resetsAt: +headers.get("ratelimit-reset") * 1e3
		};
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/bits.external.js
/** @internal */
function createBitsLeaderboardQuery(params = {}) {
	const { count = 10, period = "all", startDate, contextUserId } = params;
	return {
		count: count.toString(),
		period,
		started_at: startDate?.toISOString(),
		user_id: contextUserId
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/BaseApi.js
init_tslib_es6();
/** @private */
var BaseApi = class {
	/** @internal */ _client;
	/** @internal */
	constructor(client) {
		this._client = client;
	}
	/** @internal */
	_getUserContextIdWithDefault(userId) {
		return this._client._getUserIdFromRequestContext(userId) ?? userId;
	}
};
__decorate([Enumerable(false)], BaseApi.prototype, "_client", void 0);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/bits/HelixBitsLeaderboardEntry.js
init_tslib_es6();
/**
* A Bits leaderboard entry.
*/
let HelixBitsLeaderboardEntry = class HelixBitsLeaderboardEntry extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user on the leaderboard.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user on the leaderboard.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user on the leaderboard.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* The position of the user on the leaderboard.
	*/
	get rank() {
		return this[rawDataSymbol].rank;
	}
	/**
	* The amount of bits used in the given period of time.
	*/
	get amount() {
		return this[rawDataSymbol].score;
	}
	/**
	* Gets the user of entry on the leaderboard.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixBitsLeaderboardEntry.prototype, "_client", void 0);
HelixBitsLeaderboardEntry = __decorate([rtfm("api", "HelixBitsLeaderboardEntry", "userId")], HelixBitsLeaderboardEntry);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/bits/HelixBitsLeaderboard.js
init_tslib_es6();
/**
* A leaderboard where the users who used the most bits to a broadcaster are listed.
*/
let HelixBitsLeaderboard = class HelixBitsLeaderboard extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The entries of the leaderboard.
	*/
	get entries() {
		return this[rawDataSymbol].data.map((entry) => new HelixBitsLeaderboardEntry(entry, this._client));
	}
	/**
	* The total amount of people on the requested leaderboard.
	*/
	get totalCount() {
		return this[rawDataSymbol].total;
	}
};
__decorate([Enumerable(false)], HelixBitsLeaderboard.prototype, "_client", void 0);
__decorate([CachedGetter()], HelixBitsLeaderboard.prototype, "entries", null);
HelixBitsLeaderboard = __decorate([Cacheable, rtfm("api", "HelixBitsLeaderboard")], HelixBitsLeaderboard);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/bits/HelixCheermoteList.js
init_tslib_es6();
/**
* A list of cheermotes you can use globally or in a specific channel, depending on how you fetched the list.
*
* @inheritDoc
*/
let HelixCheermoteList = class HelixCheermoteList extends DataObject {
	/** @internal */
	constructor(data) {
		super(indexBy(data, (action) => action.prefix.toLowerCase()));
	}
	/**
	* Gets the URL and color needed to properly represent a cheer of the given amount of bits with the given prefix.
	*
	* @param name The name/prefix of the cheermote.
	* @param bits The amount of bits cheered.
	* @param format The format of the cheermote you want to request.
	*/
	getCheermoteDisplayInfo(name, bits, format) {
		name = name.toLowerCase();
		const { background, state, scale } = format;
		const { tiers } = this[rawDataSymbol][name];
		const correctTier = tiers.sort((a, b) => b.min_bits - a.min_bits).find((tier) => tier.min_bits <= bits);
		if (!correctTier) throw new HellFreezesOverError(`Cheermote "${name}" does not have an applicable tier for ${bits} bits`);
		return {
			url: correctTier.images[background][state][scale],
			color: correctTier.color
		};
	}
	/**
	* Gets all possible cheermote names.
	*/
	getPossibleNames() {
		return Object.keys(this[rawDataSymbol]);
	}
};
HelixCheermoteList = __decorate([rtfm("api", "HelixCheermoteList")], HelixCheermoteList);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/bits/HelixBitsApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with bits.
*
* Can be accessed using `client.bits` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const leaderboard = await api.bits.getLeaderboard({ period: 'day' });
* ```
*
* @meta category helix
* @meta categorizedTitle Bits
*/
let HelixBitsApi = class HelixBitsApi extends BaseApi {
	/**
	* Gets a bits leaderboard of your channel.
	*
	* @param broadcaster The user to get the leaderboard of.
	* @param params
	* @expandParams
	*/
	async getLeaderboard(broadcaster, params = {}) {
		return new HelixBitsLeaderboard(await this._client.callApi({
			type: "helix",
			url: "bits/leaderboard",
			userId: extractUserId(broadcaster),
			scopes: ["bits:read"],
			query: createBitsLeaderboardQuery(params)
		}), this._client);
	}
	/**
	* Gets all available cheermotes.
	*
	* @param broadcaster The broadcaster to include custom cheermotes of.
	*
	* If not given, only get global cheermotes.
	*/
	async getCheermotes(broadcaster) {
		return new HelixCheermoteList((await this._client.callApi({
			type: "helix",
			url: "bits/cheermotes",
			userId: mapOptional(broadcaster, extractUserId),
			query: mapOptional(broadcaster, createBroadcasterQuery)
		})).data);
	}
};
HelixBitsApi = __decorate([rtfm("api", "HelixBitsApi")], HelixBitsApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/channel.external.js
/** @internal */
function createChannelUpdateBody(data) {
	return {
		game_id: data.gameId,
		broadcaster_language: data.language,
		title: data.title,
		delay: data.delay?.toString(),
		tags: data.tags,
		content_classification_labels: data.contentClassificationLabels,
		is_branded_content: data.isBrandedContent
	};
}
/** @internal */
function createChannelCommercialBody(broadcaster, length) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		length
	};
}
/** @internal */
function createChannelVipUpdateQuery(broadcaster, user) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		user_id: extractUserId(user)
	};
}
/** @internal */
function createChannelFollowerQuery(broadcaster, user) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		user_id: mapOptional(user, extractUserId)
	};
}
/** @internal */
function createFollowedChannelQuery(user, broadcaster) {
	return {
		broadcaster_id: mapOptional(broadcaster, extractUserId),
		user_id: extractUserId(user)
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/generic.external.js
/** @internal */
function createSingleKeyQuery(key, value) {
	return { [key]: value };
}
/** @internal */
function createUserQuery(user) {
	return { user_id: extractUserId(user) };
}
/** @internal */
function createModeratorActionQuery(broadcaster, moderatorId) {
	return {
		broadcaster_id: broadcaster,
		moderator_id: moderatorId
	};
}
/** @internal */
function createGetByIdsQuery(broadcaster, rewardIds) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		id: rewardIds
	};
}
/** @internal */
function createChannelUsersCheckQuery(broadcaster, users) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		user_id: users.map(extractUserId)
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/relations/HelixUserRelation.js
init_tslib_es6();
/**
* A relation of anything with a user.
*/
let HelixUserRelation = class HelixUserRelation extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get id() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user.
	*/
	get name() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user.
	*/
	get displayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets additional information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixUserRelation.prototype, "_client", void 0);
HelixUserRelation = __decorate([rtfm("api", "HelixUserRelation", "id")], HelixUserRelation);
//#endregion
//#region node_modules/@twurple/api/lib/utils/HelixRequestBatcher.js
init_tslib_es6();
/** @internal */
var HelixRequestBatcher = class {
	_callOptions;
	_queryParamName;
	_matchKey;
	_mapper;
	_limitPerRequest;
	_client;
	_requestedIds = [];
	_requestResolversById = /* @__PURE__ */ new Map();
	_delay;
	_waitTimer = null;
	constructor(_callOptions, _queryParamName, _matchKey, client, _mapper, _limitPerRequest = 100) {
		this._callOptions = _callOptions;
		this._queryParamName = _queryParamName;
		this._matchKey = _matchKey;
		this._mapper = _mapper;
		this._limitPerRequest = _limitPerRequest;
		this._client = client;
		this._delay = client._batchDelay;
	}
	async request(id) {
		const { promise, resolve, reject } = promiseWithResolvers();
		if (!this._requestedIds.includes(id)) this._requestedIds.push(id);
		if (this._requestResolversById.has(id)) this._requestResolversById.get(id).push({
			resolve,
			reject
		});
		else this._requestResolversById.set(id, [{
			resolve,
			reject
		}]);
		if (this._waitTimer) {
			clearTimeout(this._waitTimer);
			this._waitTimer = null;
		}
		if (this._requestedIds.length >= this._limitPerRequest) this._handleBatch(this._requestedIds.splice(0, this._limitPerRequest));
		else this._waitTimer = setTimeout(() => {
			this._handleBatch(this._requestedIds.splice(0, this._limitPerRequest));
		}, this._delay);
		return await promise;
	}
	async _handleBatch(ids) {
		try {
			const { data } = await this._doRequest(ids);
			const dataById = indexBy(data, this._matchKey);
			for (const id of ids) {
				for (const resolver of this._requestResolversById.get(id) ?? []) if (Object.prototype.hasOwnProperty.call(dataById, id)) resolver.resolve(this._mapper(dataById[id]));
				else resolver.resolve(null);
				this._requestResolversById.delete(id);
			}
		} catch (e) {
			await Promise.all(ids.map(async (id) => {
				try {
					const result = await this._doRequest([id]);
					for (const resolver of this._requestResolversById.get(id) ?? []) resolver.resolve(result.data.length ? this._mapper(result.data[0]) : null);
				} catch (e_) {
					for (const resolver of this._requestResolversById.get(id) ?? []) resolver.reject(e_);
				}
				this._requestResolversById.delete(id);
			}));
		}
	}
	async _doRequest(ids) {
		return await this._client.callApi({
			type: "helix",
			...this._callOptions,
			query: {
				...this._callOptions.query,
				[this._queryParamName]: ids
			}
		});
	}
};
__decorate([Enumerable(false)], HelixRequestBatcher.prototype, "_client", void 0);
//#endregion
//#region node_modules/@twurple/api/lib/utils/pagination/HelixPaginatedRequest.js
init_tslib_es6();
if (!Object.prototype.hasOwnProperty.call(Symbol, "asyncIterator")) Symbol.asyncIterator = Symbol.asyncIterator ?? Symbol.for("Symbol.asyncIterator");
/**
* Represents a request to the new Twitch API (Helix) that utilizes a cursor to paginate through its results.
*
* Aside from the methods described below, you can also utilize the async iterator using `for await .. of`:
*
* ```ts
* const result = client.videos.getVideosByUserPaginated('125328655');
* for await (const video of result) {
*     console.log(video.title);
* }
* ```
*/
let HelixPaginatedRequest = class HelixPaginatedRequest {
	_callOptions;
	_mapper;
	_limitPerPage;
	/** @internal */ _client;
	/** @internal */ _currentCursor;
	/** @internal */ _isFinished = false;
	/** @internal */ _currentData;
	/** @internal */
	constructor(_callOptions, client, _mapper, _limitPerPage = 100) {
		this._callOptions = _callOptions;
		this._mapper = _mapper;
		this._limitPerPage = _limitPerPage;
		this._client = client;
	}
	/**
	* The last fetched page of data associated to the requested resource.
	*
	* Only works with {@link HelixPaginatedRequest#getNext} and not with any other methods of data fetching.
	*/
	get current() {
		return this._currentData?.data;
	}
	/**
	* Gets the next available page of data associated to the requested resource, or an empty array if there are no more available pages.
	*/
	async getNext() {
		if (this._isFinished) return [];
		const result = await this._fetchData();
		if (!result.data?.length) {
			this._isFinished = true;
			return [];
		}
		return this._processResult(result);
	}
	/**
	* Gets all data associated to the requested resource.
	*
	* Be aware that this makes multiple calls to the Twitch API. Due to this, you might be more suspectible to rate limits.
	*
	* Also be aware that this resets the internal cursor, so avoid using this and {@link HelixPaginatedRequest#getNext}} together.
	*/
	async getAll() {
		this.reset();
		const result = [];
		do {
			const data = await this.getNext();
			if (!data.length) break;
			result.push(...data);
		} while (this._currentCursor);
		this.reset();
		return result;
	}
	/**
	* Gets the current cursor.
	*
	* Only useful if you want to make manual requests to the API.
	*/
	get currentCursor() {
		return this._currentCursor;
	}
	/**
	* Resets the internal cursor.
	*
	* This will make {@link HelixPaginatedRequest#getNext}} start from the first page again.
	*/
	reset() {
		this._currentCursor = void 0;
		this._isFinished = false;
		this._currentData = void 0;
	}
	async *[Symbol.asyncIterator]() {
		this.reset();
		while (true) {
			const data = await this.getNext();
			if (!data.length) break;
			yield* data[Symbol.iterator]();
		}
	}
	/** @internal */
	async _fetchData(additionalOptions = {}) {
		return await this._client.callApi({
			type: "helix",
			...this._callOptions,
			...additionalOptions,
			query: {
				...this._callOptions.query,
				after: this._currentCursor,
				first: this._limitPerPage.toString(),
				...additionalOptions.query
			}
		});
	}
	/** @internal */
	_processResult(result) {
		this._currentCursor = typeof result.pagination === "string" ? result.pagination : result.pagination?.cursor;
		if (this._currentCursor === void 0) this._isFinished = true;
		this._currentData = result;
		return result.data.reduce((acc, elem) => {
			const mapped = this._mapper(elem);
			return Array.isArray(mapped) ? [...acc, ...mapped] : [...acc, mapped];
		}, []);
	}
};
__decorate([Enumerable(false)], HelixPaginatedRequest.prototype, "_client", void 0);
HelixPaginatedRequest = __decorate([rtfm("api", "HelixPaginatedRequest")], HelixPaginatedRequest);
//#endregion
//#region node_modules/@twurple/api/lib/utils/pagination/HelixPaginatedRequestWithTotal.js
init_tslib_es6();
/**
* A special case of {@link HelixPaginatedRequest} with support for fetching the total number of entities, whenever an endpoint supports it.
*
* @inheritDoc
*/
let HelixPaginatedRequestWithTotal = class HelixPaginatedRequestWithTotal extends HelixPaginatedRequest {
	/**
	* Gets the total number of entities existing in the queried result set.
	*/
	async getTotalCount() {
		return (this._currentData ?? await this._fetchData({ query: { after: void 0 } })).total;
	}
};
HelixPaginatedRequestWithTotal = __decorate([rtfm("api", "HelixPaginatedRequestWithTotal")], HelixPaginatedRequestWithTotal);
//#endregion
//#region node_modules/@twurple/api/lib/utils/pagination/HelixPaginatedResult.js
/** @internal */ function createPaginatedResult(response, type, client) {
	let dataCache = void 0;
	return {
		get data() {
			return dataCache ??= response.data?.map((data) => new type(data, client)) ?? [];
		},
		cursor: typeof response.pagination === "string" ? response.pagination : response.pagination?.cursor
	};
}
/** @internal */ function createPaginatedResultWithTotal(response, type, client) {
	let dataCache = void 0;
	return {
		get data() {
			return dataCache ??= response.data?.map((data) => new type(data, client)) ?? [];
		},
		cursor: response.pagination.cursor,
		total: response.total
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/utils/pagination/HelixPagination.js
/** @internal */
function createPaginationQuery({ after, before, limit } = {}) {
	return {
		after,
		before,
		first: limit?.toString()
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixChannel.js
init_tslib_es6();
/**
* A Twitch channel.
*/
let HelixChannel = class HelixChannel extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the channel.
	*/
	get id() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the channel.
	*/
	get name() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the channel.
	*/
	get displayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster of the channel.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The language of the channel.
	*/
	get language() {
		return this[rawDataSymbol].broadcaster_language;
	}
	/**
	* The ID of the game currently played on the channel.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* The name of the game currently played on the channel.
	*/
	get gameName() {
		return this[rawDataSymbol].game_name;
	}
	/**
	* Gets information about the game that is being played on the stream.
	*/
	async getGame() {
		return this[rawDataSymbol].game_id ? checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id)) : null;
	}
	/**
	* The title of the channel.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The stream delay of the channel, in seconds.
	*
	* If you didn't request this with broadcaster access, this is always zero.
	*/
	get delay() {
		return this[rawDataSymbol].delay;
	}
	/**
	* The tags applied to the channel.
	*/
	get tags() {
		return this[rawDataSymbol].tags;
	}
	/**
	* The content classification labels applied to the channel.
	*/
	get contentClassificationLabels() {
		return this[rawDataSymbol].content_classification_labels;
	}
	/**
	* Whether the channel currently displays branded content (as specified by the broadcaster).
	*/
	get isBrandedContent() {
		return this[rawDataSymbol].is_branded_content;
	}
};
__decorate([Enumerable(false)], HelixChannel.prototype, "_client", void 0);
HelixChannel = __decorate([rtfm("api", "HelixChannel", "id")], HelixChannel);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixChannelEditor.js
init_tslib_es6();
/**
* An editor of a previously given channel.
*/
let HelixChannelEditor = class HelixChannelEditor extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The display name of the user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets additional information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The date when the user was given editor status.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
};
__decorate([Enumerable(false)], HelixChannelEditor.prototype, "_client", void 0);
HelixChannelEditor = __decorate([rtfm("api", "HelixChannelEditor", "userId")], HelixChannelEditor);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixChannelFollower.js
init_tslib_es6();
/**
* Represents a user that follows a channel.
*/
let HelixChannelFollower = class HelixChannelFollower extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets additional information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The date when the user followed the broadcaster.
	*/
	get followDate() {
		return new Date(this[rawDataSymbol].followed_at);
	}
};
__decorate([Enumerable(false)], HelixChannelFollower.prototype, "_client", void 0);
HelixChannelFollower = __decorate([rtfm("api", "HelixChannelFollower", "userId")], HelixChannelFollower);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixFollowedChannel.js
init_tslib_es6();
/**
* Represents a broadcaster that a user follows.
*/
let HelixFollowedChannel = class HelixFollowedChannel extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets additional information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The date when the user followed the broadcaster.
	*/
	get followDate() {
		return new Date(this[rawDataSymbol].followed_at);
	}
};
__decorate([Enumerable(false)], HelixFollowedChannel.prototype, "_client", void 0);
HelixFollowedChannel = __decorate([rtfm("api", "HelixFollowedChannel", "broadcasterId")], HelixFollowedChannel);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixAdSchedule.js
init_tslib_es6();
/**
* Represents a broadcaster's ad schedule.
*/
let HelixAdSchedule = class HelixAdSchedule extends DataObject {
	/**
	* The number of snoozes available for the broadcaster.
	*/
	get snoozeCount() {
		return this[rawDataSymbol].snooze_count;
	}
	/**
	* The date and time when the broadcaster will gain an additional snooze.
	* Returns `null` if all snoozes are already available.
	*/
	get snoozeRefreshDate() {
		return this[rawDataSymbol].snooze_refresh_at ? /* @__PURE__ */ new Date(this[rawDataSymbol].snooze_refresh_at * 1e3) : null;
	}
	/**
	* The date and time of the broadcaster's next scheduled ad.
	* Returns `null` if channel is not live or has no ad scheduled.
	*/
	get nextAdDate() {
		return this[rawDataSymbol].next_ad_at ? /* @__PURE__ */ new Date(this[rawDataSymbol].next_ad_at * 1e3) : null;
	}
	/**
	* The length in seconds of the scheduled upcoming ad break.
	*/
	get duration() {
		return this[rawDataSymbol].duration;
	}
	/**
	* The date and time of the broadcaster's last ad-break.
	* Returns `null` if channel is not live or has not run an ad.
	*/
	get lastAdDate() {
		return this[rawDataSymbol].last_ad_at ? /* @__PURE__ */ new Date(this[rawDataSymbol].last_ad_at * 1e3) : null;
	}
	/**
	* The amount of pre-roll free time remaining for the channel in seconds.
	*/
	get prerollFreeTime() {
		return this[rawDataSymbol].preroll_free_time;
	}
};
HelixAdSchedule = __decorate([rtfm("api", "HelixAdSchedule")], HelixAdSchedule);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixSnoozeNextAdResult.js
init_tslib_es6();
/**
* Represents the result after a call to snooze the broadcaster's ad schedule.
*/
let HelixSnoozeNextAdResult = class HelixSnoozeNextAdResult extends DataObject {
	/**
	* The number of snoozes remaining for the broadcaster.
	*/
	get snoozeCount() {
		return this[rawDataSymbol].snooze_count;
	}
	/**
	* The date and time when the broadcaster will gain an additional snooze.
	*/
	get snoozeRefreshDate() {
		return /* @__PURE__ */ new Date(this[rawDataSymbol].snooze_refresh_at * 1e3);
	}
	/**
	* The date and time of the broadcaster's next scheduled ad.
	*/
	get nextAdDate() {
		return /* @__PURE__ */ new Date(this[rawDataSymbol].next_ad_at * 1e3);
	}
};
HelixSnoozeNextAdResult = __decorate([rtfm("api", "HelixSnoozeNextAdResult")], HelixSnoozeNextAdResult);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixChannelApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with channels.
*
* Can be accessed using `client.channels` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const channel = await api.channels.getChannelInfoById('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Channels
*/
let HelixChannelApi = class HelixChannelApi extends BaseApi {
	/** @internal */
	_getChannelByIdBatcher = new HelixRequestBatcher({ url: "channels" }, "broadcaster_id", "broadcaster_id", this._client, (data) => new HelixChannel(data, this._client));
	/**
	* Gets the channel data for the given user.
	*
	* @param user The user you want to get channel info for.
	*/
	async getChannelInfoById(user) {
		const userId = extractUserId(user);
		return mapNullable((await this._client.callApi({
			type: "helix",
			url: "channels",
			userId,
			query: createBroadcasterQuery(userId)
		})).data[0], (data) => new HelixChannel(data, this._client));
	}
	/**
	* Gets the channel data for the given user, batching multiple calls into fewer requests as the API allows.
	*
	* @param user The user you want to get channel info for.
	*/
	async getChannelInfoByIdBatched(user) {
		return await this._getChannelByIdBatcher.request(extractUserId(user));
	}
	/**
	* Gets the channel data for the given users.
	*
	* @param users The users you want to get channel info for.
	*/
	async getChannelInfoByIds(users) {
		const userIds = users.map(extractUserId);
		return (await this._client.callApi({
			type: "helix",
			url: "channels",
			query: createSingleKeyQuery("broadcaster_id", userIds)
		})).data.map((data) => new HelixChannel(data, this._client));
	}
	/**
	* Updates the given user's channel data.
	*
	* @param user The user you want to update channel info for.
	* @param data The channel info to set.
	*/
	async updateChannelInfo(user, data) {
		await this._client.callApi({
			type: "helix",
			url: "channels",
			method: "PATCH",
			userId: extractUserId(user),
			scopes: ["channel:manage:broadcast"],
			query: createBroadcasterQuery(user),
			jsonBody: createChannelUpdateBody(data)
		});
	}
	/**
	* Starts a commercial on a channel.
	*
	* @param broadcaster The broadcaster on whose channel the commercial is started.
	* @param length The length of the commercial, in seconds.
	*/
	async startChannelCommercial(broadcaster, length) {
		await this._client.callApi({
			type: "helix",
			url: "channels/commercial",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:edit:commercial"],
			jsonBody: createChannelCommercialBody(broadcaster, length)
		});
	}
	/**
	* Gets a list of users who have editor permissions on your channel.
	*
	* @param broadcaster The broadcaster to retreive the editors for.
	*/
	async getChannelEditors(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "channels/editors",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:editors"],
			query: createBroadcasterQuery(broadcaster)
		})).data.map((data) => new HelixChannelEditor(data, this._client));
	}
	/**
	* Gets a list of VIPs in a channel.
	*
	* @param broadcaster The owner of the channel to get VIPs for.
	* @param pagination
	*
	* @expandParams
	*/
	async getVips(broadcaster, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "channels/vips",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:vips", "channel:manage:vips"],
			query: {
				...createBroadcasterQuery(broadcaster),
				...createPaginationQuery(pagination)
			}
		}), HelixUserRelation, this._client);
	}
	/**
	* Creates a paginator for VIPs in a channel.
	*
	* @param broadcaster The owner of the channel to get VIPs for.
	*/
	getVipsPaginated(broadcaster) {
		return new HelixPaginatedRequest({
			url: "channels/vips",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:vips", "channel:manage:vips"],
			query: createBroadcasterQuery(broadcaster)
		}, this._client, (data) => new HelixUserRelation(data, this._client));
	}
	/**
	* Checks the VIP status of a list of users in a channel.
	*
	* @param broadcaster The owner of the channel to check VIP status in.
	* @param users The users to check.
	*/
	async checkVipForUsers(broadcaster, users) {
		return (await this._client.callApi({
			type: "helix",
			url: "channels/vips",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:vips", "channel:manage:vips"],
			query: createChannelUsersCheckQuery(broadcaster, users)
		})).data.map((data) => new HelixUserRelation(data, this._client));
	}
	/**
	* Checks the VIP status of a user in a channel.
	*
	* @param broadcaster The owner of the channel to check VIP status in.
	* @param user The user to check.
	*/
	async checkVipForUser(broadcaster, user) {
		const userId = extractUserId(user);
		return (await this.checkVipForUsers(broadcaster, [userId])).some((rel) => rel.id === userId);
	}
	/**
	* Adds a VIP to the broadcaster’s chat room.
	*
	* @param broadcaster The broadcaster that’s granting VIP status to the user. This ID must match the user ID in the access token.
	* @param user The user to add as a VIP in the broadcaster’s chat room.
	*/
	async addVip(broadcaster, user) {
		await this._client.callApi({
			type: "helix",
			url: "channels/vips",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:vips"],
			query: createChannelVipUpdateQuery(broadcaster, user)
		});
	}
	/**
	* Removes a VIP from the broadcaster’s chat room.
	*
	* @param broadcaster The broadcaster that’s removing VIP status from the user. This ID must match the user ID in the access token.
	* @param user The user to remove as a VIP from the broadcaster’s chat room.
	*/
	async removeVip(broadcaster, user) {
		await this._client.callApi({
			type: "helix",
			url: "channels/vips",
			method: "DELETE",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:vips"],
			query: createChannelVipUpdateQuery(broadcaster, user)
		});
	}
	/**
	* Gets the total number of users that follow the specified broadcaster.
	*
	* @param broadcaster The broadcaster you want to get the number of followers of.
	*/
	async getChannelFollowerCount(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "channels/followers",
			method: "GET",
			userId: extractUserId(broadcaster),
			query: {
				...createChannelFollowerQuery(broadcaster),
				...createPaginationQuery({ limit: 1 })
			}
		})).total;
	}
	/**
	* Gets a list of users that follow the specified broadcaster.
	* You can also use this endpoint to see whether a specific user follows the broadcaster.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster you want to get a list of followers for.
	* @param user An optional user to determine if this user follows the broadcaster.
	* If specified, the response contains this user if they follow the broadcaster.
	* If not specified, the response contains all users that follow the broadcaster.
	* @param pagination
	*
	* @expandParams
	*/
	async getChannelFollowers(broadcaster, user, pagination) {
		return createPaginatedResultWithTotal(await this._client.callApi({
			type: "helix",
			url: "channels/followers",
			method: "GET",
			userId: extractUserId(broadcaster),
			canOverrideScopedUserContext: true,
			scopes: ["moderator:read:followers"],
			query: {
				...createChannelFollowerQuery(broadcaster, user),
				...createPaginationQuery(pagination)
			}
		}), HelixChannelFollower, this._client);
	}
	/**
	* Creates a paginator for users that follow the specified broadcaster.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster for whom you are getting a list of followers.
	*
	* @expandParams
	*/
	getChannelFollowersPaginated(broadcaster) {
		return new HelixPaginatedRequestWithTotal({
			url: "channels/followers",
			method: "GET",
			userId: extractUserId(broadcaster),
			canOverrideScopedUserContext: true,
			scopes: ["moderator:read:followers"],
			query: createChannelFollowerQuery(broadcaster)
		}, this._client, (data) => new HelixChannelFollower(data, this._client));
	}
	/**
	* Gets a list of broadcasters that the specified user follows.
	* You can also use this endpoint to see whether the user follows a specific broadcaster.
	*
	* @param user The user that's getting a list of followed channels.
	* This ID must match the user ID in the access token.
	* @param broadcaster An optional broadcaster to determine if the user follows this broadcaster.
	* If specified, the response contains this broadcaster if the user follows them.
	* If not specified, the response contains all broadcasters that the user follows.
	* @param pagination
	* @returns
	*/
	async getFollowedChannels(user, broadcaster, pagination) {
		return createPaginatedResultWithTotal(await this._client.callApi({
			type: "helix",
			url: "channels/followed",
			method: "GET",
			userId: extractUserId(user),
			scopes: ["user:read:follows"],
			query: {
				...createFollowedChannelQuery(user, broadcaster),
				...createPaginationQuery(pagination)
			}
		}), HelixFollowedChannel, this._client);
	}
	/**
	* Creates a paginator for broadcasters that the specified user follows.
	*
	* @param user The user that's getting a list of followed channels.
	* The token of this user will be used to get the list of followed channels.
	* @param broadcaster An optional broadcaster to determine if the user follows this broadcaster.
	* If specified, the response contains this broadcaster if the user follows them.
	* If not specified, the response contains all broadcasters that the user follows.
	* @returns
	*/
	getFollowedChannelsPaginated(user, broadcaster) {
		return new HelixPaginatedRequestWithTotal({
			url: "channels/followed",
			method: "GET",
			userId: extractUserId(user),
			scopes: ["user:read:follows"],
			query: createFollowedChannelQuery(user, broadcaster)
		}, this._client, (data) => new HelixFollowedChannel(data, this._client));
	}
	/**
	* Gets information about the broadcaster's ad schedule.
	*
	* @param broadcaster The broadcaster to get ad schedule information about.
	*/
	async getAdSchedule(broadcaster) {
		return new HelixAdSchedule((await this._client.callApi({
			type: "helix",
			url: "channels/ads",
			method: "GET",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:ads"],
			query: createBroadcasterQuery(broadcaster)
		})).data[0]);
	}
	/**
	* Snoozes the broadcaster's next ad, if a snooze is available.
	*
	* @param broadcaster The broadcaster to get ad schedule information about.
	*/
	async snoozeNextAd(broadcaster) {
		return new HelixSnoozeNextAdResult((await this._client.callApi({
			type: "helix",
			url: "channels/ads/schedule/snooze",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:ads"],
			query: createBroadcasterQuery(broadcaster)
		})).data[0]);
	}
};
__decorate([Enumerable(false)], HelixChannelApi.prototype, "_getChannelByIdBatcher", void 0);
HelixChannelApi = __decorate([rtfm("api", "HelixChannelApi")], HelixChannelApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/channelPoints.external.js
/** @internal */
function createCustomRewardsQuery(broadcaster, onlyManageable) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		only_manageable_rewards: onlyManageable?.toString()
	};
}
/** @internal */
function createCustomRewardChangeQuery(broadcaster, rewardId) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		id: rewardId
	};
}
/** @internal */
function createCustomRewardBody(data) {
	const result = {
		title: data.title,
		cost: data.cost,
		prompt: data.prompt,
		background_color: data.backgroundColor,
		is_enabled: data.isEnabled,
		is_user_input_required: data.userInputRequired,
		should_redemptions_skip_request_queue: data.autoFulfill
	};
	if (data.maxRedemptionsPerStream !== void 0) {
		result.is_max_per_stream_enabled = !!data.maxRedemptionsPerStream;
		result.max_per_stream = data.maxRedemptionsPerStream ?? 0;
	}
	if (data.maxRedemptionsPerUserPerStream !== void 0) {
		result.is_max_per_user_per_stream_enabled = !!data.maxRedemptionsPerUserPerStream;
		result.max_per_user_per_stream = data.maxRedemptionsPerUserPerStream ?? 0;
	}
	if (data.globalCooldown !== void 0) {
		result.is_global_cooldown_enabled = !!data.globalCooldown;
		result.global_cooldown_seconds = data.globalCooldown ?? 0;
	}
	if ("isPaused" in data) result.is_paused = data.isPaused;
	return result;
}
/** @internal */
function createRewardRedemptionsByIdsQuery(broadcaster, rewardId, redemptionIds) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		reward_id: rewardId,
		id: redemptionIds
	};
}
/** @internal */
function createRedemptionsForBroadcasterQuery(broadcaster, rewardId, status, filter) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		reward_id: rewardId,
		status,
		sort: filter.newestFirst ? "NEWEST" : "OLDEST"
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channelPoints/HelixCustomReward.js
init_tslib_es6();
/**
* A custom Channel Points reward.
*/
let HelixCustomReward = class HelixCustomReward extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the reward.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster the reward belongs to.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster the reward belongs to.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster the reward belongs to.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the reward's broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* Gets the URL of the image of the reward in the given scale.
	*
	* @param scale The scale of the image.
	*/
	getImageUrl(scale) {
		const urlProp = `url_${scale}x`;
		return this[rawDataSymbol].image?.[urlProp] ?? this[rawDataSymbol].default_image[urlProp];
	}
	/**
	* The background color of the reward.
	*/
	get backgroundColor() {
		return this[rawDataSymbol].background_color;
	}
	/**
	* Whether the reward is enabled (shown to users).
	*/
	get isEnabled() {
		return this[rawDataSymbol].is_enabled;
	}
	/**
	* The channel points cost of the reward.
	*/
	get cost() {
		return this[rawDataSymbol].cost;
	}
	/**
	* The title of the reward.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The prompt shown to users when redeeming the reward.
	*/
	get prompt() {
		return this[rawDataSymbol].prompt;
	}
	/**
	* Whether the reward requires user input to be redeemed.
	*/
	get userInputRequired() {
		return this[rawDataSymbol].is_user_input_required;
	}
	/**
	* The maximum number of redemptions of the reward per stream. `null` means no limit.
	*/
	get maxRedemptionsPerStream() {
		return this[rawDataSymbol].max_per_stream_setting.is_enabled ? this[rawDataSymbol].max_per_stream_setting.max_per_stream : null;
	}
	/**
	* The maximum number of redemptions of the reward per stream for each user. `null` means no limit.
	*/
	get maxRedemptionsPerUserPerStream() {
		return this[rawDataSymbol].max_per_user_per_stream_setting.is_enabled ? this[rawDataSymbol].max_per_user_per_stream_setting.max_per_user_per_stream : null;
	}
	/**
	* The cooldown between two redemptions of the reward, in seconds. `null` means no cooldown.
	*/
	get globalCooldown() {
		return this[rawDataSymbol].global_cooldown_setting.is_enabled ? this[rawDataSymbol].global_cooldown_setting.global_cooldown_seconds : null;
	}
	/**
	* Whether the reward is paused. If true, users can't redeem it.
	*/
	get isPaused() {
		return this[rawDataSymbol].is_paused;
	}
	/**
	* Whether the reward is currently in stock.
	*/
	get isInStock() {
		return this[rawDataSymbol].is_in_stock;
	}
	/**
	* How often the reward was already redeemed this stream.
	*
	* Only available when the stream is live and `maxRedemptionsPerStream` is set. Otherwise, this is `null`.
	*/
	get redemptionsThisStream() {
		return this[rawDataSymbol].redemptions_redeemed_current_stream;
	}
	/**
	* Whether redemptions should automatically be marked as fulfilled.
	*/
	get autoFulfill() {
		return this[rawDataSymbol].should_redemptions_skip_request_queue;
	}
	/**
	* The time when the cooldown ends. `null` means there is currently no cooldown.
	*/
	get cooldownExpiryDate() {
		return this[rawDataSymbol].cooldown_expires_at ? new Date(this[rawDataSymbol].cooldown_expires_at) : null;
	}
};
__decorate([Enumerable(false)], HelixCustomReward.prototype, "_client", void 0);
HelixCustomReward = __decorate([rtfm("api", "HelixCustomReward", "id")], HelixCustomReward);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channelPoints/HelixCustomRewardRedemption.js
init_tslib_es6();
/**
* A redemption of a custom Channel Points reward.
*/
let HelixCustomRewardRedemption = class HelixCustomRewardRedemption extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the redemption.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster where the reward was redeemed.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster where the reward was redeemed.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster where the reward was redeemed.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster where the reward was redeemed.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The ID of the user that redeemed the reward.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user that redeemed the reward.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user that redeemed the reward.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the user that redeemed the reward.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The text the user wrote when redeeming the reward.
	*/
	get userInput() {
		return this[rawDataSymbol].user_input;
	}
	/**
	* Whether the redemption was fulfilled.
	*/
	get isFulfilled() {
		return this[rawDataSymbol].status === "FULFILLED";
	}
	/**
	* Whether the redemption was canceled.
	*/
	get isCanceled() {
		return this[rawDataSymbol].status === "CANCELED";
	}
	/**
	* The date and time when the reward was redeemed.
	*/
	get redemptionDate() {
		return new Date(this[rawDataSymbol].redeemed_at);
	}
	/**
	* The ID of the reward that was redeemed.
	*/
	get rewardId() {
		return this[rawDataSymbol].reward.id;
	}
	/**
	* The title of the reward that was redeemed.
	*/
	get rewardTitle() {
		return this[rawDataSymbol].reward.title;
	}
	/**
	* The prompt of the reward that was redeemed.
	*/
	get rewardPrompt() {
		return this[rawDataSymbol].reward.prompt;
	}
	/**
	* The cost of the reward that was redeemed.
	*/
	get rewardCost() {
		return this[rawDataSymbol].reward.cost;
	}
	/**
	* Gets more information about the reward that was redeemed.
	*/
	async getReward() {
		return checkRelationAssertion(await this._client.channelPoints.getCustomRewardById(this[rawDataSymbol].broadcaster_id, this[rawDataSymbol].reward.id));
	}
	/**
	* Updates the redemption's status.
	*
	* @param newStatus The status the redemption should have.
	*/
	async updateStatus(newStatus) {
		return (await this._client.channelPoints.updateRedemptionStatusByIds(this[rawDataSymbol].broadcaster_id, this[rawDataSymbol].reward.id, [this[rawDataSymbol].id], newStatus))[0];
	}
};
__decorate([Enumerable(false)], HelixCustomRewardRedemption.prototype, "_client", void 0);
HelixCustomRewardRedemption = __decorate([rtfm("api", "HelixCustomRewardRedemption", "id")], HelixCustomRewardRedemption);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channelPoints/HelixChannelPointsApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with channel points.
*
* Can be accessed using `client.channelPoints` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const rewards = await api.channelPoints.getCustomRewards('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Channel points
*/
let HelixChannelPointsApi = class HelixChannelPointsApi extends BaseApi {
	/**
	* Gets all custom rewards for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get the rewards for.
	* @param onlyManageable Whether to only get rewards that can be managed by the API.
	*/
	async getCustomRewards(broadcaster, onlyManageable) {
		return (await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
			query: createCustomRewardsQuery(broadcaster, onlyManageable)
		})).data.map((data) => new HelixCustomReward(data, this._client));
	}
	/**
	* Gets custom rewards by IDs.
	*
	* @param broadcaster The broadcaster to get the rewards for.
	* @param rewardIds The IDs of the rewards.
	*/
	async getCustomRewardsByIds(broadcaster, rewardIds) {
		if (!rewardIds.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
			query: createGetByIdsQuery(broadcaster, rewardIds)
		})).data.map((data) => new HelixCustomReward(data, this._client));
	}
	/**
	* Gets a custom reward by ID.
	*
	* @param broadcaster The broadcaster to get the reward for.
	* @param rewardId The ID of the reward.
	*/
	async getCustomRewardById(broadcaster, rewardId) {
		const rewards = await this.getCustomRewardsByIds(broadcaster, [rewardId]);
		return rewards.length ? rewards[0] : null;
	}
	/**
	* Creates a new custom reward.
	*
	* @param broadcaster The broadcaster to create the reward for.
	* @param data The reward data.
	*
	* @expandParams
	*/
	async createCustomReward(broadcaster, data) {
		return new HelixCustomReward((await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:redemptions"],
			query: createBroadcasterQuery(broadcaster),
			jsonBody: createCustomRewardBody(data)
		})).data[0], this._client);
	}
	/**
	* Updates a custom reward.
	*
	* @param broadcaster The broadcaster to update the reward for.
	* @param rewardId The ID of the reward.
	* @param data The reward data.
	*/
	async updateCustomReward(broadcaster, rewardId, data) {
		return new HelixCustomReward((await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:redemptions"],
			query: createCustomRewardChangeQuery(broadcaster, rewardId),
			jsonBody: createCustomRewardBody(data)
		})).data[0], this._client);
	}
	/**
	* Deletes a custom reward.
	*
	* @param broadcaster The broadcaster to delete the reward for.
	* @param rewardId The ID of the reward.
	*/
	async deleteCustomReward(broadcaster, rewardId) {
		await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards",
			method: "DELETE",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:redemptions"],
			query: createCustomRewardChangeQuery(broadcaster, rewardId)
		});
	}
	/**
	* Gets custom reward redemptions by IDs.
	*
	* @param broadcaster The broadcaster to get the redemptions for.
	* @param rewardId The ID of the reward.
	* @param redemptionIds The IDs of the redemptions.
	*/
	async getRedemptionsByIds(broadcaster, rewardId, redemptionIds) {
		if (!redemptionIds.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards/redemptions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
			query: createRewardRedemptionsByIdsQuery(broadcaster, rewardId, redemptionIds)
		})).data.map((data) => new HelixCustomRewardRedemption(data, this._client));
	}
	/**
	* Gets a custom reward redemption by ID.
	*
	* @param broadcaster The broadcaster to get the redemption for.
	* @param rewardId The ID of the reward.
	* @param redemptionId The ID of the redemption.
	*/
	async getRedemptionById(broadcaster, rewardId, redemptionId) {
		const redemptions = await this.getRedemptionsByIds(broadcaster, rewardId, [redemptionId]);
		return redemptions.length ? redemptions[0] : null;
	}
	/**
	* Gets custom reward redemptions for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get the redemptions for.
	* @param rewardId The ID of the reward.
	* @param status The status of the redemptions to get.
	* @param filter
	*
	* @expandParams
	*/
	async getRedemptionsForBroadcaster(broadcaster, rewardId, status, filter) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards/redemptions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
			query: {
				...createRedemptionsForBroadcasterQuery(broadcaster, rewardId, status, filter),
				...createPaginationQuery(filter)
			}
		}), HelixCustomRewardRedemption, this._client);
	}
	/**
	* Creates a paginator for custom reward redemptions for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get the redemptions for.
	* @param rewardId The ID of the reward.
	* @param status The status of the redemptions to get.
	* @param filter
	*
	* @expandParams
	*/
	getRedemptionsForBroadcasterPaginated(broadcaster, rewardId, status, filter) {
		return new HelixPaginatedRequest({
			url: "channel_points/custom_rewards/redemptions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:redemptions", "channel:manage:redemptions"],
			query: createRedemptionsForBroadcasterQuery(broadcaster, rewardId, status, filter)
		}, this._client, (data) => new HelixCustomRewardRedemption(data, this._client), 50);
	}
	/**
	* Updates the status of the given redemptions by IDs.
	*
	* @param broadcaster The broadcaster to update the redemptions for.
	* @param rewardId The ID of the reward.
	* @param redemptionIds The IDs of the redemptions to update.
	* @param status The status to set for the redemptions.
	*/
	async updateRedemptionStatusByIds(broadcaster, rewardId, redemptionIds, status) {
		if (!redemptionIds.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "channel_points/custom_rewards/redemptions",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:redemptions"],
			query: createRewardRedemptionsByIdsQuery(broadcaster, rewardId, redemptionIds),
			jsonBody: { status }
		})).data.map((data) => new HelixCustomRewardRedemption(data, this._client));
	}
};
HelixChannelPointsApi = __decorate([rtfm("api", "HelixChannelPointsApi")], HelixChannelPointsApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/charity/HelixCharityCampaignAmount.js
init_tslib_es6();
/**
* An object representing monetary amount and currency information for charity donations/goals.
*/
let HelixCharityCampaignAmount = class HelixCharityCampaignAmount extends DataObject {
	/**
	* The monetary amount. The amount is specified in the currency’s minor unit.
	* For example, the minor units for USD is cents, so if the amount is $5.50 USD, `value` is set to 550.
	*/
	get value() {
		return this[rawDataSymbol].value;
	}
	/**
	* The number of decimal places used by the currency. For example, USD uses two decimal places.
	* Use this number to translate `value` from minor units to major units by using the formula:
	*
	* `value / 10^decimalPlaces`
	*/
	get decimalPlaces() {
		return this[rawDataSymbol].decimal_places;
	}
	/**
	* The localized monetary amount based on the value and the decimal places of the currency.
	* For example, the minor units for USD is cents which uses two decimal places, so if `value` is 550, `localizedValue` is set to 5.50.
	*/
	get localizedValue() {
		return this.value / 10 ** this.decimalPlaces;
	}
	/**
	* The ISO-4217 three-letter currency code that identifies the type of currency in `value`.
	*/
	get currency() {
		return this[rawDataSymbol].currency;
	}
};
HelixCharityCampaignAmount = __decorate([rtfm("api", "HelixCharityCampaignAmount")], HelixCharityCampaignAmount);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/charity/HelixCharityCampaign.js
init_tslib_es6();
/**
* A charity campaign in a Twitch channel.
*/
let HelixCharityCampaign = class HelixCharityCampaign extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* An ID that identifies the charity campaign.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The name of the charity.
	*/
	get charityName() {
		return this[rawDataSymbol].charity_name;
	}
	/**
	* A description of the charity.
	*/
	get charityDescription() {
		return this[rawDataSymbol].charity_description;
	}
	/**
	* A URL to an image of the charity's logo. The image’s type is PNG and its size is 100px X 100px.
	*/
	get charityLogo() {
		return this[rawDataSymbol].charity_logo;
	}
	/**
	* A URL to the charity’s website.
	*/
	get charityWebsite() {
		return this[rawDataSymbol].charity_website;
	}
	/**
	* An object that contains the current amount of donations that the campaign has received.
	*/
	get currentAmount() {
		return new HelixCharityCampaignAmount(this[rawDataSymbol].current_amount);
	}
	/**
	* An object that contains the campaign’s target fundraising goal.
	*/
	get targetAmount() {
		return new HelixCharityCampaignAmount(this[rawDataSymbol].target_amount);
	}
};
__decorate([Enumerable(false)], HelixCharityCampaign.prototype, "_client", void 0);
HelixCharityCampaign = __decorate([rtfm("api", "HelixCharityCampaign", "id")], HelixCharityCampaign);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/charity/HelixCharityCampaignDonation.js
init_tslib_es6();
/**
* A donation to a charity campaign in a Twitch channel.
*/
let HelixCharityCampaignDonation = class HelixCharityCampaignDonation extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* An ID that identifies the charity campaign.
	*/
	get campaignId() {
		return this[rawDataSymbol].campaign_id;
	}
	/**
	* The ID of the donating user.
	*/
	get donorId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the donating user.
	*/
	get donorName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the donating user.
	*/
	get donorDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the donating user.
	*/
	async getDonor() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* An object that contains the amount of money that the user donated.
	*/
	get amount() {
		return new HelixCharityCampaignAmount(this[rawDataSymbol].amount);
	}
};
__decorate([Enumerable(false)], HelixCharityCampaignDonation.prototype, "_client", void 0);
HelixCharityCampaignDonation = __decorate([rtfm("api", "HelixCharityCampaignDonation")], HelixCharityCampaignDonation);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/charity/HelixCharityApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with charity campaigns.
*
* Can be accessed using `client.charity` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const charityCampaign = await api.charity.getCharityCampaign('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Charity Campaigns
*/
let HelixCharityApi = class HelixCharityApi extends BaseApi {
	/**
	* Gets information about the charity campaign that a broadcaster is running.
	* Returns null if the specified broadcaster has no active charity campaign.
	*
	* @param broadcaster The broadcaster to get charity campaign information about.
	*/
	async getCharityCampaign(broadcaster) {
		return new HelixCharityCampaign((await this._client.callApi({
			type: "helix",
			url: "charity/campaigns",
			method: "GET",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:charity"],
			query: createBroadcasterQuery(broadcaster)
		})).data[0], this._client);
	}
	/**
	* Gets the list of donations that users have made to the broadcaster’s active charity campaign.
	*
	* @param broadcaster The broadcaster to get charity campaign donation information about.
	* @param pagination
	*
	* @expandParams
	*/
	async getCharityCampaignDonations(broadcaster, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "charity/donations",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:charity"],
			query: {
				...createBroadcasterQuery(broadcaster),
				...createPaginationQuery(pagination)
			}
		}), HelixCharityCampaignDonation, this._client);
	}
};
HelixCharityApi = __decorate([rtfm("api", "HelixCharityApi")], HelixCharityApi);
//#endregion
//#region node_modules/@twurple/api/lib/errors/ChatMessageDroppedError.js
/**
* Thrown when a chat message is dropped and not delivered to the target channel.
*/
var ChatMessageDroppedError = class extends CustomError$1 {
	_code;
	constructor(broadcasterId, message, code) {
		super(`Chat message to channel ${broadcasterId} dropped: ${message ?? "unknown reason"}`);
		this._code = code;
	}
	get code() {
		return this._code;
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/chat.external.js
/** @internal */
function createChatSettingsUpdateBody(settings) {
	return {
		slow_mode: settings.slowModeEnabled,
		slow_mode_wait_time: settings.slowModeDelay,
		follower_mode: settings.followerOnlyModeEnabled,
		follower_mode_duration: settings.followerOnlyModeDelay,
		subscriber_mode: settings.subscriberOnlyModeEnabled,
		emote_mode: settings.emoteOnlyModeEnabled,
		unique_chat_mode: settings.uniqueChatModeEnabled,
		non_moderator_chat_delay: settings.nonModeratorChatDelayEnabled,
		non_moderator_chat_delay_duration: settings.nonModeratorChatDelay
	};
}
/** @internal */
function createChatColorUpdateQuery(user, color) {
	return {
		user_id: extractUserId(user),
		color
	};
}
/** @internal */
function createShoutoutQuery(from, to, moderatorId) {
	return {
		from_broadcaster_id: extractUserId(from),
		to_broadcaster_id: extractUserId(to),
		moderator_id: moderatorId
	};
}
/** @internal */
function createSendChatMessageQuery(broadcaster, sender) {
	return {
		broadcaster_id: broadcaster,
		sender_id: sender
	};
}
/** @internal */
function createSendChatMessageBody(message, params) {
	return {
		message,
		reply_parent_message_id: params?.replyParentMessageId
	};
}
/** @internal */
function createSendChatMessageAsAppBody(message, params) {
	return {
		message,
		reply_parent_message_id: params?.replyParentMessageId,
		for_source_only: params?.forSourceOnly
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/shared-chat-session.external.js
/** @internal */
function createSharedChatSessionQuery(broadcaster) {
	return { broadcaster_id: extractUserId(broadcaster) };
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixEmoteBase.js
/** @private */
var HelixEmoteBase = class extends DataObject {
	/**
	* The ID of the emote.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the emote.
	*/
	get name() {
		return this[rawDataSymbol].name;
	}
	/**
	* The formats that the emote is available in.
	*/
	get formats() {
		return this[rawDataSymbol].format;
	}
	/**
	* The scales that the emote is available in.
	*/
	get scales() {
		return this[rawDataSymbol].scale;
	}
	/**
	* The theme modes that the emote is available in.
	*/
	get themeModes() {
		return this[rawDataSymbol].theme_mode;
	}
	/**
	* Gets the URL of the emote image in static format at the given scale and theme mode, or null if a static emote image at that scale/theme mode doesn't exist.
	*
	* @param scale The scale of the image.
	* @param themeMode The theme mode of the image, either `light` or `dark`.
	*/
	getStaticImageUrl(scale = "1.0", themeMode = "light") {
		if (this[rawDataSymbol].format.includes("static") && this[rawDataSymbol].scale.includes(scale)) return this.getFormattedImageUrl(scale, "static", themeMode);
		return null;
	}
	/**
	* Gets the URL of the emote image in animated format at the given scale and theme mode, or null if an animated emote image at that scale/theme mode doesn't exist.
	*
	* @param scale The scale of the image.
	* @param themeMode The theme mode of the image, either `light` or `dark`.
	*/
	getAnimatedImageUrl(scale = "1.0", themeMode = "light") {
		if (this[rawDataSymbol].format.includes("animated") && this[rawDataSymbol].scale.includes(scale)) return this.getFormattedImageUrl(scale, "animated", themeMode);
		return null;
	}
	/**
	* Gets the URL of the emote image in the given scale, format, and theme mode.
	*
	* @param scale The scale of the image, either `1.0` (small), `2.0` (medium), or `3.0` (large).
	* @param format The format of the image, either `static` or `animated`.
	* @param themeMode The theme mode of the image, either `light` or `dark`.
	*/
	getFormattedImageUrl(scale = "1.0", format = "static", themeMode = "light") {
		return `https://static-cdn.jtvnw.net/emoticons/v2/${this[rawDataSymbol].id}/${format}/${themeMode}/${scale}`;
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixEmote.js
init_tslib_es6();
/**
* A Twitch emote.
*/
let HelixEmote = class HelixEmote extends HelixEmoteBase {
	/**
	* Gets the URL of the emote image in the given scale.
	*
	* @param scale The scale of the image.
	*/
	getImageUrl(scale) {
		return this[rawDataSymbol].images[`url_${scale}x`];
	}
};
HelixEmote = __decorate([rtfm("api", "HelixEmote", "id")], HelixEmote);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChannelEmote.js
init_tslib_es6();
/**
* A Twitch Channel emote.
*
* @inheritDoc
*/
let HelixChannelEmote = class HelixChannelEmote extends HelixEmote {
	/** @internal */ _client;
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The subscription tier necessary to unlock the emote, or null if the emote is not a subscription emote.
	*/
	get tier() {
		return this[rawDataSymbol].tier || null;
	}
	/**
	* The type of the emote.
	*
	* There are many types of emotes that Twitch seems to arbitrarily assign. Do not rely on this value.
	*/
	get type() {
		return this[rawDataSymbol].emote_type;
	}
	/**
	* The ID of the emote set the emote is part of.
	*/
	get emoteSetId() {
		return this[rawDataSymbol].emote_set_id;
	}
	/**
	* Gets all emotes from the emote's set.
	*/
	async getAllEmotesFromSet() {
		return await this._client.chat.getEmotesFromSets([this[rawDataSymbol].emote_set_id]);
	}
};
__decorate([Enumerable(false)], HelixChannelEmote.prototype, "_client", void 0);
HelixChannelEmote = __decorate([rtfm("api", "HelixChannelEmote", "id")], HelixChannelEmote);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChatBadgeVersion.js
init_tslib_es6();
/**
* A version of a chat badge.
*/
let HelixChatBadgeVersion = class HelixChatBadgeVersion extends DataObject {
	/**
	* The badge version ID.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* Gets an image URL for the given scale.
	*
	* @param scale The scale of the badge image.
	*/
	getImageUrl(scale) {
		return this[rawDataSymbol][`image_url_${scale}x`];
	}
	/**
	* The title of the badge.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The description of the badge.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The action to take when clicking on the badge. Set to `null` if no action is specified.
	*/
	get clickAction() {
		return this[rawDataSymbol].click_action;
	}
	/**
	* The URL to navigate to when clicking on the badge. Set to `null` if no URL is specified.
	*/
	get clickUrl() {
		return this[rawDataSymbol].click_url;
	}
};
HelixChatBadgeVersion = __decorate([rtfm("api", "HelixChatBadgeVersion", "id")], HelixChatBadgeVersion);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChatBadgeSet.js
init_tslib_es6();
/**
* A version of a chat badge.
*/
let HelixChatBadgeSet = class HelixChatBadgeSet extends DataObject {
	/**
	* The badge set ID.
	*/
	get id() {
		return this[rawDataSymbol].set_id;
	}
	/**
	* All versions of the badge.
	*/
	get versions() {
		return this[rawDataSymbol].versions.map((data) => new HelixChatBadgeVersion(data));
	}
	/**
	* Gets a specific version of the badge.
	*
	* @param versionId The ID of the version.
	*/
	getVersion(versionId) {
		return this.versions.find((v) => v.id === versionId) ?? null;
	}
};
__decorate([CachedGetter()], HelixChatBadgeSet.prototype, "versions", null);
HelixChatBadgeSet = __decorate([Cacheable, rtfm("api", "HelixChatBadgeSet", "id")], HelixChatBadgeSet);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChatChatter.js
init_tslib_es6();
/**
* A user connected to a Twitch channel's chat session.
*/
let HelixChatChatter = class HelixChatChatter extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixChatChatter.prototype, "_client", void 0);
HelixChatChatter = __decorate([rtfm("api", "HelixChatChatter")], HelixChatChatter);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChatSettings.js
init_tslib_es6();
/**
* The settings of a broadcaster's chat.
*/
let HelixChatSettings = class HelixChatSettings extends DataObject {
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* Whether slow mode is enabled.
	*/
	get slowModeEnabled() {
		return this[rawDataSymbol].slow_mode;
	}
	/**
	* The time to wait between messages in slow mode, in seconds.
	*
	* Is `null` if slow mode is not enabled.
	*/
	get slowModeDelay() {
		return this[rawDataSymbol].slow_mode_wait_time;
	}
	/**
	* Whether follower only mode is enabled.
	*/
	get followerOnlyModeEnabled() {
		return this[rawDataSymbol].follower_mode;
	}
	/**
	* The time after which users are able to send messages after following, in minutes.
	*
	* Is `null` if follower only mode is not enabled,
	* but may also be `0` if you can send messages immediately after following.
	*/
	get followerOnlyModeDelay() {
		return this[rawDataSymbol].follower_mode_duration;
	}
	/**
	* Whether subscriber only mode is enabled.
	*/
	get subscriberOnlyModeEnabled() {
		return this[rawDataSymbol].subscriber_mode;
	}
	/**
	* Whether emote only mode is enabled.
	*/
	get emoteOnlyModeEnabled() {
		return this[rawDataSymbol].emote_mode;
	}
	/**
	* Whether unique chat mode is enabled.
	*/
	get uniqueChatModeEnabled() {
		return this[rawDataSymbol].unique_chat_mode;
	}
};
HelixChatSettings = __decorate([rtfm("api", "HelixChatSettings", "broadcasterId")], HelixChatSettings);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixEmoteFromSet.js
init_tslib_es6();
/**
* A Twitch Channel emote.
*
* @inheritDoc
*/
let HelixEmoteFromSet = class HelixEmoteFromSet extends HelixEmote {
	/** @internal */ _client;
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The type of the emote.
	*
	* Known values are: `subscriptions`, `bitstier`, `follower`, `rewards`, `globals`, `smilies`, `prime`, `limitedtime`.
	*
	* This list may be non-exhaustive.
	*/
	get type() {
		return this[rawDataSymbol].emote_type;
	}
	/**
	* The ID of the emote set the emote is part of.
	*/
	get emoteSetId() {
		return this[rawDataSymbol].emote_set_id;
	}
	/**
	* The ID of the user that owns the emote, or null if the emote is not owned by a user.
	*/
	get ownerId() {
		switch (this[rawDataSymbol].owner_id) {
			case "0":
			case "twitch": return null;
			default: return this[rawDataSymbol].owner_id;
		}
	}
	/**
	* Gets more information about the user that owns the emote, or null if the emote is not owned by a user.
	*/
	async getOwner() {
		switch (this[rawDataSymbol].owner_id) {
			case "0":
			case "twitch": return null;
			default: return await this._client.users.getUserById(this[rawDataSymbol].owner_id);
		}
	}
};
__decorate([Enumerable(false)], HelixEmoteFromSet.prototype, "_client", void 0);
HelixEmoteFromSet = __decorate([rtfm("api", "HelixEmoteFromSet", "id")], HelixEmoteFromSet);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixPrivilegedChatSettings.js
init_tslib_es6();
/**
* The settings of a broadcaster's chat, with additional privileged data.
*/
let HelixPrivilegedChatSettings = class HelixPrivilegedChatSettings extends HelixChatSettings {
	/**
	* Whether non-moderator messages are delayed.
	*/
	get nonModeratorChatDelayEnabled() {
		return this[rawDataSymbol].non_moderator_chat_delay;
	}
	/**
	* The delay of non-moderator messages, in seconds.
	*
	* Is `null` if non-moderator message delay is disabled.
	*/
	get nonModeratorChatDelay() {
		return this[rawDataSymbol].non_moderator_chat_delay_duration;
	}
};
HelixPrivilegedChatSettings = __decorate([rtfm("api", "HelixPrivilegedChatSettings", "broadcasterId")], HelixPrivilegedChatSettings);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixSentChatMessage.js
init_tslib_es6();
/**
* Information about a sent Twitch chat message.
*/
let HelixSentChatMessage = class HelixSentChatMessage extends DataObject {
	/**
	* The message ID of the sent message.
	*/
	get id() {
		return this[rawDataSymbol].message_id;
	}
	/**
	* If the message passed all checks and was sent.
	*/
	get isSent() {
		return this[rawDataSymbol].is_sent;
	}
	/**
	* The reason code for why the chat message was dropped, if dropped.
	*/
	get dropReasonCode() {
		return this[rawDataSymbol].drop_reason?.code;
	}
	/**
	* The reason message for why the chat message was dropped, if dropped.
	*/
	get dropReasonMessage() {
		return this[rawDataSymbol].drop_reason?.message;
	}
};
HelixSentChatMessage = __decorate([rtfm("api", "HelixSentChatMessage", "id")], HelixSentChatMessage);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixSharedChatSessionParticipant.js
init_tslib_es6();
/**
* A shared chat session participant.
*/
let HelixSharedChatSessionParticipant = class HelixSharedChatSessionParticipant extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the participant broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* Gets information about the participant broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
};
__decorate([Enumerable(false)], HelixSharedChatSessionParticipant.prototype, "_client", void 0);
HelixSharedChatSessionParticipant = __decorate([rtfm("api", "HelixSharedChatSessionParticipant", "broadcasterId")], HelixSharedChatSessionParticipant);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixSharedChatSession.js
init_tslib_es6();
/**
* A shared chat session.
*/
let HelixSharedChatSession = class HelixSharedChatSession extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The unique identifier for the shared chat session.
	*/
	get sessionId() {
		return this[rawDataSymbol].session_id;
	}
	/**
	* The ID of the host broadcaster.
	*/
	get hostBroadcasterId() {
		return this[rawDataSymbol].host_broadcaster_id;
	}
	/**
	* Gets information about the host broadcaster.
	*/
	async getHostBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].host_broadcaster_id));
	}
	/**
	* The list of participants in the session.
	*/
	get participants() {
		return this[rawDataSymbol].participants.map((data) => new HelixSharedChatSessionParticipant(data, this._client));
	}
	/**
	* The date for when the session was created.
	*/
	get createdDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date for when the session was updated.
	*/
	get updatedDate() {
		return new Date(this[rawDataSymbol].updated_at);
	}
};
__decorate([Enumerable(false)], HelixSharedChatSession.prototype, "_client", void 0);
HelixSharedChatSession = __decorate([rtfm("api", "HelixSharedChatSession", "sessionId")], HelixSharedChatSession);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixUserEmote.js
init_tslib_es6();
/**
* A Twitch user emote.
*/
let HelixUserEmote = class HelixUserEmote extends HelixEmoteBase {
	/** @internal */ _client;
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The type of the emote.
	*
	* There are many types of emotes that Twitch seems to arbitrarily assign.
	* Check the relevant values in the official documentation.
	*
	* @see https://dev.twitch.tv/docs/api/reference/#get-user-emotes
	*/
	get type() {
		return this[rawDataSymbol].emote_type;
	}
	/**
	* The ID that identifies the emote set that the emote belongs to, or `null` if the emote is not from any set.
	*/
	get emoteSetId() {
		return this[rawDataSymbol].emote_set_id || null;
	}
	/**
	* The ID of the broadcaster who owns the emote, or `null` if the emote has no owner, e.g. it's a global emote.
	*/
	get ownerId() {
		return this[rawDataSymbol].owner_id || null;
	}
	/**
	* Gets all emotes from the emotes set, or `null` if emote is not from any set.
	*/
	async getAllEmotesFromSet() {
		return this[rawDataSymbol].emote_set_id ? await this._client.chat.getEmotesFromSets([this[rawDataSymbol].emote_set_id]) : null;
	}
	/**
	* Gets more information about the user that owns the emote, or `null` if the emote is not owned by a user.
	*/
	async getOwner() {
		return this[rawDataSymbol].owner_id ? await this._client.users.getUserById(this[rawDataSymbol].owner_id) : null;
	}
};
__decorate([Enumerable(false)], HelixUserEmote.prototype, "_client", void 0);
HelixUserEmote = __decorate([rtfm("api", "HelixUserEmote", "id")], HelixUserEmote);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/chat/HelixChatApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with chat.
*
* Can be accessed using `client.chat` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const rewards = await api.chat.getChannelBadges('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Chat
*/
let HelixChatApi = class HelixChatApi extends BaseApi {
	/**
	* Gets the list of users that are connected to the broadcaster’s chat session.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster whose list of chatters you want to get.
	* @param pagination
	*
	* @expandParams
	*/
	async getChatters(broadcaster, pagination) {
		const broadcasterId = extractUserId(broadcaster);
		return createPaginatedResultWithTotal(await this._client.callApi({
			type: "helix",
			url: "chat/chatters",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:read:chatters"],
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createPaginationQuery(pagination)
			}
		}), HelixChatChatter, this._client);
	}
	/**
	* Creates a paginator for users that are connected to the broadcaster’s chat session.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster whose list of chatters you want to get.
	*
	* @expandParams
	*/
	getChattersPaginated(broadcaster) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixPaginatedRequestWithTotal({
			url: "chat/chatters",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:read:chatters"],
			query: this._createModeratorActionQuery(broadcasterId)
		}, this._client, (data) => new HelixChatChatter(data, this._client), 1e3);
	}
	/**
	* Gets all global badges.
	*/
	async getGlobalBadges() {
		return (await this._client.callApi({
			type: "helix",
			url: "chat/badges/global"
		})).data.map((data) => new HelixChatBadgeSet(data));
	}
	/**
	* Gets all badges specific to the given broadcaster.
	*
	* @param broadcaster The broadcaster to get badges for.
	*/
	async getChannelBadges(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "chat/badges",
			userId: extractUserId(broadcaster),
			query: createBroadcasterQuery(broadcaster)
		})).data.map((data) => new HelixChatBadgeSet(data));
	}
	/**
	* Gets all global emotes.
	*/
	async getGlobalEmotes() {
		return (await this._client.callApi({
			type: "helix",
			url: "chat/emotes/global"
		})).data.map((data) => new HelixEmote(data));
	}
	/**
	* Gets all emotes specific to the given broadcaster.
	*
	* @param broadcaster The broadcaster to get emotes for.
	*/
	async getChannelEmotes(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "chat/emotes",
			userId: extractUserId(broadcaster),
			query: createBroadcasterQuery(broadcaster)
		})).data.map((data) => new HelixChannelEmote(data, this._client));
	}
	/**
	* Gets all emotes from a list of emote sets.
	*
	* @param setIds The IDs of the emote sets to get emotes from.
	*/
	async getEmotesFromSets(setIds) {
		return (await this._client.callApi({
			type: "helix",
			url: "chat/emotes/set",
			query: createSingleKeyQuery("emote_set_id", setIds)
		})).data.map((data) => new HelixEmoteFromSet(data, this._client));
	}
	/**
	* Gets emotes available to the user across all channels.
	*
	* @param user The ID of the user to get available emotes of.
	* @param filter Additional query filters.
	*/
	async getUserEmotes(user, filter) {
		const userId = extractUserId(user);
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "chat/emotes/user",
			userId: extractUserId(user),
			scopes: ["user:read:emotes"],
			query: {
				...createSingleKeyQuery("user_id", userId),
				...createSingleKeyQuery("broadcasterId", filter?.broadcaster ? extractUserId(filter.broadcaster) : void 0),
				...createPaginationQuery(filter)
			}
		}), HelixUserEmote, this._client);
	}
	/**
	* Creates a paginator for emotes available to the user across all channels.
	*
	* @param user The ID of the user to get available emotes of.
	* @param broadcaster The ID of a broadcaster you wish to get follower emotes of. Using this query parameter will
	* guarantee inclusion of the broadcaster’s follower emotes in the response body.
	*
	* If the user who retrieves their emotes is subscribed to the broadcaster specified, their follower emotes will
	* appear in the response body regardless of whether this query parameter is used.
	*/
	getUserEmotesPaginated(user, broadcaster) {
		const userId = extractUserId(user);
		return new HelixPaginatedRequest({
			url: "chat/emotes/user",
			userId,
			scopes: ["user:read:emotes"],
			query: {
				...createSingleKeyQuery("user_id", userId),
				...createSingleKeyQuery("broadcasterId", broadcaster ? extractUserId(broadcaster) : void 0)
			}
		}, this._client, (data) => new HelixUserEmote(data, this._client));
	}
	/**
	* Gets the settings of a broadcaster's chat.
	*
	* @param broadcaster The broadcaster the chat belongs to.
	*/
	async getSettings(broadcaster) {
		return new HelixChatSettings((await this._client.callApi({
			type: "helix",
			url: "chat/settings",
			userId: extractUserId(broadcaster),
			query: createBroadcasterQuery(broadcaster)
		})).data[0]);
	}
	/**
	* Gets the settings of a broadcaster's chat, including the delay settings.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster the chat belongs to.
	*/
	async getSettingsPrivileged(broadcaster) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixPrivilegedChatSettings((await this._client.callApi({
			type: "helix",
			url: "chat/settings",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:read:chat_settings"],
			query: this._createModeratorActionQuery(broadcasterId)
		})).data[0]);
	}
	/**
	* Updates the settings of a broadcaster's chat.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @expandParams
	*
	* @param broadcaster The broadcaster the chat belongs to.
	* @param settings The settings to change.
	*/
	async updateSettings(broadcaster, settings) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixPrivilegedChatSettings((await this._client.callApi({
			type: "helix",
			url: "chat/settings",
			method: "PATCH",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:manage:chat_settings"],
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: createChatSettingsUpdateBody(settings)
		})).data[0]);
	}
	/**
	* Sends a chat message to a broadcaster's chat.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @expandParams
	*
	* @param broadcaster The broadcaster the chat belongs to.
	* @param message The message to send.
	* @param params
	*/
	async sendChatMessage(broadcaster, message, params) {
		const broadcasterId = extractUserId(broadcaster);
		const msg = new HelixSentChatMessage((await this._client.callApi({
			type: "helix",
			url: "chat/messages",
			method: "POST",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["user:write:chat"],
			query: createSendChatMessageQuery(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)),
			jsonBody: createSendChatMessageBody(message, params)
		})).data[0]);
		this._handleUnsentChatMessage(broadcasterId, msg);
		return msg;
	}
	/**
	* Sends a chat message to a broadcaster's chat, using an app token.
	*
	* This requires the scopes `user:write:chat` and `user:bot` for the `user` and `channel:bot` for the `broadcaster`.
	* `channel:bot` is not required if the `user` has moderator privileges in the `broadcaster`'s channel.
	*
	* These scope requirements can not be checked by the library, so they are just assumed.
	* Make sure to catch authorization errors yourself.
	*
	* @expandParams
	*
	* @param user The user to send the chat message from.
	* @param broadcaster The broadcaster the chat belongs to.
	* @param message The message to send.
	* @param params
	*/
	async sendChatMessageAsApp(user, broadcaster, message, params) {
		const userId = extractUserId(user);
		const broadcasterId = extractUserId(broadcaster);
		const msg = new HelixSentChatMessage((await this._client.callApi({
			type: "helix",
			url: "chat/messages",
			method: "POST",
			forceType: "app",
			query: createSendChatMessageQuery(broadcasterId, userId),
			jsonBody: createSendChatMessageAsAppBody(message, params)
		})).data[0]);
		this._handleUnsentChatMessage(broadcasterId, msg);
		return msg;
	}
	/**
	* Sends an announcement to a broadcaster's chat.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster the chat belongs to.
	* @param announcement The announcement to send.
	*/
	async sendAnnouncement(broadcaster, announcement) {
		const broadcasterId = extractUserId(broadcaster);
		await this._client.callApi({
			type: "helix",
			url: "chat/announcements",
			method: "POST",
			userId: broadcasterId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:manage:announcements"],
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: {
				message: announcement.message,
				color: announcement.color
			}
		});
	}
	/**
	* Gets the chat colors for a list of users.
	*
	* Returns a Map with user IDs as keys and their colors as values.
	* The value is a color hex code, or `null` if the user did not set a color,
	* and unknown users will not be present in the map.
	*
	* @param users The users to get the chat colors of.
	*/
	async getColorsForUsers(users) {
		const response = await this._client.callApi({
			type: "helix",
			url: "chat/color",
			query: createSingleKeyQuery("user_id", users.map(extractUserId))
		});
		return new Map(response.data.map((data) => [data.user_id, data.color || null]));
	}
	/**
	* Gets the chat color for a user.
	*
	* Returns the color as hex code, `null` if the user did not set a color, or `undefined` if the user is unknown.
	*
	* @param user The user to get the chat color of.
	*/
	async getColorForUser(user) {
		const response = await this._client.callApi({
			type: "helix",
			url: "chat/color",
			userId: extractUserId(user),
			query: createSingleKeyQuery("user_id", extractUserId(user))
		});
		if (!response.data.length) return;
		return response.data[0].color || null;
	}
	/**
	* Changes the chat color for a user.
	*
	* @param user The user to change the color of.
	* @param color The color to set.
	*
	* Note that hex codes can only be used by users that have a Prime or Turbo subscription.
	*/
	async setColorForUser(user, color) {
		await this._client.callApi({
			type: "helix",
			url: "chat/color",
			method: "PUT",
			userId: extractUserId(user),
			scopes: ["user:manage:chat_color"],
			query: createChatColorUpdateQuery(user, color)
		});
	}
	/**
	* Sends a shoutout to the specified broadcaster.
	* The broadcaster may send a shoutout once every 2 minutes. They may send the same broadcaster a shoutout once every 60 minutes.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param from The ID of the broadcaster that’s sending the shoutout.
	* @param to The ID of the broadcaster that’s receiving the shoutout.
	*/
	async shoutoutUser(from, to) {
		const fromId = extractUserId(from);
		await this._client.callApi({
			type: "helix",
			url: "chat/shoutouts",
			method: "POST",
			userId: fromId,
			canOverrideScopedUserContext: true,
			scopes: ["moderator:manage:shoutouts"],
			query: createShoutoutQuery(from, to, this._getUserContextIdWithDefault(fromId))
		});
	}
	/**
	* Gets the active shared chat session for a channel.
	*
	* Returns `null` if there is no active shared chat session in the channel.
	*
	* @param broadcaster The broadcaster to get the active shared chat session for.
	*/
	async getSharedChatSession(broadcaster) {
		const broadcasterId = extractUserId(broadcaster);
		const response = await this._client.callApi({
			type: "helix",
			url: "shared_chat/session",
			userId: broadcasterId,
			query: createSharedChatSessionQuery(broadcasterId)
		});
		if (response.data.length === 0) return null;
		return new HelixSharedChatSession(response.data[0], this._client);
	}
	_createModeratorActionQuery(broadcasterId) {
		return createModeratorActionQuery(broadcasterId, this._getUserContextIdWithDefault(broadcasterId));
	}
	_handleUnsentChatMessage(broadcasterId, msg) {
		if (!msg.isSent) throw new ChatMessageDroppedError(broadcasterId, msg.dropReasonMessage, msg.dropReasonCode);
	}
};
HelixChatApi = __decorate([rtfm("api", "HelixChatApi")], HelixChatApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/clip.external.js
/** @internal */
function createClipCreateQuery(params) {
	const { channel, createAfterDelay = false, title, duration } = params;
	return {
		broadcaster_id: extractUserId(channel),
		has_delay: createAfterDelay.toString(),
		title,
		duration: duration?.toFixed(1)
	};
}
/** @internal */
function createClipCreateFromVodQuery(params, editorId) {
	const { channel, title, duration, vodId, vodOffset } = params;
	return {
		broadcaster_id: extractUserId(channel),
		editor_id: editorId,
		title,
		duration: duration?.toFixed(1),
		vod_id: vodId,
		vod_offset: vodOffset.toString()
	};
}
/** @internal */
function createClipQuery(params) {
	const { filterType, ids, startDate, endDate, isFeatured } = params;
	return {
		[filterType]: ids,
		started_at: startDate,
		ended_at: endDate,
		is_featured: isFeatured?.toString()
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/clip/HelixClip.js
init_tslib_es6();
/**
* A clip from a Twitch stream.
*/
let HelixClip = class HelixClip extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The clip ID.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The URL of the clip.
	*/
	get url() {
		return this[rawDataSymbol].url;
	}
	/**
	* The embed URL of the clip.
	*/
	get embedUrl() {
		return this[rawDataSymbol].embed_url;
	}
	/**
	* The user ID of the broadcaster of the stream where the clip was created.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The display name of the broadcaster of the stream where the clip was created.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets information about the broadcaster of the stream where the clip was created.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The user ID of the creator of the clip.
	*/
	get creatorId() {
		return this[rawDataSymbol].creator_id;
	}
	/**
	* The display name of the creator of the clip.
	*/
	get creatorDisplayName() {
		return this[rawDataSymbol].creator_name;
	}
	/**
	* Gets information about the creator of the clip.
	*/
	async getCreator() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].creator_id));
	}
	/**
	* The ID of the video the clip is taken from.
	*/
	get videoId() {
		return this[rawDataSymbol].video_id;
	}
	/**
	* Gets information about the video the clip is taken from.
	*/
	async getVideo() {
		return checkRelationAssertion(await this._client.videos.getVideoById(this[rawDataSymbol].video_id));
	}
	/**
	* The ID of the game that was being played when the clip was created.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* Gets information about the game that was being played when the clip was created.
	*/
	async getGame() {
		return this[rawDataSymbol].game_id ? checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id)) : null;
	}
	/**
	* The language of the stream where the clip was created.
	*/
	get language() {
		return this[rawDataSymbol].language;
	}
	/**
	* The title of the clip.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The number of views of the clip.
	*/
	get views() {
		return this[rawDataSymbol].view_count;
	}
	/**
	* The date when the clip was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The URL of the thumbnail of the clip.
	*/
	get thumbnailUrl() {
		return this[rawDataSymbol].thumbnail_url;
	}
	/**
	* The duration of the clip in seconds (up to 0.1 precision).
	*/
	get duration() {
		return this[rawDataSymbol].duration;
	}
	/**
	* The offset of the clip from the start of the corresponding VOD, in seconds.
	*
	* This may be null if there is no VOD or if the clip is created from a live broadcast,
	* in which case it may take a few minutes to associate with the VOD.
	*/
	get vodOffset() {
		return this[rawDataSymbol].vod_offset;
	}
	/**
	* Whether the clip is featured.
	*/
	get isFeatured() {
		return this[rawDataSymbol].is_featured;
	}
};
__decorate([Enumerable(false)], HelixClip.prototype, "_client", void 0);
HelixClip = __decorate([rtfm("api", "HelixClip", "id")], HelixClip);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/clip/HelixClipApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with clips.
*
* Can be accessed using `client.clips` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const clipId = await api.clips.createClip({ channel: '125328655' });
* ```
*
* @meta category helix
* @meta categorizedTitle Clips
*/
let HelixClipApi = class HelixClipApi extends BaseApi {
	/** @internal */
	_getClipByIdBatcher = new HelixRequestBatcher({ url: "clips" }, "id", "id", this._client, (data) => new HelixClip(data, this._client));
	/**
	* Gets clips for the specified broadcaster in descending order of views.
	*
	* @param broadcaster The broadcaster to fetch clips for.
	* @param filter
	*
	* @expandParams
	*/
	async getClipsForBroadcaster(broadcaster, filter = {}) {
		return await this._getClips({
			...filter,
			filterType: "broadcaster_id",
			ids: extractUserId(broadcaster),
			userId: extractUserId(broadcaster)
		});
	}
	/**
	* Creates a paginator for clips for the specified broadcaster.
	*
	* @param broadcaster The broadcaster to fetch clips for.
	* @param filter
	*
	* @expandParams
	*/
	getClipsForBroadcasterPaginated(broadcaster, filter = {}) {
		return this._getClipsPaginated({
			...filter,
			filterType: "broadcaster_id",
			ids: extractUserId(broadcaster),
			userId: extractUserId(broadcaster)
		});
	}
	/**
	* Gets clips for the specified game in descending order of views.
	*
	* @param gameId The game ID.
	* @param filter
	*
	* @expandParams
	*/
	async getClipsForGame(gameId, filter = {}) {
		return await this._getClips({
			...filter,
			filterType: "game_id",
			ids: gameId
		});
	}
	/**
	* Creates a paginator for clips for the specified game.
	*
	* @param gameId The game ID.
	* @param filter
	*
	* @expandParams
	*/
	getClipsForGamePaginated(gameId, filter = {}) {
		return this._getClipsPaginated({
			...filter,
			filterType: "game_id",
			ids: gameId
		});
	}
	/**
	* Gets the clips identified by the given IDs.
	*
	* @param ids The clip IDs.
	*/
	async getClipsByIds(ids) {
		return (await this._getClips({
			filterType: "id",
			ids
		})).data;
	}
	/**
	* Gets the clip identified by the given ID.
	*
	* @param id The clip ID.
	*/
	async getClipById(id) {
		const clips = await this.getClipsByIds([id]);
		return clips.length ? clips[0] : null;
	}
	/**
	* Gets the clip identified by the given ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param id The clip ID.
	*/
	async getClipByIdBatched(id) {
		return await this._getClipByIdBatcher.request(id);
	}
	/**
	* Creates a clip of a running stream.
	*
	* Returns the ID of the clip.
	*
	* @param params
	* @expandParams
	*/
	async createClip(params) {
		return (await this._client.callApi({
			type: "helix",
			url: "clips",
			method: "POST",
			userId: extractUserId(params.channel),
			scopes: ["clips:edit"],
			canOverrideScopedUserContext: true,
			query: createClipCreateQuery(params)
		})).data[0].id;
	}
	/**
	* Creates a clip of a VOD.
	*
	* Returns the ID of the clip.
	*
	* @param params
	* @expandParams
	* @beta
	*/
	async createClipFromVod(params) {
		const broadcasterId = extractUserId(params.channel);
		return (await this._client.callApi({
			type: "helix",
			url: "videos/clips",
			method: "POST",
			userId: broadcasterId,
			scopes: ["editor:manage:clips", "channel:manage:clips"],
			canOverrideScopedUserContext: true,
			query: createClipCreateFromVodQuery(params, this._getUserContextIdWithDefault(broadcasterId))
		})).data[0].id;
	}
	async _getClips(params) {
		if (!params.ids.length) return { data: [] };
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "clips",
			userId: params.userId,
			query: {
				...createClipQuery(params),
				...createPaginationQuery(params)
			}
		}), HelixClip, this._client);
	}
	_getClipsPaginated(params) {
		return new HelixPaginatedRequest({
			url: "clips",
			userId: params.userId,
			query: createClipQuery(params)
		}, this._client, (data) => new HelixClip(data, this._client));
	}
};
__decorate([Enumerable(false)], HelixClipApi.prototype, "_getClipByIdBatcher", void 0);
HelixClipApi = __decorate([rtfm("api", "HelixClipApi")], HelixClipApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/contentClassificationLabels/HelixContentClassificationLabel.js
/**
* A content classification label that can be applied to a Twitch stream.
*/
var HelixContentClassificationLabel = class extends DataObject {
	/**
	* The ID of the content classification label.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the content classification label.
	*/
	get name() {
		return this[rawDataSymbol].name;
	}
	/**
	* The description of the content classification label.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/contentClassificationLabels/HelixContentClassificationLabelApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with content classification labels.
*
* Can be accessed using `client.contentClassificationLabels` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const labels = await api.contentClassificationLabels.getAll();
* ```
*
* @meta category helix
* @meta categorizedTitle Content classification labels
*/
let HelixContentClassificationLabelApi = class HelixContentClassificationLabelApi extends BaseApi {
	/**
	* Fetches a list of all content classification labels.
	*
	* @param locale The locale for the content classification labels.
	*/
	async getAll(locale) {
		return (await this._client.callApi({
			url: "content_classification_labels",
			query: { locale }
		})).data.map((data) => new HelixContentClassificationLabel(data));
	}
};
HelixContentClassificationLabelApi = __decorate([rtfm("api", "HelixContentClassificationLabelApi")], HelixContentClassificationLabelApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/entitlement.external.js
/** @internal */
function createDropsEntitlementQuery(filters, alwaysApp) {
	return {
		user_id: alwaysApp ? mapOptional(filters.user, extractUserId) : void 0,
		game_id: filters.gameId,
		fulfillment_status: filters.fulfillmentStatus
	};
}
/** @internal */
function createDropsEntitlementUpdateBody(ids, fulfillmentStatus) {
	return {
		fulfillment_status: fulfillmentStatus,
		entitlement_ids: ids
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/entitlements/HelixDropsEntitlement.js
init_tslib_es6();
/**
* An entitlement for a drop.
*/
let HelixDropsEntitlement = class HelixDropsEntitlement extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the entitlement.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the reward.
	*/
	get rewardId() {
		return this[rawDataSymbol].benefit_id;
	}
	/**
	* The date when the entitlement was granted.
	*/
	get grantDate() {
		return new Date(this[rawDataSymbol].timestamp);
	}
	/**
	* The ID of the entitled user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* Gets more information about the entitled user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The ID of the game the entitlement was granted for.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* Gets more information about the game the entitlement was granted for.
	*/
	async getGame() {
		return checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id));
	}
	/**
	* The fulfillment status of the entitlement.
	*/
	get fulfillmentStatus() {
		return this[rawDataSymbol].fulfillment_status;
	}
	/**
	* The date when the entitlement was last updated.
	*/
	get updateDate() {
		return new Date(this[rawDataSymbol].last_updated);
	}
};
__decorate([Enumerable(false)], HelixDropsEntitlement.prototype, "_client", void 0);
HelixDropsEntitlement = __decorate([rtfm("api", "HelixDropsEntitlement")], HelixDropsEntitlement);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/entitlements/HelixEntitlementApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with entitlements (drops).
*
* Can be accessed using `client.entitlements` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const clipId = await api.entitlements.getDropsEntitlements();
* ```
*
* @meta category helix
* @meta categorizedTitle Entitlements (Drops)
*/
let HelixEntitlementApi = class HelixEntitlementApi extends BaseApi {
	/** @internal */ _getDropsEntitlementByIdBatcher = new HelixRequestBatcher({ url: "entitlements/drops" }, "id", "id", this._client, (data) => new HelixDropsEntitlement(data, this._client));
	/**
	* Gets the drops entitlements for the given filter.
	*
	* @expandParams
	*
	* @param filter
	* @param alwaysApp Whether an app token should always be used, even if a user filter is given.
	*/
	async getDropsEntitlements(filter, alwaysApp = false) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "entitlements/drops",
			userId: mapOptional(filter.user, extractUserId),
			forceType: filter.user && alwaysApp ? "app" : void 0,
			query: {
				...createDropsEntitlementQuery(filter, alwaysApp),
				...createPaginationQuery(filter)
			}
		}), HelixDropsEntitlement, this._client);
	}
	/**
	* Creates a paginator for drops entitlements for the given filter.
	*
	* @expandParams
	*
	* @param filter
	* @param alwaysApp Whether an app token should always be used, even if a user filter is given.
	*/
	getDropsEntitlementsPaginated(filter, alwaysApp = false) {
		return new HelixPaginatedRequest({
			url: "entitlements/drops",
			userId: mapOptional(filter.user, extractUserId),
			forceType: filter.user && alwaysApp ? "app" : void 0,
			query: createDropsEntitlementQuery(filter, alwaysApp)
		}, this._client, (data) => new HelixDropsEntitlement(data, this._client));
	}
	/**
	* Gets the drops entitlements for the given IDs.
	*
	* @param ids The IDs to fetch.
	*/
	async getDropsEntitlementsByIds(ids) {
		return (await this._client.callApi({
			type: "helix",
			url: "entitlements/drops",
			query: { id: ids }
		})).data.map((data) => new HelixDropsEntitlement(data, this._client));
	}
	/**
	* Gets the drops entitlement for the given ID.
	*
	* @param id The ID to fetch.
	*/
	async getDropsEntitlementById(id) {
		return (await this.getDropsEntitlementsByIds([id]))[0] ?? null;
	}
	/**
	* Gets the drops entitlement for the given ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param id The ID to fetch.
	*/
	async getDropsEntitlementByIdBatched(id) {
		return await this._getDropsEntitlementByIdBatcher.request(id);
	}
	/**
	* Updates the status of a list of drops entitlements.
	*
	* Returns a map that associates each given ID with its update status.
	*
	* @param ids The IDs of the entitlements.
	* @param fulfillmentStatus The fulfillment status to set the entitlements to.
	*/
	async updateDropsEntitlements(ids, fulfillmentStatus) {
		const response = await this._client.callApi({
			type: "helix",
			url: "entitlements/drops",
			method: "PATCH",
			jsonBody: createDropsEntitlementUpdateBody(ids, fulfillmentStatus)
		});
		return new Map(response.data.flatMap((entry) => entry.ids.map((id) => [id, entry.status])));
	}
};
__decorate([Enumerable(false)], HelixEntitlementApi.prototype, "_getDropsEntitlementByIdBatcher", void 0);
HelixEntitlementApi = __decorate([rtfm("api", "HelixEntitlementApi")], HelixEntitlementApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/eventSub.external.js
/** @internal */
function createEventSubBroadcasterCondition(broadcaster) {
	return { broadcaster_user_id: extractUserId(broadcaster) };
}
/** @internal */
function createEventSubRewardCondition(broadcaster, rewardId) {
	return {
		broadcaster_user_id: extractUserId(broadcaster),
		reward_id: rewardId
	};
}
/** @internal */
function createEventSubModeratorCondition(broadcasterId, moderatorId) {
	return {
		broadcaster_user_id: broadcasterId,
		moderator_user_id: moderatorId
	};
}
/** @internal */
function createEventSubUserCondition(broadcasterId, userId) {
	return {
		broadcaster_user_id: broadcasterId,
		user_id: userId
	};
}
/** @internal */
function createEventSubDropEntitlementGrantCondition(filter) {
	return {
		organization_id: filter.organizationId,
		category_id: filter.categoryId,
		campaign_id: filter.campaignId
	};
}
/** @internal */
function createEventSubConduitCondition(conduitId, status) {
	return {
		conduit_id: conduitId,
		status
	};
}
/** @internal */
function createEventSubConduitUpdateCondition(conduitId, shardCount) {
	return {
		id: conduitId,
		shard_count: shardCount.toString()
	};
}
/** @internal */
function createEventSubConduitShardsUpdateCondition(conduitId, shards) {
	return {
		conduit_id: conduitId,
		shards
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/eventSub/HelixEventSubSubscription.js
init_tslib_es6();
/**
* An EventSub subscription.
*/
let HelixEventSubSubscription = class HelixEventSubSubscription extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the subscription.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The status of the subscription.
	*/
	get status() {
		return this[rawDataSymbol].status;
	}
	/**
	* The event type that the subscription is listening to.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The cost of the subscription.
	*/
	get cost() {
		return this[rawDataSymbol].cost;
	}
	/**
	* The condition of the subscription.
	*/
	get condition() {
		return this[rawDataSymbol].condition;
	}
	/**
	* The date and time of creation of the subscription.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The transport method of the subscription.
	*/
	get transportMethod() {
		return this[rawDataSymbol].transport.method;
	}
	/**
	* End the EventSub subscription.
	*/
	async unsubscribe() {
		if (!this._client) throw new Error("HelixEventSubSubscription#unsubscribe is not supported in this context");
		await this._client.eventSub.deleteSubscription(this[rawDataSymbol].id);
	}
	/** @private */
	get _transport() {
		return this[rawDataSymbol].transport;
	}
	/** @private */
	set _status(status) {
		this[rawDataSymbol].status = status;
	}
};
__decorate([Enumerable(false)], HelixEventSubSubscription.prototype, "_client", void 0);
HelixEventSubSubscription = __decorate([rtfm("api", "HelixEventSubSubscription", "id")], HelixEventSubSubscription);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/eventSub/HelixPaginatedEventSubSubscriptionsRequest.js
init_tslib_es6();
/**
* A special case of {@link HelixPaginatedRequestWithTotal} with support for fetching the total cost and cost limit
* of EventSub subscriptions.
*
* @inheritDoc
*/
let HelixPaginatedEventSubSubscriptionsRequest = class HelixPaginatedEventSubSubscriptionsRequest extends HelixPaginatedRequestWithTotal {
	/** @internal */
	constructor(query, userId, client) {
		super({
			url: "eventsub/subscriptions",
			userId,
			query
		}, client, (data) => new HelixEventSubSubscription(data, client));
	}
	/**
	* Gets the total cost of EventSub subscriptions.
	*/
	async getTotalCost() {
		return (this._currentData ?? await this._fetchData({ query: { after: void 0 } })).total_cost;
	}
	/**
	* Gets the cost limit of EventSub subscriptions.
	*/
	async getMaxTotalCost() {
		return (this._currentData ?? await this._fetchData({ query: { after: void 0 } })).max_total_cost;
	}
};
HelixPaginatedEventSubSubscriptionsRequest = __decorate([rtfm("api", "HelixPaginatedEventSubSubscriptionsRequest")], HelixPaginatedEventSubSubscriptionsRequest);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/eventSub/HelixEventSubConduit.js
init_tslib_es6();
/**
* Represents an EventSub conduit.
*/
let HelixEventSubConduit = class HelixEventSubConduit extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the conduit.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The shard count of the conduit.
	*/
	get shardCount() {
		return this[rawDataSymbol].shard_count;
	}
	/**
	* Update the conduit.
	*
	* @param shardCount The new shard count.
	*/
	async update(shardCount) {
		return await this._client.eventSub.updateConduit(this[rawDataSymbol].id, shardCount);
	}
	/**
	* Delete the conduit.
	*/
	async delete() {
		await this._client.eventSub.deleteConduit(this[rawDataSymbol].id);
	}
	/**
	* Get the conduit shards.
	*/
	async getShards() {
		return await this._client.eventSub.getConduitShards(this[rawDataSymbol].id);
	}
};
__decorate([Enumerable(false)], HelixEventSubConduit.prototype, "_client", void 0);
HelixEventSubConduit = __decorate([rtfm("api", "HelixEventSubConduit")], HelixEventSubConduit);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/eventSub/HelixEventSubConduitShard.js
init_tslib_es6();
/**
* Represents an EventSub conduit shard.
*/
let HelixEventSubConduitShard = class HelixEventSubConduitShard extends DataObject {
	/**
	* The ID of the shard.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The status of the shard.
	*/
	get status() {
		return this[rawDataSymbol].status;
	}
	/**
	* The transport method of the shard.
	*/
	get transportMethod() {
		return this[rawDataSymbol].transport.method;
	}
};
HelixEventSubConduitShard = __decorate([rtfm("api", "HelixEventSubConduitShard")], HelixEventSubConduitShard);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/eventSub/HelixEventSubApi.js
init_tslib_es6();
/**
* The API methods that deal with EventSub.
*
* Can be accessed using `client.eventSub` on an {@link ApiClient} instance.
*
* ## Before using these methods...
*
* All methods in this class assume that you are already running a working EventSub listener reachable using the given transport.
*
* If you don't already have one, we recommend use of the `@twurple/eventsub-http` or `@twurple/eventsub-ws` libraries,
* which handle subscribing and unsubscribing to these topics automatically.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* await api.eventSub.subscribeToUserFollowsTo('125328655', { callbackUrl: 'https://example.com' });
* ```
*
* @meta category helix
* @meta categorizedTitle EventSub
*/
let HelixEventSubApi = class HelixEventSubApi extends BaseApi {
	/**
	* Gets the current EventSub subscriptions for the current client.
	*
	* @param pagination
	*
	* @expandParams
	*/
	async getSubscriptions(pagination) {
		const result = await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			query: createPaginationQuery(pagination)
		});
		return {
			...createPaginatedResultWithTotal(result, HelixEventSubSubscription, this._client),
			totalCost: result.total_cost,
			maxTotalCost: result.max_total_cost
		};
	}
	/**
	* Creates a paginator for the current EventSub subscriptions for the current client.
	*/
	getSubscriptionsPaginated() {
		return new HelixPaginatedEventSubSubscriptionsRequest({}, void 0, this._client);
	}
	/**
	* Gets the current EventSub subscriptions with the given status for the current client.
	*
	* @param status The status of the subscriptions to get.
	* @param pagination
	*
	* @expandParams
	*/
	async getSubscriptionsForStatus(status, pagination) {
		const result = await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			query: {
				...createPaginationQuery(pagination),
				status
			}
		});
		return {
			...createPaginatedResultWithTotal(result, HelixEventSubSubscription, this._client),
			totalCost: result.total_cost,
			maxTotalCost: result.max_total_cost
		};
	}
	/**
	* Creates a paginator for the current EventSub subscriptions with the given status for the current client.
	*
	* @param status The status of the subscriptions to get.
	*/
	getSubscriptionsForStatusPaginated(status) {
		return new HelixPaginatedEventSubSubscriptionsRequest({ status }, void 0, this._client);
	}
	/**
	* Gets the current EventSub subscriptions with the given type for the current client.
	*
	* @param type The type of the subscriptions to get.
	* @param pagination
	*
	* @expandParams
	*/
	async getSubscriptionsForType(type, pagination) {
		const result = await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			query: {
				...createPaginationQuery(pagination),
				type
			}
		});
		return {
			...createPaginatedResultWithTotal(result, HelixEventSubSubscription, this._client),
			totalCost: result.total_cost,
			maxTotalCost: result.max_total_cost
		};
	}
	/**
	* Creates a paginator for the current EventSub subscriptions with the given type for the current client.
	*
	* @param type The type of the subscriptions to get.
	*/
	getSubscriptionsForTypePaginated(type) {
		return new HelixPaginatedEventSubSubscriptionsRequest({ type }, void 0, this._client);
	}
	/**
	* Gets the current EventSub subscriptions for the current user and client.
	*
	* @param user The user to get subscriptions for.
	* @param pagination
	*
	* @expandParams
	*/
	async getSubscriptionsForUser(user, pagination) {
		const result = await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			userId: extractUserId(user),
			query: {
				...createSingleKeyQuery("user_id", extractUserId(user)),
				...createPaginationQuery(pagination)
			}
		});
		return {
			...createPaginatedResultWithTotal(result, HelixEventSubSubscription, this._client),
			totalCost: result.total_cost,
			maxTotalCost: result.max_total_cost
		};
	}
	/**
	* Creates a paginator for the current EventSub subscriptions with the given type for the current client.
	*
	* @param user The user to get subscriptions for.
	*/
	getSubscriptionsForUserPaginated(user) {
		const userId = extractUserId(user);
		return new HelixPaginatedEventSubSubscriptionsRequest(createSingleKeyQuery("user_id", userId), userId, this._client);
	}
	/**
	* Sends an arbitrary request to subscribe to an event.
	*
	* You can only create WebHook transport subscriptions using app tokens
	* and WebSocket transport subscriptions using user tokens.
	*
	* @param type The type of the event.
	* @param version The version of the event.
	* @param condition The condition of the subscription.
	* @param transport The transport of the subscription.
	* @param user The user to create the subscription in context of.
	* @param requiredScopeSet The scope set required by the subscription. Will only be checked for applicable transports.
	* @param canOverrideScopedUserContext Whether the auth user context can be overridden.
	* @param isBatched Whether to enable batching for the subscription. Is only supported for select topics.
	*/
	async createSubscription(type, version, condition, transport, user, requiredScopeSet, canOverrideScopedUserContext, isBatched) {
		const usesAppAuth = transport.method === "webhook" || transport.method === "conduit";
		const scopes = usesAppAuth ? void 0 : requiredScopeSet;
		if (!usesAppAuth && !user) throw new Error(`Transport ${transport.method} can only handle subscriptions with user context`);
		const jsonBody = {
			type,
			version,
			condition,
			transport
		};
		if (isBatched) jsonBody.is_batching_enabled = true;
		return new HelixEventSubSubscription((await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			method: "POST",
			scopes,
			userId: mapOptional(user, extractUserId),
			canOverrideScopedUserContext,
			forceType: usesAppAuth ? "app" : "user",
			jsonBody
		})).data[0], this._client);
	}
	/**
	* Deletes a subscription.
	*
	* @param id The ID of the subscription.
	*/
	async deleteSubscription(id) {
		await this._client.callApi({
			type: "helix",
			url: "eventsub/subscriptions",
			method: "DELETE",
			query: { id }
		});
	}
	/**
	* Deletes *all* subscriptions.
	*/
	async deleteAllSubscriptions() {
		await this._deleteSubscriptionsWithCondition();
	}
	/**
	* Deletes all broken subscriptions, i.e. all that are not enabled or pending verification.
	*/
	async deleteBrokenSubscriptions() {
		await this._deleteSubscriptionsWithCondition((sub) => sub.status !== "enabled" && sub.status !== "webhook_callback_verification_pending");
	}
	/**
	* Subscribe to events that represent a stream going live.
	*
	* @param broadcaster The broadcaster you want to listen to online events for.
	* @param transport The transport options.
	*/
	async subscribeToStreamOnlineEvents(broadcaster, transport) {
		return await this.createSubscription("stream.online", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster);
	}
	/**
	* Subscribe to events that represent a stream going offline.
	*
	* @param broadcaster The broadcaster you want to listen to online events for.
	* @param transport The transport options.
	*/
	async subscribeToStreamOfflineEvents(broadcaster, transport) {
		return await this.createSubscription("stream.offline", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster);
	}
	/**
	* Subscribe to events that represent a channel updating their metadata.
	*
	* @param broadcaster The broadcaster you want to listen to update events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelUpdateEvents(broadcaster, transport) {
		return await this.createSubscription("channel.update", "2", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster);
	}
	/**
	* Subscribe to events that represent a user following a channel.
	*
	* @param broadcaster The broadcaster you want to listen to follow events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelFollowEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.follow", "2", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcasterId, ["moderator:read:followers"], true);
	}
	/**
	* Subscribe to events that represent a user subscribing to a channel.
	*
	* @param broadcaster The broadcaster you want to listen to subscribe events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelSubscriptionEvents(broadcaster, transport) {
		return await this.createSubscription("channel.subscribe", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:subscriptions"]);
	}
	/**
	* Subscribe to events that represent a user gifting another user a subscription to a channel.
	*
	* @param broadcaster The broadcaster you want to listen to subscription gift events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelSubscriptionGiftEvents(broadcaster, transport) {
		return await this.createSubscription("channel.subscription.gift", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:subscriptions"]);
	}
	/**
	* Subscribe to events that represent a user's subscription to a channel being announced.
	*
	* @param broadcaster The broadcaster you want to listen to subscription message events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelSubscriptionMessageEvents(broadcaster, transport) {
		return await this.createSubscription("channel.subscription.message", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:subscriptions"]);
	}
	/**
	* Subscribe to events that represent a user's subscription to a channel ending.
	*
	* @param broadcaster The broadcaster you want to listen to subscription end events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelSubscriptionEndEvents(broadcaster, transport) {
		return await this.createSubscription("channel.subscription.end", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:subscriptions"]);
	}
	/**
	* Subscribe to events that represent a user cheering bits to a channel.
	*
	* @param broadcaster The broadcaster you want to listen to cheer events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelCheerEvents(broadcaster, transport) {
		return await this.createSubscription("channel.cheer", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["bits:read"]);
	}
	/**
	* Subscribe to events that represent a charity campaign starting in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to charity donation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelCharityCampaignStartEvents(broadcaster, transport) {
		return await this.createSubscription("channel.charity_campaign.start", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:charity"]);
	}
	/**
	* Subscribe to events that represent a charity campaign ending in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to charity donation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelCharityCampaignStopEvents(broadcaster, transport) {
		return await this.createSubscription("channel.charity_campaign.stop", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:charity"]);
	}
	/**
	* Subscribe to events that represent a user donating to a charity campaign in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to charity donation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelCharityDonationEvents(broadcaster, transport) {
		return await this.createSubscription("channel.charity_campaign.donate", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:charity"]);
	}
	/**
	* Subscribe to events that represent a charity campaign progressing in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to charity donation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelCharityCampaignProgressEvents(broadcaster, transport) {
		return await this.createSubscription("channel.charity_campaign.progress", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:charity"]);
	}
	/**
	* Subscribe to events that represent a user being banned in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to ban events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelBanEvents(broadcaster, transport) {
		return await this.createSubscription("channel.ban", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:moderate"]);
	}
	/**
	* Subscribe to events that represent a user being unbanned in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to unban events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelUnbanEvents(broadcaster, transport) {
		return await this.createSubscription("channel.unban", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:moderate"]);
	}
	/**
	* Subscribe to events that represent Shield Mode being activated in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to Shield Mode activation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelShieldModeBeginEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shield_mode.begin", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcasterId, ["moderator:read:shield_mode", "moderator:manage:shield_mode"], true);
	}
	/**
	* Subscribe to events that represent Shield Mode being deactivated in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to Shield Mode deactivation events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelShieldModeEndEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shield_mode.end", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcasterId, ["moderator:read:shield_mode", "moderator:manage:shield_mode"], true);
	}
	/**
	* Subscribe to events that represent a moderator being added to a channel.
	*
	* @param broadcaster The broadcaster you want to listen for moderator add events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelModeratorAddEvents(broadcaster, transport) {
		return await this.createSubscription("channel.moderator.add", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["moderation:read"]);
	}
	/**
	* Subscribe to events that represent a moderator being removed from a channel.
	*
	* @param broadcaster The broadcaster you want to listen for moderator remove events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelModeratorRemoveEvents(broadcaster, transport) {
		return await this.createSubscription("channel.moderator.remove", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["moderation:read"]);
	}
	/**
	* Subscribe to events that represent a broadcaster raiding another broadcaster.
	*
	* @param broadcaster The broadcaster you want to listen to outgoing raid events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRaidEventsFrom(broadcaster, transport) {
		return await this.createSubscription("channel.raid", "1", createSingleKeyQuery("from_broadcaster_user_id", extractUserId(broadcaster)), transport, broadcaster);
	}
	/**
	* Subscribe to events that represent a broadcaster being raided by another broadcaster.
	*
	* @param broadcaster The broadcaster you want to listen to incoming raid events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRaidEventsTo(broadcaster, transport) {
		return await this.createSubscription("channel.raid", "1", createSingleKeyQuery("to_broadcaster_user_id", extractUserId(broadcaster)), transport, broadcaster);
	}
	/**
	* Subscribe to events that represent a Channel Points reward being added to a channel.
	*
	* @param broadcaster The broadcaster you want to listen to reward add events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRewardAddEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward.add", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points reward being updated in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to reward update events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRewardUpdateEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward.update", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a specific Channel Points reward being updated.
	*
	* @param broadcaster The broadcaster you want to listen to reward update events for.
	* @param rewardId The ID of the reward you want to listen to update events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRewardUpdateEventsForReward(broadcaster, rewardId, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward.update", "1", createEventSubRewardCondition(broadcaster, rewardId), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points reward being removed from a channel.
	*
	* @param broadcaster The broadcaster you want to listen to reward remove events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRewardRemoveEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward.remove", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a specific Channel Points reward being removed from a channel.
	*
	* @param broadcaster The broadcaster you want to listen to reward remove events for.
	* @param rewardId The ID of the reward you want to listen to remove events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRewardRemoveEventsForReward(broadcaster, rewardId, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward.remove", "1", createEventSubRewardCondition(broadcaster, rewardId), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points reward being redeemed.
	*
	* @param broadcaster The broadcaster you want to listen to redemption events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRedemptionAddEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward_redemption.add", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a specific Channel Points reward being redeemed.
	*
	* @param broadcaster The broadcaster you want to listen to redemption events for.
	* @param rewardId The ID of the reward you want to listen to redemption events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRedemptionAddEventsForReward(broadcaster, rewardId, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward_redemption.add", "1", createEventSubRewardCondition(broadcaster, rewardId), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points redemption being updated.
	*
	* @param broadcaster The broadcaster you want to listen to redemption update events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRedemptionUpdateEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward_redemption.update", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a specific Channel Points reward's redemption being updated.
	*
	* @param broadcaster The broadcaster you want to listen to redemption update events for.
	* @param rewardId The ID of the reward you want to listen to redemption updates for.
	* @param transport The transport options.
	*/
	async subscribeToChannelRedemptionUpdateEventsForReward(broadcaster, rewardId, transport) {
		return await this.createSubscription("channel.channel_points_custom_reward_redemption.update", "1", createEventSubRewardCondition(broadcaster, rewardId), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points automatic reward being redeemed.
	*
	* @param broadcaster The broadcaster you want to listen to automatic reward redemption events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelAutomaticRewardRedemptionAddEvents(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_automatic_reward_redemption.add", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a Channel Points automatic reward being redeemed.
	*
	* @param broadcaster The broadcaster you want to listen to automatic reward redemption events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelAutomaticRewardRedemptionAddV2Events(broadcaster, transport) {
		return await this.createSubscription("channel.channel_points_automatic_reward_redemption.add", "2", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:redemptions", "channel:manage:redemptions"]);
	}
	/**
	* Subscribe to events that represent a poll starting in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to poll begin events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPollBeginEvents(broadcaster, transport) {
		return await this.createSubscription("channel.poll.begin", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:polls", "channel:manage:polls"]);
	}
	/**
	* Subscribe to events that represent a poll being voted on in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to poll progress events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPollProgressEvents(broadcaster, transport) {
		return await this.createSubscription("channel.poll.progress", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:polls", "channel:manage:polls"]);
	}
	/**
	* Subscribe to events that represent a poll ending in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to poll end events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPollEndEvents(broadcaster, transport) {
		return await this.createSubscription("channel.poll.end", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:polls", "channel:manage:polls"]);
	}
	/**
	* Subscribe to events that represent a prediction starting in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to prediction begin events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPredictionBeginEvents(broadcaster, transport) {
		return await this.createSubscription("channel.prediction.begin", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:predictions", "channel:manage:predictions"]);
	}
	/**
	* Subscribe to events that represent a prediction being voted on in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to prediction preogress events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPredictionProgressEvents(broadcaster, transport) {
		return await this.createSubscription("channel.prediction.progress", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:predictions", "channel:manage:predictions"]);
	}
	/**
	* Subscribe to events that represent a prediction being locked in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to prediction lock events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPredictionLockEvents(broadcaster, transport) {
		return await this.createSubscription("channel.prediction.lock", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:predictions", "channel:manage:predictions"]);
	}
	/**
	* Subscribe to events that represent a prediction ending in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to prediction end events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelPredictionEndEvents(broadcaster, transport) {
		return await this.createSubscription("channel.prediction.end", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:predictions", "channel:manage:predictions"]);
	}
	/**
	* Subscribe to events that represent the beginning of a creator goal event in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to goal begin events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelGoalBeginEvents(broadcaster, transport) {
		return await this.createSubscription("channel.goal.begin", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:goals"]);
	}
	/**
	* Subscribe to events that represent progress towards a creator goal.
	*
	* @param broadcaster The broadcaster for which you want to listen to goal progress events.
	* @param transport The transport options.
	*/
	async subscribeToChannelGoalProgressEvents(broadcaster, transport) {
		return await this.createSubscription("channel.goal.progress", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:goals"]);
	}
	/**
	* Subscribe to events that represent the end of a creator goal event.
	*
	* @param broadcaster The broadcaster for which you want to listen to goal end events.
	* @param transport The transport options.
	*/
	async subscribeToChannelGoalEndEvents(broadcaster, transport) {
		return await this.createSubscription("channel.goal.end", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:goals"]);
	}
	/**
	* Subscribe to events that represent the beginning of a Hype Train event in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to Hype train begin events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainBeginEvents(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.begin", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent progress towards the Hype Train goal.
	*
	* @param broadcaster The broadcaster for which you want to listen to Hype Train progress events.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainProgressEvents(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.progress", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent the end of a Hype Train event.
	*
	* @param broadcaster The broadcaster for which you want to listen to Hype Train end events.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainEndEvents(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.end", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent the beginning of a Hype Train event in a channel.
	*
	* @param broadcaster The broadcaster you want to listen to Hype train begin events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainBeginV2Events(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.begin", "2", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent progress towards the Hype Train goal.
	*
	* @param broadcaster The broadcaster for which you want to listen to Hype Train progress events.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainProgressV2Events(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.progress", "2", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent the end of a Hype Train event.
	*
	* @param broadcaster The broadcaster for which you want to listen to Hype Train end events.
	* @param transport The transport options.
	*/
	async subscribeToChannelHypeTrainEndV2Events(broadcaster, transport) {
		return await this.createSubscription("channel.hype_train.end", "2", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:hype_train"]);
	}
	/**
	* Subscribe to events that represent a broadcaster shouting out another broadcaster.
	*
	* @param broadcaster The broadcaster for which you want to listen to outgoing shoutout events.
	* @param transport The transport options.
	*/
	async subscribeToChannelShoutoutCreateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shoutout.create", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcasterId, ["moderator:read:shoutouts", "moderator:manage:shoutouts"], true);
	}
	/**
	* Subscribe to events that represent a broadcaster being shouting out by another broadcaster.
	*
	* @param broadcaster The broadcaster for which you want to listen to incoming shoutout events.
	* @param transport The transport options.
	*/
	async subscribeToChannelShoutoutReceiveEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shoutout.receive", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcasterId, ["moderator:read:shoutouts", "moderator:manage:shoutouts"], true);
	}
	/**
	* Subscribe to events that represent an ad break beginning in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to ad break begin events.
	* @param transport The transport options.
	*/
	async subscribeToChannelAdBreakBeginEvents(broadcaster, transport) {
		return await this.createSubscription("channel.ad_break.begin", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:ads"]);
	}
	/**
	* Subscribe to events that represent a channel's chat being cleared.
	*
	* @param broadcaster The broadcaster for which you want to listen to chat clear events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatClearEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.clear", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent a user's chat messages being cleared in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to user chat message clear events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatClearUserMessagesEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.clear_user_messages", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent a chat message being deleted in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to chat message delete events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatMessageDeleteEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.message_delete", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent a chat notification in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to chat notification events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatNotificationEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.notification", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent a chat message in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to chat message events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatMessageEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.message", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent chat settings being updated in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to chat settings update events.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatSettingsUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat_settings.update", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribe to events that represent a created unban requests in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to unban requests.
	* @param transport The transport options.
	*/
	async subscribeToChannelUnbanRequestCreateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.unban_request.create", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:unban_requests", "moderator:manage:unban_requests"], true);
	}
	/**
	* Subscribe to events that represent a resolved unban requests in a channel.
	*
	* @param broadcaster The broadcaster for which you want to listen to unban requests.
	* @param transport The transport options.
	*/
	async subscribeToChannelUnbanRequestResolveEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.unban_request.resolve", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:unban_requests", "moderator:manage:unban_requests"], true);
	}
	/**
	* Subscribe to events that represent a moderator performing an action on a channel.
	*
	* This requires the following scopes:
	* - `moderator:read:blocked_terms` OR `moderator:manage:blocked_terms`
	* - `moderator:read:chat_settings` OR `moderator:manage:chat_settings`
	* - `moderator:read:unban_requests` OR `moderator:manage:unban_requests`
	* - `moderator:read:banned_users` OR `moderator:manage:banned_users`
	* - `moderator:read:chat_messages` OR `moderator:manage:chat_messages`
	* - `moderator:read:warnings` OR `moderator:manage:warnings`
	* - `moderator:read:moderators`
	* - `moderator:read:vips`
	*
	* These scope requirements cannot be checked by the library, so they are just assumed.
	* Make sure to catch authorization errors yourself.
	*
	* @param broadcaster The broadcaster for which you want to listen to moderation events.
	* @param transport The transport options.
	*/
	async subscribeToChannelModerateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.moderate", "2", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, [], true);
	}
	/**
	* Subscribe to events that represent a warning being acknowledged by a user.
	*
	* @param broadcaster The broadcaster for whom you want to listen to warnings.
	* @param transport The transport options.
	*/
	async subscribeToChannelWarningAcknowledgeEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.warning.acknowledge", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:warnings", "moderator:manage:warnings"], true);
	}
	/**
	* Subscribe to events that represent a warning sent to a user.
	*
	* @param broadcaster The broadcaster for whom you want to listen to warnings.
	* @param transport The transport options.
	*/
	async subscribeToChannelWarningSendEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.warning.send", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:warnings", "moderator:manage:warnings"], true);
	}
	/**
	* Subscribe to events that represent a VIP being added to a channel.
	*
	* @param broadcaster The broadcaster you want to listen for VIP add events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelVipAddEvents(broadcaster, transport) {
		return await this.createSubscription("channel.vip.add", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:vips", "channel:manage:vips"]);
	}
	/**
	* Subscribe to events that represent a VIP being removed from a channel.
	*
	* @param broadcaster The broadcaster you want to listen for VIP remove events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelVipRemoveEvents(broadcaster, transport) {
		return await this.createSubscription("channel.vip.remove", "1", createEventSubBroadcasterCondition(broadcaster), transport, broadcaster, ["channel:read:vips", "channel:manage:vips"]);
	}
	/**
	* Subscribe to events that represent an extension Bits transaction.
	*
	* @param clientId The Client ID for the extension you want to listen to Bits transactions for.
	* @param transport The transport options.
	*/
	async subscribeToExtensionBitsTransactionCreateEvents(clientId, transport) {
		return await this.createSubscription("extension.bits_transaction.create", "1", createSingleKeyQuery("extension_client_id", clientId), transport);
	}
	/**
	* Subscribe to events that represent a user granting authorization to an application.
	*
	* @param clientId The Client ID for the application you want to listen to authorization grant events for.
	* @param transport The transport options.
	*/
	async subscribeToUserAuthorizationGrantEvents(clientId, transport) {
		return await this.createSubscription("user.authorization.grant", "1", createSingleKeyQuery("client_id", clientId), transport);
	}
	/**
	* Subscribe to events that represent a user revoking their authorization from an application.
	*
	* @param clientId The Client ID for the application you want to listen to authorization revoke events for.
	* @param transport The transport options.
	*/
	async subscribeToUserAuthorizationRevokeEvents(clientId, transport) {
		return await this.createSubscription("user.authorization.revoke", "1", createSingleKeyQuery("client_id", clientId), transport);
	}
	/**
	* Subscribe to events that represent a user updating their account details.
	*
	* @param user The user you want to listen to user update events for.
	* @param transport The transport options.
	* @param withEmail Whether to request adding the email address of the user to the notification.
	*
	* Only has an effect with the websocket transport.
	* With the webhook transport, this depends solely on the previous authorization given by the user.
	*/
	async subscribeToUserUpdateEvents(user, transport, withEmail) {
		return await this.createSubscription("user.update", "1", createSingleKeyQuery("user_id", extractUserId(user)), transport, user, withEmail ? ["user:read:email"] : void 0);
	}
	/**
	* Subscribe to events that represent a user receiving a whisper message from another user.
	*
	* @param user The user you want to listen to whisper message events for.
	* @param transport The transport options.
	*/
	async subscribeToUserWhisperMessageEvents(user, transport) {
		return await this.createSubscription("user.whisper.message", "1", createSingleKeyQuery("user_id", extractUserId(user)), transport, user, ["user:read:whispers", "user:manage:whispers"]);
	}
	/**
	* Subscribe to events that represent a drop entitlement being granted.
	*
	* @expandParams
	*
	* @param filter
	* @param transport The transport options.
	*/
	async subscribeToDropEntitlementGrantEvents(filter, transport) {
		return await this.createSubscription("drop.entitlement.grant", "1", createEventSubDropEntitlementGrantCondition(filter), transport, void 0, void 0, false, true);
	}
	/**
	* Subscribes to events that represent a chat message being held by AutoMod.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message hold events for.
	* @param transport The transport options.
	*/
	async subscribeToAutoModMessageHoldEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.message.hold", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:manage:automod"], true);
	}
	/**
	* Subscribes to events that represent a held chat message by AutoMod being resolved.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message resolution events for.
	* @param transport The transport options.
	*/
	async subscribeToAutoModMessageUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.message.update", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:manage:automod"], true);
	}
	/**
	* Subscribes to events (v2) that represent a chat message being held by AutoMod.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message hold events for.
	* @param transport The transport options.
	*/
	async subscribeToAutoModMessageHoldV2Events(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.message.hold", "2", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:manage:automod"], true);
	}
	/**
	* Subscribes to events (v2) that represent a held chat message by AutoMod being resolved.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message resolution events for.
	* @param transport The transport options.
	*/
	async subscribeToAutoModMessageUpdateV2Events(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.message.update", "2", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:manage:automod"], true);
	}
	/**
	* Subscribes to events that represent the AutoMod settings being updated.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod settings update events.
	* @param transport The transport options.
	*/
	async subscribeToAutoModSettingsUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.settings.update", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:automod_settings"], true);
	}
	/**
	* Subscribes to events that represent the AutoMod terms being updated.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod terms update events.
	* @param transport The transport options.
	*/
	async subscribeToAutoModTermsUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("automod.terms.update", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:manage:automod"], true);
	}
	/**
	* Subscribes to events that represent a user's notification about their message being held by AutoMod.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message hold events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatUserMessageHoldEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.user_message_hold", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribes to events that represent a user's notification about a held chat message by AutoMod being resolved.
	*
	* @param broadcaster The broadcaster you want to listen to AutoMod message resolution events for.
	* @param transport The transport options.
	*/
	async subscribeToChannelChatUserMessageUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.chat.user_message_update", "1", createEventSubUserCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["user:read:chat"], true);
	}
	/**
	* Subscribes to events that represent a suspicious user updated in a channel.
	*
	* @param broadcaster The broadcaster you want to listen for suspicious user update events.
	* @param transport The transport options.
	*/
	async subscribeToChannelSuspiciousUserUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.suspicious_user.update", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:suspicious_users"], true);
	}
	/**
	* Subscribes to events that represent a message sent by a suspicious user.
	*
	* @param broadcaster The broadcaster you want to listen for messages sent by suspicious users.
	* @param transport The transport options.
	*/
	async subscribeToChannelSuspiciousUserMessageEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.suspicious_user.message", "1", createEventSubModeratorCondition(broadcasterId, this._getUserContextIdWithDefault(broadcasterId)), transport, broadcaster, ["moderator:read:suspicious_users"], true);
	}
	/**
	* Subscribes to events indicating that a shared chat session has begun in a channel.
	*
	* @param broadcaster The broadcaster for whom shared chat session begin events should be listened to.
	* @param transport The transport options to use for the subscription.
	*/
	async subscribeToChannelSharedChatSessionBeginEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shared_chat.begin", "1", createEventSubBroadcasterCondition(broadcasterId), transport, broadcasterId);
	}
	/**
	* Subscribes to events indicating that a shared chat session has been updated in a channel.
	*
	* @param broadcaster The broadcaster for whom shared chat session update events should be listened to.
	* @param transport The transport options to use for the subscription.
	*/
	async subscribeToChannelSharedChatSessionUpdateEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shared_chat.update", "1", createEventSubBroadcasterCondition(broadcasterId), transport, broadcasterId);
	}
	/**
	* Subscribes to events indicating that a shared chat session has ended in a channel.
	*
	* @param broadcaster The broadcaster for whom shared chat session end events should be listened to.
	* @param transport The transport options to use for the subscription.
	*/
	async subscribeToChannelSharedChatSessionEndEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.shared_chat.end", "1", createEventSubBroadcasterCondition(broadcasterId), transport, broadcasterId);
	}
	/**
	* Subscribes to events indicating that bits are used in a channel.
	*
	* @param broadcaster The broadcaster for whom you want to listen to bits usage events.
	* @param transport The transport options to use for the subscription.
	*/
	async subscribeToChannelBitsUseEvents(broadcaster, transport) {
		const broadcasterId = extractUserId(broadcaster);
		return await this.createSubscription("channel.bits.use", "1", createEventSubBroadcasterCondition(broadcasterId), transport, broadcasterId, ["bits:read"]);
	}
	/**
	* Gets the current EventSub conduits for the current client.
	*
	*/
	async getConduits() {
		return (await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits"
		})).data.map((data) => new HelixEventSubConduit(data, this._client));
	}
	/**
	* Creates a new EventSub conduit for the current client.
	*
	* @param shardCount The number of shards to create for this conduit.
	*/
	async createConduit(shardCount) {
		return new HelixEventSubConduit((await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits",
			method: "POST",
			query: { ...createSingleKeyQuery("shard_count", shardCount.toString()) }
		})).data[0], this._client);
	}
	/**
	* Updates an EventSub conduit for the current client.
	*
	* @param id The ID of the conduit to update.
	* @param shardCount The number of shards to update for this conduit.
	*/
	async updateConduit(id, shardCount) {
		return new HelixEventSubConduit((await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits",
			method: "PATCH",
			query: createEventSubConduitUpdateCondition(id, shardCount)
		})).data[0], this._client);
	}
	/**
	* Deletes an EventSub conduit for the current client.
	*
	* @param id The ID of the conduit to delete.
	*/
	async deleteConduit(id) {
		await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits",
			method: "DELETE",
			query: { ...createSingleKeyQuery("id", id) }
		});
	}
	/**
	* Gets the shards of an EventSub conduit for the current client.
	*
	* @param conduitId The ID of the conduit to get shards for.
	* @param status The status of the shards to filter by.
	* @param pagination
	*/
	async getConduitShards(conduitId, status, pagination) {
		return { ...createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits/shards",
			query: {
				...createEventSubConduitCondition(conduitId, status),
				...createPaginationQuery(pagination)
			}
		}), HelixEventSubConduitShard, this._client) };
	}
	/**
	* Creates a paginator for the shards of an EventSub conduit for the current client.
	*
	* @param conduitId The ID of the conduit to get shards for.
	* @param status The status of the shards to filter by.
	*/
	getConduitShardsPaginated(conduitId, status) {
		return new HelixPaginatedRequest({
			url: "eventsub/conduits/shards",
			query: createEventSubConduitCondition(conduitId, status)
		}, this._client, (data) => new HelixEventSubConduitShard(data));
	}
	/**
	* Updates shards of an EventSub conduit for the current client.
	*
	* @param conduitId The ID of the conduit to update shards for.
	* @param shards List of shards to update
	*/
	async updateConduitShards(conduitId, shards) {
		return (await this._client.callApi({
			type: "helix",
			url: "eventsub/conduits/shards",
			method: "PATCH",
			jsonBody: createEventSubConduitShardsUpdateCondition(conduitId, shards)
		})).data.map((data) => new HelixEventSubConduitShard(data));
	}
	async _deleteSubscriptionsWithCondition(cond) {
		const subsPaginator = this.getSubscriptionsPaginated();
		for await (const sub of subsPaginator) if (!cond || cond(sub)) await sub.unsubscribe();
	}
};
HelixEventSubApi = __decorate([rtfm("api", "HelixEventSubApi")], HelixEventSubApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/extensions.external.js
/** @internal */
function createReleasedExtensionFilter(extensionId, version) {
	return {
		extension_id: extensionId,
		extension_version: version
	};
}
/** @internal */
function createExtensionProductBody(data) {
	return {
		sku: data.sku,
		cost: {
			amount: data.cost,
			type: "bits"
		},
		display_name: data.displayName,
		in_development: data.inDevelopment,
		expiration: data.expirationDate,
		is_broadcast: data.broadcast
	};
}
/** @internal */
function createExtensionTransactionQuery(extensionId, filter) {
	return {
		extension_id: extensionId,
		id: filter.transactionIds
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/channel/HelixChannelReference.js
init_tslib_es6();
/**
* A reference to a Twitch channel.
*/
let HelixChannelReference = class HelixChannelReference extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the channel.
	*/
	get id() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The display name of the channel.
	*/
	get displayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the channel.
	*/
	async getChannel() {
		return checkRelationAssertion(await this._client.channels.getChannelInfoById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* Gets more information about the broadcaster of the channel.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The ID of the game currently played on the channel.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* The name of the game currently played on the channel.
	*/
	get gameName() {
		return this[rawDataSymbol].game_name;
	}
	/**
	* Gets information about the game that is being played on the stream.
	*/
	async getGame() {
		return this[rawDataSymbol].game_id ? checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id)) : null;
	}
	/**
	* The title of the channel.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
};
__decorate([Enumerable(false)], HelixChannelReference.prototype, "_client", void 0);
HelixChannelReference = __decorate([rtfm("api", "HelixChannelReference", "id")], HelixChannelReference);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/extensions/HelixExtensionBitsProduct.js
init_tslib_es6();
/**
* An extension's product to purchase with Bits.
*/
let HelixExtensionBitsProduct = class HelixExtensionBitsProduct extends DataObject {
	/**
	* The product's unique identifier.
	*/
	get sku() {
		return this[rawDataSymbol].sku;
	}
	/**
	* The product's cost, in bits.
	*/
	get cost() {
		return this[rawDataSymbol].cost.amount;
	}
	/**
	* The product's display name.
	*/
	get displayName() {
		return this[rawDataSymbol].display_name;
	}
	/**
	* Whether the product is in development.
	*/
	get inDevelopment() {
		return this[rawDataSymbol].in_development;
	}
	/**
	* Whether the product's purchases is broadcast to all users.
	*/
	get isBroadcast() {
		return this[rawDataSymbol].is_broadcast;
	}
	/**
	* The product's expiration date. If the product never expires, this is null.
	*/
	get expirationDate() {
		return mapNullable(this[rawDataSymbol].expiration, (exp) => new Date(exp));
	}
};
HelixExtensionBitsProduct = __decorate([rtfm("api", "HelixExtensionBitsProduct", "sku")], HelixExtensionBitsProduct);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/extensions/HelixExtensionTransaction.js
init_tslib_es6();
/**
* A bits transaction made inside an extension.
*/
let HelixExtensionTransaction = class HelixExtensionTransaction extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the transaction.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The time when the transaction was made.
	*/
	get transactionDate() {
		return new Date(this[rawDataSymbol].timestamp);
	}
	/**
	* The ID of the broadcaster that runs the extension on their channel.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster that runs the extension on their channel.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* The display name of the broadcaster that runs the extension on their channel.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets information about the broadcaster that runs the extension on their channel.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The ID of the user that made the transaction.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user that made the transaction.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user that made the transaction.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets information about the user that made the transaction.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The product type. Currently always BITS_IN_EXTENSION.
	*/
	get productType() {
		return this[rawDataSymbol].product_type;
	}
	/**
	* The product SKU.
	*/
	get productSku() {
		return this[rawDataSymbol].product_data.sku;
	}
	/**
	* The cost of the product, in bits.
	*/
	get productCost() {
		return this[rawDataSymbol].product_data.cost.amount;
	}
	/**
	* The display name of the product.
	*/
	get productDisplayName() {
		return this[rawDataSymbol].product_data.displayName;
	}
	/**
	* Whether the product is in development.
	*/
	get productInDevelopment() {
		return this[rawDataSymbol].product_data.inDevelopment;
	}
};
__decorate([Enumerable(false)], HelixExtensionTransaction.prototype, "_client", void 0);
HelixExtensionTransaction = __decorate([rtfm("api", "HelixExtensionTransaction", "id")], HelixExtensionTransaction);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/extensions/HelixExtensionsApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with extensions.
*
* Can be accessed using `client.extensions` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const transactions = await api.extionsions.getExtensionTransactions('abcd');
* ```
*
* @meta category helix
* @meta categorizedTitle Extensions
*/
let HelixExtensionsApi = class HelixExtensionsApi extends BaseApi {
	/**
	* Gets a released extension by ID.
	*
	* @param extensionId The ID of the extension.
	* @param version The version of the extension. If not given, gets the latest version.
	*/
	async getReleasedExtension(extensionId, version) {
		return new HelixExtension((await this._client.callApi({
			type: "helix",
			url: "extensions/released",
			query: createReleasedExtensionFilter(extensionId, version)
		})).data[0]);
	}
	/**
	* Gets a list of channels that are currently live and have the given extension installed.
	*
	* @param extensionId The ID of the extension.
	* @param pagination
	*
	* @expandParams
	*/
	async getLiveChannelsWithExtension(extensionId, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "extensions/live",
			query: {
				...createSingleKeyQuery("extension_id", extensionId),
				...createPaginationQuery(pagination)
			}
		}), HelixChannelReference, this._client);
	}
	/**
	* Creates a paginator for channels that are currently live and have the given extension installed.
	*
	* @param extensionId The ID of the extension.
	*/
	getLiveChannelsWithExtensionPaginated(extensionId) {
		return new HelixPaginatedRequest({
			url: "extensions/live",
			query: createSingleKeyQuery("extension_id", extensionId)
		}, this._client, (data) => new HelixChannelReference(data, this._client));
	}
	/**
	* Gets an extension's Bits products.
	*
	* This only works if the provided token belongs to an extension's client ID,
	* and will return the products for that extension.
	*
	* @param includeDisabled Whether to include disabled/expired products.
	*/
	async getExtensionBitsProducts(includeDisabled) {
		return (await this._client.callApi({
			type: "helix",
			url: "bits/extensions",
			forceType: "app",
			query: createSingleKeyQuery("should_include_all", includeDisabled?.toString())
		})).data.map((data) => new HelixExtensionBitsProduct(data));
	}
	/**
	* Creates or updates a Bits product of an extension.
	*
	* This only works if the provided token belongs to an extension's client ID,
	* and will create/update a product for that extension.
	*
	* @param data
	*
	* @expandParams
	*/
	async putExtensionBitsProduct(data) {
		return new HelixExtensionBitsProduct((await this._client.callApi({
			type: "helix",
			url: "bits/extensions",
			method: "PUT",
			forceType: "app",
			jsonBody: createExtensionProductBody(data)
		})).data[0]);
	}
	/**
	* Gets a list of transactions for the given extension.
	*
	* @param extensionId The ID of the extension to get transactions for.
	* @param filter Additional filters.
	*/
	async getExtensionTransactions(extensionId, filter = {}) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "extensions/transactions",
			forceType: "app",
			query: {
				...createExtensionTransactionQuery(extensionId, filter),
				...createPaginationQuery(filter)
			}
		}), HelixExtensionTransaction, this._client);
	}
	/**
	* Creates a paginator for transactions for the given extension.
	*
	* @param extensionId The ID of the extension to get transactions for.
	* @param filter Additional filters.
	*/
	getExtensionTransactionsPaginated(extensionId, filter = {}) {
		return new HelixPaginatedRequest({
			url: "extensions/transactions",
			forceType: "app",
			query: createExtensionTransactionQuery(extensionId, filter)
		}, this._client, (data) => new HelixExtensionTransaction(data, this._client));
	}
};
HelixExtensionsApi = __decorate([rtfm("api", "HelixExtensionsApi")], HelixExtensionsApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/game/HelixGame.js
init_tslib_es6();
/**
* A game as displayed on Twitch.
*/
let HelixGame = class HelixGame extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the game.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the game.
	*/
	get name() {
		return this[rawDataSymbol].name;
	}
	/**
	* The URL of the box art of the game.
	*/
	get boxArtUrl() {
		return this[rawDataSymbol].box_art_url;
	}
	/**
	* The IGDB ID of the game, or null if the game doesn't have an IGDB ID assigned at Twitch.
	*/
	get igdbId() {
		return this[rawDataSymbol].igdb_id || null;
	}
	/**
	* Builds the URL of the box art of the game using the given dimensions.
	*
	* @param width The width of the box art.
	* @param height The height of the box art.
	*/
	getBoxArtUrl(width, height) {
		return this[rawDataSymbol].box_art_url.replace("{width}", width.toString()).replace("{height}", height.toString());
	}
	/**
	* Gets streams that are currently playing the game.
	*
	* @param pagination
	* @expandParams
	*/
	async getStreams(pagination) {
		return await this._client.streams.getStreams({
			...pagination,
			game: this[rawDataSymbol].id
		});
	}
	/**
	* Creates a paginator for streams that are currently playing the game.
	*/
	getStreamsPaginated() {
		return this._client.streams.getStreamsPaginated({ game: this[rawDataSymbol].id });
	}
};
__decorate([Enumerable(false)], HelixGame.prototype, "_client", void 0);
HelixGame = __decorate([rtfm("api", "HelixGame", "id")], HelixGame);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/game/HelixGameApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with games.
*
* Can be accessed using `client.games` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const game = await api.games.getGameByName('Hearthstone');
* ```
*
* @meta category helix
* @meta categorizedTitle Games
*/
let HelixGameApi = class HelixGameApi extends BaseApi {
	/** @internal */
	_getGameByIdBatcher = new HelixRequestBatcher({ url: "games" }, "id", "id", this._client, (data) => new HelixGame(data, this._client));
	/** @internal */
	_getGameByNameBatcher = new HelixRequestBatcher({ url: "games" }, "name", "name", this._client, (data) => new HelixGame(data, this._client));
	/** @internal */
	_getGameByIgdbIdBatcher = new HelixRequestBatcher({ url: "games" }, "igdb_id", "igdb_id", this._client, (data) => new HelixGame(data, this._client));
	/**
	* Gets the game data for the given list of game IDs.
	*
	* @param ids The game IDs you want to look up.
	*/
	async getGamesByIds(ids) {
		return await this._getGames("id", ids);
	}
	/**
	* Gets the game data for the given list of game names.
	*
	* @param names The game names you want to look up.
	*/
	async getGamesByNames(names) {
		return await this._getGames("name", names);
	}
	/**
	* Gets the game data for the given list of IGDB IDs.
	*
	* @param igdbIds The IGDB IDs you want to look up.
	*/
	async getGamesByIgdbIds(igdbIds) {
		return await this._getGames("igdb_id", igdbIds);
	}
	/**
	* Gets the game data for the given game ID.
	*
	* @param id The game ID you want to look up.
	*/
	async getGameById(id) {
		return (await this._getGames("id", [id]))[0] ?? null;
	}
	/**
	* Gets the game data for the given game name.
	*
	* @param name The game name you want to look up.
	*/
	async getGameByName(name) {
		return (await this._getGames("name", [name]))[0] ?? null;
	}
	/**
	* Gets the game data for the given IGDB ID.
	*
	* @param igdbId The IGDB ID you want to look up.
	*/
	async getGameByIgdbId(igdbId) {
		return (await this._getGames("igdb_id", [igdbId]))[0] ?? null;
	}
	/**
	* Gets the game data for the given game ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param id The game ID you want to look up.
	*/
	async getGameByIdBatched(id) {
		return await this._getGameByIdBatcher.request(id);
	}
	/**
	* Gets the game data for the given game name, batching multiple calls into fewer requests as the API allows.
	*
	* @param name The game name you want to look up.
	*/
	async getGameByNameBatched(name) {
		return await this._getGameByNameBatcher.request(name);
	}
	/**
	* Gets the game data for the given IGDB ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param igdbId The IGDB ID you want to look up.
	*/
	async getGameByIgdbIdBatched(igdbId) {
		return await this._getGameByIgdbIdBatcher.request(igdbId);
	}
	/**
	* Gets a list of the most viewed games at the moment.
	*
	* @param pagination
	*
	* @expandParams
	*/
	async getTopGames(pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "games/top",
			query: createPaginationQuery(pagination)
		}), HelixGame, this._client);
	}
	/**
	* Creates a paginator for the most viewed games at the moment.
	*/
	getTopGamesPaginated() {
		return new HelixPaginatedRequest({ url: "games/top" }, this._client, (data) => new HelixGame(data, this._client));
	}
	/** @internal */
	async _getGames(filterType, filterValues) {
		if (!filterValues.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "games",
			query: { [filterType]: filterValues }
		})).data.map((entry) => new HelixGame(entry, this._client));
	}
};
__decorate([Enumerable(false)], HelixGameApi.prototype, "_getGameByIdBatcher", void 0);
__decorate([Enumerable(false)], HelixGameApi.prototype, "_getGameByNameBatcher", void 0);
__decorate([Enumerable(false)], HelixGameApi.prototype, "_getGameByIgdbIdBatcher", void 0);
HelixGameApi = __decorate([rtfm("api", "HelixGameApi")], HelixGameApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/goals/HelixGoal.js
init_tslib_es6();
/**
* A creator goal.
*/
let HelixGoal = class HelixGoal extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the goal.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster the goal belongs to.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The display name of the broadcaster the goal belongs to.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* The name of the broadcaster the goal belongs to.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The type of the goal.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The description of the goal.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The current value of the goal.
	*/
	get currentAmount() {
		return this[rawDataSymbol].current_amount;
	}
	/**
	* The target value of the goal.
	*/
	get targetAmount() {
		return this[rawDataSymbol].target_amount;
	}
	/**
	* The date and time when the goal was created.
	*/
	get creationDate() {
		return this[rawDataSymbol].created_at;
	}
};
__decorate([Enumerable(false)], HelixGoal.prototype, "_client", void 0);
HelixGoal = __decorate([rtfm("api", "HelixGoal", "id")], HelixGoal);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/goals/HelixGoalApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with creator goals.
*
* Can be accessed using `client.goals` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: goals } = await api.helix.goals.getGoals('61369223');
*
* @meta category helix
* @meta categorizedTitle Goals
*/
let HelixGoalApi = class HelixGoalApi extends BaseApi {
	async getGoals(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "goals",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:goals"],
			query: createBroadcasterQuery(broadcaster)
		})).data.map((data) => new HelixGoal(data, this._client));
	}
};
HelixGoalApi = __decorate([rtfm("api", "HelixGoalApi")], HelixGoalApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/hypeTrain/HelixHypeTrainContribution.js
init_tslib_es6();
/**
* A Hype Train contributor.
*/
let HelixHypeTrainContribution = class HelixHypeTrainContribution extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user contributing to the Hype Train.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user contributing to the Hype Train.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user contributing to the Hype Train.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets additional information about the user contributing to the Hype Train.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The type of the Hype Train contribution.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The total contribution amount in subs or bits.
	*/
	get total() {
		return this[rawDataSymbol].total;
	}
};
__decorate([Enumerable(false)], HelixHypeTrainContribution.prototype, "_client", void 0);
HelixHypeTrainContribution = __decorate([rtfm("api", "HelixHypeTrainContribution", "userId")], HelixHypeTrainContribution);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/hypeTrain/HelixHypeTrain.js
init_tslib_es6();
/**
* Data about the currently running Hype Train.
*/
let HelixHypeTrain = class HelixHypeTrain extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The unique ID of the Hype Train event.
	*/
	get eventId() {
		return this[rawDataSymbol].id;
	}
	/**
	* The unique ID of the Hype Train.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The user ID of the broadcaster where the Hype Train is happening.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_user_id;
	}
	/**
	* The name of the broadcaster where the Hype Train is happening.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_user_login;
	}
	/**
	* The display name of the broadcaster where the Hype Train is happening.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_user_name;
	}
	/**
	* Gets more information about the broadcaster where the Hype Train is happening.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_user_id));
	}
	/**
	* The level of the Hype Train.
	*/
	get level() {
		return this[rawDataSymbol].level;
	}
	/**
	* The total amount of progress points of the Hype Train.
	*/
	get total() {
		return this[rawDataSymbol].total;
	}
	/**
	* The amount progress points for the current level of the Hype Train.
	*/
	get progress() {
		return this[rawDataSymbol].progress;
	}
	/**
	* The progress points goal to reach the next Hype Train level.
	*/
	get goal() {
		return this[rawDataSymbol].goal;
	}
	/**
	* Array list of the top contributions to the Hype Train event for bits and subs.
	*/
	get topContributions() {
		return this[rawDataSymbol].top_contributions.map((cont) => new HelixHypeTrainContribution(cont, this._client));
	}
	/**
	* The time when the Hype Train started.
	*/
	get startDate() {
		return new Date(this[rawDataSymbol].started_at);
	}
	/**
	* The time when the Hype Train is set to expire.
	*/
	get expiryDate() {
		return new Date(this[rawDataSymbol].expires_at);
	}
	/**
	* The type of the Hype Train.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* Whether the Hype Train is a shared train.
	*/
	get isSharedTrain() {
		return this[rawDataSymbol].is_shared_train;
	}
};
__decorate([Enumerable(false)], HelixHypeTrain.prototype, "_client", void 0);
HelixHypeTrain = __decorate([rtfm("api", "HelixHypeTrain", "id")], HelixHypeTrain);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/hypeTrain/HelixHypeTrainAllTimeHigh.js
init_tslib_es6();
/**
* All-time-high Hype Train statistics.
*/
let HelixHypeTrainAllTimeHigh = class HelixHypeTrainAllTimeHigh extends DataObject {
	/**
	* The level reached by the all-time-high Hype Train.
	*/
	get level() {
		return this[rawDataSymbol].level;
	}
	/**
	* The total amount of contribution points reached by the all-time-high Hype Train.
	*/
	get total() {
		return this[rawDataSymbol].total;
	}
	/**
	* The time when the all-time-high Hype Train was achieved.
	*/
	get achievementDate() {
		return new Date(this[rawDataSymbol].achieved_at);
	}
};
HelixHypeTrainAllTimeHigh = __decorate([rtfm("api", "HelixHypeTrainAllTimeHigh")], HelixHypeTrainAllTimeHigh);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/hypeTrain/HelixHypeTrainStatus.js
init_tslib_es6();
/**
* Statistics of Hype Trains on a channel.
*/
let HelixHypeTrainStatus = class HelixHypeTrainStatus extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The current Hype Train, or null if there is no ongoing Hype Train.
	*/
	get current() {
		return mapNullable(this[rawDataSymbol].current, (data) => new HelixHypeTrain(data, this._client));
	}
	/**
	* The all-time-high Hype Train statistics for this channel, or null if there was no Hype Train yet.
	*/
	get allTimeHigh() {
		return mapNullable(this[rawDataSymbol].all_time_high, (data) => new HelixHypeTrainAllTimeHigh(data));
	}
	/**
	* The all-time-high shared Hype Train statistics for this channel, or null if there was no shared Hype Train yet.
	*/
	get sharedAllTimeHigh() {
		return mapNullable(this[rawDataSymbol].shared_all_time_high, (data) => new HelixHypeTrainAllTimeHigh(data));
	}
};
__decorate([Enumerable(false)], HelixHypeTrainStatus.prototype, "_client", void 0);
HelixHypeTrainStatus = __decorate([rtfm("api", "HelixHypeTrainStatus")], HelixHypeTrainStatus);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/hypeTrain/HelixHypeTrainApi.js
/**
* The Helix API methods that deal with Hype Trains.
*
* Can be accessed using `client.hypeTrain` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const hypeTrainStatus = await api.hypeTrain.getHypeTrainStatusForBroadcaster('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Hype Trains
*/
var HelixHypeTrainApi = class extends BaseApi {
	/**
	* Gets the Hype Train status and statistics for the specified broadcaster.
	*
	* @param broadcaster The broadcaster to fetch Hype Train info for.
	*/
	async getHypeTrainStatusForBroadcaster(broadcaster) {
		return new HelixHypeTrainStatus((await this._client.callApi({
			type: "helix",
			url: "hypetrain/status",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:hype_train"],
			query: { ...createBroadcasterQuery(broadcaster) }
		})).data[0], this._client);
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/moderation.external.js
/** @internal */
function createModerationUserListQuery(channel, filter) {
	return {
		broadcaster_id: extractUserId(channel),
		user_id: filter?.userId
	};
}
/** @internal */
function createModeratorModifyQuery(broadcaster, user) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		user_id: extractUserId(user)
	};
}
/** @internal */
function createResolveUnbanRequestQuery(broadcaster, moderator, unbanRequestId, approved, resolutionMessage) {
	return {
		unban_request_id: unbanRequestId,
		broadcaster_id: extractUserId(broadcaster),
		moderator_id: extractUserId(moderator),
		status: approved ? "approved" : "denied",
		resolution_text: resolutionMessage
	};
}
/** @internal */
function createAutoModProcessBody(user, msgId, allow) {
	return {
		user_id: extractUserId(user),
		msg_id: msgId,
		action: allow ? "ALLOW" : "DENY"
	};
}
/** @internal */
function createAutoModSettingsBody(data) {
	return {
		overall_level: data.overallLevel,
		aggression: data.aggression,
		bullying: data.bullying,
		disability: data.disability,
		misogyny: data.misogyny,
		race_ethnicity_or_religion: data.raceEthnicityOrReligion,
		sex_based_terms: data.sexBasedTerms,
		sexuality_sex_or_gender: data.sexualitySexOrGender,
		swearing: data.swearing
	};
}
/** @internal */
function createBanUserBody(data) {
	return { data: {
		duration: data.duration,
		reason: data.reason,
		user_id: extractUserId(data.user)
	} };
}
/** @internal */
function createUpdateShieldModeStatusBody(activate) {
	return { is_active: activate };
}
/** @internal */
function createCheckAutoModStatusBody(data) {
	return { data: data.map((entry) => ({
		msg_id: entry.messageId,
		msg_text: entry.messageText
	})) };
}
/** @internal */
function createWarnUserBody(user, reason) {
	return { data: {
		user_id: extractUserId(user),
		reason
	} };
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixAutoModSettings.js
init_tslib_es6();
/**
* The AutoMod settings of a channel.
*/
let HelixAutoModSettings = class HelixAutoModSettings extends DataObject {
	/**
	* The ID of the broadcaster for which the AutoMod settings were fetched.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The ID of a user that has permission to moderate the broadcaster's chat room.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* The default AutoMod level for the broadcaster. This is null if the broadcaster changed individual settings.
	*/
	get overallLevel() {
		return this[rawDataSymbol].overall_level ? this[rawDataSymbol].overall_level : null;
	}
	/**
	* The AutoMod level for discrimination against disability.
	*/
	get disability() {
		return this[rawDataSymbol].disability;
	}
	/**
	* The AutoMod level for hostility involving aggression.
	*/
	get aggression() {
		return this[rawDataSymbol].aggression;
	}
	/**
	* The AutoMod level for discrimination based on sexuality, sex, or gender.
	*/
	get sexualitySexOrGender() {
		return this[rawDataSymbol].sexuality_sex_or_gender;
	}
	/**
	* The AutoMod level for discrimination against women.
	*/
	get misogyny() {
		return this[rawDataSymbol].misogyny;
	}
	/**
	* The AutoMod level for hostility involving name calling or insults.
	*/
	get bullying() {
		return this[rawDataSymbol].bullying;
	}
	/**
	* The AutoMod level for profanity.
	*/
	get swearing() {
		return this[rawDataSymbol].swearing;
	}
	/**
	* The AutoMod level for racial discrimination.
	*/
	get raceEthnicityOrReligion() {
		return this[rawDataSymbol].race_ethnicity_or_religion;
	}
	/**
	* The AutoMod level for sexual content.
	*/
	get sexBasedTerms() {
		return this[rawDataSymbol].sex_based_terms;
	}
};
HelixAutoModSettings = __decorate([rtfm("api", "HelixAutoModSettings", "broadcasterId")], HelixAutoModSettings);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixAutoModStatus.js
init_tslib_es6();
/**
* The status of a message that says whether it is permitted by AutoMod or not.
*/
let HelixAutoModStatus = class HelixAutoModStatus extends DataObject {
	/**
	* The developer-generated ID that was sent with the request data.
	*/
	get messageId() {
		return this[rawDataSymbol].msg_id;
	}
	/**
	* Whether the message is permitted by AutoMod or not.
	*/
	get isPermitted() {
		return this[rawDataSymbol].is_permitted;
	}
};
HelixAutoModStatus = __decorate([rtfm("api", "HelixAutoModStatus", "messageId")], HelixAutoModStatus);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixBanUser.js
init_tslib_es6();
/**
* Information about a user who has been banned/timed out.
*
* @hideProtected
*/
let HelixBanUser = class HelixBanUser extends DataObject {
	/** @internal */ _client;
	/** @internal */ _expiryTimestamp;
	/** @internal */
	constructor(data, expiryTimestamp, client) {
		super(data);
		this._expiryTimestamp = expiryTimestamp;
		this._client = client;
	}
	/**
	* The date and time that the ban/timeout was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date and time that the timeout will end. Is `null` if the user was banned instead of put in a timeout.
	*/
	get expiryDate() {
		return mapNullable(this._expiryTimestamp, (ts) => new Date(ts));
	}
	/**
	* The ID of the moderator that banned or put the user in the timeout.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* Gets more information about the moderator that banned or put the user in the timeout.
	*/
	async getModerator() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].moderator_id));
	}
	/**
	* The ID of the user that was banned or put in a timeout.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* Gets more information about the user that was banned or put in a timeout.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixBanUser.prototype, "_client", void 0);
__decorate([Enumerable(false)], HelixBanUser.prototype, "_expiryTimestamp", void 0);
HelixBanUser = __decorate([rtfm("api", "HelixBanUser", "userId")], HelixBanUser);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixBan.js
init_tslib_es6();
/**
* Information about the ban of a user.
*
* @inheritDoc
*/
let HelixBan = class HelixBan extends HelixBanUser {
	/** @internal */
	constructor(data, client) {
		super(data, data.expires_at || null, client);
	}
	/**
	* The name of the user that was banned or put in a timeout.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user that was banned or put in a timeout.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* The name of the moderator that banned or put the user in the timeout.
	*/
	get moderatorName() {
		return this[rawDataSymbol].moderator_login;
	}
	/**
	* The display name of the moderator that banned or put the user in the timeout.
	*/
	get moderatorDisplayName() {
		return this[rawDataSymbol].moderator_name;
	}
	/**
	* The reason why the user was banned or timed out. Returns `null` if no reason was given.
	*/
	get reason() {
		return this[rawDataSymbol].reason || null;
	}
};
HelixBan = __decorate([rtfm("api", "HelixBan", "userId")], HelixBan);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixBlockedTerm.js
init_tslib_es6();
/**
* Information about a word or phrase blocked in a broadcaster's channel.
*/
let HelixBlockedTerm = class HelixBlockedTerm extends DataObject {
	/**
	* The ID of the broadcaster that owns the list of blocked terms.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The date and time of when the term was blocked.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date and time of when the blocked term is set to expire. After the block expires, users will be able to use the term in the broadcaster’s chat room.
	* Is `null` if the term was added manually or permanently blocked by AutoMod.
	*/
	get expirationDate() {
		return this[rawDataSymbol].expires_at ? new Date(this[rawDataSymbol].expires_at) : null;
	}
	/**
	* An ID that uniquely identifies this blocked term.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the moderator that blocked the word or phrase from being used in the broadcaster’s chat room.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* The blocked word or phrase.
	*/
	get text() {
		return this[rawDataSymbol].text;
	}
	/**
	* The date and time of when the term was updated.
	*/
	get updatedDate() {
		return new Date(this[rawDataSymbol].updated_at);
	}
};
HelixBlockedTerm = __decorate([rtfm("api", "HelixBlockedTerm", "id")], HelixBlockedTerm);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixModeratedChannel.js
init_tslib_es6();
/**
* A reference to a Twitch channel where a user is a moderator.
*/
let HelixModeratedChannel = class HelixModeratedChannel extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the channel.
	*/
	get id() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the channel.
	*/
	get name() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the channel.
	*/
	get displayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the channel.
	*/
	async getChannel() {
		return checkRelationAssertion(await this._client.channels.getChannelInfoById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* Gets more information about the broadcaster of the channel.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
};
__decorate([Enumerable(false)], HelixModeratedChannel.prototype, "_client", void 0);
HelixModeratedChannel = __decorate([rtfm("api", "HelixModeratedChannel", "id")], HelixModeratedChannel);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixModerator.js
init_tslib_es6();
/**
* Information about the moderator status of a user.
*/
let HelixModerator = class HelixModerator extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixModerator.prototype, "_client", void 0);
HelixModerator = __decorate([rtfm("api", "HelixModerator", "userId")], HelixModerator);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixShieldModeStatus.js
init_tslib_es6();
/**
* Information about the Shield Mode status of a channel.
*/
let HelixShieldModeStatus = class HelixShieldModeStatus extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* Whether Shield Mode is active.
	*/
	get isActive() {
		return this[rawDataSymbol].is_active;
	}
	/**
	* The ID of the moderator that last activated Shield Mode.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* The name of the moderator that last activated Shield Mode.
	*/
	get moderatorName() {
		return this[rawDataSymbol].moderator_login;
	}
	/**
	* The display name of the moderator that last activated Shield Mode.
	*/
	get moderatorDisplayName() {
		return this[rawDataSymbol].moderator_name;
	}
	/**
	* Gets more information about the moderator that last activated Shield Mode.
	*/
	async getModerator() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].moderator_id));
	}
	/**
	* The date when Shield Mode was last activated. `null` indicates Shield Mode hasn't been previously activated.
	*/
	get lastActivationDate() {
		return this[rawDataSymbol].last_activated_at === "" ? null : new Date(this[rawDataSymbol].last_activated_at);
	}
};
__decorate([Enumerable(false)], HelixShieldModeStatus.prototype, "_client", void 0);
HelixShieldModeStatus = __decorate([rtfm("api", "HelixShieldModeStatus")], HelixShieldModeStatus);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixUnbanRequest.js
init_tslib_es6();
/**
* A request from a user to be unbanned from a channel.
*/
let HelixUnbanRequest = class HelixUnbanRequest extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* Unban request ID.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster whose channel is receiving the unban request.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster whose channel is receiving the unban request.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The display name of the broadcaster whose channel is receiving the unban request.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The ID of the moderator who resolved the unban request.
	*
	* Can be `null` if the request is not resolved.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* The name of the moderator who resolved the unban request.
	*
	* Can be `null` if the request is not resolved.
	*/
	get moderatorName() {
		return this[rawDataSymbol].moderator_login;
	}
	/**
	* The display name of the moderator who resolved the unban request.
	*
	* Can be `null` if the request is not resolved.
	*/
	get moderatorDisplayName() {
		return this[rawDataSymbol].moderator_name;
	}
	/**
	* Gets more information about the moderator.
	*/
	async getModerator() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].moderator_id));
	}
	/**
	* The ID of the user who requested to be unbanned.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user who requested to be unbanned.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user who requested to be unbanned.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* Text message of the unban request from the requesting user.
	*/
	get message() {
		return this[rawDataSymbol].text;
	}
	/**
	* The date of when the unban request was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The message written by the moderator who resolved the unban request, or `null` if it has not been resolved yet.
	*/
	get resolutionMessage() {
		return this[rawDataSymbol].resolution_text || null;
	}
	/**
	* The date when the unban request was resolved, or `null` if it has not been resolved yet.
	*/
	get resolutionDate() {
		return mapNullable(this[rawDataSymbol].resolved_at, (val) => new Date(val));
	}
};
__decorate([Enumerable(false)], HelixUnbanRequest.prototype, "_client", void 0);
HelixUnbanRequest = __decorate([rtfm("api", "HelixUnbanRequest", "id")], HelixUnbanRequest);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixWarning.js
init_tslib_es6();
/**
* Information about the warning.
*/
let HelixWarning = class HelixWarning extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the channel in which the warning will take effect.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The ID of the user who applied the warning.
	*/
	get moderatorId() {
		return this[rawDataSymbol].moderator_id;
	}
	/**
	* Gets more information about the moderator.
	*/
	async getModerator() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].moderator_id));
	}
	/**
	* The ID of the warned user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* Gets more information about the user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The reason provided for the warning.
	*/
	get reason() {
		return this[rawDataSymbol].reason;
	}
};
__decorate([Enumerable(false)], HelixWarning.prototype, "_client", void 0);
HelixWarning = __decorate([rtfm("api", "HelixWarning", "userId")], HelixWarning);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/moderation/HelixModerationApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with moderation.
*
* Can be accessed using `client.moderation` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: users } = await api.moderation.getBannedUsers('61369223');
* ```
*
* @meta category helix
* @meta categorizedTitle Moderation
*/
let HelixModerationApi = class HelixModerationApi extends BaseApi {
	/**
	* Gets a list of banned users in a given channel.
	*
	* @param channel The channel to get the banned users from.
	* @param filter Additional filters for the result set.
	*
	* @expandParams
	*/
	async getBannedUsers(channel, filter) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "moderation/banned",
			userId: extractUserId(channel),
			scopes: ["moderation:read"],
			query: {
				...createModerationUserListQuery(channel, filter),
				...createPaginationQuery(filter)
			}
		}), HelixBan, this._client);
	}
	/**
	* Creates a paginator for banned users in a given channel.
	*
	* @param channel The channel to get the banned users from.
	*/
	getBannedUsersPaginated(channel) {
		return new HelixPaginatedRequest({
			url: "moderation/banned",
			userId: extractUserId(channel),
			scopes: ["moderation:read"],
			query: createBroadcasterQuery(channel)
		}, this._client, (data) => new HelixBan(data, this._client), 50);
	}
	/**
	* Checks whether a given user is banned in a given channel.
	*
	* @param channel The channel to check for a ban of the given user.
	* @param user The user to check for a ban in the given channel.
	*/
	async checkUserBan(channel, user) {
		const userId = extractUserId(user);
		return (await this.getBannedUsers(channel, { userId })).data.some((ban) => ban.userId === userId);
	}
	/**
	* Gets a list of moderators in a given channel.
	*
	* @param channel The channel to get moderators from.
	* @param filter Additional filters for the result set.
	*
	* @expandParams
	*/
	async getModerators(channel, filter) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "moderation/moderators",
			userId: extractUserId(channel),
			scopes: ["moderation:read", "channel:manage:moderators"],
			query: {
				...createModerationUserListQuery(channel, filter),
				...createPaginationQuery(filter)
			}
		}), HelixModerator, this._client);
	}
	/**
	* Creates a paginator for moderators in a given channel.
	*
	* @param channel The channel to get moderators from.
	*/
	getModeratorsPaginated(channel) {
		return new HelixPaginatedRequest({
			url: "moderation/moderators",
			userId: extractUserId(channel),
			scopes: ["moderation:read", "channel:manage:moderators"],
			query: createBroadcasterQuery(channel)
		}, this._client, (data) => new HelixModerator(data, this._client));
	}
	/**
	* Gets a list of channels where the specified user has moderator privileges.
	*
	* @param user The user for whom to return a list of channels where they have moderator privileges.
	* This ID must match the user ID in the access token.
	* @param filter
	*
	* @expandParams
	*
	* @returns A paginated list of channels where the user has moderator privileges.
	*/
	async getModeratedChannels(user, filter) {
		const userId = extractUserId(user);
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "moderation/channels",
			userId,
			scopes: ["user:read:moderated_channels"],
			query: {
				...createSingleKeyQuery("user_id", userId),
				...createPaginationQuery(filter)
			}
		}), HelixModeratedChannel, this._client);
	}
	/**
	* Creates a paginator for channels where the specified user has moderator privileges.
	*
	* @param user The user for whom to return the list of channels where they have moderator privileges.
	* This ID must match the user ID in the access token.
	*/
	getModeratedChannelsPaginated(user) {
		const userId = extractUserId(user);
		return new HelixPaginatedRequest({
			url: "moderation/channels",
			userId,
			scopes: ["user:read:moderated_channels"],
			query: createSingleKeyQuery("user_id", userId)
		}, this._client, (data) => new HelixModeratedChannel(data, this._client));
	}
	/**
	* Checks whether a given user is a moderator of a given channel.
	*
	* @param channel The channel to check.
	* @param user The user to check.
	*/
	async checkUserMod(channel, user) {
		const userId = extractUserId(user);
		return (await this.getModerators(channel, { userId })).data.some((mod) => mod.userId === userId);
	}
	/**
	* Adds a moderator to the broadcaster’s chat room.
	*
	* @param broadcaster The broadcaster that owns the chat room. This ID must match the user ID in the access token.
	* @param user The user to add as a moderator in the broadcaster’s chat room.
	*/
	async addModerator(broadcaster, user) {
		await this._client.callApi({
			type: "helix",
			url: "moderation/moderators",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:moderators"],
			query: createModeratorModifyQuery(broadcaster, user)
		});
	}
	/**
	* Removes a moderator from the broadcaster’s chat room.
	*
	* @param broadcaster The broadcaster that owns the chat room. This ID must match the user ID in the access token.
	* @param user The user to remove as a moderator from the broadcaster’s chat room.
	*/
	async removeModerator(broadcaster, user) {
		await this._client.callApi({
			type: "helix",
			url: "moderation/moderators",
			method: "DELETE",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:moderators"],
			query: createModeratorModifyQuery(broadcaster, user)
		});
	}
	/**
	* Determines whether a string message meets the channel's AutoMod requirements.
	*
	* @param channel The channel in which the messages to check are posted.
	* @param data An array of message data objects.
	*/
	async checkAutoModStatus(channel, data) {
		return (await this._client.callApi({
			type: "helix",
			url: "moderation/enforcements/status",
			method: "POST",
			userId: extractUserId(channel),
			scopes: ["moderation:read"],
			query: createBroadcasterQuery(channel),
			jsonBody: createCheckAutoModStatusBody(data)
		})).data.map((statusData) => new HelixAutoModStatus(statusData));
	}
	/**
	* Processes a message held by AutoMod.
	*
	* @param user The user who is processing the message.
	* @param msgId The ID of the message.
	* @param allow Whether to allow the message - `true` allows, and `false` denies.
	*/
	async processHeldAutoModMessage(user, msgId, allow) {
		await this._client.callApi({
			type: "helix",
			url: "moderation/automod/message",
			method: "POST",
			userId: extractUserId(user),
			scopes: ["moderator:manage:automod"],
			jsonBody: createAutoModProcessBody(user, msgId, allow)
		});
	}
	/**
	* Gets the AutoMod settings for a broadcaster.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster to get the AutoMod settings for.
	*/
	async getAutoModSettings(broadcaster) {
		const broadcasterId = extractUserId(broadcaster);
		return (await this._client.callApi({
			type: "helix",
			url: "moderation/automod/settings",
			userId: broadcasterId,
			scopes: ["moderator:read:automod_settings"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId)
		})).data.map((data) => new HelixAutoModSettings(data));
	}
	/**
	* Updates the AutoMod settings for a broadcaster.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster for which the AutoMod settings are updated.
	* @param data The updated AutoMod settings that replace the current AutoMod settings.
	*/
	async updateAutoModSettings(broadcaster, data) {
		const broadcasterId = extractUserId(broadcaster);
		return (await this._client.callApi({
			type: "helix",
			url: "moderation/automod/settings",
			method: "PUT",
			userId: broadcasterId,
			scopes: ["moderator:manage:automod_settings"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: createAutoModSettingsBody(data)
		})).data.map((settingsData) => new HelixAutoModSettings(settingsData));
	}
	/**
	* Bans or times out a user in a channel.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster in whose channel the user will be banned/timed out.
	* @param data
	*
	* @expandParams
	*
	* @returns The result data from the ban/timeout request.
	*/
	async banUser(broadcaster, data) {
		const broadcasterId = extractUserId(broadcaster);
		return (await this._client.callApi({
			type: "helix",
			url: "moderation/bans",
			method: "POST",
			userId: broadcasterId,
			scopes: ["moderator:manage:banned_users"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: createBanUserBody(data)
		})).data.map((banData) => new HelixBanUser(banData, banData.end_time, this._client));
	}
	/**
	* Unbans/removes the timeout for a user in a channel.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster in whose channel the user will be unbanned/removed from timeout.
	* @param user The user who will be unbanned/removed from timeout.
	*/
	async unbanUser(broadcaster, user) {
		const broadcasterId = extractUserId(broadcaster);
		await this._client.callApi({
			type: "helix",
			url: "moderation/bans",
			method: "DELETE",
			userId: broadcasterId,
			scopes: ["moderator:manage:banned_users"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createSingleKeyQuery("user_id", extractUserId(user))
			}
		});
	}
	/**
	* Gets the broadcaster’s list of non-private, blocked words or phrases.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster to get their channel's blocked terms for.
	* @param pagination
	*
	* @expandParams
	*
	* @returns A paginated list of blocked term data in the broadcaster's channel.
	*/
	async getBlockedTerms(broadcaster, pagination) {
		const broadcasterId = extractUserId(broadcaster);
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "moderation/blocked_terms",
			userId: broadcasterId,
			scopes: ["moderator:read:blocked_terms"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createPaginationQuery(pagination)
			}
		}), HelixBlockedTerm, this._client);
	}
	/**
	* Adds a blocked term to the broadcaster's channel.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster in whose channel the term will be blocked.
	* @param text The word or phrase to block from being used in the broadcaster's channel.
	*
	* @returns Information about the term that has been blocked.
	*/
	async addBlockedTerm(broadcaster, text) {
		const broadcasterId = extractUserId(broadcaster);
		return (await this._client.callApi({
			type: "helix",
			url: "moderation/blocked_terms",
			method: "POST",
			userId: broadcasterId,
			scopes: ["moderator:manage:blocked_terms"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: { text }
		})).data.map((blockedTermData) => new HelixBlockedTerm(blockedTermData));
	}
	/**
	* Removes a blocked term from the broadcaster's channel.
	*
	* @param broadcaster The broadcaster in whose channel the term will be unblocked.
	* @param moderator A user that has permission to unblock terms in the broadcaster's channel.
	* The token of this user will be used to remove the blocked term.
	* @param id The ID of the term that should be unblocked.
	*/
	async removeBlockedTerm(broadcaster, moderator, id) {
		const broadcasterId = extractUserId(broadcaster);
		await this._client.callApi({
			type: "helix",
			url: "moderation/blocked_terms",
			method: "DELETE",
			userId: broadcasterId,
			scopes: ["moderator:manage:blocked_terms"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				id
			}
		});
	}
	/**
	* Removes a single chat message or all chat messages from the broadcaster’s chat room.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster the chat belongs to.
	* @param messageId The ID of the message to remove. If not specified, the request removes all messages in the broadcaster’s chat room.
	*/
	async deleteChatMessages(broadcaster, messageId) {
		const broadcasterId = extractUserId(broadcaster);
		await this._client.callApi({
			type: "helix",
			url: "moderation/chat",
			method: "DELETE",
			userId: broadcasterId,
			scopes: ["moderator:manage:chat_messages"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createSingleKeyQuery("message_id", messageId)
			}
		});
	}
	/**
	* Gets the broadcaster's Shield Mode activation status.
	*
	* @param broadcaster The broadcaster whose Shield Mode activation status you want to get.
	*/
	async getShieldModeStatus(broadcaster) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixShieldModeStatus((await this._client.callApi({
			type: "helix",
			url: "moderation/shield_mode",
			method: "GET",
			userId: broadcasterId,
			scopes: ["moderator:read:shield_mode", "moderator:manage:shield_mode"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId)
		})).data[0], this._client);
	}
	/**
	* Activates or deactivates the broadcaster's Shield Mode.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The broadcaster whose Shield Mode you want to activate or deactivate.
	* @param activate The desired Shield Mode status on the broadcaster's channel.
	*/
	async updateShieldModeStatus(broadcaster, activate) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixShieldModeStatus((await this._client.callApi({
			type: "helix",
			url: "moderation/shield_mode",
			method: "PUT",
			userId: broadcasterId,
			scopes: ["moderator:manage:shield_mode"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: createUpdateShieldModeStatusBody(activate)
		})).data[0], this._client);
	}
	/**
	* Gets a list of unban requests.
	*
	* @param broadcaster The broadcaster to get unban requests of.
	* @param status The status of unban requests to retrieve.
	* @param filter Additional filters for the result set.
	*/
	async getUnbanRequests(broadcaster, status, filter) {
		const broadcasterId = extractUserId(broadcaster);
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "moderation/unban_requests",
			method: "GET",
			userId: broadcasterId,
			scopes: ["moderator:read:unban_requests", "moderator:manage:unban_requests"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createSingleKeyQuery("status", status),
				...createPaginationQuery(filter)
			}
		}), HelixUnbanRequest, this._client);
	}
	/**
	* Creates a paginator for unban requests.
	*
	* @param broadcaster The broadcaster to get unban requests of.
	* @param status The status of unban requests to retrieve.
	*/
	getUnbanRequestsPaginated(broadcaster, status) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixPaginatedRequest({
			url: "moderation/unban_requests",
			method: "GET",
			userId: broadcasterId,
			scopes: ["moderator:read:unban_requests", "moderator:manage:unban_requests"],
			canOverrideScopedUserContext: true,
			query: {
				...this._createModeratorActionQuery(broadcasterId),
				...createSingleKeyQuery("status", status)
			}
		}, this._client, (data) => new HelixUnbanRequest(data, this._client));
	}
	/**
	* Resolves an unban request by approving or denying it.
	*
	* This uses the token of the broadcaster by default.
	* If you want to execute this in the context of another user (who has to be moderator of the channel)
	* you can do so using [user context overrides](/docs/auth/concepts/context-switching).
	*
	* @param broadcaster The ID of the broadcaster whose channel is approving or denying the unban request.
	* @param unbanRequestId The ID of the unban request to resolve.
	* @param approved Whether to approve or deny the unban request.
	* @param resolutionMessage Message supplied by the unban request resolver.
	*
	* The message is limited to a maximum of 500 characters.
	*/
	async resolveUnbanRequest(broadcaster, unbanRequestId, approved, resolutionMessage) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixUnbanRequest((await this._client.callApi({
			type: "helix",
			url: "moderation/unban_requests",
			method: "PATCH",
			userId: broadcasterId,
			scopes: ["moderator:manage:unban_requests"],
			canOverrideScopedUserContext: true,
			query: createResolveUnbanRequestQuery(broadcasterId, this._getUserContextIdWithDefault(broadcasterId), unbanRequestId, approved, resolutionMessage?.slice(0, 500))
		})).data[0], this._client);
	}
	/**
	* Warns a user in the specified broadcaster’s chat room, preventing them from chat interaction until the
	* warning is acknowledged.
	*
	* New warnings can be issued to a user when they already have a warning in the channel
	* (new warning will replace old warning).
	*
	* @param broadcaster The ID of the broadcaster in which channel the warning will take effect.
	* @param user The ID of the user to be warned.
	* @param reason A custom reason for the warning. Max 500 chars.
	*/
	async warnUser(broadcaster, user, reason) {
		const broadcasterId = extractUserId(broadcaster);
		return new HelixWarning((await this._client.callApi({
			type: "helix",
			url: "moderation/warnings",
			method: "POST",
			userId: broadcasterId,
			scopes: ["moderator:manage:warnings"],
			canOverrideScopedUserContext: true,
			query: this._createModeratorActionQuery(broadcasterId),
			jsonBody: createWarnUserBody(user, reason.slice(0, 500))
		})).data[0], this._client);
	}
	_createModeratorActionQuery(broadcasterId) {
		return createModeratorActionQuery(broadcasterId, this._getUserContextIdWithDefault(broadcasterId));
	}
};
HelixModerationApi = __decorate([rtfm("api", "HelixModerationApi")], HelixModerationApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/poll.external.js
/** @internal */
function createPollBody(broadcaster, data) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		title: data.title,
		choices: data.choices.map((title) => ({ title })),
		duration: data.duration,
		channel_points_voting_enabled: data.channelPointsPerVote != null,
		channel_points_per_vote: data.channelPointsPerVote ?? 0
	};
}
/** @internal */
function createPollEndBody(broadcaster, id, showResult) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		id,
		status: showResult ? "TERMINATED" : "ARCHIVED"
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/poll/HelixPollChoice.js
init_tslib_es6();
/**
* A choice in a channel poll.
*/
let HelixPollChoice = class HelixPollChoice extends DataObject {
	/**
	* The ID of the choice.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The title of the choice.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The total votes the choice received.
	*/
	get totalVotes() {
		return this[rawDataSymbol].votes;
	}
	/**
	* The votes the choice received by spending channel points.
	*/
	get channelPointsVotes() {
		return this[rawDataSymbol].channel_points_votes;
	}
};
HelixPollChoice = __decorate([rtfm("api", "HelixPollChoice", "id")], HelixPollChoice);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/poll/HelixPoll.js
init_tslib_es6();
/**
* A channel poll.
*/
let HelixPoll = class HelixPoll extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the poll.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The title of the poll.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* Whether voting with channel points is enabled for the poll.
	*/
	get isChannelPointsVotingEnabled() {
		return this[rawDataSymbol].channel_points_voting_enabled;
	}
	/**
	* The amount of channel points that a vote costs.
	*/
	get channelPointsPerVote() {
		return this[rawDataSymbol].channel_points_per_vote;
	}
	/**
	* The status of the poll.
	*/
	get status() {
		return this[rawDataSymbol].status;
	}
	/**
	* The duration of the poll, in seconds.
	*/
	get durationInSeconds() {
		return this[rawDataSymbol].duration;
	}
	/**
	* The date when the poll started.
	*/
	get startDate() {
		return new Date(this[rawDataSymbol].started_at);
	}
	/**
	* The date when the poll ended or will end.
	*/
	get endDate() {
		return new Date(this.startDate.getTime() + this[rawDataSymbol].duration * 1e3);
	}
	/**
	* The choices of the poll.
	*/
	get choices() {
		return this[rawDataSymbol].choices.map((data) => new HelixPollChoice(data));
	}
};
__decorate([Enumerable(false)], HelixPoll.prototype, "_client", void 0);
HelixPoll = __decorate([rtfm("api", "HelixPoll", "id")], HelixPoll);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/poll/HelixPollApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with polls.
*
* Can be accessed using `client.polls` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: polls } = await api.helix.polls.getPolls('61369223');
* ```
*
* @meta category helix
* @meta categorizedTitle Polls
*/
let HelixPollApi = class HelixPollApi extends BaseApi {
	/**
	* Gets a list of polls for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get polls for.
	* @param pagination
	*
	* @expandParams
	*/
	async getPolls(broadcaster, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "polls",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:polls", "channel:manage:polls"],
			query: {
				...createBroadcasterQuery(broadcaster),
				...createPaginationQuery(pagination)
			}
		}), HelixPoll, this._client);
	}
	/**
	* Creates a paginator for polls for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get polls for.
	*/
	getPollsPaginated(broadcaster) {
		return new HelixPaginatedRequest({
			url: "polls",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:polls", "channel:manage:polls"],
			query: createBroadcasterQuery(broadcaster)
		}, this._client, (data) => new HelixPoll(data, this._client), 20);
	}
	/**
	* Gets polls by IDs.
	*
	* @param broadcaster The broadcaster to get the polls for.
	* @param ids The IDs of the polls.
	*/
	async getPollsByIds(broadcaster, ids) {
		if (!ids.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "polls",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:polls", "channel:manage:polls"],
			query: createGetByIdsQuery(broadcaster, ids)
		})).data.map((data) => new HelixPoll(data, this._client));
	}
	/**
	* Gets a poll by ID.
	*
	* @param broadcaster The broadcaster to get the poll for.
	* @param id The ID of the poll.
	*/
	async getPollById(broadcaster, id) {
		const polls = await this.getPollsByIds(broadcaster, [id]);
		return polls.length ? polls[0] : null;
	}
	/**
	* Creates a new poll.
	*
	* @param broadcaster The broadcaster to create the poll for.
	* @param data
	*
	* @expandParams
	*/
	async createPoll(broadcaster, data) {
		return new HelixPoll((await this._client.callApi({
			type: "helix",
			url: "polls",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:polls"],
			jsonBody: createPollBody(broadcaster, data)
		})).data[0], this._client);
	}
	/**
	* Ends a poll.
	*
	* @param broadcaster The broadcaster to end the poll for.
	* @param id The ID of the poll to end.
	* @param showResult Whether to allow the result to be viewed publicly.
	*/
	async endPoll(broadcaster, id, showResult = true) {
		return new HelixPoll((await this._client.callApi({
			type: "helix",
			url: "polls",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:polls"],
			jsonBody: createPollEndBody(broadcaster, id, showResult)
		})).data[0], this._client);
	}
};
HelixPollApi = __decorate([rtfm("api", "HelixPollApi")], HelixPollApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/prediction.external.js
/** @internal */
function createPredictionBody(broadcaster, data) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		title: data.title,
		outcomes: data.outcomes.map((title) => ({ title })),
		prediction_window: data.autoLockAfter
	};
}
/** @internal */
function createEndPredictionBody(broadcaster, id, status, outcomeId) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		id,
		status,
		winning_outcome_id: outcomeId
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/prediction/HelixPredictor.js
init_tslib_es6();
/**
* A user that took part in a prediction.
*/
let HelixPredictor = class HelixPredictor extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The user ID of the predictor.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the predictor.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the predictor.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the predictor.
	*/
	async getUser() {
		return await this._client.users.getUserById(this[rawDataSymbol].user_id);
	}
	/**
	* The amount of channel points the predictor used for the prediction.
	*/
	get channelPointsUsed() {
		return this[rawDataSymbol].channel_points_used;
	}
	/**
	* The amount of channel points the predictor won for the prediction, or null if the prediction is not resolved yet, was cancelled or lost.
	*/
	get channelPointsWon() {
		return this[rawDataSymbol].channel_points_won;
	}
};
__decorate([Enumerable(false)], HelixPredictor.prototype, "_client", void 0);
HelixPredictor = __decorate([rtfm("api", "HelixPredictor", "userId")], HelixPredictor);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/prediction/HelixPredictionOutcome.js
init_tslib_es6();
/**
* A possible outcome in a channel prediction.
*/
let HelixPredictionOutcome = class HelixPredictionOutcome extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the outcome.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The title of the outcome.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The number of users that guessed the outcome.
	*/
	get users() {
		return this[rawDataSymbol].users;
	}
	/**
	* The total number of channel points that were spent on guessing the outcome.
	*/
	get totalChannelPoints() {
		return this[rawDataSymbol].channel_points;
	}
	/**
	* The color of the outcome.
	*/
	get color() {
		return this[rawDataSymbol].color;
	}
	/**
	* The top predictors of the outcome.
	*/
	get topPredictors() {
		return this[rawDataSymbol].top_predictors?.map((data) => new HelixPredictor(data, this._client)) ?? [];
	}
};
__decorate([Enumerable(false)], HelixPredictionOutcome.prototype, "_client", void 0);
HelixPredictionOutcome = __decorate([rtfm("api", "HelixPredictionOutcome", "id")], HelixPredictionOutcome);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/prediction/HelixPrediction.js
init_tslib_es6();
/**
* A channel prediction.
*/
let HelixPrediction = class HelixPrediction extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the prediction.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The title of the prediction.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The status of the prediction.
	*/
	get status() {
		return this[rawDataSymbol].status;
	}
	/**
	* The time after which the prediction will be automatically locked, in seconds from creation.
	*/
	get autoLockAfter() {
		return this[rawDataSymbol].prediction_window;
	}
	/**
	* The date when the prediction started.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date when the prediction ended, or null if it didn't end yet.
	*/
	get endDate() {
		return this[rawDataSymbol].ended_at ? new Date(this[rawDataSymbol].ended_at) : null;
	}
	/**
	* The date when the prediction was locked, or null if it wasn't locked yet.
	*/
	get lockDate() {
		return this[rawDataSymbol].locked_at ? new Date(this[rawDataSymbol].locked_at) : null;
	}
	/**
	* The possible outcomes of the prediction.
	*/
	get outcomes() {
		return this[rawDataSymbol].outcomes.map((data) => new HelixPredictionOutcome(data, this._client));
	}
	/**
	* The ID of the winning outcome, or null if the prediction is currently running or was canceled.
	*/
	get winningOutcomeId() {
		return this[rawDataSymbol].winning_outcome_id || null;
	}
	/**
	* The winning outcome, or null if the prediction is currently running or was canceled.
	*/
	get winningOutcome() {
		if (!this[rawDataSymbol].winning_outcome_id) return null;
		const found = this[rawDataSymbol].outcomes.find((o) => o.id === this[rawDataSymbol].winning_outcome_id);
		if (!found) throw new HellFreezesOverError("Winning outcome not found in outcomes array");
		return new HelixPredictionOutcome(found, this._client);
	}
};
__decorate([Enumerable(false)], HelixPrediction.prototype, "_client", void 0);
HelixPrediction = __decorate([rtfm("api", "HelixPrediction", "id")], HelixPrediction);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/prediction/HelixPredictionApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with predictions.
*
* Can be accessed using `client.predictions` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: predictions } = await api.helix.predictions.getPredictions('61369223');
* ```
*
* @meta category helix
* @meta categorizedTitle Predictions
*/
let HelixPredictionApi = class HelixPredictionApi extends BaseApi {
	/**
	* Gets a list of predictions for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get predictions for.
	* @param pagination
	*
	* @expandParams
	*/
	async getPredictions(broadcaster, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "predictions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:predictions"],
			query: {
				...createBroadcasterQuery(broadcaster),
				...createPaginationQuery(pagination)
			}
		}), HelixPrediction, this._client);
	}
	/**
	* Creates a paginator for predictions for the given broadcaster.
	*
	* @param broadcaster The broadcaster to get predictions for.
	*/
	getPredictionsPaginated(broadcaster) {
		return new HelixPaginatedRequest({
			url: "predictions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:predictions"],
			query: createBroadcasterQuery(broadcaster)
		}, this._client, (data) => new HelixPrediction(data, this._client), 20);
	}
	/**
	* Gets predictions by IDs.
	*
	* @param broadcaster The broadcaster to get the predictions for.
	* @param ids The IDs of the predictions.
	*/
	async getPredictionsByIds(broadcaster, ids) {
		if (!ids.length) return [];
		return (await this._client.callApi({
			type: "helix",
			url: "predictions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:predictions"],
			query: createGetByIdsQuery(broadcaster, ids)
		})).data.map((data) => new HelixPrediction(data, this._client));
	}
	/**
	* Gets a prediction by ID.
	*
	* @param broadcaster The broadcaster to get the prediction for.
	* @param id The ID of the prediction.
	*/
	async getPredictionById(broadcaster, id) {
		const predictions = await this.getPredictionsByIds(broadcaster, [id]);
		return predictions.length ? predictions[0] : null;
	}
	/**
	* Creates a new prediction.
	*
	* @param broadcaster The broadcaster to create the prediction for.
	* @param data
	*
	* @expandParams
	*/
	async createPrediction(broadcaster, data) {
		return new HelixPrediction((await this._client.callApi({
			type: "helix",
			url: "predictions",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:predictions"],
			jsonBody: createPredictionBody(broadcaster, data)
		})).data[0], this._client);
	}
	/**
	* Locks a prediction.
	*
	* @param broadcaster The broadcaster to lock the prediction for.
	* @param id The ID of the prediction to lock.
	*/
	async lockPrediction(broadcaster, id) {
		return await this._endPrediction(broadcaster, id, "LOCKED");
	}
	/**
	* Resolves a prediction.
	*
	* @param broadcaster The broadcaster to resolve the prediction for.
	* @param id The ID of the prediction to resolve.
	* @param outcomeId The ID of the winning outcome.
	*/
	async resolvePrediction(broadcaster, id, outcomeId) {
		return await this._endPrediction(broadcaster, id, "RESOLVED", outcomeId);
	}
	/**
	* Cancels a prediction.
	*
	* @param broadcaster The broadcaster to cancel the prediction for.
	* @param id The ID of the prediction to cancel.
	*/
	async cancelPrediction(broadcaster, id) {
		return await this._endPrediction(broadcaster, id, "CANCELED");
	}
	async _endPrediction(broadcaster, id, status, outcomeId) {
		return new HelixPrediction((await this._client.callApi({
			type: "helix",
			url: "predictions",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:predictions"],
			jsonBody: createEndPredictionBody(broadcaster, id, status, outcomeId)
		})).data[0], this._client);
	}
};
HelixPredictionApi = __decorate([rtfm("api", "HelixPredictionApi")], HelixPredictionApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/raid.external.js
/** @internal */
function createRaidStartQuery(from, to) {
	return {
		from_broadcaster_id: extractUserId(from),
		to_broadcaster_id: extractUserId(to)
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/raids/HelixRaid.js
init_tslib_es6();
/**
* A result of a successful raid initiation.
*/
let HelixRaid = class HelixRaid extends DataObject {
	/**
	* The date when the raid was initiated.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* Whether the raid target channel is intended for mature audiences.
	*/
	get targetIsMature() {
		return this[rawDataSymbol].is_mature;
	}
};
HelixRaid = __decorate([rtfm("api", "HelixRaid")], HelixRaid);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/raids/HelixRaidApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with raids.
*
* Can be accessed using `client.raids` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const raid = await api.raids.startRaid('125328655', '61369223');
* ```
*
* @meta category helix
* @meta categorizedTitle Raids
*/
let HelixRaidApi = class HelixRaidApi extends BaseApi {
	/**
	* Initiate a raid from a live broadcaster to another live broadcaster.
	*
	* @param from The raiding broadcaster.
	* @param to The raid target.
	*/
	async startRaid(from, to) {
		return new HelixRaid((await this._client.callApi({
			type: "helix",
			url: "raids",
			method: "POST",
			userId: extractUserId(from),
			scopes: ["channel:manage:raids"],
			query: createRaidStartQuery(from, to)
		})).data[0]);
	}
	/**
	* Cancels an initiated raid.
	*
	* @param from The raiding broadcaster.
	*/
	async cancelRaid(from) {
		await this._client.callApi({
			type: "helix",
			url: "raids",
			method: "DELETE",
			userId: extractUserId(from),
			scopes: ["channel:manage:raids"],
			query: createBroadcasterQuery(from)
		});
	}
};
HelixRaidApi = __decorate([rtfm("api", "HelixRaidApi")], HelixRaidApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/schedule.external.js
/** @internal */
function createScheduleQuery(broadcaster, filter) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		start_time: filter?.startDate,
		utc_offset: filter?.utcOffset?.toString()
	};
}
/** @internal */
function createScheduleSettingsUpdateQuery(broadcaster, settings) {
	if (settings.vacation) return {
		broadcaster_id: extractUserId(broadcaster),
		is_vacation_enabled: "true",
		vacation_start_time: settings.vacation.startDate,
		vacation_end_time: settings.vacation.endDate,
		timezone: settings.vacation.timezone
	};
	return {
		broadcaster_id: extractUserId(broadcaster),
		is_vacation_enabled: "false"
	};
}
/** @internal */
function createScheduleSegmentBody(data) {
	return {
		start_time: data.startDate,
		timezone: data.timezone,
		is_recurring: data.isRecurring,
		duration: data.duration,
		category_id: data.categoryId,
		title: data.title
	};
}
/** @internal */
function createScheduleSegmentModifyQuery(broadcaster, segmentId) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		id: segmentId
	};
}
/** @internal */
function createScheduleSegmentUpdateBody(data) {
	return {
		start_time: data.startDate,
		timezone: data.timezone,
		is_canceled: data.isCanceled,
		duration: data.duration,
		category_id: data.categoryId,
		title: data.title
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/schedule/HelixScheduleSegment.js
init_tslib_es6();
/**
* A segment of a schedule.
*/
let HelixScheduleSegment = class HelixScheduleSegment extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the segment.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The date when the segment starts.
	*/
	get startDate() {
		return new Date(this[rawDataSymbol].start_time);
	}
	/**
	* The date when the segment ends.
	*/
	get endDate() {
		return new Date(this[rawDataSymbol].end_time);
	}
	/**
	* The title of the segment.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The date up to which the segment is canceled.
	*/
	get cancelEndDate() {
		return mapNullable(this[rawDataSymbol].canceled_until, (v) => new Date(v));
	}
	/**
	* The ID of the category the segment is scheduled for, or null if no category is specified.
	*/
	get categoryId() {
		return this[rawDataSymbol].category?.id ?? null;
	}
	/**
	* The name of the category the segment is scheduled for, or null if no category is specified.
	*/
	get categoryName() {
		return this[rawDataSymbol].category?.name ?? null;
	}
	/**
	* Gets more information about the category the segment is scheduled for, or null if no category is specified.
	*/
	async getCategory() {
		const categoryId = this[rawDataSymbol].category?.id;
		return categoryId ? await this._client.games.getGameById(categoryId) : null;
	}
	/**
	* Whether the segment is recurring every week.
	*/
	get isRecurring() {
		return this[rawDataSymbol].is_recurring;
	}
};
__decorate([Enumerable(false)], HelixScheduleSegment.prototype, "_client", void 0);
HelixScheduleSegment = __decorate([rtfm("api", "HelixScheduleSegment", "id")], HelixScheduleSegment);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/schedule/HelixPaginatedScheduleSegmentRequest.js
init_tslib_es6();
/**
* A paginator specifically for schedule segments.
*/
let HelixPaginatedScheduleSegmentRequest = class HelixPaginatedScheduleSegmentRequest extends HelixPaginatedRequest {
	/** @internal */
	constructor(broadcaster, client, filter) {
		super({
			url: "schedule",
			query: createScheduleQuery(broadcaster, filter)
		}, client, (data) => new HelixScheduleSegment(data, client), 25);
	}
	/** @internal */
	async _fetchData(additionalOptions = {}) {
		const origData = await super._fetchData(additionalOptions);
		return {
			data: origData.data.segments ?? [],
			pagination: origData.pagination
		};
	}
};
HelixPaginatedScheduleSegmentRequest = __decorate([rtfm("api", "HelixPaginatedScheduleSegmentRequest")], HelixPaginatedScheduleSegmentRequest);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/schedule/HelixSchedule.js
init_tslib_es6();
/**
* A schedule of a channel.
*/
let HelixSchedule = class HelixSchedule extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The segments of the schedule.
	*/
	get segments() {
		return this[rawDataSymbol].segments?.map((data) => new HelixScheduleSegment(data, this._client)) ?? [];
	}
	/**
	* The ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The date when the current vacation started, or null if the schedule is not in vacation mode.
	*/
	get vacationStartDate() {
		const timestamp = this[rawDataSymbol].vacation?.start_time;
		return timestamp ? new Date(timestamp) : null;
	}
	/**
	* The date when the current vacation ends, or null if the schedule is not in vacation mode.
	*/
	get vacationEndDate() {
		const timestamp = this[rawDataSymbol].vacation?.end_time;
		return timestamp ? new Date(timestamp) : null;
	}
};
__decorate([Enumerable(false)], HelixSchedule.prototype, "_client", void 0);
HelixSchedule = __decorate([rtfm("api", "HelixSchedule", "broadcasterId")], HelixSchedule);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/schedule/HelixScheduleApi.js
/**
* The Helix API methods that deal with schedules.
*
* Can be accessed using `client.schedule` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: schedule } = await api.helix.schedule.getSchedule('61369223');
* ```
*
* @meta category helix
* @meta categorizedTitle Schedule
*/
var HelixScheduleApi = class extends BaseApi {
	/**
	* Gets the schedule for a given broadcaster.
	*
	* @param broadcaster The broadcaster to get the schedule of.
	* @param filter
	*
	* @expandParams
	*/
	async getSchedule(broadcaster, filter) {
		const result = await this._client.callApi({
			type: "helix",
			url: "schedule",
			userId: extractUserId(broadcaster),
			query: {
				...createScheduleQuery(broadcaster, filter),
				...createPaginationQuery(filter)
			}
		});
		return {
			data: new HelixSchedule(result.data, this._client),
			cursor: result.pagination.cursor
		};
	}
	/**
	* Creates a paginator for schedule segments for a given broadcaster.
	*
	* @param broadcaster The broadcaster to get the schedule segments of.
	* @param filter
	*
	* @expandParams
	*/
	getScheduleSegmentsPaginated(broadcaster, filter) {
		return new HelixPaginatedScheduleSegmentRequest(broadcaster, this._client, filter);
	}
	/**
	* Gets a set of schedule segments by IDs.
	*
	* @param broadcaster The broadcaster to get schedule segments of.
	* @param ids The IDs of the schedule segments.
	*/
	async getScheduleSegmentsByIds(broadcaster, ids) {
		return (await this._client.callApi({
			type: "helix",
			url: "schedule",
			userId: extractUserId(broadcaster),
			query: createGetByIdsQuery(broadcaster, ids)
		})).data.segments?.map((data) => new HelixScheduleSegment(data, this._client)) ?? [];
	}
	/**
	* Gets a single schedule segment by ID.
	*
	* @param broadcaster The broadcaster to get a schedule segment of.
	* @param id The ID of the schedule segment.
	*/
	async getScheduleSegmentById(broadcaster, id) {
		const segments = await this.getScheduleSegmentsByIds(broadcaster, [id]);
		return segments.length ? segments[0] : null;
	}
	/**
	* Gets the schedule for a given broadcaster in iCal format.
	*
	* @param broadcaster The broadcaster to get the schedule for.
	*/
	async getScheduleAsIcal(broadcaster) {
		return await this._client.callApi({
			type: "helix",
			url: "schedule/icalendar",
			query: createBroadcasterQuery(broadcaster)
		});
	}
	/**
	* Updates the schedule settings of a given broadcaster.
	*
	* @param broadcaster The broadcaster to update the schedule settings for.
	* @param settings
	*
	* @expandParams
	*/
	async updateScheduleSettings(broadcaster, settings) {
		await this._client.callApi({
			type: "helix",
			url: "schedule/settings",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:schedule"],
			query: createScheduleSettingsUpdateQuery(broadcaster, settings)
		});
	}
	/**
	* Creates a new segment in a given broadcaster's schedule.
	*
	* @param broadcaster The broadcaster to create a new schedule segment for.
	* @param data
	*
	* @expandParams
	*/
	async createScheduleSegment(broadcaster, data) {
		return new HelixScheduleSegment((await this._client.callApi({
			type: "helix",
			url: "schedule/segment",
			method: "POST",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:schedule"],
			query: createBroadcasterQuery(broadcaster),
			jsonBody: createScheduleSegmentBody(data)
		})).data.segments[0], this._client);
	}
	/**
	* Updates a segment in a given broadcaster's schedule.
	*
	* @param broadcaster The broadcaster to create a new schedule segment for.
	* @param segmentId The ID of the segment to update.
	* @param data
	*
	* @expandParams
	*/
	async updateScheduleSegment(broadcaster, segmentId, data) {
		return new HelixScheduleSegment((await this._client.callApi({
			type: "helix",
			url: "schedule/segment",
			method: "PATCH",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:schedule"],
			query: createScheduleSegmentModifyQuery(broadcaster, segmentId),
			jsonBody: createScheduleSegmentUpdateBody(data)
		})).data.segments[0], this._client);
	}
	/**
	* Deletes a segment in a given broadcaster's schedule.
	*
	* @param broadcaster The broadcaster to create a new schedule segment for.
	* @param segmentId The ID of the segment to update.
	*/
	async deleteScheduleSegment(broadcaster, segmentId) {
		await this._client.callApi({
			type: "helix",
			url: "schedule/segment",
			method: "DELETE",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:schedule"],
			query: createScheduleSegmentModifyQuery(broadcaster, segmentId)
		});
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/search.external.js
/** @internal */
function createSearchChannelsQuery(query, filter) {
	return {
		query,
		live_only: filter.liveOnly?.toString()
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/search/HelixChannelSearchResult.js
init_tslib_es6();
/**
* The result of a channel search.
*/
let HelixChannelSearchResult = class HelixChannelSearchResult extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The language of the channel.
	*/
	get language() {
		return this[rawDataSymbol].broadcaster_language;
	}
	/**
	* The ID of the channel.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the channel.
	*/
	get name() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the channel.
	*/
	get displayName() {
		return this[rawDataSymbol].display_name;
	}
	/**
	* Gets additional information about the owner of the channel.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].id));
	}
	/**
	* The ID of the game currently played on the channel.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* The name of the game currently played on the channel.
	*/
	get gameName() {
		return this[rawDataSymbol].game_name;
	}
	/**
	* Gets information about the game that is being played on the stream.
	*/
	async getGame() {
		return this[rawDataSymbol].game_id ? checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id)) : null;
	}
	/**
	* Whether the channel is currently live.
	*/
	get isLive() {
		return this[rawDataSymbol].is_live;
	}
	/**
	* The tags applied to the channel.
	*/
	get tags() {
		return this[rawDataSymbol].tags;
	}
	/**
	* The thumbnail URL of the stream.
	*/
	get thumbnailUrl() {
		return this[rawDataSymbol].thumbnail_url;
	}
	/**
	* The start date of the stream. Returns `null` if the stream is not live.
	*/
	get startDate() {
		return this[rawDataSymbol].is_live ? new Date(this[rawDataSymbol].started_at) : null;
	}
};
__decorate([Enumerable(false)], HelixChannelSearchResult.prototype, "_client", void 0);
HelixChannelSearchResult = __decorate([rtfm("api", "HelixChannelSearchResult", "id")], HelixChannelSearchResult);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/search/HelixSearchApi.js
init_tslib_es6();
/**
* The Helix API methods that run searches.
*
* Can be accessed using `client.search` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const channels = await api.search.searchChannels('pear');
* ```
*
* @meta category helix
* @meta categorizedTitle Search
*/
let HelixSearchApi = class HelixSearchApi extends BaseApi {
	/**
	* Search categories/games for an exact or partial match.
	*
	* @param query The search term.
	* @param pagination
	*
	* @expandParams
	*/
	async searchCategories(query, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "search/categories",
			query: {
				query,
				...createPaginationQuery(pagination)
			}
		}), HelixGame, this._client);
	}
	/**
	* Creates a paginator for a category/game search.
	*
	* @param query The search term.
	*/
	searchCategoriesPaginated(query) {
		return new HelixPaginatedRequest({
			url: "search/categories",
			query: { query }
		}, this._client, (data) => new HelixGame(data, this._client));
	}
	/**
	* Search channels for an exact or partial match.
	*
	* @param query The search term.
	* @param filter
	*
	* @expandParams
	*/
	async searchChannels(query, filter = {}) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "search/channels",
			query: {
				...createSearchChannelsQuery(query, filter),
				...createPaginationQuery(filter)
			}
		}), HelixChannelSearchResult, this._client);
	}
	/**
	* Creates a paginator for a channel search.
	*
	* @param query The search term.
	* @param filter
	*
	* @expandParams
	*/
	searchChannelsPaginated(query, filter = {}) {
		return new HelixPaginatedRequest({
			url: "search/channels",
			query: createSearchChannelsQuery(query, filter)
		}, this._client, (data) => new HelixChannelSearchResult(data, this._client));
	}
};
HelixSearchApi = __decorate([rtfm("api", "HelixSearchApi")], HelixSearchApi);
//#endregion
//#region node_modules/@twurple/api/lib/errors/StreamNotLiveError.js
/**
* Thrown whenever you try something that requires your own stream to be live.
*/
var StreamNotLiveError = class extends CustomError$1 {
	/** @private */
	constructor(options) {
		super("Your stream needs to be live to do this", options);
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/stream.external.js
/** @internal */
function createStreamQuery(filter) {
	return {
		game_id: filter.game,
		language: filter.language,
		type: filter.type,
		user_id: filter.userId,
		user_login: filter.userName
	};
}
/** @internal */
function createStreamMarkerBody(broadcaster, description) {
	return {
		user_id: extractUserId(broadcaster),
		description
	};
}
/** @internal */
function createVideoQuery(id) {
	return { video_id: id };
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/stream/HelixStream.js
init_tslib_es6();
/**
* A Twitch stream.
*/
let HelixStream = class HelixStream extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The stream ID.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The user ID.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The user's name.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The user's display name.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets information about the user broadcasting the stream.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The game ID, or an empty string if the stream doesn't currently have a game.
	*/
	get gameId() {
		return this[rawDataSymbol].game_id;
	}
	/**
	* The game name, or an empty string if the stream doesn't currently have a game.
	*/
	get gameName() {
		return this[rawDataSymbol].game_name;
	}
	/**
	* Gets information about the game that is being played on the stream.
	*
	* Returns null if the stream doesn't currently have a game.
	*/
	async getGame() {
		return this[rawDataSymbol].game_id ? checkRelationAssertion(await this._client.games.getGameById(this[rawDataSymbol].game_id)) : null;
	}
	/**
	* The type of the stream.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The title of the stream.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The number of viewers the stream currently has.
	*/
	get viewers() {
		return this[rawDataSymbol].viewer_count;
	}
	/**
	* The time when the stream started.
	*/
	get startDate() {
		return new Date(this[rawDataSymbol].started_at);
	}
	/**
	* The language of the stream.
	*/
	get language() {
		return this[rawDataSymbol].language;
	}
	/**
	* The URL of the thumbnail of the stream.
	*
	* This URL includes the placeholders `{width}` and `{height}`
	* which you must replace with the desired dimensions of the thumbnail (in pixels).
	*
	* You can also use {@link HelixStream#getThumbnailUrl} to do this replacement.
	*/
	get thumbnailUrl() {
		return this[rawDataSymbol].thumbnail_url;
	}
	/**
	* Builds the thumbnail URL of the stream using the given dimensions.
	*
	* @param width The width of the thumbnail.
	* @param height The height of the thumbnail.
	*/
	getThumbnailUrl(width, height) {
		return this[rawDataSymbol].thumbnail_url.replace("{width}", width.toString()).replace("{height}", height.toString());
	}
	/**
	* The tags applied to the stream.
	*/
	get tags() {
		return this[rawDataSymbol].tags;
	}
	/**
	* Whether the stream is set to be targeted to mature audiences only.
	*/
	get isMature() {
		return this[rawDataSymbol].is_mature;
	}
};
__decorate([Enumerable(false)], HelixStream.prototype, "_client", void 0);
HelixStream = __decorate([rtfm("api", "HelixStream", "id")], HelixStream);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/stream/HelixStreamMarker.js
init_tslib_es6();
/**
* A stream marker.
*/
let HelixStreamMarker = class HelixStreamMarker extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the marker.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The date and time when the marker was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The description of the marker.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The position in the stream when the marker was created, in seconds.
	*/
	get positionInSeconds() {
		return this[rawDataSymbol].position_seconds;
	}
};
__decorate([Enumerable(false)], HelixStreamMarker.prototype, "_client", void 0);
HelixStreamMarker = __decorate([rtfm("api", "HelixStreamMarker", "id")], HelixStreamMarker);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/stream/HelixStreamMarkerWithVideo.js
init_tslib_es6();
/**
* A stream marker, also containing some video data.
*
* @inheritDoc
*/
let HelixStreamMarkerWithVideo = class HelixStreamMarkerWithVideo extends HelixStreamMarker {
	_videoId;
	/** @internal */
	constructor(data, _videoId, client) {
		super(data, client);
		this._videoId = _videoId;
	}
	/**
	* The URL of the video, which will start playing at the position of the stream marker.
	*/
	get url() {
		return this[rawDataSymbol].URL;
	}
	/**
	* The ID of the video.
	*/
	get videoId() {
		return this._videoId;
	}
	/**
	* Gets the video data of the video the marker was set in.
	*/
	async getVideo() {
		return checkRelationAssertion(await this._client.videos.getVideoById(this._videoId));
	}
};
HelixStreamMarkerWithVideo = __decorate([rtfm("api", "HelixStreamMarkerWithVideo", "id")], HelixStreamMarkerWithVideo);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/stream/HelixStreamApi.js
init_tslib_es6();
var HelixStreamApi_1;
/**
* The Helix API methods that deal with streams.
*
* Can be accessed using `client.streams` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const stream = await api.streams.getStreamByUserId('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Streams
*/
let HelixStreamApi = HelixStreamApi_1 = class HelixStreamApi extends BaseApi {
	/** @internal */
	_getStreamByUserIdBatcher = new HelixRequestBatcher({ url: "streams" }, "user_id", "user_id", this._client, (data) => new HelixStream(data, this._client));
	/** @internal */
	_getStreamByUserNameBatcher = new HelixRequestBatcher({ url: "streams" }, "user_login", "user_login", this._client, (data) => new HelixStream(data, this._client));
	/**
	* Gets a list of streams.
	*
	* @param filter
	* @expandParams
	*/
	async getStreams(filter = {}) {
		return createPaginatedResult(await this._client.callApi({
			url: "streams",
			type: "helix",
			query: {
				...createStreamQuery(filter),
				...createPaginationQuery(filter)
			}
		}), HelixStream, this._client);
	}
	/**
	* Creates a paginator for streams.
	*
	* @param filter
	* @expandParams
	*/
	getStreamsPaginated(filter = {}) {
		return new HelixPaginatedRequest({
			url: "streams",
			query: createStreamQuery(filter)
		}, this._client, (data) => new HelixStream(data, this._client));
	}
	/**
	* Gets the current streams for the given usernames.
	*
	* @param users The username to get the streams for.
	*/
	async getStreamsByUserNames(users) {
		return (await this.getStreams({ userName: users.map(extractUserName) })).data;
	}
	/**
	* Gets the current stream for the given username.
	*
	* @param user The username to get the stream for.
	*/
	async getStreamByUserName(user) {
		return (await this.getStreamsByUserNames([user]))[0] ?? null;
	}
	/**
	* Gets the current stream for the given username, batching multiple calls into fewer requests as the API allows.
	*
	* @param user The username to get the stream for.
	*/
	async getStreamByUserNameBatched(user) {
		return await this._getStreamByUserNameBatcher.request(extractUserName(user));
	}
	/**
	* Gets the current streams for the given user IDs.
	*
	* @param users The user IDs to get the streams for.
	*/
	async getStreamsByUserIds(users) {
		return (await this.getStreams({ userId: users.map(extractUserId) })).data;
	}
	/**
	* Gets the current stream for the given user ID.
	*
	* @param user The user ID to get the stream for.
	*/
	async getStreamByUserId(user) {
		const userId = extractUserId(user);
		return mapNullable((await this._client.callApi({
			url: "streams",
			type: "helix",
			userId,
			query: createStreamQuery({ userId })
		})).data[0], (data) => new HelixStream(data, this._client));
	}
	/**
	* Gets the current stream for the given user ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param user The user ID to get the stream for.
	*/
	async getStreamByUserIdBatched(user) {
		return await this._getStreamByUserIdBatcher.request(extractUserId(user));
	}
	/**
	* Gets a list of all stream markers for a user.
	*
	* @param user The user to list the stream markers for.
	* @param pagination
	*
	* @expandParams
	*/
	async getStreamMarkersForUser(user, pagination) {
		const result = await this._client.callApi({
			url: "streams/markers",
			type: "helix",
			query: {
				...createUserQuery(user),
				...createPaginationQuery(pagination)
			},
			userId: extractUserId(user),
			scopes: ["user:read:broadcast"],
			canOverrideScopedUserContext: true
		});
		return {
			data: flatten(result.data.map((data) => HelixStreamApi_1._mapGetStreamMarkersResult(data, this._client))),
			cursor: result.pagination?.cursor
		};
	}
	/**
	* Creates a paginator for all stream markers for a user.
	*
	* @param user The user to list the stream markers for.
	*/
	getStreamMarkersForUserPaginated(user) {
		return new HelixPaginatedRequest({
			url: "streams/markers",
			query: createUserQuery(user),
			userId: extractUserId(user),
			scopes: ["user:read:broadcast"],
			canOverrideScopedUserContext: true
		}, this._client, (data) => HelixStreamApi_1._mapGetStreamMarkersResult(data, this._client));
	}
	/**
	* Gets a list of all stream markers for a video.
	*
	* @param user The user the video belongs to.
	* @param videoId The video to list the stream markers for.
	* @param pagination
	*
	* @expandParams
	*/
	async getStreamMarkersForVideo(user, videoId, pagination) {
		const result = await this._client.callApi({
			url: "streams/markers",
			type: "helix",
			query: {
				...createVideoQuery(videoId),
				...createPaginationQuery(pagination)
			},
			userId: extractUserId(user),
			scopes: ["user:read:broadcast"],
			canOverrideScopedUserContext: true
		});
		return {
			data: flatten(result.data.map((data) => HelixStreamApi_1._mapGetStreamMarkersResult(data, this._client))),
			cursor: result.pagination?.cursor
		};
	}
	/**
	* Creates a paginator for all stream markers for a video.
	*
	* @param user The user the video belongs to.
	* @param videoId The video to list the stream markers for.
	*/
	getStreamMarkersForVideoPaginated(user, videoId) {
		return new HelixPaginatedRequest({
			url: "streams/markers",
			query: createVideoQuery(videoId),
			userId: extractUserId(user),
			scopes: ["user:read:broadcast"],
			canOverrideScopedUserContext: true
		}, this._client, (data) => HelixStreamApi_1._mapGetStreamMarkersResult(data, this._client));
	}
	/**
	* Creates a new stream marker.
	*
	* Only works while the specified user's stream is live.
	*
	* @param broadcaster The broadcaster to create a stream marker for.
	* @param description The description of the marker.
	*/
	async createStreamMarker(broadcaster, description) {
		try {
			return new HelixStreamMarker((await this._client.callApi({
				url: "streams/markers",
				method: "POST",
				type: "helix",
				userId: extractUserId(broadcaster),
				scopes: ["channel:manage:broadcast"],
				canOverrideScopedUserContext: true,
				jsonBody: createStreamMarkerBody(broadcaster, description)
			})).data[0], this._client);
		} catch (e) {
			if (e instanceof HttpStatusCodeError && e.statusCode === 404) throw new StreamNotLiveError({ cause: e });
			throw e;
		}
	}
	/**
	* Gets the stream key of a stream.
	*
	* @param broadcaster The broadcaster to get the stream key for.
	*/
	async getStreamKey(broadcaster) {
		const userId = extractUserId(broadcaster);
		return (await this._client.callApi({
			type: "helix",
			url: "streams/key",
			userId,
			scopes: ["channel:read:stream_key"],
			query: createBroadcasterQuery(broadcaster)
		})).data[0].stream_key;
	}
	/**
	* Gets the streams that are currently live and are followed by the given user.
	*
	* @param user The user to check followed streams for.
	* @param pagination
	*
	* @expandParams
	*/
	async getFollowedStreams(user, pagination) {
		const userId = extractUserId(user);
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "streams/followed",
			userId,
			scopes: ["user:read:follows"],
			query: {
				...createSingleKeyQuery("user_id", userId),
				...createPaginationQuery(pagination)
			}
		}), HelixStream, this._client);
	}
	/**
	* Creates a paginator for the streams that are currently live and are followed by the given user.
	*
	* @param user The user to check followed streams for.
	*/
	getFollowedStreamsPaginated(user) {
		const userId = extractUserId(user);
		return new HelixPaginatedRequest({
			url: "streams/followed",
			userId,
			scopes: ["user:read:follows"],
			query: createSingleKeyQuery("user_id", userId)
		}, this._client, (data) => new HelixStream(data, this._client));
	}
	static _mapGetStreamMarkersResult(data, client) {
		return data.videos.reduce((result, video) => [...result, ...video.markers.map((marker) => new HelixStreamMarkerWithVideo(marker, video.video_id, client))], []);
	}
};
__decorate([Enumerable(false)], HelixStreamApi.prototype, "_getStreamByUserIdBatcher", void 0);
__decorate([Enumerable(false)], HelixStreamApi.prototype, "_getStreamByUserNameBatcher", void 0);
HelixStreamApi = HelixStreamApi_1 = __decorate([rtfm("api", "HelixStreamApi")], HelixStreamApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/subscription.external.js
/** @internal */
function createSubscriptionCheckQuery(broadcaster, user) {
	return {
		broadcaster_id: extractUserId(broadcaster),
		user_id: extractUserId(user)
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/subscriptions/HelixUserSubscription.js
init_tslib_es6();
/**
* The user info about a (paid) subscription to a broadcaster.
*/
let HelixUserSubscription = class HelixUserSubscription extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The user ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id);
	}
	/**
	* Whether the subscription has been gifted by another user.
	*/
	get isGift() {
		return this[rawDataSymbol].is_gift;
	}
	/**
	* The tier of the subscription.
	*/
	get tier() {
		return this[rawDataSymbol].tier;
	}
};
__decorate([Enumerable(false)], HelixUserSubscription.prototype, "_client", void 0);
HelixUserSubscription = __decorate([rtfm("api", "HelixUserSubscription", "broadcasterId")], HelixUserSubscription);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/subscriptions/HelixSubscription.js
init_tslib_es6();
/**
* A (paid) subscription of a user to a broadcaster.
*
* @inheritDoc
*/
let HelixSubscription = class HelixSubscription extends HelixUserSubscription {
	/**
	* The user ID of the broadcaster.
	*/
	get broadcasterId() {
		return this[rawDataSymbol].broadcaster_id;
	}
	/**
	* The name of the broadcaster.
	*/
	get broadcasterName() {
		return this[rawDataSymbol].broadcaster_login;
	}
	/**
	* The display name of the broadcaster.
	*/
	get broadcasterDisplayName() {
		return this[rawDataSymbol].broadcaster_name;
	}
	/**
	* Gets more information about the broadcaster.
	*/
	async getBroadcaster() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].broadcaster_id));
	}
	/**
	* The user ID of the gifter.
	*/
	get gifterId() {
		return this[rawDataSymbol].is_gift ? this[rawDataSymbol].gifter_id : null;
	}
	/**
	* The name of the gifter.
	*/
	get gifterName() {
		return this[rawDataSymbol].is_gift ? this[rawDataSymbol].gifter_login : null;
	}
	/**
	* The display name of the gifter.
	*/
	get gifterDisplayName() {
		return this[rawDataSymbol].is_gift ? this[rawDataSymbol].gifter_name : null;
	}
	/**
	* Gets more information about the gifter.
	*/
	async getGifter() {
		return this[rawDataSymbol].is_gift ? checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].gifter_id)) : null;
	}
	/**
	* The user ID of the subscribed user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the subscribed user.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the subscribed user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets more information about the subscribed user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
HelixSubscription = __decorate([rtfm("api", "HelixSubscription", "userId")], HelixSubscription);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/subscriptions/HelixPaginatedSubscriptionsRequest.js
init_tslib_es6();
/**
* A special case of {@link HelixPaginatedRequestWithTotal}
* with support for fetching the total sub points of a broadcaster.
*
* @inheritDoc
*/
let HelixPaginatedSubscriptionsRequest = class HelixPaginatedSubscriptionsRequest extends HelixPaginatedRequestWithTotal {
	/** @internal */
	constructor(broadcaster, client) {
		super({
			url: "subscriptions",
			scopes: ["channel:read:subscriptions"],
			userId: extractUserId(broadcaster),
			query: createBroadcasterQuery(broadcaster)
		}, client, (data) => new HelixSubscription(data, client));
	}
	/**
	* Gets the total sub points of the broadcaster.
	*/
	async getPoints() {
		return (this._currentData ?? await this._fetchData({ query: { after: void 0 } })).points;
	}
};
HelixPaginatedSubscriptionsRequest = __decorate([rtfm("api", "HelixPaginatedSubscriptionsRequest")], HelixPaginatedSubscriptionsRequest);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/subscriptions/HelixSubscriptionApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with subscriptions.
*
* Can be accessed using `client.subscriptions` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const subscription = await api.subscriptions.getSubscriptionForUser('61369223', '125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Subscriptions
*/
let HelixSubscriptionApi = class HelixSubscriptionApi extends BaseApi {
	/**
	* Gets a list of all subscriptions to a given broadcaster.
	*
	* @param broadcaster The broadcaster to list subscriptions to.
	* @param pagination
	*
	* @expandParams
	*/
	async getSubscriptions(broadcaster, pagination) {
		const result = await this._client.callApi({
			url: "subscriptions",
			scopes: ["channel:read:subscriptions"],
			type: "helix",
			userId: extractUserId(broadcaster),
			query: {
				...createBroadcasterQuery(broadcaster),
				...createPaginationQuery(pagination)
			}
		});
		return {
			...createPaginatedResultWithTotal(result, HelixSubscription, this._client),
			points: result.points
		};
	}
	/**
	* Creates a paginator for all subscriptions to a given broadcaster.
	*
	* @param broadcaster The broadcaster to list subscriptions to.
	*/
	getSubscriptionsPaginated(broadcaster) {
		return new HelixPaginatedSubscriptionsRequest(broadcaster, this._client);
	}
	/**
	* Gets the subset of the given user list that is subscribed to the given broadcaster.
	*
	* @param broadcaster The broadcaster to find subscriptions to.
	* @param users The users that should be checked for subscriptions.
	*/
	async getSubscriptionsForUsers(broadcaster, users) {
		return (await this._client.callApi({
			type: "helix",
			url: "subscriptions",
			userId: extractUserId(broadcaster),
			scopes: ["channel:read:subscriptions"],
			query: createChannelUsersCheckQuery(broadcaster, users)
		})).data.map((data) => new HelixSubscription(data, this._client));
	}
	/**
	* Gets the subscription data for a given user to a given broadcaster.
	*
	* This checks with the authorization of a broadcaster.
	* If you only have the authorization of a user, check {@link HelixSubscriptionApi#checkUserSubscription}}.
	*
	* @param broadcaster The broadcaster to check.
	* @param user The user to check.
	*/
	async getSubscriptionForUser(broadcaster, user) {
		const list = await this.getSubscriptionsForUsers(broadcaster, [user]);
		return list.length ? list[0] : null;
	}
	/**
	* Checks if a given user is subscribed to a given broadcaster. Returns null if not subscribed.
	*
	* This checks with the authorization of a user.
	* If you only have the authorization of a broadcaster, check {@link HelixSubscriptionApi#getSubscriptionForUser}}.
	*
	* @param user The user to check.
	* @param broadcaster The broadcaster to check the user's subscription for.
	*/
	async checkUserSubscription(user, broadcaster) {
		try {
			return new HelixUserSubscription((await this._client.callApi({
				type: "helix",
				url: "subscriptions/user",
				userId: extractUserId(user),
				scopes: ["user:read:subscriptions"],
				query: createSubscriptionCheckQuery(broadcaster, user)
			})).data[0], this._client);
		} catch (e) {
			if (e instanceof HttpStatusCodeError && e.statusCode === 404) return null;
			throw e;
		}
	}
};
HelixSubscriptionApi = __decorate([rtfm("api", "HelixSubscriptionApi")], HelixSubscriptionApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/team/HelixTeam.js
init_tslib_es6();
/**
* A Stream Team.
*/
let HelixTeam = class HelixTeam extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the team.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the team.
	*/
	get name() {
		return this[rawDataSymbol].team_name;
	}
	/**
	* The display name of the team.
	*/
	get displayName() {
		return this[rawDataSymbol].team_display_name;
	}
	/**
	* The URL of the background image of the team.
	*/
	get backgroundImageUrl() {
		return this[rawDataSymbol].background_image_url;
	}
	/**
	* The URL of the banner of the team.
	*/
	get bannerUrl() {
		return this[rawDataSymbol].banner;
	}
	/**
	* The date when the team was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date when the team was last updated.
	*/
	get updateDate() {
		return new Date(this[rawDataSymbol].updated_at);
	}
	/**
	* The info of the team.
	*
	* May contain HTML tags.
	*/
	get info() {
		return this[rawDataSymbol].info;
	}
	/**
	* The URL of the thumbnail of the team's logo.
	*/
	get logoThumbnailUrl() {
		return this[rawDataSymbol].thumbnail_url;
	}
	/**
	* Gets the relations to the members of the team.
	*/
	async getUserRelations() {
		return (await this._client.teams.getTeamById(this.id)).userRelations;
	}
};
__decorate([Enumerable(false)], HelixTeam.prototype, "_client", void 0);
HelixTeam = __decorate([rtfm("api", "HelixTeam", "id")], HelixTeam);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/team/HelixTeamWithUsers.js
init_tslib_es6();
/**
* A Stream Team with its member relations.
*
* @inheritDoc
*/
let HelixTeamWithUsers = class HelixTeamWithUsers extends HelixTeam {
	/**
	* The relations to the members of the team.
	*/
	get userRelations() {
		return this[rawDataSymbol].users.map((data) => new HelixUserRelation(data, this._client));
	}
};
HelixTeamWithUsers = __decorate([rtfm("api", "HelixTeamWithUsers", "id")], HelixTeamWithUsers);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/team/HelixTeamApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with teams.
*
* Can be accessed using `client.teams` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const tags = await api.teams.getChannelTeams('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Teams
*/
let HelixTeamApi = class HelixTeamApi extends BaseApi {
	/**
	* Gets a list of all teams a broadcaster is a member of.
	*
	* @param broadcaster The broadcaster to get the teams of.
	*/
	async getTeamsForBroadcaster(broadcaster) {
		return (await this._client.callApi({
			type: "helix",
			url: "teams/channel",
			userId: extractUserId(broadcaster),
			query: createBroadcasterQuery(broadcaster)
		})).data?.map((data) => new HelixTeam(data, this._client)) ?? [];
	}
	/**
	* Gets a team by ID.
	*
	* Returns null if there is no team with the given ID.
	*
	* @param id The ID of the team.
	*/
	async getTeamById(id) {
		try {
			return new HelixTeamWithUsers((await this._client.callApi({
				type: "helix",
				url: "teams",
				query: { id }
			})).data[0], this._client);
		} catch (e) {
			if (e instanceof HttpStatusCodeError && e.statusCode === 500) return null;
			throw e;
		}
	}
	/**
	* Gets a team by name.
	*
	* Returns null if there is no team with the given name.
	*
	* @param name The name of the team.
	*/
	async getTeamByName(name) {
		try {
			return new HelixTeamWithUsers((await this._client.callApi({
				type: "helix",
				url: "teams",
				query: { name }
			})).data[0], this._client);
		} catch (e) {
			if (e instanceof HttpStatusCodeError && e.statusCode === 404) return null;
			throw e;
		}
	}
};
HelixTeamApi = __decorate([rtfm("api", "HelixTeamApi")], HelixTeamApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/user.external.js
/** @internal */
function createUserBlockCreateQuery(target, additionalInfo) {
	return {
		target_user_id: extractUserId(target),
		source_context: additionalInfo.sourceContext,
		reason: additionalInfo.reason
	};
}
/** @internal */
function createUserBlockDeleteQuery(target) {
	return { target_user_id: extractUserId(target) };
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/extensions/HelixBaseExtension.js
/** @protected */
var HelixBaseExtension = class extends DataObject {
	/**
	* The ID of the extension.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The version of the extension.
	*/
	get version() {
		return this[rawDataSymbol].version;
	}
	/**
	* The name of the extension.
	*/
	get name() {
		return this[rawDataSymbol].name;
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/extensions/HelixInstalledExtension.js
init_tslib_es6();
/**
* A Twitch Extension that is installed in a slot of a channel.
*
* @inheritDoc
*/
let HelixInstalledExtension = class HelixInstalledExtension extends HelixBaseExtension {
	_slotType;
	_slotId;
	/** @internal */
	constructor(slotType, slotId, data) {
		super(data);
		this._slotType = slotType;
		this._slotId = slotId;
	}
	/**
	* The type of the slot the extension is in.
	*/
	get slotType() {
		return this._slotType;
	}
	/**
	* The ID of the slot the extension is in.
	*/
	get slotId() {
		return this._slotId;
	}
};
HelixInstalledExtension = __decorate([rtfm("api", "HelixInstalledExtension", "id")], HelixInstalledExtension);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/extensions/HelixInstalledExtensionList.js
init_tslib_es6();
/**
* A list of extensions installed in a channel.
*/
let HelixInstalledExtensionList = class HelixInstalledExtensionList extends DataObject {
	getExtensionAtSlot(type, slotId) {
		const data = this[rawDataSymbol][type][slotId];
		return data.active ? new HelixInstalledExtension(type, slotId, data) : null;
	}
	getExtensionsForSlotType(type) {
		return [...Object.entries(this[rawDataSymbol][type])].filter((entry) => entry[1].active).map(([slotId, slotData]) => new HelixInstalledExtension(type, slotId, slotData));
	}
	getAllExtensions() {
		return [...Object.entries(this[rawDataSymbol])].flatMap(([type, typeEntries]) => [...Object.entries(typeEntries)].filter((entry) => entry[1].active).map(([slotId, slotData]) => new HelixInstalledExtension(type, slotId, slotData)));
	}
};
HelixInstalledExtensionList = __decorate([rtfm("api", "HelixInstalledExtensionList")], HelixInstalledExtensionList);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/extensions/HelixUserExtension.js
init_tslib_es6();
/**
* A Twitch Extension that was installed by a user.
*
* @inheritDoc
*/
let HelixUserExtension = class HelixUserExtension extends HelixBaseExtension {
	/**
	* Whether the user has configured the extension to be able to activate it.
	*/
	get canActivate() {
		return this[rawDataSymbol].can_activate;
	}
	/**
	* The available types of the extension.
	*/
	get types() {
		return this[rawDataSymbol].type;
	}
};
HelixUserExtension = __decorate([rtfm("api", "HelixUserExtension", "id")], HelixUserExtension);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/HelixUser.js
init_tslib_es6();
/**
* A Twitch user.
*/
let HelixUser = class HelixUser extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the user.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The name of the user.
	*/
	get name() {
		return this[rawDataSymbol].login;
	}
	/**
	* The display name of the user.
	*/
	get displayName() {
		return this[rawDataSymbol].display_name;
	}
	/**
	* The description of the user.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The type of the user.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The type of the broadcaster.
	*/
	get broadcasterType() {
		return this[rawDataSymbol].broadcaster_type;
	}
	/**
	* The URL of the profile picture of the user.
	*/
	get profilePictureUrl() {
		return this[rawDataSymbol].profile_image_url;
	}
	/**
	* The URL of the offline video placeholder of the user.
	*/
	get offlinePlaceholderUrl() {
		return this[rawDataSymbol].offline_image_url;
	}
	/**
	* The date when the user was created, i.e. when they registered on Twitch.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* Gets the channel's stream data.
	*/
	async getStream() {
		return await this._client.streams.getStreamByUserId(this);
	}
	/**
	* Gets a list of broadcasters the user follows.
	*/
	async getFollowedChannels() {
		return await this._client.channels.getFollowedChannels(this);
	}
	/**
	* Gets the follow data of the user to the given broadcaster, or `null` if the user doesn't follow the broadcaster.
	*
	* This requires user authentication.
	* For broadcaster authentication, you can use `getChannelFollower` while switching `this` and the parameter.
	*
	* @param broadcaster The broadcaster to check the follow to.
	*/
	async getFollowedChannel(broadcaster) {
		return (await this._client.channels.getFollowedChannels(this, broadcaster)).data[0] ?? null;
	}
	/**
	* Checks whether the user is following the given broadcaster.
	*
	* This requires user authentication.
	* For broadcaster authentication, you can use `isFollowedBy` while switching `this` and the parameter.
	*
	* @param broadcaster The broadcaster to check the user's follow to.
	*/
	async follows(broadcaster) {
		return await this.getFollowedChannel(broadcaster) !== null;
	}
	/**
	* Gets a list of users that follow the broadcaster.
	*/
	async getChannelFollowers() {
		return await this._client.channels.getChannelFollowers(this);
	}
	/**
	* Gets the follow data of the given user to the broadcaster, or `null` if the user doesn't follow the broadcaster.
	*
	* This requires broadcaster authentication.
	* For user authentication, you can use `getFollowedChannel` while switching `this` and the parameter.
	*
	* @param user The user to check the follow from.
	*/
	async getChannelFollower(user) {
		return (await this._client.channels.getChannelFollowers(this, user)).data[0] ?? null;
	}
	/**
	* Checks whether the given user is following the broadcaster.
	*
	* This requires broadcaster authentication.
	* For user authentication, you can use `follows` while switching `this` and the parameter.
	*
	* @param user The user to check the broadcaster's follow from.
	*/
	async isFollowedBy(user) {
		return await this.getChannelFollower(user) !== null;
	}
	/**
	* Gets the subscription data for the user to the given broadcaster, or `null` if the user is not subscribed.
	*
	* This requires user authentication.
	* For broadcaster authentication, you can use `getSubscriber` while switching `this` and the parameter.
	*
	* @param broadcaster The broadcaster you want to get the subscription data for.
	*/
	async getSubscriptionTo(broadcaster) {
		return await this._client.subscriptions.checkUserSubscription(this, broadcaster);
	}
	/**
	* Checks whether the user is subscribed to the given broadcaster.
	*
	* This requires user authentication.
	* For broadcaster authentication, you can use `hasSubscriber` while switching `this` and the parameter.
	*
	* @param broadcaster The broadcaster you want to check the subscription for.
	*/
	async isSubscribedTo(broadcaster) {
		return await this.getSubscriptionTo(broadcaster) !== null;
	}
	/**
	* Gets the subscription data for the given user to the broadcaster, or `null` if the user is not subscribed.
	*
	* This requires broadcaster authentication.
	* For user authentication, you can use `getSubscriptionTo` while switching `this` and the parameter.
	*
	* @param user The user you want to get the subscription data for.
	*/
	async getSubscriber(user) {
		return await this._client.subscriptions.getSubscriptionForUser(this, user);
	}
	/**
	* Checks whether the given user is subscribed to the broadcaster.
	*
	* This requires broadcaster authentication.
	* For user authentication, you can use `isSubscribedTo` while switching `this` and the parameter.
	*
	* @param user The user you want to check the subscription for.
	*/
	async hasSubscriber(user) {
		return await this.getSubscriber(user) !== null;
	}
};
__decorate([Enumerable(false)], HelixUser.prototype, "_client", void 0);
HelixUser = __decorate([rtfm("api", "HelixUser", "id")], HelixUser);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/HelixPrivilegedUser.js
init_tslib_es6();
/**
* A user you have extended privilges for, i.e. yourself.
*
* @inheritDoc
*/
let HelixPrivilegedUser = class HelixPrivilegedUser extends HelixUser {
	/**
	* The email address of the user.
	*/
	get email() {
		return this[rawDataSymbol].email;
	}
	/**
	* Changes the description of the user.
	*
	* @param description The new description.
	*/
	async setDescription(description) {
		return await this._client.users.updateAuthenticatedUser(this, { description });
	}
};
HelixPrivilegedUser = __decorate([rtfm("api", "HelixPrivilegedUser", "id")], HelixPrivilegedUser);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/HelixUserBlock.js
init_tslib_es6();
/**
* An user blocked by a previously given user.
*/
let HelixUserBlock = class HelixUserBlock extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the blocked user.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the blocked user.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the blocked user.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].display_name;
	}
	/**
	* Gets additional information about the blocked user.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
};
__decorate([Enumerable(false)], HelixUserBlock.prototype, "_client", void 0);
HelixUserBlock = __decorate([rtfm("api", "HelixUserBlock", "userId")], HelixUserBlock);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/user/HelixUserApi.js
init_tslib_es6();
/**
* The Helix API methods that deal with users.
*
* Can be accessed using `client.users` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const user = await api.users.getUserById('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Users
*/
let HelixUserApi = class HelixUserApi extends BaseApi {
	/** @internal */
	_getUserByIdBatcher = new HelixRequestBatcher({ url: "users" }, "id", "id", this._client, (data) => new HelixUser(data, this._client));
	/** @internal */
	_getUserByNameBatcher = new HelixRequestBatcher({ url: "users" }, "login", "login", this._client, (data) => new HelixUser(data, this._client));
	/**
	* Gets the user data for the given list of user IDs.
	*
	* @param userIds The user IDs you want to look up.
	*/
	async getUsersByIds(userIds) {
		return await this._getUsers("id", userIds.map(extractUserId));
	}
	/**
	* Gets the user data for the given list of usernames.
	*
	* @param userNames The usernames you want to look up.
	*/
	async getUsersByNames(userNames) {
		return await this._getUsers("login", userNames.map(extractUserName));
	}
	/**
	* Gets the user data for the given user ID.
	*
	* @param user The user ID you want to look up.
	*/
	async getUserById(user) {
		const userId = extractUserId(user);
		return mapNullable((await this._client.callApi({
			type: "helix",
			url: "users",
			userId,
			query: { id: userId }
		})).data[0], (data) => new HelixUser(data, this._client));
	}
	/**
	* Gets the user data for the given user ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param user The user ID you want to look up.
	*/
	async getUserByIdBatched(user) {
		return await this._getUserByIdBatcher.request(extractUserId(user));
	}
	/**
	* Gets the user data for the given username.
	*
	* @param userName The username you want to look up.
	*/
	async getUserByName(userName) {
		const users = await this._getUsers("login", [extractUserName(userName)]);
		return users.length ? users[0] : null;
	}
	/**
	* Gets the user data for the given username, batching multiple calls into fewer requests as the API allows.
	*
	* @param user The username you want to look up.
	*/
	async getUserByNameBatched(user) {
		return await this._getUserByNameBatcher.request(extractUserName(user));
	}
	/**
	* Gets the user data of the given authenticated user.
	*
	* @param user The user to get data for.
	* @param withEmail Whether you need the user's email address.
	*/
	async getAuthenticatedUser(user, withEmail = false) {
		const result = await this._client.callApi({
			type: "helix",
			url: "users",
			forceType: "user",
			userId: extractUserId(user),
			scopes: withEmail ? ["user:read:email"] : void 0
		});
		if (!result.data?.length) throw new HellFreezesOverError("Could not get authenticated user");
		return new HelixPrivilegedUser(result.data[0], this._client);
	}
	/**
	* Updates the given authenticated user's data.
	*
	* @param user The user to update.
	* @param data The data to update.
	*/
	async updateAuthenticatedUser(user, data) {
		return new HelixPrivilegedUser((await this._client.callApi({
			type: "helix",
			url: "users",
			method: "PUT",
			userId: extractUserId(user),
			scopes: ["user:edit"],
			query: { description: data.description }
		})).data[0], this._client);
	}
	/**
	* Gets a list of users blocked by the given user.
	*
	* @param user The user to get blocks for.
	* @param pagination
	*
	* @expandParams
	*/
	async getBlocks(user, pagination) {
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "users/blocks",
			userId: extractUserId(user),
			scopes: ["user:read:blocked_users"],
			query: {
				...createBroadcasterQuery(user),
				...createPaginationQuery(pagination)
			}
		}), HelixUserBlock, this._client);
	}
	/**
	* Creates a paginator for users blocked by the given user.
	*
	* @param user The user to get blocks for.
	*/
	getBlocksPaginated(user) {
		return new HelixPaginatedRequest({
			url: "users/blocks",
			userId: extractUserId(user),
			scopes: ["user:read:blocked_users"],
			query: createBroadcasterQuery(user)
		}, this._client, (data) => new HelixUserBlock(data, this._client));
	}
	/**
	* Blocks the given user.
	*
	* @param broadcaster The user to add the block to.
	* @param target The user to block.
	* @param additionalInfo Additional info to give context to the block.
	*
	* @expandParams
	*/
	async createBlock(broadcaster, target, additionalInfo = {}) {
		await this._client.callApi({
			type: "helix",
			url: "users/blocks",
			method: "PUT",
			userId: extractUserId(broadcaster),
			scopes: ["user:manage:blocked_users"],
			query: createUserBlockCreateQuery(target, additionalInfo)
		});
	}
	/**
	* Unblocks the given user.
	*
	* @param broadcaster The user to remove the block from.
	* @param target The user to unblock.
	*/
	async deleteBlock(broadcaster, target) {
		await this._client.callApi({
			type: "helix",
			url: "users/blocks",
			method: "DELETE",
			userId: extractUserId(broadcaster),
			scopes: ["user:manage:blocked_users"],
			query: createUserBlockDeleteQuery(target)
		});
	}
	/**
	* Gets a list of all extensions for the given authenticated user.
	*
	* @param broadcaster The broadcaster to get the list of extensions for.
	* @param withInactive Whether to include inactive extensions.
	*/
	async getExtensionsForAuthenticatedUser(broadcaster, withInactive = false) {
		return (await this._client.callApi({
			type: "helix",
			url: "users/extensions/list",
			userId: extractUserId(broadcaster),
			scopes: withInactive ? ["channel:manage:extensions"] : ["user:read:broadcast", "channel:manage:extensions"]
		})).data.map((data) => new HelixUserExtension(data));
	}
	/**
	* Gets a list of all installed extensions for the given user.
	*
	* @param user The user to get the installed extensions for.
	* @param withDev Whether to include extensions that are in development.
	*/
	async getActiveExtensions(user, withDev = false) {
		const userId = extractUserId(user);
		return new HelixInstalledExtensionList((await this._client.callApi({
			type: "helix",
			url: "users/extensions",
			userId,
			scopes: withDev ? ["user:read:broadcast", "channel:manage:extensions"] : void 0,
			query: createSingleKeyQuery("user_id", userId)
		})).data);
	}
	/**
	* Updates the installed extensions for the given authenticated user.
	*
	* @param broadcaster The user to update the installed extensions for.
	* @param data The extension installation payload.
	*
	* The format is shown on the [Twitch documentation](https://dev.twitch.tv/docs/api/reference#update-user-extensions).
	* Don't use the "data" wrapper though.
	*/
	async updateActiveExtensionsForAuthenticatedUser(broadcaster, data) {
		return new HelixInstalledExtensionList((await this._client.callApi({
			type: "helix",
			url: "users/extensions",
			method: "PUT",
			userId: extractUserId(broadcaster),
			scopes: ["channel:manage:extensions"],
			jsonBody: { data }
		})).data);
	}
	async _getUsers(lookupType, param) {
		if (param.length === 0) return [];
		const query = { [lookupType]: param };
		return (await this._client.callApi({
			type: "helix",
			url: "users",
			query
		})).data.map((userData) => new HelixUser(userData, this._client));
	}
};
__decorate([Enumerable(false)], HelixUserApi.prototype, "_getUserByIdBatcher", void 0);
__decorate([Enumerable(false)], HelixUserApi.prototype, "_getUserByNameBatcher", void 0);
HelixUserApi = __decorate([rtfm("api", "HelixUserApi")], HelixUserApi);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/video/HelixVideo.js
init_tslib_es6();
/**
* A video on Twitch.
*/
let HelixVideo = class HelixVideo extends DataObject {
	/** @internal */ _client;
	/** @internal */
	constructor(data, client) {
		super(data);
		this._client = client;
	}
	/**
	* The ID of the video.
	*/
	get id() {
		return this[rawDataSymbol].id;
	}
	/**
	* The ID of the user who created the video.
	*/
	get userId() {
		return this[rawDataSymbol].user_id;
	}
	/**
	* The name of the user who created the video.
	*/
	get userName() {
		return this[rawDataSymbol].user_login;
	}
	/**
	* The display name of the user who created the video.
	*/
	get userDisplayName() {
		return this[rawDataSymbol].user_name;
	}
	/**
	* Gets information about the user who created the video.
	*/
	async getUser() {
		return checkRelationAssertion(await this._client.users.getUserById(this[rawDataSymbol].user_id));
	}
	/**
	* The title of the video.
	*/
	get title() {
		return this[rawDataSymbol].title;
	}
	/**
	* The description of the video.
	*/
	get description() {
		return this[rawDataSymbol].description;
	}
	/**
	* The date when the video was created.
	*/
	get creationDate() {
		return new Date(this[rawDataSymbol].created_at);
	}
	/**
	* The date when the video was published.
	*/
	get publishDate() {
		return new Date(this[rawDataSymbol].published_at);
	}
	/**
	* The URL of the video.
	*/
	get url() {
		return this[rawDataSymbol].url;
	}
	/**
	* The URL of the thumbnail of the video.
	*/
	get thumbnailUrl() {
		return this[rawDataSymbol].thumbnail_url;
	}
	/**
	* Builds the thumbnail URL of the video using the given dimensions.
	*
	* @param width The width of the thumbnail.
	* @param height The height of the thumbnail.
	*/
	getThumbnailUrl(width, height) {
		return this[rawDataSymbol].thumbnail_url.replace("%{width}", width.toString()).replace("%{height}", height.toString());
	}
	/**
	* Whether the video is public or not.
	*/
	get isPublic() {
		return this[rawDataSymbol].viewable === "public";
	}
	/**
	* The number of views of the video.
	*/
	get views() {
		return this[rawDataSymbol].view_count;
	}
	/**
	* The language of the video.
	*/
	get language() {
		return this[rawDataSymbol].language;
	}
	/**
	* The type of the video.
	*/
	get type() {
		return this[rawDataSymbol].type;
	}
	/**
	* The duration of the video, as formatted by Twitch.
	*/
	get duration() {
		return this[rawDataSymbol].duration;
	}
	/**
	* The duration of the video, in seconds.
	*/
	get durationInSeconds() {
		const parts = this[rawDataSymbol].duration.match(/\d+[hms]/g);
		if (!parts) throw new HellFreezesOverError(`Could not parse duration string: ${this[rawDataSymbol].duration}`);
		return parts.map((part) => {
			const partialMatch = /(\d+)([hms])/.exec(part);
			if (!partialMatch) throw new HellFreezesOverError(`Could not parse partial duration string: ${part}`);
			const [, num, unit] = partialMatch;
			return parseInt(num, 10) * {
				h: 3600,
				m: 60,
				s: 1
			}[unit];
		}).reduce((a, b) => a + b);
	}
	/**
	* The ID of the stream this video belongs to.
	*
	* Returns null if the video is not an archived stream.
	*/
	get streamId() {
		return this[rawDataSymbol].stream_id;
	}
	/**
	* The raw data of muted segments of the video.
	*/
	get mutedSegmentData() {
		return this[rawDataSymbol].muted_segments?.slice() ?? [];
	}
	/**
	* Checks whether the video is muted at a given offset or range.
	*
	* @param offset The start of your range, in seconds from the start of the video,
	* or if no duration is given, the exact offset that is checked.
	* @param duration The duration of your range, in seconds.
	* @param partial Whether the range check is only partial.
	*
	* By default, this function returns true only if the passed range is entirely contained in a muted segment.
	*/
	isMutedAt(offset, duration, partial = false) {
		if (this[rawDataSymbol].muted_segments === null) return false;
		if (duration == null) return this[rawDataSymbol].muted_segments.some((seg) => seg.offset <= offset && offset <= seg.offset + seg.duration);
		const end = offset + duration;
		if (partial) return this[rawDataSymbol].muted_segments.some((seg) => {
			return offset < seg.offset + seg.duration && seg.offset < end;
		});
		return this[rawDataSymbol].muted_segments.some((seg) => {
			const segEnd = seg.offset + seg.duration;
			return seg.offset <= offset && end <= segEnd;
		});
	}
};
__decorate([Enumerable(false)], HelixVideo.prototype, "_client", void 0);
__decorate([CachedGetter()], HelixVideo.prototype, "durationInSeconds", null);
HelixVideo = __decorate([Cacheable, rtfm("api", "HelixVideo", "id")], HelixVideo);
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/video/HelixVideoApi.js
init_tslib_es6();
var HelixVideoApi_1;
/**
* The Helix API methods that deal with videos.
*
* Can be accessed using `client.videos` on an {@link ApiClient} instance.
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* const { data: videos } = await api.videos.getVideosByUser('125328655');
* ```
*
* @meta category helix
* @meta categorizedTitle Videos
*/
let HelixVideoApi = HelixVideoApi_1 = class HelixVideoApi extends BaseApi {
	/** @internal */
	_getVideoByIdBatcher = new HelixRequestBatcher({ url: "videos" }, "id", "id", this._client, (data) => new HelixVideo(data, this._client));
	/**
	* Gets the video data for the given list of video IDs.
	*
	* @param ids The video IDs you want to look up.
	*/
	async getVideosByIds(ids) {
		return (await this._getVideos("id", ids)).data;
	}
	/**
	* Gets the video data for the given video ID.
	*
	* @param id The video ID you want to look up.
	*/
	async getVideoById(id) {
		const videos = await this.getVideosByIds([id]);
		return videos.length ? videos[0] : null;
	}
	/**
	* Gets the video data for the given video ID, batching multiple calls into fewer requests as the API allows.
	*
	* @param id The video ID you want to look up.
	*/
	async getVideoByIdBatched(id) {
		return await this._getVideoByIdBatcher.request(id);
	}
	/**
	* Gets the videos of the given user.
	*
	* @param user The user you want to get videos from.
	* @param filter
	*
	* @expandParams
	*/
	async getVideosByUser(user, filter = {}) {
		const userId = extractUserId(user);
		return await this._getVideos("user_id", [userId], filter);
	}
	/**
	* Creates a paginator for videos of the given user.
	*
	* @param user The user you want to get videos from.
	* @param filter
	*
	* @expandParams
	*/
	getVideosByUserPaginated(user, filter = {}) {
		const userId = extractUserId(user);
		return this._getVideosPaginated("user_id", [userId], filter);
	}
	/**
	* Gets the videos of the given game.
	*
	* @param gameId The game you want to get videos from.
	* @param filter
	*
	* @expandParams
	*/
	async getVideosByGame(gameId, filter = {}) {
		return await this._getVideos("game_id", [gameId], filter);
	}
	/**
	* Creates a paginator for videos of the given game.
	*
	* @param gameId The game you want to get videos from.
	* @param filter
	*
	* @expandParams
	*/
	getVideosByGamePaginated(gameId, filter = {}) {
		return this._getVideosPaginated("game_id", [gameId], filter);
	}
	/**
	* Deletes videos by its IDs.
	*
	* @param broadcaster The broadcaster to delete the videos for.
	* @param ids The IDs of the videos to delete.
	*/
	async deleteVideosByIds(broadcaster, ids) {
		await this._client.callApi({
			type: "helix",
			url: "videos",
			method: "DELETE",
			scopes: ["channel:manage:videos"],
			userId: extractUserId(broadcaster),
			query: { id: ids }
		});
	}
	/** @internal */
	async _getVideos(filterType, filterValues, filter = {}) {
		if (!filterValues.length) return { data: [] };
		return createPaginatedResult(await this._client.callApi({
			type: "helix",
			url: "videos",
			userId: filterType === "user_id" ? filterValues[0] : void 0,
			query: {
				...HelixVideoApi_1._makeVideosQuery(filterType, filterValues, filter),
				...createPaginationQuery(filter)
			}
		}), HelixVideo, this._client);
	}
	/** @internal */
	_getVideosPaginated(filterType, filterValues, filter = {}) {
		return new HelixPaginatedRequest({
			url: "videos",
			userId: filterType === "user_id" ? filterValues[0] : void 0,
			query: HelixVideoApi_1._makeVideosQuery(filterType, filterValues, filter)
		}, this._client, (data) => new HelixVideo(data, this._client));
	}
	/** @internal */
	static _makeVideosQuery(filterType, filterValues, filter = {}) {
		const { language, period, orderBy, type } = filter;
		return {
			[filterType]: filterValues,
			language,
			period,
			sort: orderBy,
			type
		};
	}
};
__decorate([Enumerable(false)], HelixVideoApi.prototype, "_getVideoByIdBatcher", void 0);
HelixVideoApi = HelixVideoApi_1 = __decorate([rtfm("api", "HelixVideoApi")], HelixVideoApi);
//#endregion
//#region node_modules/@twurple/api/lib/interfaces/endpoints/whisper.external.js
/** @internal */
function createWhisperQuery(from, to) {
	return {
		from_user_id: extractUserId(from),
		to_user_id: extractUserId(to)
	};
}
//#endregion
//#region node_modules/@twurple/api/lib/endpoints/whisper/HelixWhisperApi.js
init_tslib_es6();
/**
* The API methods that deal with whispers.
*
* Can be accessed using 'client.whispers' on an {@link ApiClient} instance
*
* ## Example
* ```ts
* const api = new ApiClient({ authProvider });
* await api.whispers.sendWhisper('61369223', '86753099', 'Howdy, partner!');
* ```
*
* @meta category helix
* @meta categorizedTitle Whispers
*/
let HelixWhisperApi = class HelixWhisperApi extends BaseApi {
	/**
	* Sends a whisper message to the specified user.
	*
	* NOTE: The API may silently drop whispers that it suspects of violating Twitch policies. (The API does not indicate that it dropped the whisper; it returns a 204 status code as if it succeeded).
	*
	* @param from The user sending the whisper. This user must have a verified phone number and must match the user in the access token.
	* @param to The user to receive the whisper.
	* @param message The whisper message to send. The message must not be empty.
	*
	* The maximum message lengths are:
	*
	* 500 characters if the user you're sending the message to hasn't whispered you before.
	* 10,000 characters if the user you're sending the message to has whispered you before.
	*
	* Messages that exceed the maximum length are truncated.
	*/
	async sendWhisper(from, to, message) {
		await this._client.callApi({
			type: "helix",
			url: "whispers",
			method: "POST",
			userId: extractUserId(from),
			scopes: ["user:manage:whispers"],
			query: createWhisperQuery(from, to),
			jsonBody: { message }
		});
	}
};
HelixWhisperApi = __decorate([rtfm("api", "HelixWhisperApi")], HelixWhisperApi);
//#endregion
//#region node_modules/@twurple/api/lib/reporting/ApiReportedRequest.js
/**
* Reporting details for an API request.
*/
var ApiReportedRequest = class {
	_options;
	_httpStatus;
	_resolvedUserId;
	/** @internal */
	constructor(_options, _httpStatus, _resolvedUserId) {
		this._options = _options;
		this._httpStatus = _httpStatus;
		this._resolvedUserId = _resolvedUserId;
	}
	/**
	* The options used to call the API.
	*/
	get options() {
		return this._options;
	}
	/**
	* The HTTP status code returned by Twitch for the request.
	*/
	get httpStatus() {
		return this._httpStatus;
	}
	/**
	* The ID of the user that was used for authentication, or `null` if an app access token was used.
	*/
	get resolvedUserId() {
		return this._resolvedUserId;
	}
};
//#endregion
//#region node_modules/@twurple/api/lib/client/BaseApiClient.js
init_tslib_es6();
var import_retry = /* @__PURE__ */ __toESM(require_retry(), 1);
/** @private */
let BaseApiClient = class BaseApiClient extends EventEmitter {
	_config;
	_logger;
	_rateLimiter;
	onRequest = this.registerEvent();
	/** @internal */
	constructor(config, logger, rateLimiter) {
		super();
		this._config = config;
		this._logger = logger;
		this._rateLimiter = rateLimiter;
	}
	/**
	* Requests scopes from the auth provider for the given user.
	*
	* @param user The user to request scopes for.
	* @param scopes The scopes to request.
	*/
	async requestScopesForUser(user, scopes) {
		await this._config.authProvider.getAccessTokenForUser(user, ...scopes.map((scope) => [scope]));
	}
	/**
	* Gets information about your access token.
	*/
	async getTokenInfo() {
		try {
			return new TokenInfo(await this.callApi({
				type: "auth",
				url: "validate"
			}));
		} catch (e) {
			if (e instanceof HttpStatusCodeError && e.statusCode === 401) throw new InvalidTokenError({ cause: e });
			throw e;
		}
	}
	/**
	* Makes a call to the Twitch API using your access token.
	*
	* @param options The configuration of the call.
	*/
	async callApi(options) {
		const { authProvider } = this._config;
		if (!(options.auth ?? true)) return await callTwitchApi(options, authProvider.clientId, void 0, void 0, this._config.fetchOptions);
		let forceUser = false;
		if (options.forceType) switch (options.forceType) {
			case "app": {
				if (!authProvider.getAppAccessToken) throw new Error("Tried to make an API call that requires an app access token but your auth provider does not support that");
				const accessToken = await authProvider.getAppAccessToken();
				return await this._callApiUsingInitialToken(options, accessToken);
			}
			case "user":
				forceUser = true;
				break;
			default: throw new HellFreezesOverError(`Unknown forced token type: ${options.forceType}`);
		}
		if (options.scopes) forceUser = true;
		if (forceUser) {
			const contextUserId = options.canOverrideScopedUserContext ? this._getUserIdFromRequestContext(options.userId) : options.userId;
			if (!contextUserId) throw new Error("Tried to make an API call with a user context but no context user ID");
			const accessToken = await authProvider.getAccessTokenForUser(contextUserId, options.scopes);
			if (!accessToken) throw new Error(`Tried to make an API call with a user context for user ID ${contextUserId} but no token was found`);
			if (accessTokenIsExpired(accessToken) && authProvider.refreshAccessTokenForUser) {
				const newAccessToken = await authProvider.refreshAccessTokenForUser(contextUserId);
				return await this._callApiUsingInitialToken(options, newAccessToken, true);
			}
			return await this._callApiUsingInitialToken(options, accessToken);
		}
		const requestContextUserId = this._getUserIdFromRequestContext(options.userId);
		const accessToken = requestContextUserId === null ? await authProvider.getAnyAccessToken() : await authProvider.getAnyAccessToken(requestContextUserId ?? options.userId);
		if (accessTokenIsExpired(accessToken) && accessToken.userId && authProvider.refreshAccessTokenForUser) {
			const newAccessToken = await authProvider.refreshAccessTokenForUser(accessToken.userId);
			return await this._callApiUsingInitialToken(options, newAccessToken, true);
		}
		return await this._callApiUsingInitialToken(options, accessToken);
	}
	/**
	* The Helix bits API methods.
	*/
	get bits() {
		return new HelixBitsApi(this);
	}
	/**
	* The Helix channels API methods.
	*/
	get channels() {
		return new HelixChannelApi(this);
	}
	/**
	* The Helix channel points API methods.
	*/
	get channelPoints() {
		return new HelixChannelPointsApi(this);
	}
	/**
	* The Helix charity API methods.
	*/
	get charity() {
		return new HelixCharityApi(this);
	}
	/**
	* The Helix chat API methods.
	*/
	get chat() {
		return new HelixChatApi(this);
	}
	/**
	* The Helix clips API methods.
	*/
	get clips() {
		return new HelixClipApi(this);
	}
	/**
	* The Helix content classification label API methods.
	*/
	get contentClassificationLabels() {
		return new HelixContentClassificationLabelApi(this);
	}
	/**
	* The Helix entitlement API methods.
	*/
	get entitlements() {
		return new HelixEntitlementApi(this);
	}
	/**
	* The Helix EventSub API methods.
	*/
	get eventSub() {
		return new HelixEventSubApi(this);
	}
	/**
	* The Helix extensions API methods.
	*/
	get extensions() {
		return new HelixExtensionsApi(this);
	}
	/**
	* The Helix game API methods.
	*/
	get games() {
		return new HelixGameApi(this);
	}
	/**
	* The Helix Hype Train API methods.
	*/
	get hypeTrain() {
		return new HelixHypeTrainApi(this);
	}
	/**
	* The Helix goal API methods.
	*/
	get goals() {
		return new HelixGoalApi(this);
	}
	/**
	* The Helix moderation API methods.
	*/
	get moderation() {
		return new HelixModerationApi(this);
	}
	/**
	* The Helix poll API methods.
	*/
	get polls() {
		return new HelixPollApi(this);
	}
	/**
	* The Helix prediction API methods.
	*/
	get predictions() {
		return new HelixPredictionApi(this);
	}
	/**
	* The Helix raid API methods.
	*/
	get raids() {
		return new HelixRaidApi(this);
	}
	/**
	* The Helix schedule API methods.
	*/
	get schedule() {
		return new HelixScheduleApi(this);
	}
	/**
	* The Helix search API methods.
	*/
	get search() {
		return new HelixSearchApi(this);
	}
	/**
	* The Helix stream API methods.
	*/
	get streams() {
		return new HelixStreamApi(this);
	}
	/**
	* The Helix subscription API methods.
	*/
	get subscriptions() {
		return new HelixSubscriptionApi(this);
	}
	/**
	* The Helix team API methods.
	*/
	get teams() {
		return new HelixTeamApi(this);
	}
	/**
	* The Helix user API methods.
	*/
	get users() {
		return new HelixUserApi(this);
	}
	/**
	* The Helix video API methods.
	*/
	get videos() {
		return new HelixVideoApi(this);
	}
	/**
	* The API methods that deal with whispers.
	*/
	get whispers() {
		return new HelixWhisperApi(this);
	}
	/**
	* Statistics on the rate limiter for the Helix API.
	*/
	get rateLimiterStats() {
		if (this._rateLimiter instanceof ResponseBasedRateLimiter) return this._rateLimiter.stats;
		return null;
	}
	/** @private */
	get _authProvider() {
		return this._config.authProvider;
	}
	/** @internal */
	get _batchDelay() {
		return this._config.batchDelay ?? 0;
	}
	/** @internal */
	_getUserIdFromRequestContext(contextUserId) {
		return contextUserId;
	}
	async _callApiUsingInitialToken(options, accessToken, wasRefreshed = false) {
		const { authProvider } = this._config;
		const { authorizationType } = authProvider;
		let response = await this._callApiInternal(options, authProvider.clientId, accessToken.accessToken, authorizationType);
		if (response.status === 401 && !wasRefreshed) {
			if (accessToken.userId) {
				if (authProvider.refreshAccessTokenForUser) {
					const token = await authProvider.refreshAccessTokenForUser(accessToken.userId);
					response = await this._callApiInternal(options, authProvider.clientId, token.accessToken, authorizationType);
				}
			} else if (authProvider.getAppAccessToken) {
				const token = await authProvider.getAppAccessToken(true);
				response = await this._callApiInternal(options, authProvider.clientId, token.accessToken, authorizationType);
			}
		}
		this.emit(this.onRequest, new ApiReportedRequest(options, response.status, accessToken.userId ?? null));
		await handleTwitchApiResponseError(response, options);
		return await transformTwitchApiResponse(response);
	}
	async _callApiInternal(options, clientId, accessToken, authorizationType) {
		const { fetchOptions } = this._config;
		const type = options.type ?? "helix";
		this._logger.debug(`Calling ${type} API: ${options.method ?? "GET"} ${options.url}`);
		this._logger.trace(`Query: ${JSON.stringify(options.query)}`);
		if (options.jsonBody) this._logger.trace(`Request body: ${JSON.stringify(options.jsonBody)}`);
		const op = import_retry.operation({
			retries: 3,
			minTimeout: 500,
			factor: 2
		});
		const { promise, resolve, reject } = promiseWithResolvers();
		op.attempt(async () => {
			try {
				const response = type === "helix" ? await this._rateLimiter.request({
					options,
					clientId,
					accessToken,
					authorizationType,
					fetchOptions
				}) : await callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions);
				if (!response.ok && response.status >= 500 && response.status < 600) await handleTwitchApiResponseError(response, options);
				resolve(response);
			} catch (e) {
				if (op.retry(e)) return;
				reject(op.mainError());
			}
		});
		const result = await promise;
		this._logger.debug(`Called ${type} API: ${options.method ?? "GET"} ${options.url} - result: ${result.status}`);
		return result;
	}
};
__decorate([CachedGetter()], BaseApiClient.prototype, "bits", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "channels", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "channelPoints", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "charity", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "chat", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "clips", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "contentClassificationLabels", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "entitlements", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "eventSub", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "extensions", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "games", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "hypeTrain", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "goals", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "moderation", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "polls", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "predictions", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "raids", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "schedule", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "search", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "streams", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "subscriptions", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "teams", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "users", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "videos", null);
__decorate([CachedGetter()], BaseApiClient.prototype, "whispers", null);
BaseApiClient = __decorate([Cacheable, rtfm("api", "ApiClient")], BaseApiClient);
//#endregion
//#region node_modules/@twurple/api/lib/client/NoContextApiClient.js
init_tslib_es6();
/** @private */
let NoContextApiClient = class NoContextApiClient extends BaseApiClient {
	/** @internal */
	_getUserIdFromRequestContext() {
		return null;
	}
};
NoContextApiClient = __decorate([rtfm("api", "ApiClient")], NoContextApiClient);
//#endregion
//#region node_modules/@twurple/api/lib/client/UserContextApiClient.js
init_tslib_es6();
/** @private */
let UserContextApiClient = class UserContextApiClient extends BaseApiClient {
	_userId;
	/** @internal */
	constructor(config, logger, rateLimiter, _userId) {
		super(config, logger, rateLimiter);
		this._userId = _userId;
	}
	/** @internal */
	_getUserIdFromRequestContext() {
		return this._userId;
	}
};
UserContextApiClient = __decorate([rtfm("api", "ApiClient")], UserContextApiClient);
//#endregion
//#region node_modules/@twurple/api/lib/client/ApiClient.js
init_tslib_es6();
/**
* An API client for the Twitch Helix API and other miscellaneous endpoints.
*
* @meta category main
* @hideProtected
*/
let ApiClient = class ApiClient extends BaseApiClient {
	/**
	* Creates a new API client instance.
	*
	* @param config Configuration for the client instance.
	*/
	constructor(config) {
		if (!config.authProvider) throw new ConfigError("No auth provider given. Please supply the `authProvider` option.");
		const rateLimitLoggerOptions = {
			name: "twurple:api:rate-limiter",
			...config.logger
		};
		super(config, createLogger$1({
			name: "twurple:api:client",
			...config.logger
		}), import_detect_node.isNode ? new PartitionedRateLimiter({
			getPartitionKey: (req) => req.userId ?? null,
			createChild: () => new HelixRateLimiter({ logger: rateLimitLoggerOptions })
		}) : new PartitionedTimeBasedRateLimiter({
			logger: rateLimitLoggerOptions,
			bucketSize: 800,
			timeFrame: 64e3,
			doRequest: async ({ options, clientId, accessToken, authorizationType, fetchOptions }) => await callTwitchApiRaw(options, clientId, accessToken, authorizationType, fetchOptions),
			getPartitionKey: (req) => req.userId ?? null
		}));
	}
	/**
	* Creates a contextualized ApiClient that can be used to call the API in the context of a given user.
	*
	* @param user The user to use as context.
	* @param runner The callback to execute.
	*
	* A parameter is passed that should be used in place of the normal `ApiClient`
	* to ensure that all requests are executed in the given user's context.
	*
	* Please note that requests which require scope authorization ignore this context.
	*
	* The return value of your callback will be propagated to the return value of this method.
	*/
	async asUser(user, runner) {
		return await runner(new UserContextApiClient(this._config, this._logger, this._rateLimiter, extractUserId(user)));
	}
	/**
	* Creates a contextualized ApiClient that can be used to call the API in the context of a given intent.
	*
	* @param intents A list of intents. The first one that is found in your auth provider will be used.
	* @param runner The callback to execute.
	*
	* A parameter is passed that should be used in place of the normal `ApiClient`
	* to ensure that all requests are executed in the given user's context.
	*
	* Please note that requests which require scope authorization ignore this context.
	*
	* The return value of your callback will be propagated to the return value of this method.
	*/
	async asIntent(intents, runner) {
		if (!this._authProvider.getAccessTokenForIntent) throw new Error("Trying to use intents with an auth provider that does not support them");
		for (const intent of intents) {
			const user = await this._authProvider.getAccessTokenForIntent(intent);
			if (user) return await runner(new UserContextApiClient(this._config, this._logger, this._rateLimiter, user.userId));
		}
		throw new Error(`Intents [${intents.join(", ")}] not found in auth provider`);
	}
	/**
	* Creates a contextualized ApiClient that can be used to call the API without the context of any user.
	*
	* This usually means that an app access token is used.
	*
	* @param runner The callback to execute.
	*
	* A parameter is passed that should be used in place of the normal `ApiClient`
	* to ensure that all requests are executed without user context.
	*
	* Please note that requests which require scope authorization ignore this context erasure.
	*
	* The return value of your callback will be propagated to the return value of this method.
	*/
	async withoutUser(runner) {
		return await runner(new NoContextApiClient(this._config, this._logger, this._rateLimiter));
	}
};
ApiClient = __decorate([rtfm("api", "ApiClient")], ApiClient);
//#endregion
//#region extensions/twitch/src/resolver.ts
/**
* Twitch resolver adapter for channel/user name resolution.
*
* This module implements the ChannelResolverAdapter interface to resolve
* Twitch usernames to user IDs via the Twitch Helix API.
*/
/**
* Normalize a Twitch username - strip @ prefix and convert to lowercase
*/
function normalizeUsername(input) {
	const trimmed = input.trim();
	if (trimmed.startsWith("@")) return trimmed.slice(1).toLowerCase();
	return trimmed.toLowerCase();
}
/**
* Create a logger that includes the Twitch prefix
*/
function createLogger(logger) {
	return {
		info: (msg) => logger?.info(msg),
		warn: (msg) => logger?.warn(msg),
		error: (msg) => logger?.error(msg),
		debug: (msg) => logger?.debug?.(msg) ?? (() => {})
	};
}
/**
* Resolve Twitch usernames to user IDs via the Helix API
*
* @param inputs - Array of usernames or user IDs to resolve
* @param account - Twitch account configuration with auth credentials
* @param kind - Type of target to resolve ("user" or "group")
* @param logger - Optional logger
* @returns Promise resolving to array of ChannelResolveResult
*/
async function resolveTwitchTargets(inputs, account, kind, logger) {
	const log = createLogger(logger);
	if (!account.clientId || !account.accessToken) {
		log.error("Missing Twitch client ID or accessToken");
		return inputs.map((input) => ({
			input,
			resolved: false,
			note: "missing Twitch credentials"
		}));
	}
	const normalizedToken = normalizeToken(account.accessToken);
	const apiClient = new ApiClient({ authProvider: new StaticAuthProvider(account.clientId, normalizedToken) });
	const results = [];
	for (const input of inputs) {
		const normalized = normalizeUsername(input);
		if (!normalized) {
			results.push({
				input,
				resolved: false,
				note: "empty input"
			});
			continue;
		}
		const looksLikeUserId = /^\d+$/.test(normalized);
		try {
			if (looksLikeUserId) {
				const user = await apiClient.users.getUserById(normalized);
				if (user) {
					results.push({
						input,
						resolved: true,
						id: user.id,
						name: user.name
					});
					log.debug?.(`Resolved user ID ${normalized} -> ${user.name}`);
				} else {
					results.push({
						input,
						resolved: false,
						note: "user ID not found"
					});
					log.warn(`User ID ${normalized} not found`);
				}
			} else {
				const user = await apiClient.users.getUserByName(normalized);
				if (user) {
					results.push({
						input,
						resolved: true,
						id: user.id,
						name: user.name,
						note: user.displayName !== user.name ? `display: ${user.displayName}` : void 0
					});
					log.debug?.(`Resolved username ${normalized} -> ${user.id} (${user.name})`);
				} else {
					results.push({
						input,
						resolved: false,
						note: "username not found"
					});
					log.warn(`Username ${normalized} not found`);
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			results.push({
				input,
				resolved: false,
				note: `API error: ${errorMessage}`
			});
			log.error(`Failed to resolve ${input}: ${errorMessage}`);
		}
	}
	return results;
}
//#endregion
//#region extensions/twitch/src/setup-surface.ts
/**
* Twitch setup wizard surface for CLI setup.
*/
const channel = "twitch";
function resolveSetupAccountId(cfg) {
	return cfg.channels?.twitch?.defaultAccount?.trim() || resolveDefaultTwitchAccountId(cfg);
}
function setTwitchAccount(cfg, account, accountId = resolveSetupAccountId(cfg)) {
	const existing = getAccountConfig(cfg, accountId);
	const merged = {
		username: account.username ?? existing?.username ?? "",
		accessToken: account.accessToken ?? existing?.accessToken ?? "",
		clientId: account.clientId ?? existing?.clientId ?? "",
		channel: account.channel ?? existing?.channel ?? "",
		enabled: account.enabled ?? existing?.enabled ?? true,
		allowFrom: account.allowFrom ?? existing?.allowFrom,
		allowedRoles: account.allowedRoles ?? existing?.allowedRoles,
		requireMention: account.requireMention ?? existing?.requireMention,
		clientSecret: account.clientSecret ?? existing?.clientSecret,
		refreshToken: account.refreshToken ?? existing?.refreshToken,
		expiresIn: account.expiresIn ?? existing?.expiresIn,
		obtainmentTimestamp: account.obtainmentTimestamp ?? existing?.obtainmentTimestamp
	};
	return {
		...cfg,
		channels: {
			...cfg.channels,
			twitch: {
				...cfg.channels?.twitch,
				enabled: true,
				accounts: {
					...(cfg.channels?.twitch)?.accounts,
					[accountId]: merged
				}
			}
		}
	};
}
async function noteTwitchSetupHelp(prompter) {
	await prompter.note([
		"Twitch requires a bot account with OAuth token.",
		"1. Create a Twitch application at https://dev.twitch.tv/console",
		"2. Generate a token with scopes: chat:read and chat:write",
		"   Use https://twitchtokengenerator.com/ or https://twitchapps.com/tmi/",
		"3. Copy the token (starts with 'oauth:') and Client ID",
		"Env vars supported: OPENCLAW_TWITCH_ACCESS_TOKEN",
		`Docs: ${formatDocsLink("/channels/twitch", "channels/twitch")}`
	].join("\n"), "Twitch setup");
}
async function promptToken(prompter, account, envToken) {
	const existingToken = account?.accessToken ?? "";
	if (existingToken && !envToken) {
		if (await prompter.confirm({
			message: "Access token already configured. Keep it?",
			initialValue: true
		})) return existingToken;
	}
	return String(await prompter.text({
		message: "Twitch OAuth token (oauth:...)",
		initialValue: envToken ?? "",
		validate: (value) => {
			const raw = String(value ?? "").trim();
			if (!raw) return "Required";
			if (!raw.startsWith("oauth:")) return "Token should start with 'oauth:'";
		}
	})).trim();
}
async function promptUsername(prompter, account) {
	return String(await prompter.text({
		message: "Twitch bot username",
		initialValue: account?.username ?? "",
		validate: (value) => value?.trim() ? void 0 : "Required"
	})).trim();
}
async function promptClientId(prompter, account) {
	return String(await prompter.text({
		message: "Twitch Client ID",
		initialValue: account?.clientId ?? "",
		validate: (value) => value?.trim() ? void 0 : "Required"
	})).trim();
}
async function promptChannelName(prompter, account) {
	return String(await prompter.text({
		message: "Channel to join",
		initialValue: account?.channel ?? "",
		validate: (value) => value?.trim() ? void 0 : "Required"
	})).trim();
}
async function promptRefreshTokenSetup(prompter, account) {
	if (!await prompter.confirm({
		message: "Enable automatic token refresh (requires client secret and refresh token)?",
		initialValue: Boolean(account?.clientSecret && account?.refreshToken)
	})) return {};
	return {
		clientSecret: String(await prompter.text({
			message: "Twitch Client Secret (for token refresh)",
			initialValue: account?.clientSecret ?? "",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim() || void 0,
		refreshToken: String(await prompter.text({
			message: "Twitch Refresh Token",
			initialValue: account?.refreshToken ?? "",
			validate: (value) => value?.trim() ? void 0 : "Required"
		})).trim() || void 0
	};
}
async function configureWithEnvToken(cfg, prompter, account, envToken, forceAllowFrom, dmPolicy) {
	if (!await prompter.confirm({
		message: "Twitch env var OPENCLAW_TWITCH_ACCESS_TOKEN detected. Use env token?",
		initialValue: true
	})) return null;
	const cfgWithAccount = setTwitchAccount(cfg, {
		username: await promptUsername(prompter, account),
		clientId: await promptClientId(prompter, account),
		accessToken: "",
		enabled: true
	});
	if (forceAllowFrom && dmPolicy.promptAllowFrom) return { cfg: await dmPolicy.promptAllowFrom({
		cfg: cfgWithAccount,
		prompter
	}) };
	return { cfg: cfgWithAccount };
}
function setTwitchAccessControl(cfg, allowedRoles, requireMention) {
	const accountId = resolveSetupAccountId(cfg);
	const account = getAccountConfig(cfg, accountId);
	if (!account) return cfg;
	return setTwitchAccount(cfg, {
		...account,
		allowedRoles,
		requireMention
	}, accountId);
}
function resolveTwitchGroupPolicy(cfg) {
	const account = getAccountConfig(cfg, resolveSetupAccountId(cfg));
	if (account?.allowedRoles?.includes("all")) return "open";
	if (account?.allowedRoles?.includes("moderator")) return "allowlist";
	return "disabled";
}
function setTwitchGroupPolicy(cfg, policy) {
	return setTwitchAccessControl(cfg, policy === "open" ? ["all"] : policy === "allowlist" ? ["moderator", "vip"] : [], true);
}
const twitchDmPolicy = {
	label: "Twitch",
	channel,
	policyKey: "channels.twitch.allowedRoles",
	allowFromKey: "channels.twitch.accounts.<default>.allowFrom",
	getCurrent: (cfg) => {
		const account = getAccountConfig(cfg, resolveSetupAccountId(cfg));
		if (account?.allowedRoles?.includes("all")) return "open";
		if (account?.allowFrom && account.allowFrom.length > 0) return "allowlist";
		return "disabled";
	},
	setPolicy: (cfg, policy) => {
		return setTwitchAccessControl(cfg, policy === "open" ? ["all"] : policy === "allowlist" ? [] : ["moderator"], true);
	},
	promptAllowFrom: async ({ cfg, prompter }) => {
		const accountId = resolveSetupAccountId(cfg);
		const account = getAccountConfig(cfg, accountId);
		const existingAllowFrom = account?.allowFrom ?? [];
		const entry = await prompter.text({
			message: "Twitch allowFrom (user IDs, one per line, recommended for security)",
			placeholder: "123456789",
			initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : void 0
		});
		const allowFrom = String(entry ?? "").split(/[\n,;]+/g).map((s) => s.trim()).filter(Boolean);
		return setTwitchAccount(cfg, {
			...account ?? void 0,
			allowFrom
		}, accountId);
	}
};
const twitchGroupAccess = {
	label: "Twitch chat",
	placeholder: "",
	skipAllowlistEntries: true,
	currentPolicy: ({ cfg }) => resolveTwitchGroupPolicy(cfg),
	currentEntries: ({ cfg }) => {
		return getAccountConfig(cfg, resolveSetupAccountId(cfg))?.allowFrom ?? [];
	},
	updatePrompt: ({ cfg }) => {
		const account = getAccountConfig(cfg, resolveSetupAccountId(cfg));
		return Boolean(account?.allowedRoles?.length || account?.allowFrom?.length);
	},
	setPolicy: ({ cfg, policy }) => setTwitchGroupPolicy(cfg, policy),
	resolveAllowlist: async () => [],
	applyAllowlist: ({ cfg }) => cfg
};
const twitchSetupAdapter = {
	resolveAccountId: ({ cfg }) => resolveSetupAccountId(cfg),
	applyAccountConfig: ({ cfg, accountId }) => setTwitchAccount(cfg, { enabled: true }, accountId)
};
const twitchSetupWizard = {
	channel,
	resolveAccountIdForConfigure: ({ defaultAccountId }) => defaultAccountId,
	resolveShouldPromptAccountIds: () => false,
	status: {
		configuredLabel: "configured",
		unconfiguredLabel: "needs username, token, and clientId",
		configuredHint: "configured",
		unconfiguredHint: "needs setup",
		resolveConfigured: ({ cfg }) => {
			const account = getAccountConfig(cfg, resolveSetupAccountId(cfg));
			return account ? isAccountConfigured(account) : false;
		},
		resolveStatusLines: ({ cfg }) => {
			const accountId = resolveSetupAccountId(cfg);
			const account = getAccountConfig(cfg, accountId);
			const configured = account ? isAccountConfigured(account) : false;
			return [`Twitch${accountId !== "default" ? ` (${accountId})` : ""}: ${configured ? "configured" : "needs username, token, and clientId"}`];
		}
	},
	credentials: [],
	finalize: async ({ cfg, prompter, forceAllowFrom }) => {
		const accountId = resolveSetupAccountId(cfg);
		const account = getAccountConfig(cfg, accountId);
		if (!account || !isAccountConfigured(account)) await noteTwitchSetupHelp(prompter);
		const envToken = process.env.OPENCLAW_TWITCH_ACCESS_TOKEN?.trim();
		if (envToken && !account?.accessToken) {
			const envResult = await configureWithEnvToken(cfg, prompter, account, envToken, forceAllowFrom, twitchDmPolicy);
			if (envResult) return envResult;
		}
		const username = await promptUsername(prompter, account);
		const token = await promptToken(prompter, account, envToken);
		const clientId = await promptClientId(prompter, account);
		const channelName = await promptChannelName(prompter, account);
		const { clientSecret, refreshToken } = await promptRefreshTokenSetup(prompter, account);
		const cfgWithAccount = setTwitchAccount(cfg, {
			username,
			accessToken: token,
			clientId,
			channel: channelName,
			clientSecret,
			refreshToken,
			enabled: true
		}, accountId);
		return { cfg: forceAllowFrom && twitchDmPolicy.promptAllowFrom ? await twitchDmPolicy.promptAllowFrom({
			cfg: cfgWithAccount,
			prompter
		}) : cfgWithAccount };
	},
	dmPolicy: twitchDmPolicy,
	groupAccess: twitchGroupAccess,
	disable: (cfg) => {
		const twitch = cfg.channels?.twitch;
		return {
			...cfg,
			channels: {
				...cfg.channels,
				twitch: {
					...twitch,
					enabled: false
				}
			}
		};
	}
};
//#endregion
//#region extensions/twitch/src/status.ts
/**
* Collect status issues for Twitch accounts.
*
* Analyzes account snapshots and detects configuration problems,
* authentication issues, and other potential problems.
*
* @param accounts - Array of account snapshots to analyze
* @param getCfg - Optional function to get full config for additional checks
* @returns Array of detected status issues
*
* @example
* const issues = collectTwitchStatusIssues(accountSnapshots);
* if (issues.length > 0) {
*   console.warn("Twitch configuration issues detected:");
*   issues.forEach(issue => console.warn(`- ${issue.message}`));
* }
*/
function collectTwitchStatusIssues(accounts, getCfg) {
	const issues = [];
	for (const entry of accounts) {
		const accountId = entry.accountId;
		if (!accountId) continue;
		let account = null;
		let cfg;
		if (getCfg) try {
			cfg = getCfg();
			account = getAccountConfig(cfg, accountId);
		} catch {}
		if (!entry.configured) {
			issues.push({
				channel: "twitch",
				accountId,
				kind: "config",
				message: "Twitch account is not properly configured",
				fix: "Add required fields: username, accessToken, and clientId to your account configuration"
			});
			continue;
		}
		if (entry.enabled === false) {
			issues.push({
				channel: "twitch",
				accountId,
				kind: "config",
				message: "Twitch account is disabled",
				fix: "Set enabled: true in your account configuration to enable this account"
			});
			continue;
		}
		if (account && account.username && account.accessToken && !account.clientId) issues.push({
			channel: "twitch",
			accountId,
			kind: "config",
			message: "Twitch client ID is required",
			fix: "Add clientId to your Twitch account configuration (from Twitch Developer Portal)"
		});
		const tokenResolution = cfg ? resolveTwitchToken(cfg, { accountId }) : {
			token: "",
			source: "none"
		};
		if (account && isAccountConfigured(account, tokenResolution.token)) {
			if (account.accessToken?.startsWith("oauth:")) issues.push({
				channel: "twitch",
				accountId,
				kind: "config",
				message: "Token contains 'oauth:' prefix (will be stripped)",
				fix: "The 'oauth:' prefix is optional. You can use just the token value, or keep it as-is (it will be normalized automatically)."
			});
			if (account.clientSecret && !account.refreshToken) issues.push({
				channel: "twitch",
				accountId,
				kind: "config",
				message: "clientSecret provided without refreshToken",
				fix: "For automatic token refresh, provide both clientSecret and refreshToken. Otherwise, clientSecret is not needed."
			});
			if (account.allowFrom && account.allowFrom.length === 0) issues.push({
				channel: "twitch",
				accountId,
				kind: "config",
				message: "allowFrom is configured but empty",
				fix: "Either add user IDs to allowFrom, remove the allowFrom field, or use allowedRoles instead."
			});
			if (account.allowedRoles?.includes("all") && account.allowFrom && account.allowFrom.length > 0) issues.push({
				channel: "twitch",
				accountId,
				kind: "intent",
				message: "allowedRoles is set to 'all' but allowFrom is also configured",
				fix: "When allowedRoles is 'all', the allowFrom list is not needed. Remove allowFrom or set allowedRoles to specific roles."
			});
		}
		if (entry.lastError) issues.push({
			channel: "twitch",
			accountId,
			kind: "runtime",
			message: `Last error: ${entry.lastError}`,
			fix: "Check your token validity and network connection. Ensure the bot has the required OAuth scopes."
		});
		if (entry.configured && !entry.running && !entry.lastStartAt && !entry.lastInboundAt && !entry.lastOutboundAt) issues.push({
			channel: "twitch",
			accountId,
			kind: "runtime",
			message: "Account has never connected successfully",
			fix: "Start the Twitch gateway to begin receiving messages. Check logs for connection errors."
		});
		if (entry.running && entry.lastStartAt) {
			const daysSinceStart = (Date.now() - entry.lastStartAt) / (1e3 * 60 * 60 * 24);
			if (daysSinceStart > 7) issues.push({
				channel: "twitch",
				accountId,
				kind: "runtime",
				message: `Connection has been running for ${Math.floor(daysSinceStart)} days`,
				fix: "Consider restarting the connection periodically to refresh the connection. Twitch tokens may expire after long periods."
			});
		}
	}
	return issues;
}
//#endregion
//#region extensions/twitch/src/plugin.ts
/**
* Twitch channel plugin for OpenClaw.
*
* Main plugin export combining all adapters (outbound, actions, status, gateway).
* This is the primary entry point for the Twitch channel integration.
*/
/**
* Twitch channel plugin.
*
* Implements the ChannelPlugin interface to provide Twitch chat integration
* for OpenClaw. Supports message sending, receiving, access control, and
* status monitoring.
*/
const twitchPlugin = createChatChannelPlugin({
	pairing: {
		idLabel: "twitchUserId",
		normalizeAllowEntry: createPairingPrefixStripper(/^(twitch:)?user:?/i),
		notifyApproval: createLoggedPairingApprovalNotifier(({ id }) => `Pairing approved for user ${id} (notification sent via chat if possible)`, console.warn)
	},
	outbound: twitchOutbound,
	base: {
		id: "twitch",
		meta: {
			id: "twitch",
			label: "Twitch",
			selectionLabel: "Twitch (Chat)",
			docsPath: "/channels/twitch",
			blurb: "Twitch chat integration",
			aliases: ["twitch-chat"]
		},
		setup: twitchSetupAdapter,
		setupWizard: twitchSetupWizard,
		capabilities: { chatTypes: ["group"] },
		configSchema: buildChannelConfigSchema(TwitchConfigSchema),
		config: {
			listAccountIds: (cfg) => listAccountIds(cfg),
			resolveAccount: (cfg, accountId) => {
				const resolvedAccountId = accountId ?? resolveDefaultTwitchAccountId(cfg);
				const account = getAccountConfig(cfg, resolvedAccountId);
				if (!account) return {
					accountId: resolvedAccountId,
					channel: "",
					username: "",
					accessToken: "",
					clientId: "",
					enabled: false
				};
				return {
					accountId: resolvedAccountId,
					...account
				};
			},
			defaultAccountId: (cfg) => resolveDefaultTwitchAccountId(cfg),
			isConfigured: (_account, cfg) => resolveTwitchAccountContext(cfg).configured,
			isEnabled: (account) => account?.enabled !== false,
			describeAccount: (account) => account ? describeAccountSnapshot({
				account,
				configured: isAccountConfigured(account, account.accessToken)
			}) : {
				accountId: DEFAULT_ACCOUNT_ID,
				enabled: false,
				configured: false
			}
		},
		actions: twitchMessageActions,
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind, runtime }) => {
			const account = getAccountConfig(cfg, accountId ?? resolveDefaultTwitchAccountId(cfg));
			if (!account) return inputs.map((input) => ({
				input,
				resolved: false,
				note: "account not configured"
			}));
			return await resolveTwitchTargets(inputs, account, kind, {
				info: (msg) => runtime.log(msg),
				warn: (msg) => runtime.log(msg),
				error: (msg) => runtime.error(msg),
				debug: (msg) => runtime.log(msg)
			});
		} },
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot),
			probeAccount: async ({ account, timeoutMs }) => await probeTwitch(account, timeoutMs),
			collectStatusIssues: collectTwitchStatusIssues,
			resolveAccountSnapshot: ({ account, cfg }) => {
				const resolvedAccountId = account.accountId || resolveTwitchSnapshotAccountId(cfg, account);
				const { configured } = resolveTwitchAccountContext(cfg, resolvedAccountId);
				return {
					accountId: resolvedAccountId,
					enabled: account.enabled !== false,
					configured
				};
			}
		}),
		gateway: {
			startAccount: async (ctx) => {
				const account = ctx.account;
				const accountId = ctx.accountId;
				ctx.setStatus?.({
					accountId,
					running: true,
					lastStartAt: Date.now(),
					lastError: null
				});
				ctx.log?.info(`Starting Twitch connection for ${account.username}`);
				const { monitorTwitchProvider } = await import("./monitor-KFCuPMyP.js");
				await monitorTwitchProvider({
					account,
					accountId,
					config: ctx.cfg,
					runtime: ctx.runtime,
					abortSignal: ctx.abortSignal
				});
			},
			stopAccount: async (ctx) => {
				const account = ctx.account;
				const accountId = ctx.accountId;
				await removeClientManager(accountId);
				ctx.setStatus?.({
					accountId,
					running: false,
					lastStopAt: Date.now()
				});
				ctx.log?.info(`Stopped Twitch connection for ${account.username}`);
			}
		}
	}
});
//#endregion
//#region extensions/twitch/src/runtime.ts
const { setRuntime: setTwitchRuntime, getRuntime: getTwitchRuntime } = createPluginRuntimeStore("Twitch runtime not initialized");
//#endregion
export { getOrCreateClientManager as a, stripMarkdownForTwitch as i, setTwitchRuntime as n, twitchPlugin as r, getTwitchRuntime as t };
