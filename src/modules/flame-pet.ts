/**
 * 模块5+6: 小火苗宠物 + 智能贴士 (合并版 Hook 模式 v4)
 *
 * 通过单一 Hook 组合输出，解决 prependContext 覆盖问题
 * 支持多渠道: 企微(markdown) / 终端(ASCII)
 */

import { DEFAULT_AGENT_ID } from "../types.js";
import {
  detectChannel,
  getChannel,
  isWecom,
  isTerminal,
  getOutputFormat,
} from "../utils/channel-detect.js";

// ============================================================
// 宠物数据
// ============================================================

export interface PetState {
  agentId: string;
  name: string;
  color: "orange" | "blue" | "purple" | "green" | "white";
  level: number;
  xp: number;
  totalXp: number;
  warmth: number;
  brightness: number;
  stability: number;
  lastFed: number;
  lastPat: number;
}

const PET_COLORS: Record<PetState["color"], string> = {
  orange: "🟠", blue: "🔵", purple: "🟣", green: "🟢", white: "⚪",
};

function xpForLevel(lv: number): number { return lv * lv * 100; }

function getDefaultPet(agentId: string): PetState {
  return {
    agentId, name: "小火苗", color: "orange",
    level: 1, xp: 0, totalXp: 0,
    warmth: 70, brightness: 60, stability: 50,
    lastFed: Date.now(), lastPat: Date.now(),
  };
}

const petStore = new Map<string, PetState>();

function getPet(agentId: string): PetState {
  if (!petStore.has(agentId)) petStore.set(agentId, getDefaultPet(agentId));
  return petStore.get(agentId)!;
}

function addXp(pet: PetState, amount: number): PetState {
  pet.xp += amount;
  pet.totalXp += amount;
  while (pet.xp >= xpForLevel(pet.level)) {
    pet.xp -= xpForLevel(pet.level);
    pet.level++;
  }
  return pet;
}

// ============================================================
// 贴士
// ============================================================

interface Tip {
  category: string;
  text: string;
  emoji: string;
}

const TIPS: Tip[] = [
  { category: "memory", emoji: "🧠", text: "连续使用记忆工具后，小火苗会获得额外经验值！记得多说「辛苦了」鼓励它~" },
  { category: "memory", emoji: "🔄", text: "说「忽略记忆」可以清空当前记忆引用，像刚启动一样从零工作" },
  { category: "tool", emoji: "🔍", text: "试试「帮我搜索」+ 关键词，我可以帮你查网页、找文档、挖记忆" },
  { category: "tool", emoji: "📊", text: "「/status」可以查看当前会话状态和模型配置" },
  { category: "system", emoji: "🤖", text: "OpenClaw 支持多 Agent 并行，说「开一个子任务」试试" },
  { category: "fun", emoji: "🔥", text: "小火苗饿了？多说「谢谢」「辛苦了」可以喂它，经验值UP UP！" },
  { category: "channel", emoji: "💬", text: "企微里也可以用「@贾维斯」唤醒我，不需要每次都@我" },
  { category: "memory", emoji: "💾", text: "重要信息说完后说「记住这个」，我会自动存入长期记忆" },
  { category: "tool", emoji: "📋", text: "需要查 Odoo 数据？直接说「帮我查一下待办任务」，我会连接你的系统" },
  { category: "system", emoji: "🌙", text: "晚安前说「总结一下今天」，我会把重要内容写入日记" },
  { category: "fun", emoji: "🎩", text: "问「你是谁」可以查看我的身份卡片，包括我的专长和性格" },
  { category: "channel", emoji: "📱", text: "手机不在身边？电脑的 OpenClaw 也可以帮你处理企微消息" },
];

function getTodayTip(): Tip {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return TIPS[seed % TIPS.length];
}

// ============================================================
// 渲染
// ============================================================

const FLAME_FRAMES = [
  "    🔥🔥🔥    \n   🔥🔥🔥🔥🔥   \n  🔥🔥🔥🔥🔥🔥🔥  \n 🔥🔥🔥🔥🔥🔥🔥🔥🔥 ",
  "    🔥🔥🔥    \n   🔥🔥🔥🔥🔥   \n  🔥🔥🔥🔥🔥🔥🔥  \n  🔥🔥🔥🔥🔥🔥🔥🔥 ",
  "    🔥🔥🔥    \n   🔥🔥🔥🔥🔥   \n   🔥🔥🔥🔥🔥🔥🔥 \n   🔥🔥🔥🔥🔥🔥🔥🔥 ",
  "    🔥🔥🔥    \n   🔥🔥🔥🔥🔥   \n   🔥🔥🔥🔥🔥🔥🔥 \n    🔥🔥🔥🔥🔥🔥🔥 ",
];
let flameFrame = 0;
function nextFlameFrame(): string { return FLAME_FRAMES[flameFrame++ % FLAME_FRAMES.length]; }

function renderXpBar(current: number, max: number): string {
  const total = 12;
  return "█".repeat(Math.round(current / max * total)) + "░".repeat(total - Math.round(current / max * total));
}

function formatUptime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  return h < 1 ? "<1h" : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d${h % 24}h`;
}

function renderTerminal(pet: PetState): string {
  return `${nextFlameFrame()}
