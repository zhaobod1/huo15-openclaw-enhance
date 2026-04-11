/**
 * 小火苗 ASCII 艺术 — 5 种心情状态
 */
import type { FlameMood } from "../types.js";

export const FLAME_ASCII: Record<FlameMood, string> = {
  idle: [
    "      )    ",
    "     ) \\   ",
    "    ( \\ )  ",
    "     \\ |   ",
    "     _|_   ",
    "    |___|  ",
  ].join("\n"),

  busy: [
    "    \\) /   ",
    "   ) \\( )  ",
    "  ( /\\ |   ",
    "   \\ ) |   ",
    "    _|_    ",
    "   |___|   ",
  ].join("\n"),

  error: [
    "      .    ",
    "     ) .   ",
    "    ( . )  ",
    "     . |   ",
    "     _|_   ",
    "    |___|  ",
  ].join("\n"),

  success: [
    "    \\|/    ",
    "   --*--   ",
    "    /|\\    ",
    "     |     ",
    "    _|_    ",
    "   |___|   ",
  ].join("\n"),

  sleep: [
    "           ",
    "      .    ",
    "     (.)   ",
    "     _|_   ",
    "    |___|  ",
    "           ",
  ].join("\n"),
};

export const MOOD_DESCRIPTIONS: Record<FlameMood, string> = {
  idle: "轻轻摇曳",
  busy: "欢快舞动",
  error: "微微闪烁",
  success: "明亮绽放",
  sleep: "静静休眠",
};

export const FLAME_COLOR_LABELS: Record<string, string> = {
  orange: "橙色",
  blue: "蓝色",
  purple: "紫色",
  green: "绿色",
  white: "白色",
};
