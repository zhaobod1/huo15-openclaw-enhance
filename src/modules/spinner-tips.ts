/**
 * 模块7: 智能贴士系统
 *
 * 类似 Claude Code spinner tips，随机展示实用小贴士。
 * 带冷却机制，避免重复展示同一条。
 */
import { Type } from "@sinclair/typebox";
import type { TipCategory, TipsConfig, NotificationQueue } from "../types.js";
import { DEFAULT_AGENT_ID } from "../types.js";
import { TIPS } from "../data/tips-registry.js";

// 冷却记录：tipId -> lastShownTimestamp
const cooldownMap = new Map<string, number>();

function pickTip(category?: TipCategory, cooldownMinutes: number = 60): typeof TIPS[0] | null {
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60_000;

  // 过滤：匹配类别 + 不在冷却中
  const eligible = TIPS.filter((tip) => {
    if (category && tip.category !== category) return false;
    const lastShown = cooldownMap.get(tip.id) ?? 0;
    return now - lastShown >= cooldownMs;
  });

  if (eligible.length === 0) return null;

  // 加权随机选择
  const totalWeight = eligible.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let rand = Math.random() * totalWeight;
  for (const tip of eligible) {
    rand -= tip.weight ?? 1;
    if (rand <= 0) {
      cooldownMap.set(tip.id, now);
      return tip;
    }
  }

  // fallback
  const picked = eligible[0];
  cooldownMap.set(picked.id, now);
  return picked;
}

export function registerSpinnerTips(
  api: any,
  config: TipsConfig | undefined,
  notify: NotificationQueue,
): void {
  const cooldownMinutes = config?.cooldownMinutes ?? 60;
  const injectInPrompt = config?.injectInPrompt !== false;

  // ── 工具: enhance_tip_of_the_day ──
  api.registerTool(
    "enhance_tip_of_the_day",
    {
      description: "获取一条实用小贴士（支持按类别筛选: shortcuts/memory/workflow/safety/general）",
      inputSchema: Type.Object({
        category: Type.Optional(Type.Union([
          Type.Literal("shortcuts"), Type.Literal("memory"),
          Type.Literal("workflow"), Type.Literal("safety"), Type.Literal("general"),
        ])),
      }),
    },
    async (input: { category?: TipCategory }) => {
      const tip = pickTip(input.category, cooldownMinutes);
      if (!tip) {
        return { content: "暂时没有新贴士了，稍后再来看看吧~" };
      }
      return {
        content: `💡 小贴士 [${tip.category}]\n\n${tip.text}`,
      };
    },
  );

  // ── Hook: before_prompt_build — 每次注入一条贴士 ──
  if (injectInPrompt) {
    try {
      api.on("before_prompt_build" as any, () => {
        const tip = pickTip(undefined, cooldownMinutes);
        if (tip) {
          return {
            appendSystemContext: `<!-- enhance-tip --> 💡 小贴士: ${tip.text}`,
          };
        }
        return {};
      });
    } catch { /* 静默跳过 */ }
  }
}
