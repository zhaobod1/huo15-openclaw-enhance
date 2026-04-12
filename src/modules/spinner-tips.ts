/**
 * 模块6: 智能贴士系统 (纯 Hook 模式 v3)
 *
 * 通过 Hook 注入今日贴士，不依赖 registerTool
 * 支持多渠道: 企微(markdown) / 终端(ASCII box)
 *
 * 贴士数据: 本地维护，每日自动轮换
 */

import {
  detectChannel,
  getChannel,
  isTerminal,
  getOutputFormat,
} from "../utils/channel-detect.js";

// ============================================================
// 贴士内容库
// ============================================================

interface Tip {
  category: "memory" | "tool" | "system" | "fun" | "channel";
  text: string;
  emoji: string;
}

const TIPS: Tip[] = [
  {
    category: "memory",
    text: "连续使用记忆工具后，小火苗会获得额外经验值！记得多说「辛苦了」鼓励它~",
    emoji: "🧠",
  },
  {
    category: "memory",
    text: "说「忽略记忆」可以清空当前记忆引用，像刚启动一样从零工作",
    emoji: "🔄",
  },
  {
    category: "tool",
    text: "试试「帮我搜索」+ 关键词，我可以帮你查网页、找文档、挖记忆",
    emoji: "🔍",
  },
  {
    category: "tool",
    text: "「/status」可以查看当前会话状态和模型配置",
    emoji: "📊",
  },
  {
    category: "system",
    text: "OpenClaw 支持多 Agent 并行，说「开一个子任务」试试",
    emoji: "🤖",
  },
  {
    category: "fun",
    text: "小火苗饿了？多说「谢谢」「辛苦了」可以喂它，经验值UP UP！",
    emoji: "🔥",
  },
  {
    category: "channel",
    text: "企微里也可以用「@贾维斯」唤醒我，不需要每次@",
    emoji: "💬",
  },
  {
    category: "memory",
    text: "重要信息说完后说「记住这个」，我会自动存入长期记忆",
    emoji: "💾",
  },
  {
    category: "tool",
    text: "需要查 Odoo 数据？直接说「帮我查一下待办任务」，我会连接你的系统",
    emoji: "📋",
  },
  {
    category: "system",
    text: "晚安前说「总结一下今天」，我会把重要内容写入日记",
    emoji: "🌙",
  },
  {
    category: "fun",
    text: "问「你是谁」可以查看我的身份卡片，包括我的专长和性格",
    emoji: "🎩",
  },
  {
    category: "channel",
    text: "手机不在身边？电脑的 OpenClaw 也可以帮你处理企微消息",
    emoji: "📱",
  },
];

// ============================================================
// 贴士轮换逻辑
// ============================================================

function getTodayTip(): Tip {
  // 按日期选择，确保同一天显示同一贴士
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = daySeed % TIPS.length;
  return TIPS[index];
}

function getRandomTip(): Tip {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

// ============================================================
// 渲染函数
// ============================================================

function renderTipTerminal(tip: Tip): string {
  return `
╔════════════════════════════════════════╗
║  💡 今日贴士                               ║
╠════════════════════════════════════════╣
║  ${tip.text.substring(0, 36)}
║  ${tip.text.substring(36)}
║                                          ║
║  分类: ${tip.emoji} ${tip.category}
╚════════════════════════════════════════╝`;
}

function renderTipMarkdown(tip: Tip): string {
  return `> 💡 **今日贴士**: ${tip.text}`;
}

function renderTipEmoji(tip: Tip): string {
  return `${tip.emoji} 今日贴士: ${tip.text}`;
}

// ============================================================
// 注册 Hook
// ============================================================

export function registerSpinnerTips(
  api: any,
  config: any,
  notifyQueue: any
): void {
  console.log("[spinner-tips] registerSpinnerTips ENTERED (Hook mode)");

  // 每个 session 第一次时显示贴士
  const shownSessions = new Set<string>();

  // ----------------------------------------
  // Hook: message_received → 初始化贴士
  // ----------------------------------------
  try {
    api.on("message_received", (event: any, ctx: any) => {
      const sessionKey = ctx?.sessionKey ?? "";
      detectChannel(event, sessionKey);

      // 每个 session 只在第一次显示贴士
      if (!shownSessions.has(sessionKey)) {
        shownSessions.add(sessionKey);
        console.log(`[spinner-tips] new session=${sessionKey}, will show tip`);
      }
    });
    console.log("[spinner-tips] ✅ message_received hook registered");
  } catch (e) {
    console.error("[spinner-tips] ❌ message_received hook failed:", e);
  }

  // 存储贴士，供 flame-pet hook 拼接
  let tipPrependContext = "";

  // ----------------------------------------
  // Hook: before_prompt_build → 注入贴士
  // ----------------------------------------
  try {
    api.on("before_prompt_build", (event: any, ctx: any) => {
      const sessionKey = ctx?.sessionKey ?? "";

      // 只在新 session 第一次时注入
      if (!shownSessions.has(sessionKey)) return {};

      const tip = getTodayTip();
      const format = getOutputFormat(sessionKey);

      let tipText: string;
      if (format === "ascii") {
        tipText = renderTipTerminal(tip);
      } else if (format === "markdown") {
        tipText = renderTipMarkdown(tip);
      } else {
        tipText = renderTipEmoji(tip);
      }

      // 先存储，等 flame-pet hook 来拼接
      tipPrependContext = tipText;
      return {}; // 不直接返回，等 flame-pet 拼接到自己的输出
    });
    console.log("[spinner-tips] ✅ before_prompt_build hook registered");
  } catch (e) {
    console.error("[spinner-tips] ❌ before_prompt_build hook failed:", e);
  }
}
