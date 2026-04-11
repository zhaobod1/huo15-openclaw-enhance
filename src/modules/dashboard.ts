/**
 * 模块5: 增强仪表盘（多 Agent 隔离版）
 *
 * registerHttpRoute handler 签名:
 *   (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void>
 *
 * 这是 Node.js 原生 HTTP handler，不是 Web Fetch API。
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getDb,
  getMemoryStats,
  getSafetyStats,
  getRecentMemories,
  getRecentSafetyEvents,
  getAllAgentIds,
} from "../utils/sqlite-store.js";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_AGENT_ID, type DashboardConfig, type Workflow } from "../types.js";

function loadAllWorkflows(openclawDir: string): Workflow[] {
  const path = join(openclawDir, "memory", "enhance-workflows.json");
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
}

function sendJson(res: ServerResponse, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>龙虾增强包 — 仪表盘</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f1117;color:#e0e0e0;padding:24px;max-width:1060px;margin:0 auto}
  h1{font-size:1.8em;margin-bottom:8px;color:#ff6b35}
  .subtitle{color:#888;margin-bottom:16px;font-size:0.95em}
  .agent-bar{display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap}
  .agent-bar label{color:#888;font-size:0.9em}
  .agent-bar select{background:#1a1d27;color:#e0e0e0;border:1px solid #2a2d37;border-radius:6px;padding:6px 12px;font-size:0.9em}
  .agent-bar .current{color:#ff6b35;font-size:0.85em;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px}
  .card{background:#1a1d27;border-radius:12px;padding:20px;border:1px solid #2a2d37}
  .card h3{font-size:0.8em;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .card .value{font-size:2em;font-weight:700;color:#ff6b35}
  .card .label{font-size:0.75em;color:#666;margin-top:4px}
  .section{margin-bottom:32px}
  .section h2{font-size:1.2em;margin-bottom:12px;color:#ccc;border-bottom:1px solid #2a2d37;padding-bottom:8px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #1a1d27}
  th{color:#888;font-size:0.75em;text-transform:uppercase;letter-spacing:1px}
  td{font-size:0.85em}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75em;font-weight:600}
  .badge-block{background:#ff4444;color:#fff}
  .badge-log{background:#444;color:#ccc}
  .badge-allow{background:#2a5a2a;color:#8f8}
  .agent-tag{background:#2a2d37;color:#ff6b35;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px}
  .empty{color:#555;font-style:italic;padding:16px 0}
  footer{text-align:center;color:#444;font-size:0.8em;margin-top:40px}
</style>
</head>
<body>
<h1>&#x1F99E; 龙虾增强包</h1>
<p class="subtitle">OpenClaw Enhancement Kit &mdash; Multi-Agent Dashboard</p>

<div class="agent-bar">
  <label>Agent:</label>
  <select id="agentSelect" onchange="switchAgent(this.value)">
    <option value="">全部 (聚合)</option>
  </select>
  <span class="current" id="currentAgent"></span>
</div>

<div class="grid" id="stats"></div>

<div class="section">
  <h2>最近记忆</h2>
  <div id="memories"></div>
</div>

<div class="section">
  <h2>安全事件</h2>
  <div id="safety"></div>
</div>

<div class="section">
  <h2>工作流</h2>
  <div id="workflows"></div>
</div>

<footer>龙虾增强包 v1.2.3 &mdash; 多 Agent 隔离</footer>

<script>
// 本地仪表盘：仅请求同域 /plugins/enhance/api/status，无外部网络调用
var currentAgent = '';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function card(title, value, label) {
  var el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<h3>' + esc(title) + '</h3><div class="value">' + esc(String(value)) + '</div><div class="label">' + esc(label) + '</div>';
  return el.outerHTML;
}

function buildTable(headers, rows) {
  if (!rows.length) return '<p class="empty">暂无数据</p>';
  var head = '<tr>' + headers.map(function(h){ return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
  return '<table>' + head + rows.join('') + '</table>';
}

function switchAgent(v) {
  currentAgent = v;
  var u = new URL(location.href);
  if (v) {
    u.searchParams.set('agent', v);
  } else {
    u.searchParams.delete('agent');
  }
  history.replaceState(null, '', u);
  load();
}

function load() {
  var apiPath = '/plugins/enhance/api/status';
  if (currentAgent) {
    apiPath += '?agent=' + encodeURIComponent(currentAgent);
  }

  fetch(apiPath)
    .then(function(resp) { return resp.json(); })
    .then(function(d) {
      // Agent 选择器
      var sel = document.getElementById('agentSelect');
      var opts = '<option value="">全部 (聚合)</option>';
      d.agents.forEach(function(a) {
        opts += '<option value="' + esc(a) + '"' + (a === currentAgent ? ' selected' : '') + '>' + esc(a) + '</option>';
      });
      sel.innerHTML = opts;
      document.getElementById('currentAgent').textContent = currentAgent ? '当前: ' + currentAgent : '全部 Agent 聚合视图';

      // 统计卡片
      document.getElementById('stats').innerHTML = [
        card('Agent 数', d.agents.length, '个'),
        card('记忆总数', d.memory.total, '条'),
        card('用户记忆', d.memory.user || 0, '条'),
        card('项目记忆', d.memory.project || 0, '条'),
        card('安全事件', d.safety.total, '次'),
        card('已拦截', d.safety.blocked, '次'),
        card('工作流', d.workflows.length, '个'),
      ].join('');

      // 最近记忆表
      var memRows = d.recentMemories.map(function(e) {
        return '<tr><td>#' + e.id + '</td><td><span class="agent-tag">' + esc(e.agent_id) + '</span></td><td>' + esc(e.category) + '</td><td>' + esc(e.content).slice(0, 50) + '</td><td>' + esc(e.created_at) + '</td></tr>';
      });
      document.getElementById('memories').innerHTML = buildTable(['ID','Agent','类型','内容','时间'], memRows);

      // 安全事件表
      var sfRows = d.recentSafety.map(function(e) {
        return '<tr><td><span class="badge badge-' + esc(e.action) + '">' + esc(e.action) + '</span></td><td><span class="agent-tag">' + esc(e.agent_id) + '</span></td><td>' + esc(e.tool) + '</td><td>' + esc(e.params || '').slice(0, 35) + '</td><td>' + esc(e.created_at) + '</td></tr>';
      });
      document.getElementById('safety').innerHTML = buildTable(['动作','Agent','工具','参数','时间'], sfRows);

      // 工作流表
      var wfRows = d.workflows.map(function(e) {
        return '<tr><td>' + esc(e.name) + '</td><td><span class="agent-tag">' + esc(e.agent_id || 'main') + '</span></td><td>' + esc(e.trigger) + '</td><td>' + (e.enabled ? '✅' : '⏸') + '</td></tr>';
      });
      document.getElementById('workflows').innerHTML = buildTable(['名称','Agent','触发词','状态'], wfRows);
    });
}

var params = new URLSearchParams(location.search);
currentAgent = params.get('agent') || '';
load();
</script>
</body>
</html>`;

export function registerDashboard(api: OpenClawPluginApi, _config?: DashboardConfig) {
  const openclawDir = resolveOpenClawHome(api);

  api.registerHttpRoute({
    path: "/plugins/enhance",
    match: "prefix",
    auth: "plugin",
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      const url = parseUrl(req);
      const pathname = url.pathname;

      if (pathname === "/plugins/enhance/api/status") {
        const db = getDb(openclawDir);
        const agentFilter = url.searchParams.get("agent") || undefined;

        const agents = getAllAgentIds(db);
        const memoryStats = getMemoryStats(db, agentFilter);
        const safetyStats = getSafetyStats(db, agentFilter);

        const recentMemories = agentFilter
          ? getRecentMemories(db, agentFilter, 15)
          : (() => {
              const all: any[] = [];
              for (const aid of agents) {
                all.push(...getRecentMemories(db, aid, 5));
              }
              return all.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
            })();

        const recentSafety = getRecentSafetyEvents(db, agentFilter, 15);

        const allWorkflows = loadAllWorkflows(openclawDir);
        const workflows = agentFilter
          ? allWorkflows.filter((w) => w.agent_id === agentFilter)
          : allWorkflows;

        sendJson(res, { agents, memory: memoryStats, safety: safetyStats, recentMemories, recentSafety, workflows });
        return true;
      }

      // 默认: 仪表盘 HTML
      sendHtml(res, DASHBOARD_HTML);
      return true;
    },
  });

  api.logger.info("[enhance] 仪表盘模块已加载（多 Agent 视图），访问 /plugins/enhance/");
}
