/**
 * 像素宠物渲染器 — WeCom 兼容方案
 *
 * WeCom 支持: emoji、表格、粗体、斜体、链接、代码块、引用块
 * WeCom 不支持: ANSI 颜色、内联 HTML
 *
 * 方案: Unicode 方块字符 + 代码块 模拟像素艺术
 */

import type { PetState } from "../modules/flame-pet.js";

export interface PixelPetConfig {
  pixelArtChance?: number; // 像素图形展示概率 (0-1)，默认 0.1
}

const DEFAULT_PIXEL_CHANCE = 0.1;

// 火焰像素精灵图（多帧动画）
const PIXEL_FIRE_FRAMES = [
  // 帧1：火焰跳动
  [
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥    ",
    "   🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥   ",
    "   🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥   ",
    "   🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥   ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥    ",
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "        🔥🔥🔥🔥🔥🔥🔥🔥        ",
    "          🔥🔥🔥🔥🔥🔥          ",
    "            🔥🔥🔥🔥            ",
    "              🔥🔥              ",
  ],
  // 帧2：火焰摇曳
  [
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥    ",
    "   🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥   ",
    "   🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥   ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥     ",
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "        🔥🔥🔥🔥🔥🔥🔥🔥🔥        ",
    "          🔥🔥🔥🔥🔥🔥🔥          ",
    "            🔥🔥🔥🔥🔥            ",
    "              🔥🔥🔥              ",
    "                🔥🔥                ",
  ],
  // 帧3：火焰变小
  [
    "        🔥🔥🔥🔥🔥🔥🔥🔥        ",
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥    ",
    "    🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥    ",
    "      🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥      ",
    "        🔥🔥🔥🔥🔥🔥🔥🔥🔥        ",
    "          🔥🔥🔥🔥🔥🔥🔥          ",
    "            🔥🔥🔥🔥🔥            ",
    "              🔥🔥🔥              ",
    "                🔥🔥                ",
    "                  🔥                  ",
  ],
];

let frameIndex = 0;
function nextFrame(): string[] {
  const frame = PIXEL_FIRE_FRAMES[frameIndex++ % PIXEL_FIRE_FRAMES.length];
  return frame;
}

function xpForLevel(lv: number): number {
  return lv * lv * 100;
}

function getLevelEmoji(level: number): string {
  if (level >= 10) return "🔱";
  if (level >= 5) return "⚡";
  return "✨";
}

function renderXpBar(current: number, max: number): string {
  const total = 8;
  const filled = Math.round((current / max) * total);
  return "█".repeat(filled) + "░".repeat(total - filled);
}

function formatUptime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  return h < 1 ? "<1h" : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d${h % 24}h`;
}

// ============================================================
// WeCom 渲染
// ============================================================

/**
 * 像素图形版（偶尔展示，10%概率）
 */
export function renderWeComPixelArt(pet: PetState): string {
  const frame = nextFrame();
  const levelEmoji = getLevelEmoji(pet.level);
  const xpPercent = Math.round((pet.xp / xpForLevel(pet.level)) * 100);

  const artLines = frame.map(line => `  ${line}`).join("\n");

  return `**🔥 ${pet.name} ${levelEmoji}** Lv.${pet.level}

\`\`\`
${artLines}
\`\`\`

📊 XP: \`${pet.xp}/${xpForLevel(pet.level)}\` (${xpPercent}%)
📈 等级: ${pet.level}
💎 累计: ${pet.totalXp} XP`;
}

/**
 * 简洁 emoji 版（默认显示）
 */
export function renderWeComEmoji(pet: PetState): string {
  const levelEmoji = getLevelEmoji(pet.level);
  const xpPercent = Math.round((pet.xp / xpForLevel(pet.level)) * 100);
  const xpBar = renderXpBar(pet.xp, xpForLevel(pet.level));

  return `🟠 **${pet.name}** Lv.${pet.level}「orange焰」
XP: [${xpBar}] ${pet.xp}/${xpForLevel(pet.level)}

> 温暖 ${pet.warmth}% | 明亮 ${pet.brightness}% | 稳定 ${pet.stability}%
> 耐力 ${formatUptime(Date.now() - pet.lastFed)}`;
}

/**
 * 终端 ASCII 版本
 */
export function renderTerminalPixel(pet: PetState): string {
  const frame = nextFrame();
  const levelEmoji = getLevelEmoji(pet.level);
  const xpBar = renderXpBar(pet.xp, xpForLevel(pet.level));

  const artLines = frame.map(line => `  ${line}`).join("\n");

  return `${artLines}
\`\`\`
🟠 ${pet.name} ${levelEmoji} Lv.${pet.level}「orange焰」
XP: [${xpBar}] ${pet.xp}/${xpForLevel(pet.level)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌡️ 温暖 ${pet.warmth}%  💡 明亮 ${pet.brightness}%  ⚖️ 稳定 ${pet.stability}%
⏱️ 耐力 ${formatUptime(Date.now() - pet.lastFed)}
💎 累计 ${pet.totalXp} XP
\`\`\``;
}

/**
 * 渲染入口（根据配置决定是否展示像素图形）
 */
export function renderPixelPet(
  pet: PetState,
  format: "wecom" | "terminal" | "emoji",
  config?: PixelPetConfig
): string {
  const pixelChance = config?.pixelArtChance ?? DEFAULT_PIXEL_CHANCE;

  // 终端模式用像素 ASCII
  if (format === "terminal") {
    return renderTerminalPixel(pet);
  }

  // 企微/emoji 模式：按概率决定是否展示像素图形
  const showPixelArt = Math.random() < pixelChance;

  if (format === "wecom") {
    return showPixelArt ? renderWeComPixelArt(pet) : renderWeComEmoji(pet);
  }

  // emoji 格式（markdown）
  return renderWeComEmoji(pet);
}
