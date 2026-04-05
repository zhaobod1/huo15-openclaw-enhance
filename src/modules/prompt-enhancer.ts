/**
 * 模块3: 提示词增强（多 Agent 隔离版）
 *
 * before_prompt_build hook 签名:
 *   event: { prompt, messages }
 *   ctx:   { runId, agentId, sessionKey, sessionId, workspaceDir, messageProvider, trigger, channelId }
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { DEFAULT_AGENT_ID, type PromptConfig, type PromptSection } from "../types.js";

const SECTIONS: Record<PromptSection, string> = {
  taskClassification: [
    "## 任务分类（增强包）",
    "在开始工作前，先判断当前请求的类型并调整策略：",
    "- **编程**: 展示最小变更，解释为什么而非做了什么，先理解现有代码再修改",
    "- **研究**: 区分事实与推测，引用来源，系统性搜索而非猜测",
    "- **管理**: 外部操作前先确认，记录执行结果",
    "- **对话**: 简洁直接，不过度解释",
  ].join("\n"),

  qualityGuidelines: [
    "## 响应质量准则（增强包）",
    "- 直接给出答案或行动，不要先复述用户说了什么",
    "- 一句话能说清的不要用三句话",
    "- 修 bug 不要顺手重构周围代码",
    "- 不要添加请求之外的功能、注释或类型标注",
    "- 不要为不可能发生的场景做错误处理",
    "- 三行相似代码好过一个过早的抽象",
    "- 失败时先诊断原因，不要盲目重试",
    "- 做破坏性操作前先确认（删除、force push、覆盖未保存的修改）",
  ].join("\n"),

  memoryContext: "", // 由 structured-memory 模块通过自己的钩子注入

  safetyAwareness: [
    "## 安全意识（增强包）",
    "- 写代码时注意 OWASP Top 10 漏洞（注入、XSS、SSRF 等）",
    "- 不要提交 .env、密钥、凭据等敏感文件",
    "- 执行系统命令时避免命令注入风险",
    "- 如果发现自己写了不安全的代码，立即修复",
  ].join("\n"),
};

export function registerPromptEnhancer(api: OpenClawPluginApi, config?: PromptConfig) {
  const enabledSections: PromptSection[] = config?.sections ?? ["qualityGuidelines", "memoryContext"];

  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;
    const parts: string[] = [];

    for (const section of enabledSections) {
      const content = SECTIONS[section];
      if (content) parts.push(content);
    }

    if (parts.length === 0) return {};

    return {
      appendSystemContext: [
        `\n\n<!-- enhance-prompt agent:${agentId} -->`,
        ...parts,
      ].join("\n\n"),
    };
  });

  api.logger.info(`[enhance] 提示词增强模块已加载，启用段落: ${enabledSections.join(", ")}`);
}
