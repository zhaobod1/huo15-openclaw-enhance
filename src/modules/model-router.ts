/**
 * 模块: 模型路由器（Model Router）
 *
 * Hook: before_model_resolve
 * 时机: Agent 解析模型之前
 * 作用: 检测多模态 + 任务复杂度，在 Sidus / DeepSeek / MiniMax 三供应商间自动路由
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

// ── 任务特征库 ────────────────────────────────────────────

const SHORT_TEXT_THRESHOLD = 150;

// 极速任务：极短文本，或用户表示急迫
const FAST_PATTERNS: RegExp[] = [
  /^.{1,50}$/,
  /\b(快点|赶紧|马上|立刻|迅速|急|赶时间)\b/i,
  /\b(在吗|在不|在不啦|嗨|喂)\b/i,
];

// 简单任务：闲聊、翻译、事实查询
const SIMPLE_PATTERNS: RegExp[] = [
  /\b(你好|hi|hello|hey|嗨|早上好|下午好|晚上好|晚安|再见|拜拜|谢谢|多谢|ok|好的)\b/i,
  /^(hi|hello|hey|哟|嗯|哦)\b/i,
  /\b(是什么|什么是|是谁|什么时候|在哪里|怎么读|怎么拼|几点|今天星期几|天气|日期)\b/i,
  /\b(翻译|translate)\b/i,
  /\b(解释一下|定义|含义|意思)\b/i,
  /\b(summary|summarize|tldr|简述|概括|总结一下)\b/i,
  /\b(多少钱|价格|报价|费用)\b/i,
  /\b(天气|温度|下雨|多少度|热不热|冷不冷)\b/i,
  /\b(计算|算一下|加.*减.*乘.*除)\b/i,
  /\b(搜索|查一下|帮我查|帮我找|找一下)\b/i,
];

// 文档生成任务
const DOC_PATTERNS: RegExp[] = [
  /\b(写.*word|写.*文档|生成.*word|写.*合同|写.*报告)\b/i,
  /\b(写.*PPT|做.*PPT|生成.*PPT|生成.*演示)\b/i,
  /\b(生成.*PDF|PDF|写.*方案)\b/i,
  /\b(写.*文章|写.*文案|写.*脚本)\b/i,
];

// 代码任务
const CODE_PATTERNS: RegExp[] = [
  /```/,
  /\b(code|coding|编程|代码|编码|写代码|写个)\b/i,
  /\b(debug|调试|traceback|报错|修复|排查|定位|bug)\b/i,
  /\b(重构|refactor|优化性能)\b/i,
  /\b(function|class|import|def |const |let |var |async|await|export|interface|type |enum)\b/i,
  /\b(python|javascript|typescript|java|go|rust|c\+\+|sql|bash|shell|php|ruby)\b/i,
  /\b(api|endpoint|middleware|hook|plugin|component|module|package)\b/i,
];

// 分析/架构任务
const ANALYSIS_PATTERNS: RegExp[] = [
  /\b(架构|设计|方案|规划|技术选型|系统设计|数据库设计)\b/i,
  /\b(architecture|design pattern|system design)\b/i,
  /\b(分析|深入|详细|为什么|原因|原理|机制|底层|源码)\b/i,
  /\b(compare|对比|区别|优缺点|利弊|权衡)\b/i,
  /\b(配置|config|setup|部署|deploy|迁移|migration|安装)\b/i,
  /(?:^|\n)[ ]*[{[]/,
  /\b(odoo|erp|crm|进销存|库存|财务|会计)\b/i,
  /\b(订单|采购|销售|报价|发票)\b/i,
  /\b(生成|create|build|implement|develop)\b/i,
];

// 推理任务（需要深度思考）
const REASONER_PATTERNS: RegExp[] = [
  /\b(推理|reason|think deeply|深入思考|复杂问题)\b/i,
  /\b(证明|推导|数学|逻辑)\b/i,
  /\b(为什么.*为什么.*为什么)\b/i,
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

/** 获取支持指定 tier 的最优模型（按供应商优先级） */
function getBestModel(taskTier: TaskTier): string | null {
  for (const [_provName, prov] of Object.entries(PROVIDER_REGISTRY)) {
    const tierMap = prov.tiers as Record<string, string>;
    if (tierMap[taskTier]) return tierMap[taskTier];
  }
  return null;
}

/** 根据任务类型获取最优模型 */
function routeTask(prompt: string, mediaTypes: Set<string>): RouteDecision {
  const p = prompt.trim();

  // ── 1. 多模态路由（最高优先）─────────────
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

  // ── 2. 文本任务分类 ────────────────────
  // prompt 过长不做文本分级（系统上下文太重）
  if (p.length <= 500) {
    // 文档生成 → pro
    for (const pat of DOC_PATTERNS) if (pat.test(p)) {
      const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
      return { provider: "sidus", model, taskTier: "pro", reason: `文档生成 → pro tier` };
    }
    // 代码 → pro
    for (const pat of CODE_PATTERNS) if (pat.test(p)) {
      const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
      return { provider: "sidus", model, taskTier: "pro", reason: `代码任务 → pro tier` };
    }
    // 分析/架构 → pro
    for (const pat of ANALYSIS_PATTERNS) if (pat.test(p)) {
      const model = getBestModel("pro") || "custom-sidus-ai/DeepSeek-V4-Pro";
      return { provider: "sidus", model, taskTier: "pro", reason: `分析任务 → pro tier` };
    }
    // 推理 → reasoner
    for (const pat of REASONER_PATTERNS) if (pat.test(p)) {
      const model = getBestModel("reasoner") || "deepseek/deepseek-reasoner";
      return { provider: "deepseek", model, taskTier: "reasoner", reason: `推理任务 → reasoner tier` };
    }
    // 简单任务 → flash
    for (const pat of SIMPLE_PATTERNS) if (pat.test(p)) {
      const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
      return { provider: "sidus", model, taskTier: "flash", reason: `简单任务 → flash tier` };
    }
  }

  // ── 3. 极速兜底（极短文本）─────────────
  for (const pat of FAST_PATTERNS) if (pat.test(p)) {
    return {
      provider: "minimax",
      model: "minimax/MiniMax-M2.7",
      taskTier: "fast",
      reason: `极速兜底（${p.length}字符）→ MiniMax M2.7`,
    };
  }

  // ── 4. 默认：Sidus flash ──────────────
  const model = getBestModel("flash") || "custom-sidus-ai/deepseek-v4-flash";
  return { provider: "sidus", model, taskTier: "flash", reason: `默认 → Sidus flash（${p.length}字符）` };
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

    // 执行路由决策
    const decision = routeTask(event?.prompt || "", mediaTypes);

    api.logger.info(
      `[model-router] ${decision.reason} | tier=${decision.taskTier} | → ${decision.model}`
    );

    return { modelOverride: decision.model };
  });

  api.logger.info(
    `[enhance] 模型路由器已加载（before_model_resolve hook）| 供应商: Sidus/DeepSeek/MiniMax/Google`
  );
}
