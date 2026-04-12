/**
 * 模块2: 工具安全守卫（多 Agent 隔离版）
 *
 * 安全规则全局生效，但审计日志按 agentId 隔离记录。
 *
 * before_tool_call hook 签名:
 *   event: { toolName, params, runId, toolCallId }
 *   ctx:   { agentId, sessionKey, sessionId, runId, toolName, toolCallId }
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { getDb, logSafetyEvent, getRecentSafetyEvents, getSafetyStats } from "../utils/sqlite-store.js";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { DEFAULT_AGENT_ID, type SafetyConfig, type SafetyRule } from "../types.js";

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

export function registerToolSafety(api: OpenClawPluginApi, config?: SafetyConfig) {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);
  const rules: SafetyRule[] = config?.rules ?? [];
  const defaultAction = config?.defaultAction ?? "allow";

  // ── Hook: before_tool_call — 安全拦截 ──
  // event 包含 toolName, params; ctx 包含 agentId
  // 声明高优先级（900），确保在其他插件之前执行安全检查
  api.on("before_tool_call", (event, ctx) => {
    const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
    const toolName = (event as any)?.toolName ?? "";
    const params = ((event as any)?.params ?? {}) as Record<string, unknown>;
    const matchText = extractMatchText(params);
    const pathText = extractPathText(params);

    for (const rule of rules) {
      if (!matchGlob(rule.tool, toolName)) continue;
      if (rule.pattern && !matchGlob(rule.pattern, matchText)) continue;
      if (rule.pathPattern && !matchGlob(rule.pathPattern, pathText)) continue;

      logSafetyEvent(db, agentId, toolName, matchText.slice(0, 500), rule.action, JSON.stringify(rule), rule.reason ?? "");

      if (rule.action === "hardblock") {
        // 无条件拦截，不给用户确认机会（用于极危险操作）
        api.logger.warn(`[enhance-safety] 已强制拦截 (agent: ${agentId}): ${toolName} — ${rule.reason ?? "匹配安全规则"}`);
        return { block: true, blockReason: rule.reason ?? "匹配安全规则（hardblock）" };
      }

      if (rule.action === "block") {
        // 弹出用户确认对话框，超时 30s 默认拒绝
        api.logger.warn(`[enhance-safety] 需要用户确认 (agent: ${agentId}): ${toolName} — ${rule.reason ?? "匹配安全规则"}`);
        return {
          requireApproval: {
            title: `安全守卫：拦截工具调用「${toolName}」`,
            description: [
              rule.reason ?? "该操作匹配了安全规则，请确认是否允许执行。",
              `工具: ${toolName}`,
              `参数: ${matchText.slice(0, 200)}`,
            ].join("\n"),
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
    return {};
  }, { priority: 900 } as any);

  // ── Tool Factory: enhance_safety_log ──
  api.registerTool(
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
    }),
    { name: "enhance_safety_log" },
  );

  // ── Tool: enhance_safety_rules（全局规则，无需隔离）──
  api.registerTool({
    name: "enhance_safety_rules",
    description: "查看当前配置的工具安全规则（全局生效）。",
    parameters: Type.Object({}),
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
          `${i + 1}. [${r.action}] tool=${r.tool}${r.pattern ? ` pattern="${r.pattern}"` : ""}${r.pathPattern ? ` path="${r.pathPattern}"` : ""}${r.reason ? ` — ${r.reason}` : ""}`,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `安全规则 (${rules.length} 条，全局生效)：\n${lines.join("\n")}\n\n默认策略: ${defaultAction}`,
          },
        ],
      };
    },
  });

  // ── 安全审计收集器 — 供 `openclaw doctor` 命令汇报 ──
  if (typeof (api as any).registerSecurityAuditCollector === "function") {
    (api as any).registerSecurityAuditCollector(async () => {
      const recentBlocks = getRecentSafetyEvents(db, undefined, 20).filter(
        (e) => e.action === "block" || e.action === "hardblock",
      );
      return recentBlocks.map((b) => ({
        level: "warn",
        message: `[enhance-safety] 工具「${b.tool}」被拦截 (${b.created_at}): ${b.reason || "匹配安全规则"}`,
      }));
    });
  }

  api.logger.info(`[enhance] 工具安全模块已加载（多 Agent 隔离日志），${rules.length} 条规则`);
}
