/**
 * 模块5: 增强仪表盘（多 Agent 隔离版）
 *
 * 支持按 agentId 筛选数据，默认显示全局聚合视图。
 * URL 参数: ?agent=<agentId> 查看特定 Agent 数据
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  getDb,
  getMemoryStats,
  getSafetyStats,
  getRecentMemories,
  getRecentSafetyEvents,
  getAllAgentIds,
} from "../utils/sqlite-store.js";
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
<h1>🦞 龙虾增强包</h1>
<p class="subtitle">OpenClaw Enhancement Kit — Multi-Agent Dashboard</p>

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

<footer>龙虾增强包 v1.1.0 — 多 Agent 隔离</footer>

<script>
let currentAgent='';
function switchAgent(v){currentAgent=v;const u=new URL(location.href);if(v)u.searchParams.set('agent',v);else u.searchParams.delete('agent');history.replaceState(null,'',u);load();}
async function load(){
  try{
    const u='/enhance/api/status'+(currentAgent?'?agent='+encodeURIComponent(currentAgent):'');
    const r=await fetch(u);const d=await r.json();
    // Populate agent selector
    const sel=document.getElementById('agentSelect');
    const prev=sel.value;
    sel.innerHTML='<option value="">全部 (聚合)</option>'+d.agents.map(a=>'<option value="'+esc(a)+'"'+(a===currentAgent?' selected':'')+'>'+esc(a)+'</option>').join('');
    document.getElementById('currentAgent').textContent=currentAgent?'当前: '+currentAgent:'全部 Agent 聚合视图';
    // Stats cards
    const s=document.getElementById('stats');
    s.innerHTML=[
      card('Agent 数',d.agents.length,'个'),
      card('记忆总数',d.memory.total,'条'),
      card('用户记忆',d.memory.user||0,'条'),
      card('项目记忆',d.memory.project||0,'条'),
      card('安全事件',d.safety.total,'次'),
      card('已拦截',d.safety.blocked,'次'),
      card('工作流',d.workflows.length,'个'),
    ].join('');
    // Memories table
    const m=document.getElementById('memories');
    if(d.recentMemories.length===0){m.innerHTML='<p class="empty">暂无记忆</p>';} else {
      m.innerHTML='<table><tr><th>ID</th><th>Agent</th><th>类型</th><th>���容</th><th>时间</th></tr>'+
        d.recentMemories.map(e=>'<tr><td>#'+e.id+'</td><td><span class="agent-tag">'+esc(e.agent_id)+'</span></td><td>'+e.category+'</td><td>'+esc(e.content).slice(0,50)+'</td><td>'+e.created_at+'</td></tr>').join('')+'</table>';
    }
    // Safety table
    const sf=document.getElementById('safety');
    if(d.recentSafety.length===0){sf.innerHTML='<p class="empty">暂无安全事件</p>';} else {
      sf.innerHTML='<table><tr><th>动作</th><th>Agent</th><th>工具</th><th>参数</th><th>时间</th></tr>'+
        d.recentSafety.map(e=>'<tr><td><span class="badge badge-'+e.action+'">'+e.action+'</span></td><td><span class="agent-tag">'+esc(e.agent_id)+'</span></td><td>'+e.tool+'</td><td>'+esc(e.params||'').slice(0,35)+'</td><td>'+e.created_at+'</td></tr>').join('')+'</table>';
    }
    // Workflows
    const w=document.getElementById('workflows');
    if(d.workflows.length===0){w.innerHTML='<p class="empty">暂无工作流</p>';} else {
      w.innerHTML='<table><tr><th>名称</th><th>Agent</th><th>触发词</th><th>状态</th></tr>'+
        d.workflows.map(e=>'<tr><td>'+esc(e.name)+'</td><td><span class="agent-tag">'+esc(e.agent_id||'main')+'</span></td><td>'+esc(e.trigger)+'</td><td>'+(e.enabled?'✅':'⏸️')+'</td></tr>').join('')+'</table>';
    }
  }catch(e){document.body.innerHTML+='<p style="color:red">加载失败: '+e.message+'</p>';}
}
function card(t,v,l){return '<div class="card"><h3>'+t+'</h3><div class="value">'+v+'</div><div class="label">'+l+'</div></div>';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// Init from URL
const p=new URLSearchParams(location.search);currentAgent=p.get('agent')||'';
load();
</script>
</body>
</html>`;

export function registerDashboard(api: OpenClawPluginApi, _config?: DashboardConfig) {
  const openclawDir = api.runtime.paths?.home ?? process.env.HOME + "/.openclaw";

  api.registerHttpRoute({
    path: "/enhance",
    match: "prefix",
    auth: "gateway",
    handler: async (req) => {
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname;

      if (pathname === "/enhance/api/status") {
        const db = getDb(openclawDir);
        const agentFilter = url.searchParams.get("agent") || undefined;

        const agents = getAllAgentIds(db);
        const memoryStats = getMemoryStats(db, agentFilter);
        const safetyStats = getSafetyStats(db, agentFilter);

        // 记忆和安全事件：如果指定了 agent 则按 agent 过滤
        const recentMemories = agentFilter
          ? getRecentMemories(db, agentFilter, 15)
          : (() => {
              // 聚合模式：取各 agent 最近的记忆
              const all: any[] = [];
              for (const aid of agents) {
                all.push(...getRecentMemories(db, aid, 5));
              }
              return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15);
            })();

        const recentSafety = getRecentSafetyEvents(db, agentFilter, 15);

        const allWorkflows = loadAllWorkflows(openclawDir);
        const workflows = agentFilter
          ? allWorkflows.filter((w) => w.agent_id === agentFilter)
          : allWorkflows;

        return new Response(
          JSON.stringify({
            agents,
            memory: memoryStats,
            safety: safetyStats,
            recentMemories,
            recentSafety,
            workflows,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(DASHBOARD_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });

  api.logger.info("[enhance] 仪表盘模块已加载（多 Agent 视图），访问 /enhance/");
}
