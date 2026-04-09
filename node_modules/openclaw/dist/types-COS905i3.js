import { n as resolveGlobalSingleton } from "./global-singleton-vftIYBun.js";
import { r as logVerbose } from "./globals-B43CpcZo.js";
import { t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
//#region src/plugins/command-registry-state.ts
const PLUGIN_COMMAND_STATE_KEY = Symbol.for("openclaw.pluginCommandsState");
const getState = () => resolveGlobalSingleton(PLUGIN_COMMAND_STATE_KEY, () => ({
	pluginCommands: /* @__PURE__ */ new Map(),
	registryLocked: false
}));
const getPluginCommandMap = () => getState().pluginCommands;
const pluginCommands = new Proxy(/* @__PURE__ */ new Map(), { get(_target, property) {
	const value = Reflect.get(getPluginCommandMap(), property, getPluginCommandMap());
	return typeof value === "function" ? value.bind(getPluginCommandMap()) : value;
} });
function isPluginCommandRegistryLocked() {
	return getState().registryLocked;
}
function setPluginCommandRegistryLocked(locked) {
	getState().registryLocked = locked;
}
function clearPluginCommands() {
	pluginCommands.clear();
}
function clearPluginCommandsForPlugin(pluginId) {
	for (const [key, cmd] of pluginCommands.entries()) if (cmd.pluginId === pluginId) pluginCommands.delete(key);
}
function resolvePluginNativeName(command, provider) {
	const providerName = provider?.trim().toLowerCase();
	const providerOverride = providerName ? command.nativeNames?.[providerName] : void 0;
	if (typeof providerOverride === "string" && providerOverride.trim()) return providerOverride.trim();
	const defaultOverride = command.nativeNames?.default;
	if (typeof defaultOverride === "string" && defaultOverride.trim()) return defaultOverride.trim();
	return command.name;
}
function getPluginCommandSpecs(provider) {
	const providerName = provider?.trim().toLowerCase();
	if (providerName && getChannelPlugin(providerName)?.commands?.nativeCommandsAutoEnabled !== true) return [];
	return Array.from(pluginCommands.values()).map((cmd) => ({
		name: resolvePluginNativeName(cmd, provider),
		description: cmd.description,
		acceptsArgs: cmd.acceptsArgs ?? false
	}));
}
//#endregion
//#region src/plugins/command-registration.ts
/**
* Reserved command names that plugins cannot override (built-in commands).
*
* Constructed lazily inside validateCommandName to avoid TDZ errors: the
* bundler can place this module's body after call sites within the same
* output chunk, so any module-level const/let would be uninitialized when
* first accessed during plugin registration.
*/
var reservedCommands;
function validateCommandName(name) {
	const trimmed = name.trim().toLowerCase();
	if (!trimmed) return "Command name cannot be empty";
	if (!/^[a-z][a-z0-9_-]*$/.test(trimmed)) return "Command name must start with a letter and contain only letters, numbers, hyphens, and underscores";
	reservedCommands ??= new Set([
		"help",
		"commands",
		"status",
		"whoami",
		"context",
		"btw",
		"stop",
		"restart",
		"reset",
		"new",
		"compact",
		"config",
		"debug",
		"allowlist",
		"activation",
		"skill",
		"subagents",
		"kill",
		"steer",
		"tell",
		"model",
		"models",
		"queue",
		"send",
		"bash",
		"exec",
		"think",
		"verbose",
		"reasoning",
		"elevated",
		"usage"
	]);
	if (reservedCommands.has(trimmed)) return `Command name "${trimmed}" is reserved by a built-in command`;
	return null;
}
/**
* Validate a plugin command definition without registering it.
* Returns an error message if invalid, or null if valid.
* Shared by both the global registration path and snapshot (non-activating) loads.
*/
function validatePluginCommandDefinition(command) {
	if (typeof command.handler !== "function") return "Command handler must be a function";
	if (typeof command.name !== "string") return "Command name must be a string";
	if (typeof command.description !== "string") return "Command description must be a string";
	if (!command.description.trim()) return "Command description cannot be empty";
	const nameError = validateCommandName(command.name.trim());
	if (nameError) return nameError;
	for (const [label, alias] of Object.entries(command.nativeNames ?? {})) {
		if (typeof alias !== "string") continue;
		const aliasError = validateCommandName(alias.trim());
		if (aliasError) return `Native command alias "${label}" invalid: ${aliasError}`;
	}
	for (const [label, message] of Object.entries(command.nativeProgressMessages ?? {})) {
		if (typeof message !== "string") return `Native progress message "${label}" must be a string`;
		if (!message.trim()) return `Native progress message "${label}" cannot be empty`;
	}
	return null;
}
function listPluginInvocationKeys(command) {
	const keys = /* @__PURE__ */ new Set();
	const push = (value) => {
		const normalized = value?.trim().toLowerCase();
		if (!normalized) return;
		keys.add(`/${normalized}`);
	};
	push(command.name);
	for (const alias of Object.values(command.nativeNames ?? {})) if (typeof alias === "string") push(alias);
	return [...keys];
}
function registerPluginCommand(pluginId, command, opts) {
	if (isPluginCommandRegistryLocked()) return {
		ok: false,
		error: "Cannot register commands while processing is in progress"
	};
	const definitionError = validatePluginCommandDefinition(command);
	if (definitionError) return {
		ok: false,
		error: definitionError
	};
	const name = command.name.trim();
	const description = command.description.trim();
	const normalizedCommand = {
		...command,
		name,
		description
	};
	const invocationKeys = listPluginInvocationKeys(normalizedCommand);
	const key = `/${name.toLowerCase()}`;
	for (const invocationKey of invocationKeys) {
		const existing = pluginCommands.get(invocationKey) ?? Array.from(pluginCommands.values()).find((candidate) => listPluginInvocationKeys(candidate).includes(invocationKey));
		if (existing) return {
			ok: false,
			error: `Command "${invocationKey.slice(1)}" already registered by plugin "${existing.pluginId}"`
		};
	}
	pluginCommands.set(key, {
		...normalizedCommand,
		pluginId,
		pluginName: opts?.pluginName,
		pluginRoot: opts?.pluginRoot
	});
	logVerbose(`Registered plugin command: ${key} (plugin: ${pluginId})`);
	return { ok: true };
}
//#endregion
//#region src/plugins/types.ts
const PLUGIN_HOOK_NAMES = [
	"before_model_resolve",
	"before_prompt_build",
	"before_agent_start",
	"before_agent_reply",
	"llm_input",
	"llm_output",
	"agent_end",
	"before_compaction",
	"after_compaction",
	"before_reset",
	"inbound_claim",
	"message_received",
	"message_sending",
	"message_sent",
	"before_tool_call",
	"after_tool_call",
	"tool_result_persist",
	"before_message_write",
	"session_start",
	"session_end",
	"subagent_spawning",
	"subagent_delivery_target",
	"subagent_spawned",
	"subagent_ended",
	"gateway_start",
	"gateway_stop",
	"before_dispatch",
	"reply_dispatch",
	"before_install"
];
const pluginHookNameSet = new Set(PLUGIN_HOOK_NAMES);
const isPluginHookName = (hookName) => typeof hookName === "string" && pluginHookNameSet.has(hookName);
const PROMPT_INJECTION_HOOK_NAMES = ["before_prompt_build", "before_agent_start"];
const promptInjectionHookNameSet = new Set(PROMPT_INJECTION_HOOK_NAMES);
const isPromptInjectionHookName = (hookName) => promptInjectionHookNameSet.has(hookName);
const PLUGIN_PROMPT_MUTATION_RESULT_FIELDS = [
	"systemPrompt",
	"prependContext",
	"prependSystemContext",
	"appendSystemContext"
];
const stripPromptMutationFieldsFromLegacyHookResult = (result) => {
	if (!result || typeof result !== "object") return result;
	const remaining = { ...result };
	for (const field of PLUGIN_PROMPT_MUTATION_RESULT_FIELDS) delete remaining[field];
	return Object.keys(remaining).length > 0 ? remaining : void 0;
};
const PluginApprovalResolutions = {
	ALLOW_ONCE: "allow-once",
	ALLOW_ALWAYS: "allow-always",
	DENY: "deny",
	TIMEOUT: "timeout",
	CANCELLED: "cancelled"
};
//#endregion
export { isPluginHookName as a, listPluginInvocationKeys as c, validatePluginCommandDefinition as d, clearPluginCommands as f, setPluginCommandRegistryLocked as g, pluginCommands as h, PluginApprovalResolutions as i, registerPluginCommand as l, getPluginCommandSpecs as m, PLUGIN_PROMPT_MUTATION_RESULT_FIELDS as n, isPromptInjectionHookName as o, clearPluginCommandsForPlugin as p, PROMPT_INJECTION_HOOK_NAMES as r, stripPromptMutationFieldsFromLegacyHookResult as s, PLUGIN_HOOK_NAMES as t, validateCommandName as u };
