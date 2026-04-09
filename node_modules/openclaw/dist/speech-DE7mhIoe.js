import "./provider-registry-CHP3aTWp.js";
import "./directives-eH6Q5LdA.js";
import { rmSync } from "node:fs";
//#region src/tts/provider-error-utils.ts
function trimToUndefined(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function asObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function truncateErrorDetail(detail, limit = 220) {
	return detail.length <= limit ? detail : `${detail.slice(0, limit - 1)}…`;
}
async function readResponseTextLimited(response, limitBytes = 16 * 1024) {
	if (limitBytes <= 0) return "";
	const reader = response.body?.getReader();
	if (!reader) return "";
	const decoder = new TextDecoder();
	let total = 0;
	let text = "";
	let reachedLimit = false;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			if (!value || value.byteLength === 0) continue;
			const remaining = limitBytes - total;
			if (remaining <= 0) {
				reachedLimit = true;
				break;
			}
			const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
			total += chunk.byteLength;
			text += decoder.decode(chunk, { stream: true });
			if (total >= limitBytes) {
				reachedLimit = true;
				break;
			}
		}
		text += decoder.decode();
	} finally {
		if (reachedLimit) await reader.cancel().catch(() => {});
	}
	return text;
}
//#endregion
//#region src/plugin-sdk/speech.ts
const TEMP_FILE_CLEANUP_DELAY_MS = 300 * 1e3;
function requireInRange(value, min, max, label) {
	if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}`);
}
function normalizeLanguageCode(code) {
	const trimmed = code?.trim();
	if (!trimmed) return;
	const normalized = trimmed.toLowerCase();
	if (!/^[a-z]{2}$/.test(normalized)) throw new Error("languageCode must be a 2-letter ISO 639-1 code (e.g. en, de, fr)");
	return normalized;
}
function normalizeApplyTextNormalization(mode) {
	const trimmed = mode?.trim();
	if (!trimmed) return;
	const normalized = trimmed.toLowerCase();
	if (normalized === "auto" || normalized === "on" || normalized === "off") return normalized;
	throw new Error("applyTextNormalization must be one of: auto, on, off");
}
function normalizeSeed(seed) {
	if (seed == null) return;
	const next = Math.floor(seed);
	if (!Number.isFinite(next) || next < 0 || next > 4294967295) throw new Error("seed must be between 0 and 4294967295");
	return next;
}
function scheduleCleanup(tempDir, delayMs = TEMP_FILE_CLEANUP_DELAY_MS) {
	setTimeout(() => {
		try {
			rmSync(tempDir, {
				recursive: true,
				force: true
			});
		} catch {}
	}, delayMs).unref();
}
//#endregion
export { scheduleCleanup as a, trimToUndefined as c, requireInRange as i, truncateErrorDetail as l, normalizeLanguageCode as n, asObject as o, normalizeSeed as r, readResponseTextLimited as s, normalizeApplyTextNormalization as t };
