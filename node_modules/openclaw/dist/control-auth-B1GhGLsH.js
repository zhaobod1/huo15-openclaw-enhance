import { a as loadConfig } from "./io-CS2J_l4V.js";
import { o as resolveGatewayAuth } from "./auth-D6Uk4TMd.js";
import "./browser-config-runtime-CXZjFS8D.js";
import { n as ensureGatewayStartupAuth } from "./browser-node-runtime-BWVBEZlG.js";
//#region extensions/browser/src/browser/control-auth.ts
function resolveBrowserControlAuth(cfg, env = process.env) {
	const auth = resolveGatewayAuth({
		authConfig: cfg?.gateway?.auth,
		env,
		tailscaleMode: cfg?.gateway?.tailscale?.mode
	});
	const token = typeof auth.token === "string" ? auth.token.trim() : "";
	const password = typeof auth.password === "string" ? auth.password.trim() : "";
	return {
		token: token || void 0,
		password: password || void 0
	};
}
function shouldAutoGenerateBrowserAuth(env) {
	if ((env.NODE_ENV ?? "").trim().toLowerCase() === "test") return false;
	const vitest = (env.VITEST ?? "").trim().toLowerCase();
	if (vitest && vitest !== "0" && vitest !== "false" && vitest !== "off") return false;
	return true;
}
async function ensureBrowserControlAuth(params) {
	const env = params.env ?? process.env;
	const auth = resolveBrowserControlAuth(params.cfg, env);
	if (auth.token || auth.password) return { auth };
	if (!shouldAutoGenerateBrowserAuth(env)) return { auth };
	if (params.cfg.gateway?.auth?.mode === "password") return { auth };
	if (params.cfg.gateway?.auth?.mode === "none") return { auth };
	if (params.cfg.gateway?.auth?.mode === "trusted-proxy") return { auth };
	const latestCfg = loadConfig();
	const latestAuth = resolveBrowserControlAuth(latestCfg, env);
	if (latestAuth.token || latestAuth.password) return { auth: latestAuth };
	if (latestCfg.gateway?.auth?.mode === "password") return { auth: latestAuth };
	if (latestCfg.gateway?.auth?.mode === "none") return { auth: latestAuth };
	if (latestCfg.gateway?.auth?.mode === "trusted-proxy") return { auth: latestAuth };
	const ensured = await ensureGatewayStartupAuth({
		cfg: latestCfg,
		env,
		persist: true
	});
	return {
		auth: {
			token: ensured.auth.token,
			password: ensured.auth.password
		},
		generatedToken: ensured.generatedToken
	};
}
//#endregion
export { resolveBrowserControlAuth as n, ensureBrowserControlAuth as t };
