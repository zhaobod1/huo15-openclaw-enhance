import { i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { u as secretRefKey } from "./ref-contract-ho6SSF_R.js";
import { i as isRecord, r as isNonEmptyString } from "./shared-BTjsck-6.js";
//#region src/secrets/secret-value.ts
function isExpectedResolvedSecretValue(value, expected) {
	if (expected === "string") return isNonEmptyString(value);
	return isNonEmptyString(value) || isRecord(value);
}
function hasConfiguredPlaintextSecretValue(value, expected) {
	if (expected === "string") return isNonEmptyString(value);
	return isNonEmptyString(value) || isRecord(value) && Object.keys(value).length > 0;
}
function assertExpectedResolvedSecretValue(params) {
	if (!isExpectedResolvedSecretValue(params.value, params.expected)) throw new Error(params.errorMessage);
}
//#endregion
//#region src/secrets/runtime-shared.ts
function createResolverContext(params) {
	return {
		sourceConfig: params.sourceConfig,
		env: params.env,
		cache: {},
		warnings: [],
		warningKeys: /* @__PURE__ */ new Set(),
		assignments: []
	};
}
function pushAssignment(context, assignment) {
	context.assignments.push(assignment);
}
function pushWarning(context, warning) {
	const warningKey = `${warning.code}:${warning.path}:${warning.message}`;
	if (context.warningKeys.has(warningKey)) return;
	context.warningKeys.add(warningKey);
	context.warnings.push(warning);
}
function pushInactiveSurfaceWarning(params) {
	pushWarning(params.context, {
		code: "SECRETS_REF_IGNORED_INACTIVE_SURFACE",
		path: params.path,
		message: params.details && params.details.trim().length > 0 ? `${params.path}: ${params.details}` : `${params.path}: secret ref is configured on an inactive surface; skipping resolution until it becomes active.`
	});
}
function collectSecretInputAssignment(params) {
	const ref = coerceSecretRef(params.value, params.defaults);
	if (!ref) return;
	if (params.active === false) {
		pushInactiveSurfaceWarning({
			context: params.context,
			path: params.path,
			details: params.inactiveReason
		});
		return;
	}
	pushAssignment(params.context, {
		ref,
		path: params.path,
		expected: params.expected,
		apply: params.apply
	});
}
function applyResolvedAssignments(params) {
	for (const assignment of params.assignments) {
		const key = secretRefKey(assignment.ref);
		if (!params.resolved.has(key)) throw new Error(`Secret reference "${key}" resolved to no value.`);
		const value = params.resolved.get(key);
		assertExpectedResolvedSecretValue({
			value,
			expected: assignment.expected,
			errorMessage: assignment.expected === "string" ? `${assignment.path} resolved to a non-string or empty value.` : `${assignment.path} resolved to an unsupported value type.`
		});
		assignment.apply(value);
	}
}
function hasOwnProperty(record, key) {
	return Object.prototype.hasOwnProperty.call(record, key);
}
function isEnabledFlag(value) {
	if (!isRecord(value)) return true;
	return value.enabled !== false;
}
function isChannelAccountEffectivelyEnabled(channel, account) {
	return isEnabledFlag(channel) && isEnabledFlag(account);
}
//#endregion
//#region src/secrets/runtime-config-collectors-tts.ts
function collectProviderApiKeyAssignment(params) {
	collectSecretInputAssignment({
		value: params.providerConfig.apiKey,
		path: `${params.pathPrefix}.providers.${params.providerId}.apiKey`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: params.active,
		inactiveReason: params.inactiveReason,
		apply: (value) => {
			params.providerConfig.apiKey = value;
		}
	});
}
function collectTtsApiKeyAssignments(params) {
	const providers = params.tts.providers;
	if (isRecord(providers)) {
		for (const [providerId, providerConfig] of Object.entries(providers)) {
			if (!isRecord(providerConfig)) continue;
			collectProviderApiKeyAssignment({
				providerId,
				providerConfig,
				pathPrefix: params.pathPrefix,
				defaults: params.defaults,
				context: params.context,
				active: params.active,
				inactiveReason: params.inactiveReason
			});
		}
		return;
	}
}
//#endregion
export { hasOwnProperty as a, pushAssignment as c, assertExpectedResolvedSecretValue as d, hasConfiguredPlaintextSecretValue as f, createResolverContext as i, pushInactiveSurfaceWarning as l, applyResolvedAssignments as n, isChannelAccountEffectivelyEnabled as o, isExpectedResolvedSecretValue as p, collectSecretInputAssignment as r, isEnabledFlag as s, collectTtsApiKeyAssignments as t, pushWarning as u };
