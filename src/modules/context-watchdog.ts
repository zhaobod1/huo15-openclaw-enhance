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
        pendingTokens: 0,
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

  /** 当前评估用的"有效 token 数"= 真实累加 + 本轮事前估算（pending） */
  function effectiveTokens(s: SessionUsage): number {
    return s.totalTokens + s.pendingTokens;
  }

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

  // ── hook 3: before_prompt_build 注入预警 banner（v6.5.5 用 effectiveTokens 事前预警）──
  api.on("before_prompt_build", (event, ctx) => {
    const sessionKey = pickSessionKey(ctx);
    if (!sessionKey) return undefined;
    const s = sessions.get(sessionKey);
    if (!s) return undefined;

    // v6.5.5：阈值评估时也叠加本轮 prompt 的事前估算（如 llm_input 还没 fire 就用 event.prompt）
    const liveEstimate = s.pendingTokens > 0
      ? s.pendingTokens
      : estimatePromptTokens(event);
    const used = s.totalTokens + liveEstimate;
    if (used === 0) return undefined;

    const percent = used / s.lastModelCtxMax;
    const modelId = s.lastModel ?? "<unknown>";

    // 取最高命中阈值
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
      return undefined;
    }

    // 防抖：同 session 同阈值只警告一次
    if (s.lastWarnedThreshold >= triggeredThreshold) return undefined;
    s.lastWarnedThreshold = triggeredThreshold;

    // ≥ 80% 且 model 还在 < 256K，附加切模型建议
    let final = banner;
    if (percent >= escalateAt && s.lastModelCtxMax < 256_000) {
      final = banner + "\n\n" + buildEscalateHint(modelId, s.lastModelCtxMax, used, percent);
    }

    api.logger.info(
      `[ctx-watchdog] threshold=${Math.round(triggeredThreshold * 100)}% triggered | session=${sessionKey.slice(0, 12)} | usage=${used}/${s.lastModelCtxMax}`,
    );

    return { prependContext: final };
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

  api.logger.info(
    `[enhance] context-watchdog v6.5.5 已加载（hint=${Math.round(hintAt * 100)}% warn=${Math.round(warnAt * 100)}% critical=${Math.round(criticalAt * 100)}% escalate=${Math.round(escalateAt * 100)}% force=${Math.round(forceEscalateAt * 100)}% | longCtx=${longCtxCandidates.slice(0, 3).join("→")}…）`,
  );
}
