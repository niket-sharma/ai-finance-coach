import os
import sys
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, get_db, DATABASE_URL
from models import Transaction, Investment, Watchlist, BrokerConnection, AgentConfig, Trade
from routes import transactions, investments, insights, market, recommendations, brokers, agent, multi_agent

# ---------------------------------------------------------------------------
# Create tables
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Migration: add 'source' column to investments if missing (SQLite)
# ---------------------------------------------------------------------------
def _run_migrations():
    if not DATABASE_URL.startswith("sqlite"):
        return
    import sqlite3
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(investments)")
    columns = [row[1] for row in cursor.fetchall()]
    if "source" not in columns:
        cursor.execute("ALTER TABLE investments ADD COLUMN source TEXT DEFAULT 'manual'")
        conn.commit()
        print("[main] Migration: added 'source' column to investments")
    conn.close()


_run_migrations()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Finance Coach API",
    description="Personal finance tracking and insights API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "https://ai-finance-coach.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(transactions.router)
app.include_router(investments.router)
app.include_router(insights.router)
app.include_router(market.router)
app.include_router(recommendations.router)
app.include_router(brokers.router)
app.include_router(agent.router)
app.include_router(multi_agent.router)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    current_year, current_month = now.year, now.month

    if current_month == 12:
        next_month_start = datetime(current_year + 1, 1, 1)
    else:
        next_month_start = datetime(current_year, current_month + 1, 1)
    month_start = datetime(current_year, current_month, 1)

    all_transactions = db.query(Transaction).all()
    current_month_txns = [
        t for t in all_transactions
        if t.date >= month_start and t.date < next_month_start
    ]

    total_income = sum(t.amount for t in all_transactions if t.type == "income")
    total_expenses = sum(t.amount for t in all_transactions if t.type == "expense")
    total_balance = total_income - total_expenses

    monthly_income = sum(t.amount for t in current_month_txns if t.type == "income")
    monthly_expenses = sum(t.amount for t in current_month_txns if t.type == "expense")

    category_breakdown = defaultdict(float)
    for t in current_month_txns:
        if t.type == "expense":
            category_breakdown[t.category] += t.amount

    category_pct = {}
    if monthly_expenses > 0:
        for cat, amt in category_breakdown.items():
            category_pct[cat] = {
                "amount": round(amt, 2),
                "percentage": round((amt / monthly_expenses) * 100, 1),
            }

    recent = sorted(all_transactions, key=lambda t: t.date, reverse=True)[:5]
    recent_formatted = [
        {
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "date": t.date.strftime("%Y-%m-%d") if isinstance(t.date, datetime) else str(t.date),
            "description": t.description or "",
            "type": t.type,
        }
        for t in recent
    ]

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
