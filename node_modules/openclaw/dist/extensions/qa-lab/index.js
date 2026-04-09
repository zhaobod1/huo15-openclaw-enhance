import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import "../../runtime-api-CI17I0md.js";
import { t as registerQaLabCli } from "../../cli-BquXM2Kd.js";
//#region extensions/qa-lab/index.ts
var qa_lab_default = definePluginEntry({
	id: "qa-lab",
	name: "QA Lab",
	description: "Private QA automation harness and debugger UI",
	register(api) {
		api.registerCli(async ({ program }) => {
			registerQaLabCli(program);
		}, { descriptors: [{
			name: "qa",
			description: "Run QA scenarios and launch the private QA debugger UI",
			hasSubcommands: true
		}] });
	}
});
//#endregion
export { qa_lab_default as default };
