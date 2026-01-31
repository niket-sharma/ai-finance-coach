"use client";

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onDelete?: (id: number) => void;
  showDelete?: boolean;
  compact?: boolean;
}

const categoryIcons: Record<string, string> = {
  Food: "🍔",
  Transport: "🚗",
  Housing: "🏠",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Healthcare: "🏥",
  Utilities: "💡",
  Investment: "📈",
  Income: "💵",
  Other: "📦",
};

export default function TransactionList({ transactions, onDelete, showDelete = false, compact = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[#64748b] text-sm">No transactions found</p>
        <p className="text-[#64748b] text-xs mt-1">Add a transaction to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="flex items-center gap-3 bg-[#1a1d2e] border border-[#2a2f44] rounded-xl px-4 py-3
            hover:border-[#353b55] transition-all duration-200 group"
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-lg bg-[#252a3a] flex items-center justify-center text-base flex-shrink-0">
            {categoryIcons[txn.category] || "📦"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[#eef2ff] text-sm font-medium truncate">
                {txn.description || txn.category}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${txn.type === "income"
                  ? "bg-[#166534]/40 text-[#22c55e]"
                  : "bg-[#7f1d1d]/40 text-[#ef4444]"
                }`}>
                {txn.type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[#64748b] text-xs">{txn.category}</p>
              <span className="text-[#353b55]">•</span>
              <p className="text-[#64748b] text-xs">{new Date(txn.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-3">
            <p className={`text-sm font-semibold ${txn.type === "income" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {txn.type === "income" ? "+" : "−"}${txn.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>

            {/* Delete button */}
            {showDelete && onDelete && (
              <button
                onClick={() => onDelete(txn.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#64748b] hover:text-[#ef4444] p-1 rounded"
                title="Delete transaction"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
