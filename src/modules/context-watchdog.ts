/**
 * 模块: 上下文守护 (Context Watchdog) v6.5.3
 *
 * 解决场景：长会话不知不觉吃满 ctx 窗口 → 龙虾原生在 overflow **错误发生后**才
 * 走 model-fallback；用户体验是"突然报错"或"突然丢上下文"，没有预警。
 *
 * 龙虾原生已有（不复制，红线 #2）：
 *   - isContextOverflowError / isLikelyContextOverflowError 错误检测
 *   - model-fallback.ts ctx overflow 触发后做 model fallback
 *   - /compact 命令 + before_compaction / after_compaction hook
 *
 * 龙虾原生没有的（本模块补）：
 *   1. **会话级 token 累加追踪**：hook llm_output 拿 usage 实时累加到 sessionKey
 *   2. **三阶预警**（70%/85%/95%）：在 overflow **之前** 注入 prependContext，
 *      让 LLM 主动收尾 / 走 /compact / 切大 ctx 模型
 *   3. **after_compaction 自动归零**：龙虾刚 compact 完，session 重置 token 计数
 *   4. **enhance_ctx_status 工具**：LLM 主动查当前用量
 *
 * 非侵入式保证：
 *   - 零 child_process / 零新 npm 依赖
 *   - 不修龙虾核心 / 不复制 model-fallback / 不抢龙虾 routing 决策
 *   - 仅观察 + 提醒（通过 prompt supplement）；切模型让 model-router 自己决定
 *
 * 实测痛点（2026-05-11）：
 *   用户长会话 + 跨日续接 + 多轮工具调用，token 累计到 180K+ 还没主动 /compact，
 *   突然遇到 200K 上限报错。三阶预警让 LLM 在 70% 就开始 awareness，
 *   85% 强烈建议收尾，95% 命令式停手。
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { DEFAULT_AGENT_ID } from "../types.js";
import type { ContextWatchdogConfig } from "../types.js";

// ── 已知 model contextWindow 表（fallback；优先用 openclaw.json 实际值） ──
//
// 数据来源：各 provider 官网 + 实测 OpenClaw 4.29 capability scan
// 未列入的 model 默认走 DEFAULT_CTX_MAX 保守值。
const KNOWN_MODEL_CTX_MAX: Record<string, number> = {
  // Anthropic
  "claude-opus-4.7": 200_000,
  "claude-opus-4.7-1m": 1_000_000,
  "claude-sonnet-4.5": 200_000,
  "claude-haiku-4.5": 200_000,
  // OpenAI
  "gpt-5.4": 200_000,
  "gpt-5.4-codex": 200_000,
  "gpt-5.4-mini": 128_000,
  "o1": 200_000,
  // Google
  "gemini-2.5-pro": 2_000_000,
  "gemini-2.5-flash": 1_000_000,
  // 智谱
  "glm-4.6": 200_000,
  "glm-4.6-airx": 128_000,
  "glm-4-flash": 128_000,
  "glm-4-air": 128_000,
  // DeepSeek
  "deepseek-v3.2": 128_000,
  "deepseek-r1": 128_000,
  "deepseek-coder": 128_000,
  // Moonshot
  "kimi-k2": 256_000,
  "kimi-k2-200k": 256_000,
  "kimi-k2-128k": 128_000,
  // Minimax
  "minimax-m2": 200_000,
  "abab7-chat-preview": 245_000,
};

const DEFAULT_CTX_MAX = 128_000; // 未知 model 保守值
const DEFAULT_HINT_AT = 0.70;
const DEFAULT_WARN_AT = 0.85;
const DEFAULT_CRITICAL_AT = 0.95;
const DEFAULT_ESCALATE_AT = 0.80; // 80% 起触发"建议切大 ctx 模型"
const MAX_TRACKED_SESSIONS = 500;

interface SessionUsage {
  sessionKey: string;
  agentId: string;
  totalTokens: number;
  lastModel?: string;
  lastModelCtxMax: number;
  /** 已发出过的最高阈值（防抖：同 session 同阈值不重复警告）*/
  lastWarnedThreshold: number;
  lastUpdatedAt: number;
}

