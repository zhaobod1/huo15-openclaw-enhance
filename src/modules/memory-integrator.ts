/**
 * 模块: 记忆整合（Memory Integrator）
 *
 * 功能：将 enhance 的 SQLite 记忆库注册为 OpenClaw 官方记忆系统的补充 corpus
 *
 * 效果：
 * - enhance 的 5 分类记忆对 OpenClaw 的 `memory` 命令可见
 * - OpenClaw 搜索记忆时会同时搜索 enhance 的记忆库
 * - 用户可以用统一的 `memory` 命令查询所有记忆
 *
 * 使用 OpenClaw Plugin SDK 的 MemoryPluginCapability API：
 *   registerMemoryCapability(pluginId, { corpusSupplement })
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { getDb } from "../utils/sqlite-store.js";
import { DEFAULT_AGENT_ID } from "../types.js";

// ── OpenClaw Memory API 类型（从 plugin SDK 内联，避免循环 import） ──
interface MemoryCorpusSearchResult {
  corpus: string;
  path: string;
  title?: string;
  kind?: string;
  score: number;
  snippet: string;
  id?: string;
  startLine?: number;
  endLine?: number;
  citation?: string;
  source?: string;
  provenanceLabel?: string;
  sourceType?: string;
  sourcePath?: string;
  updatedAt?: string;
}

interface MemoryCorpusGetResult {
  corpus: string;
  path: string;
  title?: string;
  kind?: string;
  content: string;
  fromLine: number;
  lineCount: number;
  id?: string;
  provenanceLabel?: string;
  sourceType?: string;
  sourcePath?: string;
  updatedAt?: string;
}

interface MemoryCorpusSupplement {
  search(params: {
    query: string;
    maxResults?: number;
    agentSessionKey?: string;
  }): Promise<MemoryCorpusSearchResult[]>;
  get(params: {
    lookup: string;
    fromLine?: number;
    lineCount?: number;
    agentSessionKey?: string;
  }): Promise<MemoryCorpusGetResult | null>;
}

// ── 从 SQLite 读取记忆 ──
interface EnhanceMemory {
  id: number;
  category: string;
  content: string;
  tags: string;
  importance: number;
  agent_id: string;
  created_at: string;
}

function searchEnhanceMemories(
  db: any,
  agentId: string,
  query: string,
  maxResults: number,
): EnhanceMemory[] {
  try {
    const q = `%${query}%`;
    return db
      .prepare(
        `SELECT id, category, content, tags, importance, agent_id, created_at
         FROM memories
         WHERE agent_id = ?
           AND (content LIKE ? OR tags LIKE ? OR category LIKE ?)
         ORDER BY importance DESC, created_at DESC
         LIMIT ?`,
      )
      .all(agentId, q, q, q, maxResults) as EnhanceMemory[];
  } catch {
    return [];
  }
}

function getEnhanceMemoryById(
  db: any,
  agentId: string,
  id: number,
): EnhanceMemory | null {
  try {
    return db
      .prepare(
        "SELECT id, category, content, tags, importance, agent_id, created_at FROM memories WHERE id = ? AND agent_id = ?",
      )
      .get(id, agentId) as EnhanceMemory | null;
  } catch {
    return null;
  }
}

function listRecentEnhanceMemories(
  db: any,
  agentId: string,
  limit: number,
): EnhanceMemory[] {
  try {
    return db
      .prepare(
        "SELECT id, category, content, tags, importance, agent_id, created_at FROM memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(agentId, limit) as EnhanceMemory[];
  } catch {
    return [];
  }
}

// ── 构建 MemoryCorpusSupplement ──
function buildEnhanceMemoryCorpus(api: OpenClawPluginApi): MemoryCorpusSupplement {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);
  const PLUGIN_ID = "enhance";

  return {
    async search({ query, maxResults = 5, agentSessionKey }) {
      // agentSessionKey 格式: sessionKey 或 agentId
      // 提取 agentId（格式可能是 "agent:agentId" 或直接是 agentId）
      const agentId = extractAgentId(agentSessionKey ?? DEFAULT_AGENT_ID);

      const rows = searchEnhanceMemories(db, agentId, query, maxResults);

      return rows.map((row) => ({
        corpus: PLUGIN_ID,
        path: `memory://enhance/${row.category}/${row.id}`,
        title: `[${row.category.toUpperCase()}] ${row.content.slice(0, 60)}...`,
        kind: row.category,
        score: row.importance / 10, // importance 1-10 → score 0-1
        snippet: row.content.slice(0, 200),
        id: String(row.id),
        citation: `@enhance:${row.id}`,
        provenanceLabel: "enhance-memory",
        sourceType: "structured_memory",
        sourcePath: `enhance://memory/${row.category}/${row.id}`,
        updatedAt: row.created_at,
      }));
    },

    async get({ lookup, fromLine = 1, lineCount = 100 }) {
      // lookup 格式: "enhance://memory/category/id" 或直接是 id
      const id = extractIdFromLookup(lookup);
      if (!id) return null;

      const agentId = DEFAULT_AGENT_ID;
      const row = getEnhanceMemoryById(db, agentId, id);
      if (!row) return null;

      const lines = row.content.split("\n");
      const startLine = Math.min(fromLine, lines.length);
      const endLine = Math.min(fromLine + lineCount - 1, lines.length);
      const selectedLines = lines.slice(startLine - 1, endLine);

      return {
        corpus: PLUGIN_ID,
        path: `memory://enhance/${row.category}/${row.id}`,
        title: `[${row.category.toUpperCase()}] ${row.content.slice(0, 60)}`,
        kind: row.category,
        content: selectedLines.join("\n"),
        fromLine: startLine,
        lineCount: selectedLines.length,
        id: String(row.id),
        provenanceLabel: "enhance-memory",
        sourceType: "structured_memory",
        sourcePath: `enhance://memory/${row.category}/${row.id}`,
        updatedAt: row.created_at,
      };
    },
  };
}

// ── 辅助函数 ──
function extractAgentId(sessionKey: string): string {
  if (sessionKey.startsWith("agent:")) {
    return sessionKey.slice(6);
  }
  return sessionKey || DEFAULT_AGENT_ID;
}

function extractIdFromLookup(lookup: string): number | null {
  // 格式: "enhance://memory/category/id" 或 "enhance:123" 或纯数字 "123"
  if (/^\d+$/.test(lookup)) {
    return parseInt(lookup, 10);
  }
  const match = lookup.match(/(\d+)(?:\/[^/]*)?$/);
  return match ? parseInt(match[1], 10) : null;
}

// ── 主模块 ──
export function registerMemoryIntegrator(api: OpenClawPluginApi) {
  const PLUGIN_ID = "enhance";

  // 延迟注册，避免循环依赖（等待 OpenClaw core 初始化完成）
  // 使用 setTimeout 0 确保在当前事件循环之后执行
  setTimeout(() => {
    try {
      const corpus = buildEnhanceMemoryCorpus(api);

      // 注册 corpus supplement
      // OpenClaw 的 registerMemoryCorpusSupplement 函数直接挂在插件 API 上
      if (typeof (api as any).registerMemoryCorpusSupplement === "function") {
        (api as any).registerMemoryCorpusSupplement(PLUGIN_ID, corpus);
        api.logger.info("[enhance] 记忆整合: enhance 记忆库已注册为 OpenClaw corpus supplement");
      } else {
        // fallback: 通过 registerMemoryCapability
        if (typeof (api as any).registerMemoryCapability === "function") {
          (api as any).registerMemoryCapability(PLUGIN_ID, {
            corpusSupplement: corpus,
          });
          api.logger.info("[enhance] 记忆整合: enhance 记忆库已注册（registerMemoryCapability）");
        } else {
          api.logger.info("[enhance] 记忆整合: 当前 OpenClaw 版本不支持 corpus supplement 注册");
        }
      }
    } catch (err) {
      api.logger.error(`[enhance] 记忆整合初始化失败: ${err}`);
    }
  }, 0);

  // ── Tool: enhance_memory_export — 导出记忆为标准 JSON ──
  // 用于与其他系统（Obsidian/KB）同步
  api.registerTool(((ctx: any) => ({
    name: "enhance_memory_export",
    description: "导出当前 Agent 的所有记忆为 JSON（可用于同步到 Obsidian/KB 等外部系统）。",
    parameters: {},
    async execute(_id: string, _params: Record<string, unknown>): Promise<any> {
      const openclawDir = resolveOpenClawHome(api);
      const db = getDb(openclawDir);
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();

      const memories = listRecentEnhanceMemories(db, agentId, 1000);
      const exported = memories.map((m) => ({
        id: m.id,
        category: m.category,
        content: m.content,
        tags: m.tags,
        importance: m.importance,
        agent_id: m.agent_id,
        created_at: m.created_at,
      }));

      const json = JSON.stringify(
        {
          source: "huo15-openclaw-enhance",
          version: "2.1.0",
          exported_at: new Date().toISOString(),
          agent_id: agentId,
          count: exported.length,
          memories: exported,
        },
        null,
        2,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `已导出 ${exported.length} 条记忆 (agent: ${agentId})：\n\n${json}`,
          },
        ],
      };
    },
  })) as any, { name: "enhance_memory_export" });

  api.logger.info("[enhance] 记忆整合模块已加载（corpus supplement + 导出工具）");
}
