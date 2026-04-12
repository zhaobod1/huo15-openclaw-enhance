/**
 * 智能贴士选择器 v2.0
 *
 * 对标 Claude Code 风格贴士系统
 * - 条件触发（根据用户消息关键词）
 * - 等级解锁（高级贴士需要更高等级）
 * - 时间段感知（早安/晚安贴士）
 * - 冷却机制（避免重复）
 */

export interface TipV2 {
  id: string;
  category: "memory" | "tool" | "workflow" | "fun" | "system" | "channel";
  text: string;
  emoji: string;
  triggers?: string[];       // 触发关键词
  minLevel?: number;         // 最低等级解锁
  cooldownHours?: number;    // 冷却时间（小时）
}

export interface TipContext {
  lastMessage?: string;
  petLevel?: number;
  recentTips?: string[];
  hour?: number;
}

// ============================================================
// 贴士库 v2.0
// ============================================================

export const TIPS_V2: TipV2[] = [
  // ── 基础贴士（一直显示，无等级要求） ──
  {
    id: "summary",
    category: "memory",
    emoji: "🧠",
    text: "说「总结一下今天」，我会把重要内容写入日记",
    triggers: ["总结", "日记"],
  },
  {
    id: "status",
    category: "system",
    emoji: "📊",
    text: "「/status」查看当前会话状态和模型配置",
    triggers: ["状态", "模型"],
  },

  // ── 工具贴士 ──
  {
    id: "search",
    category: "tool",
    emoji: "🔍",
    text: "「帮我搜索」+ 关键词，可以查网页、找文档、挖记忆",
    triggers: ["搜索", "查找"],
  },
  {
    id: "odoo",
    category: "tool",
    emoji: "📋",
    text: "直接说「帮我查一下待办任务」，我帮你查 Odoo 数据",
    triggers: ["待办", "任务", "Odoo"],
  },

  // ── 工作流贴士 ──
  {
    id: "plan",
    category: "workflow",
    emoji: "📝",
    text: "「帮我规划一下」开启规划模式，AI 会先思考再行动",
    triggers: ["规划", "计划"],
  },
  {
    id: "code",
    category: "workflow",
    emoji: "💻",
    text: "需要写代码？直接说「帮我写个 XXX」，我会解释+代码+验证",
    triggers: ["写代码", "开发"],
  },

  // ── 趣味贴士 ──
  {
    id: "feed",
    category: "fun",
    emoji: "🔥",
    text: "多说「谢谢」「辛苦了」可以喂小火苗，经验 UP UP",
    triggers: ["谢谢", "辛苦"],
  },
  {
    id: "who",
    category: "fun",
    emoji: "🎩",
    text: "问「你是谁」可以查看我的身份卡片",
    triggers: ["你是谁", "身份"],
  },

  // ── 渠道贴士 ──
  {
    id: "wecom-wake",
    category: "channel",
    emoji: "💬",
    text: "企微里也可以用「@贾维斯」唤醒我，不需要每次都 @",
    triggers: ["企微"],
  },
  {
    id: "wake",
    category: "channel",
    emoji: "👋",
    text: "随时说「贾维斯」可以唤醒我，不需要加 @",
    triggers: ["唤醒"],
  },

  // ── 晚安贴士（时间段触发） ──
  {
    id: "bedtime",
    category: "system",
    emoji: "🌙",
    text: "晚安前说「总结一下今天」，我会把重要内容写入日记",
  },

  // ── 记忆贴士 ──
  {
    id: "remember",
    category: "memory",
    emoji: "💾",
    text: "重要信息说「记住这个」，我会自动存入长期记忆",
    triggers: ["记住", "记一下"],
  },
  {
    id: "ignore-memory",
    category: "memory",
    emoji: "🔄",
    text: "说「忽略记忆」可以清空当前记忆引用，像刚启动一样从零工作",
    triggers: ["忽略记忆"],
  },

  // ── 高级贴士（Lv.3+） ──
  {
    id: "subagent",
    category: "workflow",
    emoji: "🤖",
    text: "OpenClaw 支持多 Agent 并行，说「开一个子任务」试试",
    minLevel: 3,
    triggers: ["子任务", "并行"],
  },

  // ── 高级贴士（Lv.5+） ──
  {
    id: "knowledge-base",
    category: "tool",
    emoji: "📚",
    text: "我的知识库支持海量化，说「查一下知识库」试试",
    minLevel: 5,
    triggers: ["知识库"],
  },
];

