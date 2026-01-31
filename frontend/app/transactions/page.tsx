"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import TransactionList from "@/components/transaction-list";
import AddTransactionModal from "@/components/add-transaction-modal";

const API_BASE = "http://localhost:8000/api";

const CATEGORIES = ["All", "Food", "Transport", "Housing", "Entertainment", "Shopping", "Healthcare", "Utilities", "Investment", "Income", "Other"];
const TYPES = ["All", "income", "expense"];

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "All") params.set("category", filterCategory);
      if (filterType !== "All") params.set("type", filterType);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAdd = async (transaction: any) => {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to add transaction");
    }
    await fetchTransactions();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      setError("Failed to delete transaction");
    }
  };

  // Running balance
  const runningBalance = transactions.reduce((balance, txn) => {
    return txn.type === "income" ? balance + txn.amount : balance - txn.amount;
  }, 0);

  // Totals for filtered view
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />

      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[#eef2ff] text-2xl font-bold">Transactions</h1>
            <p className="text-[#64748b] text-sm mt-1">Manage and track all your transactions</p>
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
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        )}

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
            <p className="text-[#64748b] text-xs font-medium">Running Balance</p>
            <p className={`text-lg font-bold mt-0.5 ${runningBalance >= 0 ? "text-[#eef2ff]" : "text-[#ef4444]"}`}>
              ${runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
            <p className="text-[#64748b] text-xs font-medium">Total Income</p>
            <p className="text-lg font-bold mt-0.5 text-[#22c55e]">
              +${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
            <p className="text-[#64748b] text-xs font-medium">Total Expenses</p>
            <p className="text-lg font-bold mt-0.5 text-[#ef4444]">
              −${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Category Filter */}
            <div className="flex-1 min-w-[120px]">
              <label className="text-[#64748b] text-xs font-medium">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full mt-1 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#252a3a]">{cat}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex-1 min-w-[120px]">
              <label className="text-[#64748b] text-xs font-medium">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full mt-1 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer"
              >
                {TYPES.map((type) => (
                  <option key={type} value={type} className="bg-[#252a3a]">{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-[#64748b] text-xs font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer
                  [&::-webkit-calendar-picker-indicator]{ filter: invert(1); cursor: pointer; }"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[#64748b] text-xs font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer
                  [&::-webkit-calendar-picker-indicator]{ filter: invert(1); cursor: pointer; }"
              />
            </div>

            {/* Reset */}
            <button
              onClick={() => { setFilterCategory("All"); setFilterType("All"); setStartDate(""); setEndDate(""); }}
              className="text-[#94a3b8] hover:text-[#eef2ff] text-sm py-2 px-3 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#eef2ff] text-base font-semibold">
              All Transactions
              <span className="text-[#64748b] text-sm font-normal ml-2">({transactions.length})</span>
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse bg-[#252a3a] rounded-xl h-14"></div>
              ))}
            </div>
          ) : (
            <TransactionList transactions={transactions} onDelete={handleDelete} showDelete />
          )}
        </div>
      </main>

      <AddTransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
}
