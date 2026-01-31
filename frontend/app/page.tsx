"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { SummaryCard, CategoryBreakdown } from "@/components/dashboard-cards";
import TransactionList from "@/components/transaction-list";
import AddTransactionModal from "@/components/add-transaction-modal";

const API_BASE = "http://localhost:8000/api";

interface DashboardData {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  category_breakdown: Record<string, { amount: number; percentage: number }>;
  recent_transactions: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAddTransaction = async (transaction: any) => {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to add transaction");
    }
    await fetchDashboard();
  };

  const savingsRate = data && data.monthly_income > 0
    ? (((data.monthly_income - data.monthly_expenses) / data.monthly_income) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />

      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[#eef2ff] text-2xl font-bold">Dashboard</h1>
            <p className="text-[#64748b] text-sm mt-1">
              Welcome back! Here's your financial overview.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold px-5 py-2.5 rounded-xl
              transition-all duration-200 shadow-lg shadow-[#6366f1]/20 flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Add Transaction
          </button>
        </div>

        {error && (
          <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-[#ef4444] text-sm">{error} — Make sure the backend is running on port 8000.</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Balance"
            amount={data?.total_balance ?? 0}
            icon="💰"
            color="bg-[#6366f1]/15"
            subtitle="All time"
          />
          <SummaryCard
            title="Monthly Income"
            amount={data?.monthly_income ?? 0}
            icon="📥"
            color="bg-[#22c55e]/15"
            subtitle="This month"
          />
          <SummaryCard
            title="Monthly Expenses"
            amount={data?.monthly_expenses ?? 0}
            icon="📤"
            color="bg-[#ef4444]/15"
            subtitle="This month"
          />
          <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2f44] hover:border-[#353b55] transition-all duration-300 hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Savings Rate</p>
                <p className="text-[#64748b] text-xs mt-0.5">This month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center text-lg">🎯</div>
            </div>
            <p className={`text-2xl font-bold ${savingsRate >= 0 ? "text-[#eef2ff]" : "text-[#ef4444]"}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <div className="mt-2 w-full bg-[#252a3a] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${savingsRate >= 20 ? "bg-[#22c55e]" : savingsRate >= 0 ? "bg-[#f59e0b]" : "bg-[#ef4444]"}`}
                style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Category Breakdown + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Category Breakdown */}
          <div className="lg:col-span-2 bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#eef2ff] text-base font-semibold">Expense Breakdown</h2>
              <span className="text-[#64748b] text-xs">This month</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1">
                      <div className="h-3 bg-[#252a3a] rounded w-20"></div>
                      <div className="h-3 bg-[#252a3a] rounded w-16"></div>
                    </div>
                    <div className="h-1.5 bg-[#252a3a] rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <CategoryBreakdown categories={data?.category_breakdown ?? {}} />
            )}
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-3 bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#eef2ff] text-base font-semibold">Recent Transactions</h2>
              <a href="/transactions" className="text-[#6366f1] text-xs hover:text-[#4f46e5] transition-colors font-medium">
                View all →
              </a>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-[#252a3a] rounded-xl h-14"></div>
                ))}
              </div>
            ) : (
              <TransactionList transactions={data?.recent_transactions ?? []} compact />
            )}
          </div>
        </div>
      </main>

      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddTransaction}
      />
    </div>
  );
}
