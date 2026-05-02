/**
 * 模块: 模型路由器（Model Router）v5.7.12 / 接入 v5.8.3
 *
 * Hook: before_model_resolve
 * 时机: Agent 解析模型之前
 * 作用: 检测多模态 + 任务复杂度，在 DeepSeek / MiniMax / Google / Sidus 四供应商间自动路由
 *
 * v5.7.12 增强:
 *   - 路由决策缓存（TTL 30s），相同 prompt 结构命中直接返回
 *   - 极短 prompt（<50 字符，无媒体）直接短路到 fastest，跳过复杂检测
 *   - 超长 prompt（>2000 字符）视为复杂任务直接进 pro
 *   - 新增 10+ 任务类型识别（翻译/写作/数据分析/情绪/数学/摘要/客服/报告/多步骤/快速问答/debug）
 *   - 中文关键词专项优化，减少误判
 *   - getBestModel 结果缓存，减少 provider 遍历
 *
 * v5.8.3 修复:
 *   - 真正注册进 index.ts（5.7.12 起一直未注册，是"幽灵模块"）
 *   - sidus priority 1 → 4（兜底）：5/2 实战 sidus deepseek-v4-flash 反复 429 限流，
 *     蓝火 wecom 长任务卡 12 分钟+；sidus 降权后由 deepseek 直连兜住
 *
 * 供应商注册表（PROVIDER_REGISTRY）
 * ─────────────────────────────────────
 * priority 数值越小优先级越高。每个 tier 选第一个可用的供应商。
 *
 * | 供应商    | priority | 定位                          | tier 支持              |
 * |----------|----------|------------------------------|------------------------|
 * | deepseek | 1        | 直连首选 + 深度推理              | flash / pro / reasoner |
 * | minimax  | 2        | 极速 + 多模态                   | fast / vl / hailuo     |
 * | google   | 3        | 长上下文 / 混合多模态            | flash / pro            |
 * | sidus    | 4        | 中转兜底（前三家都挂时才用）       | flash / pro            |
 *
 * 新增供应商：只需在 PROVIDER_REGISTRY 添加一行，不需改路由逻辑
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import {
  loadModelRouteConfig,
  saveModelRouteConfig,
  selectProvider,
  patchProvider,
  listAllProviders,
  getModelRouteConfigPath,
  type ModelRouteConfig,
  type RouteMode,
} from "../utils/model-route-config.js";
import {
  recordSample,
  schedulePersist,
  snapshotStats,
} from "../utils/latency-tracker.js";
import {
  readHistory,
  sparkLine,
  getHistoryPath,
} from "../utils/route-history.js";

// ── 类型定义 ───────────────────────────────────────────────

type TaskTier = "fast" | "flash" | "pro" | "reasoner" | "vl" | "hailuo" | "unknown";

interface RouteDecision {
  provider: string;
  model: string;
  taskTier: TaskTier;
  reason: string;
}

// ── 路由缓存 ──────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 秒

interface CacheEntry {
  decision: RouteDecision;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();

function cacheKey(prompt: string, mediaTypes: Set<string>): string {
  // 用 prompt 前 200 字符 + 媒体类型做 key（完整 prompt 太长不适合做 key）
  const mediaKey = [...mediaTypes].sort().join(",");
  return `${prompt.slice(0, 200)}|${mediaKey}`;
}

function cacheGet(key: string): RouteDecision | null {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    routeCache.delete(key);
    return null;
  }
  return entry.decision;
}

function cacheSet(key: string, decision: RouteDecision): void {
  // 定期清理过期条目（简单策略：超过 500 条时全量清理）
  if (routeCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of routeCache) {
      if (now > v.expiresAt) routeCache.delete(k);
    }
  }
  routeCache.set(key, { decision, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── 供应商注册表（可扩展）──────────────────────────────────

// v5.8.3: priority 重排——sidus 从 1（首选）降到 4（兜底）
//         触发：5/2 16:00 sidus deepseek-v4-flash 反复 429 限流，蓝火 wecom 长
//               任务卡 12 分钟+；sidus 降权后由 deepseek 直连兜住
const PROVIDER_REGISTRY = {
  deepseek: {
    label: "DeepSeek（官方直连）",
    priority: 1,
    tiers: {
      flash:    "deepseek/deepseek-v4-flash",
      pro:      "deepseek/deepseek-v4-pro",
      reasoner: "deepseek/deepseek-reasoner",
    },
  },
  minimax: {
    label: "MiniMax（极速）",
    priority: 2,
    tiers: {
      fast:   "minimax/MiniMax-M2.7",
      vl:     "minimax/MiniMax-VL-01",
      hailuo: "minimax/MiniMax-Hailuo-2.3",
    },
  },
  google: {
    label: "Google（长上下文）",
    priority: 3,
    tiers: {
      flash: "google-ai-studio/gemini-2.0-flash",
      pro:   "google-ai-studio/gemini-2.5-pro",
    },
  },
  sidus: {
    label: "Sidus（中转兜底）",
    priority: 4,
    tiers: {
      flash: "custom-sidus-ai/deepseek-v4-flash",
      pro:   "custom-sidus-ai/DeepSeek-V4-Pro",
    },
  },
} as const;

// ── getBestModel 缓存 ─────────────────────────────────────
const bestModelCache = new Map<TaskTier, string>();

function getBestModel(taskTier: TaskTier): string | null {
  const cached = bestModelCache.get(taskTier);
  if (cached) return cached;

  for (const [_provName, prov] of Object.entries(PROVIDER_REGISTRY)) {
    const tierMap = prov.tiers as Record<string, string>;
    if (tierMap[taskTier]) {
      bestModelCache.set(taskTier, tierMap[taskTier]);
      return tierMap[taskTier];
    }
  }
  return null;
}

// ── 阈值常量 ──────────────────────────────────────────────

const SHORT_CIRCUIT_THRESHOLD = 50;   // 极短 prompt 直接快速模型
const COMPLEX_LENGTH_THRESHOLD = 2000; // 超长 prompt 视为复杂任务

// ── 任务特征库（按优先级排列）──────────────────────────────

// 极速任务：极短文本或用户表示急迫（最先检查）
const FAST_PATTERNS: RegExp[] = [
  /\b(快点|赶紧|马上|立刻|迅速|急|赶时间)\b/i,
  /\b(在吗|在不|在不啦|嗨|喂)\b/i,
];

// 多模态检测（最高优先，紧随其后）
// 代码任务 — 特征明确，优先检测避免被其他模式误吞
const CODE_PATTERNS: RegExp[] = [
  /```/,
  /\b(code|coding|编程|代码|编码|写代码|写个)\b/i,
  /\b(debug|调试|traceback|报错|修复|排查|定位|bug)\b/i,
  /\b(重构|refactor|优化性能|性能优化)\b/i,
  /\b(function|class|import|def |const |let |var |async|await|export|interface|type |enum)\b/i,
  /\b(python|javascript|typescript|java|go|rust|c\+\+|sql|bash|shell|php|ruby)\b/i,
  /\b(api|endpoint|middleware|hook|plugin|component|module|package)\b/i,
  /\b(git commit|git push|git merge|pull request|PR)\b/i,
];

// Debug / 报错分析 — 代码相关但更紧急
const DEBUG_PATTERNS: RegExp[] = [
  /\b(报错|错误|error|exception|crash|崩溃|异常)\b/i,
  /\b(not found|cannot find|undefined is not|typeerror|syntaxerror|referenceerror)\b/i,
  /\b(怎么.*不行|为什么.*报错|哪里.*错了|修.*bug)\b/i,
];

// 文档生成任务
const DOC_PATTERNS: RegExp[] = [
  /\b(写.*word|写.*文档|生成.*word|写.*合同|写.*报告)\b/i,
  /\b(写.*PPT|做.*PPT|生成.*PPT|生成.*演示)\b/i,
  /\b(生成.*PDF|PDF|写.*方案)\b/i,
];

// 报告生成（合同/方案/正式文档）
const REPORT_PATTERNS: RegExp[] = [
  /\b(合同|协议|标书|投标|方案书|需求文档|技术方案|项目计划)\b/i,
  /\b(生成.*报告|写.*报告|出具.*报告)\b/i,
];

// 数据分析/统计
const DATA_ANALYSIS_PATTERNS: RegExp[] = [
  /\b(数据.*分析|统计|报表|图表|可视化|dashboard)\b/i,
  /\b(excel|csv|json.*分析|数据.*处理|数据.*清洗)\b/i,
  /\b(同比|环比|趋势|增长.*率|占比|平均值|中位数)\b/i,
];

// 数学计算/公式推导
const MATH_PATTERNS: RegExp[] = [
  /\b(计算|算一下|推导|证明|公式|方程|求解|积分|微分)\b/i,
  /\b(数学|代数|几何|微积分|概率|统计.*题)\b/i,
  /[+\-*/^]=/,
  /\b(sqrt|log|sin|cos|tan|lim|∑|∫)\b/i,
];

