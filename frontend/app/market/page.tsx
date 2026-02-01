"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { API_BASE } from "@/lib/config";

interface Quote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
}

interface Index {
  name: string;
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}

interface Candle {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

export default function MarketPage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [indices, setIndices] = useState<Index[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [chartPeriod, setChartPeriod] = useState("3m");
  const [chartLoading, setChartLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/market/watchlist`);
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist.map((item: any) => item.symbol));
      }
    } catch {
      setError("Failed to load watchlist");
    }
  }, []);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return;
    try {
      const res = await fetch(`${API_BASE}/market/quotes?symbols=${symbols.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch { /* silent */ }
  }, []);

  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/market/indices`);
      if (res.ok) {
        const data = await res.json();
        setIndices(data.indices);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchWatchlist(), fetchIndices()]);
      setLoading(false);
    };
    init();
  }, [fetchWatchlist, fetchIndices]);

  // Refresh quotes when watchlist changes
  useEffect(() => {
    if (watchlist.length) fetchQuotes(watchlist);
  }, [watchlist, fetchQuotes]);

  // Auto-refresh quotes every 30s
  useEffect(() => {
    if (!watchlist.length) return;
    const interval = setInterval(() => fetchQuotes(watchlist), 30000);
    return () => clearInterval(interval);
  }, [watchlist, fetchQuotes]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setSearchOpen(true);
        }
      } catch { /* silent */ }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Chart
  const openChart = async (symbol: string, period = "3m") => {
    setChartSymbol(symbol);
    setChartPeriod(period);
    setChartLoading(true);
    try {
      const res = await fetch(`${API_BASE}/market/history/${symbol}?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.candles);
      }
    } catch { /* silent */ }
    setChartLoading(false);
  };

  const changeChartPeriod = (period: string) => {
    if (chartSymbol) openChart(chartSymbol, period);
  };

  // Watchlist actions
  const addToWatchlist = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/market/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        setWatchlist((prev) => [...prev, symbol]);
        setSearchQuery("");
        setSearchResults([]);
        setSearchOpen(false);
      }
    } catch { /* silent */ }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/market/watchlist/${symbol}`, { method: "DELETE" });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((s) => s !== symbol));
        setQuotes((prev) => { const next = { ...prev }; delete next[symbol]; return next; });
      }
    } catch { /* silent */ }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const fmtPrice = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const colorCls = (n: number) => (n >= 0 ? "text-[#22c55e]" : "text-[#ef4444]");
  const bgCls = (n: number) => (n >= 0 ? "bg-[#166534]/40 text-[#22c55e]" : "bg-[#7f1d1d]/40 text-[#ef4444]");

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🌍</span>
            <h1 className="text-[#eef2ff] text-2xl font-bold">Market</h1>
          </div>
          <p className="text-[#64748b] text-sm ml-11">Live quotes, watchlist, and price charts.</p>
        </div>

        {error && (
          <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length && setSearchOpen(true)}
            placeholder="Search stocks… e.g. AAPL, Tesla, NVDA"
            className="w-full bg-[#1a1d2e] border border-[#2a2f44] rounded-xl px-4 py-3 text-[#eef2ff] text-sm
              focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d2e] border border-[#2a2f44] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => addToWatchlist(r.symbol)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#252a3a] transition-colors text-left"
                >
                  <span className="text-[#6366f1] font-bold text-sm w-16 shrink-0">{r.symbol}</span>
                  <span className="text-[#94a3b8] text-sm truncate">{r.name}</span>
                  <span className="ml-auto text-[#6366f1] text-xs">+ Add</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Indices */}
        {indices.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {indices.map((idx) => (
              <div key={idx.symbol} className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
                <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">{idx.name}</p>
                <p className="text-[#eef2ff] text-xl font-bold mt-1">{fmtPrice(idx.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold ${colorCls(idx.change_pct)}`}>
                    {idx.change_pct >= 0 ? "+" : ""}{idx.change_pct.toFixed(2)}%
                  </span>
                  <span className={`text-xs ${colorCls(idx.change)}`}>
                    {idx.change >= 0 ? "+" : ""}{fmtPrice(idx.change)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Watchlist */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#eef2ff] text-base font-semibold">Watchlist</h2>
          <span className="text-[#64748b] text-xs">{watchlist.length} symbols · auto-refreshes every 30s</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 animate-pulse">
                <div className="h-3 bg-[#252a3a] rounded w-16 mb-3"></div>
                <div className="h-6 bg-[#252a3a] rounded w-28"></div>
              </div>
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-10 text-center">
            <p className="text-[#64748b] text-sm">Your watchlist is empty</p>
            <p className="text-[#64748b] text-xs mt-1">Search for a stock above to add it</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {watchlist.map((symbol) => {
              const q = quotes[symbol];
              return (
                <div
                  key={symbol}
                  className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 hover:border-[#6366f1]/40 transition-colors group relative cursor-pointer"
                  onClick={() => q && openChart(symbol)}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(symbol); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#64748b] hover:text-[#ef4444] text-sm"
                  >
                    ✕
                  </button>

                  {q ? (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[#eef2ff] text-base font-bold">{symbol}</p>
                          {q.name && <p className="text-[#64748b] text-xs mt-0.5">{q.name}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${bgCls(q.change_pct)}`}>
                          {q.change_pct >= 0 ? "+" : ""}{q.change_pct.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-[#eef2ff] text-2xl font-bold mt-3">${fmtPrice(q.price)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs ${colorCls(q.change)}`}>
                          {q.change >= 0 ? "+" : ""}{fmtPrice(q.change)}
                        </span>
                        <span className="text-[#64748b] text-xs">
                          Vol: {(q.volume / 1e6).toFixed(1)}M
                        </span>
                      </div>
                      <p className="text-[#6366f1] text-xs mt-3 opacity-70">Click for chart →</p>
                    </>
                  ) : (
                    <div className="animate-pulse">
                      <div className="h-4 bg-[#252a3a] rounded w-16 mb-2"></div>
                      <div className="h-7 bg-[#252a3a] rounded w-24"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Chart Modal */}
        {chartSymbol && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setChartSymbol(null)}></div>
            <div className="relative bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl shadow-black/40">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[#eef2ff] text-lg font-bold">{chartSymbol}</h2>
                  {quotes[chartSymbol] && (
                    <p className="text-[#eef2ff] text-sm font-semibold">
                      ${fmtPrice(quotes[chartSymbol].price)}
                      <span className={`ml-2 text-xs ${colorCls(quotes[chartSymbol].change_pct)}`}>
                        {quotes[chartSymbol].change_pct >= 0 ? "+" : ""}{quotes[chartSymbol].change_pct.toFixed(2)}%
                      </span>
                    </p>
                  )}
                </div>
                <button onClick={() => setChartSymbol(null)} className="text-[#64748b] hover:text-[#eef2ff] transition-colors">✕</button>
              </div>

              {/* Period selector */}
              <div className="flex gap-2 mb-4">
                {["1w", "1m", "3m", "6m", "1y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => changeChartPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors
                      ${chartPeriod === p ? "bg-[#6366f1] text-white" : "bg-[#252a3a] text-[#94a3b8] hover:text-[#eef2ff]"}`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {chartLoading ? (
                <div className="h-48 bg-[#252a3a] rounded-lg animate-pulse"></div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f44" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                      interval="preserveStartEnd"
                      stroke="#2a2f44"
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      stroke="#2a2f44"
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2f44", borderRadius: "8px", color: "#eef2ff", fontSize: "12px" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Close"]}
                    />
                    <Area type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} fill="url(#colorClose)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-[#64748b] text-sm">No chart data available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
