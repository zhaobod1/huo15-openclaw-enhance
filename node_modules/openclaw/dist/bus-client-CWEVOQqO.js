//#region extensions/qa-channel/src/bus-client.ts
async function postJson(baseUrl, path, body, signal) {
	const response = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
		signal
	});
	const payload = await response.json();
	if (!response.ok) {
		const error = typeof payload === "object" && payload && "error" in payload ? payload.error : void 0;
		throw new Error(error || `qa-bus request failed: ${response.status}`);
	}
	return payload;
}
function normalizeQaTarget(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return;
	return trimmed;
}
function parseQaTarget(raw) {
	const normalized = normalizeQaTarget(raw);
	if (!normalized) throw new Error("qa-channel target is required");
	if (normalized.startsWith("thread:")) {
		const rest = normalized.slice(7);
		const slashIndex = rest.indexOf("/");
		if (slashIndex <= 0 || slashIndex === rest.length - 1) throw new Error(`invalid qa-channel thread target: ${normalized}`);
		return {
			chatType: "channel",
			conversationId: rest.slice(0, slashIndex),
			threadId: rest.slice(slashIndex + 1)
		};
	}
	if (normalized.startsWith("channel:")) return {
		chatType: "channel",
		conversationId: normalized.slice(8)
	};
	if (normalized.startsWith("dm:")) return {
		chatType: "direct",
		conversationId: normalized.slice(3)
	};
	return {
		chatType: "direct",
		conversationId: normalized
	};
}
function buildQaTarget(params) {
	if (params.threadId) return `thread:${params.conversationId}/${params.threadId}`;
	return `${params.chatType === "direct" ? "dm" : "channel"}:${params.conversationId}`;
}
async function pollQaBus(params) {
	return await postJson(params.baseUrl, "/v1/poll", {
		accountId: params.accountId,
		cursor: params.cursor,
		timeoutMs: params.timeoutMs
	}, params.signal);
}
async function sendQaBusMessage(params) {
	return await postJson(params.baseUrl, "/v1/outbound/message", params);
}
async function createQaBusThread(params) {
	return await postJson(params.baseUrl, "/v1/actions/thread-create", params);
}
async function reactToQaBusMessage(params) {
	return await postJson(params.baseUrl, "/v1/actions/react", params);
}
async function editQaBusMessage(params) {
	return await postJson(params.baseUrl, "/v1/actions/edit", params);
}
async function deleteQaBusMessage(params) {
	return await postJson(params.baseUrl, "/v1/actions/delete", params);
}
async function readQaBusMessage(params) {
	return await postJson(params.baseUrl, "/v1/actions/read", params);
}
async function searchQaBusMessages(params) {
	return await postJson(params.baseUrl, "/v1/actions/search", params.input);
}
async function injectQaBusInboundMessage(params) {
	return await postJson(params.baseUrl, "/v1/inbound/message", params.input);
}
async function getQaBusState(baseUrl) {
	const response = await fetch(`${baseUrl}/v1/state`);
	if (!response.ok) throw new Error(`qa-bus request failed: ${response.status}`);
	return await response.json();
}
//#endregion
export { getQaBusState as a, parseQaTarget as c, readQaBusMessage as d, searchQaBusMessages as f, editQaBusMessage as i, pollQaBus as l, createQaBusThread as n, injectQaBusInboundMessage as o, sendQaBusMessage as p, deleteQaBusMessage as r, normalizeQaTarget as s, buildQaTarget as t, reactToQaBusMessage as u };