function pickAgentId(ctx: { agentId?: string } | undefined): string {
  return (ctx?.agentId ?? DEFAULT_AGENT_ID).trim() || DEFAULT_AGENT_ID;
}

function pickSessionKey(ctx: { sessionKey?: string; sessionId?: string } | undefined): string {
  return ((ctx?.sessionKey ?? ctx?.sessionId ?? "") + "").trim();
}

/**
 * 从 modelId 推断 ctx 上限。
 * 支持 "<provider>/<model>" 全 ref 或裸 modelId；先 strip provider 前缀再查表。
 */
function resolveCtxMax(modelId: string | undefined): number {
  if (!modelId) return DEFAULT_CTX_MAX;
  const bare = modelId.includes("/") ? modelId.split("/").pop()! : modelId;
  // 完全匹配
  if (KNOWN_MODEL_CTX_MAX[bare]) return KNOWN_MODEL_CTX_MAX[bare];
  // 前缀匹配（kimi-k2-anything → kimi-k2）
  for (const known of Object.keys(KNOWN_MODEL_CTX_MAX)) {
    if (bare.startsWith(known)) return KNOWN_MODEL_CTX_MAX[known];
  }
  // 启发式：含 1m / 1000k → 1M，含 256k → 256K，含 200k → 200K，含 128k → 128K
  if (/[-_](1m|1000k)/i.test(bare)) return 1_000_000;
  if (/[-_]256k/i.test(bare)) return 256_000;
  if (/[-_]200k/i.test(bare)) return 200_000;
  if (/[-_]128k/i.test(bare)) return 128_000;
  if (/[-_]32k/i.test(bare)) return 32_000;
  return DEFAULT_CTX_MAX;
}

/** 累加 usage：input + output + cacheRead（cacheRead 也占用 ctx） */
function sumUsage(usage: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; total?: number } | undefined): number {
  if (!usage) return 0;
  if (typeof usage.total === "number" && usage.total > 0) return usage.total;
  return (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0);
}

function buildHintBanner(percent: number, used: number, max: number, modelId: string): string {
  const pct = Math.round(percent * 100);
  return `【上下文用量提示 - ${pct}%】当前会话已累计使用 ~${used.toLocaleString()} / ${max.toLocaleString()} token（model=${modelId}）。
建议告一段落或在合适节点主动调用 \`/compact\` 总结当前会话，避免接近上限时被动截断。
(由 enhance context-watchdog 监测；阈值 ≥${pct}%。关闭：config.contextWatchdog.enabled=false)`;
}

function buildWarnBanner(percent: number, used: number, max: number, modelId: string): string {
  const pct = Math.round(percent * 100);
  return `⚠️ 【上下文警告 - ${pct}%】当前会话已使用 ~${used.toLocaleString()} / ${max.toLocaleString()} token，**强烈建议**立即采取行动：
  1. 优先：当前任务到达自然 checkpoint 时调用 \`/compact\` 让龙虾压缩历史
  2. 备选：完成手头任务后总结当前进度，提示用户开新会话续接
  3. 切模型：如果有更大 ctx 的模型可用（如 kimi-k2 256K / claude-opus-4.7-1m），可直接切换
继续大幅累积 token 会触发 ctx overflow 错误或丢失更早期的上下文。`;
}

function buildCriticalBanner(percent: number, used: number, max: number, modelId: string): string {
  const pct = Math.round(percent * 100);
  return `🚨 【上下文临界 - ${pct}%】**立即停止新任务**！当前会话已用 ~${used.toLocaleString()} / ${max.toLocaleString()} token，距离 ctx 上限不足 ${100 - pct}%。
**必须立刻**：
  1. 总结当前进度（一句话）+ 用 enhance_memory_store 持久化 key 决策
  2. 调用 \`/compact\` 或告知用户『上下文将满，请新开会话续接』
  3. 不要再读新文件 / 不要再调长 prompt 工具
继续走极易触发龙虾 model-fallback overflow handler，丢失最关键的近期上下文。`;
}

