/**
 * 模块6: 企业文档标准增强（多 Agent 隔离版）
 *
 * 当用户请求生成 Word/文档时，自动注入企业文档标准到提示词中。
 * 包括：编号规则、版本控制、密级、审批流程、格式规范。
 *
 * before_prompt_build hook 签名:
 *   event: { prompt, messages }
 *   ctx:   { runId, agentId, sessionKey, sessionId, workspaceDir, messageProvider, trigger, channelId }
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { DEFAULT_AGENT_ID, type DocumentStandardConfig } from "../types.js";

const DOCUMENT_TRIGGERS = [
  "写word", "写文档", "生成word", "生成文档", "创建文档",
  "导出word", "下载word", "word文档", "Word文档",
  "写合同", "写方案", "写报告", "写会议纪要",
  "按模板生成", "参照模板", ".docx",
];

const DOCUMENT_STANDARD_SECTION = `
## 企业文档标准（增强包）

当用户请求生成 Word/文档/合同/方案/报告时，必须遵循以下标准：

### 文档元数据（必须包含）
| 字段 | 规则 | 示例 |
|------|------|------|
| 文档编号 | [公司缩写]-[部门]-[年份]-[序号] | HG-HY-2026-001 |
| 版本号 | V1.0 格式，首次 V1.0，修订 V1.1 | V1.0 |
| 密级 | 公开/内部/秘密/机密 | 内部 |
| 日期 | YYYY-MM-DD 格式 | 2026-04-09 |
| 作者 | 姓名 | 赵博 |

### 编号规则
- 公司缩写：HG = 火一五公司
- 部门缩写：HY=会议, HT=合同, BG=报告, FA=方案, JH=纪要
- 年份：2026
- 序号：001, 002...

### 页面格式（GB/T 9704-2012 简化版）
| 要素 | 标准 |
|------|------|
| 边距 | 上 3.7cm，下 3.5cm，左 2.8cm，右 2.6cm |
| 正文 | 仿宋 12pt，1.5 倍行距，首行缩进 2 字符 |
| 一级标题 | 黑体 16pt 加粗，第 X 章 |
| 二级标题 | 楷体 14pt 加粗，一、二、三、 |
| 三级标题 | 仿宋 12pt 加粗，（一）（二）（三） |

### 页眉格式
左对齐：[LOGO] 公司名称  文档编号  【密级】
底边细线分隔

### 页脚格式
居中：第 X 页 / 共 Y 页

### 版本历史表（自动生成在正文前）
| 版本 | 日期 | 作者 | 修改内容 |
|------|------|------|----------|
| V1.0 | YYYY-MM-DD | 作者 | 首次创建 |

### 审批签字区（文档末尾，可选）
| 角色 | 姓名 | 日期 | 签字 |
|------|------|------|------|
| 编制 | | | __________ |
| 审核 | | | __________ |
| 批准 | | | __________ |

### 表格样式
- 第一行：表头，黑体居中，浅灰背景
- 偶数行：斑马条纹（浅灰背景）

### 输出文件命名
[类型简称]_[客户名]_[版本]_[日期].docx
例：合同_阿里巴巴_V1.0_20260409.docx

### 模板模式
当用户提供 .docx 模板时：
1. 分析模板的字体、字号、颜色、段落结构
2. 分析模板的页面设置（边距、方向）
3. 分析模板的页眉页脚格式
4. 保持与模板完全一致的风格生成内容
`;

function matchesDocumentRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return DOCUMENT_TRIGGERS.some(trigger => lower.includes(trigger));
}

export function registerDocumentStandard(api: OpenClawPluginApi, config?: DocumentStandardConfig) {
  const enabled = config?.enabled !== false;

  if (!enabled) {
    api.logger.info(`[enhance] 企业文档标准模块已禁用`);
    return;
  }

  api.on("before_prompt_build", (event, ctx) => {
    // 检查是否涉及文档生成请求
    const messages = (event as { messages?: Array<{ content: string }> })?.messages ?? [];
    const lastMessage = messages.slice(-1)?.[0]?.content ?? "";
    const messageText = typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage);

    if (!matchesDocumentRequest(messageText)) {
      return {};
    }

    const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;

    return {
      appendSystemContext: [
        `\n\n<!-- enhance-document agent:${agentId} -->`,
        DOCUMENT_STANDARD_SECTION,
      ].join("\n\n"),
    };
  });

  api.logger.info(`[enhance] 企业文档标准模块已加载`);
}
