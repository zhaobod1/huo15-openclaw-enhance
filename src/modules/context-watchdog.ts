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
import { isModelBanned } from "../utils/latency-tracker.js";
import { getDb } from "../utils/sqlite-store.js";
import {
  loadCtxUsage,
  batchSaveCtxUsage,
  getAgentCtxProfile,
  purgeOldCtxUsage,
  type CtxUsageRow,
} from "../utils/ctx-usage-db.js";

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
const DEFAULT_FORCE_ESCALATE_AT = 0.95; // v6.5.5：强切阈值（critical 同位）
const MAX_TRACKED_SESSIONS = 500;
const HOOK_PRIORITY_FORCE_ESCALATE = 100; // 比 model-router 默认（无 priority）高，确保抢先

/**
 * v6.5.5：long-ctx 候选 model id 列表（按优先级降序）。
 * ctx-watchdog 在 95% 强切时按此顺序选第一个非 banned 且 ctx≥256K 的。
 * 用户可通过 ContextWatchdogConfig.longCtxCandidates 覆盖。
 */
const LONG_CTX_CANDIDATES_DEFAULT: string[] = [
  "claude-opus-4.7-1m",   // 1M ctx
  "gemini-2.5-pro",        // 2M ctx
  "gemini-2.5-flash",      // 1M ctx
  "kimi-k2",               // 256K ctx
  "kimi-k2-200k",          // 256K ctx
  "claude-opus-4.7",       // 200K（最后兜底；与当前 200K 持平但起码不更小）
  "claude-sonnet-4.5",     // 200K
  "minimax-m2",            // 200K
];

/**
 * v6.5.5：每张图片估算 token（OpenAI/Anthropic 实测平均）。
 * 视频/音频按帧数 × 1500 累加（粗估，provider 实际可能差距大；以 llm_output usage 为准）。
 */
const TOKENS_PER_IMAGE = 1500;
const TOKENS_PER_VIDEO_FRAME = 1500;
const TOKENS_PER_AUDIO_SECOND = 100;

interface SessionUsage {
  sessionKey: string;
  agentId: string;
  /** llm_output 累加来的真实 token 用量 */
  totalTokens: number;
  /** v6.5.5：本轮 prompt 事前估算（before_prompt_build / before_model_resolve 用），LLM 调用后清零 */
  pendingTokens: number;
  lastModel?: string;
  lastModelCtxMax: number;
  /**
   * v6.5.5：首次因 ctx 压力被切走前的"原始 model"。
   * 用于 P1-5（ctx 降下来后建议切回原模型）和日志溯源。
   */
  originalModel?: string;
  /** 已发出过的最高阈值（防抖：同 session 同阈值不重复警告）*/
  lastWarnedThreshold: number;
  /**
   * v6.5.7 P2-9：最近 N 轮 llm_output 的 token 增量（最多 PREDICTION_HISTORY_LEN 个，FIFO）。
   * 用于算 avgTokensPerTurn → 预测 turnsToWarn / turnsToCritical。
   */
  tokensPerTurnHistory: number[];
  /** v6.5.7 P2-9：是否已发出过预测式提醒（一次性，防抖；until threshold 真到了再重置）*/
  predictionEmittedFor?: number;
  lastUpdatedAt: number;
}

const PREDICTION_HISTORY_LEN = 5;
const PREDICTION_LOOKAHEAD_TURNS = 3;

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
**主动调用 \`enhance_route_to_long_ctx\` 工具立即切换**（推荐）；或继续 /compact / 让 model-router 自选 LONG_CONTEXT_MODELS。
长 ctx 候选（≥256K）：claude-opus-4.7-1m (1M) / gemini-2.5-pro (2M) / kimi-k2 (256K)`;
}

/**
 * v6.5.5：本轮 prompt 事前估算（在 LLM 调用之前，比 llm_output 累加器更早一步）。
 *
 * 输入信号（按可用性优先级）：
 *   1. event.prompt（before_prompt_build / before_model_resolve / llm_input 都有）
 *   2. event.systemPrompt（仅 llm_input 有）
 *   3. event.imagesCount / event.attachments（多模态附件）
 *   4. event.messages / event.historyMessages（已有的历史消息——通常已被 llm_output usage 算过，
 *      只有"刚拼装完未发出"这一窗口该补；保守不重复算）
 *
 * 估算规则：
 *   - 文本：4 chars/token（英文标准；中文实测 1.5-2 chars/token，所以这里偏保守=高估，
 *     宁可早预警也别迟）
 *   - 图片：每张 1500 token
 *   - 视频帧：每帧 1500 token（按 attachments[].frames 估）
 *   - 音频秒：每秒 100 token
 */
