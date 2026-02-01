from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from database import Base
import enum
from datetime import datetime


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Category(str, enum.Enum):
    Food = "Food"
    Transport = "Transport"
    Housing = "Housing"
    Entertainment = "Entertainment"
    Shopping = "Shopping"
    Healthcare = "Healthcare"
    Utilities = "Utilities"
    Investment = "Investment"
    Income = "Income"
    Other = "Other"


class InvestmentType(str, enum.Enum):
    stock = "stock"
    crypto = "crypto"
    mutual_fund = "mutual_fund"
    etf = "etf"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(String, default="")
    type = Column(String, nullable=False)  # "income" or "expense"
    created_at = Column(DateTime, default=datetime.utcnow)


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asset_name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "stock", "crypto", "mutual_fund", "etf"
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    source = Column(String, default="manual", nullable=True)  # "manual" or "alpaca"
    created_at = Column(DateTime, default=datetime.utcnow)


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String, unique=True, nullable=False, index=True)
    added_at = Column(DateTime, default=datetime.utcnow)


class BrokerConnection(Base):
    __tablename__ = "broker_connections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    broker_type = Column(String, nullable=False)  # "alpaca"
    api_key_enc = Column(String, nullable=False)
    secret_key_enc = Column(String, nullable=False)
    is_paper = Column(Boolean, default=True)
    status = Column(String, default="connected")  # "connected", "error"
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_synced_at = Column(DateTime, nullable=True)
    account_info = Column(String, nullable=True)


class AgentConfig(Base):
    __tablename__ = "agent_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enabled = Column(Boolean, default=False)
    mode = Column(String, default="advisory")  # "advisory", "paper", "live"
    risk_profile = Column(String, default="moderate")
    max_trade_pct = Column(Float, default=10)
    max_position_pct = Column(Float, default=20)
    daily_loss_limit_pct = Column(Float, default=5)
    confirm_above_usd = Column(Float, default=500)
    symbol_whitelist = Column(String, default="[]")  # JSON array
    check_interval_min = Column(Integer, default=15)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String, nullable=False)
    action = Column(String, nullable=False)  # "buy" or "sell"
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, executed, cancelled, failed, advisory
    mode = Column(String, default="advisory")  # advisory, paper, live
    reasoning = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