function buildEscalateHint(currentModel: string, currentMax: number, used: number, percent: number): string {
  const pct = Math.round(percent * 100);
  return `【建议切大 ctx 模型 - ${pct}%】当前 model=${currentModel}（ctx ${currentMax.toLocaleString()}），用量已达 ${pct}%。
长 ctx 候选（≥256K）：claude-opus-4.7-1m (1M) / gemini-2.5-pro (2M) / kimi-k2 (256K)
可调 enhance_route_set 工具切到 long-ctx tier，或让 model-router 自动选 LONG_CONTEXT_MODELS。`;
}

export function registerContextWatchdog(
  api: OpenClawPluginApi,
  config?: ContextWatchdogConfig,
) {
  if (config?.enabled === false) return;

  const hintAt = config?.hintAt ?? DEFAULT_HINT_AT;
  const warnAt = config?.warnAt ?? DEFAULT_WARN_AT;
  const criticalAt = config?.criticalAt ?? DEFAULT_CRITICAL_AT;
  const escalateAt = config?.escalateToLongCtxAt ?? DEFAULT_ESCALATE_AT;
  const debug = config?.debug === true;

  // 会话级累加器（in-memory；reset 后清零，符合龙虾会话生命周期）
  const sessions = new Map<string, SessionUsage>();

  function getOrCreate(sessionKey: string, agentId: string, modelId?: string): SessionUsage {
    let s = sessions.get(sessionKey);
    if (!s) {
      // LRU eviction 防止内存涨爆
      if (sessions.size >= MAX_TRACKED_SESSIONS) {
        const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUpdatedAt - b[1].lastUpdatedAt)[0];
        if (oldest) sessions.delete(oldest[0]);
      }
      s = {
        sessionKey,
        agentId,
        totalTokens: 0,
        lastModelCtxMax: resolveCtxMax(modelId),
        lastWarnedThreshold: 0,
        lastUpdatedAt: Date.now(),
      };
      sessions.set(sessionKey, s);
    }
    if (modelId && modelId !== s.lastModel) {
      s.lastModel = modelId;
      s.lastModelCtxMax = resolveCtxMax(modelId);
    }
    return s;
  }

  // ── hook 1: llm_output 累加 token usage ──
  api.on("llm_output", (event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return;
    const agentId = pickAgentId(ctx);
    const modelId = (event as any)?.resolvedRef ?? (event as any)?.model;
    const usageDelta = sumUsage((event as any)?.usage);
    if (usageDelta <= 0) return;

    const s = getOrCreate(sessionKey, agentId, modelId);
    s.totalTokens += usageDelta;
    s.lastUpdatedAt = Date.now();

    if (debug) {
      const pct = Math.round((s.totalTokens / s.lastModelCtxMax) * 100);
      api.logger.info(
        `[ctx-watchdog] +${usageDelta.toLocaleString()} → ${s.totalTokens.toLocaleString()}/${s.lastModelCtxMax.toLocaleString()} (${pct}%) | session=${sessionKey.slice(0, 12)} | model=${modelId}`,
      );
    }
  });

  // ── hook 2: after_compaction 重置（龙虾刚 compact 完，token 大幅下降）──
  // openclaw 2026.4.x dist 实际 emit after_compaction 但 SDK 类型 union 可能落后；
  // 跟 model_call_ended 一样用 cast 绕过类型检查
  (api.on as any)("after_compaction", (_event: any, ctx: any) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return;
    const s = sessions.get(sessionKey);
    if (!s) return;
    const before = s.totalTokens;
    // 假设 compaction 后剩 30% 的 token（保守估计；真实值龙虾不告诉我们）
    s.totalTokens = Math.round(s.totalTokens * 0.3);
    s.lastWarnedThreshold = 0; // 重置警告阈值
    s.lastUpdatedAt = Date.now();
    if (debug) {
      api.logger.info(
        `[ctx-watchdog] after_compaction: ${before.toLocaleString()} → ${s.totalTokens.toLocaleString()} | session=${sessionKey.slice(0, 12)}`,
      );
    }
  });

  // ── hook 3: before_prompt_build 注入预警 banner ──
  api.on("before_prompt_build", (_event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return undefined;
    const s = sessions.get(sessionKey);
    if (!s || s.totalTokens === 0) return undefined;

    const percent = s.totalTokens / s.lastModelCtxMax;
    const modelId = s.lastModel ?? "<unknown>";

    // 取最高命中阈值
    let triggeredThreshold = 0;
    let banner = "";
    if (percent >= criticalAt) {
      triggeredThreshold = criticalAt;
      banner = buildCriticalBanner(percent, s.totalTokens, s.lastModelCtxMax, modelId);
    } else if (percent >= warnAt) {
      triggeredThreshold = warnAt;
      banner = buildWarnBanner(percent, s.totalTokens, s.lastModelCtxMax, modelId);
    } else if (percent >= hintAt) {
      triggeredThreshold = hintAt;
      banner = buildHintBanner(percent, s.totalTokens, s.lastModelCtxMax, modelId);
    } else {
      return undefined;
    }

    // 防抖：同 session 同阈值只警告一次
    if (s.lastWarnedThreshold >= triggeredThreshold) return undefined;
    s.lastWarnedThreshold = triggeredThreshold;

    // ≥ 80% 且 model 还在 < 256K，附加切模型建议
    let final = banner;
    if (percent >= escalateAt && s.lastModelCtxMax < 256_000) {
      final = banner + "\n\n" + buildEscalateHint(modelId, s.lastModelCtxMax, s.totalTokens, percent);
    }

    api.logger.info(
      `[ctx-watchdog] threshold=${Math.round(triggeredThreshold * 100)}% triggered | session=${sessionKey.slice(0, 12)} | usage=${s.totalTokens}/${s.lastModelCtxMax}`,
    );

    return { prependContext: final };
  });

  // ── prompt supplement: 让 LLM 知道有 enhance_ctx_status 工具可查 ──
  api.registerMemoryPromptSupplement(() => {
    return [
      `【上下文用量】调用 enhance_ctx_status 可查当前会话 token 累计、距离 ctx 上限的百分比与建议。70%/85%/95% 自动 banner 提醒。`,
    ];
  });

  // ── tool: enhance_ctx_status 让 LLM 主动查 ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_ctx_status",
      description: "查询当前会话的上下文 token 用量、距离 ctx 上限百分比与建议",
      inputSchema: Type.Object({}),
      async execute() {
        const sessionKey = pickSessionKey(ctx);
        if (!sessionKey) {
          return { ok: false, reason: "no session key in ctx" };
        }
        const s = sessions.get(sessionKey);
        if (!s || s.totalTokens === 0) {
          return {
            ok: true,
            sessionKey: sessionKey.slice(0, 16) + "…",
            tokensUsed: 0,
            ctxMax: s?.lastModelCtxMax ?? DEFAULT_CTX_MAX,
            percent: 0,
            severity: "fresh",
            recommendation: "会话刚开始或未捕获到 llm_output usage（可能模型没返 usage 字段）",
          };
        }
        const percent = s.totalTokens / s.lastModelCtxMax;
        const pctRound = Math.round(percent * 100);
        let severity: "ok" | "hint" | "warn" | "critical";
        let recommendation: string;
        if (percent >= criticalAt) {
          severity = "critical";
          recommendation = "🚨 立即停止新任务，先 /compact 或新会话续接";
        } else if (percent >= warnAt) {
          severity = "warn";
          recommendation = "⚠️ 强烈建议尽快 /compact 或切大 ctx 模型";
        } else if (percent >= hintAt) {
          severity = "hint";
          recommendation = "💡 建议在合适 checkpoint /compact，或继续注意累积";
        } else {
          severity = "ok";
          recommendation = "上下文用量健康，继续即可";
        }
        return {
          ok: true,
          sessionKey: sessionKey.slice(0, 16) + "…",
          model: s.lastModel,
          tokensUsed: s.totalTokens,
          ctxMax: s.lastModelCtxMax,
          percent: pctRound,
          severity,
          recommendation,
          shouldEscalate: percent >= escalateAt && s.lastModelCtxMax < 256_000,
          longCtxCandidates: percent >= escalateAt
            ? ["claude-opus-4.7-1m (1M)", "gemini-2.5-pro (2M)", "kimi-k2 (256K)"]
            : undefined,
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  api.logger.info(
    `[enhance] context-watchdog v6.5.3 已加载（hint=${Math.round(hintAt * 100)}% warn=${Math.round(warnAt * 100)}% critical=${Math.round(criticalAt * 100)}% escalate=${Math.round(escalateAt * 100)}%）`,
  );
}