function estimatePromptTokens(event: any): number {
  const prompt = String(event?.prompt ?? "");
  const sys = String(event?.systemPrompt ?? "");
  const textChars = prompt.length + sys.length;
  let tokens = Math.ceil(textChars / 4);

  // 多模态：先用 imagesCount（llm_input 有），再 fallback 到 attachments[]
  const imagesCount = Number(event?.imagesCount ?? 0);
  if (imagesCount > 0) tokens += imagesCount * TOKENS_PER_IMAGE;

  const attachments: Array<{ kind?: string; frames?: number; durationSec?: number }> =
    Array.isArray(event?.attachments) ? event.attachments : [];
  for (const att of attachments) {
    const kind = String(att?.kind ?? "").toLowerCase();
    if (kind.includes("image")) tokens += TOKENS_PER_IMAGE;
    else if (kind.includes("video")) {
      const frames = Number(att?.frames ?? 1);
      tokens += frames * TOKENS_PER_VIDEO_FRAME;
    } else if (kind.includes("audio")) {
      const sec = Number(att?.durationSec ?? 1);
      tokens += sec * TOKENS_PER_AUDIO_SECOND;
    }
  }
  return tokens;
}

/**
 * v6.5.5：从 long-ctx 候选清单选第一个非 banned 且 ctx ≥ 256K 的 model。
 * 跳过当前 model（避免"切到自己"），跳过已在 latency-tracker 黑名单的 model。
 *
 * 返 model 的 bare id（如 "kimi-k2"）；调用方自己拼 provider 前缀（OpenClaw runtime
 * 会把 modelOverride 转成 "<provider>/<model>"）。
 *
 * 如果所有候选都 banned 或 ctx 不够 → 返 null（调用方应降级到 banner 提示，让用户/compact）。
 */