// ============================================================
// 贴士选择器
// ============================================================

const recentTipsCache = new Map<string, { id: string; timestamp: number }>();
const COOLDOWN_MS = 30 * 60 * 1000; // 30 分钟冷却

export function selectSmartTip(context: TipContext): TipV2 {
  const {
    lastMessage = "",
    petLevel = 1,
    recentTips = [],
    hour = new Date().getHours(),
  } = context;

  // 1. 优先匹配触发词（关键词命中优先）
  if (lastMessage) {
    const triggeredTips = TIPS_V2.filter((tip) =>
      tip.triggers?.some((keyword) => lastMessage.includes(keyword))
    );

    if (triggeredTips.length > 0) {
      // 随机选一个未在冷却中的
      const available = triggeredTips.filter(
        (t) => !isInCooldown(t.id)
      );
      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)];
        setCooldown(selected.id);
        return selected;
      }
    }
  }

  // 2. 时间段贴士
  let timeBasedTip: TipV2 | undefined;
  if (hour >= 22 || hour < 6) {
    timeBasedTip = TIPS_V2.find((t) => t.id === "bedtime");
  }

  // 3. 等级解锁 + 排除最近显示过的 + 排除冷却中的
  const unlockedTips = TIPS_V2.filter((tip) => {
    const meetsLevel = (tip.minLevel ?? 1) <= petLevel;
    const notRecent = !recentTips.includes(tip.id);
    const notInCooldown = !isInCooldown(tip.id);
    return meetsLevel && notRecent && notInCooldown;
  });

  // 4. 优先选时间贴士，否则随机
  if (timeBasedTip && !isInCooldown(timeBasedTip.id)) {
    setCooldown(timeBasedTip.id);
    return timeBasedTip;
  }

  if (unlockedTips.length > 0) {
    const selected = unlockedTips[Math.floor(Math.random() * unlockedTips.length)];
    setCooldown(selected.id);
    return selected;
  }

  // 兜底：返回每日贴士（不计入冷却）
  return TIPS_V2[Math.floor(Math.random() * 4)]; // 前4条为基础贴士
}

// ============================================================
// 冷却管理
// ============================================================

function isInCooldown(tipId: string): boolean {
  const entry = recentTipsCache.get(tipId);
  if (!entry) return false;
  return Date.now() - entry.timestamp < COOLDOWN_MS;
}

function setCooldown(tipId: string): void {
  recentTipsCache.set(tipId, { id: tipId, timestamp: Date.now() });
}

// ============================================================
// WeCom 渲染
// ============================================================

const CATEGORY_LABELS: Record<string, string> = {
  memory: "🧠记忆",
  tool: "🔧工具",
  workflow: "📝工作流",
  fun: "🎮趣味",
  system: "⚙️系统",
  channel: "💬渠道",
};

export function renderTipWeComV2(tip: TipV2): string {
  const label = CATEGORY_LABELS[tip.category] ?? tip.category;

  return `╔════════════════════════════════════════╗
║  💡 今日贴士                               ║
╠════════════════════════════════════════╣
║  ${tip.emoji} ${tip.text}
║                                          ║
║  分类: ${label}
╚════════════════════════════════════════╝`;
}

export function renderTipMarkdown(tip: TipV2): string {
  return `> 💡 **${tip.emoji} ${tip.category.toUpperCase()}**: ${tip.text}`;
}
