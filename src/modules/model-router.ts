/**
 * 模块: 模型路由器（Model Router）v5.7.12
 *
 * Hook: before_model_resolve
 * 时机: Agent 解析模型之前
 * 作用: 检测多模态 + 任务复杂度，在 Sidus / DeepSeek / MiniMax / Google 四供应商间自动路由
 *
 * v5.7.12 增强:
 *   - 路由决策缓存（TTL 30s），相同 prompt 结构命中直接返回
 *   - 极短 prompt（<50 字符，无媒体）直接短路到 fastest，跳过复杂检测
 *   - 超长 prompt（>2000 字符）视为复杂任务直接进 pro
 *   - 新增 10+ 任务类型识别（翻译/写作/数据分析/情绪/数学/摘要/客服/报告/多步骤/快速问答/debug）
 *   - 中文关键词专项优化，减少误判
 *   - getBestModel 结果缓存，减少 provider 遍历
 *
 * 供应商注册表（PROVIDER_REGISTRY）
 * ─────────────────────────────────────
 * priority 数值越小优先级越高。每个 tier 选第一个可用的供应商。
 *
 * | 供应商    | priority | 定位                    | tier 支持              |
 * |----------|----------|------------------------|------------------------|
 * | sidus    | 1        | 首选，性价比最高          | flash / pro            |
 * | deepseek | 2        | fallback + 深度推理      | flash / pro / reasoner |
 * | minimax  | 3        | 极速 + 多模态            | fast / vl / hailuo     |
 * | google   | 4        | 长上下文 / 混合多模态     | flash / pro            |
 *
 * 新增供应商：只需在 PROVIDER_REGISTRY 添加一行，不需改路由逻辑
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

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

const PROVIDER_REGISTRY = {
  sidus: {
    label: "Sidus（中转）",
    priority: 1,
    tiers: {
      flash: "custom-sidus-ai/deepseek-v4-flash",
      pro:   "custom-sidus-ai/DeepSeek-V4-Pro",
    },
  },
  deepseek: {
    label: "DeepSeek（官方）",
    priority: 2,
    tiers: {
      flash:    "deepseek/deepseek-v4-flash",
      pro:      "deepseek/deepseek-v4-pro",
      reasoner: "deepseek/deepseek-reasoner",
    },
  },
  minimax: {
    label: "MiniMax（极速）",
    priority: 3,
    tiers: {
      fast:   "minimax/MiniMax-M2.7",
      vl:     "minimax/MiniMax-VL-01",
      hailuo: "minimax/MiniMax-Hailuo-2.3",
    },
  },
  google: {
    label: "Google（长上下文）",
    priority: 4,
    tiers: {
      flash: "google-ai-studio/gemini-2.0-flash",
      pro:   "google-ai-studio/gemini-2.5-pro",
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

    // 缓存查找
    const ck = cacheKey(event?.prompt || "", mediaTypes);
    const cached = cacheGet(ck);
    if (cached) {
      api.logger.info(`[model-router] CACHE HIT: ${cached.reason} | → ${cached.model}`);
      return { modelOverride: cached.model };
    }

    // 执行路由决策
    const decision = routeTask(event?.prompt || "", mediaTypes);
    cacheSet(ck, decision);

    api.logger.info(
      `[model-router] ${decision.reason} | tier=${decision.taskTier} | → ${decision.model}`
    );

    return { modelOverride: decision.model };
  });

  api.logger.info(
    `[enhance] 模型路由器 v5.7.12 已加载（before_model_resolve hook）| 供应商: Sidus/DeepSeek/MiniMax/Google | 缓存TTL=${CACHE_TTL_MS}ms | 短路阈值=${SHORT_CIRCUIT_THRESHOLD}字符 | 复杂阈值=${COMPLEX_LENGTH_THRESHOLD}字符`
  );
}