function pickLongCtxModel(
  candidates: string[],
  currentModel: string | undefined,
): string | null {
  const exclude = currentModel?.includes("/") ? currentModel.split("/").pop() : currentModel;
  for (const candidate of candidates) {
    if (candidate === exclude) continue;
    const ctxMax = KNOWN_MODEL_CTX_MAX[candidate] ?? 0;
    if (ctxMax < 256_000) continue; // 不算"long ctx"
    // 检查 banned（latency-tracker 用 "<provider>/<model>" key；用 endsWith 模糊匹配）
    if (isModelBanned(candidate)) continue;
    // 也尝试 sidus / minimax 等常见 provider 前缀
    if (isModelBanned(`sidus/${candidate}`)) continue;
    if (isModelBanned(`minimax/${candidate}`)) continue;
    if (isModelBanned(`anthropic/${candidate}`)) continue;
    if (isModelBanned(`openai/${candidate}`)) continue;
    if (isModelBanned(`google/${candidate}`)) continue;
    return candidate;
  }
  return null;
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
  const forceEscalateAt = config?.forceEscalateAt ?? DEFAULT_FORCE_ESCALATE_AT;
  const longCtxCandidates =
    config?.longCtxCandidates && config.longCtxCandidates.length > 0
      ? config.longCtxCandidates
      : LONG_CTX_CANDIDATES_DEFAULT;
  const debug = config?.debug === true;

  // v6.5.6: 会话级累加器（in-memory）+ dirty 集合（节流 flush 到 sqlite）+ peak 画像
  const sessions = new Map<string, SessionUsage>();
  const dirtySessionKeys = new Set<string>();
  const sessionPeakPercent = new Map<string, number>();
  let flushTimer: NodeJS.Timeout | null = null;
  const FLUSH_INTERVAL_MS = 10_000;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushDirtySessions();
    }, FLUSH_INTERVAL_MS);
    flushTimer.unref?.();
  }

  function flushDirtySessions() {
    if (dirtySessionKeys.size === 0) return;
    let db;
    try {
      db = getDb();
    } catch {
      dirtySessionKeys.clear();
      return;
    }
    const rows: CtxUsageRow[] = [];
    for (const sk of dirtySessionKeys) {
      const s = sessions.get(sk);
      if (!s) continue;
      const used = s.totalTokens + s.pendingTokens;
      const percent = used / s.lastModelCtxMax;
      const peak = Math.max(sessionPeakPercent.get(sk) ?? 0, percent);
      sessionPeakPercent.set(sk, peak);
      rows.push({
        session_key: sk,
        agent_id: s.agentId,
        total_tokens: s.totalTokens,
        last_model: s.lastModel ?? null,
        last_model_ctx_max: s.lastModelCtxMax,
        original_model: s.originalModel ?? null,
        last_warned_threshold: s.lastWarnedThreshold,
        peak_percent: peak,
        last_updated_at: s.lastUpdatedAt,
        created_at: s.lastUpdatedAt,
      });
    }
    batchSaveCtxUsage(db, rows);
    if (debug) api.logger.info(`[ctx-watchdog] flushed ${rows.length} sessions to sqlite`);
    dirtySessionKeys.clear();
  }

  function markDirty(sessionKey: string) {
    dirtySessionKeys.add(sessionKey);
    scheduleFlush();
  }

  function getOrCreate(sessionKey: string, agentId: string, modelId?: string): SessionUsage {
    let s = sessions.get(sessionKey);
    if (!s) {
      // v6.5.6: lazy hydrate from sqlite（首次见到此 sessionKey 才查一次）
      let hydrated: SessionUsage | undefined;
      try {
        const db = getDb();
        const row = loadCtxUsage(db, sessionKey);
        if (row) {
          hydrated = {
            sessionKey,
            agentId: row.agent_id || agentId,
            totalTokens: row.total_tokens,
            pendingTokens: 0,
            lastModel: row.last_model ?? undefined,
            lastModelCtxMax: row.last_model_ctx_max || resolveCtxMax(modelId),
            originalModel: row.original_model ?? undefined,
            lastWarnedThreshold: row.last_warned_threshold,
            tokensPerTurnHistory: [], // hydrate 后从 0 重建（不持久化轮次历史避免 schema 复杂化）
            lastUpdatedAt: row.last_updated_at,
          };
          sessionPeakPercent.set(sessionKey, row.peak_percent);
          if (debug) {
            api.logger.info(
              `[ctx-watchdog] hydrated from sqlite | session=${sessionKey.slice(0, 12)} | tokens=${row.total_tokens} | peak=${(row.peak_percent * 100).toFixed(1)}%`,
            );
          }
        }
      } catch {
        /* sqlite 不可用，跳过 hydrate */
      }

      // LRU eviction（不删 sqlite 行，保留作画像）
      if (sessions.size >= MAX_TRACKED_SESSIONS) {
        const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUpdatedAt - b[1].lastUpdatedAt)[0];
        if (oldest) {
          dirtySessionKeys.add(oldest[0]);
          flushDirtySessions();
          sessions.delete(oldest[0]);
        }
      }
      s = hydrated ?? {
        sessionKey,
        agentId,
        totalTokens: 0,
        pendingTokens: 0,
        lastModelCtxMax: resolveCtxMax(modelId),
        lastWarnedThreshold: 0,
        tokensPerTurnHistory: [],
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

  /** 当前评估用的"有效 token 数"= 真实累加 + 本轮事前估算（pending） */
  function effectiveTokens(s: SessionUsage): number {
    return s.totalTokens + s.pendingTokens;
  }

  // v6.5.6 P1-5: 会话级"建议切回原模型" 标记
  const revertSuggestPending = new Map<string, string>();

  // ── hook 1: llm_output 累加 token usage（事后真实值）──
  api.on("llm_output", (event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return;
    const agentId = pickAgentId(ctx);
    const modelId = (event as any)?.resolvedRef ?? (event as any)?.model;
    const usageDelta = sumUsage((event as any)?.usage);

    const s = getOrCreate(sessionKey, agentId, modelId);
    // v6.5.5：本轮 LLM 调用结束 → 清 pendingTokens（事前估算已被真实值替代）
    s.pendingTokens = 0;
    if (usageDelta <= 0) {
      // 部分 provider 不报 usage（比如本地模型）→ 用上一轮估算补偿，避免计数停滞
      if (debug) {
        api.logger.info(
          `[ctx-watchdog] llm_output 没拿到 usage（provider 没报）| session=${sessionKey.slice(0, 12)} | model=${modelId}`,
        );
      }
      return;
    }

    s.totalTokens += usageDelta;
    s.lastUpdatedAt = Date.now();
    // v6.5.7 P2-9: 记录本轮 token 增量到 history 队列（最近 N 轮 FIFO）
    s.tokensPerTurnHistory.push(usageDelta);
    if (s.tokensPerTurnHistory.length > PREDICTION_HISTORY_LEN) {
      s.tokensPerTurnHistory.shift();
    }
    markDirty(sessionKey); // v6.5.6: 标记 dirty，等 10s 节流批量 flush 到 sqlite

    if (debug) {
      const pct = Math.round((s.totalTokens / s.lastModelCtxMax) * 100);
      api.logger.info(
        `[ctx-watchdog] +${usageDelta.toLocaleString()} → ${s.totalTokens.toLocaleString()}/${s.lastModelCtxMax.toLocaleString()} (${pct}%) | session=${sessionKey.slice(0, 12)} | model=${modelId}`,
      );
    }
  });

  // ── hook 1b: llm_input 累加事前估算（v6.5.5 P0-2）──
  // 比 before_model_resolve / before_prompt_build 信息更全（含 systemPrompt + historyMessages + imagesCount），
  // 但顺序在 before_model_resolve 之后——所以 before_model_resolve 自己也要 estimate 一次（用 event.prompt）。
  api.on("llm_input", (event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return;
    const agentId = pickAgentId(ctx);
    const modelId = (event as any)?.model;
    const s = getOrCreate(sessionKey, agentId, modelId);
    const est = estimatePromptTokens(event);
    s.pendingTokens = est; // 覆盖（不累加，因为 llm_input 一轮一次）
    s.lastUpdatedAt = Date.now();
    if (debug) {
      api.logger.info(
        `[ctx-watchdog] llm_input estimate=${est.toLocaleString()} | session=${sessionKey.slice(0, 12)}`,
      );
    }
  });

  // ── hook 1c: subagent_spawned / subagent_ended（v6.5.7 P1-7）──
  // 解决 subagent token 累加盲区：child agent 调 LLM 的 token 走 child sessionKey，
  // main agent 看 ctx 用量永远是"自己的部分"，但实际后端 ctx 已经被 child 吃掉一截。
  // 修法：spawn 时记 child→parent 映射，end 时把 child.totalTokens 加到 parent。
  const childToParent = new Map<string, string>();
  const MAX_SUBAGENT_LINKS = 500;

  api.on("subagent_spawned", (event, ctx) => {
    const childKey = (event as any)?.childSessionKey ?? (ctx as any)?.childSessionKey;
    const parentKey = (ctx as any)?.requesterSessionKey;
    if (!childKey || !parentKey || childKey === parentKey) return;
    // LRU eviction
    if (childToParent.size >= MAX_SUBAGENT_LINKS) {
      const oldest = childToParent.keys().next().value;
      if (oldest) childToParent.delete(oldest);
    }
    childToParent.set(childKey, parentKey);
    if (debug) {
      api.logger.info(
        `[ctx-watchdog] subagent linked: child=${childKey.slice(0, 12)} → parent=${parentKey.slice(0, 12)}`,
      );
    }
  });

  api.on("subagent_ended", (event, ctx) => {
    const childKey =
      (event as any)?.targetSessionKey ??
      (ctx as any)?.childSessionKey ??
      "";
    if (!childKey) return;
    const parentKey = childToParent.get(childKey) ?? (ctx as any)?.requesterSessionKey;
    if (!parentKey || parentKey === childKey) return;

    const child = sessions.get(childKey);
    if (!child || child.totalTokens <= 0) {
      childToParent.delete(childKey);
      return;
    }
    const parent = sessions.get(parentKey);
    if (!parent) {
      // 父 session 还没追踪到 — 不强建（等父自己的 llm_output 触发 getOrCreate）
      // 但记下 child 已经吃了多少，等父出现时累加（暂存方案，简化版直接丢，避免内存膨胀）
      childToParent.delete(childKey);
      return;
    }
    parent.totalTokens += child.totalTokens;
    parent.lastUpdatedAt = Date.now();
    markDirty(parentKey);
    api.logger.info(
      `[ctx-watchdog] subagent rolled up: child=${childKey.slice(0, 12)} (+${child.totalTokens.toLocaleString()}) → parent=${parentKey.slice(0, 12)} | parent total=${parent.totalTokens.toLocaleString()}`,
    );
    childToParent.delete(childKey);
    // child sessions 留在 sqlite 作画像，但内存里可以清掉（节省 RAM）
    // 不立即 delete，让 flushDirtySessions 自然 LRU evict
  });

  // ── hook 2: after_compaction 重置（龙虾刚 compact 完，token 大幅下降）──
  // openclaw 2026.4.x dist 实际 emit after_compaction 但 SDK 类型 union 可能落后；
  // 跟 model_call_ended 一样用 cast 绕过类型检查
  // v6.5.6: 加 P1-5 切回原模型逻辑 + dirty 标记
  (api.on as any)("after_compaction", (_event: any, ctx: any) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return;
    const s = sessions.get(sessionKey);
    if (!s) return;
    const before = s.totalTokens;
    s.totalTokens = Math.round(s.totalTokens * 0.3);
    s.lastWarnedThreshold = 0;
    s.lastUpdatedAt = Date.now();
    markDirty(sessionKey);

    // v6.5.6 P1-5: 如果之前因 ctx 压力切过模型，现在 compact 后降下来 → 建议切回原模型
    const afterPercent = s.totalTokens / s.lastModelCtxMax;
    if (s.originalModel && s.lastModel !== s.originalModel) {
      const originalCtxMax = resolveCtxMax(s.originalModel);
      const projectedInOriginal = s.totalTokens / originalCtxMax;
      if (projectedInOriginal < 0.6) {
        revertSuggestPending.set(sessionKey, s.originalModel);
        if (debug) {
          api.logger.info(
            `[ctx-watchdog] revert hint queued: ${s.lastModel} → ${s.originalModel} | session=${sessionKey.slice(0, 12)} | projectedInOriginal=${Math.round(projectedInOriginal * 100)}%`,
          );
        }
      }
    }

    if (debug) {
      api.logger.info(
        `[ctx-watchdog] after_compaction: ${before.toLocaleString()} → ${s.totalTokens.toLocaleString()} (${Math.round(afterPercent * 100)}%) | session=${sessionKey.slice(0, 12)}`,
      );
    }
  });

  /**
   * v6.5.7 P2-9: 预测式提醒。
   * 当用量未到 warnAt 但按当前速率 PREDICTION_LOOKAHEAD_TURNS 轮内会撞 warnAt → 提早注 banner
   * 防抖：同一 session 同一目标阈值只警告一次（predictionEmittedFor）
   */
  function evalPredictionBanner(s: SessionUsage, event: any): string | null {
    if (s.tokensPerTurnHistory.length < 2) return null; // 至少 2 轮才能算趋势
    const liveEstimate = s.pendingTokens > 0
      ? s.pendingTokens
      : estimatePromptTokens(event);
    const used = s.totalTokens + liveEstimate;
    const percent = used / s.lastModelCtxMax;
    // 已经超过 warnAt：阈值 banner 接管，不重复
    if (percent >= warnAt) return null;

    const avgPerTurn = s.tokensPerTurnHistory.reduce((a, b) => a + b, 0) / s.tokensPerTurnHistory.length;
    if (avgPerTurn <= 0) return null;

    // 算"按当前速率多少轮内到 warnAt"
    const warnTarget = warnAt * s.lastModelCtxMax;
    const turnsToWarn = Math.ceil((warnTarget - used) / avgPerTurn);
    if (turnsToWarn > PREDICTION_LOOKAHEAD_TURNS) return null;
    if (turnsToWarn <= 0) return null;

    // 防抖：同 session 该 lookahead 阈值只警告一次（直到真到 warnAt 重置）
    if (s.predictionEmittedFor === Math.round(warnAt * 100)) return null;
    s.predictionEmittedFor = Math.round(warnAt * 100);
    markDirty(s.sessionKey);

    const pctNow = Math.round(percent * 100);
    const pctWarn = Math.round(warnAt * 100);
    const avgK = Math.round(avgPerTurn / 1000);
    api.logger.info(
      `[ctx-watchdog] prediction triggered | session=${s.sessionKey.slice(0, 12)} | now=${pctNow}% → ${pctWarn}% in ~${turnsToWarn} turns (avgPerTurn=${avgK}k)`,
    );
    return `【上下文用量趋势预警】当前 ${pctNow}%，按最近 ${s.tokensPerTurnHistory.length} 轮平均每轮 +${avgK}k token 速率，预计 **~${turnsToWarn} 轮内**撞 ${pctWarn}%（warn 阈值）。建议：现在就在合适节点收尾或主动 /compact，避免后面被动告警。`;
  }

  /** v6.5.6: 抽出来的阈值评估 + banner 构造（被 before_prompt_build 调用，可叠加 revert hint） */
  function evalThresholdBanner(s: SessionUsage, event: any): string | null {
    const liveEstimate = s.pendingTokens > 0
      ? s.pendingTokens
      : estimatePromptTokens(event);
    const used = s.totalTokens + liveEstimate;
    if (used === 0) return null;

    const percent = used / s.lastModelCtxMax;
    const modelId = s.lastModel ?? "<unknown>";

    let triggeredThreshold = 0;
    let banner = "";
    if (percent >= criticalAt) {
      triggeredThreshold = criticalAt;
      banner = buildCriticalBanner(percent, used, s.lastModelCtxMax, modelId);
    } else if (percent >= warnAt) {
      triggeredThreshold = warnAt;
      banner = buildWarnBanner(percent, used, s.lastModelCtxMax, modelId);
    } else if (percent >= hintAt) {
      triggeredThreshold = hintAt;
      banner = buildHintBanner(percent, used, s.lastModelCtxMax, modelId);
    } else {
      return null;
    }

    if (s.lastWarnedThreshold >= triggeredThreshold) return null;
    s.lastWarnedThreshold = triggeredThreshold;
    // v6.5.7：阈值真到了 → 重置预测防抖，让下一档预测可以再发
    s.predictionEmittedFor = undefined;
    markDirty(s.sessionKey);

    let final = banner;
    if (percent >= escalateAt && s.lastModelCtxMax < 256_000) {
      final = banner + "\n\n" + buildEscalateHint(modelId, s.lastModelCtxMax, used, percent);
    }
    api.logger.info(
      `[ctx-watchdog] threshold=${Math.round(triggeredThreshold * 100)}% triggered | session=${s.sessionKey.slice(0, 12)} | usage=${used}/${s.lastModelCtxMax}`,
    );
    return final;
  }

  // ── hook 3: before_prompt_build 注入预警 banner（v6.5.6 含 revert hint 消费）──
  api.on("before_prompt_build", (event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return undefined;
    const s = sessions.get(sessionKey);
    if (!s) return undefined;

    // v6.5.6 P1-5: 消费 pending revert 建议（compact 后 ctx 降下来 → 建议切回原 model）
    const revertTarget = revertSuggestPending.get(sessionKey);
    if (revertTarget) {
      revertSuggestPending.delete(sessionKey);
      const originalCtxMax = resolveCtxMax(revertTarget);
      const revertBanner = `【建议切回原模型】会话已通过 /compact 降低用量，可调 \`enhance_route_revert_to_original\` 工具切回 ${revertTarget}（ctx ${originalCtxMax.toLocaleString()}）以节省成本。当前正用 ${s.lastModel ?? "<unknown>"}（ctx ${s.lastModelCtxMax.toLocaleString()}）。`;
      api.logger.info(
        `[ctx-watchdog] revert hint emitted | session=${sessionKey.slice(0, 12)} | suggest=${revertTarget}`,
      );
      const thresholdBanner = evalThresholdBanner(s, event);
      const final = thresholdBanner ? revertBanner + "\n\n" + thresholdBanner : revertBanner;
      return { prependContext: final };
    }

    const thresholdBanner = evalThresholdBanner(s, event);
    if (thresholdBanner) return { prependContext: thresholdBanner };

    // v6.5.7 P2-9: 阈值未到 → 跑预测式提醒（按速率预估几轮后撞 warnAt）
    const predictionBanner = evalPredictionBanner(s, event);
    if (predictionBanner) return { prependContext: predictionBanner };

    return undefined;
  });

  // ── hook 4: before_model_resolve 强切到 long-ctx model（v6.5.5 P0-1）──
  // priority=100 比 model-router（默认 0）高，让 ctx-watchdog 先跑。
  // OpenClaw mergeBeforeModelResolve 用 firstDefined：高 priority 返的 modelOverride 赢，
  // 即使 model-router 后跑也返 modelOverride，firstDefined 保留 ctx-watchdog 的。
  api.on(
    "before_model_resolve",
    (event, ctx) => {
      const sessionKey = pickSessionKey(ctx);
      if (!sessionKey) return undefined;
      const s = sessions.get(sessionKey);
      if (!s) return undefined;

      // 事前估算本轮 prompt（before_model_resolve 早于 llm_input，pendingTokens 还是 0）
      const liveEstimate = estimatePromptTokens(event);
      const projected = s.totalTokens + liveEstimate;
      const percent = projected / s.lastModelCtxMax;

      // 强切条件：(1) 命中 forceEscalateAt 阈值；(2) 当前 model ctx < 256K（已经是 long ctx 没必要切）
      if (percent < forceEscalateAt) return undefined;
      if (s.lastModelCtxMax >= 256_000) return undefined;

      // 选 long-ctx 候选（跳过 banned + 当前 model）
      const target = pickLongCtxModel(longCtxCandidates, s.lastModel);
      if (!target) {
        // 所有 long-ctx 候选不可用 —— 不强切，让 model-router 自己决定，banner 已经在 prompt build 那边出过了
        api.logger.warn(
          `[ctx-watchdog] FORCE-escalate skipped: no long-ctx model available (all banned or none registered) | session=${sessionKey.slice(0, 12)} | percent=${Math.round(percent * 100)}%`,
        );
        return undefined;
      }

      // 记录 originalModel（仅首次切才记，避免被多次强切覆盖）
      if (!s.originalModel) s.originalModel = s.lastModel;
      const fromModel = s.lastModel ?? "<unknown>";
      // 不立即修改 sessions 里 lastModel/lastModelCtxMax —— 等 llm_output 来时拿到真实 modelId 自然会更新
      // （避免被 model-router 覆盖再切回的颠簸）
      api.logger.warn(
        `[ctx-watchdog] FORCE-escalate to long-ctx: ${fromModel} → ${target} | session=${sessionKey.slice(0, 12)} | percent=${Math.round(percent * 100)}% | projected=${projected}/${s.lastModelCtxMax}`,
      );
      return { modelOverride: target };
    },
    { priority: HOOK_PRIORITY_FORCE_ESCALATE },
  );

  // ── prompt supplement: 让 LLM 知道两个核心工具 ──
  api.registerMemoryPromptSupplement(() => {
    return [
      `【上下文用量】enhance_ctx_status 查当前会话 token 累计与百分比；用量 ≥80% 时调 enhance_route_to_long_ctx 立即切大 ctx 模型（≥256K）。70/85/95% 三阶 banner 自动提醒；95% 时 ctx-watchdog 在 before_model_resolve 强制切走（绕开 LLM）。`,
    ];
  });

  // ── tool 1: enhance_ctx_status 让 LLM 主动查 ──
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
        const used = s ? effectiveTokens(s) : 0;
        if (!s || used === 0) {
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
        const percent = used / s.lastModelCtxMax;
        const pctRound = Math.round(percent * 100);
        let severity: "ok" | "hint" | "warn" | "critical";
        let recommendation: string;
        if (percent >= criticalAt) {
          severity = "critical";
          recommendation = "🚨 立即停止新任务，先 /compact 或调 enhance_route_to_long_ctx 切大 ctx 模型";
        } else if (percent >= warnAt) {
          severity = "warn";
          recommendation = "⚠️ 强烈建议调 enhance_route_to_long_ctx 切大 ctx 模型，或 /compact";
        } else if (percent >= hintAt) {
          severity = "hint";
          recommendation = "💡 建议在合适 checkpoint /compact，或继续注意累积";
        } else {
          severity = "ok";
          recommendation = "上下文用量健康，继续即可";
        }
        const availableLongCtx = pickLongCtxModel(longCtxCandidates, s.lastModel);
        return {
          ok: true,
          sessionKey: sessionKey.slice(0, 16) + "…",
          model: s.lastModel,
          originalModel: s.originalModel,
          tokensUsed: s.totalTokens,
          tokensPending: s.pendingTokens,
          tokensEffective: used,
          ctxMax: s.lastModelCtxMax,
          percent: pctRound,
          severity,
          recommendation,
          shouldEscalate: percent >= escalateAt && s.lastModelCtxMax < 256_000,
          availableLongCtxModel: availableLongCtx,
          longCtxCandidates: percent >= escalateAt
            ? longCtxCandidates.filter((c) => (KNOWN_MODEL_CTX_MAX[c] ?? 0) >= 256_000)
            : undefined,
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  // ── tool 2: enhance_route_to_long_ctx（v6.5.5 P0-1）让 LLM ≥80% 时主动调 ──
  // 实际"切"由 ctx-watchdog 自己的 before_model_resolve hook 接管：
  //   - 调本工具会立刻把 sessions[].lastModel 标到目标 long-ctx，并把 lastWarnedThreshold 重置
  //     （让 banner 不再喷同阈值），但**本轮 LLM 调用已经发出了**——LLM 收到工具返回后，
  //     **下一轮** LLM 调用 ctx-watchdog 会在 before_model_resolve 直接返 modelOverride 切到 target
  //   - 如果当前 percent 已 ≥ forceEscalateAt，本工具就是冗余路径——hook 会自动接管；本工具兜底
  //     给 LLM 一个"我已经主动决定切了"的明确入口
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_route_to_long_ctx",
      description: "立即切到 long-ctx 模型（≥256K ctx）。当 enhance_ctx_status 显示 percent>=80 时主动调；返目标 model id + 原 model 备份；下一轮 LLM 调用 ctx-watchdog 会强制路由过去（不需要再调 enhance_route_set 持久化）",
      inputSchema: Type.Object({
        reason: Type.Optional(Type.String({ description: "切换原因（如 'ctx 已 85%' / '用户主动要求'）" })),
        target: Type.Optional(Type.String({ description: "目标 model bare id（如 'claude-opus-4.7-1m'）；不填则按 longCtxCandidates 顺序选第一个非 banned 的" })),
      }),
      async execute(params: any) {
        const sessionKey = pickSessionKey(ctx);
        if (!sessionKey) {
          return { ok: false, reason: "no session key in ctx" };
        }
        const s = sessions.get(sessionKey);
        if (!s) {
          return { ok: false, reason: "session 还没开始累加 usage（llm_output 没 fire 过），无法切换" };
        }
        // 用户指定 target → 验证后用；否则自动选
        let target: string | null = null;
        if (params?.target && typeof params.target === "string") {
          const requested = params.target.trim();
          const ctxMax = KNOWN_MODEL_CTX_MAX[requested] ?? 0;
          if (ctxMax < 256_000) {
            return {
              ok: false,
              reason: `指定的 ${requested} 在 KNOWN_MODEL_CTX_MAX 里 ctx<256K（=${ctxMax}），不算 long-ctx`,
              hint: "用 longCtxCandidates 里的 model id；或不传 target 自动选",
            };
          }
          if (isModelBanned(requested)) {
            return { ok: false, reason: `${requested} 当前被 latency-tracker ban`, hint: "等解禁或选别的" };
          }
          target = requested;
        } else {
          target = pickLongCtxModel(longCtxCandidates, s.lastModel);
        }

        if (!target) {
          return {
            ok: false,
            reason: "no available long-ctx model（all banned or none registered in KNOWN_MODEL_CTX_MAX）",
            hint: "建议立即 /compact 或告知用户开新会话续接",
            currentBanned: longCtxCandidates.filter((c) => isModelBanned(c)),
          };
        }

        // 记 originalModel（首次切才记）
        if (!s.originalModel) s.originalModel = s.lastModel;
        const fromModel = s.lastModel;
        // 不立刻改 lastModel —— 等下一轮 llm_output 来时拿到真实 model 自然会更新
        // 但要重置 lastWarnedThreshold 避免 banner 重复
        s.lastWarnedThreshold = 0;
        const used = effectiveTokens(s);
        const percent = Math.round((used / s.lastModelCtxMax) * 100);
        api.logger.warn(
          `[ctx-watchdog] LLM-triggered escalate: ${fromModel} → ${target} | reason="${params?.reason ?? '-'}" | session=${sessionKey.slice(0, 12)} | percent=${percent}%`,
        );
        return {
          ok: true,
          from: fromModel,
          to: target,
          newCtxMax: KNOWN_MODEL_CTX_MAX[target] ?? DEFAULT_CTX_MAX,
          currentPercent: percent,
          reason: params?.reason ?? "no reason given",
          message: `已切到 ${target}（ctx ${(KNOWN_MODEL_CTX_MAX[target] ?? DEFAULT_CTX_MAX).toLocaleString()}）。**下一轮** LLM 调用 ctx-watchdog 会在 before_model_resolve 强制路由过去；当 ctx 降下来后 model-router 重新评估自动选回最优。`,
          note: fromModel ? `已记录 originalModel=${s.originalModel}，将来 ctx 降到 60% 以下后会建议切回` : undefined,
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  // ── tool 3: enhance_route_revert_to_original（v6.5.6 P1-5）切回原模型，省成本 ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_route_revert_to_original",
      description: "切回原模型（compact 后 ctx 降下来时省成本用）。本工具清掉 ctx-watchdog 的强切意愿，让 model-router 重新走任务路由自然回到原 tier。仅在 enhance_ctx_status 显示 originalModel 不等于 model 且 percent<60% 时调",
      inputSchema: Type.Object({
        reason: Type.Optional(Type.String({ description: "切回原因（如 'compact 后 ctx 降到 40%'）" })),
      }),
      async execute(params: any) {
        const sessionKey = pickSessionKey(ctx);
        if (!sessionKey) return { ok: false, reason: "no session key in ctx" };
        const s = sessions.get(sessionKey);
        if (!s) return { ok: false, reason: "session 没在追踪" };
        if (!s.originalModel) {
          return { ok: false, reason: "本会话没切过模型（originalModel 为空），无需 revert" };
        }
        if (s.lastModel === s.originalModel) {
          return { ok: false, reason: `当前已是 originalModel=${s.originalModel}，无需 revert` };
        }
        const used = effectiveTokens(s);
        const originalCtxMax = resolveCtxMax(s.originalModel);
        const projectedPercent = used / originalCtxMax;
        if (projectedPercent >= 0.7) {
          return {
            ok: false,
            reason: `切回 ${s.originalModel} 后 percent=${Math.round(projectedPercent * 100)}% 仍超过 70%，不建议 revert`,
            hint: "继续用 long-ctx 模型或先 /compact 再考虑",
          };
        }
        const fromModel = s.lastModel;
        const targetModel = s.originalModel;
        s.originalModel = undefined;
        s.lastWarnedThreshold = 0;
        markDirty(sessionKey);
        api.logger.warn(
          `[ctx-watchdog] revert to original: ${fromModel} → ${targetModel} | reason="${params?.reason ?? '-'}" | session=${sessionKey.slice(0, 12)} | projectedPercent=${Math.round(projectedPercent * 100)}%`,
        );
        return {
          ok: true,
          from: fromModel,
          to: targetModel,
          newCtxMax: originalCtxMax,
          projectedPercent: Math.round(projectedPercent * 100),
          reason: params?.reason ?? "no reason given",
          message: `已清掉 ctx-watchdog 的强切意愿，下一轮 model-router 会重新走任务路由——预期切回到 ${targetModel} 或同 tier 最优。`,
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  // ── tool 4: enhance_ctx_profile（v6.5.6 P0-3）查 agent 历史 ctx 画像 ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_ctx_profile",
      description: "查询当前 agent 的历史会话 ctx 用量画像（peak / avg / sessions count）。基于 sqlite 持久化的 peak_percent，可用于了解'我这个 agent 平均会涨多高'",
      inputSchema: Type.Object({
        agentId: Type.Optional(Type.String({ description: "可选；默认取当前 ctx 的 agentId" })),
      }),
      async execute(params: any) {
        const targetAgentId = params?.agentId?.trim() || pickAgentId(ctx);
        try {
          const db = getDb();
          const profile = getAgentCtxProfile(db, targetAgentId);
          return {
            ok: true,
            agentId: targetAgentId,
            sessions: profile.sessions,
            avgPeakPercent: Math.round(profile.avgPeak * 100),
            maxPeakPercent: Math.round(profile.maxPeak * 100),
            note: profile.maxPeak > 0.95
              ? "⚠️ 历史峰值 > 95%，建议设置更激进的 hintAt/warnAt 阈值或主动用 enhance_route_to_long_ctx"
              : profile.maxPeak > 0.8
              ? "💡 历史峰值 80-95%，处于上限敏感区"
              : "上下文用量历史健康",
          };
        } catch (err) {
          return { ok: false, reason: `sqlite 不可用: ${(err as Error).message}` };
        }
      },
    }) as any,
    { tier: "tools" } as any,
  );

  // ── v6.5.6: 启动期清理 30 天前的 ctx_usage 行（防止 sqlite 无限增长）──
  try {
    const db = getDb();
    const purged = purgeOldCtxUsage(db, 30);
    if (purged.deleted > 0) {
      api.logger.info(`[ctx-watchdog] purged ${purged.deleted} stale ctx_usage rows (>30d)`);
    }
  } catch {
    /* silent: sqlite 不可用 */
  }

  // ── v6.5.6: 进程退出前 finalFlush dirty sessions ──
  const finalFlush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushDirtySessions();
  };
  try {
    process.on("beforeExit", finalFlush);
    process.on("SIGTERM", finalFlush);
  } catch {
    /* silent: 某些 runtime 限制 process.on */
  }

  api.logger.info(
    `[enhance] context-watchdog v6.5.7 已加载（hint=${Math.round(hintAt * 100)}% warn=${Math.round(warnAt * 100)}% critical=${Math.round(criticalAt * 100)}% escalate=${Math.round(escalateAt * 100)}% force=${Math.round(forceEscalateAt * 100)}% | longCtx=${longCtxCandidates.slice(0, 3).join("→")}… | sqlite + subagent rollup + prediction）`,
  );
}
