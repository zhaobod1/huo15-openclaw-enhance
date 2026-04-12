/**
 * pet-render.ts — 小火苗渲染函数（供跨插件共享）
 */

export interface PetState {
  name: string;
  level: number;
  xp: number;
  totalXp: number;
  warmth: number;
  brightness: number;
  stability: number;
  lastFed: number;
  color: string;
}

export interface TipInfo {
  text: string;
  emoji: string;
  category: string;
}

export function renderPetForWecomMarkdown(pet: PetState): string {
  const xpMax = pet.level * pet.level * 100;
  const petUptime = Date.now() - pet.lastFed;
  const hours = Math.floor(petUptime / 3600000);
  const uptimeStr = hours < 1 ? "<1h" : hours < 24 ? `${hours}h` : `${Math.floor(hours/24)}d${hours%24}h`;
  const xpBar = "█".repeat(Math.floor(pet.xp / xpMax * 10)) + "░".repeat(10 - Math.floor(pet.xp / xpMax * 10));

  return `> 🟠 **${pet.name}** Lv.${pet.level}「${pet.color}焰」
> **经验** ${xpBar} ${pet.xp}/${xpMax} XP
> **温暖** ${pet.warmth}%  **明亮** ${pet.brightness}%  **稳定** ${pet.stability}%
> **耐力** ${uptimeStr}
> **总计** ${pet.totalXp} XP`;
}

export function renderPetForTerminal(pet: PetState): string {
  const xpMax = pet.level * pet.level * 100;
  const xpBar = "█".repeat(Math.floor(pet.xp / xpMax * 10)) + "░".repeat(10 - Math.floor(pet.xp / xpMax * 10));
  const petUptime = Date.now() - pet.lastFed;
  const hours = Math.floor(petUptime / 3600000);
  const uptimeStr = hours < 1 ? "<1h" : hours < 24 ? `${hours}h` : `${Math.floor(hours/24)}d${hours%24}h`;

  return `🟠 小火苗 Lv.${pet.level}「${pet.color}焰」
XP: ${xpBar} ${pet.xp}/${xpMax}
━━━━━━━━━━━━━━━━━━━━
🌡️ 温暖 ${pet.warmth}%  💡 明亮 ${pet.brightness}%  ⚖️ 稳定 ${pet.stability}%
⏱️ 耐力 ${uptimeStr}`;
}

const TIPS: TipInfo[] = [
  { text: "需要查 Odoo 数据？直接说「帮我查一下待办任务」，我会连接你的系统", emoji: "📋", category: "tool" },
  { text: "晚安前说「总结一下今天」，我会把重要内容写入日记", emoji: "🌙", category: "system" },
  { text: "想养小火苗？多用我帮你做事，它会获得 XP 奖励", emoji: "🔥", category: "pet" },
  { text: "小贴士：你可以直接说「帮我写一封邮件」来发送企业邮箱", emoji: "✉️", category: "tool" },
  { text: "遇到问题？试着描述错误信息，我会帮你分析", emoji: "🔍", category: "system" },
];

export function getTodayTipInfo(): TipInfo {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return TIPS[seed % TIPS.length];
}
