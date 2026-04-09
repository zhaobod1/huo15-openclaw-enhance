import { o as resolveDiscordAccount } from "./accounts-0gXQeT93.js";
import { n as listThreadBindingsBySessionKey, s as unbindThreadBindingsBySessionKey, t as autoBindSpawnedDiscordSubagent } from "./thread-bindings-DdQwxMdt.js";
//#region extensions/discord/src/subagent-hooks.ts
function summarizeError(err) {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	return "error";
}
function normalizeThreadBindingTargetKind(raw) {
	const normalized = raw?.trim().toLowerCase();
	if (normalized === "subagent" || normalized === "acp") return normalized;
}
function resolveThreadBindingFlags(api, accountId) {
	const account = resolveDiscordAccount({
		cfg: api.config,
		accountId
	});
	const baseThreadBindings = api.config.channels?.discord?.threadBindings;
	const accountThreadBindings = api.config.channels?.discord?.accounts?.[account.accountId]?.threadBindings;
	return {
		enabled: accountThreadBindings?.enabled ?? baseThreadBindings?.enabled ?? api.config.session?.threadBindings?.enabled ?? true,
		spawnSubagentSessions: accountThreadBindings?.spawnSubagentSessions ?? baseThreadBindings?.spawnSubagentSessions ?? false
	};
}
async function handleDiscordSubagentSpawning(api, event) {
	if (!event.threadRequested) return;
	if (event.requester?.channel?.trim().toLowerCase() !== "discord") return;
	const threadBindingFlags = resolveThreadBindingFlags(api, event.requester?.accountId);
	if (!threadBindingFlags.enabled) return {
		status: "error",
		error: "Discord thread bindings are disabled (set channels.discord.threadBindings.enabled=true to override for this account, or session.threadBindings.enabled=true globally)."
	};
	if (!threadBindingFlags.spawnSubagentSessions) return {
		status: "error",
		error: "Discord thread-bound subagent spawns are disabled for this account (set channels.discord.threadBindings.spawnSubagentSessions=true to enable)."
	};
	try {
		const agentId = event.agentId?.trim() || "subagent";
		if (!await autoBindSpawnedDiscordSubagent({
			accountId: event.requester?.accountId,
			channel: event.requester?.channel,
			to: event.requester?.to,
			threadId: event.requester?.threadId,
			childSessionKey: event.childSessionKey,
			agentId,
			label: event.label,
			boundBy: "system"
		})) return {
			status: "error",
			error: "Unable to create or bind a Discord thread for this subagent session. Session mode is unavailable for this target."
		};
		return {
			status: "ok",
			threadBindingReady: true
		};
	} catch (err) {
		return {
			status: "error",
			error: `Discord thread bind failed: ${summarizeError(err)}`
		};
	}
}
function handleDiscordSubagentEnded(event) {
	unbindThreadBindingsBySessionKey({
		targetSessionKey: event.targetSessionKey,
		accountId: event.accountId,
		targetKind: normalizeThreadBindingTargetKind(event.targetKind),
		reason: event.reason,
		sendFarewell: event.sendFarewell
	});
}
function handleDiscordSubagentDeliveryTarget(event) {
	if (!event.expectsCompletionMessage) return;
	if (event.requesterOrigin?.channel?.trim().toLowerCase() !== "discord") return;
	const requesterAccountId = event.requesterOrigin?.accountId?.trim();
	const requesterThreadId = event.requesterOrigin?.threadId != null && event.requesterOrigin.threadId !== "" ? String(event.requesterOrigin.threadId).trim() : "";
	const bindings = listThreadBindingsBySessionKey({
		targetSessionKey: event.childSessionKey,
		...requesterAccountId ? { accountId: requesterAccountId } : {},
		targetKind: "subagent"
	});
	if (bindings.length === 0) return;
	let binding;
	if (requesterThreadId) binding = bindings.find((entry) => {
		if (entry.threadId !== requesterThreadId) return false;
		if (requesterAccountId && entry.accountId !== requesterAccountId) return false;
		return true;
	});
	if (!binding && bindings.length === 1) binding = bindings[0];
	if (!binding) return;
	return { origin: {
		channel: "discord",
		accountId: binding.accountId,
		to: `channel:${binding.threadId}`,
		threadId: binding.threadId
	} };
}
//#endregion
export { handleDiscordSubagentEnded as n, handleDiscordSubagentSpawning as r, handleDiscordSubagentDeliveryTarget as t };
