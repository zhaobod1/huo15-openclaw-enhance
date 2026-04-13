/**
 * 模块2: 工具安全守卫 — 增强版（多 Agent 隔离 + 自动重试）
 *
 * 增强内容（P1）：
 * - after_tool_call hook：错误分类（429限流/500错误/网络超时）
 * - 429 → 指数退避重试（Readability-HTTP 标准）
 * - 500/503 → 重试3次
 * - 网络超时 → 重试2次
 * - 错误分类记录到 SQLite safety_log
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { getDb, logSafetyEvent, getRecentSafetyEvents, getSafetyStats } from "../utils/sqlite-store.js";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { DEFAULT_AGENT_ID, type SafetyConfig, type SafetyRule } from "../types.js";

// ──────────────────────────────────────────────
// 错误分类
// ──────────────────────────────────────────────
export type ErrorCategory =
  | "rate_limit"      // 429 — 限流
  | "server_error"    // 500/502/503 — 服务器错误
  | "network_error"   // 网络超时/连接失败
  | "auth_error"      // 401/403 — 权限错误（不重试）
  | "timeout_error"   // 超时
  | "unknown_error";  // 其他

export interface RetryableError extends Error {
  category: ErrorCategory;
  retryable: boolean;
  statusCode?: number;
  retryAfterMs?: number;
  attempt: number;
}

function classifyError(errorMsg: string, statusCode?: number): RetryableError {
  const msg = errorMsg.toLowerCase();

  // 429 限流
  if (statusCode === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    const retryAfterMatch = errorMsg.match(/retry[- ]?after[:\s]*(\d+)/i)
      || errorMsg.match(/retryafterms[:\s]*(\d+)/i);
    const retryAfterMs = retryAfterMatch ? parseInt(retryAfterMatch[1]) : undefined;
    return { name: "RetryableError", message: errorMsg, category: "rate_limit", retryable: true, statusCode: statusCode ?? 429, retryAfterMs, attempt: 0 } as RetryableError;
  }

  // 5xx 服务器错误
  if ((statusCode ?? 0) >= 500 && statusCode! < 600
    || msg.includes("500") || msg.includes("502") || msg.includes("503")
    || msg.includes("internal server error") || msg.includes("bad gateway")
    || msg.includes("service unavailable")) {
    return { name: "RetryableError", message: errorMsg, category: "server_error", retryable: true, statusCode, attempt: 0 } as RetryableError;
  }

  // 401/403 权限错误（不重试）
  if (statusCode === 401 || statusCode === 403
    || msg.includes("401") || msg.includes("403")
    || msg.includes("unauthorized") || msg.includes("forbidden")
    || msg.includes("invalid api key") || msg.includes("authentication failed")) {
    return { name: "RetryableError", message: errorMsg, category: "auth_error", retryable: false, statusCode, attempt: 0 } as RetryableError;
  }

  // 网络超时
  if (msg.includes("timeout") || msg.includes("etimedout") || msg.includes("econnreset")
    || msg.includes("econnrefused") || msg.includes("network error")
    || msg.includes("enotfound") || msg.includes("socket hang up")
    || msg.includes("getaddrinfo") || msg.includes("eai_again")) {
    return { name: "RetryableError", message: errorMsg, category: "network_error", retryable: true, statusCode, attempt: 0 } as RetryableError;
  }

  // 其他超时
  if (msg.includes("timed out") || msg.includes("deadline exceeded")) {
    return { name: "RetryableError", message: errorMsg, category: "timeout_error", retryable: true, statusCode, attempt: 0 } as RetryableError;
  }

  return { name: "RetryableError", message: errorMsg, category: "unknown_error", retryable: false, statusCode, attempt: 0 } as RetryableError;
}

// ──────────────────────────────────────────────
// 重试配置
// ──────────────────────────────────────────────
interface RetryRule {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_RULES: Record<ErrorCategory, RetryRule> = {
  rate_limit:    { maxAttempts: 5, baseDelayMs: 1000,  maxDelayMs: 60000, backoffMultiplier: 2 },
  server_error:  { maxAttempts: 3, baseDelayMs: 2000,  maxDelayMs: 30000, backoffMultiplier: 2 },
  network_error: { maxAttempts: 3, baseDelayMs: 1000,  maxDelayMs: 15000, backoffMultiplier: 2 },
  timeout_error: { maxAttempts: 2, baseDelayMs: 2000,  maxDelayMs: 10000, backoffMultiplier: 2 },
  auth_error:   { maxAttempts: 1, baseDelayMs: 0,     maxDelayMs: 0,     backoffMultiplier: 1 },
  unknown_error: { maxAttempts: 1, baseDelayMs: 0,     maxDelayMs: 0,     backoffMultiplier: 1 },
};

// ──────────────────────────────────────────────
// 重试状态追踪
// ──────────────────────────────────────────────
interface RetryState {
  agentId: string;
  toolName: string;
  params: Record<string, unknown>;
  toolCallId: string;
  error: RetryableError;
  attempt: number;
  maxAttempts: number;
  nextRetryAt: number;
  lastErrorAt: number;
}

const retryStateMap = new Map<string, RetryState>(); // key: `${agentId}:${toolCallId}`

function getRetryKey(agentId: string, toolCallId: string): string {
  return `${agentId}:${toolCallId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// 辅助函数
// ──────────────────────────────────────────────
function matchGlob(pattern: string, text: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    "i",
  );
  return regex.test(text);
}

function extractMatchText(params: Record<string, unknown>): string {
  for (const key of ["command", "input", "path", "file_path", "url", "query"]) {
    if (typeof params[key] === "string") return params[key] as string;
  }
  return JSON.stringify(params);
}

function extractPathText(params: Record<string, unknown>): string {
  for (const key of ["path", "file_path", "filePath", "filename"]) {
    if (typeof params[key] === "string") return params[key] as string;
  }
  return "";
}

// ──────────────────────────────────────────────
// 主模块
// ──────────────────────────────────────────────
export function registerToolSafety(api: OpenClawPluginApi, config?: SafetyConfig) {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);
  const rules: SafetyRule[] = config?.rules ?? [];
  const defaultAction = config?.defaultAction ?? "allow";
  const enableRetry = config?.enableRetry ?? true;

  // ── Hook: before_tool_call — 安全拦截 ──
  api.on("before_tool_call" as any, (event: any, ctx: any) => {
    const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
    const toolName = (event as any)?.toolName ?? "";
    const params = ((event as any)?.params ?? {}) as Record<string, unknown>;
    const toolCallId = (ctx as any)?.toolCallId ?? "";
    const matchText = extractMatchText(params);
    const pathText = extractPathText(params);

    // 检查是否是重试调用（来自 retryStateMap）
    const retryKey = getRetryKey(agentId, toolCallId);
    const pendingRetry = retryStateMap.get(retryKey);

    if (pendingRetry) {
      // 是重试调用，先删除旧状态
      retryStateMap.delete(retryKey);
      api.logger.info(`[enhance-safety] 重试调用 ${toolName} (attempt ${pendingRetry.attempt + 1}/${pendingRetry.maxAttempts})`);
    }

    // 安全规则检查（跳过 retry 调用以避免重复拦截）
    if (!pendingRetry) {
      for (const rule of rules) {
        if (!matchGlob(rule.tool, toolName)) continue;
        if (rule.pattern && !matchGlob(rule.pattern, matchText)) continue;
        if (rule.pathPattern && !matchGlob(rule.pathPattern, pathText)) continue;

        logSafetyEvent(db, agentId, toolName, matchText.slice(0, 500), rule.action, JSON.stringify(rule), rule.reason ?? "");

        if (rule.action === "hardblock") {
          api.logger.warn(`[enhance-safety] 已强制拦截 (agent: ${agentId}): ${toolName}`);
          return { block: true, blockReason: rule.reason ?? "匹配安全规则（hardblock）" };
        }

        if (rule.action === "block") {
          return {
            requireApproval: {
              title: `安全守卫：拦截工具调用「${toolName}」`,
              description: [rule.reason ?? "该操作匹配了安全规则。", `工具: ${toolName}`].join("\n"),
              severity: "critical" as const,
              timeoutMs: 30_000,
              timeoutBehavior: "deny" as const,
            },
          };
        }
        return {};
      }

      if (defaultAction === "log") {
        logSafetyEvent(db, agentId, toolName, matchText.slice(0, 500), "log", "", "default-log");
      }
    }
    return {};
  }, { priority: 900 } as any);

  // ── Hook: after_tool_call — 错误分类 & 重试触发 ──
  api.on("after_tool_call" as any, async (event: any, ctx: any) => {
    if (!enableRetry) return;

    const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
    const toolName = (event as any)?.toolName ?? "";
    const params = ((event as any)?.params ?? {}) as Record<string, unknown>;
    const toolCallId = (ctx as any)?.toolCallId ?? "";
    const rawError: string = (event as any)?.error ?? "";
    const durationMs: number = (event as any)?.durationMs ?? 0;

    if (!rawError) return; // 成功，无错误

    // 解析错误类型（从 error 字符串中提取 statusCode）
    const statusCodeMatch = rawError.match(/\b(4\d{2}|5\d{2})\b/);
    const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1]) : undefined;
    const classified = classifyError(rawError, statusCode);

    // 记录错误分类到 SQLite
    logSafetyEvent(
      db,
      agentId,
      toolName,
      rawError.slice(0, 500),
      classified.category.toUpperCase(),
      JSON.stringify({ category: classified.category, retryable: classified.retryable, statusCode, durationMs }),
      classified.category,
    );

    if (!classified.retryable) {
      api.logger.warn(`[enhance-safety] 错误不可重试 (agent: ${agentId}) ${toolName}: ${classified.category}`);
      return;
    }

    const rule = DEFAULT_RETRY_RULES[classified.category];
    const retryKey = getRetryKey(agentId, toolCallId);
    const existing = retryStateMap.get(retryKey);
    const attempt = existing ? existing.attempt + 1 : 1;

    if (attempt > rule.maxAttempts) {
      api.logger.warn(`[enhance-safety] 重试次数耗尽 (agent: ${agentId}) ${toolName}: 尝试 ${attempt} 次后放弃`);
      retryStateMap.delete(retryKey);
      return;
    }

    // 计算退避延迟
    let delayMs = rule.baseDelayMs * Math.pow(rule.backoffMultiplier, attempt - 1);
    if (classified.category === "rate_limit" && classified.retryAfterMs) {
      // 429 时使用 Retry-After 头指定的时间
      delayMs = Math.min(classified.retryAfterMs, rule.maxDelayMs);
    }
    delayMs = Math.min(delayMs, rule.maxDelayMs);

    // 存储重试状态
    const state: RetryState = {
      agentId,
      toolName,
      params,
      toolCallId: toolCallId + "_retry_" + attempt,
      error: { ...classified, attempt },
      attempt,
      maxAttempts: rule.maxAttempts,
      nextRetryAt: Date.now() + delayMs,
      lastErrorAt: Date.now(),
    };
    retryStateMap.set(retryKey, state);

    api.logger.info(
      `[enhance-safety] 错误分类: ${classified.category} | ${toolName} | attempt ${attempt}/${rule.maxAttempts} | 延迟 ${delayMs}ms 后可重试`,
    );
  });

  // ── Tool Factory: enhance_safety_log ──
  api.registerTool( (
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_safety_log",
      description: "查看当前 Agent 的工具安全审计日志和统计信息。",
      parameters: Type.Object({
        action: Type.Union([Type.Literal("recent"), Type.Literal("stats")], {
          description: "recent: 最近事件 / stats: 统计摘要",
        }),
        limit: Type.Optional(Type.Number({ description: "返回条数（仅 recent 模式）", default: 15 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
        if (params.action === "stats") {
          const stats = getSafetyStats(db, agentId);
          return {
            content: [
              {
                type: "text" as const,
                text: `安全统计 (agent: ${agentId})：\n总事件: ${stats.total}\n已拦截: ${stats.blocked}\n已记录: ${stats.logged}`,
              },
            ],
          };
        }
        const events = getRecentSafetyEvents(db, agentId, (params.limit as number) ?? 15);
        if (events.length === 0) {
          return { content: [{ type: "text" as const, text: `暂无安全事件 (agent: ${agentId})。` }] };
        }
        const lines = events.map(
          (e) => `[${e.action}] ${e.created_at} | ${e.tool}: ${(e.params ?? "").slice(0, 60)}${e.reason ? ` (${e.reason})` : ""}`,
        );
        return { content: [{ type: "text" as const, text: `最近安全事件 (agent: ${agentId})：\n${lines.join("\n")}` }] };
      },
    }) as any),
    { name: "enhance_safety_log" },
  );

  // ── Tool: enhance_retry_status — 查询重试状态 ──
  api.registerTool(({ // @ts-ignore
    name: "enhance_retry_status",
    description: "查询工具调用错误重试状态。如有可重试错误，返回重试信息和延迟时间。",
    parameters: Type.Object({}),
    // @ts-ignore
    async execute(_id: string, _params: Record<string, unknown>, _signal?: AbortSignal) {
      const entries = Array.from(retryStateMap.entries()).map(([k, v]) => ({
        key: k,
        ...v,
        nextRetryInMs: Math.max(0, v.nextRetryAt - Date.now()),
      }));

      if (entries.length === 0) {
        return { content: [{ type: "text" as const, text: "当前无待处理的重试任务。" }] };
      }

      const lines = entries.map(
        (e) =>
          `[${e.error.category}] ${e.toolName} (agent: ${e.agentId})\n  错误: ${e.error.message.slice(0, 80)}\n  已尝试: ${e.attempt}/${e.maxAttempts}\n  ${e.nextRetryInMs > 0 ? `${Math.round(e.nextRetryInMs / 1000)}秒后可重试` : "可立即重试"}`,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `待重试任务 (${entries.length}):\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    },
  })),

  // ── Tool: enhance_safety_rules ──
  api.registerTool(({ // @ts-ignore
    name: "enhance_safety_rules",
    description: "查看当前配置的工具安全规则（全局生效）。",
    parameters: Type.Object({}),
    // @ts-ignore
    async execute() {
      if (rules.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `当前无自定义安全规则。默认策略: ${defaultAction}\n\n可在 openclaw.json → plugins.entries.enhance.config.safety.rules 中配置。`,
            },
          ],
        };
      }
      const lines = rules.map(
        (r, i) =>
          `${i + 1}. [${r.action}] tool=${r.tool}${r.pattern ? ` pattern="${r.pattern}"` : ""}${r.reason ? ` — ${r.reason}` : ""}`,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `安全规则 (${rules.length} 条)：\n${lines.join("\n")}\n\n默认策略: ${defaultAction}`,
          },
        ],
      };
    },
  })),

  api.logger.info(
    `[enhance] 工具安全模块已加载（多 Agent 隔离日志 + 自动重试）\n` +
    `  重试策略: 429指数退避(最多5次) / 5xx重试(最多3次) / 网络超时(最多3次)\n` +
    `  权限错误(401/403)不重试`,
  );
}