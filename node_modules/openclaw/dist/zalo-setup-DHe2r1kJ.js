import { a as loadBundledPluginPublicSurfaceModuleSync, n as createLazyFacadeObjectValue } from "./facade-runtime-Bv3MxT2V.js";
//#region src/plugin-sdk/zalo-setup.ts
function loadFacadeModule() {
	return loadBundledPluginPublicSurfaceModuleSync({
		dirName: "zalo",
		artifactBasename: "setup-api.js"
	});
}
const evaluateZaloGroupAccess = ((...args) => loadFacadeModule()["evaluateZaloGroupAccess"](...args));
const resolveZaloRuntimeGroupPolicy = ((...args) => loadFacadeModule()["resolveZaloRuntimeGroupPolicy"](...args));
const zaloSetupAdapter = createLazyFacadeObjectValue(() => loadFacadeModule()["zaloSetupAdapter"]);
const zaloSetupWizard = createLazyFacadeObjectValue(() => loadFacadeModule()["zaloSetupWizard"]);
//#endregion
export { zaloSetupWizard as i, resolveZaloRuntimeGroupPolicy as n, zaloSetupAdapter as r, evaluateZaloGroupAccess as t };
