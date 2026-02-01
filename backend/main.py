import os
import sys
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, get_db
from models import Transaction, Investment
from routes import transactions, investments, insights

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Finance Coach API",
    description="Personal finance tracking and insights API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "https://ai-finance-coach-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transactions.router)
app.include_router(investments.router)
app.include_router(insights.router)


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    current_year, current_month = now.year, now.month

    # Current month date range
    if current_month == 12:
        next_month_start = datetime(current_year + 1, 1, 1)
    else:
        next_month_start = datetime(current_year, current_month + 1, 1)
    month_start = datetime(current_year, current_month, 1)

    # Get all transactions
    all_transactions = db.query(Transaction).all()

    # Current month transactions
    current_month_txns = [
        t for t in all_transactions
        if t.date >= month_start and t.date < next_month_start
    ]

    # Calculate totals
    total_income = sum(t.amount for t in all_transactions if t.type == "income")
    total_expenses = sum(t.amount for t in all_transactions if t.type == "expense")
    total_balance = total_income - total_expenses

    monthly_income = sum(t.amount for t in current_month_txns if t.type == "income")
    monthly_expenses = sum(t.amount for t in current_month_txns if t.type == "expense")

    # Category breakdown (current month expenses only)
    category_breakdown = defaultdict(float)
    for t in current_month_txns:
        if t.type == "expense":
            category_breakdown[t.category] += t.amount

    # Convert to percentage-based breakdown
    category_pct = {}
    if monthly_expenses > 0:
        for cat, amt in category_breakdown.items():
            category_pct[cat] = {
                "amount": round(amt, 2),
                "percentage": round((amt / monthly_expenses) * 100, 1),
            }

    # Recent transactions (last 5)
    recent = sorted(all_transactions, key=lambda t: t.date, reverse=True)[:5]
    recent_formatted = []
    for t in recent:
        recent_formatted.append({
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "date": t.date.strftime("%Y-%m-%d") if isinstance(t.date, datetime) else str(t.date),
            "description": t.description or "",
            "type": t.type,
        })

    return {
        "total_balance": round(total_balance, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "category_breakdown": category_pct,
        "recent_transactions": recent_formatted,
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
