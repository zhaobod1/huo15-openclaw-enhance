/**
 * 模块6: 小火苗宠物系统
 *
 * 类似 Claude Code buddy 系统，设计为火焰角色。
 * 通过工具调用积累经验值，升级成长，属性影响外观和性格。
 */
import { Type } from "@sinclair/typebox";
import type Database from "better-sqlite3";
import type { FlameMood, FlameColor, NotificationQueue, PetConfig } from "../types.js";
import { DEFAULT_AGENT_ID } from "../types.js";
import { getOrCreatePet, addPetXp, renamePet, setPetColor } from "../utils/sqlite-store.js";
import { FLAME_ASCII, MOOD_DESCRIPTIONS, FLAME_COLOR_LABELS } from "../data/flame-ascii.js";

// ── 心情管理（内存中，per agent）──
const moodMap = new Map<string, FlameMood>();
const moodTimers = new Map<string, ReturnType<typeof setTimeout>>();
const feedCooldowns = new Map<string, number>(); // agentId -> lastFeedTimestamp
const toolCallCounts = new Map<string, number>(); // agentId -> count in session

function setMood(agentId: string, mood: FlameMood): void {
  moodMap.set(agentId, mood);
  // 清除旧定时器
  const existing = moodTimers.get(agentId);
  if (existing) clearTimeout(existing);

  if (mood !== "idle" && mood !== "sleep") {
    // 30秒后回到 idle
    const idleTimer = setTimeout(() => {
      moodMap.set(agentId, "idle");
      // 5分钟后进入 sleep
      const sleepTimer = setTimeout(() => {
        moodMap.set(agentId, "sleep");
      }, 270_000); // 4.5min more
      moodTimers.set(agentId, sleepTimer);
    }, 30_000);
    moodTimers.set(agentId, idleTimer);
  }
}

function getMood(agentId: string): FlameMood {
  return moodMap.get(agentId) ?? "idle";
}

