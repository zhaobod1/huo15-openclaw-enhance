import { a as hasConfiguredSecretInput } from "./types.secrets-BZdSA8i7.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { c as isPrivateIpAddress } from "./ssrf-BWjc2mcC.js";
import { M as resolveBrowserConfig, N as resolveProfile, Y as redactCdpUrl } from "./client-fetch-Dm_m6F1E.js";
import { n as resolveBrowserControlAuth } from "./control-auth-B1GhGLsH.js";
import "./secret-input-D5U3kuko.js";
import "./setup-tools-DC-2q-4o.js";
import { a as isPrivateNetworkOptInEnabled } from "./ssrf-policy-Cb9w9jMO.js";
import "./core-api-CtQZce5z.js";
import "./plugin-service-CWlP8CgA.js";
//#region extensions/browser/src/security-audit.ts
const BLOCKED_HOSTNAMES = new Set([
	"localhost",
	"localhost.localdomain",
	"metadata.google.internal"
]);
function hasNonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}
function isTrustedPrivateHostname(hostname) {
	const normalized = hostname.trim().toLowerCase();
	return normalized.length > 0 && BLOCKED_HOSTNAMES.has(normalized);
}
function collectBrowserSecurityAuditFindings(ctx) {
	const findings = [];
	let resolved;
	try {
		resolved = resolveBrowserConfig(ctx.config.browser, ctx.config);
	} catch (err) {
		findings.push({
			checkId: "browser.control_invalid_config",
			severity: "warn",
			title: "Browser control config looks invalid",
			detail: String(err),
			remediation: `Fix browser.cdpUrl in ${ctx.configPath} and re-run "${formatCliCommand("openclaw security audit --deep")}".`
		});
		return findings;
	}
	if (!resolved.enabled) return findings;
	const browserAuth = resolveBrowserControlAuth(ctx.config, ctx.env);
	const explicitAuthMode = ctx.config.gateway?.auth?.mode;
	const tokenConfigured = Boolean(browserAuth.token) || hasNonEmptyString(ctx.env.OPENCLAW_GATEWAY_TOKEN) || hasConfiguredSecretInput(ctx.config.gateway?.auth?.token, ctx.config.secrets?.defaults);
	const passwordCanWin = explicitAuthMode === "password" || explicitAuthMode !== "token" && explicitAuthMode !== "none" && explicitAuthMode !== "trusted-proxy" && !tokenConfigured;
	const passwordConfigured = Boolean(browserAuth.password) || passwordCanWin && (hasNonEmptyString(ctx.env.OPENCLAW_GATEWAY_PASSWORD) || hasConfiguredSecretInput(ctx.config.gateway?.auth?.password, ctx.config.secrets?.defaults));
	if (!tokenConfigured && !passwordConfigured) findings.push({
		checkId: "browser.control_no_auth",
		severity: "critical",
		title: "Browser control has no auth",
		detail: "Browser control HTTP routes are enabled but no gateway.auth token/password is configured. Any local process (or SSRF to loopback) can call browser control endpoints.",
		remediation: "Set gateway.auth.token (recommended) or gateway.auth.password so browser control HTTP routes require authentication. Restarting the gateway will auto-generate gateway.auth.token when browser control is enabled."
	});
	for (const name of Object.keys(resolved.profiles)) {
		const profile = resolveProfile(resolved, name);
		if (!profile || profile.cdpIsLoopback) continue;
		let url;
		try {
			url = new URL(profile.cdpUrl);
		} catch {
			continue;
		}
		const redactedCdpUrl = redactCdpUrl(profile.cdpUrl) ?? profile.cdpUrl;
		if (url.protocol === "http:") findings.push({
			checkId: "browser.remote_cdp_http",
			severity: "warn",
			title: "Remote CDP uses HTTP",
			detail: `browser profile "${name}" uses http CDP (${redactedCdpUrl}); this is OK only if it's tailnet-only or behind an encrypted tunnel.`,
			remediation: "Prefer HTTPS/TLS or a tailnet-only endpoint for remote CDP."
		});
		if (isPrivateNetworkOptInEnabled(resolved.ssrfPolicy) && (isTrustedPrivateHostname(url.hostname) || isPrivateIpAddress(url.hostname))) findings.push({
			checkId: "browser.remote_cdp_private_host",
			severity: "warn",
			title: "Remote CDP targets a private/internal host",
			detail: `browser profile "${name}" points at a private/internal CDP host (${redactedCdpUrl}). This is expected for LAN/tailnet/WSL-style setups, but treat it as a trusted-network endpoint.`,
			remediation: "Prefer a tailnet or tunnel for remote CDP. If you want strict blocking, set browser.ssrfPolicy.dangerouslyAllowPrivateNetwork=false and allow only explicit hosts."
		});
	}
	return findings;
}
//#endregion
export { collectBrowserSecurityAuditFindings as t };