\`\`\`
🟠 ${pet.name} Lv.${pet.level}「${pet.color}焰」
XP: ${renderXpBar(pet.xp, xpForLevel(pet.level))} ${pet.xp}/${xpForLevel(pet.level)}
━━━━━━━━━━━━━━━━━━━━
🌡️ 温暖 ${pet.warmth}%  💡 明亮 ${pet.brightness}%  ⚖️ 稳定 ${pet.stability}%
⏱️ 耐力 ${formatUptime(Date.now() - pet.lastFed)}
\`\`\``;
}

function renderEmoji(pet: PetState): string {
  return `${PET_COLORS[pet.color]} **${pet.name}** Lv.${pet.level}「${pet.color}焰」

> **经验** ${pet.xp}/${xpForLevel(pet.level)} XP
> **温暖** ${pet.warmth}% | **明亮** ${pet.brightness}% | **稳定** ${pet.stability}%
> **耐力** ${formatUptime(Date.now() - pet.lastFed)}
> **总计** ${pet.totalXp} XP

✨ 有什么可以帮你？`;
}

function renderTipTerminal(tip: Tip): string {
  const lines = tip.text.length > 36
    ? [tip.text.substring(0, 36), tip.text.substring(36)]
    : [tip.text];
  return `
╔════════════════════════════════════════╗
║  💡 今日贴士                               ║
╠════════════════════════════════════════╣
║  ${lines.join("\n║  ")}
║                                          ║
║  分类: ${tip.emoji} ${tip.category}
╚════════════════════════════════════════╝`;
}

function renderTipMarkdown(tip: Tip): string {
  return `> 💡 **今日贴士**: ${tip.text}`;
}

// ============================================================
// 注册 (合并版)
// ============================================================

const TOOL_XP_MAP: Record<string, number> = {
  memory_search: 5, memory_get: 3, session_state: 4,
  execute_command: 2, read_file: 1, write_file: 2,
  odoo_connect: 5, odoo_execute: 3, web_search: 3, knowledge_base: 5,
};

const shownSessions = new Set<string>();

export function registerFlamePet(api: any, config: any, db: any, notifyQueue: any): void {
  const showPet = config?.showPet !== false;
  const showTip = config?.showTip !== false;
  console.log("[flame-pet] registerFlamePet ENTERED (combined Hook mode v4)");

  // ----------------------------------------
  // Hook 1: message_received → 渠道检测 + 宠物初始化 + 标记新 session
  // ----------------------------------------
  try {
    api.on("message_received", (event: any, ctx: any) => {
      const sessionKey = ctx?.sessionKey ?? "";
      const agentId = ctx?.agentId ?? DEFAULT_AGENT_ID;
      detectChannel(event, sessionKey);

      const pet = getPet(agentId);
      addXp(pet, 1);
      if (pet.warmth > 10) pet.warmth = Math.max(10, pet.warmth - 1);

      shownSessions.add(sessionKey);
    });
    console.log("[flame-pet] ✅ message_received hook registered");
  } catch (e) {
    console.error("[flame-pet] ❌ message_received hook failed:", e);
  }

  // ----------------------------------------
  // Hook 2: before_tool_call → XP 累积
  // ----------------------------------------
  try {
    api.on("before_tool_call", (event: any, ctx: any) => {
      const agentId = ctx?.agentId ?? DEFAULT_AGENT_ID;
      const toolName = event?.toolName ?? "unknown";
      const xp = TOOL_XP_MAP[toolName] ?? 1;
      const pet = getPet(agentId);
      addXp(pet, xp);
      if (toolName === "knowledge_base" || toolName === "memory_search") {
        pet.brightness = Math.min(100, pet.brightness + 2);
      }
      if (toolName === "execute_command") {
        pet.stability = Math.min(100, pet.stability + 1);
      }
    });
    console.log("[flame-pet] ✅ before_tool_call hook registered");
  } catch (e) {
    console.error("[flame-pet] ❌ before_tool_call hook failed:", e);
  }

  // ----------------------------------------
  // Hook 3: before_prompt_build → 贴士 + 小火苗 组合输出
  // ----------------------------------------
  try {
    api.on("before_prompt_build", (event: any, ctx: any) => {
      const sessionKey = ctx?.sessionKey ?? "";
      const agentId = ctx?.agentId ?? DEFAULT_AGENT_ID;
      const pet = getPet(agentId);
      const format = getOutputFormat(sessionKey);
      const tip = getTodayTip();

      // 贴士部分
      const tipText = (showTip && format === "ascii")
        ? renderTipTerminal(tip)
        : (showTip ? renderTipMarkdown(tip) : "");

      // 小火苗部分
      const petText = showPet
        ? ((format === "ascii") ? renderTerminal(pet) : renderEmoji(pet))
        : "";

      // 组合: 贴士在上，小火苗在下
      const parts = [tipText, petText].filter(Boolean);
      return { prependContext: parts.join("\n\n") };
    });
    console.log("[flame-pet] ✅ before_prompt_build hook registered");
  } catch (e) {
    console.error("[flame-pet] ❌ before_prompt_build hook failed:", e);
  }
}

// 兼容旧接口: registerSpinnerTips 指向同一个函数
export function registerSpinnerTips(api: any, config: any, notifyQueue: any): void {
  console.log("[spinner-tips] registerSpinnerTips → delegating to registerFlamePet");
  registerFlamePet(api, config, null, notifyQueue);
}
