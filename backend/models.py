from sqlalchemy import Column, Integer, Float, String, DateTime, Enum as SAEnum
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
    created_at = Column(DateTime, default=datetime.utcnow)