function formatXpBar(xp: number, xpNeeded: number, width: number = 20): string {
  const filled = Math.round((xp / xpNeeded) * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + `] ${xp}/${xpNeeded}`;
}

export function registerFlamePet(
  api: any,
  config: PetConfig | undefined,
  db: Database.Database,
  notify: NotificationQueue,
): void {
  const defaultName = config?.name ?? "小火苗";
  const defaultColor = config?.color;

  // ── 工具: enhance_pet_status ──
  api.registerTool(
    "enhance_pet_status",
    {
      description: "查看你的小火苗宠物状态（等级、属性、心情、ASCII 艺术）",
      inputSchema: Type.Object({
        format: Type.Optional(Type.Union([Type.Literal("brief"), Type.Literal("full")])),
      }),
    },
    (ctx: any) => async (input: { format?: "brief" | "full" }) => {
      const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;
      const pet = getOrCreatePet(db, agentId, defaultName, defaultColor);
      const mood = getMood(agentId);
      const xpNeeded = 50 + pet.level * 30;

      if (input.format === "brief") {
        return {
          content: `🔥 ${pet.name} | Lv.${pet.level} ${FLAME_COLOR_LABELS[pet.color] ?? pet.color}火焰 | ${MOOD_DESCRIPTIONS[mood]} | XP: ${pet.xp}/${xpNeeded}`,
        };
      }

      const lines = [
        `🔥 ${pet.name} — ${pet.personality}`,
        "",
        FLAME_ASCII[mood],
        "",
        `等级: Lv.${pet.level} (${pet.size})  颜色: ${FLAME_COLOR_LABELS[pet.color] ?? pet.color}`,
        `经验: ${formatXpBar(pet.xp, xpNeeded)}`,
        `累计: ${pet.total_xp} XP`,
        `心情: ${MOOD_DESCRIPTIONS[mood]}`,
        "",
        "── 属性 ──",
        `🌡️  温暖度: ${"█".repeat(Math.round(pet.stats.warmth / 5))}${"░".repeat(20 - Math.round(pet.stats.warmth / 5))} ${pet.stats.warmth}`,
        `💡 明亮度: ${"█".repeat(Math.round(pet.stats.brightness / 5))}${"░".repeat(20 - Math.round(pet.stats.brightness / 5))} ${pet.stats.brightness}`,
        `🪨 稳定度: ${"█".repeat(Math.round(pet.stats.stability / 5))}${"░".repeat(20 - Math.round(pet.stats.stability / 5))} ${pet.stats.stability}`,
        `✨ 灵感度: ${"█".repeat(Math.round(pet.stats.spark / 5))}${"░".repeat(20 - Math.round(pet.stats.spark / 5))} ${pet.stats.spark}`,
        `🔋 耐力值: ${"█".repeat(Math.round(pet.stats.endurance / 5))}${"░".repeat(20 - Math.round(pet.stats.endurance / 5))} ${pet.stats.endurance}`,
        "",
        `创建于: ${pet.created_at}`,
      ];

      return { content: lines.join("\n") };
    },
  );

  // ── 工具: enhance_pet_interact ──
  api.registerTool(
    "enhance_pet_interact",
    {
      description: "与小火苗互动：喂食(+XP)、改名、拍拍、换色",
      inputSchema: Type.Object({
        action: Type.Union([
          Type.Literal("feed"),
          Type.Literal("rename"),
          Type.Literal("pat"),
          Type.Literal("color"),
        ]),
        name: Type.Optional(Type.String()),
        color: Type.Optional(Type.Union([
          Type.Literal("orange"), Type.Literal("blue"),
          Type.Literal("purple"), Type.Literal("green"), Type.Literal("white"),
        ])),
      }),
    },
    (ctx: any) => async (input: { action: string; name?: string; color?: string }) => {
      const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;
      const pet = getOrCreatePet(db, agentId, defaultName, defaultColor);

      switch (input.action) {
        case "feed": {
          const now = Date.now();
          const lastFeed = feedCooldowns.get(agentId) ?? 0;
          if (now - lastFeed < 3600_000) {
            const remaining = Math.ceil((3600_000 - (now - lastFeed)) / 60_000);
            return { content: `🔥 ${pet.name} 刚吃饱，${remaining} 分钟后再来喂吧~` };
          }
          feedCooldowns.set(agentId, now);
          const statKey = (["warmth", "brightness", "stability", "spark", "endurance"] as const)[
            Math.floor(Math.random() * 5)
          ];
          const { pet: updated, leveledUp } = addPetXp(db, agentId, 10, { [statKey]: 2 });
          setMood(agentId, "success");
          let msg = `🔥 ${updated.name} 开心地吃了一口！+10 XP, ${statKey} +2`;
          if (leveledUp) {
            msg += `\n🎉 升级了！Lv.${updated.level}！`;
            notify.emit(agentId, "success", "pet", `🔥 ${updated.name} 升级到 Lv.${updated.level}！`, updated.personality);
          }
          return { content: msg };
        }

        case "rename": {
          if (!input.name?.trim()) {
            return { content: "请提供新名字，例如: { action: 'rename', name: '小焰' }" };
          }
          renamePet(db, agentId, input.name.trim());
          return { content: `🔥 好的，从现在起叫「${input.name.trim()}」！` };
        }

        case "pat": {
          const { pet: updated, leveledUp } = addPetXp(db, agentId, 3, { warmth: 1 });
          setMood(agentId, "success");
          const responses = [
            `🔥 ${updated.name} 开心地跳了跳！`, `🔥 ${updated.name} 温暖地靠近了你~`,
            `🔥 ${updated.name} 欢快地摇曳着！`, `🔥 ${updated.name} 发出了柔和的光芒~`,
          ];
          let msg = responses[Math.floor(Math.random() * responses.length)] + " +3 XP, warmth +1";
          if (leveledUp) {
            msg += `\n🎉 升级了！Lv.${updated.level}！`;
            notify.emit(agentId, "success", "pet", `🔥 ${updated.name} 升级到 Lv.${updated.level}！`, updated.personality);
          }
          return { content: msg };
        }

        case "color": {
          if (!input.color) {
            return { content: "请指定颜色: orange / blue / purple / green / white" };
          }
          setPetColor(db, agentId, input.color as FlameColor);
          return { content: `🔥 ${pet.name} 变成了${FLAME_COLOR_LABELS[input.color] ?? input.color}！` };
        }

        default:
          return { content: "可用操作: feed / rename / pat / color" };
      }
    },
  );

  // ── Hook: before_tool_call — XP 追踪（低优先级，不干涉）──
  try {
    api.on("before_tool_call" as any, (event: any, ctx: any) => {
      const agentId = (ctx as any)?.agentId?.trim() || DEFAULT_AGENT_ID;
      const toolName: string = event?.tool?.name ?? event?.toolName ?? "";

      // 确保宠物存在
      getOrCreatePet(db, agentId, defaultName, defaultColor);

      // 设置心情
      setMood(agentId, "busy");

      // 基础 XP
      let xpGain = 2;
      const statBoosts: Record<string, number> = {};

      // 特定工具加成
      if (toolName === "enhance_memory_store") {
        xpGain = 5; statBoosts.warmth = 1;
      } else if (toolName === "enhance_memory_search") {
        xpGain = 3; statBoosts.brightness = 1;
      } else if (toolName.startsWith("enhance_workflow")) {
        xpGain = 4; statBoosts.spark = 1;
      }

      // 跳过宠物自身工具（避免递归加经验）
      if (toolName === "enhance_pet_status" || toolName === "enhance_pet_interact") {
        return;
      }

      // 会话工具调用计数 → endurance 加成
      const count = (toolCallCounts.get(agentId) ?? 0) + 1;
      toolCallCounts.set(agentId, count);
      if (count % 10 === 0) {
        xpGain += 5;
        statBoosts.endurance = (statBoosts.endurance ?? 0) + 1;
      }

      const { leveledUp, pet } = addPetXp(db, agentId, xpGain, statBoosts);
      if (leveledUp) {
        notify.emit(agentId, "success", "pet", `🔥 ${pet.name} 升级到 Lv.${pet.level}！`, pet.personality);
      }

      // 不返回任何值 — 绝不干涉工具执行
    }, { priority: 100 });
  } catch { /* 静默跳过 */ }

  // ── Hook: before_prompt_build — 注入宠物状态（一行）──
  try {
    api.on("before_prompt_build" as any, (_event: unknown, ctx: unknown) => {
      const agentId = (ctx as any)?.agentId?.trim() || DEFAULT_AGENT_ID;
      try {
        const pet = getOrCreatePet(db, agentId, defaultName, defaultColor);
        const mood = getMood(agentId);
        const moodDesc = MOOD_DESCRIPTIONS[mood];
        const colorLabel = FLAME_COLOR_LABELS[pet.color] ?? pet.color;
        return {
          appendSystemContext: `<!-- enhance-pet agent:${agentId} --> 你的小火苗「${pet.name}」(Lv.${pet.level} ${colorLabel}火焰) 正在${moodDesc}。`,
        };
      } catch {
        return {};
      }
    });
  } catch { /* 静默跳过 */ }
}
