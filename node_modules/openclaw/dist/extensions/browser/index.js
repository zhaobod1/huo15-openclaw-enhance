import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { o as runBrowserProxyCommand } from "../../core-api-CtQZce5z.js";
import { a as createBrowserTool, i as registerBrowserCli, r as handleBrowserGatewayRequest, t as createBrowserPluginService } from "../../plugin-service-CWlP8CgA.js";
import { t as collectBrowserSecurityAuditFindings } from "../../register.runtime-Bhmbtm_8.js";
//#region extensions/browser/index.ts
var browser_default = definePluginEntry({
	id: "browser",
	name: "Browser",
	description: "Default browser tool plugin",
	reload: { restartPrefixes: ["browser"] },
	nodeHostCommands: [{
		command: "browser.proxy",
		cap: "browser",
		handle: runBrowserProxyCommand
	}],
	securityAuditCollectors: [collectBrowserSecurityAuditFindings],
	register(api) {
		api.registerTool(((ctx) => createBrowserTool({
			sandboxBridgeUrl: ctx.browser?.sandboxBridgeUrl,
			allowHostControl: ctx.browser?.allowHostControl,
			agentSessionKey: ctx.sessionKey
		})));
		api.registerCli(({ program }) => registerBrowserCli(program), { commands: ["browser"] });
		api.registerGatewayMethod("browser.request", handleBrowserGatewayRequest, { scope: "operator.write" });
		api.registerService(createBrowserPluginService());
	}
});
//#endregion
export { browser_default as default };
