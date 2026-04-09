import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { M as resolveBrowserConfig, _ as createBrowserRuntimeState, g as isDefaultBrowserPluginEnabled, r as registerBrowserRoutes, v as stopBrowserRuntime, y as createBrowserRouteContext } from "./client-fetch-Dm_m6F1E.js";
import { n as resolveBrowserControlAuth, t as ensureBrowserControlAuth } from "./control-auth-B1GhGLsH.js";
import { n as installBrowserCommonMiddleware, t as installBrowserAuthMiddleware } from "./server-middleware-C4-W2lNo.js";
import express from "express";
//#region extensions/browser/src/server.ts
let state = null;
const logServer = createSubsystemLogger("browser").child("server");
async function startBrowserControlServerFromConfig() {
	if (state) return state;
	const cfg = loadConfig();
	if (!isDefaultBrowserPluginEnabled(cfg)) return null;
	const resolved = resolveBrowserConfig(cfg.browser, cfg);
	if (!resolved.enabled) return null;
	let browserAuth = resolveBrowserControlAuth(cfg);
	let browserAuthBootstrapFailed = false;
	try {
		const ensured = await ensureBrowserControlAuth({ cfg });
		browserAuth = ensured.auth;
		if (ensured.generatedToken) logServer.info("No browser auth configured; generated gateway.auth.token automatically.");
	} catch (err) {
		logServer.warn(`failed to auto-configure browser auth: ${String(err)}`);
		browserAuthBootstrapFailed = true;
	}
	if (browserAuthBootstrapFailed && !browserAuth.token && !browserAuth.password) {
		logServer.error("browser control startup aborted: authentication bootstrap failed and no fallback auth is configured.");
		return null;
	}
	const app = express();
	installBrowserCommonMiddleware(app);
	installBrowserAuthMiddleware(app, browserAuth);
	registerBrowserRoutes(app, createBrowserRouteContext({
		getState: () => state,
		refreshConfigFromDisk: true
	}));
	const port = resolved.controlPort;
	const server = await new Promise((resolve, reject) => {
		const s = app.listen(port, "127.0.0.1", () => resolve(s));
		s.once("error", reject);
	}).catch((err) => {
		logServer.error(`openclaw browser server failed to bind 127.0.0.1:${port}: ${String(err)}`);
		return null;
	});
	if (!server) return null;
	state = await createBrowserRuntimeState({
		server,
		port,
		resolved,
		onWarn: (message) => logServer.warn(message)
	});
	const authMode = browserAuth.token ? "token" : browserAuth.password ? "password" : "off";
	logServer.info(`Browser control listening on http://127.0.0.1:${port}/ (auth=${authMode})`);
	return state;
}
async function stopBrowserControlServer() {
	await stopBrowserRuntime({
		current: state,
		getState: () => state,
		clearState: () => {
			state = null;
		},
		closeServer: true,
		onWarn: (message) => logServer.warn(message)
	});
}
//#endregion
export { startBrowserControlServerFromConfig, stopBrowserControlServer };
