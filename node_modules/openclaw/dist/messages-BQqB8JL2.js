import { a as sendMessageMatrix, f as buildPollResultsSummary, g as isPollStartType, h as isPollEventType, m as formatPollResultsAsText, n as editMessageMatrix, p as formatPollAsText, v as parsePollStartContent, y as resolvePollReferenceEventId } from "./send-DpaTmUoP.js";
import { l as MATRIX_REACTION_EVENT_TYPE } from "./direct-management-Dqq7dvZS.js";
import { i as withResolvedRoomAction } from "./encryption-guidance-D7YZG30i.js";
import { t as isMatrixNotFoundError } from "./errors-DZ7MGpuT.js";
import path from "node:path";
//#region extensions/matrix/src/matrix/poll-summary.ts
function resolveMatrixPollRootEventId(event) {
	if (isPollStartType(event.type)) {
		const eventId = event.event_id?.trim();
		return eventId ? eventId : null;
	}
	return resolvePollReferenceEventId(event.content);
}
async function readAllPollRelations(client, roomId, pollEventId) {
	const relationEvents = [];
	let nextBatch;
	do {
		const page = await client.getRelations(roomId, pollEventId, "m.reference", void 0, { from: nextBatch });
		relationEvents.push(...page.events);
		nextBatch = page.nextBatch ?? void 0;
	} while (nextBatch);
	return relationEvents;
}
async function fetchMatrixPollSnapshot(client, roomId, event) {
	if (!isPollEventType(event.type)) return null;
	const pollEventId = resolveMatrixPollRootEventId(event);
	if (!pollEventId) return null;
	const rootEvent = isPollStartType(event.type) ? event : await client.getEvent(roomId, pollEventId);
	if (!isPollStartType(rootEvent.type)) return null;
	const pollStartContent = rootEvent.content;
	const pollSummary = parsePollStartContent(pollStartContent);
	if (!pollSummary) return null;
	const relationEvents = await readAllPollRelations(client, roomId, pollEventId);
	const pollResults = buildPollResultsSummary({
		pollEventId,
		roomId,
		sender: rootEvent.sender,
		senderName: rootEvent.sender,
		content: pollStartContent,
		relationEvents
	});
	return {
		pollEventId,
		triggerEvent: event,
		rootEvent,
		text: pollResults ? formatPollResultsAsText(pollResults) : formatPollAsText(pollSummary)
	};
}
async function fetchMatrixPollMessageSummary(client, roomId, event) {
	const snapshot = await fetchMatrixPollSnapshot(client, roomId, event);
	if (!snapshot) return null;
	return {
		eventId: snapshot.pollEventId,
		sender: snapshot.rootEvent.sender,
		body: snapshot.text,
		msgtype: "m.text",
		timestamp: snapshot.triggerEvent.origin_server_ts || snapshot.rootEvent.origin_server_ts
	};
}
//#endregion
//#region extensions/matrix/src/matrix/actions/limits.ts
function resolveMatrixActionLimit(raw, fallback) {
	if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
	return Math.max(1, Math.floor(raw));
}
//#endregion
//#region extensions/matrix/src/matrix/media-text.ts
const MATRIX_MEDIA_KINDS = {
	"m.audio": "audio",
	"m.file": "file",
	"m.image": "image",
	"m.sticker": "sticker",
	"m.video": "video"
};
function resolveMatrixMediaKind(msgtype) {
	return MATRIX_MEDIA_KINDS[msgtype ?? ""] ?? null;
}
function resolveMatrixMediaLabel(kind, fallback = "media") {
	return `${kind ?? fallback} attachment`;
}
function formatMatrixAttachmentMarker(params) {
	const label = resolveMatrixMediaLabel(params.kind);
	if (params.tooLarge) return `[matrix ${label} too large]`;
	return params.unavailable ? `[matrix ${label} unavailable]` : `[matrix ${label}]`;
}
function isLikelyBareFilename(text) {
	const trimmed = text.trim();
	if (!trimmed || trimmed.includes("\n") || /\s/.test(trimmed)) return false;
	if (path.basename(trimmed) !== trimmed) return false;
	return path.extname(trimmed).length > 1;
}
function resolveCaptionOrFilename(params) {
	const body = params.body?.trim() ?? "";
	const filename = params.filename?.trim() ?? "";
	if (filename) {
		if (!body || body === filename) return { filename };
		return {
			caption: body,
			filename
		};
	}
	if (!body) return {};
	if (isLikelyBareFilename(body)) return { filename: body };
	return { caption: body };
}
function resolveMatrixMessageAttachment(params) {
	const kind = resolveMatrixMediaKind(params.msgtype);
	if (!kind) return;
	const resolved = resolveCaptionOrFilename(params);
	return {
		kind,
		caption: resolved.caption,
		filename: resolved.filename
	};
}
function resolveMatrixMessageBody(params) {
	const attachment = resolveMatrixMessageAttachment(params);
	if (!attachment) return (params.body?.trim() ?? "") || void 0;
	return attachment.caption;
}
function formatMatrixAttachmentText(params) {
	if (!params.attachment) return;
	return formatMatrixAttachmentMarker({
		kind: params.attachment.kind,
		tooLarge: params.tooLarge,
		unavailable: params.unavailable
	});
}
function formatMatrixMessageText(params) {
	const body = params.body?.trim() ?? "";
	const marker = formatMatrixAttachmentText({
		attachment: params.attachment,
		tooLarge: params.tooLarge,
		unavailable: params.unavailable
	});
	if (!marker) return body || void 0;
	if (!body) return marker;
	return `${body}\n\n${marker}`;
}
function formatMatrixMediaUnavailableText(params) {
	return formatMatrixMessageText({
		body: resolveMatrixMessageBody(params),
		attachment: resolveMatrixMessageAttachment(params),
		unavailable: true
	}) ?? "";
}
function formatMatrixMediaTooLargeText(params) {
	return formatMatrixMessageText({
		body: resolveMatrixMessageBody(params),
		attachment: resolveMatrixMessageAttachment(params),
		tooLarge: true
	}) ?? "";
}
//#endregion
//#region extensions/matrix/src/matrix/actions/types.ts
const EventType = {
	RoomMessage: "m.room.message",
	RoomPinnedEvents: "m.room.pinned_events",
	RoomTopic: "m.room.topic",
	Reaction: MATRIX_REACTION_EVENT_TYPE
};
//#endregion
//#region extensions/matrix/src/matrix/actions/summary.ts
function summarizeMatrixRawEvent(event) {
	const content = event.content;
	const relates = content["m.relates_to"];
	let relType;
	let eventId;
	if (relates) {
		if ("rel_type" in relates) {
			relType = relates.rel_type;
			eventId = relates.event_id;
		} else if ("m.in_reply_to" in relates) eventId = relates["m.in_reply_to"]?.event_id;
	}
	const relatesTo = relType || eventId ? {
		relType,
		eventId
	} : void 0;
	return {
		eventId: event.event_id,
		sender: event.sender,
		body: resolveMatrixMessageBody({
			body: content.body,
			filename: content.filename,
			msgtype: content.msgtype
		}),
		msgtype: content.msgtype,
		attachment: resolveMatrixMessageAttachment({
			body: content.body,
			filename: content.filename,
			msgtype: content.msgtype
		}),
		timestamp: event.origin_server_ts,
		relatesTo
	};
}
async function readPinnedEvents(client, roomId) {
	try {
		return (await client.getRoomStateEvent(roomId, EventType.RoomPinnedEvents, "")).pinned.filter((id) => id.trim().length > 0);
	} catch (err) {
		if (isMatrixNotFoundError(err)) return [];
		throw err;
	}
}
async function fetchEventSummary(client, roomId, eventId) {
	try {
		const raw = await client.getEvent(roomId, eventId);
		if (raw.unsigned?.redacted_because) return null;
		const pollSummary = await fetchMatrixPollMessageSummary(client, roomId, raw);
		if (pollSummary) return pollSummary;
		return summarizeMatrixRawEvent(raw);
	} catch {
		return null;
	}
}
//#endregion
//#region extensions/matrix/src/matrix/actions/messages.ts
async function sendMatrixMessage(to, content, opts = {}) {
	return await sendMessageMatrix(to, content, {
		cfg: opts.cfg,
		mediaUrl: opts.mediaUrl,
		mediaLocalRoots: opts.mediaLocalRoots,
		replyToId: opts.replyToId,
		threadId: opts.threadId,
		audioAsVoice: opts.audioAsVoice,
		accountId: opts.accountId ?? void 0,
		client: opts.client,
		timeoutMs: opts.timeoutMs
	});
}
async function editMatrixMessage(roomId, messageId, content, opts = {}) {
	const trimmed = content.trim();
	if (!trimmed) throw new Error("Matrix edit requires content");
	return { eventId: await editMessageMatrix(roomId, messageId, trimmed, {
		cfg: opts.cfg,
		accountId: opts.accountId ?? void 0,
		client: opts.client,
		timeoutMs: opts.timeoutMs
	}) || null };
}
async function deleteMatrixMessage(roomId, messageId, opts = {}) {
	await withResolvedRoomAction(roomId, opts, async (client, resolvedRoom) => {
		await client.redactEvent(resolvedRoom, messageId, opts.reason);
	});
}
async function readMatrixMessages(roomId, opts = {}) {
	return await withResolvedRoomAction(roomId, opts, async (client, resolvedRoom) => {
		const limit = resolveMatrixActionLimit(opts.limit, 20);
		const token = opts.before?.trim() || opts.after?.trim() || void 0;
		const dir = opts.after ? "f" : "b";
		const res = await client.doRequest("GET", `/_matrix/client/v3/rooms/${encodeURIComponent(resolvedRoom)}/messages`, {
			dir,
			limit,
			from: token
		});
		const hydratedChunk = await client.hydrateEvents(resolvedRoom, res.chunk);
		const seenPollRoots = /* @__PURE__ */ new Set();
		const messages = [];
		for (const event of hydratedChunk) {
			if (event.unsigned?.redacted_because) continue;
			if (event.type === EventType.RoomMessage) {
				messages.push(summarizeMatrixRawEvent(event));
				continue;
			}
			if (!isPollEventType(event.type)) continue;
			const pollRootId = resolveMatrixPollRootEventId(event);
			if (!pollRootId || seenPollRoots.has(pollRootId)) continue;
			seenPollRoots.add(pollRootId);
			const pollSummary = await fetchMatrixPollMessageSummary(client, resolvedRoom, event);
			if (pollSummary) messages.push(pollSummary);
		}
		return {
			messages,
			nextBatch: res.end ?? null,
			prevBatch: res.start ?? null
		};
	});
}
//#endregion
export { fetchEventSummary as a, formatMatrixMediaTooLargeText as c, resolveMatrixMessageAttachment as d, resolveMatrixMessageBody as f, sendMatrixMessage as i, formatMatrixMediaUnavailableText as l, fetchMatrixPollSnapshot as m, editMatrixMessage as n, readPinnedEvents as o, resolveMatrixActionLimit as p, readMatrixMessages as r, EventType as s, deleteMatrixMessage as t, formatMatrixMessageText as u };
