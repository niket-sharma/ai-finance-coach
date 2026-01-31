"use client";

import { useState } from "react";

interface Investment {
  id: number;
  asset_name: string;
  type: string;
  quantity: number;
  buy_price: number;
  current_price: number;
  total_invested: number;
  current_value: number;
  gain_loss: number;
  gain_percent: number;
}

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock", icon: "📊" },
  { value: "crypto", label: "Crypto", icon: "₿" },
  { value: "mutual_fund", label: "Mutual Fund", icon: "📑" },
  { value: "etf", label: "ETF", icon: "📦" },
];

interface InvestmentTrackerProps {
  investments: Investment[];
  onAdd: (investment: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function InvestmentTracker({ investments, onAdd, onDelete }: InvestmentTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    asset_name: "",
    type: "stock",
    quantity: "",
    buy_price: "",
    current_price: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Portfolio summary
  const totalInvested = investments.reduce((sum, inv) => sum + inv.total_invested, 0);
  const currentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalGainLoss = currentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_name || !form.quantity || !form.buy_price || !form.current_price) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onAdd({
        asset_name: form.asset_name,
        type: form.type,
        quantity: parseFloat(form.quantity),
        buy_price: parseFloat(form.buy_price),
        current_price: parseFloat(form.current_price),
      });
      setForm({ asset_name: "", type: "stock", quantity: "", buy_price: "", current_price: "" });
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to add investment");
    } finally {
      setLoading(false);
    }
  };

  const typeIcon = (type: string) => INVESTMENT_TYPES.find((t) => t.value === type)?.icon || "📊";
  const typeLabel = (type: string) => INVESTMENT_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Total Invested</p>
          <p className="text-[#eef2ff] text-xl font-bold mt-1">${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Current Value</p>
          <p className="text-[#eef2ff] text-xl font-bold mt-1">${currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Total Gain/Loss</p>
          <p className={`text-xl font-bold mt-1 ${totalGainLoss >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {totalGainLoss >= 0 ? "+" : ""}${totalGainLoss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-4">
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Gain %</p>
          <p className={`text-xl font-bold mt-1 ${totalGainPercent >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {totalGainPercent >= 0 ? "+" : ""}{totalGainPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold px-4 py-2 rounded-lg
            transition-all duration-200 shadow-md shadow-[#6366f1]/20 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add Investment
        </button>
      </div>

      {/* Holdings List */}
      {investments.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-10 text-center">
          <p className="text-[#64748b] text-sm">No investments yet</p>
          <p className="text-[#64748b] text-xs mt-1">Add your first holding to start tracking</p>
        </div>
      ) : (
        <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#2a2f44] bg-[#161822]">
            <div className="col-span-4 text-[#64748b] text-xs font-medium uppercase tracking-wider">Asset</div>
            <div className="col-span-2 text-[#64748b] text-xs font-medium uppercase tracking-wider text-right">Invested</div>
            <div className="col-span-2 text-[#64748b] text-xs font-medium uppercase tracking-wider text-right">Current</div>
            <div className="col-span-2 text-[#64748b] text-xs font-medium uppercase tracking-wider text-right">P&L</div>
            <div className="col-span-1 text-[#64748b] text-xs font-medium uppercase tracking-wider text-right">%</div>
            <div className="col-span-1"></div>
          </div>

          {/* Rows */}
          {investments.map((inv) => (
            <div key={inv.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-[#2a2f44] last:border-b-0 hover:bg-[#1f2340] transition-colors group">
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#252a3a] flex items-center justify-center text-sm">
                  {typeIcon(inv.type)}
                </div>
                <div>
                  <p className="text-[#eef2ff] text-sm font-medium">{inv.asset_name}</p>
                  <p className="text-[#64748b] text-xs">{typeLabel(inv.type)} · {inv.quantity} units</p>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <p className="text-[#94a3b8] text-sm">${inv.total_invested.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <p className="text-[#eef2ff] text-sm font-medium">${inv.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <p className={`text-sm font-semibold ${inv.gain_loss >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {inv.gain_loss >= 0 ? "+" : ""}${inv.gain_loss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  inv.gain_percent >= 0
                    ? "bg-[#166534]/40 text-[#22c55e]"
                    : "bg-[#7f1d1d]/40 text-[#ef4444]"
                }`}>
                  {inv.gain_percent >= 0 ? "+" : ""}{inv.gain_percent.toFixed(1)}%
                </span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <button
                  onClick={() => onDelete(inv.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#64748b] hover:text-[#ef4444] text-sm"
                  title="Delete investment"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Investment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[#eef2ff] text-lg font-semibold">Add Investment</h2>
                <p className="text-[#64748b] text-xs mt-0.5">Track a new holding</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-[#eef2ff] transition-colors p-1">✕</button>
            </div>

            {error && (
              <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-lg px-3 py-2 mb-4">
                <p className="text-[#ef4444] text-xs">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Asset Name</label>
                <input
                  type="text"
                  name="asset_name"
                  value={form.asset_name}
                  onChange={handleChange}
                  placeholder="e.g., Apple (AAPL)"
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                    focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {INVESTMENT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 text-center
                        ${form.type === t.value
                          ? "bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/30"
                          : "bg-[#252a3a] text-[#94a3b8] border border-[#2a2f44] hover:border-[#353b55]"
                        }
                      `}
                    >
                      <div className="text-base mb-0.5">{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="any"
                    className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                      focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Buy Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-xs">$</span>
                    <input
                      type="number"
                      name="buy_price"
                      value={form.buy_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className="w-full bg-[#252a3a] border border-[#2a2f44] rounded-lg pl-6 pr-2 py-2.5 text-[#eef2ff] text-sm
                        focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Current</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-xs">$</span>
                    <input
                      type="number"
                      name="current_price"
                      value={form.current_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className="w-full bg-[#252a3a] border border-[#2a2f44] rounded-lg pl-6 pr-2 py-2.5 text-[#eef2ff] text-sm
                        focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold py-2.5 rounded-lg
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6366f1]/20"
              >
                {loading ? "Adding..." : "Add Investment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
