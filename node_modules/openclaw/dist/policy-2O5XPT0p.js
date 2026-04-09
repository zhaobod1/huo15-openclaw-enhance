import { a as resolveChannelEntryMatchWithFallback, n as buildChannelKeyCandidates, r as normalizeChannelSlug, s as resolveNestedAllowlistDecision } from "./channel-config-DH9ug5w9.js";
import { a as resolveAllowlistMatchSimple } from "./allowlist-match-BwqmzAfd.js";
import { n as isDangerousNameMatchingEnabled } from "./dangerous-name-matching-CMg2IF_2.js";
import { i as resolveToolsBySender } from "./group-policy-D1X7pmp3.js";
import { a as mapAllowlistResolutionInputs } from "./allow-from-DjymPYUA.js";
import { i as evaluateSenderGroupAccessForPolicy } from "./group-access-agsrqQrw.js";
import { a as listChannelsForTeam, o as listTeamsByName, s as normalizeQuery, t as searchGraphUsers, u as resolveGraphToken } from "./graph-users-DW9W2Rla.js";
import "./runtime-api-d_2qEcDh.js";
//#region extensions/msteams/src/resolve-allowlist.ts
function stripProviderPrefix(raw) {
	return raw.replace(/^(msteams|teams):/i, "");
}
function normalizeMSTeamsMessagingTarget(raw) {
	let trimmed = raw.trim();
	if (!trimmed) return;
	trimmed = stripProviderPrefix(trimmed).trim();
	if (/^conversation:/i.test(trimmed)) {
		const id = trimmed.slice(13).trim();
		return id ? `conversation:${id}` : void 0;
	}
	if (/^user:/i.test(trimmed)) {
		const id = trimmed.slice(5).trim();
		return id ? `user:${id}` : void 0;
	}
	return trimmed || void 0;
}
function normalizeMSTeamsUserInput(raw) {
	return stripProviderPrefix(raw).replace(/^(user|conversation):/i, "").trim();
}
function parseMSTeamsConversationId(raw) {
	const trimmed = stripProviderPrefix(raw).trim();
	if (!/^conversation:/i.test(trimmed)) return null;
	return trimmed.slice(13).trim();
}
function normalizeMSTeamsTeamKey(raw) {
	return stripProviderPrefix(raw).replace(/^team:/i, "").trim() || void 0;
}
function normalizeMSTeamsChannelKey(raw) {
	return (raw?.trim().replace(/^#/, "").trim() ?? "") || void 0;
}
function parseMSTeamsTeamChannelInput(raw) {
	const trimmed = stripProviderPrefix(raw).trim();
	if (!trimmed) return {};
	const parts = trimmed.split("/");
	const team = normalizeMSTeamsTeamKey(parts[0] ?? "");
	const channel = parts.length > 1 ? normalizeMSTeamsChannelKey(parts.slice(1).join("/")) : void 0;
	return {
		...team ? { team } : {},
		...channel ? { channel } : {}
	};
}
function parseMSTeamsTeamEntry(raw) {
	const { team, channel } = parseMSTeamsTeamChannelInput(raw);
	if (!team) return null;
	return {
		teamKey: team,
		...channel ? { channelKey: channel } : {}
	};
}
async function resolveMSTeamsChannelAllowlist(params) {
	const token = await resolveGraphToken(params.cfg);
	return await mapAllowlistResolutionInputs({
		inputs: params.entries,
		mapInput: async (input) => {
			const { team, channel } = parseMSTeamsTeamChannelInput(input);
			if (!team) return {
				input,
				resolved: false
			};
			const teams = /^[0-9a-fA-F-]{16,}$/.test(team) ? [{
				id: team,
				displayName: team
			}] : await listTeamsByName(token, team);
			if (teams.length === 0) return {
				input,
				resolved: false,
				note: "team not found"
			};
			const teamMatch = teams[0];
			const graphTeamId = teamMatch.id?.trim();
			const teamName = teamMatch.displayName?.trim() || team;
			if (!graphTeamId) return {
				input,
				resolved: false,
				note: "team id missing"
			};
			let teamChannels = [];
			try {
				teamChannels = await listChannelsForTeam(token, graphTeamId);
			} catch {}
			const teamId = teamChannels.find((ch) => ch.displayName?.toLowerCase() === "general")?.id?.trim() || graphTeamId;
			if (!channel) return {
				input,
				resolved: true,
				teamId,
				teamName,
				note: teams.length > 1 ? "multiple teams; chose first" : void 0
			};
			const channelMatch = teamChannels.find((item) => item.id === channel) ?? teamChannels.find((item) => item.displayName?.toLowerCase() === channel.toLowerCase()) ?? teamChannels.find((item) => item.displayName?.toLowerCase().includes(channel.toLowerCase() ?? ""));
			if (!channelMatch?.id) return {
				input,
				resolved: false,
				note: "channel not found"
			};
			return {
				input,
				resolved: true,
				teamId,
				teamName,
				channelId: channelMatch.id,
				channelName: channelMatch.displayName ?? channel,
				note: teamChannels.length > 1 ? "multiple channels; chose first" : void 0
			};
		}
	});
}
async function resolveMSTeamsUserAllowlist(params) {
	const token = await resolveGraphToken(params.cfg);
	return await mapAllowlistResolutionInputs({
		inputs: params.entries,
		mapInput: async (input) => {
			const query = normalizeQuery(normalizeMSTeamsUserInput(input));
			if (!query) return {
				input,
				resolved: false
			};
			if (/^[0-9a-fA-F-]{16,}$/.test(query)) return {
				input,
				resolved: true,
				id: query
			};
			const users = await searchGraphUsers({
				token,
				query,
				top: 10
			});
			const match = users[0];
			if (!match?.id) return {
				input,
				resolved: false
			};
			return {
				input,
				resolved: true,
				id: match.id,
				name: match.displayName ?? void 0,
				note: users.length > 1 ? "multiple matches; chose first" : void 0
			};
		}
	});
}
//#endregion
//#region extensions/msteams/src/policy.ts
function resolveMSTeamsRouteConfig(params) {
	const teamId = params.teamId?.trim();
	const teamName = params.teamName?.trim();
	const conversationId = params.conversationId?.trim();
	const channelName = params.channelName?.trim();
	const teams = params.cfg?.teams ?? {};
	const allowlistConfigured = Object.keys(teams).length > 0;
	const teamMatch = resolveChannelEntryMatchWithFallback({
		entries: teams,
		keys: buildChannelKeyCandidates(teamId, params.allowNameMatching ? teamName : void 0, params.allowNameMatching && teamName ? normalizeChannelSlug(teamName) : void 0),
		wildcardKey: "*",
		normalizeKey: normalizeChannelSlug
	});
	const teamConfig = teamMatch.entry;
	const channels = teamConfig?.channels ?? {};
	const channelAllowlistConfigured = Object.keys(channels).length > 0;
	const channelMatch = resolveChannelEntryMatchWithFallback({
		entries: channels,
		keys: buildChannelKeyCandidates(conversationId, params.allowNameMatching ? channelName : void 0, params.allowNameMatching && channelName ? normalizeChannelSlug(channelName) : void 0),
		wildcardKey: "*",
		normalizeKey: normalizeChannelSlug
	});
	const channelConfig = channelMatch.entry;
	return {
		teamConfig,
		channelConfig,
		allowlistConfigured,
		allowed: resolveNestedAllowlistDecision({
			outerConfigured: allowlistConfigured,
			outerMatched: Boolean(teamConfig),
			innerConfigured: channelAllowlistConfigured,
			innerMatched: Boolean(channelConfig)
		}),
		teamKey: teamMatch.matchKey ?? teamMatch.key,
		channelKey: channelMatch.matchKey ?? channelMatch.key,
		channelMatchKey: channelMatch.matchKey,
		channelMatchSource: channelMatch.matchSource === "direct" || channelMatch.matchSource === "wildcard" ? channelMatch.matchSource : void 0
	};
}
function resolveMSTeamsGroupToolPolicy(params) {
	const cfg = params.cfg.channels?.msteams;
	if (!cfg) return;
	const groupId = params.groupId?.trim();
	const groupChannel = params.groupChannel?.trim();
	const groupSpace = params.groupSpace?.trim();
	const allowNameMatching = isDangerousNameMatchingEnabled(cfg);
	const resolved = resolveMSTeamsRouteConfig({
		cfg,
		teamId: groupSpace,
		teamName: groupSpace,
		conversationId: groupId,
		channelName: groupChannel,
		allowNameMatching
	});
	if (resolved.channelConfig) {
		const senderPolicy = resolveToolsBySender({
			toolsBySender: resolved.channelConfig.toolsBySender,
			senderId: params.senderId,
			senderName: params.senderName,
			senderUsername: params.senderUsername,
			senderE164: params.senderE164
		});
		if (senderPolicy) return senderPolicy;
		if (resolved.channelConfig.tools) return resolved.channelConfig.tools;
		const teamSenderPolicy = resolveToolsBySender({
			toolsBySender: resolved.teamConfig?.toolsBySender,
			senderId: params.senderId,
			senderName: params.senderName,
			senderUsername: params.senderUsername,
			senderE164: params.senderE164
		});
		if (teamSenderPolicy) return teamSenderPolicy;
		return resolved.teamConfig?.tools;
	}
	if (resolved.teamConfig) {
		const teamSenderPolicy = resolveToolsBySender({
			toolsBySender: resolved.teamConfig.toolsBySender,
			senderId: params.senderId,
			senderName: params.senderName,
			senderUsername: params.senderUsername,
			senderE164: params.senderE164
		});
		if (teamSenderPolicy) return teamSenderPolicy;
		if (resolved.teamConfig.tools) return resolved.teamConfig.tools;
	}
	if (!groupId) return;
	const channelCandidates = buildChannelKeyCandidates(groupId, allowNameMatching ? groupChannel : void 0, allowNameMatching && groupChannel ? normalizeChannelSlug(groupChannel) : void 0);
	for (const teamConfig of Object.values(cfg.teams ?? {})) {
		const match = resolveChannelEntryMatchWithFallback({
			entries: teamConfig?.channels ?? {},
			keys: channelCandidates,
			wildcardKey: "*",
			normalizeKey: normalizeChannelSlug
		});
		if (match.entry) {
			const senderPolicy = resolveToolsBySender({
				toolsBySender: match.entry.toolsBySender,
				senderId: params.senderId,
				senderName: params.senderName,
				senderUsername: params.senderUsername,
				senderE164: params.senderE164
			});
			if (senderPolicy) return senderPolicy;
			if (match.entry.tools) return match.entry.tools;
			const teamSenderPolicy = resolveToolsBySender({
				toolsBySender: teamConfig?.toolsBySender,
				senderId: params.senderId,
				senderName: params.senderName,
				senderUsername: params.senderUsername,
				senderE164: params.senderE164
			});
			if (teamSenderPolicy) return teamSenderPolicy;
			return teamConfig?.tools;
		}
	}
}
function resolveMSTeamsAllowlistMatch(params) {
	return resolveAllowlistMatchSimple(params);
}
function resolveMSTeamsReplyPolicy(params) {
	if (params.isDirectMessage) return {
		requireMention: false,
		replyStyle: "thread"
	};
	const requireMention = params.channelConfig?.requireMention ?? params.teamConfig?.requireMention ?? params.globalConfig?.requireMention ?? true;
	return {
		requireMention,
		replyStyle: params.channelConfig?.replyStyle ?? params.teamConfig?.replyStyle ?? params.globalConfig?.replyStyle ?? (requireMention ? "thread" : "top-level")
	};
}
function isMSTeamsGroupAllowed(params) {
	return evaluateSenderGroupAccessForPolicy({
		groupPolicy: params.groupPolicy,
		groupAllowFrom: params.allowFrom.map((entry) => String(entry)),
		senderId: params.senderId,
		isSenderAllowed: () => resolveMSTeamsAllowlistMatch(params).allowed
	}).allowed;
}
//#endregion
export { resolveMSTeamsRouteConfig as a, parseMSTeamsConversationId as c, resolveMSTeamsChannelAllowlist as d, resolveMSTeamsUserAllowlist as f, resolveMSTeamsReplyPolicy as i, parseMSTeamsTeamChannelInput as l, resolveMSTeamsAllowlistMatch as n, normalizeMSTeamsMessagingTarget as o, resolveMSTeamsGroupToolPolicy as r, normalizeMSTeamsUserInput as s, isMSTeamsGroupAllowed as t, parseMSTeamsTeamEntry as u };
