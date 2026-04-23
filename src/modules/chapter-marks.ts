/**
 * 模块: 章节标记（Claude-Code 风格 mark_chapter）
 *
 * 把长会话切成可回溯的章节。仪表盘用它生成时间线。
 * 与龙虾原生 session 的关系：龙虾只有 session 本身，没有章节概念；
 * 本模块是纯新增，完全不影响龙虾 session 内部状态。
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { getDb, addChapter, listChapters } from "../utils/sqlite-store.js";
import { DEFAULT_AGENT_ID } from "../types.js";

function pickAgentId(ctx: unknown): string {
  return (((ctx as any)?.agentId as string | undefined) ?? DEFAULT_AGENT_ID).trim() || DEFAULT_AGENT_ID;
}

function pickSessionId(ctx: unknown): string {
  return (
    ((ctx as any)?.sessionKey as string | undefined) ??
    ((ctx as any)?.sessionId as string | undefined) ??
    ""
  ).trim();
}

export function registerChapterMarks(api: OpenClawPluginApi) {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);

  api.registerTool(
    ((ctx: OpenClawPluginToolContext) => ({
      name: "enhance_mark_chapter",
      description:
        "在会话中标记一个章节（长会话的里程碑）。何时使用：从探索切到实现、修复结束转向验证、话题切换。不要每个工具调用都标记。一般一个会话 3-8 个。",
      parameters: Type.Object({
        title: Type.String({ description: "短名词短语，<40 字，例如'代码库勘察'、'鉴权修复'。" }),
        summary: Type.Optional(Type.String({ description: "一行摘要，鼠标悬停时显示。" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = pickAgentId(ctx);
        const sessionId = pickSessionId(ctx);
        const title = String(params.title ?? "").trim();
        if (!title) {
          return {
            content: [{ type: "text" as const, text: "章节标题不能为空。" }],
          };
        }
        const chapter = addChapter(db, agentId, sessionId, title.slice(0, 80), String(params.summary ?? "").trim());
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ 章节已标记 #${chapter.id}：${chapter.title}${chapter.summary ? ` — ${chapter.summary}` : ""}`,
            },
          ],
        };
      },
    })) as any,
    { name: "enhance_mark_chapter" },
  );

  api.registerTool(
    ((ctx: OpenClawPluginToolContext) => ({
      name: "enhance_chapter_list",
      description: "查看当前 session（或 Agent 全部）章节时间线。",
      parameters: Type.Object({
        scope: Type.Optional(
          Type.Union([Type.Literal("session"), Type.Literal("agent")], {
            description: "session（默认）或 agent（跨 session）",
          }),
        ),
        limit: Type.Optional(Type.Integer({ description: "返回条数，默认 50" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = pickAgentId(ctx);
        const sessionId = pickSessionId(ctx);
        const limit = Number(params.limit ?? 50);
        const scope = params.scope === "agent" ? undefined : sessionId;
        const rows = listChapters(db, agentId, scope, limit);
        if (rows.length === 0) {
          return {
            content: [{ type: "text" as const, text: `暂无章节记录 (agent: ${agentId})。` }],
          };
        }
        const lines = rows.map(
          (c) => `· ${c.created_at} · #${c.id} ${c.title}${c.summary ? ` — ${c.summary}` : ""}`,
        );
        return {
          content: [{ type: "text" as const, text: `章节时间线（${rows.length} 条）：\n${lines.join("\n")}` }],
        };
      },
    })) as any,
    { name: "enhance_chapter_list" },
  );

  api.logger.info("[enhance] 章节标记模块已加载（enhance_mark_chapter / chapter_list）");
}
