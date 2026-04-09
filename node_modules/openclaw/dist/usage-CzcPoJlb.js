//#region src/agents/usage.ts
function makeZeroUsageSnapshot() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0
		}
	};
}
const asFiniteNumber = (value) => {
	if (typeof value !== "number") return;
	if (!Number.isFinite(value)) return;
	return value;
};
function hasNonzeroUsage(usage) {
	if (!usage) return false;
	return [
		usage.input,
		usage.output,
		usage.cacheRead,
		usage.cacheWrite,
		usage.total
	].some((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
}
function normalizeUsage(raw) {
	if (!raw) return;
	const rawInput = asFiniteNumber(raw.input ?? raw.inputTokens ?? raw.input_tokens ?? raw.promptTokens ?? raw.prompt_tokens);
	const input = rawInput !== void 0 && rawInput < 0 ? 0 : rawInput;
	const output = asFiniteNumber(raw.output ?? raw.outputTokens ?? raw.output_tokens ?? raw.completionTokens ?? raw.completion_tokens);
	const cacheRead = asFiniteNumber(raw.cacheRead ?? raw.cache_read ?? raw.cache_read_input_tokens ?? raw.cached_tokens ?? raw.prompt_tokens_details?.cached_tokens);
	const cacheWrite = asFiniteNumber(raw.cacheWrite ?? raw.cache_write ?? raw.cache_creation_input_tokens);
	const total = asFiniteNumber(raw.total ?? raw.totalTokens ?? raw.total_tokens);
	if (input === void 0 && output === void 0 && cacheRead === void 0 && cacheWrite === void 0 && total === void 0) return;
	return {
		input,
		output,
		cacheRead,
		cacheWrite,
		total
	};
}
function derivePromptTokens(usage) {
	if (!usage) return;
	const input = usage.input ?? 0;
	const cacheRead = usage.cacheRead ?? 0;
	const cacheWrite = usage.cacheWrite ?? 0;
	const sum = input + cacheRead + cacheWrite;
	return sum > 0 ? sum : void 0;
}
function deriveSessionTotalTokens(params) {
	const promptOverride = params.promptTokens;
	const hasPromptOverride = typeof promptOverride === "number" && Number.isFinite(promptOverride) && promptOverride > 0;
	const usage = params.usage;
	if (!usage && !hasPromptOverride) return;
	const promptTokens = hasPromptOverride ? promptOverride : derivePromptTokens({
		input: usage?.input,
		cacheRead: usage?.cacheRead,
		cacheWrite: usage?.cacheWrite
	});
	if (!(typeof promptTokens === "number") || !Number.isFinite(promptTokens) || promptTokens <= 0) return;
	return promptTokens;
}
//#endregion
export { normalizeUsage as a, makeZeroUsageSnapshot as i, deriveSessionTotalTokens as n, hasNonzeroUsage as r, derivePromptTokens as t };
