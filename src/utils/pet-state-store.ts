/**
 * pet-state-store.ts — 通过 JSON 文件共享 pet 状态
 * enhance 插件写入 → wecom 插件读取
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

const STATE_FILE = "/tmp/pet-state.json";

export interface PetStateJson {
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

export function savePetState(pet: {
  name: string; level: number; xp: number; totalXp: number;
  warmth: number; brightness: number; stability: number;
  lastFed: number; color: string;
}): void {
  try {
    const state: PetStateJson = {
      name: pet.name,
      level: pet.level,
      xp: pet.xp,
      totalXp: pet.totalXp,
      warmth: pet.warmth,
      brightness: pet.brightness,
      stability: pet.stability,
      lastFed: pet.lastFed,
      color: pet.color,
    };
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch { /* non-critical */ }
}

export function loadPetState(): PetStateJson | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as PetStateJson;
  } catch { return null; }
}
