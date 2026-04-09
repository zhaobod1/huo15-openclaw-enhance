import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { Readable, Writable } from "node:stream";
//#region extensions/lobster/src/lobster-runner.ts
function normalizeForCwdSandbox(p) {
	const normalized = path.normalize(p);
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
function resolveLobsterCwd(cwdRaw) {
	if (typeof cwdRaw !== "string" || !cwdRaw.trim()) return process.cwd();
	const cwd = cwdRaw.trim();
	if (path.isAbsolute(cwd)) throw new Error("cwd must be a relative path");
	const base = process.cwd();
	const resolved = path.resolve(base, cwd);
	const rel = path.relative(normalizeForCwdSandbox(base), normalizeForCwdSandbox(resolved));
	if (rel === "" || rel === ".") return resolved;
	if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("cwd must stay within the gateway working directory");
	return resolved;
}
function createLimitedSink(maxBytes, label) {
	let bytes = 0;
	return new Writable({ write(chunk, _encoding, callback) {
		bytes += Buffer.byteLength(String(chunk), "utf8");
		if (bytes > maxBytes) {
			callback(/* @__PURE__ */ new Error(`lobster ${label} exceeded maxStdoutBytes`));
			return;
		}
		callback();
	} });
}
function normalizeEnvelope(envelope) {
	if (envelope.ok) return {
		ok: true,
		status: envelope.status ?? "ok",
		output: Array.isArray(envelope.output) ? envelope.output : [],
		requiresApproval: envelope.requiresApproval ? {
			type: "approval_request",
			prompt: envelope.requiresApproval.prompt,
			items: envelope.requiresApproval.items,
			...envelope.requiresApproval.resumeToken ? { resumeToken: envelope.requiresApproval.resumeToken } : {}
		} : null
	};
	return {
		ok: false,
		error: {
			type: envelope.error?.type,
			message: envelope.error?.message ?? "lobster runtime failed"
		}
	};
}
function throwOnErrorEnvelope(envelope) {
	if (envelope.ok) return envelope;
	throw new Error(envelope.error.message);
}
function asApprovalRequestItem(item) {
	if (!item || typeof item !== "object") return null;
	const candidate = item;
	if (candidate.type !== "approval_request") return null;
	if (typeof candidate.prompt !== "string" || !Array.isArray(candidate.items)) return null;
	return candidate;
}
async function resolveWorkflowFile(candidate, cwd) {
	const { stat } = await import("node:fs/promises");
	const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
	if (!(await stat(resolved)).isFile()) throw new Error("Workflow path is not a file");
	const ext = path.extname(resolved).toLowerCase();
	if (![
		".lobster",
		".yaml",
		".yml",
		".json"
	].includes(ext)) throw new Error("Workflow file must end in .lobster, .yaml, .yml, or .json");
	return resolved;
}
async function detectWorkflowFile(candidate, cwd) {
	const trimmed = candidate.trim();
	if (!trimmed || trimmed.includes("|")) return null;
	try {
		return await resolveWorkflowFile(trimmed, cwd);
	} catch {
		return null;
	}
}
function parseWorkflowArgs(argsJson) {
	return JSON.parse(argsJson);
}
function createEmbeddedToolContext(params, signal) {
	const env = { ...process.env };
	return {
		cwd: params.cwd,
		env,
		mode: "tool",
		stdin: Readable.from([]),
		stdout: createLimitedSink(Math.max(1024, params.maxStdoutBytes), "stdout"),
		stderr: createLimitedSink(Math.max(1024, params.maxStdoutBytes), "stderr"),
		signal
	};
}
async function withTimeout(timeoutMs, fn) {
	const timeout = Math.max(200, timeoutMs);
	const controller = new AbortController();
	return await new Promise((resolve, reject) => {
		const onTimeout = () => {
			const error = /* @__PURE__ */ new Error("lobster runtime timed out");
			controller.abort(error);
			reject(error);
		};
		const timer = setTimeout(onTimeout, timeout);
		fn(controller.signal).then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}
function createFallbackEmbeddedToolRuntime(deps) {
	const createToolContext = (ctx = {}) => ({
		cwd: ctx.cwd ?? process.cwd(),
		env: {
			...process.env,
			...ctx.env
		},
		mode: "tool",
		stdin: ctx.stdin ?? Readable.from([]),
		stdout: ctx.stdout ?? createLimitedSink(512e3, "stdout"),
		stderr: ctx.stderr ?? createLimitedSink(512e3, "stderr"),
		signal: ctx.signal,
		registry: ctx.registry ?? deps.createDefaultRegistry(),
		llmAdapters: ctx.llmAdapters
	});
	const okEnvelope = (status, output, requiresApproval) => ({
		protocolVersion: 1,
		ok: true,
		status,
		output,
		requiresApproval
	});
	const errorEnvelope = (type, message) => ({
		protocolVersion: 1,
		ok: false,
		error: {
			type,
			message
		}
	});
	const streamFromItems = (items) => (async function* () {
		for (const item of items) yield item;
	})();
	const savePipelineResumeState = async (env, state) => {
		const stateKey = `pipeline_resume_${randomUUID()}`;
		await deps.writeStateJson({
			env,
			key: stateKey,
			value: state
		});
		return stateKey;
	};
	const loadPipelineResumeState = async (env, stateKey) => {
		const stored = await deps.readStateJson({
			env,
			key: stateKey
		});
		if (!stored || typeof stored !== "object") throw new Error("Pipeline resume state not found");
		const data = stored;
		if (!Array.isArray(data.pipeline)) throw new Error("Invalid pipeline resume state");
		if (typeof data.resumeAtIndex !== "number") throw new Error("Invalid pipeline resume state");
		if (!Array.isArray(data.items)) throw new Error("Invalid pipeline resume state");
		return data;
	};
	return {
		async runToolRequest({ pipeline, filePath, args, ctx = {} }) {
			const runtime = createToolContext(ctx);
			const hasPipeline = typeof pipeline === "string" && pipeline.trim().length > 0;
			const hasFile = typeof filePath === "string" && filePath.trim().length > 0;
			if (!hasPipeline && !hasFile) return errorEnvelope("parse_error", "run requires either pipeline or filePath");
			if (hasPipeline && hasFile) return errorEnvelope("parse_error", "run accepts either pipeline or filePath, not both");
			if (hasFile) try {
				const output = await deps.runWorkflowFile({
					filePath,
					args,
					ctx: runtime
				});
				if (output.status === "needs_approval") return okEnvelope("needs_approval", [], output.requiresApproval ?? null);
				if (output.status === "cancelled") return okEnvelope("cancelled", [], null);
				return okEnvelope("ok", output.output, null);
			} catch (error) {
				return errorEnvelope("runtime_error", error instanceof Error ? error.message : String(error));
			}
			let parsed;
			try {
				parsed = deps.parsePipeline(String(pipeline));
			} catch (error) {
				return errorEnvelope("parse_error", error instanceof Error ? error.message : String(error));
			}
			try {
				const output = await deps.runPipeline({
					pipeline: parsed,
					registry: runtime.registry,
					input: [],
					stdin: runtime.stdin,
					stdout: runtime.stdout,
					stderr: runtime.stderr,
					env: runtime.env,
					mode: "tool",
					cwd: runtime.cwd,
					llmAdapters: runtime.llmAdapters,
					signal: runtime.signal
				});
				const approval = output.halted && output.items.length === 1 ? asApprovalRequestItem(output.items[0]) : null;
				if (approval) {
					const stateKey = await savePipelineResumeState(runtime.env, {
						pipeline: parsed,
						resumeAtIndex: (output.haltedAt?.index ?? -1) + 1,
						items: approval.items,
						prompt: approval.prompt,
						createdAt: (/* @__PURE__ */ new Date()).toISOString()
					});
					const resumeToken = deps.encodeToken({
						protocolVersion: 1,
						v: 1,
						kind: "pipeline-resume",
						stateKey
					});
					return okEnvelope("needs_approval", [], {
						type: "approval_request",
						prompt: approval.prompt,
						items: approval.items,
						resumeToken
					});
				}
				return okEnvelope("ok", output.items, null);
			} catch (error) {
				return errorEnvelope("runtime_error", error instanceof Error ? error.message : String(error));
			}
		},
		async resumeToolRequest({ token, approved, ctx = {} }) {
			const runtime = createToolContext(ctx);
			let payload;
			try {
				payload = deps.decodeResumeToken(token);
			} catch (error) {
				return errorEnvelope("parse_error", error instanceof Error ? error.message : String(error));
			}
			if (!approved) {
				if (payload.kind === "workflow-file" && payload.stateKey) await deps.deleteStateJson({
					env: runtime.env,
					key: payload.stateKey
				});
				if (payload.kind === "pipeline-resume" && payload.stateKey) await deps.deleteStateJson({
					env: runtime.env,
					key: payload.stateKey
				});
				return okEnvelope("cancelled", [], null);
			}
			if (payload.kind === "workflow-file" && payload.filePath) try {
				const output = await deps.runWorkflowFile({
					filePath: payload.filePath,
					ctx: runtime,
					resume: payload,
					approved: true
				});
				if (output.status === "needs_approval") return okEnvelope("needs_approval", [], output.requiresApproval ?? null);
				if (output.status === "cancelled") return okEnvelope("cancelled", [], null);
				return okEnvelope("ok", output.output, null);
			} catch (error) {
				return errorEnvelope("runtime_error", error instanceof Error ? error.message : String(error));
			}
			try {
				const resumeState = await loadPipelineResumeState(runtime.env, payload.stateKey ?? "");
				const remaining = resumeState.pipeline.slice(resumeState.resumeAtIndex);
				const output = await deps.runPipeline({
					pipeline: remaining,
					registry: runtime.registry,
					input: streamFromItems(resumeState.items),
					stdin: runtime.stdin,
					stdout: runtime.stdout,
					stderr: runtime.stderr,
					env: runtime.env,
					mode: "tool",
					cwd: runtime.cwd,
					llmAdapters: runtime.llmAdapters,
					signal: runtime.signal
				});
				const approval = output.halted && output.items.length === 1 ? asApprovalRequestItem(output.items[0]) : null;
				if (approval) {
					const nextStateKey = await savePipelineResumeState(runtime.env, {
						pipeline: remaining,
						resumeAtIndex: (output.haltedAt?.index ?? -1) + 1,
						items: approval.items,
						prompt: approval.prompt,
						createdAt: (/* @__PURE__ */ new Date()).toISOString()
					});
					if (payload.stateKey) await deps.deleteStateJson({
						env: runtime.env,
						key: payload.stateKey
					});
					const resumeToken = deps.encodeToken({
						protocolVersion: 1,
						v: 1,
						kind: "pipeline-resume",
						stateKey: nextStateKey
					});
					return okEnvelope("needs_approval", [], {
						type: "approval_request",
						prompt: approval.prompt,
						items: approval.items,
						resumeToken
					});
				}
				if (payload.stateKey) await deps.deleteStateJson({
					env: runtime.env,
					key: payload.stateKey
				});
				return okEnvelope("ok", output.items, null);
			} catch (error) {
				return errorEnvelope("runtime_error", error instanceof Error ? error.message : String(error));
			}
		}
	};
}
async function importInstalledLobsterModule(lobsterRoot, relativePath) {
	return await import(pathToFileURL(path.join(lobsterRoot, relativePath)).href);
}
function resolveInstalledLobsterRoot() {
	const sdkEntry = createRequire(import.meta.url).resolve("@clawdbot/lobster");
	let currentDir = path.dirname(sdkEntry);
	while (true) {
		if (existsSync(path.join(currentDir, "package.json"))) return currentDir;
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) throw new Error("Unable to resolve the installed @clawdbot/lobster package root");
		currentDir = parentDir;
	}
}
async function loadEmbeddedToolRuntimeFromPackage() {
	const lobsterRoot = resolveInstalledLobsterRoot();
	const coreIndexPath = path.join(lobsterRoot, "dist/src/core/index.js");
	try {
		const core = await import(pathToFileURL(coreIndexPath).href);
		if (typeof core.runToolRequest === "function" && typeof core.resumeToolRequest === "function") return {
			runToolRequest: core.runToolRequest,
			resumeToolRequest: core.resumeToolRequest
		};
	} catch {}
	const [registryModule, parserModule, resumeModule, tokenModule, runtimeModule, workflowModule, storeModule] = await Promise.all([
		importInstalledLobsterModule(lobsterRoot, "dist/src/commands/registry.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/parser.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/resume.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/token.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/runtime.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/workflows/file.js"),
		importInstalledLobsterModule(lobsterRoot, "dist/src/state/store.js")
	]);
	return createFallbackEmbeddedToolRuntime({
		createDefaultRegistry: registryModule.createDefaultRegistry,
		parsePipeline: parserModule.parsePipeline,
		decodeResumeToken: resumeModule.decodeResumeToken,
		encodeToken: tokenModule.encodeToken,
		runPipeline: runtimeModule.runPipeline,
		runWorkflowFile: workflowModule.runWorkflowFile,
		readStateJson: storeModule.readStateJson,
		writeStateJson: storeModule.writeStateJson,
		deleteStateJson: storeModule.deleteStateJson
	});
}
function createEmbeddedLobsterRunner(options) {
	const loadRuntime = options?.loadRuntime ?? loadEmbeddedToolRuntimeFromPackage;
	let runtimePromise;
	const getRuntime = () => {
		runtimePromise ??= loadRuntime().catch((error) => {
			runtimePromise = void 0;
			throw error;
		});
		return runtimePromise;
	};
	return { async run(params) {
		const runtime = await getRuntime();
		return await withTimeout(params.timeoutMs, async (signal) => {
			const ctx = createEmbeddedToolContext(params, signal);
			if (params.action === "run") {
				const pipeline = params.pipeline?.trim() ?? "";
				if (!pipeline) throw new Error("pipeline required");
				const filePath = await detectWorkflowFile(pipeline, params.cwd);
				if (filePath) {
					const parsedArgsJson = params.argsJson?.trim() ?? "";
					let args;
					if (parsedArgsJson) try {
						args = parseWorkflowArgs(parsedArgsJson);
					} catch {
						throw new Error("run --args-json must be valid JSON");
					}
					return throwOnErrorEnvelope(normalizeEnvelope(await runtime.runToolRequest({
						filePath,
						args,
						ctx
					})));
				}
				return throwOnErrorEnvelope(normalizeEnvelope(await runtime.runToolRequest({
					pipeline,
					ctx
				})));
			}
			const token = params.token?.trim() ?? "";
			if (!token) throw new Error("token required");
			if (typeof params.approve !== "boolean") throw new Error("approve required");
			return throwOnErrorEnvelope(normalizeEnvelope(await runtime.resumeToolRequest({
				token,
				approved: params.approve,
				ctx
			})));
		});
	} };
}
//#endregion
//#region extensions/lobster/src/lobster-taskflow.ts
function toJsonLike(value, seen = /* @__PURE__ */ new WeakSet()) {
	if (value === null) return null;
	switch (typeof value) {
		case "boolean":
		case "string": return value;
		case "number": return Number.isFinite(value) ? value : String(value);
		case "bigint": return value.toString();
		case "undefined":
		case "function":
		case "symbol": return null;
		case "object": {
			if (value instanceof Date) return value.toISOString();
			if (Array.isArray(value)) return value.map((item) => toJsonLike(item, seen));
			if (seen.has(value)) return "[Circular]";
			seen.add(value);
			const jsonObject = {};
			for (const [key, entry] of Object.entries(value)) {
				if (entry === void 0 || typeof entry === "function" || typeof entry === "symbol") continue;
				jsonObject[key] = toJsonLike(entry, seen);
			}
			seen.delete(value);
			return jsonObject;
		}
	}
	return null;
}
function buildApprovalWaitState(envelope) {
	if (!envelope.requiresApproval) return {
		kind: "lobster_approval",
		prompt: "",
		items: []
	};
	return {
		kind: "lobster_approval",
		prompt: envelope.requiresApproval.prompt,
		items: envelope.requiresApproval.items.map((item) => toJsonLike(item)),
		...envelope.requiresApproval.resumeToken ? { resumeToken: envelope.requiresApproval.resumeToken } : {}
	};
}
function applyEnvelopeToFlow(params) {
	const { taskFlow, flow, envelope, waitingStep } = params;
	if (!envelope.ok) return taskFlow.fail({
		flowId: flow.flowId,
		expectedRevision: flow.revision
	});
	if (envelope.status === "needs_approval") return taskFlow.setWaiting({
		flowId: flow.flowId,
		expectedRevision: flow.revision,
		currentStep: waitingStep,
		waitJson: buildApprovalWaitState(envelope)
	});
	return taskFlow.finish({
		flowId: flow.flowId,
		expectedRevision: flow.revision
	});
}
function buildEnvelopeError(envelope) {
	return new Error(envelope.error.message);
}
async function runManagedLobsterFlow(params) {
	const flow = params.taskFlow.createManaged({
		controllerId: params.controllerId,
		goal: params.goal,
		currentStep: params.currentStep ?? "run_lobster",
		...params.stateJson !== void 0 ? { stateJson: params.stateJson } : {}
	});
	try {
		const envelope = await params.runner.run(params.runnerParams);
		const mutation = applyEnvelopeToFlow({
			taskFlow: params.taskFlow,
			flow,
			envelope,
			waitingStep: params.waitingStep ?? "await_lobster_approval"
		});
		if (!envelope.ok) return {
			ok: false,
			flow,
			mutation,
			error: buildEnvelopeError(envelope)
		};
		return {
			ok: true,
			envelope,
			flow,
			mutation
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		try {
			return {
				ok: false,
				flow,
				mutation: params.taskFlow.fail({
					flowId: flow.flowId,
					expectedRevision: flow.revision
				}),
				error: err
			};
		} catch {
			return {
				ok: false,
				flow,
				error: err
			};
		}
	}
}
async function resumeManagedLobsterFlow(params) {
	const resumed = params.taskFlow.resume({
		flowId: params.flowId,
		expectedRevision: params.expectedRevision,
		status: "running",
		currentStep: params.currentStep ?? "resume_lobster"
	});
	if (!resumed.applied) return {
		ok: false,
		mutation: resumed,
		error: /* @__PURE__ */ new Error(`TaskFlow resume failed: ${resumed.code}`)
	};
	try {
		const envelope = await params.runner.run(params.runnerParams);
		const mutation = applyEnvelopeToFlow({
			taskFlow: params.taskFlow,
			flow: resumed.flow,
			envelope,
			waitingStep: params.waitingStep ?? "await_lobster_approval"
		});
		if (!envelope.ok) return {
			ok: false,
			flow: resumed.flow,
			mutation,
			error: buildEnvelopeError(envelope)
		};
		return {
			ok: true,
			envelope,
			flow: resumed.flow,
			mutation
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		try {
			const mutation = params.taskFlow.fail({
				flowId: params.flowId,
				expectedRevision: resumed.flow.revision
			});
			return {
				ok: false,
				flow: resumed.flow,
				mutation,
				error: err
			};
		} catch {
			return {
				ok: false,
				flow: resumed.flow,
				error: err
			};
		}
	}
}
//#endregion
//#region extensions/lobster/src/lobster-tool.ts
function readOptionalTrimmedString(value, fieldName) {
	if (value === void 0) return;
	if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
	const trimmed = value.trim();
	return trimmed ? trimmed : void 0;
}
function readOptionalNumber(value, fieldName) {
	if (value === void 0) return;
	if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${fieldName} must be an integer`);
	return value;
}
function readOptionalBoolean(value, fieldName) {
	if (value === void 0) return;
	if (typeof value !== "boolean") throw new Error(`${fieldName} must be a boolean`);
	return value;
}
function parseOptionalFlowStateJson(value) {
	if (value === void 0) return;
	if (typeof value !== "string") throw new Error("flowStateJson must be a JSON string");
	try {
		return JSON.parse(value);
	} catch {
		throw new Error("flowStateJson must be valid JSON");
	}
}
function parseRunFlowParams(params) {
	const controllerId = readOptionalTrimmedString(params.flowControllerId, "flowControllerId");
	const goal = readOptionalTrimmedString(params.flowGoal, "flowGoal");
	const currentStep = readOptionalTrimmedString(params.flowCurrentStep, "flowCurrentStep");
	const waitingStep = readOptionalTrimmedString(params.flowWaitingStep, "flowWaitingStep");
	const stateJson = parseOptionalFlowStateJson(params.flowStateJson);
	const resumeFlowId = readOptionalTrimmedString(params.flowId, "flowId");
	const resumeRevision = readOptionalNumber(params.flowExpectedRevision, "flowExpectedRevision");
	if (!(controllerId !== void 0 || goal !== void 0 || currentStep !== void 0 || waitingStep !== void 0 || stateJson !== void 0)) return null;
	if (resumeFlowId !== void 0 || resumeRevision !== void 0) throw new Error("run action does not accept flowId or flowExpectedRevision");
	if (!controllerId) throw new Error("flowControllerId required when using managed TaskFlow run mode");
	if (!goal) throw new Error("flowGoal required when using managed TaskFlow run mode");
	return {
		controllerId,
		goal,
		...currentStep ? { currentStep } : {},
		...waitingStep ? { waitingStep } : {},
		...stateJson !== void 0 ? { stateJson } : {}
	};
}
function parseResumeFlowParams(params) {
	const flowId = readOptionalTrimmedString(params.flowId, "flowId");
	const expectedRevision = readOptionalNumber(params.flowExpectedRevision, "flowExpectedRevision");
	const currentStep = readOptionalTrimmedString(params.flowCurrentStep, "flowCurrentStep");
	const waitingStep = readOptionalTrimmedString(params.flowWaitingStep, "flowWaitingStep");
	const token = readOptionalTrimmedString(params.token, "token");
	const approve = readOptionalBoolean(params.approve, "approve");
	const runControllerId = readOptionalTrimmedString(params.flowControllerId, "flowControllerId");
	const runGoal = readOptionalTrimmedString(params.flowGoal, "flowGoal");
	const stateJson = params.flowStateJson;
	if (!(flowId !== void 0 || expectedRevision !== void 0 || currentStep !== void 0 || waitingStep !== void 0)) return null;
	if (runControllerId !== void 0 || runGoal !== void 0 || stateJson !== void 0) throw new Error("resume action does not accept flowControllerId, flowGoal, or flowStateJson");
	if (!flowId) throw new Error("flowId required when using managed TaskFlow resume mode");
	if (expectedRevision === void 0) throw new Error("flowExpectedRevision required when using managed TaskFlow resume mode");
	if (!token) throw new Error("token required when using managed TaskFlow resume mode");
	if (approve === void 0) throw new Error("approve required when using managed TaskFlow resume mode");
	return {
		flowId,
		expectedRevision,
		...currentStep ? { currentStep } : {},
		...waitingStep ? { waitingStep } : {}
	};
}
function createLobsterTool(api, options) {
	const runner = options?.runner ?? createEmbeddedLobsterRunner();
	return {
		name: "lobster",
		label: "Lobster Workflow",
		description: "Run Lobster pipelines as a local-first workflow runtime (typed JSON envelope + resumable approvals).",
		parameters: Type.Object({
			action: Type.Unsafe({
				type: "string",
				enum: ["run", "resume"]
			}),
			pipeline: Type.Optional(Type.String()),
			argsJson: Type.Optional(Type.String()),
			token: Type.Optional(Type.String()),
			approve: Type.Optional(Type.Boolean()),
			cwd: Type.Optional(Type.String({ description: "Relative working directory (optional). Must stay within the gateway working directory." })),
			timeoutMs: Type.Optional(Type.Number()),
			maxStdoutBytes: Type.Optional(Type.Number()),
			flowControllerId: Type.Optional(Type.String()),
			flowGoal: Type.Optional(Type.String()),
			flowStateJson: Type.Optional(Type.String()),
			flowId: Type.Optional(Type.String()),
			flowExpectedRevision: Type.Optional(Type.Number()),
			flowCurrentStep: Type.Optional(Type.String()),
			flowWaitingStep: Type.Optional(Type.String())
		}),
		async execute(_id, params) {
			const action = typeof params.action === "string" ? params.action.trim() : "";
			if (!action) throw new Error("action required");
			if (action !== "run" && action !== "resume") throw new Error(`Unknown action: ${action}`);
			const cwd = resolveLobsterCwd(params.cwd);
			const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 2e4;
			const maxStdoutBytes = typeof params.maxStdoutBytes === "number" ? params.maxStdoutBytes : 512e3;
			if (api.runtime?.version && api.logger?.debug) api.logger.debug(`lobster plugin runtime=${api.runtime.version}`);
			const runnerParams = {
				action,
				...typeof params.pipeline === "string" ? { pipeline: params.pipeline } : {},
				...typeof params.argsJson === "string" ? { argsJson: params.argsJson } : {},
				...typeof params.token === "string" ? { token: params.token } : {},
				...typeof params.approve === "boolean" ? { approve: params.approve } : {},
				cwd,
				timeoutMs,
				maxStdoutBytes
			};
			const taskFlow = options?.taskFlow;
			if (action === "run") {
				const flowParams = parseRunFlowParams(params);
				if (flowParams) {
					if (!taskFlow) throw new Error("Managed TaskFlow run mode requires a bound taskFlow runtime");
					const result = await runManagedLobsterFlow({
						taskFlow,
						runner,
						runnerParams,
						controllerId: flowParams.controllerId,
						goal: flowParams.goal,
						...flowParams.stateJson !== void 0 ? { stateJson: flowParams.stateJson } : {},
						...flowParams.currentStep ? { currentStep: flowParams.currentStep } : {},
						...flowParams.waitingStep ? { waitingStep: flowParams.waitingStep } : {}
					});
					if (!result.ok) throw result.error;
					const details = {
						...result.envelope,
						flow: result.flow,
						mutation: result.mutation
					};
					return {
						content: [{
							type: "text",
							text: JSON.stringify(details, null, 2)
						}],
						details
					};
				}
			} else {
				const flowParams = parseResumeFlowParams(params);
				if (flowParams) {
					if (!taskFlow) throw new Error("Managed TaskFlow resume mode requires a bound taskFlow runtime");
					const result = await resumeManagedLobsterFlow({
						taskFlow,
						runner,
						runnerParams,
						flowId: flowParams.flowId,
						expectedRevision: flowParams.expectedRevision,
						...flowParams.currentStep ? { currentStep: flowParams.currentStep } : {},
						...flowParams.waitingStep ? { waitingStep: flowParams.waitingStep } : {}
					});
					if (!result.ok) throw result.error;
					const details = {
						...result.envelope,
						flow: result.flow,
						mutation: result.mutation
					};
					return {
						content: [{
							type: "text",
							text: JSON.stringify(details, null, 2)
						}],
						details
					};
				}
			}
			const envelope = await runner.run(runnerParams);
			if (!envelope.ok) throw new Error(envelope.error.message);
			return {
				content: [{
					type: "text",
					text: JSON.stringify(envelope, null, 2)
				}],
				details: envelope
			};
		}
	};
}
//#endregion
//#region extensions/lobster/index.ts
var lobster_default = definePluginEntry({
	id: "lobster",
	name: "Lobster",
	description: "Optional local shell helper tools",
	register(api) {
		api.registerTool(((ctx) => {
			if (ctx.sandboxed) return null;
			return createLobsterTool(api, { taskFlow: api.runtime?.taskFlow && ctx.sessionKey ? api.runtime.taskFlow.fromToolContext(ctx) : void 0 });
		}), { optional: true });
	}
});
//#endregion
export { lobster_default as default };
