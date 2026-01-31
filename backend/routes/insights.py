from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from collections import defaultdict

from database import get_db
from models import Transaction

router = APIRouter(prefix="/api/insights", tags=["insights"])


def get_month_range(year: int, month: int):
    """Get start and end datetime for a given month."""
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end = datetime(year, month + 1, 1) - timedelta(seconds=1)
    return start, end


def get_prev_month(year: int, month: int):
    """Get previous month's year and month."""
    if month == 1:
        return year - 1, 12
    return year, month - 1


@router.get("")
def get_insights(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    current_year, current_month = now.year, now.month
    prev_year, prev_month = get_prev_month(current_year, current_month)

    # Get date ranges
    curr_start, curr_end = get_month_range(current_year, current_month)
    prev_start, prev_end = get_month_range(prev_year, prev_month)

    # Fetch current month transactions
    current_transactions = (
        db.query(Transaction)
        .filter(Transaction.date >= curr_start, Transaction.date <= curr_end)
        .all()
    )

    # Fetch previous month transactions
    prev_transactions = (
        db.query(Transaction)
        .filter(Transaction.date >= prev_start, Transaction.date <= prev_end)
        .all()
    )

    # Build category spending maps (expenses only)
    current_by_category = defaultdict(float)
    current_income = 0.0
    current_expenses = 0.0

    for t in current_transactions:
        if t.type == "expense":
            current_by_category[t.category] += t.amount
            current_expenses += t.amount
        elif t.type == "income":
            current_income += t.amount

    prev_by_category = defaultdict(float)
    prev_income = 0.0
    prev_expenses = 0.0

    for t in prev_transactions:
        if t.type == "expense":
            prev_by_category[t.category] += t.amount
            prev_expenses += t.amount
        elif t.type == "income":
            prev_income += t.amount

    insights = []

    # --- Spending Trend: Compare categories month over month ---
    all_categories = set(list(current_by_category.keys()) + list(prev_by_category.keys()))
    trend_insights = []

    for cat in all_categories:
        curr_amt = current_by_category.get(cat, 0)
        prev_amt = prev_by_category.get(cat, 0)

        if prev_amt > 0 and curr_amt > 0:
            pct_change = ((curr_amt - prev_amt) / prev_amt) * 100
            if abs(pct_change) >= 10:  # Only show significant changes
                trend_insights.append({
                    "category": cat,
                    "current": round(curr_amt, 2),
                    "previous": round(prev_amt, 2),
                    "pct_change": round(pct_change, 2),
                })
        elif prev_amt == 0 and curr_amt > 0:
            trend_insights.append({
                "category": cat,
                "current": round(curr_amt, 2),
                "previous": 0,
                "pct_change": 100,  # New category this month
            })

    # Sort by absolute pct_change descending
    trend_insights.sort(key=lambda x: abs(x["pct_change"]), reverse=True)

    for t in trend_insights[:3]:  # Top 3 trends
        if t["pct_change"] > 0:
            insights.append({
                "type": "spending_trend",
                "icon": "📈",
                "title": f"{t['category']} spending increased",
                "description": f"You spent ${t['current']:.2f} on {t['category']} this month, up {t['pct_change']:.0f}% from ${t['previous']:.2f} last month.",
                "action": f"Review your {t['category'].lower()} expenses to see if any can be reduced.",
            })
        else:
            insights.append({
                "type": "spending_trend",
                "icon": "📉",
                "title": f"{t['category']} spending decreased",
                "description": f"You spent ${t['current']:.2f} on {t['category']} this month, down {abs(t['pct_change']):.0f}% from ${t['previous']:.2f} last month.",
                "action": f"Great progress on {t['category'].lower()} spending! Keep it up.",
            })

    # --- Top Spending Categories ---
    if current_by_category:
        sorted_categories = sorted(current_by_category.items(), key=lambda x: x[1], reverse=True)
        top_cat = sorted_categories[0]
        insights.append({
            "type": "top_spending",
            "icon": "💰",
            "title": f"Top expense: {top_cat[0]}",
            "description": f"{top_cat[0]} is your biggest expense this month at ${top_cat[1]:.2f}"
            + (f", accounting for {(top_cat[1] / current_expenses * 100):.1f}% of total spending." if current_expenses > 0 else "."),
            "action": f"Consider reducing {top_cat[0].lower()} spending to improve your savings rate.",
        })

    # --- Savings Rate ---
    if current_income > 0:
        savings = current_income - current_expenses
        savings_rate = (savings / current_income) * 100

        if savings_rate >= 20:
            icon = "🎯"
            title = "Excellent savings rate!"
            desc = f"You're saving ${savings:.2f} this month — a {savings_rate:.1f}% savings rate. This is above the recommended 20%."
            action = "Keep up the great work! Consider investing your surplus."
        elif savings_rate >= 0:
            icon = "💡"
            title = "Savings rate could improve"
            desc = f"You're saving ${savings:.2f} this month — a {savings_rate:.1f}% savings rate. Aim for at least 20%."
            action = "Look for areas to cut spending or increase income."
        else:
            icon = "⚠️"
            title = "Spending exceeds income!"
            desc = f"You're spending ${abs(savings):.2f} more than you earn this month. Your savings rate is {savings_rate:.1f}%."
            action = "Prioritize cutting non-essential expenses immediately."

        insights.append({
            "type": "savings_rate",
            "icon": icon,
            "title": title,
            "description": desc,
            "action": action,
        })
    else:
        insights.append({
            "type": "savings_rate",
            "icon": "💡",
            "title": "No income recorded this month",
            "description": "Add your income transactions to get savings rate insights.",
            "action": "Log your income to unlock personalized savings recommendations.",
        })

    # --- Month-over-Month Total Spending ---
    if prev_expenses > 0 and current_expenses > 0:
        total_pct_change = ((current_expenses - prev_expenses) / prev_expenses) * 100
        if total_pct_change > 5:
            insights.append({
                "type": "total_trend",
                "icon": "📊",
                "title": "Total spending increased",
                "description": f"Your total expenses this month are ${current_expenses:.2f}, up {total_pct_change:.1f}% from ${prev_expenses:.2f} last month.",
                "action": "Review your budget to identify areas for improvement.",
            })
        elif total_pct_change < -5:
            insights.append({
                "type": "total_trend",
                "icon": "📊",
                "title": "Total spending decreased",
                "description": f"Your total expenses this month are ${current_expenses:.2f}, down {abs(total_pct_change):.1f}% from ${prev_expenses:.2f} last month.",
                "action": "Great job cutting back! Redirect savings toward your financial goals.",
            })

    # If no insights generated, provide a default
    if not insights:
        insights.append({
            "type": "welcome",
            "icon": "👋",
            "title": "Welcome to AI Insights",
            "description": "Add transactions to start receiving personalized financial insights and recommendations.",
            "action": "Start by logging your income and expenses for this month.",
        })

    return {
        "insights": insights,
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%S"),
        # Future: OpenAI-powered insights stub
        # "ai_powered": False,
        # "openai_stub": "Set OPENAI_API_KEY to enable AI-powered insights"
    }
