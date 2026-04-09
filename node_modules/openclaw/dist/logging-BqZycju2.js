import { a as displayPath } from "./utils-ms6h9yny.js";
import { r as createConfigIO } from "./io-CS2J_l4V.js";
//#region src/config/logging.ts
function formatConfigPath(path = createConfigIO().configPath) {
	return displayPath(path);
}
function logConfigUpdated(runtime, opts = {}) {
	const path = formatConfigPath(opts.path ?? createConfigIO().configPath);
	const suffix = opts.suffix ? ` ${opts.suffix}` : "";
	runtime.log(`Updated ${path}${suffix}`);
}
//#endregion
export { logConfigUpdated as n, formatConfigPath as t };
