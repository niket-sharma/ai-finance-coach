"use client";

interface CardProps {
  title: string;
  amount: number;
  icon: string;
  color: string;
  subtitle?: string;
}

export function SummaryCard({ title, amount, icon, color, subtitle }: CardProps) {
  const isNegative = amount < 0;

  return (
    <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2f44] hover:border-[#353b55] transition-all duration-300 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[#64748b] text-xs font-medium uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-[#64748b] text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-lg`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${isNegative ? "text-[#ef4444]" : "text-[#eef2ff]"}`}>
        ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        {isNegative && <span className="text-[#ef4444] text-base font-normal ml-1">(deficit)</span>}
      </p>
    </div>
  );
}

export function CategoryBreakdown({ categories }: { categories: Record<string, { amount: number; percentage: number }> }) {
  const categoryIcons: Record<string, string> = {
    Food: "🍔",
    Transport: "🚗",
    Housing: "🏠",
    Entertainment: "🎬",
    Shopping: "🛍️",
    Healthcare: "🏥",
    Utilities: "💡",
    Investment: "📈",
    Other: "📦",
  };

  const sorted = Object.entries(categories).sort((a, b) => b[1].percentage - a[1].percentage);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#64748b] text-sm">No expenses this month</p>
        <p className="text-[#64748b] text-xs mt-1">Add transactions to see breakdown</p>
      </div>
    );
  }

  const colors = [
    "bg-[#6366f1]",
    "bg-[#22c55e]",
    "bg-[#f59e0b]",
    "bg-[#ef4444]",
    "bg-[#3b82f6]",
    "bg-[#ec4899]",
    "bg-[#8b5cf6]",
    "bg-[#14b8a6]",
    "bg-[#f97316]",
  ];

  return (
    <div className="space-y-3">
      {sorted.map(([category, data], index) => (
        <div key={category} className="flex items-center gap-3">
          <span className="text-base w-5 text-center">{categoryIcons[category] || "📦"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[#eef2ff] text-xs font-medium">{category}</span>
              <div className="flex items-center gap-3">
                <span className="text-[#94a3b8] text-xs">${data.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                <span className="text-[#64748b] text-xs w-10 text-right">{data.percentage}%</span>
              </div>
            </div>
            <div className="w-full bg-[#252a3a] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                style={{ width: `${data.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