// 分析/架构/深度任务
const ANALYSIS_PATTERNS: RegExp[] = [
  /\b(架构|设计|方案|规划|技术选型|系统设计|数据库设计)\b/i,
  /\b(architecture|design pattern|system design)\b/i,
  /\b(分析|深入|详细|为什么|原因|原理|机制|底层|源码)\b/i,
  /\b(compare|对比|区别|优缺点|利弊|权衡|比较)\b/i,
  /\b(配置|config|setup|部署|deploy|迁移|migration|安装)\b/i,
  /(?:^|\n)[ ]*[{[]/,
  /\b(odoo|erp|crm|进销存|库存|财务|会计)\b/i,
  /\b(订单|采购|销售|报价|发票)\b/i,
  /\b(生成|create|build|implement|develop)\b/i,
];

// 推理任务（需要深度思考）
const REASONER_PATTERNS: RegExp[] = [
  /\b(推理|reason|think deeply|深入思考|复杂问题)\b/i,
  /\b(证明|推导)\b/i,
  /\b(为什么.*为什么.*为什么)\b/i,
];

// 多步骤复杂推理
const MULTI_STEP_PATTERNS: RegExp[] = [
  /\b(步骤|step.*step|多步|chain.*thought|逐步|一步一步)\b/i,
  /\b(先.*再.*然后|first.*then.*finally)\b/i,
  /\b(plan|规划.*执行|拆分|分解|流程.*设计)\b/i,
];

// 写作/文案/创作 — 短文案用 flash，长文用 pro（由长度判断兜底）
const WRITING_PATTERNS: RegExp[] = [
  /\b(写.*文章|写.*文案|写.*脚本|写.*故事|写.*小说)\b/i,
  /\b(创作|创意|灵感|改写|润色|扩写|缩写|改写)\b/i,
  /\b(写.*标题|写.*slogan|写.*广告语|写.*宣传)\b/i,
  /\b(写.*邮件|写.*通知|写.*公告|写.*邀请函)\b/i,
];

// 长文本摘要/总结
const SUMMARIZATION_PATTERNS: RegExp[] = [
  /\b(总结|摘要|概括|归纳|提炼|梳理.*要点|汇总)\b/i,
  /\b(summarize|summary|tldr|key points|要点)\b/i,
];

// 翻译任务 — flash 足够
const TRANSLATION_PATTERNS: RegExp[] = [
  /\b(翻译|translate|译成|翻成|译成中文|译成英文|中译英|英译中)\b/i,
  /\b(用.*说|用.*写|换成.*语言)\b/i,
];

// 信息检索/查找 — flash 足够
const RETRIEVAL_PATTERNS: RegExp[] = [
  /\b(搜索|搜一下|查一下|帮我查|帮我找|找一下|检索)\b/i,
  /\b(什么是|是什么|是谁|在哪里|什么时候|多少钱)\b/i,
  /\b(定义|含义|意思|解释|百科|wiki)\b/i,
];

// 情绪识别/情感分析 — flash 足够
const SENTIMENT_PATTERNS: RegExp[] = [
  /\b(情绪|情感|心情|态度|语气|口吻|正面|负面|中性)\b/i,
  /\b(sentiment|emotion|tone|mood|polarity)\b/i,
];

// 客服对话/闲聊 — flash 足够
const CHAT_PATTERNS: RegExp[] = [
  /\b(你好|hi|hello|hey|嗨|早上好|下午好|晚上好|晚安|再见|拜拜|谢谢|多谢|ok|好的)\b/i,
  /^(hi|hello|hey|哟|嗯|哦|好|行|对|是)\b/i,
  /\b(怎么样|如何|好不好|行不行|可以吗|能.*吗|会.*吗)\b/i,
  /\b(天气|温度|下雨|多少度|热不热|冷不冷)\b/i,
  /\b(在吗|在不|在不啦)\b/i,
];

// 快速问答（一句话回答）— flash 足够
const QUICK_QA_PATTERNS: RegExp[] = [
  /\b(几点|今天星期几|日期|时间|现在.*时间)\b/i,
  /\b(多少|几个|哪些|哪个|谁|哪里|什么)\b/i,
];

// 简单常识查询
const SIMPLE_PATTERNS: RegExp[] = [
  /\b(解释一下|简单.*说一下)\b/i,
  /\b(多少钱|价格|报价|费用)\b/i,
  /\b(计算|算一下|加.*减.*乘.*除)\b/i,
];

// ── 工具函数 ──────────────────────────────────────────────

const IMAGE_MIME_PREFIX = "image/";
const VIDEO_MIME_PREFIX = "video/";
const AUDIO_MIME_PREFIX = "audio/";

function detectAttachmentMediaTypes(
  attachments?: Array<{ kind?: string; mimeType?: string }>
): Set<string> {
  const types = new Set<string>();
  if (!attachments?.length) return types;
  for (const att of attachments) {
    const mime = (att.mimeType || "").toLowerCase();
    const kind = (att.kind || "").toLowerCase();
    if (mime.startsWith(IMAGE_MIME_PREFIX) || kind === "image") types.add("image");
    else if (mime.startsWith(VIDEO_MIME_PREFIX) || kind === "video") types.add("video");
    else if (mime.startsWith(AUDIO_MIME_PREFIX) || kind === "audio") types.add("audio");
  }
  return types;
}

function detectPromptInlineMedia(prompt?: string): Set<string> {
  const types = new Set<string>();
  if (!prompt) return types;
  if (prompt.includes("[media attached") || prompt.includes("[image]")) types.add("image");
  if (/\.openclaw\/media\/inbound\/[^\s]+\.(png|jpg|jpeg|gif|webp|bmp)/i.test(prompt)) types.add("image");
  if (prompt.includes("[video]")) types.add("video");
  if (prompt.includes("[audio]") || prompt.includes("[voice]")) types.add("audio");
  return types;
}

/** 匹配任意一个 pattern */
function matchAny(patterns: readonly RegExp[], text: string): boolean {
  for (const pat of patterns) {
    if (pat.test(text)) return true;
  }
  return false;
}

/** 路由主逻辑 */
function routeTask(prompt: string, mediaTypes: Set<string>): RouteDecision {
  const p = prompt.trim();
  const len = p.length;

  // ── 0. 极短 prompt 短路（无媒体，<50 字符）─────────
  if (len <= SHORT_CIRCUIT_THRESHOLD && mediaTypes.size === 0) {
    return {
      provider: "minimax",
      model: "minimax/MiniMax-M2.7",
      taskTier: "fast",
      reason: `极短文本短路（${len}字符）→ MiniMax M2.7`,
    };
  }

  // ── 1. 多模态路由（最高优先）─────────────────────
  if (mediaTypes.has("image")) {
    return {
      provider: "minimax",
      model: "minimax/MiniMax-VL-01",
      taskTier: "vl",
      reason: "图片理解 → MiniMax VL-01",
    };
  }
  if (mediaTypes.has("video")) {
    return {
      provider: "minimax",
      model: "minimax/MiniMax-Hailuo-2.3",
      taskTier: "hailuo",
      reason: "视频内容 → MiniMax Hailuo",
    };
  }
  if (mediaTypes.has("audio")) {
    return {
      provider: "google",
      model: "google-ai-studio/gemini-2.0-flash",
      taskTier: "flash",
      reason: "音频内容 → Gemini Flash",
    };
  }

  // ── 2. 超长 prompt（>2000 字符）→ 复杂任务 pro ──
  if (len > COMPLEX_LENGTH_THRESHOLD) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return {
      provider: "sidus", model, taskTier: "pro",
      reason: `超长文本（${len}字符）→ pro tier`,
    };
  }

  // ── 3. 文本任务分类（按优先级）──────────────────

  // 代码任务 — 特征明确，先检查
  if (matchAny(CODE_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "代码任务 → pro tier" };
  }

  // Debug / 报错分析
  if (matchAny(DEBUG_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "Debug/报错分析 → pro tier" };
  }

  // 推理任务
  if (matchAny(REASONER_PATTERNS, p)) {
    const model = getBestModel("reasoner") || "deepseek/deepseek-reasoner";
    return { provider: "deepseek", model, taskTier: "reasoner", reason: "推理任务 → reasoner tier" };
  }

  // 数学计算
  if (matchAny(MATH_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "数学计算 → pro tier" };
  }

  // 数据分析
  if (matchAny(DATA_ANALYSIS_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "数据分析 → pro tier" };
  }

  // 分析/架构/深度任务
  if (matchAny(ANALYSIS_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "分析/架构 → pro tier" };
  }

  // 多步骤复杂推理
  if (matchAny(MULTI_STEP_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "多步骤推理 → pro tier" };
  }

  // 文档生成 → pro
  if (matchAny(DOC_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "文档生成 → pro tier" };
  }

  // 报告生成 → pro
  if (matchAny(REPORT_PATTERNS, p)) {
    const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
    return { provider: "sidus", model, taskTier: "pro", reason: "报告生成 → pro tier" };
  }

  // 写作/文案/创作 — 按长度判断：长文 → pro，短文 → flash
  if (matchAny(WRITING_PATTERNS, p)) {
    if (len > 300) {
      const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
      return { provider: "sidus", model, taskTier: "pro", reason: `写作创作（${len}字符，长文）→ pro tier` };
    }
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: `写作创作（${len}字符，短文）→ flash tier` };
  }

  // 长文本摘要 → pro（>500 字）
  if (matchAny(SUMMARIZATION_PATTERNS, p)) {
    if (len > 500) {
      const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
      return { provider: "sidus", model, taskTier: "pro", reason: `长文本摘要（${len}字符）→ pro tier` };
    }
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: `简短摘要 → flash tier` };
  }

  // ── 以下为 flash-tier 任务 ──

  // 翻译任务
  if (matchAny(TRANSLATION_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "翻译任务 → flash tier" };
  }

  // 信息检索
  if (matchAny(RETRIEVAL_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "信息检索 → flash tier" };
  }

  // 情绪/情感分析
  if (matchAny(SENTIMENT_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "情感分析 → flash tier" };
  }

  // 客服/闲聊
  if (matchAny(CHAT_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "闲聊对话 → flash tier" };
  }

  // 快速问答
  if (matchAny(QUICK_QA_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "快速问答 → flash tier" };
  }

  // 简单任务兜底
  if (matchAny(SIMPLE_PATTERNS, p)) {
    const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
    return { provider: "sidus", model, taskTier: "flash", reason: "简单任务 → flash tier" };
  }

  // 急迫关键词兜底（用户催）
  if (matchAny(FAST_PATTERNS, p)) {
    return {
      provider: "minimax",
      model: "minimax/MiniMax-M2.7",
      taskTier: "fast",
      reason: `急迫关键词（${len}字符）→ MiniMax M2.7`,
    };
  }

  // ── 4. 默认：Sidus flash ──────────────────────────
  const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
  return {
    provider: "sidus", model, taskTier: "flash",
    reason: `默认 → Sidus flash（${len}字符）`,
  };
}

