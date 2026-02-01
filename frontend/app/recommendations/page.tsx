"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import { API_BASE } from "@/lib/config";

interface Indicator {
  indicator: string;
  value: number | string;
  signal: "bullish" | "bearish" | "neutral";
  detail: string;
}

interface Recommendation {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  composite_score: number;
  indicators: Indicator[];
  reasoning: string;
  price: number;
  analyzed_at: string;
  error?: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");

  const fetchRecs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setGeneratedAt(data.generated_at || "");
        if (data.note) setError(data.note);
      } else {
        setError("Failed to load recommendations");
      }
    } catch {
      setError("Network error — try again");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  // ---------------------------------------------------------------------------
  // Styling helpers
  // ---------------------------------------------------------------------------
  const signalColor = (signal: string) => {
    if (signal === "BUY") return "bg-[#166534]/40 text-[#22c55e] border border-[#22c55e]/30";
    if (signal === "SELL") return "bg-[#7f1d1d]/40 text-[#ef4444] border border-[#ef4444]/30";
    return "bg-[#1e293b]/60 text-[#94a3b8] border border-[#475569]/30";
  };

  const indicatorBadge = (signal: string) => {
    if (signal === "bullish") return "bg-[#166534]/40 text-[#22c55e]";
    if (signal === "bearish") return "bg-[#7f1d1d]/40 text-[#ef4444]";
    return "bg-[#1e293b]/60 text-[#94a3b8]";
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">💡</span>
              <h1 className="text-[#eef2ff] text-2xl font-bold">Signals</h1>
            </div>
            <p className="text-[#64748b] text-sm ml-11">
              Technical analysis-driven buy/sell recommendations for your watchlist.
            </p>
          </div>
          <button
            onClick={fetchRecs}
            className="bg-[#252a3a] hover:bg-[#353b55] border border-[#2a2f44] text-[#94a3b8] text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {generatedAt && (
          <p className="text-[#64748b] text-xs mb-4 ml-11">
            Last analyzed: {new Date(generatedAt).toLocaleString()}
          </p>
        )}

        {error && (
          <div className="bg-[#1e1b4b]/30 border border-[#6366f1]/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-[#a5b4fc] text-sm text-center">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-6 bg-[#252a3a] rounded w-20"></div>
                  <div className="h-5 bg-[#252a3a] rounded w-14"></div>
                  <div className="ml-auto h-4 bg-[#252a3a] rounded w-24"></div>
                </div>
                <div className="h-4 bg-[#252a3a] rounded w-3/4 mt-3"></div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-10 text-center">
            <p className="text-[#64748b] text-sm">No recommendations yet</p>
            <p className="text-[#64748b] text-xs mt-1">Add symbols to your watchlist on the Market page first</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.symbol}
                className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="p-5 cursor-pointer hover:bg-[#1f2340] transition-colors"
                  onClick={() => setExpanded(expanded === rec.symbol ? null : rec.symbol)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[#eef2ff] text-base font-bold">{rec.symbol}</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${signalColor(rec.signal)}`}>
                          {rec.signal}
                        </span>
                        {rec.price > 0 && (
                          <span className="text-[#64748b] text-xs">${rec.price.toFixed(2)}</span>
                        )}
                      </div>
                      <p className="text-[#94a3b8] text-xs mt-1.5 truncate">{rec.reasoning}</p>
                    </div>

                    {/* Confidence bar */}
                    <div className="flex-shrink-0 w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#64748b] text-xs">Confidence</span>
                        <span className="text-[#eef2ff] text-xs font-semibold">{(rec.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#252a3a] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rec.signal === "BUY" ? "bg-[#22c55e]" : rec.signal === "SELL" ? "bg-[#ef4444]" : "bg-[#94a3b8]"
                          }`}
                          style={{ width: `${rec.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <span className="text-[#64748b] text-sm">{expanded === rec.symbol ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === rec.symbol && (
                  <div className="border-t border-[#2a2f44] px-5 py-4">
                    {rec.error ? (
                      <p className="text-[#ef4444] text-xs">{rec.error}</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider mb-3">Indicator Breakdown</p>
                        {rec.indicators.map((ind, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2a2f44] last:border-b-0">
                            <span className="text-[#eef2ff] text-xs font-medium w-36 shrink-0">{ind.indicator}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${indicatorBadge(ind.signal)} shrink-0`}>
                              {ind.signal}
                            </span>
                            <span className="text-[#64748b] text-xs truncate">{ind.detail}</span>
                            <span className="text-[#94a3b8] text-xs font-mono ml-auto shrink-0">{ind.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-[#1a1d2e]/50 border border-[#2a2f44] rounded-xl">
          <p className="text-[#64748b] text-xs text-center">
            Signals are based on technical analysis (SMA, RSI, MACD, Bollinger Bands, Volume). Not financial advice — always do your own research.
          </p>
        </div>
      </main>
    </div>
  );
}
