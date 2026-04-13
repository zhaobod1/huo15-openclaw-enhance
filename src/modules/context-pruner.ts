/**
 * 模块: Context 裁剪器（Context Pruner）
 *
 * Hook: before_prompt_build
 * 时机: Prompt 构建阶段，记忆注入前
 * 作用: 基于关键词相关性评分过滤记忆，只注入高相关性的记忆
 *
 * 对标 Claude Code findRelevantMemories() — 用简单评分替代 LLM 二次筛选
 * （避免额外 API 调用，适合本地/轻量场景）
 *
 * 来源: 对标 Claude Code "信息边界" 能力（Agent Harness 六层第1层）
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
// 注意: PluginHookBeforePromptBuildEvent/Result 是内部 API，Jiti 运行时解析，跳过 TS 类型检查
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { getDb, searchMemories } from "../utils/sqlite-store.js";
import { DEFAULT_AGENT_ID } from "../types.js";
import type { MemoryEntry } from "../types.js";

// ── 配置 ──
export interface ContextPrunerConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 相关性阈值（0-1），低于此分数的记忆被过滤，默认 0.25 */
  threshold?: number;
  /** 最多注入多少条记忆，默认 10 */
  maxEntries?: number;
  /** 是否启用 debug 日志 */
  debug?: boolean;
}

// ── 相关性评分 ──
/**
 * 计算单条记忆与当前 query 的相关性分数
 * 评分维度：
 *   1. 关键词重合度（记忆内容 vs query）
 *   2. 分类权重（project > decision > user > feedback > reference）
 *   3. 重要性权重（importance 字段）
 *   4. 新鲜度衰减（7天内的记忆权重更高）
 */
function scoreRelevance(memory: MemoryEntry, query: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = memory.content.toLowerCase();
  const tagsLower = memory.tags.toLowerCase();

  // 1. 关键词重合度（0-0.5）
  const queryTokens = queryLower
    .split(/[\s\W]+/)
    .filter((t) => t.length > 1)
    .filter((t) => !STOP_WORDS.has(t));

  let keywordScore = 0;
  if (queryTokens.length > 0) {
    const matchedTokens = queryTokens.filter(
      (t) => contentLower.includes(t) || tagsLower.includes(t),
    );
    keywordScore = matchedTokens.length / queryTokens.length;
  } else {
    // 无 token 时，用 substring 匹配
    keywordScore = queryTokens.length === 0 && queryLower.length > 2
      ? contentLower.includes(queryLower) || tagsLower.includes(queryLower) ? 0.5 : 0
      : 0;
  }

  // 2. 分类权重（0-0.3）
  const categoryWeight: Record<string, number> = {
    project: 0.3,
    decision: 0.25,
    user: 0.2,
    feedback: 0.15,
    reference: 0.1,
  };
  const catScore = categoryWeight[memory.category] ?? 0.1;

  // 3. 重要性权重（0-0.1）
  const importanceScore = ((memory.importance ?? 5) / 10) * 0.1;

  // 4. 新鲜度衰减（0-0.1，7天内1.0，7-30天线性衰减，30天以上0）
  let freshnessScore = 0.1;
  try {
    const created = new Date(memory.created_at).getTime();
    const now = Date.now();
    const ageDays = (now - created) / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) {
      freshnessScore = 0.1;
    } else if (ageDays <= 30) {
      freshnessScore = 0.1 * (1 - (ageDays - 7) / 23);
    } else {
      freshnessScore = 0;
    }
  } catch {
    freshnessScore = 0.05;
  }

  const total = keywordScore * 0.5 + catScore + importanceScore + freshnessScore;
  return Math.min(1, Math.max(0, total));
}

// 英语停用词
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "under", "again",
  "further", "then", "once", "here", "there", "when", "where", "why",
  "how", "all", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "but", "and", "or", "if", "because", "until", "while",
  "about", "against", "this", "that", "these", "those", "am", "it", "its",
]);

/**
 * 从记忆内容中提取关键词（用于 debug 日志）
 */
function extractKeywords(text: string, count = 5): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .filter((t) => !/^\d+$/.test(t))
    .slice(0, count);
}

export function registerContextPruner(api: OpenClawPluginApi, config?: ContextPrunerConfig) {
  const openclawDir = resolveOpenClawHome(api);
  const db = getDb(openclawDir);

  const enabled = config?.enabled !== false;
  if (!enabled) return;

  const threshold = config?.threshold ?? 0.25;
  const maxEntries = config?.maxEntries ?? 10;
  const debug = config?.debug ?? false;

  // ── Hook: before_prompt_build ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.on("before_prompt_build" as any, (event: any, ctx: any): any => {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
      const query: string = (event as any)?.prompt ?? "";

      if (!query.trim()) return {};

      // 1. 获取该 agent 的所有记忆
      const allMemories = searchMemories(db, agentId, { limit: 100 });
      if (allMemories.length === 0) return {};

      // 2. 计算相关性分数并排序
      const scored = allMemories
        .map((m) => ({ memory: m, score: scoreRelevance(m, query) }))
        .filter(({ score }) => score >= threshold)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        if (debug) {
          api.logger.info(`[enhance-pruner] 无高相关性记忆 (agent: ${agentId})，query: "${query.slice(0, 50)}"`);
        }
        return {};
      }

      // 3. 截断到 maxEntries
      const selected = scored.slice(0, maxEntries);

      if (debug) {
        const lines = selected.map(
          ({ memory, score }) =>
            `  [${score.toFixed(2)}] ${memory.category} #${memory.id}: ${memory.content.slice(0, 40)}...`,
        );
        api.logger.info(
          `[enhance-pruner] 选中 ${selected.length}/${allMemories.length} 条记忆 (agent: ${agentId})\n${lines.join("\n")}`,
        );
      }

      // 4. 渲染注入文本
      const sections = selected.map(({ memory, score }) => {
        const keywords = extractKeywords(memory.content).join(", ");
        const age = Math.round((Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return [
          `**${memory.category.toUpperCase()} #${memory.id}** (相关度:${score.toFixed(2)}, ${age}天前, 重要性:${memory.importance}/10)`,
          memory.content,
          keywords ? `关键词: ${keywords}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      });

      const injected = [
        "\n\n<!-- enhance-pruner: 裁剪后的高相关性记忆 -->",
        `已从 ${allMemories.length} 条记忆中筛选出 ${selected.length} 条高相关性记忆：`,
        ...sections,
      ].join("\n\n");

      return { prependContext: injected };
    },
  );

  api.logger.info(
    `[enhance] Context 裁剪模块已加载（before_prompt_build，阈值:${threshold}，最多:${maxEntries}条）`,
  );
}