// ── v5.8.4 配置驱动路由 ──────────────────────────────────

/**
 * 启动期 load 一次到内存；工具修改后 in-place 更新这个 ref。
 * 单进程读写，无并发风险。
 */
let runtimeConfig: ModelRouteConfig = loadModelRouteConfig();

function reloadConfig(): void {
  runtimeConfig = loadModelRouteConfig();
  bestModelCache.clear();
  routeCache.clear();
}

function persistConfig(): void {
  saveModelRouteConfig(runtimeConfig);
  bestModelCache.clear();
  routeCache.clear();
}

/**
 * 主路由：先用 routeTask 选 tier（auto-task 模式的 task-aware 部分），
 * 再用 selectProvider 按 mode 选 provider。
 */
function pickModel(prompt: string, mediaTypes: Set<string>): RouteDecision | null {
  const taskDecision = routeTask(prompt, mediaTypes);
  const tier = taskDecision.taskTier;
  const picked = selectProvider(runtimeConfig, tier);
  if (!picked) {
    // 走兜底：原 getBestModel（hardcode 顺序）
    return taskDecision;
  }
  return {
    provider: picked.id.split("/")[0] ?? "?",
    model: picked.id,
    taskTier: tier,
    reason: `${runtimeConfig.mode} | ${taskDecision.reason} | ${picked.reason}`,
  };
}

