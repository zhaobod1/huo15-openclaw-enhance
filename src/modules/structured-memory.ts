/**
 * 模块1: 结构化记忆系统（多 Agent 隔离版）
 *
 * 每个动态 Agent（如 WeCom 用户/群组）拥有独立的记忆空间。
 * 工具使用 OpenClawPluginToolFactory 模式，从 ctx.agentId 获取当前 Agent。
 * 钩子从 ctx.agentId 获取当前 Agent。
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import {
  getDb,
  storeMemory,
  searchMemories,
  getRecentMemories,
  deleteMemory,
  getMemoryStats,
} from "../utils/sqlite-store.js";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { DEFAULT_AGENT_ID, type MemoryConfig, type MemoryCategory } from "../types.js";

const VALID_CATEGORIES: MemoryCategory[] = ["user", "project", "feedback", "reference", "decision"];

function resolveAgentId(ctx: OpenClawPluginToolContext): string {
  return ctx.agentId?.trim() || DEFAULT_AGENT_ID;
}

export function registerStructuredMemory(api: OpenClawPluginApi, config?: MemoryConfig) {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);
  const maxCtx = config?.maxContextEntries ?? 5;

  // ── Tool Factory: enhance_memory_store ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_memory_store",
      description: [
        "存储一条结构化记忆（自动隔离到当前 Agent）。",
        "分类说明：",
        "- user: 用户偏好、角色、知识背景",
        "- project: 项目状态、目标、决策、截止日期",
        "- feedback: 用户对工作方式的反馈和纠正",
        "- reference: 外部资源指针（链接、文档位置）",
        "- decision: 重要的技术或业务决策及其原因",
        "",
        "使用场景：当你了解到值得在未来会话中记住的信息时调用此工具。",
        "不要存储可以从代码或 git 历史推导出的信息。",
      ].join("\n"),
      parameters: Type.Object({
        category: Type.Union(VALID_CATEGORIES.map((c) => Type.Literal(c)), {
          description: "记忆类型: user|project|feedback|reference|decision",
        }),
        content: Type.String({ description: "记忆内容（建议中文）" }),
        tags: Type.Optional(Type.String({ description: "逗号分隔的标签" })),
        importance: Type.Optional(
          Type.Number({ description: "重要性 1-10，默认 5", minimum: 1, maximum: 10 }),
        ),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = resolveAgentId(ctx);
        const entry = storeMemory(
          db,
          agentId,
          params.category as MemoryCategory,
          params.content as string,
          (params.tags as string) ?? "",
          (params.importance as number) ?? 5,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `已存储记忆 #${entry.id} [${entry.category}] (agent: ${agentId}): ${(params.content as string).slice(0, 80)}...`,
            },
          ],
        };
      },
    }),
    { name: "enhance_memory_store" },
  );

  // ── Tool Factory: enhance_memory_search ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_memory_search",
      description: "搜索当前 Agent 的结构化记忆。可按分类、关键词筛选。",
      parameters: Type.Object({
        category: Type.Optional(
          Type.Union(VALID_CATEGORIES.map((c) => Type.Literal(c)), {
            description: "按分类筛选",
          }),
        ),
        keyword: Type.Optional(Type.String({ description: "关键词搜索" })),
        limit: Type.Optional(Type.Number({ description: "返回条数，默认 10", default: 10 })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = resolveAgentId(ctx);
        const entries = searchMemories(db, agentId, {
          category: params.category as MemoryCategory | undefined,
          keyword: params.keyword as string | undefined,
          limit: (params.limit as number) ?? 10,
        });
        if (entries.length === 0) {
          return { content: [{ type: "text" as const, text: `未找到匹配的记忆 (agent: ${agentId})。` }] };
        }
        const lines = entries.map(
          (e) =>
            `#${e.id} [${e.category}] (重要性:${e.importance}) ${e.created_at}\n  ${e.content}\n  标签: ${e.tags || "无"}`,
        );
        return {
          content: [{ type: "text" as const, text: `找到 ${entries.length} 条记忆 (agent: ${agentId})：\n\n${lines.join("\n\n")}` }],
        };
      },
    }),
    { name: "enhance_memory_search" },
  );

  // ── Tool Factory: enhance_memory_review ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_memory_review",
      description: "查看当前 Agent 的记忆统计和最近记忆，也可删除指定记忆。",
      parameters: Type.Object({
        action: Type.Union([Type.Literal("stats"), Type.Literal("recent"), Type.Literal("delete")], {
          description: "操作: stats(统计) / recent(最近) / delete(删除)",
        }),
        id: Type.Optional(Type.Number({ description: "要删除的记忆 ID（action=delete 时必填）" })),
        limit: Type.Optional(Type.Number({ description: "recent 模式返回条数，默认 10" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = resolveAgentId(ctx);
        const action = params.action as string;

        if (action === "stats") {
          const stats = getMemoryStats(db, agentId);
          const lines = Object.entries(stats).map(([k, v]) => `${k}: ${v}`);
          return { content: [{ type: "text" as const, text: `记忆统计 (agent: ${agentId})：\n${lines.join("\n")}` }] };
        }
        if (action === "delete") {
          const memId = params.id as number | undefined;
          if (!memId) {
            return { content: [{ type: "text" as const, text: "删除操作需要提供记忆 ID。" }] };
          }
          const ok = deleteMemory(db, agentId, memId);
          return {
            content: [{ type: "text" as const, text: ok ? `已删除记忆 #${memId}` : `未找到记忆 #${memId}（或不属于当前 Agent）` }],
          };
        }
        // recent
        const entries = getRecentMemories(db, agentId, (params.limit as number) ?? 10);
        if (entries.length === 0) {
          return { content: [{ type: "text" as const, text: `暂无记忆 (agent: ${agentId})。` }] };
        }
        const lines = entries.map(
          (e) => `#${e.id} [${e.category}] ${e.created_at}: ${e.content.slice(0, 100)}`,
        );
        return {
          content: [{ type: "text" as const, text: `最近 ${entries.length} 条记忆 (agent: ${agentId})：\n${lines.join("\n")}` }],
        };
      },
    }),
    { name: "enhance_memory_review" },
  );

  // ── Hook: before_prompt_build — 注入当前 Agent 的记忆到上下文 ──
  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;
    const recent = getRecentMemories(db, agentId, maxCtx);
    if (recent.length === 0) return {};

    const memoryBlock = recent
      .map((e) => `- [${e.category}] ${e.content}`)
      .join("\n");

    return {
      appendSystemContext: [
        "\n\n## 增强记忆上下文（来自龙虾增强包）",
        `当前 Agent: ${agentId}`,
        "以下是当前 Agent 最近存储的结构化记忆，可作为参考：",
        memoryBlock,
        "\n你可以使用 enhance_memory_store 工具存储新的重要信息，使用 enhance_memory_search 查找历史记忆。",
        "记忆数据已按 Agent 隔离，每个用户/群组拥有独立的记忆空间。",
      ].join("\n"),
    };
  });

  api.logger.info("[enhance] 结构化记忆模块已加载（多 Agent 隔离）");
}
