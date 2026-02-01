"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import { API_BASE } from "@/lib/config";

interface AgentConfig {
  enabled: boolean;
  mode: "advisory" | "paper" | "live";
  risk_profile: string;
  max_trade_pct: number;
  max_position_pct: number;
  daily_loss_limit_pct: number;
  confirm_above_usd: number;
  symbol_whitelist: string[];
  check_interval_min: number;
}

interface Trade {
  id: number;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  mode: string;
  reasoning: string;
  created_at: string | null;
  executed_at: string | null;
}

const RISK_PROFILES = [
  { id: "conservative", label: "Conservative", icon: "🛡️", desc: "5% max trade · 2% loss limit · confirm >$100" },
  { id: "moderate", label: "Moderate", icon: "⚖️", desc: "10% max trade · 5% loss limit · confirm >$500" },
  { id: "aggressive", label: "Aggressive", icon: "🚀", desc: "20% max trade · 10% loss limit · confirm >$2000" },
];

export default function AgentPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pending, setPending] = useState<Trade[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whitelistInput, setWhitelistInput] = useState("");

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setWhitelistInput(data.symbol_whitelist?.join(", ") || "");
      }
    } catch { /* silent */ }
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const [allRes, pendRes] = await Promise.all([
        fetch(`${API_BASE}/agent/trades?limit=20`),
        fetch(`${API_BASE}/agent/trades?status=pending`),
      ]);
      if (allRes.ok) setTrades((await allRes.json()).trades || []);
      if (pendRes.ok) setPending((await pendRes.json()).trades || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchConfig(), fetchTrades()]);
      setLoading(false);
    };
    init();
  }, [fetchConfig, fetchTrades]);

  // ---------------------------------------------------------------------------
  // Config updates
  // ---------------------------------------------------------------------------
  const updateConfig = async (patch: Partial<AgentConfig>) => {
    try {
      const res = await fetch(`${API_BASE}/agent/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch { /* silent */ }
  };

  const handleModeChange = (mode: string) => updateConfig({ mode } as any);
  const handleRiskProfile = (profile: string) => updateConfig({ risk_profile: profile } as any);
  const handleToggle = () => updateConfig({ enabled: !config?.enabled } as any);

  const saveAdvanced = () => {
    const whitelist = whitelistInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    updateConfig({
      max_trade_pct: config!.max_trade_pct,
      max_position_pct: config!.max_position_pct,
      daily_loss_limit_pct: config!.daily_loss_limit_pct,
      confirm_above_usd: config!.confirm_above_usd,
      symbol_whitelist: whitelist,
      check_interval_min: config!.check_interval_min,
    } as any);
  };

  // ---------------------------------------------------------------------------
  // Agent run
  // ---------------------------------------------------------------------------
  const runAgent = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`${API_BASE}/agent/run`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRunResult(data);
        await fetchTrades(); // refresh trade log
      }
    } catch { /* silent */ }
    setRunning(false);
  };

  // ---------------------------------------------------------------------------
  // Trade actions
  // ---------------------------------------------------------------------------
  const confirmTrade = async (id: number) => {
    try {
      await fetch(`${API_BASE}/agent/confirm/${id}`, { method: "POST" });
      await fetchTrades();
    } catch { /* silent */ }
  };

  const cancelTrade = async (id: number) => {
    try {
      await fetch(`${API_BASE}/agent/cancel/${id}`, { method: "POST" });
      await fetchTrades();
    } catch { /* silent */ }
  };

  // ---------------------------------------------------------------------------
  // Status badge styles
  // ---------------------------------------------------------------------------
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      executed: "bg-[#166534]/40 text-[#22c55e]",
      pending: "bg-[#854d0e]/40 text-[#eab308]",
      advisory: "bg-[#1e1b4b]/60 text-[#a5b4fc]",
      cancelled: "bg-[#1e293b]/60 text-[#64748b]",
      failed: "bg-[#7f1d1d]/40 text-[#ef4444]",
      ready: "bg-[#1d4ed8]/40 text-[#60a5fa]",
    };
    return map[status] || "bg-[#1e293b]/60 text-[#94a3b8]";
  };

  if (loading || !config) {
    return (
      <div className="flex min-h-screen bg-[#0f1117]">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1a1d2e] rounded w-48"></div>
            <div className="h-40 bg-[#1a1d2e] rounded-xl"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🤖</span>
              <h1 className="text-[#eef2ff] text-2xl font-bold">Trading Agent</h1>
            </div>
            <p className="text-[#64748b] text-sm ml-11">Automated market analysis and trade execution.</p>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center gap-3">
            <span className="text-[#64748b] text-xs">{config.enabled ? "Enabled" : "Disabled"}</span>
            <button
              onClick={handleToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? "bg-[#6366f1]" : "bg-[#353b55]"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0.5"}`}></div>
            </button>
          </div>
        </div>

        {/* Live mode warning */}
        {config.mode === "live" && (
          <div className="bg-[#7f1d1d]/30 border border-[#ef4444]/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-[#ef4444] text-sm font-semibold">⚠️ Live Trading Active</p>
            <p className="text-[#ef4444] text-xs mt-0.5">Real money will be used. Trades execute on your connected Alpaca account.</p>
          </div>
        )}

        {/* Mode selector */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 mb-6">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider mb-3">Mode</p>
          <div className="grid grid-cols-3 gap-3">
            {(["advisory", "paper", "live"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`py-3 px-4 rounded-lg text-sm font-medium text-left transition-all
                  ${config.mode === mode
                    ? "bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/40"
                    : "bg-[#252a3a] text-[#94a3b8] border border-[#2a2f44] hover:border-[#353b55]"
                  }`}
              >
                <p className="font-semibold capitalize">{mode === "advisory" ? "📋 Advisory" : mode === "paper" ? "📄 Paper" : "💵 Live"}</p>
                <p className="text-xs mt-0.5 opacity-70">
                  {mode === "advisory" ? "Recommendations only" : mode === "paper" ? "Simulated trades" : "Real execution"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Risk profiles */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 mb-6">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider mb-3">Risk Profile</p>
          <div className="grid grid-cols-3 gap-3">
            {RISK_PROFILES.map((rp) => (
              <button
                key={rp.id}
                onClick={() => handleRiskProfile(rp.id)}
                className={`py-3 px-4 rounded-lg text-left transition-all
                  ${config.risk_profile === rp.id
                    ? "bg-[#6366f1]/15 border border-[#6366f1]/40"
                    : "bg-[#252a3a] border border-[#2a2f44] hover:border-[#353b55]"
                  }`}
              >
                <p className={`text-sm font-semibold ${config.risk_profile === rp.id ? "text-[#6366f1]" : "text-[#eef2ff]"}`}>
                  {rp.icon} {rp.label}
                </p>
                <p className="text-[#64748b] text-xs mt-1">{rp.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced settings */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl mb-6 overflow-hidden">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1f2340] transition-colors"
          >
            <p className="text-[#eef2ff] text-sm font-medium">Advanced Settings</p>
            <span className="text-[#64748b] text-sm">{advancedOpen ? "▲" : "▼"}</span>
          </button>
          {advancedOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-[#2a2f44] pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Max Trade Size (%)</label>
                  <input
                    type="number" value={config.max_trade_pct} step="1" min="1" max="50"
                    onChange={(e) => setConfig({ ...config, max_trade_pct: +e.target.value })}
                    className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Max Position Size (%)</label>
                  <input
                    type="number" value={config.max_position_pct} step="1" min="1" max="100"
                    onChange={(e) => setConfig({ ...config, max_position_pct: +e.target.value })}
                    className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Daily Loss Limit (%)</label>
                  <input
                    type="number" value={config.daily_loss_limit_pct} step="0.5" min="0.5" max="50"
                    onChange={(e) => setConfig({ ...config, daily_loss_limit_pct: +e.target.value })}
                    className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Confirm Trades Above ($)</label>
                  <input
                    type="number" value={config.confirm_above_usd} step="50" min="0"
                    onChange={(e) => setConfig({ ...config, confirm_above_usd: +e.target.value })}
                    className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Symbol Whitelist</label>
                <input
                  type="text" value={whitelistInput} placeholder="AAPL, GOOGL, NVDA (leave empty for all watchlist)"
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                />
              </div>
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Check Interval (minutes)</label>
                <input
                  type="number" value={config.check_interval_min} step="5" min="5" max="1440"
                  onChange={(e) => setConfig({ ...config, check_interval_min: +e.target.value })}
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm focus:outline-none focus:border-[#6366f1]"
                />
              </div>
              <button
                onClick={saveAdvanced}
                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          )}
        </div>

        {/* Run agent */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={runAgent}
            disabled={running}
            className="bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg
              transition-colors shadow-md shadow-[#6366f1]/20 flex items-center gap-2"
          >
            {running ? "Running…" : "▶ Run Agent Now"}
          </button>
          {runResult && (
            <div className="flex-1 bg-[#1a1d2e] border border-[#2a2f44] rounded-lg px-4 py-2">
              <p className="text-[#94a3b8] text-xs">
                {runResult.status === "completed"
                  ? `✓ Analyzed ${runResult.symbols_analyzed} symbols · ${runResult.decisions} decisions · ${runResult.executed} executed`
                  : runResult.status === "disabled"
                  ? "Agent is disabled — enable it above"
                  : runResult.status === "no_symbols"
                  ? "No symbols to analyze — add to watchlist first"
                  : runResult.status === "killed"
                  ? `🛑 ${runResult.message}`
                  : `Status: ${runResult.status}`}
              </p>
            </div>
          )}
        </div>

        {/* Pending confirmations */}
        {pending.length > 0 && (
          <div className="bg-[#1a1d2e] border border-[#854d0e]/40 rounded-xl p-5 mb-6">
            <p className="text-[#eab308] text-sm font-semibold mb-3">⏳ Pending Confirmations ({pending.length})</p>
            <div className="space-y-3">
              {pending.map((t) => (
                <div key={t.id} className="flex items-center gap-4 bg-[#252a3a] rounded-lg px-4 py-3">
                  <span className="text-[#eef2ff] font-bold text-sm">{t.symbol}</span>
                  <span className={`text-xs font-semibold uppercase ${t.action === "buy" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{t.action}</span>
                  <span className="text-[#94a3b8] text-xs">{t.quantity} shares @ ${t.price.toFixed(2)}</span>
                  <span className="text-[#eef2ff] text-xs font-semibold">= ${t.total.toFixed(2)}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => confirmTrade(t.id)} className="bg-[#166534]/40 hover:bg-[#166534]/60 text-[#22c55e] text-xs font-semibold px-3 py-1 rounded-lg transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => cancelTrade(t.id)} className="bg-[#7f1d1d]/40 hover:bg-[#7f1d1d]/60 text-[#ef4444] text-xs font-semibold px-3 py-1 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade log */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f44]">
            <p className="text-[#eef2ff] text-sm font-semibold">Trade Log</p>
            <span className="text-[#64748b] text-xs">{trades.length} recent</span>
          </div>

          {trades.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#64748b] text-sm">No trades yet</p>
              <p className="text-[#64748b] text-xs mt-1">Enable the agent and run it to start generating trade decisions</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-[#161822] text-[#64748b] text-xs font-medium uppercase tracking-wider">
                <div className="col-span-2">Symbol</div>
                <div className="col-span-1">Action</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Time</div>
              </div>
              {trades.map((t) => (
                <div key={t.id} className="grid grid-cols-12 gap-2 px-5 py-2.5 border-t border-[#2a2f44] items-center hover:bg-[#1f2340] transition-colors">
                  <div className="col-span-2 text-[#eef2ff] text-sm font-medium">{t.symbol}</div>
                  <div className={`col-span-1 text-xs font-semibold uppercase ${t.action === "buy" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{t.action}</div>
                  <div className="col-span-1 text-[#94a3b8] text-sm text-right">{t.quantity}</div>
                  <div className="col-span-2 text-[#94a3b8] text-sm text-right">${t.price.toFixed(2)}</div>
                  <div className="col-span-2 text-[#eef2ff] text-sm text-right font-medium">${t.total.toFixed(2)}</div>
                  <div className="col-span-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${statusBadge(t.status)}`}>{t.status}</span>
                  </div>
                  <div className="col-span-2 text-[#64748b] text-xs text-right">
                    {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Status footer */}
        <div className="mt-6 p-4 bg-[#1a1d2e]/50 border border-[#2a2f44] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.enabled ? "bg-[#22c55e]" : "bg-[#64748b]"}`}></div>
              <span className="text-[#94a3b8] text-xs">{config.enabled ? "Agent enabled" : "Agent disabled"}</span>
            </div>
            <span className="text-[#2a2f44]">|</span>
            <span className="text-[#64748b] text-xs capitalize">Mode: {config.mode}</span>
            <span className="text-[#2a2f44]">|</span>
            <span className="text-[#64748b] text-xs">Runs every {config.check_interval_min} min</span>
          </div>
        </div>
      </main>
    </div>
  );
}
