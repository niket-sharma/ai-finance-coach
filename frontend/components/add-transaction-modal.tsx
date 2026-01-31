"use client";

import { useState } from "react";

const CATEGORIES = [
  "Food", "Transport", "Housing", "Entertainment", "Shopping",
  "Healthcare", "Utilities", "Investment", "Income", "Other",
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: any) => Promise<void>;
}

export default function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
  const [form, setForm] = useState({
    amount: "",
    category: "Food",
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "expense",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onAdd({ ...form, amount: parseFloat(form.amount) });
      setForm({
        amount: "",
        category: "Food",
        date: new Date().toISOString().split("T")[0],
        description: "",
        type: "expense",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#eef2ff] text-lg font-semibold">Add Transaction</h2>
            <p className="text-[#64748b] text-xs mt-0.5">Log an income or expense</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#eef2ff] transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-lg px-3 py-2 mb-4">
            <p className="text-[#ef4444] text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Type</label>
            <div className="flex gap-2 mt-1.5">
              {["expense", "income"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    ${form.type === type
                      ? type === "expense"
                        ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                        : "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                      : "bg-[#252a3a] text-[#94a3b8] border border-[#2a2f44] hover:border-[#353b55]"
                    }
                  `}
                >
                  {type === "expense" ? "−" : "+"} {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Amount</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm">$</span>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-[#252a3a] border border-[#2a2f44] rounded-lg pl-7 pr-3 py-2.5 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#252a3a]">{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors cursor-pointer
                [&::-webkit-calendar-picker-indicator]{ filter: invert(1); cursor: pointer; }"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g., Grocery shopping"
              className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold py-2.5 rounded-lg
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6366f1]/20"
          >
            {loading ? "Adding..." : "Add Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
