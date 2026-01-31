"use client";

import { useState, useEffect } from "react";

interface Insight {
  type: string;
  icon: string;
  title: string;
  description: string;
  action?: string;
}

// ============================================================
// FUTURE: OpenAI Integration Stub
// When ready to add AI-powered insights, uncomment and implement:
//
// async function fetchAIInsights(transactions: any[]): Promise<Insight[]> {
//   const response = await fetch("https://api.openai.com/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: "gpt-4",
//       messages: [
//         {
//           role: "system",
//           content: "You are a personal finance advisor. Analyze the user's transactions and provide actionable insights.",
//         },
//         {
//           role: "user",
//           content: `Analyze these transactions and provide 3-5 financial insights: ${JSON.stringify(transactions)}`,
//         },
//       ],
//     }),
//   });
//   const data = await response.json();
//   // Parse and return structured insights from GPT response
//   return [];
// }
// ============================================================

// Client-side rule-based insights engine
function generateClientInsights(transactions: any[]): Insight[] {
  if (!transactions || transactions.length === 0) {
    return [
      {
        type: "welcome",
        icon: "👋",
        title: "Welcome to AI Insights",
        description: "Add transactions to start receiving personalized financial insights and recommendations.",
        action: "Start by logging your income and expenses for this month.",
      },
    ];
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const insights: Insight[] = [];

  // Partition transactions
  const currentMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const prevMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  // Build category maps
  const currentByCategory: Record<string, number> = {};
  let currentIncome = 0;
  let currentExpenses = 0;

  currentMonthTxns.forEach((t) => {
    if (t.type === "expense") {
      currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
      currentExpenses += t.amount;
    } else if (t.type === "income") {
      currentIncome += t.amount;
    }
  });

  const prevByCategory: Record<string, number> = {};
  let prevExpenses = 0;

  prevMonthTxns.forEach((t) => {
    if (t.type === "expense") {
      prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount;
      prevExpenses += t.amount;
    }
  });

  // Spending trends
  const allCategories = new Set([...Object.keys(currentByCategory), ...Object.keys(prevByCategory)]);
  const trends: { category: string; pctChange: number; current: number; previous: number }[] = [];

  allCategories.forEach((cat) => {
    const curr = currentByCategory[cat] || 0;
    const prev = prevByCategory[cat] || 0;
    if (prev > 0 && curr > 0) {
      const pct = ((curr - prev) / prev) * 100;
      if (Math.abs(pct) >= 10) {
        trends.push({ category: cat, pctChange: pct, current: curr, previous: prev });
      }
    } else if (prev === 0 && curr > 0) {
      trends.push({ category: cat, pctChange: 100, current: curr, previous: 0 });
    }
  });

  trends.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  trends.slice(0, 3).forEach((t) => {
    if (t.pctChange > 0) {
      insights.push({
        type: "spending_trend",
        icon: "📈",
        title: `${t.category} spending increased`,
        description: `You spent $${t.current.toFixed(2)} on ${t.category} this month, up ${t.pctChange.toFixed(0)}% from $${t.previous.toFixed(2)} last month.`,
        action: `Review your ${t.category.toLowerCase()} expenses to see if any can be reduced.`,
      });
    } else {
      insights.push({
        type: "spending_trend",
        icon: "📉",
        title: `${t.category} spending decreased`,
        description: `You spent $${t.current.toFixed(2)} on ${t.category} this month, down ${Math.abs(t.pctChange).toFixed(0)}% from $${t.previous.toFixed(2)} last month.`,
        action: `Great progress on ${t.category.toLowerCase()} spending! Keep it up.`,
      });
    }
  });

  // Top spending category
  if (Object.keys(currentByCategory).length > 0) {
    const sorted = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const topPct = currentExpenses > 0 ? (top[1] / currentExpenses) * 100 : 0;
    insights.push({
      type: "top_spending",
      icon: "💰",
      title: `Top expense: ${top[0]}`,
      description: `${top[0]} is your biggest expense this month at $${top[1].toFixed(2)}, accounting for ${topPct.toFixed(1)}% of total spending.`,
      action: `Consider reducing ${top[0].toLowerCase()} spending to improve your savings rate.`,
    });
  }

  // Savings rate
  if (currentIncome > 0) {
    const savings = currentIncome - currentExpenses;
    const rate = (savings / currentIncome) * 100;
    if (rate >= 20) {
      insights.push({
        type: "savings_rate",
        icon: "🎯",
        title: "Excellent savings rate!",
        description: `You're saving $${savings.toFixed(2)} this month — a ${rate.toFixed(1)}% savings rate. This is above the recommended 20%.`,
        action: "Keep up the great work! Consider investing your surplus.",
      });
    } else if (rate >= 0) {
      insights.push({
        type: "savings_rate",
        icon: "💡",
        title: "Savings rate could improve",
        description: `You're saving $${savings.toFixed(2)} this month — a ${rate.toFixed(1)}% savings rate. Aim for at least 20%.`,
        action: "Look for areas to cut spending or increase income.",
      });
    } else {
      insights.push({
        type: "savings_rate",
        icon: "⚠️",
        title: "Spending exceeds income!",
        description: `You're spending $${Math.abs(savings).toFixed(2)} more than you earn this month.`,
        action: "Prioritize cutting non-essential expenses immediately.",
      });
    }
  } else {
    insights.push({
      type: "savings_rate",
      icon: "💡",
      title: "No income recorded this month",
      description: "Add your income transactions to get savings rate insights.",
      action: "Log your income to unlock personalized savings recommendations.",
    });
  }

  // Total spending trend
  if (prevExpenses > 0 && currentExpenses > 0) {
    const totalPct = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
    if (Math.abs(totalPct) > 5) {
      insights.push({
        type: "total_trend",
        icon: totalPct > 0 ? "📊" : "📊",
        title: totalPct > 0 ? "Total spending increased" : "Total spending decreased",
        description: `Your total expenses this month are $${currentExpenses.toFixed(2)}, ${totalPct > 0 ? "up" : "down"} ${Math.abs(totalPct).toFixed(1)}% from $${prevExpenses.toFixed(2)} last month.`,
        action: totalPct > 0
          ? "Review your budget to identify areas for improvement."
          : "Great job cutting back! Redirect savings toward your financial goals.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: "welcome",
      icon: "👋",
      title: "Welcome to AI Insights",
      description: "Add transactions to start receiving personalized financial insights and recommendations.",
      action: "Start by logging your income and expenses for this month.",
    });
  }

  return insights;
}

const insightColors: Record<string, { bg: string; border: string; titleColor: string }> = {
  spending_trend: { bg: "bg-[#1e3a5f]/30", border: "border-[#3b82f6]/30", titleColor: "text-[#60a5fa]" },
  top_spending: { bg: "bg-[#78350f]/30", border: "border-[#f59e0b]/30", titleColor: "text-[#fbbf24]" },
  savings_rate: { bg: "bg-[#166534]/30", border: "border-[#22c55e]/30", titleColor: "text-[#4ade80]" },
  total_trend: { bg: "bg-[#4c1d95]/30", border: "border-[#8b5cf6]/30", titleColor: "text-[#a78bfa]" },
  welcome: { bg: "bg-[#1e1b4b]/30", border: "border-[#6366f1]/30", titleColor: "text-[#a5b4fc]" },
};

export default function InsightsPanel({ transactions }: { transactions: any[] }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate brief loading for UX feel
    const timer = setTimeout(() => {
      const generated = generateClientInsights(transactions);
      setInsights(generated);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1a1d2e] border border-[#2a2f44] rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-[#252a3a] rounded w-48 mb-3"></div>
            <div className="h-3 bg-[#252a3a] rounded w-full mb-2"></div>
            <div className="h-3 bg-[#252a3a] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => {
        const style = insightColors[insight.type] || insightColors.welcome;
        return (
          <div
            key={idx}
            className={`${style.bg} border ${style.border} rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/20`}
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0 mt-0.5">{insight.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className={`${style.titleColor} font-semibold text-sm`}>{insight.title}</h3>
                <p className="text-[#94a3b8] text-xs mt-1.5 leading-relaxed">{insight.description}</p>
                {insight.action && (
                  <div className="mt-3 flex items-start gap-2">
                    <span className="text-[#6366f1] text-xs">💡</span>
                    <p className="text-[#6366f1] text-xs font-medium">{insight.action}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
