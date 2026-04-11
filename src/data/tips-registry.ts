/**
 * 智能贴士注册表 — ~30 条贴士，分 5 类
 */
import type { Tip } from "../types.js";

export const TIPS: Tip[] = [
  // ── shortcuts (8) ──
  { id: "s1", category: "shortcuts", text: "使用 /plan 进入规划模式，先想清楚再动手，避免返工。" },
  { id: "s2", category: "shortcuts", text: "使用 /explore 快速浏览代码库结构，比手动翻文件高效得多。" },
  { id: "s3", category: "shortcuts", text: "使用 /verify 在提交前做一次全面检查，减少 CI 失败。" },
  { id: "s4", category: "shortcuts", text: "按 Ctrl+C 可以随时中断当前操作，不会丢失上下文。" },
  { id: "s5", category: "shortcuts", text: "在提示词中加 @文件名 可以让 Agent 优先关注该文件。" },
  { id: "s6", category: "shortcuts", text: "使用 /memory-curator 定期整理记忆，保持记忆库干净高效。" },
  { id: "s7", category: "shortcuts", text: "连续对话中，Agent 会自动压缩上下文，重要决策会被记忆模块保存。" },
  { id: "s8", category: "shortcuts", text: "可以在 openclaw.plugin.json 中自定义增强包的所有行为。" },

  // ── memory (6) ──
  { id: "m1", category: "memory", text: "使用 enhance_memory_store 存储重要决策时，选择 'decision' 类别并设置高重要度。" },
  { id: "m2", category: "memory", text: "记忆搜索支持关键词和类别过滤，善用 tags 让检索更精准。" },
  { id: "m3", category: "memory", text: "定期用 enhance_memory_review 查看记忆统计，清理过时的条目。" },
  { id: "m4", category: "memory", text: "对话压缩前，增强包会自动将关键上下文存入记忆，你不会丢失重要信息。" },
  { id: "m5", category: "memory", text: "每个 Agent 的记忆是隔离的，企微不同用户/群组的数据互不干扰。" },
  { id: "m6", category: "memory", text: "记忆中的 'feedback' 类别适合存储用户偏好，帮助 Agent 越用越懂你。" },

  // ── workflow (6) ──
  { id: "w1", category: "workflow", text: "工作流支持自定义触发条件，可以实现 'commit 后自动跑测试' 等自动化。" },
  { id: "w2", category: "workflow", text: "复杂任务先用 /plan 拆分步骤，再逐步执行，效率更高。" },
  { id: "w3", category: "workflow", text: "善用仪表盘监控 Agent 工作状态，及时发现异常。" },
  { id: "w4", category: "workflow", text: "多 Agent 场景下，每个 Agent 有独立的工作流和记忆空间。" },
  { id: "w5", category: "workflow", text: "工作流可以设置为启用/禁用，临时关闭不需要的自动化。" },
  { id: "w6", category: "workflow", text: "在 CI/CD 场景中，可以用工作流自动记录构建结果到记忆。" },

  // ── safety (5) ──
  { id: "f1", category: "safety", text: "安全守卫会自动拦截危险命令，如 rm -rf /，保护你的系统安全。" },
  { id: "f2", category: "safety", text: "可以在配置中自定义安全规则，针对特定工具和参数模式设置拦截策略。" },
  { id: "f3", category: "safety", text: "安全事件会被记录到日志，可以通过仪表盘查看拦截历史。" },
  { id: "f4", category: "safety", text: "'block' 级别会弹出确认对话框，'hardblock' 则无条件拦截，按需选择。" },
  { id: "f5", category: "safety", text: "定期检查安全日志，了解哪些操作被拦截，优化规则配置。" },

  // ── general (5) ──
  { id: "g1", category: "general", text: "给你的小火苗起个名字吧！用 enhance_pet_interact 的 rename 功能。", weight: 2 },
  { id: "g2", category: "general", text: "小火苗会随着你的使用成长，多用工具它就会升级变大。", weight: 2 },
  { id: "g3", category: "general", text: "一句话能说清的不要用三句话，简洁的提示词能获得更好的回复。" },
  { id: "g4", category: "general", text: "修 bug 时先理解现有代码，不要顺手重构周围代码。" },
  { id: "g5", category: "general", text: "增强仪表盘支持按 Agent 筛选，多 Agent 场景下很实用。" },
];
