//#region extensions/whatsapp/src/command-policy.ts
const whatsappCommandPolicy = {
	enforceOwnerForCommands: true,
	preferSenderE164ForCommands: true,
	skipWhenConfigEmpty: true
};
//#endregion
//#region extensions/whatsapp/src/group-session-contract.ts
function resolveLegacyGroupSessionKey(ctx) {
	const from = typeof ctx.From === "string" ? ctx.From.trim() : "";
	if (!from || from.includes(":") || !from.toLowerCase().endsWith("@g.us")) return null;
	const normalized = from.toLowerCase();
	return {
		key: `whatsapp:group:${normalized}`,
		channel: "whatsapp",
		id: normalized,
		chatType: "group"
	};
}
//#endregion
//#region extensions/whatsapp/src/session-contract.ts
function extractLegacyWhatsAppGroupId(key) {
	const trimmed = key.trim();
	if (!trimmed) return null;
	const lower = trimmed.toLowerCase();
	if (trimmed.startsWith("group:")) {
		const id = trimmed.slice(6).trim();
		return id.toLowerCase().includes("@g.us") ? id : null;
	}
	if (!lower.includes("@g.us")) return null;
	if (!trimmed.includes(":")) return trimmed;
	if (lower.startsWith("whatsapp:") && !trimmed.includes(":group:")) return trimmed.slice(9).trim().replace(/^group:/i, "").trim() || null;
	return null;
}
function isLegacyGroupSessionKey(key) {
	return extractLegacyWhatsAppGroupId(key) !== null;
}
function canonicalizeLegacySessionKey(params) {
	const legacyGroupId = extractLegacyWhatsAppGroupId(params.key);
	return legacyGroupId ? `agent:${params.agentId}:whatsapp:group:${legacyGroupId}`.toLowerCase() : null;
}
//#endregion
export { whatsappCommandPolicy as i, isLegacyGroupSessionKey as n, resolveLegacyGroupSessionKey as r, canonicalizeLegacySessionKey as t };
