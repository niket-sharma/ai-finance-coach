"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import InvestmentTracker from "@/components/investment-tracker";
import { API_BASE } from "@/lib/config";

function extractTicker(name: string): string {
  // "Apple (AAPL)" → "AAPL"
  const match = name.match(/\(([A-Za-z0-9._-]{1,10})\)/);
  if (match) return match[1].toUpperCase();
  // If it already looks like a ticker (1–5 uppercase letters), use it directly
  if (/^[A-Z]{1,5}$/.test(name.trim())) return name.trim();
  return name.trim().toUpperCase();
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvestments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/investments`);
      if (res.ok) {
        const data = await res.json();
        setInvestments(data);
        return data;
      }
    } catch {
      setError("Failed to load investments");
    }
    return [];
  }, []);

  const fetchLivePrices = useCallback(async (invs: any[]) => {
    if (!invs.length) return;
    const symbols = [...new Set(invs.map((inv: any) => extractTicker(inv.asset_name)))].join(",");
    try {
      const res = await fetch(`${API_BASE}/market/quotes?symbols=${symbols}`);
      if (res.ok) {
        const data = await res.json();
        const priceMap: Record<string, number> = {};
        for (const [sym, quote] of Object.entries(data)) {
          priceMap[sym] = (quote as any).price;
        }
        setLivePrices(priceMap);
      }
    } catch { /* silent — fall back to manual prices */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      const invs = await fetchInvestments();
      await fetchLivePrices(invs);
      setLoading(false);
    };
    init();
  }, [fetchInvestments, fetchLivePrices]);

  // Merge live prices into investments
  const enrichedInvestments = investments.map((inv: any) => {
    const ticker = extractTicker(inv.asset_name);
    const livePrice = livePrices[ticker];
    return {
      ...inv,
      current_price: livePrice != null ? livePrice : inv.current_price,
      live: livePrice != null,
    };
  });

  const handleAdd = async (investment: any) => {
    const res = await fetch(`${API_BASE}/investments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(investment),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to add investment");
    }
    const invs = await fetchInvestments();
    await fetchLivePrices(invs);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvestments((prev) => prev.filter((inv: any) => inv.id !== id));
      }
    } catch {
      setError("Failed to delete investment");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-[#eef2ff] text-2xl font-bold">Investments</h1>
          </div>
          <p className="text-[#64748b] text-sm ml-11">
            Track your portfolio across stocks, crypto, mutual funds, and ETFs.
            {Object.keys(livePrices).length > 0 && (
              <span className="text-[#22c55e] ml-2">● {Object.keys(livePrices).length} live prices</span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-[#252a3a] rounded w-24 mb-2"></div>
                  <div className="h-5 bg-[#252a3a] rounded w-32"></div>
                </div>
              ))}
            </div>
            <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-[#252a3a] rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-[#252a3a] rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <InvestmentTracker
            investments={enrichedInvestments}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  );
}
