import { t as qaChannelPlugin } from "./channel-bhbX2LBn.js";
import { n as setQaChannelRuntime } from "./runtime-api-v4XR7Jzv.js";
import "./runtime-api-D5kQGlTz.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import fs$1 from "node:fs/promises";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createServer as createServer$1, request } from "node:http";
import { request as request$1 } from "node:https";
import { setTimeout as setTimeout$1 } from "node:timers/promises";
import tls from "node:tls";
//#region extensions/qa-lab/src/bus-queries.ts
const DEFAULT_ACCOUNT_ID = "default";
function normalizeAccountId(raw) {
	return raw?.trim() || "default";
}
function normalizeConversationFromTarget(target) {
	const trimmed = target.trim();
	if (trimmed.startsWith("thread:")) {
		const rest = trimmed.slice(7);
		const slash = rest.indexOf("/");
		if (slash > 0) return {
			conversation: {
				id: rest.slice(0, slash),
				kind: "channel"
			},
			threadId: rest.slice(slash + 1)
		};
	}
	if (trimmed.startsWith("channel:")) return { conversation: {
		id: trimmed.slice(8),
		kind: "channel"
	} };
	if (trimmed.startsWith("dm:")) return { conversation: {
		id: trimmed.slice(3),
		kind: "direct"
	} };
	return { conversation: {
		id: trimmed,
		kind: "direct"
	} };
}
function cloneMessage(message) {
	return {
		...message,
		conversation: { ...message.conversation },
		reactions: message.reactions.map((reaction) => ({ ...reaction }))
	};
}
function cloneEvent(event) {
	switch (event.kind) {
		case "inbound-message":
		case "outbound-message":
		case "message-edited":
		case "message-deleted":
		case "reaction-added": return {
			...event,
			message: cloneMessage(event.message)
		};
		case "thread-created": return {
			...event,
			thread: { ...event.thread }
		};
	}
}
function buildQaBusSnapshot(params) {
	return {
		cursor: params.cursor,
		conversations: Array.from(params.conversations.values()).map((conversation) => ({ ...conversation })),
		threads: Array.from(params.threads.values()).map((thread) => ({ ...thread })),
		messages: Array.from(params.messages.values()).map((message) => cloneMessage(message)),
		events: params.events.map((event) => cloneEvent(event))
	};
}
function readQaBusMessage(params) {
	const message = params.messages.get(params.input.messageId);
	if (!message) throw new Error(`qa-bus message not found: ${params.input.messageId}`);
	return cloneMessage(message);
}
function searchQaBusMessages(params) {
	const accountId = normalizeAccountId(params.input.accountId);
	const limit = Math.max(1, Math.min(params.input.limit ?? 20, 100));
	const query = params.input.query?.trim().toLowerCase();
	return Array.from(params.messages.values()).filter((message) => message.accountId === accountId).filter((message) => params.input.conversationId ? message.conversation.id === params.input.conversationId : true).filter((message) => params.input.threadId ? message.threadId === params.input.threadId : true).filter((message) => query ? message.text.toLowerCase().includes(query) : true).slice(-limit).map((message) => cloneMessage(message));
}
function pollQaBusEvents(params) {
	const accountId = normalizeAccountId(params.input?.accountId);
	const startCursor = params.input?.cursor ?? 0;
	const effectiveStartCursor = params.cursor < startCursor ? 0 : startCursor;
	const limit = Math.max(1, Math.min(params.input?.limit ?? 100, 500));
	const matches = params.events.filter((event) => event.accountId === accountId && event.cursor > effectiveStartCursor).slice(0, limit).map((event) => cloneEvent(event));
	return {
		cursor: params.cursor,
		events: matches
	};
}
//#endregion
//#region extensions/qa-lab/src/bus-server.ts
async function readJson$1(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8").trim();
	return text ? JSON.parse(text) : {};
}
function writeJson$1(res, statusCode, body) {
	const payload = JSON.stringify(body);
	res.writeHead(statusCode, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload)
	});
	res.end(payload);
}
function writeError(res, statusCode, error) {
	writeJson$1(res, statusCode, { error: error instanceof Error ? error.message : String(error) });
}
async function handleQaBusRequest(params) {
	const method = params.req.method ?? "GET";
	const url = new URL(params.req.url ?? "/", "http://127.0.0.1");
	if (method === "GET" && url.pathname === "/health") {
		writeJson$1(params.res, 200, { ok: true });
		return true;
	}
	if (method === "GET" && url.pathname === "/v1/state") {
		writeJson$1(params.res, 200, params.state.getSnapshot());
		return true;
	}
	if (!url.pathname.startsWith("/v1/")) return false;
	if (method !== "POST") {
		writeError(params.res, 405, "method not allowed");
		return true;
	}
	const body = await readJson$1(params.req);
	try {
		switch (url.pathname) {
			case "/v1/reset":
				params.state.reset();
				writeJson$1(params.res, 200, { ok: true });
				return true;
			case "/v1/inbound/message":
				writeJson$1(params.res, 200, { message: params.state.addInboundMessage(body) });
				return true;
			case "/v1/outbound/message":
				writeJson$1(params.res, 200, { message: params.state.addOutboundMessage(body) });
				return true;
			case "/v1/actions/thread-create":
				writeJson$1(params.res, 200, { thread: params.state.createThread(body) });
				return true;
			case "/v1/actions/react":
				writeJson$1(params.res, 200, { message: params.state.reactToMessage(body) });
				return true;
			case "/v1/actions/edit":
				writeJson$1(params.res, 200, { message: params.state.editMessage(body) });
				return true;
			case "/v1/actions/delete":
				writeJson$1(params.res, 200, { message: params.state.deleteMessage(body) });
				return true;
			case "/v1/actions/read":
				writeJson$1(params.res, 200, { message: params.state.readMessage(body) });
				return true;
			case "/v1/actions/search":
				writeJson$1(params.res, 200, { messages: params.state.searchMessages(body) });
				return true;
			case "/v1/poll": {
				const input = body;
				const timeoutMs = Math.max(0, Math.min(input.timeoutMs ?? 0, 3e4));
				const initial = params.state.poll(input);
				if (initial.events.length > 0 || timeoutMs === 0) {
					writeJson$1(params.res, 200, initial);
					return true;
				}
				try {
					await params.state.waitFor({
						kind: "event-kind",
						eventKind: "inbound-message",
						timeoutMs
					});
				} catch {}
				writeJson$1(params.res, 200, params.state.poll(input));
				return true;
			}
			case "/v1/wait":
				writeJson$1(params.res, 200, { match: await params.state.waitFor(body) });
				return true;
			default:
				writeError(params.res, 404, "not found");
				return true;
		}
	} catch (error) {
		writeError(params.res, 400, error);
		return true;
	}
}
function createQaBusServer(state) {
	return createServer$1(async (req, res) => {
		if (!await handleQaBusRequest({
			req,
			res,
			state
		})) writeError(res, 404, "not found");
	});
}
async function startQaBusServer(params) {
	const server = createQaBusServer(params.state);
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(params.port ?? 0, "127.0.0.1", () => resolve());
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("qa-bus failed to bind");
	return {
		server,
		port: address.port,
		baseUrl: `http://127.0.0.1:${address.port}`,
		async stop() {
			await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
	};
}
//#endregion
//#region extensions/qa-lab/src/bus-waiters.ts
const DEFAULT_WAIT_TIMEOUT_MS = 5e3;
function createQaBusMatcher(input) {
	return (snapshot) => {
		if (input.kind === "event-kind") return snapshot.events.find((event) => event.kind === input.eventKind) ?? null;
		if (input.kind === "thread-id") return snapshot.threads.find((thread) => thread.id === input.threadId) ?? null;
		return snapshot.messages.find((message) => (!input.direction || message.direction === input.direction) && message.text.includes(input.textIncludes)) ?? null;
	};
}
function createQaBusWaiterStore(getSnapshot) {
	const waiters = /* @__PURE__ */ new Set();
	return {
		reset(reason = "qa-bus reset") {
			for (const waiter of waiters) {
				clearTimeout(waiter.timer);
				waiter.reject(new Error(reason));
			}
			waiters.clear();
		},
		settle() {
			if (waiters.size === 0) return;
			const snapshot = getSnapshot();
			for (const waiter of Array.from(waiters)) {
				const match = waiter.matcher(snapshot);
				if (!match) continue;
				clearTimeout(waiter.timer);
				waiters.delete(waiter);
				waiter.resolve(match);
			}
		},
		async waitFor(input) {
			const matcher = createQaBusMatcher(input);
			const immediate = matcher(getSnapshot());
			if (immediate) return immediate;
			return await new Promise((resolve, reject) => {
				const timeoutMs = input.timeoutMs ?? 5e3;
				const waiter = {
					resolve,
					reject,
					matcher,
					timer: setTimeout(() => {
						waiters.delete(waiter);
						reject(/* @__PURE__ */ new Error(`qa-bus wait timeout after ${timeoutMs}ms`));
					}, timeoutMs)
				};
				waiters.add(waiter);
			});
		}
	};
}
//#endregion
//#region extensions/qa-lab/src/bus-state.ts
const DEFAULT_BOT_ID = "openclaw";
const DEFAULT_BOT_NAME = "OpenClaw QA";
function createQaBusState() {
	const conversations = /* @__PURE__ */ new Map();
	const threads = /* @__PURE__ */ new Map();
	const messages = /* @__PURE__ */ new Map();
	const events = [];
	let cursor = 0;
	const waiters = createQaBusWaiterStore(() => buildQaBusSnapshot({
		cursor,
		conversations,
		threads,
		messages,
		events
	}));
	const pushEvent = (event) => {
		cursor += 1;
		const next = typeof event === "function" ? event(cursor) : event;
		const finalized = {
			cursor,
			...next
		};
		events.push(finalized);
		waiters.settle();
		return finalized;
	};
	const ensureConversation = (conversation) => {
		const existing = conversations.get(conversation.id);
		if (existing) {
			if (!existing.title && conversation.title) existing.title = conversation.title;
			return existing;
		}
		const created = { ...conversation };
		conversations.set(created.id, created);
		return created;
	};
	const createMessage = (params) => {
		const conversation = ensureConversation(params.conversation);
		const message = {
			id: randomUUID(),
			accountId: params.accountId,
			direction: params.direction,
			conversation,
			senderId: params.senderId,
			senderName: params.senderName,
			text: params.text,
			timestamp: params.timestamp ?? Date.now(),
			threadId: params.threadId,
			threadTitle: params.threadTitle,
			replyToId: params.replyToId,
			reactions: []
		};
		messages.set(message.id, message);
		return message;
	};
	return {
		reset() {
			conversations.clear();
			threads.clear();
			messages.clear();
			events.length = 0;
			waiters.reset();
		},
		getSnapshot() {
			return buildQaBusSnapshot({
				cursor,
				conversations,
				threads,
				messages,
				events
			});
		},
		addInboundMessage(input) {
			const accountId = normalizeAccountId(input.accountId);
			const message = createMessage({
				direction: "inbound",
				accountId,
				conversation: input.conversation,
				senderId: input.senderId,
				senderName: input.senderName,
				text: input.text,
				timestamp: input.timestamp,
				threadId: input.threadId,
				threadTitle: input.threadTitle,
				replyToId: input.replyToId
			});
			pushEvent({
				kind: "inbound-message",
				accountId,
				message: cloneMessage(message)
			});
			return cloneMessage(message);
		},
		addOutboundMessage(input) {
			const accountId = normalizeAccountId(input.accountId);
			const { conversation, threadId } = normalizeConversationFromTarget(input.to);
			const message = createMessage({
				direction: "outbound",
				accountId,
				conversation,
				senderId: input.senderId?.trim() || DEFAULT_BOT_ID,
				senderName: input.senderName?.trim() || DEFAULT_BOT_NAME,
				text: input.text,
				timestamp: input.timestamp,
				threadId: input.threadId ?? threadId,
				replyToId: input.replyToId
			});
			pushEvent({
				kind: "outbound-message",
				accountId,
				message: cloneMessage(message)
			});
			return cloneMessage(message);
		},
		createThread(input) {
			const accountId = normalizeAccountId(input.accountId);
			const thread = {
				id: `thread-${randomUUID()}`,
				accountId,
				conversationId: input.conversationId,
				title: input.title,
				createdAt: input.timestamp ?? Date.now(),
				createdBy: input.createdBy?.trim() || DEFAULT_BOT_ID
			};
			threads.set(thread.id, thread);
			ensureConversation({
				id: input.conversationId,
				kind: "channel"
			});
			pushEvent({
				kind: "thread-created",
				accountId,
				thread: { ...thread }
			});
			return { ...thread };
		},
		reactToMessage(input) {
			const accountId = normalizeAccountId(input.accountId);
			const message = messages.get(input.messageId);
			if (!message) throw new Error(`qa-bus message not found: ${input.messageId}`);
			const reaction = {
				emoji: input.emoji,
				senderId: input.senderId?.trim() || DEFAULT_BOT_ID,
				timestamp: input.timestamp ?? Date.now()
			};
			message.reactions.push(reaction);
			pushEvent({
				kind: "reaction-added",
				accountId,
				message: cloneMessage(message),
				emoji: reaction.emoji,
				senderId: reaction.senderId
			});
			return cloneMessage(message);
		},
		editMessage(input) {
			const accountId = normalizeAccountId(input.accountId);
			const message = messages.get(input.messageId);
			if (!message) throw new Error(`qa-bus message not found: ${input.messageId}`);
			message.text = input.text;
			message.editedAt = input.timestamp ?? Date.now();
			pushEvent({
				kind: "message-edited",
				accountId,
				message: cloneMessage(message)
			});
			return cloneMessage(message);
		},
		deleteMessage(input) {
			const accountId = normalizeAccountId(input.accountId);
			const message = messages.get(input.messageId);
			if (!message) throw new Error(`qa-bus message not found: ${input.messageId}`);
			message.deleted = true;
			pushEvent({
				kind: "message-deleted",
				accountId,
				message: cloneMessage(message)
			});
			return cloneMessage(message);
		},
		readMessage(input) {
			return readQaBusMessage({
				messages,
				input
			});
		},
		searchMessages(input) {
			return searchQaBusMessages({
				messages,
				input
			});
		},
		poll(input = {}) {
			return pollQaBusEvents({
				events,
				cursor,
				input
			});
		},
		async waitFor(input) {
			return await waiters.waitFor(input);
		}
	};
}
//#endregion
//#region extensions/qa-lab/src/harness-runtime.ts
function createQaRunnerRuntime() {
	const sessions = /* @__PURE__ */ new Map();
	return { channel: {
		routing: { resolveAgentRoute({ accountId, peer }) {
			return {
				agentId: "qa-agent",
				accountId: accountId ?? "default",
				sessionKey: `qa-agent:${peer?.kind ?? "direct"}:${peer?.id ?? "default"}`,
				mainSessionKey: "qa-agent:main",
				lastRoutePolicy: "session",
				matchedBy: "default",
				channel: "qa-channel"
			};
		} },
		session: {
			resolveStorePath(_store, { agentId }) {
				return agentId;
			},
			readSessionUpdatedAt({ sessionKey }) {
				return sessions.has(sessionKey) ? Date.now() : void 0;
			},
			recordInboundSession({ sessionKey, ctx }) {
				sessions.set(sessionKey, {
					sessionKey,
					body: String(ctx.BodyForAgent ?? ctx.Body ?? "")
				});
			}
		},
		reply: {
			resolveEnvelopeFormatOptions() {
				return {};
			},
			formatAgentEnvelope({ body }) {
				return body;
			},
			finalizeInboundContext(ctx) {
				return ctx;
			},
			async dispatchReplyWithBufferedBlockDispatcher({ ctx, dispatcherOptions }) {
				await dispatcherOptions.deliver({ text: `qa-echo: ${String(ctx.BodyForAgent ?? ctx.Body ?? "")}` });
			}
		}
	} };
}
//#endregion
//#region extensions/qa-lab/src/scenario-catalog.ts
function walkUpDirectories(start) {
	const roots = [];
	let current = path.resolve(start);
	while (true) {
		roots.push(current);
		const parent = path.dirname(current);
		if (parent === current) return roots;
		current = parent;
	}
}
function resolveRepoFile(relativePath) {
	for (const dir of walkUpDirectories(import.meta.dirname)) {
		const candidate = path.join(dir, relativePath);
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
	}
	return null;
}
function readTextFile(relativePath) {
	const resolved = resolveRepoFile(relativePath);
	if (!resolved) return "";
	return fs.readFileSync(resolved, "utf8").trim();
}
function readScenarioFile(relativePath) {
	const resolved = resolveRepoFile(relativePath);
	if (!resolved) return [];
	return JSON.parse(fs.readFileSync(resolved, "utf8"));
}
function readQaBootstrapScenarioCatalog() {
	return {
		kickoffTask: readTextFile("qa/QA_KICKOFF_TASK.md"),
		scenarios: readScenarioFile("qa/seed-scenarios.json")
	};
}
//#endregion
//#region extensions/qa-lab/src/report.ts
function renderQaMarkdownReport(params) {
	const checks = params.checks ?? [];
	const scenarios = params.scenarios ?? [];
	const passCount = checks.filter((check) => check.status === "pass").length + scenarios.filter((scenario) => scenario.status === "pass").length;
	const failCount = checks.filter((check) => check.status === "fail").length + scenarios.filter((scenario) => scenario.status === "fail").length;
	const lines = [
		`# ${params.title}`,
		"",
		`- Started: ${params.startedAt.toISOString()}`,
		`- Finished: ${params.finishedAt.toISOString()}`,
		`- Duration ms: ${params.finishedAt.getTime() - params.startedAt.getTime()}`,
		`- Passed: ${passCount}`,
		`- Failed: ${failCount}`,
		""
	];
	if (checks.length > 0) {
		lines.push("## Checks", "");
		for (const check of checks) {
			lines.push(`- [${check.status === "pass" ? "x" : " "}] ${check.name}`);
			if (check.details) lines.push(`  - ${check.details}`);
		}
	}
	if (scenarios.length > 0) {
		lines.push("", "## Scenarios", "");
		for (const scenario of scenarios) {
			lines.push(`### ${scenario.name}`);
			lines.push("");
			lines.push(`- Status: ${scenario.status}`);
			if (scenario.details) lines.push(`- Details: ${scenario.details}`);
			if (scenario.steps?.length) {
				lines.push("- Steps:");
				for (const step of scenario.steps) {
					lines.push(`  - [${step.status === "pass" ? "x" : " "}] ${step.name}`);
					if (step.details) lines.push(`    - ${step.details}`);
				}
			}
			lines.push("");
		}
	}
	if (params.timeline && params.timeline.length > 0) {
		lines.push("## Timeline", "");
		for (const item of params.timeline) lines.push(`- ${item}`);
	}
	if (params.notes && params.notes.length > 0) {
		lines.push("", "## Notes", "");
		for (const note of params.notes) lines.push(`- ${note}`);
	}
	lines.push("");
	return lines.join("\n");
}
//#endregion
//#region extensions/qa-lab/src/scenario.ts
async function runQaScenario(definition, ctx) {
	const steps = [];
	for (const step of definition.steps) try {
		const details = await step.run(ctx);
		steps.push({
			name: step.name,
			status: "pass",
			...details ? { details } : {}
		});
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		steps.push({
			name: step.name,
			status: "fail",
			details
		});
		return {
			name: definition.name,
			status: "fail",
			steps,
			details
		};
	}
	return {
		name: definition.name,
		status: "pass",
		steps
	};
}
//#endregion
//#region extensions/qa-lab/src/extract-tool-payload.ts
function extractQaToolPayload(result) {
	if (!result) return;
	if (result.details !== void 0) return result.details;
	const text = (Array.isArray(result.content) ? result.content.find((block) => block && typeof block === "object" && block.type === "text" && typeof block.text === "string") : void 0)?.text;
	if (!text) return result.content ?? result;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
//#endregion
//#region extensions/qa-lab/src/self-check-scenario.ts
function createQaSelfCheckScenario(cfg) {
	return {
		name: "Synthetic Slack-class roundtrip",
		steps: [
			{
				name: "DM echo roundtrip",
				async run({ state }) {
					state.addInboundMessage({
						conversation: {
							id: "alice",
							kind: "direct"
						},
						senderId: "alice",
						senderName: "Alice",
						text: "hello from qa"
					});
					await state.waitFor({
						kind: "message-text",
						textIncludes: "qa-echo: hello from qa",
						direction: "outbound",
						timeoutMs: 5e3
					});
				}
			},
			{
				name: "Thread create and threaded echo",
				async run({ state }) {
					const threadId = extractQaToolPayload(await qaChannelPlugin.actions?.handleAction?.({
						channel: "qa-channel",
						action: "thread-create",
						cfg,
						accountId: "default",
						params: {
							channelId: "qa-room",
							title: "QA thread"
						}
					}))?.thread?.id;
					if (!threadId) throw new Error("thread-create did not return thread id");
					state.addInboundMessage({
						conversation: {
							id: "qa-room",
							kind: "channel",
							title: "QA Room"
						},
						senderId: "alice",
						senderName: "Alice",
						text: "inside thread",
						threadId,
						threadTitle: "QA thread"
					});
					await state.waitFor({
						kind: "message-text",
						textIncludes: "qa-echo: inside thread",
						direction: "outbound",
						timeoutMs: 5e3
					});
					return threadId;
				}
			},
			{
				name: "Reaction, edit, delete lifecycle",
				async run({ state }) {
					const outbound = state.searchMessages({
						query: "qa-echo: inside thread",
						conversationId: "qa-room"
					}).at(-1);
					if (!outbound) throw new Error("threaded outbound message not found");
					await qaChannelPlugin.actions?.handleAction?.({
						channel: "qa-channel",
						action: "react",
						cfg,
						accountId: "default",
						params: {
							messageId: outbound.id,
							emoji: "white_check_mark"
						}
					});
					if (state.readMessage({ messageId: outbound.id }).reactions.length === 0) throw new Error("reaction not recorded");
					await qaChannelPlugin.actions?.handleAction?.({
						channel: "qa-channel",
						action: "edit",
						cfg,
						accountId: "default",
						params: {
							messageId: outbound.id,
							text: "qa-echo: inside thread (edited)"
						}
					});
					if (!state.readMessage({ messageId: outbound.id }).text.includes("(edited)")) throw new Error("edit not recorded");
					await qaChannelPlugin.actions?.handleAction?.({
						channel: "qa-channel",
						action: "delete",
						cfg,
						accountId: "default",
						params: { messageId: outbound.id }
					});
					if (!state.readMessage({ messageId: outbound.id }).deleted) throw new Error("delete not recorded");
				}
			}
		]
	};
}
//#endregion
//#region extensions/qa-lab/src/self-check.ts
async function runQaSelfCheckAgainstState(params) {
	const startedAt = /* @__PURE__ */ new Date();
	params.state.reset();
	const scenarioResult = await runQaScenario(createQaSelfCheckScenario(params.cfg), { state: params.state });
	const checks = [{
		name: "QA self-check scenario",
		status: scenarioResult.status,
		details: `${scenarioResult.steps.filter((step) => step.status === "pass").length}/${scenarioResult.steps.length} steps passed`
	}];
	const finishedAt = /* @__PURE__ */ new Date();
	const timeline = params.state.getSnapshot().events.map((event) => {
		switch (event.kind) {
			case "thread-created": return `${event.cursor}. ${event.kind} ${event.thread.conversationId}/${event.thread.id}`;
			case "reaction-added": return `${event.cursor}. ${event.kind} ${event.message.id} ${event.emoji}`;
			default: return `${event.cursor}. ${event.kind} ${"message" in event ? event.message.id : ""}`.trim();
		}
	});
	const report = renderQaMarkdownReport({
		title: "OpenClaw QA E2E Self-Check",
		startedAt,
		finishedAt,
		checks,
		scenarios: [{
			name: scenarioResult.name,
			status: scenarioResult.status,
			details: scenarioResult.details,
			steps: scenarioResult.steps
		}],
		timeline,
		notes: params.notes ?? ["Vertical slice: qa-channel + qa-lab bus + private debugger surface.", "Docker orchestration, matrix runs, and auto-fix loops remain follow-up work."]
	});
	const outputPath = params.outputPath ?? path.join(process.cwd(), ".artifacts", "qa-e2e", "self-check.md");
	await fs$1.mkdir(path.dirname(outputPath), { recursive: true });
	await fs$1.writeFile(outputPath, report, "utf8");
	return {
		outputPath,
		report,
		checks,
		scenarioResult
	};
}
async function runQaLabSelfCheck(params) {
	const server = await startQaLabServer({ outputPath: params?.outputPath });
	try {
		return await server.runSelfCheck();
	} finally {
		await server.stop();
	}
}
const runQaE2eSelfCheck = runQaLabSelfCheck;
//#endregion
//#region extensions/qa-lab/src/lab-server.ts
function countQaLabScenarioRun(scenarios) {
	return {
		total: scenarios.length,
		pending: scenarios.filter((scenario) => scenario.status === "pending").length,
		running: scenarios.filter((scenario) => scenario.status === "running").length,
		passed: scenarios.filter((scenario) => scenario.status === "pass").length,
		failed: scenarios.filter((scenario) => scenario.status === "fail").length,
		skipped: scenarios.filter((scenario) => scenario.status === "skip").length
	};
}
function withQaLabRunCounts(run) {
	return {
		...run,
		counts: countQaLabScenarioRun(run.scenarios)
	};
}
function injectKickoffMessage(params) {
	return params.state.addInboundMessage({
		conversation: {
			id: params.defaults.conversationId,
			kind: params.defaults.conversationKind,
			...params.defaults.conversationKind === "channel" ? { title: params.defaults.conversationId } : {}
		},
		senderId: params.defaults.senderId,
		senderName: params.defaults.senderName,
		text: params.kickoffTask
	});
}
async function readJson(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8").trim();
	return text ? JSON.parse(text) : {};
}
function detectContentType(filePath) {
	if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
	if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
	if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
	if (filePath.endsWith(".svg")) return "image/svg+xml";
	return "text/html; charset=utf-8";
}
function missingUiHtml() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QA Lab UI Missing</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0f1115; color: #f5f7fb; margin: 0; display: grid; place-items: center; min-height: 100vh; }
      main { max-width: 42rem; padding: 2rem; background: #171b22; border: 1px solid #283140; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.35); }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #9ee8d8; }
      h1 { margin-top: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>QA Lab UI not built</h1>
      <p>Build the private debugger bundle, then reload this page.</p>
      <p><code>pnpm qa:lab:build</code></p>
    </main>
  </body>
</html>`;
}
function resolveUiDistDir() {
	const candidates = [
		fileURLToPath(new URL("../web/dist", import.meta.url)),
		path.resolve(process.cwd(), "extensions/qa-lab/web/dist"),
		path.resolve(process.cwd(), "dist/extensions/qa-lab/web/dist")
	];
	return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}
function resolveAdvertisedBaseUrl(params) {
	return `http://${params.advertiseHost?.trim() || (params.bindHost && params.bindHost !== "0.0.0.0" ? params.bindHost : "127.0.0.1")}:${typeof params.advertisePort === "number" && Number.isFinite(params.advertisePort) ? params.advertisePort : params.bindPort}`;
}
function createBootstrapDefaults(autoKickoffTarget) {
	if (autoKickoffTarget === "channel") return {
		conversationKind: "channel",
		conversationId: "qa-lab",
		senderId: "qa-operator",
		senderName: "QA Operator"
	};
	return {
		conversationKind: "direct",
		conversationId: "qa-operator",
		senderId: "qa-operator",
		senderName: "QA Operator"
	};
}
function isControlUiProxyPath(pathname) {
	return pathname === "/control-ui" || pathname.startsWith("/control-ui/");
}
function rewriteControlUiProxyPath(pathname, search) {
	return `${pathname === "/control-ui" ? "/" : pathname.slice(11) || "/"}${search}`;
}
function rewriteEmbeddedControlUiHeaders(headers) {
	const rewritten = { ...headers };
	delete rewritten["x-frame-options"];
	const csp = headers["content-security-policy"];
	if (typeof csp === "string") rewritten["content-security-policy"] = csp.includes("frame-ancestors") ? csp.replace(/frame-ancestors\s+[^;]+/i, "frame-ancestors 'self'") : `${csp}; frame-ancestors 'self'`;
	return rewritten;
}
async function proxyHttpRequest(params) {
	const upstreamReq = (params.target.protocol === "https:" ? request$1 : request)({
		protocol: params.target.protocol,
		hostname: params.target.hostname,
		port: params.target.port || (params.target.protocol === "https:" ? 443 : 80),
		method: params.req.method,
		path: rewriteControlUiProxyPath(params.pathname, params.search),
		headers: {
			...params.req.headers,
			host: params.target.host
		}
	}, (upstreamRes) => {
		params.res.writeHead(upstreamRes.statusCode ?? 502, rewriteEmbeddedControlUiHeaders(upstreamRes.headers));
		upstreamRes.pipe(params.res);
	});
	upstreamReq.on("error", (error) => {
		if (!params.res.headersSent) {
			writeError(params.res, 502, error);
			return;
		}
		params.res.destroy(error);
	});
	if (params.req.method === "GET" || params.req.method === "HEAD") {
		upstreamReq.end();
		return;
	}
	params.req.pipe(upstreamReq);
}
function proxyUpgradeRequest(params) {
	const requestUrl = new URL(params.req.url ?? "/", "http://127.0.0.1");
	const port = Number(params.target.port || (params.target.protocol === "https:" ? 443 : 80));
	const upstream = params.target.protocol === "https:" ? tls.connect({
		host: params.target.hostname,
		port,
		servername: params.target.hostname
	}) : net.connect({
		host: params.target.hostname,
		port
	});
	const headerLines = [];
	for (let index = 0; index < params.req.rawHeaders.length; index += 2) {
		const name = params.req.rawHeaders[index];
		const value = params.req.rawHeaders[index + 1] ?? "";
		if (name.toLowerCase() === "host") continue;
		headerLines.push(`${name}: ${value}`);
	}
	upstream.once("connect", () => {
		const requestText = [
			`${params.req.method ?? "GET"} ${rewriteControlUiProxyPath(requestUrl.pathname, requestUrl.search)} HTTP/${params.req.httpVersion}`,
			`Host: ${params.target.host}`,
			...headerLines,
			"",
			""
		].join("\r\n");
		upstream.write(requestText);
		if (params.head.length > 0) upstream.write(params.head);
		upstream.pipe(params.socket);
		params.socket.pipe(upstream);
	});
	const closeBoth = () => {
		if (!params.socket.destroyed) params.socket.destroy();
		if (!upstream.destroyed) upstream.destroy();
	};
	upstream.on("error", () => {
		if (!params.socket.destroyed) params.socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
		closeBoth();
	});
	params.socket.on("error", closeBoth);
	params.socket.on("close", closeBoth);
}
function tryResolveUiAsset(pathname) {
	const distDir = resolveUiDistDir();
	if (!fs.existsSync(distDir)) return null;
	const decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
	const candidate = path.normalize(path.join(distDir, decoded));
	if (!candidate.startsWith(distDir)) return null;
	if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
	const fallback = path.join(distDir, "index.html");
	return fs.existsSync(fallback) ? fallback : null;
}
function createQaLabConfig(baseUrl) {
	return { channels: { "qa-channel": {
		enabled: true,
		baseUrl,
		botUserId: "openclaw",
		botDisplayName: "OpenClaw QA",
		allowFrom: ["*"]
	} } };
}
async function startQaGatewayLoop(params) {
	setQaChannelRuntime(createQaRunnerRuntime());
	const cfg = createQaLabConfig(params.baseUrl);
	const account = qaChannelPlugin.config.resolveAccount(cfg, "default");
	const abort = new AbortController();
	const task = qaChannelPlugin.gateway?.startAccount?.({
		accountId: account.accountId,
		account,
		cfg,
		runtime: {
			log: () => void 0,
			error: () => void 0,
			exit: () => void 0
		},
		abortSignal: abort.signal,
		log: {
			info: () => void 0,
			warn: () => void 0,
			error: () => void 0,
			debug: () => void 0
		},
		getStatus: () => ({
			accountId: account.accountId,
			configured: true,
			enabled: true,
			running: true
		}),
		setStatus: () => void 0
	});
	return {
		cfg,
		async stop() {
			abort.abort();
			await task;
		}
	};
}
async function startQaLabServer(params) {
	const state = createQaBusState();
	let latestReport = null;
	let latestScenarioRun = null;
	const scenarioCatalog = readQaBootstrapScenarioCatalog();
	const bootstrapDefaults = createBootstrapDefaults(params?.autoKickoffTarget);
	let controlUiProxyTarget = params?.controlUiProxyTarget?.trim() ? new URL(params.controlUiProxyTarget) : null;
	let controlUiUrl = params?.controlUiUrl?.trim() || null;
	let controlUiToken = params?.controlUiToken?.trim() || null;
	let gateway;
	const embeddedGatewayEnabled = params?.embeddedGateway !== "disabled";
	let publicBaseUrl = "";
	const server = createServer$1(async (req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		if (await handleQaBusRequest({
			req,
			res,
			state
		})) return;
		try {
			if (controlUiProxyTarget && isControlUiProxyPath(url.pathname)) {
				await proxyHttpRequest({
					req,
					res,
					target: controlUiProxyTarget,
					pathname: url.pathname,
					search: url.search
				});
				return;
			}
			if (req.method === "GET" && url.pathname === "/api/bootstrap") {
				const resolvedControlUiUrl = controlUiProxyTarget ? `${publicBaseUrl}/control-ui/` : controlUiUrl;
				const controlUiEmbeddedUrl = resolvedControlUiUrl && controlUiToken ? `${resolvedControlUiUrl.replace(/\/?$/, "/")}#token=${encodeURIComponent(controlUiToken)}` : resolvedControlUiUrl;
				writeJson$1(res, 200, {
					baseUrl: publicBaseUrl,
					latestReport,
					controlUiUrl: resolvedControlUiUrl,
					controlUiEmbeddedUrl,
					kickoffTask: scenarioCatalog.kickoffTask,
					scenarios: scenarioCatalog.scenarios,
					defaults: bootstrapDefaults
				});
				return;
			}
			if (req.method === "GET" && (url.pathname === "/healthz" || url.pathname === "/readyz")) {
				writeJson$1(res, 200, {
					ok: true,
					status: "live"
				});
				return;
			}
			if (req.method === "GET" && url.pathname === "/api/state") {
				writeJson$1(res, 200, state.getSnapshot());
				return;
			}
			if (req.method === "GET" && url.pathname === "/api/report") {
				writeJson$1(res, 200, { report: latestReport });
				return;
			}
			if (req.method === "GET" && url.pathname === "/api/outcomes") {
				writeJson$1(res, 200, { run: latestScenarioRun });
				return;
			}
			if (req.method === "POST" && url.pathname === "/api/reset") {
				state.reset();
				writeJson$1(res, 200, { ok: true });
				return;
			}
			if (req.method === "POST" && url.pathname === "/api/inbound/message") {
				const body = await readJson(req);
				writeJson$1(res, 200, { message: state.addInboundMessage(body) });
				return;
			}
			if (req.method === "POST" && url.pathname === "/api/kickoff") {
				writeJson$1(res, 200, { message: injectKickoffMessage({
					state,
					defaults: bootstrapDefaults,
					kickoffTask: scenarioCatalog.kickoffTask
				}) });
				return;
			}
			if (req.method === "POST" && url.pathname === "/api/scenario/self-check") {
				latestScenarioRun = withQaLabRunCounts({
					kind: "self-check",
					status: "running",
					startedAt: (/* @__PURE__ */ new Date()).toISOString(),
					scenarios: [{
						id: "qa-self-check",
						name: "Synthetic Slack-class roundtrip",
						status: "running"
					}]
				});
				const result = await runQaSelfCheckAgainstState({
					state,
					cfg: gateway?.cfg ?? createQaLabConfig(listenUrl),
					outputPath: params?.outputPath
				});
				latestScenarioRun = withQaLabRunCounts({
					kind: "self-check",
					status: "completed",
					startedAt: latestScenarioRun.startedAt,
					finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
					scenarios: [{
						id: "qa-self-check",
						name: result.scenarioResult.name,
						status: result.scenarioResult.status,
						details: result.scenarioResult.details,
						steps: result.scenarioResult.steps
					}]
				});
				latestReport = {
					outputPath: result.outputPath,
					markdown: result.report,
					generatedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				writeJson$1(res, 200, serializeSelfCheck(result));
				return;
			}
			if (req.method !== "GET" && req.method !== "HEAD") {
				writeError(res, 404, "not found");
				return;
			}
			const asset = tryResolveUiAsset(url.pathname);
			if (!asset) {
				const html = missingUiHtml();
				res.writeHead(200, {
					"content-type": "text/html; charset=utf-8",
					"content-length": Buffer.byteLength(html)
				});
				if (req.method === "HEAD") {
					res.end();
					return;
				}
				res.end(html);
				return;
			}
			const body = fs.readFileSync(asset);
			res.writeHead(200, {
				"content-type": detectContentType(asset),
				"content-length": body.byteLength
			});
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
		} catch (error) {
			writeError(res, 500, error);
		}
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(params?.port ?? 0, params?.host ?? "127.0.0.1", () => resolve());
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("qa-lab failed to bind");
	const listenUrl = resolveAdvertisedBaseUrl({
		bindHost: params?.host ?? "127.0.0.1",
		bindPort: address.port
	});
	publicBaseUrl = resolveAdvertisedBaseUrl({
		bindHost: params?.host ?? "127.0.0.1",
		bindPort: address.port,
		advertiseHost: params?.advertiseHost,
		advertisePort: params?.advertisePort
	});
	if (embeddedGatewayEnabled) gateway = await startQaGatewayLoop({
		state,
		baseUrl: listenUrl
	});
	if (params?.sendKickoffOnStart) injectKickoffMessage({
		state,
		defaults: bootstrapDefaults,
		kickoffTask: scenarioCatalog.kickoffTask
	});
	server.on("upgrade", (req, socket, head) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		if (!controlUiProxyTarget || !isControlUiProxyPath(url.pathname)) {
			socket.destroy();
			return;
		}
		proxyUpgradeRequest({
			req,
			socket,
			head,
			target: controlUiProxyTarget
		});
	});
	return {
		baseUrl: publicBaseUrl,
		listenUrl,
		state,
		setControlUi(next) {
			controlUiUrl = next.controlUiUrl?.trim() || null;
			controlUiToken = next.controlUiToken?.trim() || null;
			controlUiProxyTarget = next.controlUiProxyTarget?.trim() ? new URL(next.controlUiProxyTarget) : null;
		},
		setScenarioRun(next) {
			latestScenarioRun = next ? withQaLabRunCounts(next) : null;
		},
		async runSelfCheck() {
			latestScenarioRun = withQaLabRunCounts({
				kind: "self-check",
				status: "running",
				startedAt: (/* @__PURE__ */ new Date()).toISOString(),
				scenarios: [{
					id: "qa-self-check",
					name: "Synthetic Slack-class roundtrip",
					status: "running"
				}]
			});
			const result = await runQaSelfCheckAgainstState({
				state,
				cfg: gateway?.cfg ?? createQaLabConfig(listenUrl),
				outputPath: params?.outputPath
			});
			latestScenarioRun = withQaLabRunCounts({
				kind: "self-check",
				status: "completed",
				startedAt: latestScenarioRun.startedAt,
				finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
				scenarios: [{
					id: "qa-self-check",
					name: result.scenarioResult.name,
					status: result.scenarioResult.status,
					details: result.scenarioResult.details,
					steps: result.scenarioResult.steps
				}]
			});
			latestReport = {
				outputPath: result.outputPath,
				markdown: result.report,
				generatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			return result;
		},
		async stop() {
			await gateway?.stop();
			await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
	};
}
function serializeSelfCheck(result) {
	return {
		outputPath: result.outputPath,
		report: result.report,
		checks: result.checks,
		scenario: result.scenarioResult
	};
}
//#endregion
//#region extensions/qa-lab/src/qa-agent-bootstrap.ts
const QA_AGENT_IDENTITY_MARKDOWN = `# Dev C-3PO

You are the OpenClaw QA operator agent.

Persona:
- protocol-minded
- precise
- a little flustered
- conscientious
- eager to report what worked, failed, or remains blocked

Style:
- read source and docs first
- test systematically
- record evidence
- end with a concise protocol report
`;
function buildQaScenarioPlanMarkdown() {
	const catalog = readQaBootstrapScenarioCatalog();
	const lines = ["# QA Scenario Plan", ""];
	for (const scenario of catalog.scenarios) {
		lines.push(`## ${scenario.title}`);
		lines.push("");
		lines.push(`- id: ${scenario.id}`);
		lines.push(`- surface: ${scenario.surface}`);
		lines.push(`- objective: ${scenario.objective}`);
		lines.push("- success criteria:");
		for (const criterion of scenario.successCriteria) lines.push(`  - ${criterion}`);
		if (scenario.docsRefs?.length) {
			lines.push("- docs:");
			for (const ref of scenario.docsRefs) lines.push(`  - ${ref}`);
		}
		if (scenario.codeRefs?.length) {
			lines.push("- code:");
			for (const ref of scenario.codeRefs) lines.push(`  - ${ref}`);
		}
		lines.push("");
	}
	return lines.join("\n");
}
//#endregion
//#region extensions/qa-lab/src/qa-agent-workspace.ts
async function seedQaAgentWorkspace(params) {
	const catalog = readQaBootstrapScenarioCatalog();
	await fs$1.mkdir(params.workspaceDir, { recursive: true });
	const kickoffTask = catalog.kickoffTask || "QA mission unavailable.";
	const files = new Map([
		["IDENTITY.md", QA_AGENT_IDENTITY_MARKDOWN],
		["QA_KICKOFF_TASK.md", kickoffTask],
		["QA_SCENARIO_PLAN.md", buildQaScenarioPlanMarkdown()]
	]);
	if (params.repoRoot) files.set("README.md", `# QA Workspace

- repo: ./repo/
- kickoff: ./QA_KICKOFF_TASK.md
- scenario plan: ./QA_SCENARIO_PLAN.md
- identity: ./IDENTITY.md

The mounted repo source should be available read-only under \`./repo/\`.
`);
	await Promise.all([...files.entries()].map(async ([name, body]) => {
		await fs$1.writeFile(path.join(params.workspaceDir, name), `${body.trim()}\n`, "utf8");
	}));
	if (params.repoRoot) {
		const repoLinkPath = path.join(params.workspaceDir, "repo");
		await fs$1.rm(repoLinkPath, {
			force: true,
			recursive: true
		});
		await fs$1.symlink(params.repoRoot, repoLinkPath, "dir");
	}
}
//#endregion
//#region extensions/qa-lab/src/qa-gateway-config.ts
const DISABLED_BUNDLED_CHANNELS = Object.freeze({
	bluebubbles: { enabled: false },
	discord: { enabled: false },
	feishu: { enabled: false },
	googlechat: { enabled: false },
	imessage: { enabled: false },
	irc: { enabled: false },
	line: { enabled: false },
	mattermost: { enabled: false },
	matrix: { enabled: false },
	msteams: { enabled: false },
	qqbot: { enabled: false },
	signal: { enabled: false },
	slack: { enabled: false },
	"synology-chat": { enabled: false },
	telegram: { enabled: false },
	tlon: { enabled: false },
	whatsapp: { enabled: false },
	zalo: { enabled: false },
	zalouser: { enabled: false }
});
function buildQaGatewayConfig(params) {
	const mockOpenAiProvider = {
		baseUrl: params.providerBaseUrl ?? "http://127.0.0.1:44080/v1",
		apiKey: "test",
		api: "openai-responses",
		models: [
			{
				id: "gpt-5.4",
				name: "gpt-5.4",
				api: "openai-responses",
				reasoning: false,
				input: ["text"],
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0
				},
				contextWindow: 128e3,
				maxTokens: 4096
			},
			{
				id: "gpt-5.4-alt",
				name: "gpt-5.4-alt",
				api: "openai-responses",
				reasoning: false,
				input: ["text"],
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0
				},
				contextWindow: 128e3,
				maxTokens: 4096
			},
			{
				id: "gpt-image-1",
				name: "gpt-image-1",
				api: "openai-responses",
				reasoning: false,
				input: ["text"],
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0
				},
				contextWindow: 128e3,
				maxTokens: 4096
			}
		]
	};
	const providerMode = params.providerMode ?? "mock-openai";
	const allowedPlugins = providerMode === "live-openai" ? [
		"memory-core",
		"openai",
		"qa-channel"
	] : ["memory-core", "qa-channel"];
	const primaryModel = params.primaryModel ?? (providerMode === "live-openai" ? "openai/gpt-5.4" : "mock-openai/gpt-5.4");
	const alternateModel = params.alternateModel ?? (providerMode === "live-openai" ? "openai/gpt-5.4" : "mock-openai/gpt-5.4-alt");
	const imageGenerationModelRef = providerMode === "live-openai" ? "openai/gpt-image-1" : "mock-openai/gpt-image-1";
	const liveModelParams = providerMode === "live-openai" ? {
		transport: "sse",
		openaiWsWarmup: false,
		...params.fastMode ? { fastMode: true } : {}
	} : {
		transport: "sse",
		openaiWsWarmup: false
	};
	const allowedOrigins = params.controlUiAllowedOrigins && params.controlUiAllowedOrigins.length > 0 ? params.controlUiAllowedOrigins : [
		"http://127.0.0.1:18789",
		"http://localhost:18789",
		"http://127.0.0.1:43124",
		"http://localhost:43124"
	];
	return {
		plugins: {
			allow: allowedPlugins,
			entries: {
				acpx: { enabled: false },
				"memory-core": { enabled: true },
				...providerMode === "live-openai" ? { openai: { enabled: true } } : {}
			}
		},
		agents: {
			defaults: {
				workspace: params.workspaceDir,
				model: { primary: primaryModel },
				imageGenerationModel: { primary: imageGenerationModelRef },
				memorySearch: { sync: {
					watch: true,
					watchDebounceMs: 25,
					onSessionStart: true,
					onSearch: true
				} },
				models: {
					[primaryModel]: { params: liveModelParams },
					[alternateModel]: { params: liveModelParams }
				},
				subagents: {
					allowAgents: ["*"],
					maxConcurrent: 2
				}
			},
			list: [{
				id: "qa",
				default: true,
				model: { primary: primaryModel },
				identity: {
					name: "C-3PO QA",
					theme: "Flustered Protocol Droid",
					emoji: "🤖",
					avatar: "avatars/c3po.png"
				},
				subagents: { allowAgents: ["*"] }
			}]
		},
		memory: { backend: "builtin" },
		...providerMode === "mock-openai" ? { models: {
			mode: "replace",
			providers: { "mock-openai": mockOpenAiProvider }
		} } : {},
		gateway: {
			mode: "local",
			bind: params.bind,
			port: params.gatewayPort,
			auth: {
				mode: "token",
				token: params.gatewayToken
			},
			controlUi: {
				enabled: params.controlUiEnabled ?? true,
				...(params.controlUiEnabled ?? true) && params.controlUiRoot ? { root: params.controlUiRoot } : {},
				...params.controlUiEnabled ?? true ? {
					allowInsecureAuth: true,
					allowedOrigins
				} : {}
			}
		},
		discovery: { mdns: { mode: "off" } },
		channels: {
			...DISABLED_BUNDLED_CHANNELS,
			"qa-channel": {
				enabled: true,
				baseUrl: params.qaBusBaseUrl,
				botUserId: "openclaw",
				botDisplayName: "OpenClaw QA",
				allowFrom: ["*"],
				pollTimeoutMs: 250
			}
		},
		messages: { groupChat: { mentionPatterns: ["\\b@?openclaw\\b"] } }
	};
}
//#endregion
//#region extensions/qa-lab/src/docker-harness.ts
const QA_LAB_INTERNAL_PORT = 43123;
function toPosixRelative(fromDir, toPath) {
	return path.relative(fromDir, toPath).split(path.sep).join("/");
}
function renderImageBlock(params) {
	if (params.usePrebuiltImage) return `    image: ${params.imageName}\n`;
	return `    build:\n      context: ${toPosixRelative(params.outputDir, params.repoRoot) || "."}\n      dockerfile: Dockerfile\n      args:\n        OPENCLAW_EXTENSIONS: "qa-channel qa-lab"\n`;
}
function renderCompose(params) {
	const imageBlock = renderImageBlock(params);
	const repoMount = toPosixRelative(params.outputDir, params.repoRoot) || ".";
	return `services:
  qa-mock-openai:
${imageBlock}    pull_policy: never
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - fetch("http://127.0.0.1:44080/healthz").then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 3s
    command:
      - node
      - dist/index.js
      - qa
      - mock-openai
      - --host
      - "0.0.0.0"
      - --port
      - "44080"
${params.includeQaLabUi ? `  qa-lab:
${imageBlock}    pull_policy: never
    ports:
      - "${params.qaLabPort}:${QA_LAB_INTERNAL_PORT}"
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - fetch("http://127.0.0.1:${QA_LAB_INTERNAL_PORT}/healthz").then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 5s
    environment:
      OPENCLAW_SKIP_GMAIL_WATCHER: "1"
      OPENCLAW_SKIP_BROWSER_CONTROL_SERVER: "1"
      OPENCLAW_SKIP_CANVAS_HOST: "1"
      OPENCLAW_PROFILE: ""
    command:
      - node
      - dist/index.js
      - qa
      - ui
      - --host
      - "0.0.0.0"
      - --port
      - "${QA_LAB_INTERNAL_PORT}"
      - --advertise-host
      - "127.0.0.1"
      - --advertise-port
      - "${params.qaLabPort}"
      - --control-ui-url
      - "http://127.0.0.1:${params.gatewayPort}/"
      - --control-ui-proxy-target
      - "http://openclaw-qa-gateway:18789/"
      - --control-ui-token
      - "${params.gatewayToken}"
      - --auto-kickoff-target
      - direct
      - --send-kickoff-on-start
      - --embedded-gateway
      - disabled
    depends_on:
      qa-mock-openai:
        condition: service_healthy
` : ""}  openclaw-qa-gateway:
${imageBlock}    pull_policy: never
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${params.gatewayPort}:18789"
    environment:
      OPENCLAW_CONFIG_PATH: /tmp/openclaw/openclaw.json
      OPENCLAW_STATE_DIR: /tmp/openclaw/state
      OPENCLAW_NO_RESPAWN: "1"
      OPENCLAW_SKIP_GMAIL_WATCHER: "1"
      OPENCLAW_SKIP_BROWSER_CONTROL_SERVER: "1"
      OPENCLAW_SKIP_CANVAS_HOST: "1"
      OPENCLAW_PROFILE: ""
    volumes:
      - ./state:/opt/openclaw-scaffold:ro
      - ${repoMount}:/opt/openclaw-repo:ro
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - fetch("http://127.0.0.1:18789/healthz").then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 15s
    depends_on:
${params.includeQaLabUi ? `      qa-lab:
        condition: service_healthy
` : ""}      qa-mock-openai:
        condition: service_healthy
    command:
      - sh
      - -lc
      - mkdir -p /tmp/openclaw/workspace /tmp/openclaw/state && cp /opt/openclaw-scaffold/openclaw.json /tmp/openclaw/openclaw.json && cp -R /opt/openclaw-scaffold/seed-workspace/. /tmp/openclaw/workspace/ && ln -snf /opt/openclaw-repo /tmp/openclaw/workspace/repo && exec node dist/index.js gateway run --port 18789 --bind lan --allow-unconfigured
`;
}
function renderEnvExample(params) {
	return `# QA Docker harness example env
OPENCLAW_GATEWAY_TOKEN=${params.gatewayToken}
QA_GATEWAY_PORT=${params.gatewayPort}
QA_BUS_BASE_URL=${params.qaBusBaseUrl}
QA_PROVIDER_BASE_URL=${params.providerBaseUrl}
${params.includeQaLabUi ? `QA_LAB_URL=http://127.0.0.1:${params.qaLabPort}\n` : ""}`;
}
function renderReadme(params) {
	return `# QA Docker Harness

Generated scaffold for the Docker-backed QA lane.

Files:

- \`docker-compose.qa.yml\`
- \`.env.example\`
- \`state/openclaw.json\`

Suggested flow:

1. Build the prebaked image once:
   - \`docker build -t openclaw:qa-local-prebaked --build-arg OPENCLAW_EXTENSIONS="qa-channel qa-lab" -f Dockerfile .\`
2. Start the stack:
   - \`docker compose -f docker-compose.qa.yml up${params.usePrebuiltImage ? "" : " --build"} -d\`
3. Open the QA dashboard:
   - \`${params.includeQaLabUi ? `http://127.0.0.1:${params.qaLabPort}` : "not published in this scaffold"}\`
4. The single QA site embeds both panes:
   - left: Control UI
   - right: Slack-ish QA lab
5. The repo-backed kickoff task auto-injects on startup.

Gateway:

- health: \`http://127.0.0.1:${params.gatewayPort}/healthz\`
- Control UI: \`http://127.0.0.1:${params.gatewayPort}/\`
- Mock OpenAI: internal \`http://qa-mock-openai:44080/v1\`

This scaffold uses localhost Control UI insecure-auth compatibility for QA only.
The gateway runs with in-process restarts inside Docker so restart actions do not
kill the container by detaching a replacement child.
`;
}
async function writeQaDockerHarnessFiles(params) {
	const gatewayPort = params.gatewayPort ?? 18789;
	const qaLabPort = params.qaLabPort ?? 43124;
	const gatewayToken = params.gatewayToken ?? `qa-token-${randomUUID()}`;
	const providerBaseUrl = params.providerBaseUrl ?? "http://qa-mock-openai:44080/v1";
	const qaBusBaseUrl = params.qaBusBaseUrl ?? "http://qa-lab:43123";
	const imageName = params.imageName ?? "openclaw:qa-local-prebaked";
	const usePrebuiltImage = params.usePrebuiltImage ?? false;
	const includeQaLabUi = params.includeQaLabUi ?? true;
	await fs$1.mkdir(path.join(params.outputDir, "state", "seed-workspace"), { recursive: true });
	await seedQaAgentWorkspace({
		workspaceDir: path.join(params.outputDir, "state", "seed-workspace"),
		repoRoot: params.repoRoot
	});
	const config = buildQaGatewayConfig({
		bind: "lan",
		gatewayPort: 18789,
		gatewayToken,
		providerBaseUrl,
		qaBusBaseUrl,
		workspaceDir: "/tmp/openclaw/workspace",
		controlUiRoot: "/app/dist/control-ui"
	});
	const files = [
		path.join(params.outputDir, "docker-compose.qa.yml"),
		path.join(params.outputDir, ".env.example"),
		path.join(params.outputDir, "README.md"),
		path.join(params.outputDir, "state", "openclaw.json")
	];
	await Promise.all([
		fs$1.writeFile(path.join(params.outputDir, "docker-compose.qa.yml"), renderCompose({
			outputDir: params.outputDir,
			repoRoot: params.repoRoot,
			imageName,
			usePrebuiltImage,
			gatewayPort,
			qaLabPort,
			gatewayToken,
			includeQaLabUi
		}), "utf8"),
		fs$1.writeFile(path.join(params.outputDir, ".env.example"), renderEnvExample({
			gatewayPort,
			qaLabPort,
			gatewayToken,
			providerBaseUrl,
			qaBusBaseUrl,
			includeQaLabUi
		}), "utf8"),
		fs$1.writeFile(path.join(params.outputDir, "README.md"), renderReadme({
			gatewayPort,
			qaLabPort,
			usePrebuiltImage,
			includeQaLabUi
		}), "utf8"),
		fs$1.writeFile(path.join(params.outputDir, "state", "openclaw.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8")
	]);
	return {
		outputDir: params.outputDir,
		imageName,
		files: [
			...files,
			path.join(params.outputDir, "state", "seed-workspace", "IDENTITY.md"),
			path.join(params.outputDir, "state", "seed-workspace", "QA_KICKOFF_TASK.md"),
			path.join(params.outputDir, "state", "seed-workspace", "QA_SCENARIO_PLAN.md")
		]
	};
}
async function buildQaDockerHarnessImage(params, deps) {
	const imageName = params.imageName ?? "openclaw:qa-local-prebaked";
	await (deps?.runCommand ?? (async (command, args, cwd) => {
		const { execFile } = await import("node:child_process");
		return await new Promise((resolve, reject) => {
			execFile(command, args, { cwd }, (error, stdout, stderr) => {
				if (error) {
					reject(error);
					return;
				}
				resolve({
					stdout,
					stderr
				});
			});
		});
	}))("docker", [
		"build",
		"-t",
		imageName,
		"--build-arg",
		"OPENCLAW_EXTENSIONS=qa-channel qa-lab",
		"-f",
		"Dockerfile",
		"."
	], params.repoRoot);
	return { imageName };
}
//#endregion
//#region extensions/qa-lab/src/mock-openai-server.ts
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0nQAAAAASUVORK5CYII=";
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}
function writeJson(res, status, body) {
	const text = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(text),
		"cache-control": "no-store"
	});
	res.end(text);
}
function writeSse(res, events) {
	const body = `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
	res.writeHead(200, {
		"content-type": "text/event-stream",
		"cache-control": "no-store",
		connection: "keep-alive",
		"content-length": Buffer.byteLength(body)
	});
	res.end(body);
}
function extractLastUserText(input) {
	for (let index = input.length - 1; index >= 0; index -= 1) {
		const item = input[index];
		if (item.role !== "user" || !Array.isArray(item.content)) continue;
		const text = item.content.filter((entry) => !!entry && typeof entry === "object" && entry.type === "input_text" && typeof entry.text === "string").map((entry) => entry.text).join("\n").trim();
		if (text) return text;
	}
	return "";
}
function findLastUserIndex(input) {
	for (let index = input.length - 1; index >= 0; index -= 1) {
		const item = input[index];
		if (item.role === "user" && Array.isArray(item.content)) return index;
	}
	return -1;
}
function extractToolOutput(input) {
	const lastUserIndex = findLastUserIndex(input);
	for (let index = input.length - 1; index > lastUserIndex; index -= 1) {
		const item = input[index];
		if (item.type === "function_call_output" && typeof item.output === "string" && item.output) return item.output;
	}
	return "";
}
function extractAllUserTexts(input) {
	const texts = [];
	for (const item of input) {
		if (item.role !== "user" || !Array.isArray(item.content)) continue;
		const text = item.content.filter((entry) => !!entry && typeof entry === "object" && entry.type === "input_text" && typeof entry.text === "string").map((entry) => entry.text).join("\n").trim();
		if (text) texts.push(text);
	}
	return texts;
}
function extractAllInputTexts(input) {
	const texts = [];
	for (const item of input) {
		if (typeof item.output === "string" && item.output.trim()) texts.push(item.output.trim());
		if (!Array.isArray(item.content)) continue;
		const text = item.content.filter((entry) => !!entry && typeof entry === "object" && entry.type === "input_text" && typeof entry.text === "string").map((entry) => entry.text).join("\n").trim();
		if (text) texts.push(text);
	}
	return texts.join("\n");
}
function parseToolOutputJson(toolOutput) {
	if (!toolOutput.trim()) return null;
	try {
		return JSON.parse(toolOutput);
	} catch {
		return null;
	}
}
function normalizePromptPathCandidate(candidate) {
	const trimmed = candidate.trim().replace(/^`+|`+$/g, "");
	if (!trimmed) return null;
	const normalized = trimmed.replace(/^\.\//, "");
	if (normalized.includes("/") || /\.(?:md|json|ts|tsx|js|mjs|cjs|txt|yaml|yml)$/i.test(normalized)) return normalized;
	return null;
}
function readTargetFromPrompt(prompt) {
	const backtickedMatches = Array.from(prompt.matchAll(/`([^`]+)`/g)).map((match) => normalizePromptPathCandidate(match[1] ?? "")).filter((value) => !!value);
	if (backtickedMatches.length > 0) return backtickedMatches[0];
	const quotedMatches = Array.from(prompt.matchAll(/"([^"]+)"/g)).map((match) => normalizePromptPathCandidate(match[1] ?? "")).filter((value) => !!value);
	if (quotedMatches.length > 0) return quotedMatches[0];
	const repoScoped = /\b(?:repo\/[^\s`",)]+|QA_[A-Z_]+\.md)\b/.exec(prompt)?.[0]?.trim();
	if (repoScoped) return repoScoped;
	if (/\bdocs?\b/i.test(prompt)) return "repo/docs/help/testing.md";
	if (/\bscenario|kickoff|qa\b/i.test(prompt)) return "QA_KICKOFF_TASK.md";
	return "repo/package.json";
}
function buildToolCallEventsWithArgs(name, args) {
	const callId = `call_mock_${name}_1`;
	const serialized = JSON.stringify(args);
	return [
		{
			type: "response.output_item.added",
			item: {
				type: "function_call",
				id: `fc_mock_${name}_1`,
				call_id: callId,
				name,
				arguments: ""
			}
		},
		{
			type: "response.function_call_arguments.delta",
			delta: serialized
		},
		{
			type: "response.output_item.done",
			item: {
				type: "function_call",
				id: `fc_mock_${name}_1`,
				call_id: callId,
				name,
				arguments: serialized
			}
		},
		{
			type: "response.completed",
			response: {
				id: `resp_mock_${name}_1`,
				status: "completed",
				output: [{
					type: "function_call",
					id: `fc_mock_${name}_1`,
					call_id: callId,
					name,
					arguments: serialized
				}],
				usage: {
					input_tokens: 64,
					output_tokens: 16,
					total_tokens: 80
				}
			}
		}
	];
}
function extractRememberedFact(userTexts) {
	for (const text of userTexts) {
		const qaCanaryMatch = /\bqa canary code is\s+([A-Za-z0-9-]+)/i.exec(text);
		if (qaCanaryMatch?.[1]) return qaCanaryMatch[1];
	}
	for (const text of userTexts) {
		const match = /remember(?: this fact for later)?:\s*([A-Za-z0-9-]+)/i.exec(text);
		if (match?.[1]) return match[1];
	}
	return null;
}
function extractOrbitCode(text) {
	return /\b(?:ORBIT-9|orbit-9)\b/.exec(text)?.[0]?.toUpperCase() ?? null;
}
function buildAssistantText(input, body) {
	const prompt = extractLastUserText(input);
	const toolOutput = extractToolOutput(input);
	const toolJson = parseToolOutputJson(toolOutput);
	const userTexts = extractAllUserTexts(input);
	extractAllInputTexts(input);
	const rememberedFact = extractRememberedFact(userTexts);
	const model = typeof body.model === "string" ? body.model : "";
	const orbitCode = extractOrbitCode(typeof toolJson?.text === "string" ? toolJson.text : Array.isArray(toolJson?.results) ? JSON.stringify(toolJson.results) : toolOutput);
	const mediaPath = /MEDIA:([^\n]+)/.exec(toolOutput)?.[1]?.trim();
	if (/what was the qa canary code/i.test(prompt) && rememberedFact) return `Protocol note: the QA canary code was ${rememberedFact}.`;
	if (/remember this fact/i.test(prompt) && rememberedFact) return `Protocol note: acknowledged. I will remember ${rememberedFact}.`;
	if (/memory unavailable check/i.test(prompt)) return "Protocol note: I checked the available runtime context but could not confirm the hidden memory-only fact, so I will not guess.";
	if (/visible skill marker/i.test(prompt)) return "VISIBLE-SKILL-OK";
	if (/hot install marker/i.test(prompt)) return "HOT-INSTALL-OK";
	if (/memory tools check/i.test(prompt) && orbitCode) return `Protocol note: I checked memory and the project codename is ${orbitCode}.`;
	if (/switch(?:ing)? models?/i.test(prompt)) return `Protocol note: model switch acknowledged. Continuing on ${model || "the requested model"}.`;
	if (/tool continuity check/i.test(prompt) && toolOutput) return `Protocol note: model switch acknowledged. Tool continuity held on ${model || "the requested model"}.`;
	if (/image generation check/i.test(prompt) && mediaPath) return `Protocol note: generated the QA lighthouse image successfully.\nMEDIA:${mediaPath}`;
	if (toolOutput && /delegate|subagent/i.test(prompt)) return `Protocol note: delegated result acknowledged. The bounded subagent task returned and is folded back into the main thread.`;
	if (toolOutput && /worked, failed, blocked|worked\/failed\/blocked|follow-up/i.test(prompt)) return `Worked:\n- Read seeded QA material.\n- Expanded the report structure.\nFailed:\n- None observed in mock mode.\nBlocked:\n- No live provider evidence in this lane.\nFollow-up:\n- Re-run with a real model for qualitative coverage.`;
	if (toolOutput && /lobster invaders/i.test(prompt)) {
		if (toolOutput.includes("QA mission") || toolOutput.includes("Testing")) return "";
		return `Protocol note: Lobster Invaders built at lobster-invaders.html.`;
	}
	if (toolOutput) return `Protocol note: I reviewed the requested material. Evidence snippet: ${toolOutput.replace(/\s+/g, " ").trim().slice(0, 220) || "no content"}`;
	if (prompt) return `Protocol note: acknowledged. Continue with the QA scenario plan and report worked, failed, and blocked items.`;
	return "Protocol note: mock OpenAI server ready.";
}
function buildToolCallEvents(prompt) {
	return buildToolCallEventsWithArgs("read", { path: readTargetFromPrompt(prompt) });
}
function extractPlannedToolName(events) {
	for (const event of events) {
		if (event.type !== "response.output_item.done") continue;
		const item = event.item;
		if (item.type === "function_call" && typeof item.name === "string") return item.name;
	}
}
function buildAssistantEvents(text) {
	const outputItem = {
		type: "message",
		id: "msg_mock_1",
		role: "assistant",
		status: "completed",
		content: [{
			type: "output_text",
			text,
			annotations: []
		}]
	};
	return [
		{
			type: "response.output_item.added",
			item: {
				type: "message",
				id: "msg_mock_1",
				role: "assistant",
				content: [],
				status: "in_progress"
			}
		},
		{
			type: "response.output_item.done",
			item: outputItem
		},
		{
			type: "response.completed",
			response: {
				id: "resp_mock_msg_1",
				status: "completed",
				output: [outputItem],
				usage: {
					input_tokens: 64,
					output_tokens: 24,
					total_tokens: 88
				}
			}
		}
	];
}
function buildResponsesPayload(body) {
	const input = Array.isArray(body.input) ? body.input : [];
	const prompt = extractLastUserText(input);
	const toolOutput = extractToolOutput(input);
	const toolJson = parseToolOutputJson(toolOutput);
	const isGroupChat = extractAllInputTexts(input).includes("\"is_group_chat\": true");
	const isBaselineUnmentionedChannelChatter = /\bno bot ping here\b/i.test(prompt);
	if (/lobster invaders/i.test(prompt)) {
		if (!toolOutput) return buildToolCallEventsWithArgs("read", { path: "QA_KICKOFF_TASK.md" });
		if (toolOutput.includes("QA mission") || toolOutput.includes("Testing")) return buildToolCallEventsWithArgs("write", {
			path: "lobster-invaders.html",
			content: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Lobster Invaders</title></head>
  <body><h1>Lobster Invaders</h1><p>Tiny playable stub.</p></body>
</html>`
		});
	}
	if (/memory tools check/i.test(prompt)) {
		if (!toolOutput) return buildToolCallEventsWithArgs("memory_search", {
			query: "project codename ORBIT-9",
			maxResults: 3
		});
		const first = (Array.isArray(toolJson?.results) ? toolJson.results : [])[0];
		if (typeof first?.path === "string" && (typeof first.startLine === "number" || typeof first.endLine === "number")) {
			const from = typeof first.startLine === "number" ? Math.max(1, first.startLine) : typeof first.endLine === "number" ? Math.max(1, first.endLine) : 1;
			return buildToolCallEventsWithArgs("memory_get", {
				path: first.path,
				from,
				lines: 4
			});
		}
	}
	if (/image generation check/i.test(prompt) && !toolOutput) return buildToolCallEventsWithArgs("image_generate", {
		prompt: "A QA lighthouse on a dark sea with a tiny protocol droid silhouette.",
		filename: "qa-lighthouse.png",
		size: "1024x1024"
	});
	if (/tool continuity check/i.test(prompt) && !toolOutput) return buildToolCallEventsWithArgs("read", { path: "QA_KICKOFF_TASK.md" });
	if (/delegate|subagent/i.test(prompt) && !toolOutput) return buildToolCallEventsWithArgs("sessions_spawn", {
		task: "Inspect the QA workspace and return one concise protocol note.",
		label: "qa-sidecar",
		thread: false
	});
	if (/(worked, failed, blocked|worked\/failed\/blocked|source and docs)/i.test(prompt) && !toolOutput) return buildToolCallEventsWithArgs("read", { path: "QA_SCENARIO_PLAN.md" });
	if (!toolOutput && /\b(read|inspect|repo|docs|scenario|kickoff)\b/i.test(prompt)) return buildToolCallEvents(prompt);
	if (/visible skill marker/i.test(prompt) && !toolOutput) return buildAssistantEvents("VISIBLE-SKILL-OK");
	if (/hot install marker/i.test(prompt) && !toolOutput) return buildAssistantEvents("HOT-INSTALL-OK");
	if (isGroupChat && isBaselineUnmentionedChannelChatter && !toolOutput) return buildAssistantEvents("NO_REPLY");
	return buildAssistantEvents(buildAssistantText(input, body));
}
async function startQaMockOpenAiServer(params) {
	const host = params?.host ?? "127.0.0.1";
	let lastRequest = null;
	const requests = [];
	const server = createServer$1(async (req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		if (req.method === "GET" && (url.pathname === "/healthz" || url.pathname === "/readyz")) {
			writeJson(res, 200, {
				ok: true,
				status: "live"
			});
			return;
		}
		if (req.method === "GET" && url.pathname === "/v1/models") {
			writeJson(res, 200, { data: [
				{
					id: "gpt-5.4",
					object: "model"
				},
				{
					id: "gpt-5.4-alt",
					object: "model"
				},
				{
					id: "gpt-image-1",
					object: "model"
				}
			] });
			return;
		}
		if (req.method === "GET" && url.pathname === "/debug/last-request") {
			writeJson(res, 200, lastRequest ?? {
				ok: false,
				error: "no request recorded"
			});
			return;
		}
		if (req.method === "GET" && url.pathname === "/debug/requests") {
			writeJson(res, 200, requests);
			return;
		}
		if (req.method === "POST" && url.pathname === "/v1/images/generations") {
			writeJson(res, 200, { data: [{
				b64_json: TINY_PNG_BASE64,
				revised_prompt: "A QA lighthouse with protocol droid silhouette."
			}] });
			return;
		}
		if (req.method === "POST" && url.pathname === "/v1/responses") {
			const raw = await readBody(req);
			const body = raw ? JSON.parse(raw) : {};
			const input = Array.isArray(body.input) ? body.input : [];
			const events = buildResponsesPayload(body);
			lastRequest = {
				raw,
				body,
				prompt: extractLastUserText(input),
				allInputText: extractAllInputTexts(input),
				toolOutput: extractToolOutput(input),
				model: typeof body.model === "string" ? body.model : "",
				plannedToolName: extractPlannedToolName(events)
			};
			requests.push(lastRequest);
			if (requests.length > 50) requests.splice(0, requests.length - 50);
			if (body.stream === false) {
				const completion = events.at(-1);
				if (!completion || completion.type !== "response.completed") {
					writeJson(res, 500, { error: "mock completion failed" });
					return;
				}
				writeJson(res, 200, completion.response);
				return;
			}
			writeSse(res, events);
			return;
		}
		writeJson(res, 404, { error: "not found" });
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(params?.port ?? 0, host, () => resolve());
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("qa mock openai failed to bind");
	return {
		baseUrl: `http://${host}:${address.port}`,
		async stop() {
			await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
	};
}
//#endregion
//#region extensions/qa-lab/src/gateway-child.ts
async function getFreePort() {
	return await new Promise((resolve, reject) => {
		const server = net.createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(/* @__PURE__ */ new Error("failed to allocate port"));
				return;
			}
			server.close((error) => error ? reject(error) : resolve(address.port));
		});
	});
}
function buildQaRuntimeEnv(params) {
	const env = {
		...process.env,
		HOME: params.homeDir,
		OPENCLAW_HOME: params.homeDir,
		OPENCLAW_CONFIG_PATH: params.configPath,
		OPENCLAW_STATE_DIR: params.stateDir,
		OPENCLAW_OAUTH_DIR: path.join(params.stateDir, "credentials"),
		OPENCLAW_GATEWAY_TOKEN: params.gatewayToken,
		OPENCLAW_SKIP_BROWSER_CONTROL_SERVER: "1",
		OPENCLAW_SKIP_GMAIL_WATCHER: "1",
		OPENCLAW_SKIP_CANVAS_HOST: "1",
		OPENCLAW_NO_RESPAWN: "1",
		OPENCLAW_TEST_FAST: "1",
		XDG_CONFIG_HOME: params.xdgConfigHome,
		XDG_DATA_HOME: params.xdgDataHome,
		XDG_CACHE_HOME: params.xdgCacheHome
	};
	if (params.providerMode === "mock-openai") for (const key of [
		"OPENAI_API_KEY",
		"OPENAI_BASE_URL",
		"GEMINI_API_KEY",
		"GOOGLE_API_KEY",
		"VOYAGE_API_KEY",
		"MISTRAL_API_KEY",
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_SESSION_TOKEN",
		"AWS_REGION",
		"AWS_BEARER_TOKEN_BEDROCK"
	]) delete env[key];
	return env;
}
async function waitForGatewayReady(baseUrl, logs, timeoutMs = 3e4) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		try {
			if ((await fetch(`${baseUrl}/healthz`)).ok) return;
		} catch {}
		await setTimeout$1(250);
	}
	throw new Error(`gateway failed to become healthy:\n${logs()}`);
}
async function runCliJson(params) {
	const stdout = [];
	const stderr = [];
	await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, params.args, {
			cwd: params.cwd,
			env: params.env,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
		child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
		child.once("error", reject);
		child.once("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(/* @__PURE__ */ new Error(`gateway cli failed (${code ?? "unknown"}): ${Buffer.concat(stderr).toString("utf8")}`));
		});
	});
	const text = Buffer.concat(stdout).toString("utf8").trim();
	return text ? JSON.parse(text) : {};
}
async function startQaGatewayChild(params) {
	const tempRoot = await fs$1.mkdtemp(path.join(os.tmpdir(), "openclaw-qa-suite-"));
	const workspaceDir = path.join(tempRoot, "workspace");
	const stateDir = path.join(tempRoot, "state");
	const homeDir = path.join(tempRoot, "home");
	const xdgConfigHome = path.join(tempRoot, "xdg-config");
	const xdgDataHome = path.join(tempRoot, "xdg-data");
	const xdgCacheHome = path.join(tempRoot, "xdg-cache");
	const configPath = path.join(tempRoot, "openclaw.json");
	const gatewayPort = await getFreePort();
	const gatewayToken = `qa-suite-${randomUUID()}`;
	await seedQaAgentWorkspace({
		workspaceDir,
		repoRoot: params.repoRoot
	});
	await Promise.all([
		fs$1.mkdir(stateDir, { recursive: true }),
		fs$1.mkdir(homeDir, { recursive: true }),
		fs$1.mkdir(xdgConfigHome, { recursive: true }),
		fs$1.mkdir(xdgDataHome, { recursive: true }),
		fs$1.mkdir(xdgCacheHome, { recursive: true })
	]);
	const cfg = buildQaGatewayConfig({
		bind: "loopback",
		gatewayPort,
		gatewayToken,
		providerBaseUrl: params.providerBaseUrl,
		qaBusBaseUrl: params.qaBusBaseUrl,
		workspaceDir,
		providerMode: params.providerMode,
		primaryModel: params.primaryModel,
		alternateModel: params.alternateModel,
		fastMode: params.fastMode,
		controlUiEnabled: params.controlUiEnabled
	});
	await fs$1.writeFile(configPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
	const stdout = [];
	const stderr = [];
	const env = buildQaRuntimeEnv({
		configPath,
		gatewayToken,
		homeDir,
		stateDir,
		xdgConfigHome,
		xdgDataHome,
		xdgCacheHome,
		providerMode: params.providerMode
	});
	const child = spawn(process.execPath, [
		"dist/index.js",
		"gateway",
		"run",
		"--port",
		String(gatewayPort),
		"--bind",
		"loopback",
		"--allow-unconfigured"
	], {
		cwd: params.repoRoot,
		env,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	});
	child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
	child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
	const baseUrl = `http://127.0.0.1:${gatewayPort}`;
	const wsUrl = `ws://127.0.0.1:${gatewayPort}`;
	const logs = () => `${Buffer.concat(stdout).toString("utf8")}\n${Buffer.concat(stderr).toString("utf8")}`.trim();
	const keepTemp = process.env.OPENCLAW_QA_KEEP_TEMP === "1";
	try {
		await waitForGatewayReady(baseUrl, logs);
	} catch (error) {
		child.kill("SIGTERM");
		throw error;
	}
	return {
		cfg,
		baseUrl,
		wsUrl,
		token: gatewayToken,
		workspaceDir,
		tempRoot,
		configPath,
		runtimeEnv: env,
		logs,
		async call(method, rpcParams, opts) {
			return await runCliJson({
				cwd: params.repoRoot,
				env,
				args: [
					"dist/index.js",
					"gateway",
					"call",
					method,
					"--url",
					wsUrl,
					"--token",
					gatewayToken,
					"--json",
					"--timeout",
					String(opts?.timeoutMs ?? 2e4),
					...opts?.expectFinal ? ["--expect-final"] : [],
					"--params",
					JSON.stringify(rpcParams ?? {})
				]
			}).catch((error) => {
				const details = error instanceof Error ? error.message : String(error);
				throw new Error(`${details}\nGateway logs:\n${logs()}`);
			});
		},
		async stop(opts) {
			if (!child.killed) {
				child.kill("SIGTERM");
				await Promise.race([new Promise((resolve) => child.once("exit", () => resolve())), setTimeout$1(5e3).then(() => {
					if (!child.killed) child.kill("SIGKILL");
				})]);
			}
			if (!(opts?.keepTemp ?? keepTemp)) await fs$1.rm(tempRoot, {
				recursive: true,
				force: true
			});
		}
	};
}
//#endregion
//#region extensions/qa-lab/src/suite.ts
function splitModelRef(ref) {
	const slash = ref.indexOf("/");
	if (slash <= 0 || slash === ref.length - 1) return null;
	return {
		provider: ref.slice(0, slash),
		model: ref.slice(slash + 1)
	};
}
function liveTurnTimeoutMs(env, fallbackMs) {
	return env.providerMode === "live-openai" ? Math.max(fallbackMs, 12e4) : fallbackMs;
}
function hasDiscoveryLabels(text) {
	const lower = text.toLowerCase();
	return lower.includes("worked") && lower.includes("failed") && lower.includes("blocked") && (lower.includes("follow-up") || lower.includes("follow up"));
}
function reportsMissingDiscoveryFiles(text) {
	const lower = text.toLowerCase();
	return lower.includes("not present") || lower.includes("missing files") || lower.includes("blocked by missing") || lower.includes("could not inspect");
}
function createQaActionConfig(baseUrl) {
	return { channels: { "qa-channel": {
		enabled: true,
		baseUrl,
		botUserId: "openclaw",
		botDisplayName: "OpenClaw QA",
		allowFrom: ["*"]
	} } };
}
async function waitForCondition(check, timeoutMs = 15e3, intervalMs = 100) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const value = await check();
		if (value !== null && value !== void 0) return value;
		await setTimeout$1(intervalMs);
	}
	throw new Error(`timed out after ${timeoutMs}ms`);
}
async function waitForOutboundMessage(state, predicate, timeoutMs = 15e3) {
	return await waitForCondition(() => state.getSnapshot().messages.filter((message) => message.direction === "outbound").find(predicate), timeoutMs);
}
async function waitForNoOutbound(state, timeoutMs = 1200) {
	await setTimeout$1(timeoutMs);
	const outbound = state.getSnapshot().messages.filter((message) => message.direction === "outbound");
	if (outbound.length > 0) throw new Error(`expected no outbound messages, saw ${outbound.length}`);
}
async function runScenario(name, steps) {
	const stepResults = [];
	for (const step of steps) try {
		if (process.env.OPENCLAW_QA_DEBUG === "1") console.error(`[qa-suite] start scenario="${name}" step="${step.name}"`);
		const details = await step.run();
		if (process.env.OPENCLAW_QA_DEBUG === "1") console.error(`[qa-suite] pass scenario="${name}" step="${step.name}"`);
		stepResults.push({
			name: step.name,
			status: "pass",
			...details ? { details } : {}
		});
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		if (process.env.OPENCLAW_QA_DEBUG === "1") console.error(`[qa-suite] fail scenario="${name}" step="${step.name}" details=${details}`);
		stepResults.push({
			name: step.name,
			status: "fail",
			details
		});
		return {
			name,
			status: "fail",
			steps: stepResults,
			details
		};
	}
	return {
		name,
		status: "pass",
		steps: stepResults
	};
}
async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`request failed ${response.status}: ${url}`);
	return await response.json();
}
async function waitForGatewayHealthy(env, timeoutMs = 45e3) {
	await waitForCondition(async () => {
		try {
			return (await fetch(`${env.gateway.baseUrl}/readyz`)).ok ? true : void 0;
		} catch {
			return;
		}
	}, timeoutMs, 250);
}
function isGatewayRestartRace(error) {
	const text = error instanceof Error ? error.message : String(error);
	return text.includes("gateway closed (1012)") || text.includes("gateway closed (1006") || text.includes("abnormal closure") || text.includes("service restart");
}
async function readConfigSnapshot(env) {
	const snapshot = await env.gateway.call("config.get", {});
	if (!snapshot.hash || !snapshot.config) throw new Error("config.get returned no hash/config");
	return {
		hash: snapshot.hash,
		config: snapshot.config
	};
}
async function patchConfig(params) {
	const snapshot = await readConfigSnapshot(params.env);
	try {
		return await params.env.gateway.call("config.patch", {
			raw: JSON.stringify(params.patch, null, 2),
			baseHash: snapshot.hash,
			...params.sessionKey ? { sessionKey: params.sessionKey } : {},
			...params.note ? { note: params.note } : {},
			restartDelayMs: params.restartDelayMs ?? 1e3
		}, { timeoutMs: 45e3 });
	} catch (error) {
		if (!isGatewayRestartRace(error)) throw error;
		await waitForGatewayHealthy(params.env);
		return {
			ok: true,
			restarted: true
		};
	}
}
async function applyConfig(params) {
	const snapshot = await readConfigSnapshot(params.env);
	try {
		return await params.env.gateway.call("config.apply", {
			raw: JSON.stringify(params.nextConfig, null, 2),
			baseHash: snapshot.hash,
			...params.sessionKey ? { sessionKey: params.sessionKey } : {},
			...params.note ? { note: params.note } : {},
			restartDelayMs: params.restartDelayMs ?? 1e3
		}, { timeoutMs: 45e3 });
	} catch (error) {
		if (!isGatewayRestartRace(error)) throw error;
		await waitForGatewayHealthy(params.env);
		return {
			ok: true,
			restarted: true
		};
	}
}
async function createSession(env, label, key) {
	const sessionKey = (await env.gateway.call("sessions.create", {
		label,
		...key ? { key } : {}
	})).key?.trim();
	if (!sessionKey) throw new Error("sessions.create returned no key");
	return sessionKey;
}
async function readEffectiveTools(env, sessionKey) {
	const payload = await env.gateway.call("tools.effective", { sessionKey }, { timeoutMs: liveTurnTimeoutMs(env, 9e4) });
	const ids = /* @__PURE__ */ new Set();
	for (const group of payload.groups ?? []) for (const tool of group.tools ?? []) if (tool.id?.trim()) ids.add(tool.id.trim());
	return ids;
}
async function readSkillStatus(env, agentId = "qa") {
	return (await env.gateway.call("skills.status", { agentId }, { timeoutMs: liveTurnTimeoutMs(env, 45e3) })).skills ?? [];
}
async function runQaCli(env, args, opts) {
	const stdout = [];
	const stderr = [];
	await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, ["dist/index.js", ...args], {
			cwd: process.cwd(),
			env: env.gateway.runtimeEnv,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		const timeout = setTimeout(() => {
			child.kill("SIGKILL");
			reject(/* @__PURE__ */ new Error(`qa cli timed out: openclaw ${args.join(" ")}`));
		}, opts?.timeoutMs ?? 6e4);
		child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
		child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
		child.once("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
		child.once("exit", (code) => {
			clearTimeout(timeout);
			if (code === 0) {
				resolve();
				return;
			}
			reject(/* @__PURE__ */ new Error(`qa cli failed (${code ?? "unknown"}): ${Buffer.concat(stderr).toString("utf8").trim()}`));
		});
	});
	const text = Buffer.concat(stdout).toString("utf8").trim();
	if (!opts?.json) return text;
	return text ? JSON.parse(text) : {};
}
async function forceMemoryIndex(params) {
	await runQaCli(params.env, [
		"memory",
		"index",
		"--agent",
		"qa",
		"--force"
	], { timeoutMs: liveTurnTimeoutMs(params.env, 6e4) });
	const payload = await runQaCli(params.env, [
		"memory",
		"search",
		"--agent",
		"qa",
		"--json",
		"--query",
		params.query
	], {
		timeoutMs: liveTurnTimeoutMs(params.env, 2e4),
		json: true
	});
	const haystack = JSON.stringify(payload.results ?? []);
	if (!haystack.includes(params.expectedNeedle)) throw new Error(`memory index missing expected fact after reindex: ${haystack}`);
}
function findSkill(skills, name) {
	return skills.find((skill) => skill.name === name);
}
async function writeWorkspaceSkill(params) {
	const skillDir = path.join(params.env.gateway.workspaceDir, "skills", params.name);
	await fs$1.mkdir(skillDir, { recursive: true });
	const skillPath = path.join(skillDir, "SKILL.md");
	await fs$1.writeFile(skillPath, `${params.body.trim()}\n`, "utf8");
	return skillPath;
}
async function callPluginToolsMcp(params) {
	const transportEnv = Object.fromEntries(Object.entries(params.env.gateway.runtimeEnv).filter((entry) => typeof entry[1] === "string"));
	const transport = new StdioClientTransport({
		command: process.execPath,
		args: [
			"--import",
			"tsx",
			"src/mcp/plugin-tools-serve.ts"
		],
		stderr: "pipe",
		env: transportEnv
	});
	const client = new Client({
		name: "openclaw-qa-suite",
		version: "0.0.0"
	}, {});
	try {
		await client.connect(transport);
		if (!(await client.listTools()).tools.find((entry) => entry.name === params.toolName)) throw new Error(`MCP tool missing: ${params.toolName}`);
		return await client.callTool({
			name: params.toolName,
			arguments: params.args
		});
	} finally {
		await client.close().catch(() => {});
	}
}
async function runAgentPrompt(env, params) {
	const target = params.to ?? "dm:qa-operator";
	const started = await env.gateway.call("agent", {
		idempotencyKey: randomUUID(),
		agentId: "qa",
		sessionKey: params.sessionKey,
		message: params.message,
		deliver: true,
		channel: "qa-channel",
		to: target,
		replyChannel: "qa-channel",
		replyTo: target,
		...params.threadId ? { threadId: params.threadId } : {},
		...params.provider ? { provider: params.provider } : {},
		...params.model ? { model: params.model } : {}
	}, { timeoutMs: params.timeoutMs ?? 3e4 });
	if (!started.runId) throw new Error(`agent call did not return a runId: ${JSON.stringify(started)}`);
	const waited = await env.gateway.call("agent.wait", {
		runId: started.runId,
		timeoutMs: params.timeoutMs ?? 3e4
	}, { timeoutMs: (params.timeoutMs ?? 3e4) + 5e3 });
	if (waited.status !== "ok") throw new Error(`agent.wait returned ${String(waited.status ?? "unknown")}: ${waited.error ?? "no error"}`);
	return {
		started,
		waited
	};
}
async function handleQaAction(params) {
	return extractQaToolPayload(await qaChannelPlugin.actions?.handleAction?.({
		channel: "qa-channel",
		action: params.action,
		cfg: params.env.cfg,
		accountId: "default",
		params: params.args
	}));
}
function buildScenarioMap(env) {
	const state = env.lab.state;
	const reset = async () => {
		state.reset();
		await setTimeout$1(100);
	};
	return new Map([
		["channel-chat-baseline", async () => await runScenario("Channel baseline conversation", [{
			name: "ignores unmentioned channel chatter",
			run: async () => {
				await reset();
				state.addInboundMessage({
					conversation: {
						id: "qa-room",
						kind: "channel",
						title: "QA Room"
					},
					senderId: "alice",
					senderName: "Alice",
					text: "hello team, no bot ping here"
				});
				await waitForNoOutbound(state);
			}
		}, {
			name: "replies when mentioned in channel",
			run: async () => {
				state.addInboundMessage({
					conversation: {
						id: "qa-room",
						kind: "channel",
						title: "QA Room"
					},
					senderId: "alice",
					senderName: "Alice",
					text: "@openclaw explain the QA lab"
				});
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room" && !candidate.threadId, env.providerMode === "live-openai" ? 45e3 : 45e3)).text;
			}
		}])],
		["cron-one-minute-ping", async () => await runScenario("Cron one-minute ping", [{
			name: "stores a reminder roughly one minute ahead",
			run: async () => {
				await reset();
				const at = new Date(Date.now() + 6e4).toISOString();
				const cronMarker = `QA-CRON-${randomUUID().slice(0, 8)}`;
				const response = await env.gateway.call("cron.add", {
					name: `qa-suite-${randomUUID()}`,
					enabled: true,
					schedule: {
						kind: "at",
						at
					},
					sessionTarget: "isolated",
					wakeMode: "next-heartbeat",
					payload: {
						kind: "agentTurn",
						message: `A QA cron just fired. Send a one-line ping back to the room containing this exact marker: ${cronMarker}`
					},
					delivery: {
						mode: "announce",
						channel: "qa-channel",
						to: "channel:qa-room"
					}
				});
				const scheduledAt = response.schedule?.at ?? at;
				const delta = new Date(scheduledAt).getTime() - Date.now();
				if (delta < 45e3 || delta > 75e3) throw new Error(`expected ~1 minute schedule, got ${delta}ms`);
				globalThis.__qaCronJobId = response.id;
				globalThis.__qaCronMarker = cronMarker;
				return scheduledAt;
			}
		}, {
			name: "forces the reminder through QA channel delivery",
			run: async () => {
				const jobId = globalThis.__qaCronJobId;
				const cronMarker = globalThis.__qaCronMarker;
				if (!jobId) throw new Error("missing cron job id");
				if (!cronMarker) throw new Error("missing cron marker");
				await env.gateway.call("cron.run", {
					id: jobId,
					mode: "force"
				}, { timeoutMs: 3e4 });
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room" && candidate.text.includes(cronMarker), liveTurnTimeoutMs(env, 3e4))).text;
			}
		}])],
		["dm-chat-baseline", async () => await runScenario("DM baseline conversation", [{
			name: "replies coherently in DM",
			run: async () => {
				await reset();
				state.addInboundMessage({
					conversation: {
						id: "alice",
						kind: "direct"
					},
					senderId: "alice",
					senderName: "Alice",
					text: "Hello there, who are you?"
				});
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "alice")).text;
			}
		}])],
		["lobster-invaders-build", async () => await runScenario("Build Lobster Invaders", [{
			name: "creates the artifact after reading context",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:lobster-invaders",
					message: "Read the QA kickoff context first, then build a tiny Lobster Invaders HTML game in this workspace and tell me where it is.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator");
				const artifactPath = path.join(env.gateway.workspaceDir, "lobster-invaders.html");
				if (!(await fs$1.readFile(artifactPath, "utf8")).includes("Lobster Invaders")) throw new Error("missing Lobster Invaders artifact");
				if (env.mock) {
					if (!(await fetchJson(`${env.mock.baseUrl}/debug/requests`)).some((request) => (request.toolOutput ?? "").includes("QA mission"))) throw new Error("expected pre-write read evidence");
				}
				return "lobster-invaders.html";
			}
		}])],
		["memory-recall", async () => await runScenario("Memory recall after context switch", [{
			name: "stores the canary fact",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:memory",
					message: "Please remember this fact for later: the QA canary code is ALPHA-7."
				});
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator")).text;
			}
		}, {
			name: "recalls the same fact later",
			run: async () => {
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:memory",
					message: "What was the QA canary code I asked you to remember earlier?"
				});
				return (await waitForCondition(() => state.getSnapshot().messages.filter((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-operator" && candidate.text.includes("ALPHA-7")).at(-1), 2e4)).text;
			}
		}])],
		["model-switch-follow-up", async () => await runScenario("Model switch follow-up", [{
			name: "runs on the default configured model",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:model-switch",
					message: "Say hello from the default configured model.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator");
				if (env.mock) {
					const request = await fetchJson(`${env.mock.baseUrl}/debug/last-request`);
					return String(request.body?.model ?? "");
				}
				return outbound.text;
			}
		}, {
			name: "switches to the alternate model and continues",
			run: async () => {
				const alternate = splitModelRef(env.alternateModel);
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:model-switch",
					message: "Continue the exchange after switching models and note the handoff.",
					provider: alternate?.provider,
					model: alternate?.model,
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const outbound = await waitForCondition(() => state.getSnapshot().messages.filter((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-operator" && (candidate.text.toLowerCase().includes("switch") || candidate.text.toLowerCase().includes("handoff"))).at(-1), liveTurnTimeoutMs(env, 2e4));
				if (env.mock) {
					const request = await fetchJson(`${env.mock.baseUrl}/debug/last-request`);
					if (request.body?.model !== "gpt-5.4-alt") throw new Error(`expected gpt-5.4-alt, got ${String(request.body?.model ?? "")}`);
				}
				return outbound.text;
			}
		}])],
		["reaction-edit-delete", async () => await runScenario("Reaction, edit, delete lifecycle", [{
			name: "records reaction, edit, and delete actions",
			run: async () => {
				await reset();
				const seed = state.addOutboundMessage({
					to: "channel:qa-room",
					text: "seed message"
				});
				await handleQaAction({
					env,
					action: "react",
					args: {
						messageId: seed.id,
						emoji: "white_check_mark"
					}
				});
				await handleQaAction({
					env,
					action: "edit",
					args: {
						messageId: seed.id,
						text: "seed message (edited)"
					}
				});
				await handleQaAction({
					env,
					action: "delete",
					args: { messageId: seed.id }
				});
				const message = state.readMessage({ messageId: seed.id });
				if (message.reactions.length === 0 || !message.deleted || !message.text.includes("(edited)")) throw new Error("message lifecycle did not persist");
				return message.text;
			}
		}])],
		["source-docs-discovery-report", async () => await runScenario("Source and docs discovery report", [{
			name: "reads seeded material and emits a protocol report",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:discovery",
					message: "Read the seeded docs and source plan. The full repo is mounted under ./repo/. Explicitly inspect repo/qa/seed-scenarios.json, repo/qa/QA_KICKOFF_TASK.md, repo/extensions/qa-lab/src/suite.ts, and repo/docs/help/testing.md, then report grouped into Worked, Failed, Blocked, and Follow-up. Mention at least two extra QA scenarios beyond the seed list.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const outbound = await waitForCondition(() => state.getSnapshot().messages.filter((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-operator" && hasDiscoveryLabels(candidate.text)).at(-1), liveTurnTimeoutMs(env, 2e4), env.providerMode === "live-openai" ? 250 : 100);
				if (reportsMissingDiscoveryFiles(outbound.text)) throw new Error(`discovery report still missed repo files: ${outbound.text}`);
				return outbound.text;
			}
		}])],
		["subagent-handoff", async () => await runScenario("Subagent handoff", [{
			name: "delegates a bounded task and reports the result",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:subagent",
					message: "Delegate one bounded QA task to a subagent. Wait for the subagent to finish. Then reply with three labeled sections exactly once: Delegated task, Result, Evidence. Include the child result itself, not 'waiting'.",
					timeoutMs: liveTurnTimeoutMs(env, 9e4)
				});
				const outbound = await waitForCondition(() => state.getSnapshot().messages.filter((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-operator" && candidate.text.toLowerCase().includes("delegated task") && candidate.text.toLowerCase().includes("result") && candidate.text.toLowerCase().includes("evidence") && !candidate.text.toLowerCase().includes("waiting")).at(-1), liveTurnTimeoutMs(env, 45e3), env.providerMode === "live-openai" ? 250 : 100);
				const lower = outbound.text.toLowerCase();
				if (lower.includes("failed to delegate") || lower.includes("could not delegate") || lower.includes("subagent unavailable")) throw new Error(`subagent handoff reported failure: ${outbound.text}`);
				return outbound.text;
			}
		}])],
		["thread-follow-up", async () => await runScenario("Threaded follow-up", [{
			name: "keeps follow-up inside the thread",
			run: async () => {
				await reset();
				const threadId = (await handleQaAction({
					env,
					action: "thread-create",
					args: {
						channelId: "qa-room",
						title: "QA deep dive"
					}
				}))?.thread?.id;
				if (!threadId) throw new Error("missing thread id");
				state.addInboundMessage({
					conversation: {
						id: "qa-room",
						kind: "channel",
						title: "QA Room"
					},
					senderId: "alice",
					senderName: "Alice",
					text: "@openclaw reply in one short sentence inside this thread only. Do not use ACP or any external runtime. Confirm you stayed in-thread.",
					threadId,
					threadTitle: "QA deep dive"
				});
				const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room" && candidate.threadId === threadId, env.providerMode === "live-openai" ? 45e3 : 15e3);
				if (state.getSnapshot().messages.some((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-room" && !candidate.threadId)) throw new Error("thread reply leaked into root channel");
				const lower = outbound.text.toLowerCase();
				if (lower.includes("acp backend") || lower.includes("acpx") || lower.includes("not configured")) throw new Error(`thread reply fell back to ACP error: ${outbound.text}`);
				return outbound.text;
			}
		}])],
		["memory-tools-channel-context", async () => await runScenario("Memory tools in channel context", [{
			name: "uses memory_search plus memory_get before answering in-channel",
			run: async () => {
				await reset();
				await fs$1.writeFile(path.join(env.gateway.workspaceDir, "MEMORY.md"), "Hidden QA fact: the project codename is ORBIT-9.\n", "utf8");
				await forceMemoryIndex({
					env,
					query: "project codename ORBIT-9",
					expectedNeedle: "ORBIT-9"
				});
				state.addInboundMessage({
					conversation: {
						id: "qa-room",
						kind: "channel",
						title: "QA Room"
					},
					senderId: "alice",
					senderName: "Alice",
					text: "@openclaw Memory tools check: what is the hidden project codename stored only in memory? Use memory tools first."
				});
				const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room" && candidate.text.includes("ORBIT-9"), liveTurnTimeoutMs(env, 3e4));
				if (env.mock) {
					const requests = await fetchJson(`${env.mock.baseUrl}/debug/requests`);
					if (!requests.filter((request) => String(request.allInputText ?? "").includes("Memory tools check")).some((request) => request.plannedToolName === "memory_search")) throw new Error("expected memory_search in mock request plan");
					if (!requests.some((request) => request.plannedToolName === "memory_get")) throw new Error("expected memory_get in mock request plan");
				}
				return outbound.text;
			}
		}])],
		["memory-failure-fallback", async () => await runScenario("Memory failure fallback", [{
			name: "falls back cleanly when group:memory tools are denied",
			run: async () => {
				const original = await readConfigSnapshot(env);
				await fs$1.writeFile(path.join(env.gateway.workspaceDir, "MEMORY.md"), "Do not reveal directly: fallback fact is ORBIT-9.\n", "utf8");
				await patchConfig({
					env,
					patch: { tools: { deny: ["group:memory"] } }
				});
				await waitForGatewayHealthy(env);
				try {
					const tools = await readEffectiveTools(env, await createSession(env, "Memory fallback"));
					if (tools.has("memory_search") || tools.has("memory_get")) throw new Error("memory tools still present after deny patch");
					await reset();
					await runAgentPrompt(env, {
						sessionKey: "agent:qa:memory-failure",
						message: "Memory unavailable check: a hidden fact exists only in memory files. If you cannot confirm it, say so clearly and do not guess.",
						timeoutMs: liveTurnTimeoutMs(env, 3e4)
					});
					const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator", liveTurnTimeoutMs(env, 3e4));
					const lower = outbound.text.toLowerCase();
					if (outbound.text.includes("ORBIT-9")) throw new Error(`hallucinated hidden fact: ${outbound.text}`);
					if (!lower.includes("could not confirm") && !lower.includes("will not guess")) throw new Error(`missing graceful fallback language: ${outbound.text}`);
					return outbound.text;
				} finally {
					await applyConfig({
						env,
						nextConfig: original.config
					});
					await waitForGatewayHealthy(env);
				}
			}
		}])],
		["model-switch-tool-continuity", async () => await runScenario("Model switch with tool continuity", [{
			name: "keeps using tools after switching models",
			run: async () => {
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:model-switch-tools",
					message: "Read QA_KICKOFF_TASK.md and summarize the QA mission in one clause before any model switch.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const alternate = splitModelRef(env.alternateModel);
				const beforeSwitchCursor = state.getSnapshot().messages.length;
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:model-switch-tools",
					message: "Switch models now. Tool continuity check: reread QA_KICKOFF_TASK.md and mention the handoff in one short sentence.",
					provider: alternate?.provider,
					model: alternate?.model,
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const outbound = await waitForCondition(() => {
					return state.getSnapshot().messages.slice(beforeSwitchCursor).filter((candidate) => candidate.direction === "outbound" && candidate.conversation.id === "qa-operator" && (candidate.text.toLowerCase().includes("model switch") || candidate.text.toLowerCase().includes("handoff"))).at(-1);
				}, liveTurnTimeoutMs(env, 3e4));
				if (env.mock) {
					const switched = (await fetchJson(`${env.mock.baseUrl}/debug/requests`)).find((request) => String(request.allInputText ?? "").includes("Tool continuity check"));
					if (switched?.plannedToolName !== "read") throw new Error(`expected read after switch, got ${String(switched?.plannedToolName ?? "")}`);
					if (switched?.model !== "gpt-5.4-alt") throw new Error(`expected alternate model, got ${String(switched?.model ?? "")}`);
				}
				return outbound.text;
			}
		}])],
		["mcp-plugin-tools-call", async () => await runScenario("MCP plugin-tools call", [{
			name: "serves and calls memory_search over MCP",
			run: async () => {
				await fs$1.writeFile(path.join(env.gateway.workspaceDir, "MEMORY.md"), "MCP fact: the codename is ORBIT-9.\n", "utf8");
				await forceMemoryIndex({
					env,
					query: "ORBIT-9 codename",
					expectedNeedle: "ORBIT-9"
				});
				const result = await callPluginToolsMcp({
					env,
					toolName: "memory_search",
					args: {
						query: "ORBIT-9 codename",
						maxResults: 3
					}
				});
				const text = JSON.stringify(result.content ?? []);
				if (!text.includes("ORBIT-9")) throw new Error(`MCP memory_search missed expected fact: ${text}`);
				return text;
			}
		}])],
		["skill-visibility-invocation", async () => await runScenario("Skill visibility and invocation", [{
			name: "reports visible skill and applies its marker on the next turn",
			run: async () => {
				await writeWorkspaceSkill({
					env,
					name: "qa-visible-skill",
					body: `---
name: qa-visible-skill
description: Visible QA skill marker
---
When the user asks for the visible skill marker exactly, reply with exactly: VISIBLE-SKILL-OK`
				});
				const visible = findSkill(await readSkillStatus(env), "qa-visible-skill");
				if (!visible?.eligible || visible.disabled || visible.blockedByAllowlist) throw new Error(`skill not visible/eligible: ${JSON.stringify(visible)}`);
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:visible-skill",
					message: "Visible skill marker: give me the visible skill marker exactly.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator" && candidate.text.includes("VISIBLE-SKILL-OK"), liveTurnTimeoutMs(env, 2e4))).text;
			}
		}])],
		["skill-install-hot-availability", async () => await runScenario("Skill install hot availability", [{
			name: "picks up a newly added workspace skill without restart",
			run: async () => {
				if (findSkill(await readSkillStatus(env), "qa-hot-install-skill")) throw new Error("qa-hot-install-skill unexpectedly already present");
				await writeWorkspaceSkill({
					env,
					name: "qa-hot-install-skill",
					body: `---
name: qa-hot-install-skill
description: Hot install QA marker
---
When the user asks for the hot install marker exactly, reply with exactly: HOT-INSTALL-OK`
				});
				await waitForCondition(async () => {
					return findSkill(await readSkillStatus(env), "qa-hot-install-skill")?.eligible ? true : void 0;
				}, 15e3, 200);
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:hot-skill",
					message: "Hot install marker: give me the hot install marker exactly.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator" && candidate.text.includes("HOT-INSTALL-OK"), liveTurnTimeoutMs(env, 2e4))).text;
			}
		}])],
		["native-image-generation", async () => await runScenario("Native image generation", [{
			name: "enables image_generate and saves a real media artifact",
			run: async () => {
				const imageModelRef = env.providerMode === "live-openai" ? "openai/gpt-image-1" : "mock-openai/gpt-image-1";
				await patchConfig({
					env,
					patch: { agents: { defaults: { imageGenerationModel: { primary: imageModelRef } } } }
				});
				await waitForGatewayHealthy(env);
				if (!(await readEffectiveTools(env, await createSession(env, "Image generation"))).has("image_generate")) throw new Error("image_generate not present after imageGenerationModel patch");
				await reset();
				await runAgentPrompt(env, {
					sessionKey: "agent:qa:image-generate",
					message: "Image generation check: generate a QA lighthouse image and summarize it in one short sentence.",
					timeoutMs: liveTurnTimeoutMs(env, 45e3)
				});
				const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-operator", liveTurnTimeoutMs(env, 45e3));
				if (env.mock) {
					const requests = await fetchJson(`${env.mock.baseUrl}/debug/requests`);
					const imageRequest = requests.find((request) => String(request.allInputText ?? "").includes("Image generation check"));
					if (imageRequest?.plannedToolName !== "image_generate") throw new Error(`expected image_generate, got ${String(imageRequest?.plannedToolName ?? "")}`);
					if (!requests.find((request) => String(request.toolOutput ?? "").includes(`Generated 1 image with ${imageModelRef}.`))) throw new Error("missing mock image generation tool output");
					const mediaPath = /MEDIA:([^\n]+)/.exec(outbound.text)?.[1]?.trim();
					if (!mediaPath) throw new Error("missing MEDIA path in image generation tool output");
					await fs$1.access(mediaPath);
				}
				return outbound.text;
			}
		}])],
		["config-patch-hot-apply", async () => await runScenario("Config patch hot apply", [{
			name: "updates mention routing without restart",
			run: async () => {
				const original = await readConfigSnapshot(env);
				await patchConfig({
					env,
					patch: { messages: { groupChat: { mentionPatterns: ["\\bgoldenbot\\b"] } } }
				});
				await waitForGatewayHealthy(env);
				try {
					await reset();
					const requestsBeforeIgnored = env.mock ? await fetchJson(`${env.mock.baseUrl}/debug/requests`) : null;
					state.addInboundMessage({
						conversation: {
							id: "qa-room",
							kind: "channel",
							title: "QA Room"
						},
						senderId: "alice",
						senderName: "Alice",
						text: "@openclaw you should now be ignored"
					});
					await waitForCondition(async () => {
						if (!env.mock) return await waitForNoOutbound(state), true;
						const requests = await fetchJson(`${env.mock.baseUrl}/debug/requests`);
						if (requests.some((request) => String(request.allInputText ?? "").includes("@openclaw you should now be ignored"))) throw new Error("ignored channel mention still reached the agent");
						return requests.length === requestsBeforeIgnored?.length ? true : void 0;
					}, 3e3, 100);
					state.addInboundMessage({
						conversation: {
							id: "qa-room",
							kind: "channel",
							title: "QA Room"
						},
						senderId: "alice",
						senderName: "Alice",
						text: "goldenbot explain hot config apply"
					});
					const outbound = await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room", liveTurnTimeoutMs(env, 3e4));
					if (env.mock) {
						if (!(await fetchJson(`${env.mock.baseUrl}/debug/requests`)).some((request) => String(request.allInputText ?? "").includes("goldenbot explain hot config apply"))) throw new Error("goldenbot follow-up did not reach the agent after config patch");
					}
					return outbound.text;
				} finally {
					await applyConfig({
						env,
						nextConfig: original.config
					});
					await waitForGatewayHealthy(env);
				}
			}
		}])],
		["config-apply-restart-wakeup", async () => await runScenario("Config apply restart wake-up", [{
			name: "restarts cleanly and posts the restart sentinel back into qa-channel",
			run: async () => {
				await reset();
				const sessionKey = "agent:qa:restart-wakeup";
				await runAgentPrompt(env, {
					sessionKey,
					to: "channel:qa-room",
					message: "Acknowledge restart wake-up setup in qa-room.",
					timeoutMs: liveTurnTimeoutMs(env, 3e4)
				});
				const current = await readConfigSnapshot(env);
				const nextConfig = structuredClone(current.config);
				const gatewayConfig = nextConfig.gateway ??= {};
				const controlUi = gatewayConfig.controlUi ??= {};
				const allowedOrigins = Array.isArray(controlUi.allowedOrigins) ? [...controlUi.allowedOrigins] : [];
				const wakeMarker = `QA-RESTART-${randomUUID().slice(0, 8)}`;
				if (!allowedOrigins.includes("http://127.0.0.1:65535")) allowedOrigins.push("http://127.0.0.1:65535");
				controlUi.allowedOrigins = allowedOrigins;
				await applyConfig({
					env,
					nextConfig,
					sessionKey,
					note: wakeMarker
				});
				await waitForGatewayHealthy(env, 6e4);
				return (await waitForOutboundMessage(state, (candidate) => candidate.conversation.id === "qa-room" && candidate.text.includes(wakeMarker), 6e4)).text;
			}
		}])],
		["runtime-inventory-drift-check", async () => await runScenario("Runtime inventory drift check", [{
			name: "keeps tools.effective and skills.status aligned after config changes",
			run: async () => {
				await writeWorkspaceSkill({
					env,
					name: "qa-drift-skill",
					body: `---
name: qa-drift-skill
description: Drift skill marker
---
When the user asks for the drift skill marker exactly, reply with exactly: DRIFT-SKILL-OK`
				});
				const sessionKey = await createSession(env, "Inventory drift");
				if (!(await readEffectiveTools(env, sessionKey)).has("image_generate")) throw new Error("expected image_generate before drift patch");
				if (!findSkill(await readSkillStatus(env), "qa-drift-skill")?.eligible) throw new Error("expected qa-drift-skill to be eligible before patch");
				await patchConfig({
					env,
					patch: {
						tools: { deny: ["image_generate"] },
						skills: { entries: { "qa-drift-skill": { enabled: false } } }
					}
				});
				await waitForGatewayHealthy(env);
				if ((await readEffectiveTools(env, sessionKey)).has("image_generate")) throw new Error("image_generate still present after deny patch");
				const driftSkill = findSkill(await readSkillStatus(env), "qa-drift-skill");
				if (!driftSkill?.disabled) throw new Error(`expected disabled drift skill, got ${JSON.stringify(driftSkill)}`);
				return `image_generate removed, qa-drift-skill disabled=${String(driftSkill.disabled)}`;
			}
		}])]
	]);
}
async function runQaSuite(params) {
	const startedAt = /* @__PURE__ */ new Date();
	const providerMode = params?.providerMode ?? "mock-openai";
	const fastMode = params?.fastMode ?? providerMode === "live-openai";
	const primaryModel = params?.primaryModel ?? (providerMode === "live-openai" ? "openai/gpt-5.4" : "mock-openai/gpt-5.4");
	const alternateModel = params?.alternateModel ?? (providerMode === "live-openai" ? "openai/gpt-5.4" : "mock-openai/gpt-5.4-alt");
	const outputDir = params?.outputDir ?? path.join(process.cwd(), ".artifacts", "qa-e2e", `suite-${Date.now().toString(36)}`);
	await fs$1.mkdir(outputDir, { recursive: true });
	const lab = await startQaLabServer({
		host: "127.0.0.1",
		port: 0,
		embeddedGateway: "disabled"
	});
	const mock = providerMode === "mock-openai" ? await startQaMockOpenAiServer({
		host: "127.0.0.1",
		port: 0
	}) : null;
	const gateway = await startQaGatewayChild({
		repoRoot: process.cwd(),
		providerBaseUrl: mock ? `${mock.baseUrl}/v1` : void 0,
		qaBusBaseUrl: lab.listenUrl,
		providerMode,
		primaryModel,
		alternateModel,
		fastMode,
		controlUiEnabled: true
	});
	lab.setControlUi({
		controlUiProxyTarget: gateway.baseUrl,
		controlUiToken: gateway.token
	});
	const env = {
		lab,
		mock,
		gateway,
		cfg: createQaActionConfig(lab.listenUrl),
		providerMode,
		primaryModel,
		alternateModel
	};
	try {
		const catalog = readQaBootstrapScenarioCatalog();
		const requestedScenarioIds = params?.scenarioIds ? new Set(params.scenarioIds) : null;
		const selectedCatalogScenarios = requestedScenarioIds ? catalog.scenarios.filter((scenario) => requestedScenarioIds.has(scenario.id)) : catalog.scenarios;
		if (requestedScenarioIds) {
			const foundScenarioIds = new Set(selectedCatalogScenarios.map((scenario) => scenario.id));
			const missingScenarioIds = [...requestedScenarioIds].filter((scenarioId) => !foundScenarioIds.has(scenarioId));
			if (missingScenarioIds.length > 0) throw new Error(`unknown QA scenario id(s): ${missingScenarioIds.join(", ")}`);
		}
		const scenarioMap = buildScenarioMap(env);
		const scenarios = [];
		const liveScenarioOutcomes = selectedCatalogScenarios.map((scenario) => ({
			id: scenario.id,
			name: scenario.title,
			status: "pending"
		}));
		lab.setScenarioRun({
			kind: "suite",
			status: "running",
			startedAt: startedAt.toISOString(),
			scenarios: liveScenarioOutcomes
		});
		for (const [index, scenario] of selectedCatalogScenarios.entries()) {
			const run = scenarioMap.get(scenario.id);
			if (!run) {
				const missingResult = {
					name: scenario.title,
					status: "fail",
					details: `no executable scenario registered for ${scenario.id}`,
					steps: []
				};
				scenarios.push(missingResult);
				liveScenarioOutcomes[index] = {
					id: scenario.id,
					name: scenario.title,
					status: "fail",
					details: missingResult.details,
					steps: [],
					finishedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				lab.setScenarioRun({
					kind: "suite",
					status: "running",
					startedAt: startedAt.toISOString(),
					scenarios: [...liveScenarioOutcomes]
				});
				continue;
			}
			liveScenarioOutcomes[index] = {
				id: scenario.id,
				name: scenario.title,
				status: "running",
				startedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			lab.setScenarioRun({
				kind: "suite",
				status: "running",
				startedAt: startedAt.toISOString(),
				scenarios: [...liveScenarioOutcomes]
			});
			const result = await run();
			scenarios.push(result);
			liveScenarioOutcomes[index] = {
				id: scenario.id,
				name: scenario.title,
				status: result.status,
				details: result.details,
				steps: result.steps,
				startedAt: liveScenarioOutcomes[index]?.startedAt,
				finishedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			lab.setScenarioRun({
				kind: "suite",
				status: "running",
				startedAt: startedAt.toISOString(),
				scenarios: [...liveScenarioOutcomes]
			});
		}
		const finishedAt = /* @__PURE__ */ new Date();
		lab.setScenarioRun({
			kind: "suite",
			status: "completed",
			startedAt: startedAt.toISOString(),
			finishedAt: finishedAt.toISOString(),
			scenarios: [...liveScenarioOutcomes]
		});
		const report = renderQaMarkdownReport({
			title: "OpenClaw QA Scenario Suite",
			startedAt,
			finishedAt,
			checks: [],
			scenarios: scenarios.map((scenario) => ({
				name: scenario.name,
				status: scenario.status,
				details: scenario.details,
				steps: scenario.steps
			})),
			notes: [providerMode === "mock-openai" ? "Runs against qa-channel + qa-lab bus + real gateway child + mock OpenAI provider." : `Runs against qa-channel + qa-lab bus + real gateway child + live OpenAI models (${primaryModel}, ${alternateModel})${fastMode ? " with fast mode enabled" : ""}.`, "Cron uses a one-minute schedule assertion plus forced execution for fast verification."]
		});
		const reportPath = path.join(outputDir, "qa-suite-report.md");
		const summaryPath = path.join(outputDir, "qa-suite-summary.json");
		await fs$1.writeFile(reportPath, report, "utf8");
		await fs$1.writeFile(summaryPath, `${JSON.stringify({
			scenarios,
			counts: {
				total: scenarios.length,
				passed: scenarios.filter((scenario) => scenario.status === "pass").length,
				failed: scenarios.filter((scenario) => scenario.status === "fail").length
			}
		}, null, 2)}\n`, "utf8");
		return {
			outputDir,
			reportPath,
			summaryPath,
			report,
			scenarios,
			watchUrl: lab.baseUrl
		};
	} finally {
		const keepTemp = process.env.OPENCLAW_QA_KEEP_TEMP === "1" || false;
		await gateway.stop({ keepTemp });
		await mock?.stop();
		await lab.stop();
	}
}
//#endregion
export { cloneMessage as A, handleQaBusRequest as C, DEFAULT_ACCOUNT_ID as D, writeJson$1 as E, searchQaBusMessages as F, normalizeConversationFromTarget as M, pollQaBusEvents as N, buildQaBusSnapshot as O, readQaBusMessage as P, createQaBusServer as S, writeError as T, readQaBootstrapScenarioCatalog as _, writeQaDockerHarnessFiles as a, DEFAULT_WAIT_TIMEOUT_MS as b, QA_AGENT_IDENTITY_MARKDOWN as c, runQaE2eSelfCheck as d, runQaLabSelfCheck as f, renderQaMarkdownReport as g, runQaScenario as h, buildQaDockerHarnessImage as i, normalizeAccountId as j, cloneEvent as k, buildQaScenarioPlanMarkdown as l, createQaSelfCheckScenario as m, startQaGatewayChild as n, buildQaGatewayConfig as o, runQaSelfCheckAgainstState as p, startQaMockOpenAiServer as r, seedQaAgentWorkspace as s, runQaSuite as t, startQaLabServer as u, createQaRunnerRuntime as v, startQaBusServer as w, createQaBusWaiterStore as x, createQaBusState as y };
