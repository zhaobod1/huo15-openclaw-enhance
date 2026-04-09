import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { r as theme } from "./theme-BeexRN7S.js";
import { t as registerQrCli } from "./qr-cli-ae7q27-W.js";
//#region src/cli/clawbot-cli.ts
function registerClawbotCli(program) {
	registerQrCli(program.command("clawbot").description("Legacy clawbot command aliases").addHelpText("after", () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/clawbot", "docs.openclaw.ai/cli/clawbot")}\n`));
}
//#endregion
export { registerClawbotCli };
