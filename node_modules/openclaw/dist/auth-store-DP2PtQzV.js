import { i as getChildLogger } from "./logger-C-bijuBQ.js";
import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { m as resolveUserPath, u as normalizeE164 } from "./utils-ms6h9yny.js";
import { h as resolveOAuthDir } from "./paths-yyDPxM31.js";
import { g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { n as info, o as success } from "./globals-B43CpcZo.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import "./routing-DdBDhOmH.js";
import "./runtime-env-BLYCS7ta.js";
import "./cli-runtime-BFcZCBi1.js";
import "./state-paths-C-NTaOfx.js";
import { n as resolveWebCredsBackupPath, r as resolveWebCredsPath } from "./creds-files-7VMSa4da.js";
import { r as jidToE164 } from "./text-runtime-DeiM8W1E.js";
import fs from "node:fs";
import path from "node:path";
import fs$1 from "node:fs/promises";
//#region extensions/whatsapp/src/identity.ts
const WHATSAPP_LID_RE = /@(lid|hosted\.lid)$/i;
function normalizeDeviceScopedJid(jid) {
	return jid ? jid.replace(/:\d+/, "") : null;
}
function isLidJid(jid) {
	return Boolean(jid && WHATSAPP_LID_RE.test(jid));
}
function resolveComparableIdentity(identity, authDir) {
	const rawJid = normalizeDeviceScopedJid(identity?.jid);
	const lid = normalizeDeviceScopedJid(identity?.lid) ?? (isLidJid(rawJid) ? rawJid : null);
	const jid = rawJid && !isLidJid(rawJid) ? rawJid : null;
	const e164 = identity?.e164 != null ? normalizeE164(identity.e164) : (jid ? jidToE164(jid, authDir ? { authDir } : void 0) : null) ?? (lid ? jidToE164(lid, authDir ? { authDir } : void 0) : null);
	return {
		...identity,
		jid,
		lid,
		e164
	};
}
function getComparableIdentityValues(identity) {
	const resolved = resolveComparableIdentity(identity);
	return [
		resolved.e164,
		resolved.jid,
		resolved.lid
	].filter((value) => Boolean(value));
}
function identitiesOverlap(left, right) {
	const leftValues = new Set(getComparableIdentityValues(left));
	if (leftValues.size === 0) return false;
	return getComparableIdentityValues(right).some((value) => leftValues.has(value));
}
function getSenderIdentity(msg, authDir) {
	return resolveComparableIdentity(msg.sender ?? {
		jid: msg.senderJid ?? null,
		e164: msg.senderE164 ?? null,
		name: msg.senderName ?? null
	}, authDir);
}
function getSelfIdentity(msg, authDir) {
	return resolveComparableIdentity(msg.self ?? {
		jid: msg.selfJid ?? null,
		lid: msg.selfLid ?? null,
		e164: msg.selfE164 ?? null
	}, authDir);
}
function getReplyContext(msg, authDir) {
	if (msg.replyTo) return {
		...msg.replyTo,
		sender: resolveComparableIdentity(msg.replyTo.sender, authDir)
	};
	if (!msg.replyToBody) return null;
	return {
		id: msg.replyToId,
		body: msg.replyToBody,
		sender: resolveComparableIdentity({
			jid: msg.replyToSenderJid ?? null,
			e164: msg.replyToSenderE164 ?? null,
			label: msg.replyToSender ?? null
		}, authDir)
	};
}
function getMentionJids(msg) {
	return msg.mentions ?? msg.mentionedJids ?? [];
}
function getMentionIdentities(msg, authDir) {
	return getMentionJids(msg).map((jid) => resolveComparableIdentity({ jid }, authDir));
}
function getPrimaryIdentityId(identity) {
	return identity?.e164 || identity?.jid?.trim() || identity?.lid || null;
}
//#endregion
//#region extensions/whatsapp/src/auth-store.ts
function resolveDefaultWebAuthDir() {
	return path.join(resolveOAuthDir(), "whatsapp", DEFAULT_ACCOUNT_ID);
}
const WA_WEB_AUTH_DIR = resolveDefaultWebAuthDir();
function readCredsJsonRaw(filePath) {
	try {
		if (!fs.existsSync(filePath)) return null;
		const stats = fs.statSync(filePath);
		if (!stats.isFile() || stats.size <= 1) return null;
		return fs.readFileSync(filePath, "utf-8");
	} catch {
		return null;
	}
}
function maybeRestoreCredsFromBackup(authDir) {
	const logger = getChildLogger({ module: "web-session" });
	try {
		const credsPath = resolveWebCredsPath(authDir);
		const backupPath = resolveWebCredsBackupPath(authDir);
		const raw = readCredsJsonRaw(credsPath);
		if (raw) {
			JSON.parse(raw);
			return;
		}
		const backupRaw = readCredsJsonRaw(backupPath);
		if (!backupRaw) return;
		JSON.parse(backupRaw);
		fs.copyFileSync(backupPath, credsPath);
		try {
			fs.chmodSync(credsPath, 384);
		} catch {}
		logger.warn({ credsPath }, "restored corrupted WhatsApp creds.json from backup");
	} catch {}
}
async function webAuthExists(authDir = resolveDefaultWebAuthDir()) {
	const resolvedAuthDir = resolveUserPath(authDir);
	maybeRestoreCredsFromBackup(resolvedAuthDir);
	const credsPath = resolveWebCredsPath(resolvedAuthDir);
	try {
		await fs$1.access(resolvedAuthDir);
	} catch {
		return false;
	}
	try {
		const stats = await fs$1.stat(credsPath);
		if (!stats.isFile() || stats.size <= 1) return false;
		const raw = await fs$1.readFile(credsPath, "utf-8");
		JSON.parse(raw);
		return true;
	} catch {
		return false;
	}
}
async function clearLegacyBaileysAuthState(authDir) {
	const entries = await fs$1.readdir(authDir, { withFileTypes: true });
	const shouldDelete = (name) => {
		if (name === "oauth.json") return false;
		if (name === "creds.json" || name === "creds.json.bak") return true;
		if (!name.endsWith(".json")) return false;
		return /^(app-state-sync|session|sender-key|pre-key)-/.test(name);
	};
	await Promise.all(entries.map(async (entry) => {
		if (!entry.isFile()) return;
		if (!shouldDelete(entry.name)) return;
		await fs$1.rm(path.join(authDir, entry.name), { force: true });
	}));
}
async function logoutWeb(params) {
	const runtime = params.runtime ?? defaultRuntime;
	const resolvedAuthDir = resolveUserPath(params.authDir ?? resolveDefaultWebAuthDir());
	if (!await webAuthExists(resolvedAuthDir)) {
		runtime.log(info("No WhatsApp Web session found; nothing to delete."));
		return false;
	}
	if (params.isLegacyAuthDir) await clearLegacyBaileysAuthState(resolvedAuthDir);
	else await fs$1.rm(resolvedAuthDir, {
		recursive: true,
		force: true
	});
	runtime.log(success("Cleared WhatsApp Web credentials."));
	return true;
}
function readWebSelfId(authDir = resolveDefaultWebAuthDir()) {
	try {
		const credsPath = resolveWebCredsPath(resolveUserPath(authDir));
		if (!fs.existsSync(credsPath)) return {
			e164: null,
			jid: null,
			lid: null
		};
		const raw = fs.readFileSync(credsPath, "utf-8");
		const parsed = JSON.parse(raw);
		const identity = resolveComparableIdentity({
			jid: parsed?.me?.id ?? null,
			lid: parsed?.me?.lid ?? null
		}, authDir);
		return {
			e164: identity.e164 ?? null,
			jid: identity.jid ?? null,
			lid: identity.lid ?? null
		};
	} catch {
		return {
			e164: null,
			jid: null,
			lid: null
		};
	}
}
async function readWebSelfIdentity(authDir = resolveDefaultWebAuthDir(), fallback) {
	const resolvedAuthDir = resolveUserPath(authDir);
	maybeRestoreCredsFromBackup(resolvedAuthDir);
	try {
		const raw = await fs$1.readFile(resolveWebCredsPath(resolvedAuthDir), "utf-8");
		const parsed = JSON.parse(raw);
		return resolveComparableIdentity({
			jid: parsed?.me?.id ?? null,
			lid: parsed?.me?.lid ?? null
		}, resolvedAuthDir);
	} catch {
		return resolveComparableIdentity({
			jid: fallback?.id ?? null,
			lid: fallback?.lid ?? null
		}, resolvedAuthDir);
	}
}
/**
* Return the age (in milliseconds) of the cached WhatsApp web auth state, or null when missing.
* Helpful for heartbeats/observability to spot stale credentials.
*/
function getWebAuthAgeMs(authDir = resolveDefaultWebAuthDir()) {
	try {
		const stats = fs.statSync(resolveWebCredsPath(resolveUserPath(authDir)));
		return Date.now() - stats.mtimeMs;
	} catch {
		return null;
	}
}
function logWebSelfId(authDir = resolveDefaultWebAuthDir(), runtime = defaultRuntime, includeChannelPrefix = false) {
	const { e164, jid, lid } = readWebSelfId(authDir);
	const parts = [jid ? `jid ${jid}` : null, lid ? `lid ${lid}` : null].filter((value) => Boolean(value));
	const details = e164 || parts.length > 0 ? `${e164 ?? "unknown"}${parts.length > 0 ? ` (${parts.join(", ")})` : ""}` : "unknown";
	const prefix = includeChannelPrefix ? "Web Channel: " : "";
	runtime.log(info(`${prefix}${details}`));
}
async function pickWebChannel(pref, authDir = resolveDefaultWebAuthDir()) {
	const choice = pref === "auto" ? "web" : pref;
	if (!await webAuthExists(authDir)) throw new Error(`No WhatsApp Web session found. Run \`${formatCliCommand("openclaw channels login --channel whatsapp --verbose")}\` to link.`);
	return choice;
}
//#endregion
export { getSenderIdentity as _, maybeRestoreCredsFromBackup as a, readWebSelfId as c, webAuthExists as d, getComparableIdentityValues as f, getSelfIdentity as g, getReplyContext as h, logoutWeb as i, readWebSelfIdentity as l, getPrimaryIdentityId as m, getWebAuthAgeMs as n, pickWebChannel as o, getMentionIdentities as p, logWebSelfId as r, readCredsJsonRaw as s, WA_WEB_AUTH_DIR as t, resolveDefaultWebAuthDir as u, identitiesOverlap as v, resolveComparableIdentity as y };
