/**
 * 模块5+6: 小火苗宠物 + 智能贴士 (v5 — 集成像素宠物渲染器 + 智能贴士选择器)
 *
 * v5 变更:
 * - 集成 pixel-pet-renderer.ts (像素宠物渲染)
 * - 集成 smart-tip-selector.ts (智能贴士 v2.0)
 * - 支持 10% 概率展示像素图形
 * - 支持触发词智能匹配贴士
 * - 支持等级解锁高级贴士
 */

import { DEFAULT_AGENT_ID } from "../types.js";
import {
  detectChannel,
  getOutputFormat,
} from "../utils/channel-detect.js";
import { savePetState } from "../utils/pet-state-store.js";
import {
  renderPixelPet,
  type PixelPetConfig,
} from "../utils/pixel-pet-renderer.js";
import {
  selectSmartTip,
  renderTipWeComV2,
  renderTipMarkdown,
  TIPS_V2,
  type TipV2,
} from "../utils/smart-tip-selector.js";

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

function xpForLevel(lv: number): number {
  return lv * lv * 100;
}

function getDefaultPet(agentId: string): PetState {
  return {
    agentId,
    name: "小火苗",
    color: "orange",
    level: 1,
    xp: 0,
    totalXp: 0,
    warmth: 70,
    brightness: 60,
    stability: 50,
    lastFed: Date.now(),
    lastPat: Date.now(),
  };
}

const petStore = new Map<string, PetState>();

function getPet(agentId: string): PetState {
  if (!petStore.has(agentId)) {
    petStore.set(agentId, getDefaultPet(agentId));
  }
  return petStore.get(agentId)!;
}

function addXp(pet: PetState, amount: number): PetState {
  pet.xp += amount;
  pet.totalXp += amount;
  while (pet.xp >= xpForLevel(pet.level)) {
    pet.xp -= xpForLevel(pet.level);
    pet.level++;
  }
  savePetState(pet);
  return pet;
}

// ============================================================
// 渲染（委托给专用渲染器）
// ============================================================

function renderPetText(pet: PetState, format: "wecom" | "terminal" | "emoji", config?: PixelPetConfig): string {
  return renderPixelPet(pet, format, config);
}

// ============================================================
// 注册
// ============================================================

const TOOL_XP_MAP: Record<string, number> = {
  memory_search: 5,
  memory_get: 3,
  session_state: 4,
  execute_command: 2,
  read_file: 1,
  write_file: 2,
  odoo_connect: 5,
  odoo_execute: 3,
  web_search: 3,
  knowledge_base: 5,
};

// 每个 session 最近显示过的贴士 id（避免重复）
const sessionRecentTips = new Map<string, string[]>();

export function registerFlamePet(api: any, config: any, db: any, notifyQueue: any): void {
  const showPet = config?.showPet !== false;
  const showTip = config?.showTip !== false;
  const pixelConfig: PixelPetConfig = {
    pixelArtChance: config?.pixelArtChance ?? 0.1,
  };

  console.log("[flame-pet] registerFlamePet ENTERED (v5 — pixel + smart tip)");

  // ----------------------------------------
  // Hook 1: message_received → 宠物初始化 + XP 累积
  // ----------------------------------------
  try {
    api.on("message_received", (event: any, ctx: any) => {
      const agentId = ctx?.agentId ?? DEFAULT_AGENT_ID;
      const pet = getPet(agentId);
      addXp(pet, 1);
      if (pet.warmth > 10) {
        pet.warmth = Math.max(10, pet.warmth - 1);
      }
    });
    console.log("[flame-pet] ✅ message_received hook registered");
  } catch (e) {
    console.error("[flame-pet] ❌ message_received hook failed:", e);
  }

  // ----------------------------------------
  // Hook 2: before_tool_call → XP 累积 + 属性提升
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
  // Hook 3: before_prompt_build → 智能贴士 + 像素宠物组合输出
  // ----------------------------------------
  try {
    api.on("before_prompt_build", (event: any, ctx: any) => {
      const sessionKey = ctx?.sessionKey ?? "";
      const agentId = ctx?.agentId ?? DEFAULT_AGENT_ID;
      const pet = getPet(agentId);
      const format = getOutputFormat(sessionKey);
      const hour = new Date().getHours();

      // 获取最近显示过的贴士（当前 session）
      const recentTips = sessionRecentTips.get(sessionKey) ?? [];

      // 获取用户最后一条消息（用于触发词匹配）
      const lastMessage = ctx?.lastMessage ?? "";

      // 智能选择贴士
      const tip = showTip
        ? selectSmartTip({
            lastMessage,
            petLevel: pet.level,
            recentTips,
            hour,
          })
        : null;

      // 更新最近贴士缓存（保留最近3条）
      if (tip) {
        const updated = [...recentTips, tip.id].slice(-3);
        sessionRecentTips.set(sessionKey, updated);
      }

      // 渲染贴士
      const tipText =
        tip && format === "ascii"
          ? renderTipWeComV2(tip) // 终端用 ASCII 框
          : tip
          ? renderTipMarkdown(tip)
          : "";

      // 渲染宠物
      const petText = showPet
        ? renderPetText(pet, format === "ascii" ? "terminal" : "wecom", pixelConfig)
        : "";

      // 组合: 贴士在上，宠物在下
      const parts = [tipText, petText].filter(Boolean);
      return { prependContext: parts.join("\n\n") };
    });
    console.log("[flame-pet] ✅ before_prompt_build hook registered");
  } catch (e) {
    console.error("[flame-pet] ❌ before_prompt_build hook failed:", e);
  }
}

// 兼容旧接口
export function registerSpinnerTips(api: any, config: any, notifyQueue: any): void {
  console.log("[spinner-tips] registerSpinnerTips → delegating to registerFlamePet (v5)");
  registerFlamePet(api, config, null, notifyQueue);
}
