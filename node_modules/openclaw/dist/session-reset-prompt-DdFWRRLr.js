import { t as appendCronStyleCurrentTimeLine } from "./current-time-C1zXvUcB.js";
//#region src/auto-reply/reply/session-reset-prompt.ts
const BARE_SESSION_RESET_PROMPT_BASE = "A new session was started via /new or /reset. Run your Session Startup sequence - read the required files before responding to the user. Then greet the user in your configured persona, if one is provided. Be yourself - use your defined voice, mannerisms, and mood. Keep it to 1-3 sentences and ask what they want to do. If the runtime model differs from default_model in the system prompt, mention the default model. Do not mention internal steps, files, tools, or reasoning.";
/**
* Build the bare session reset prompt, appending the current date/time so agents
* know which daily memory files to read during their Session Startup sequence.
* Without this, agents on /new or /reset guess the date from their training cutoff.
*/
function buildBareSessionResetPrompt(cfg, nowMs) {
	return appendCronStyleCurrentTimeLine(BARE_SESSION_RESET_PROMPT_BASE, cfg ?? {}, nowMs ?? Date.now());
}
//#endregion
export { buildBareSessionResetPrompt as t };