// ── Hook 注册 ─────────────────────────────────────────────

export function registerModelRouter(api: OpenClawPluginApi) {
  api.on("before_model_resolve", (event, _ctx) => {
    // 检测媒体类型
    let mediaTypes: Set<string>;
    if (event?.attachments?.length) {
      mediaTypes = detectAttachmentMediaTypes(event.attachments);
    } else {
      mediaTypes = detectPromptInlineMedia(event?.prompt);
    }

    // 缓存查找（mode=weighted/speed 时跳缓存——每次都要重新抽样/调权）
    if (runtimeConfig.mode === "priority" || runtimeConfig.mode === "auto-task") {
      const ck = cacheKey(event?.prompt || "", mediaTypes);
      const cached = cacheGet(ck);
      if (cached) {
        api.logger.info(`[model-router] CACHE HIT: ${cached.reason} | → ${cached.model}`);
        return { modelOverride: cached.model };
      }
    }

    // 执行路由决策
    const decision = pickModel(event?.prompt || "", mediaTypes);
    if (!decision) return undefined;

    if (runtimeConfig.mode === "priority" || runtimeConfig.mode === "auto-task") {
      const ck = cacheKey(event?.prompt || "", mediaTypes);
      cacheSet(ck, decision);
    }

    api.logger.info(
      `[model-router] ${decision.reason} | tier=${decision.taskTier} | → ${decision.model}`
    );

    return { modelOverride: decision.model };
  });

  // ── v5.8.5 latency tracker：监听 model_call_ended 收集 P50/P95/errRate ──
  // openclaw 2026.4.29 dist 确认 emit 这个 hook（hook-types.d.ts 含 PluginHookModelCallEndedEvent
  // 与 durationMs / outcome / timeToFirstByteMs 字段），但 enhance 项目锁定的 plugin-sdk
  // 类型 union 还没及时更新含 "model_call_ended"——用 (api.on as any) cast 绕过类型不齐。
  // runtime 行为完全依赖 dist 实现，cast 不影响功能。
  (api.on as any)("model_call_ended", (event: any, _ctx: any) => {
    try {
      const provider = event?.provider;
      const model = event?.model;
      if (!provider || !model) return;
      const providerId = `${provider}/${model}`;
      // 优先 TTFB（更接近"用户体感速度"），缺失 fallback 到 totalDurationMs
      const ttfb = event?.timeToFirstByteMs;
      const dur = event?.durationMs;
      const latencyMs = typeof ttfb === "number" ? ttfb : (typeof dur === "number" ? dur : 0);
      const errored = event?.outcome === "error";
      recordSample(providerId, latencyMs, errored);
      schedulePersist(runtimeConfig);
    } catch {
      // hook 内永不抛 —— 防止把 openclaw 主流程拖坏
    }
  });

  // ── v5.8.4 工具：4 个对话式配置入口 ─────────────────────

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_model_route_status",
      description:
        "查看当前模型路由配置：mode + 各 tier × provider 的 priority / weight / enabled / 最近延迟。" +
        "对话式配置入口（v5.8.4）。",
      parameters: Type.Object({}),
      async execute() {
        const cfg = runtimeConfig;
        const lines: string[] = [];
        lines.push(`# 模型路由当前状态`);
        lines.push(``);
        lines.push(`**模式**: \`${cfg.mode}\``);
        lines.push(`  - priority: 严格按 priority 排序`);
        lines.push(`  - weighted: 按 weight 加权随机`);
        lines.push(`  - speed: 按最近 P50 + errRate 自动调权（v5.8.5+ 才有数据）`);
        lines.push(`  - auto-task: 按任务复杂度选 tier，tier 内按 priority`);
        lines.push(``);
        lines.push(`**配置文件**: \`${getModelRouteConfigPath()}\``);
        lines.push(``);
        const memSnap = snapshotStats();
        for (const [tier, t] of Object.entries(cfg.models)) {
          lines.push(`## tier = \`${tier}\``);
          lines.push(``);
          lines.push(`| provider | priority | weight | enabled | p50ms | p95ms | errRate | samples | pending |`);
          lines.push(`|---|---|---|---|---|---|---|---|---|`);
          for (const p of t.providers) {
            const speed = cfg.speedTracking?.[p.id];
            const mem = memSnap[p.id];
            lines.push(
              `| \`${p.id}\` | ${p.priority} | ${p.weight} | ${p.enabled ? "✓" : "✗"} | ${speed?.p50Ms ?? "-"} | ${speed?.p95Ms ?? "-"} | ${speed?.errRate?.toFixed(2) ?? "-"} | ${speed?.samples ?? mem?.samples ?? 0} | ${mem?.pending ?? 0} |`,
            );
          }
          lines.push(``);
        }
        if (Object.keys(memSnap).length > 0) {
          lines.push(`> v5.8.5 latency tracker 在线：每次 model_call_ended 收集 P50/P95/errRate，1h 滑动窗口，节流 60s 落盘。`);
          lines.push(`> "pending" 列 = 上次落盘后新增样本数，攒够 10 或满 60s 自动 persist 到 ${getModelRouteConfigPath()}。`);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      },
    })) as any,
    { name: "enhance_model_route_status" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_model_route_set",
      description:
        "改某个 tier 下某个 provider 的 priority / weight / enabled 字段。" +
        "示例：tier='flash', providerId='custom-sidus-ai/deepseek-v4-flash', priority=10 把 sidus 降权到几乎不选。" +
        "weight 0-100，priority 越小越优先；任一字段可省略不改。",
      parameters: Type.Object({
        tier: Type.String({ description: "task tier 名（flash / pro / reasoner / fast / vl / hailuo）" }),
        providerId: Type.String({ description: "完整 provider/model id，如 deepseek/deepseek-v4-flash" }),
        priority: Type.Optional(Type.Number({ description: "新优先级（数值越小越优先）" })),
        weight: Type.Optional(Type.Number({ description: "新权重 0-100" })),
        enabled: Type.Optional(Type.Boolean({ description: "是否启用" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const tier = String(params.tier ?? "").trim();
        const providerId = String(params.providerId ?? "").trim();
        if (!tier || !providerId) {
          return { content: [{ type: "text" as const, text: "tier / providerId 必填。" }] };
        }
        const patch: Record<string, unknown> = {};
        if (typeof params.priority === "number") patch.priority = params.priority;
        if (typeof params.weight === "number") patch.weight = Math.max(0, Math.min(100, params.weight));
        if (typeof params.enabled === "boolean") patch.enabled = params.enabled;
        if (Object.keys(patch).length === 0) {
          return { content: [{ type: "text" as const, text: "需要至少一个字段（priority / weight / enabled）" }] };
        }
        const ok = patchProvider(runtimeConfig, tier, providerId, patch as any);
        if (!ok) {
          return {
            content: [{
              type: "text" as const,
              text: `未找到 tier='${tier}' / providerId='${providerId}'。运行 enhance_model_route_status 查现有列表。`,
            }],
          };
        }
        persistConfig();
        return {
          content: [{
            type: "text" as const,
            text: `✅ 已更新 ${tier} → ${providerId}：${JSON.stringify(patch)}\n配置文件：${getModelRouteConfigPath()}`,
          }],
        };
      },
    })) as any,
    { name: "enhance_model_route_set" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_model_route_mode",
      description:
        "切换路由模式。priority=严格按优先级 / weighted=按权重抽样 / speed=按最近延迟自动调权（v5.8.5+） / auto-task=按任务自动选 tier 内首选（默认）。",
      parameters: Type.Object({
        mode: Type.Union(
          [
            Type.Literal("priority"),
            Type.Literal("weighted"),
            Type.Literal("speed"),
            Type.Literal("auto-task"),
          ],
          { description: "新模式" },
        ),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const mode = String(params.mode ?? "").trim() as RouteMode;
        if (!["priority", "weighted", "speed", "auto-task"].includes(mode)) {
          return { content: [{ type: "text" as const, text: `mode 必须是 priority / weighted / speed / auto-task` }] };
        }
        const old = runtimeConfig.mode;
        runtimeConfig.mode = mode;
        persistConfig();
        const note = mode === "speed"
          ? "（speed 模式 v5.8.5 才能收集 latency 数据；当前回退到 priority 兜底）"
          : "";
        return {
          content: [{
            type: "text" as const,
            text: `✅ 模式切换：\`${old}\` → \`${mode}\`${note}\n下次 LLM 调用立即生效。`,
          }],
        };
      },
    })) as any,
    { name: "enhance_model_route_mode" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_model_route_history",
      description:
        "查模型路由的历史延迟趋势（v5.8.6）。每次 latency tracker flush 同步 append 一条快照，" +
        "可看 P50/errRate 随时间变化（用 ASCII spark line 展示，便于判断 sidus 是否在恢复 / deepseek 高峰是否变慢）。",
      parameters: Type.Object({
        windowHours: Type.Optional(Type.Number({ description: "查最近多少小时（默认 24）" })),
        providerFilter: Type.Optional(Type.String({ description: "provider 子串过滤（如 'sidus' / 'deepseek'）" })),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const windowHours = typeof params.windowHours === "number" ? params.windowHours : 24;
        const filter = typeof params.providerFilter === "string" ? params.providerFilter : "";
        const snaps = readHistory({ windowHours, providerFilter: filter });
        if (snaps.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text:
                `📭 history 暂无数据。\n` +
                `条件: 最近 ${windowHours}h${filter ? `, providerFilter='${filter}'` : ""}\n` +
                `文件: ${getHistoryPath()}\n` +
                `提示: latency tracker 至少要 5 样本/provider + 触发 flush 后才会写入 history。等几次 LLM 调用后再查。`,
            }],
          };
        }

        // 按 providerId 聚合时间序列
        const byProvider = new Map<string, Array<{ ts: string; p50: number; errRate: number; samples: number }>>();
        for (const snap of snaps) {
          for (const [pid, s] of Object.entries(snap.providers || {})) {
            if (filter && !pid.includes(filter)) continue;
            if (!byProvider.has(pid)) byProvider.set(pid, []);
            byProvider.get(pid)!.push({ ts: snap.ts, p50: s.p50Ms, errRate: s.errRate, samples: s.samples });
          }
        }

        const lines: string[] = [];
        lines.push(`# 模型路由历史 — 最近 ${windowHours}h${filter ? `（filter: \`${filter}\`）` : ""}`);
        lines.push(``);
        lines.push(`快照数: **${snaps.length}**　file: \`${getHistoryPath()}\``);
        lines.push(``);
        for (const [pid, series] of byProvider) {
          const p50s = series.map((s) => s.p50);
          const errs = series.map((s) => s.errRate);
          const latest = series[series.length - 1];
          const oldest = series[0];
          const p50Min = Math.min(...p50s);
          const p50Max = Math.max(...p50s);
          const avgErr = errs.reduce((a, b) => a + b, 0) / errs.length;
          lines.push(`## \`${pid}\``);
          lines.push(``);
          lines.push(`- **P50** spark: \`${sparkLine(p50s)}\`  范围 ${p50Min}-${p50Max}ms  最新 ${latest.p50}ms`);
          lines.push(`- **errRate** spark: \`${sparkLine(errs)}\`  平均 ${avgErr.toFixed(2)}  最新 ${latest.errRate.toFixed(2)}`);
          lines.push(`- 时间窗: ${oldest.ts} ~ ${latest.ts} (${series.length} 个采样点)`);
          lines.push(``);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      },
    })) as any,
    { name: "enhance_model_route_history" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_model_route_disable",
      description:
        "批量禁用某个 provider（在所有 tier 中），或恢复某个 provider。" +
        "示例：providerPrefix='custom-sidus-ai' enabled=false 一刀禁掉所有 sidus。",
      parameters: Type.Object({
        providerPrefix: Type.String({ description: "provider 前缀（如 custom-sidus-ai）或完整 id" }),
        enabled: Type.Boolean({ description: "true=启用 / false=禁用" }),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const prefix = String(params.providerPrefix ?? "").trim();
        const enabled = params.enabled === true;
        if (!prefix) {
          return { content: [{ type: "text" as const, text: "providerPrefix 必填。" }] };
        }
        let touched = 0;
        const matched: string[] = [];
        for (const [, t] of Object.entries(runtimeConfig.models)) {
          for (const p of t.providers) {
            if (p.id === prefix || p.id.startsWith(prefix + "/")) {
              if (p.enabled !== enabled) {
                p.enabled = enabled;
                touched += 1;
              }
              matched.push(p.id);
            }
          }
        }
        if (touched === 0 && matched.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `未匹配到 providerPrefix='${prefix}'。运行 enhance_model_route_status 查现有 provider id。`,
            }],
          };
        }
        persistConfig();
        const verb = enabled ? "启用" : "禁用";
        return {
          content: [{
            type: "text" as const,
            text: `✅ 已${verb} ${touched} 处（共匹配 ${matched.length} 处）\n匹配项: ${matched.join(", ")}`,
          }],
        };
      },
    })) as any,
    { name: "enhance_model_route_disable" },
  );

  // 暴露 reload，方便未来 enhance_loop 触发
  void reloadConfig;

  api.logger.info(
    `[enhance] 模型路由器 v5.8.6 已加载（before_model_resolve + model_call_ended hooks + 5 工具）| mode=${runtimeConfig.mode} | tiers=${Object.keys(runtimeConfig.models).join(",")} | latency tracker 在线（P50/P95/errRate 1h 滑窗）+ history 自动归档`,
  );
}
