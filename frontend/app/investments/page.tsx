"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import InvestmentTracker from "@/components/investment-tracker";

import { API_BASE } from "@/lib/config";

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvestments = async () => {
    try {
      const res = await fetch(`${API_BASE}/investments`);
      if (res.ok) {
        const data = await res.json();
        setInvestments(data);
      }
    } catch (err) {
      setError("Failed to load investments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

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
    await fetchInvestments();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/investments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInvestments((prev) => prev.filter((inv: any) => inv.id !== id));
      }
    } catch (err) {
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
            investments={investments}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        )}

        {/* Note */}
        <div className="mt-8 p-4 bg-[#1a1d2e]/50 border border-[#2a2f44] rounded-xl">
          <p className="text-[#64748b] text-xs text-center">
            MVP: Current prices are entered manually. Live price feeds (Yahoo Finance, Alpha Vantage) are planned for v2.
          </p>
        </div>
      </main>
    </div>
  );
}
